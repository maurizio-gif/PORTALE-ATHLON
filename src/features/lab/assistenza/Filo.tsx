import { router, useIsFocused } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'

import { leggiRichiesta, scriviNellaRichiesta, type DettaglioRichiesta, type MessaggioRichiesta } from '@/api/assistente'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { apriAssistente } from '../assistente/store'
import { rileggi } from '../notifiche/store'
import { Carta, Etichetta, Messaggio, Pulsante, SchedeInArrivo } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, usePalette, velo } from '../ui/tema'
import { vistaCorrente } from '../vista'
import { InvitoPushRichiesta } from './InvitoPush'
import { quando } from './quando'
import { MESSAGGIO_RICHIESTA_MAX, controllaMessaggio } from './richieste'

// Una richiesta al team (08/11/2026): quello che la persona aveva scritto e, sotto, il filo con le risposte del team e i suoi messaggi. Con la risposta in app si puo' riscrivere (il
// ticket torna al desk); con la risposta via email il filo e' solo da leggere; una richiesta chiusa non si riapre da qui (se serve ancora aiuto, si riscrive dall'assistente).
// **Finche' il team non ha risposto, senza push attive, in cima compare l'invito ad attivarle** (10/11/2026: la risposta e' nell'app e la persona deve sapere quando arriva).
// **Aprirla segna lette le risposte** (lo fa la funzione) e spegne il pallino del campanello. Mentre e' aperta si rilegge ogni 30 secondi: se il team risponde in quel momento
// compare da sola. Le risposte arrivate dopo l'ultima apertura portano «Nuova» finche' la schermata resta aperta, anche dopo che la funzione le ha segnate lette.

const RILETTURA_MS = 30_000

type Stato =
  | { fase: 'carico' }
  | { fase: 'errore'; testo: string; nonTrovata: boolean }
  | { fase: 'pronto'; richiesta: DettaglioRichiesta; messaggi: MessaggioRichiesta[] }

export function FiloRichiesta({ id }: { id: string }) {
  const p = usePalette()
  const inVista = vistaCorrente() !== null
  const inPrimoPiano = useIsFocused()
  const [stato, setStato] = useState<Stato>({ fase: 'carico' })
  const [nuovi, setNuovi] = useState<ReadonlySet<string>>(new Set())
  const [testo, setTesto] = useState('')
  const [invio, setInvio] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const inLettura = useRef(false)

  const carica = useCallback(
    async (silenzioso: boolean) => {
      if (inVista || inLettura.current) return
      inLettura.current = true
      try {
        const r = await leggiRichiesta(id)
        if (!r.ok) {
          // Una rilettura che non riesce non toglie quello che si sta leggendo.
          if (!silenzioso) setStato({ fase: 'errore', testo: r.errore, nonTrovata: r.nonTrovata })
          return
        }
        setStato({ fase: 'pronto', richiesta: r.richiesta, messaggi: r.messaggi })
        setNuovi((prima) => {
          const dopo = new Set(prima)
          for (const m of r.messaggi) if (!m.letta) dopo.add(m.id)
          return dopo.size === prima.size ? prima : dopo
        })
        void rileggi()
      } finally {
        inLettura.current = false
      }
    },
    [id, inVista],
  )

  useEffect(() => {
    void carica(false)
  }, [carica])

  // Solo mentre la schermata si vede: le schermate sotto restano montate.
  useEffect(() => {
    if (inVista || !inPrimoPiano) return
    const i = setInterval(() => void carica(true), RILETTURA_MS)
    return () => clearInterval(i)
  }, [carica, inVista, inPrimoPiano])

  const problema = controllaMessaggio(testo)
  const troppo = problema === 'lungo'

  async function invia() {
    if (invio || problema) return
    setInvio(true)
    setErrore(null)
    const r = await scriviNellaRichiesta(id, testo.trim())
    setInvio(false)
    if (!r.ok) return setErrore(r.errore)
    setTesto('')
    await carica(true)
  }

  const r = stato.fase === 'pronto' ? stato.richiesta : null

  return (
    <Schermata
      titolo={t('La tua richiesta', 'Your request')}
      sopratitolo={t('Assistenza', 'Support')}
      sottotitolo={r ? t(`Aperta ${quando(r.creato_il)}`, `Opened ${quando(r.creato_il)}`) : undefined}
      indietro="/assistenza"
    >
      {inVista ? (
        <Messaggio tono="attenzione" icona="info">
          {t('Vista cliente: le richieste sono del socio, e aprirle segnerebbe come lette le risposte del team.', 'Client view: these requests belong to the member, and opening them would mark the team’s replies as read.')}
        </Messaggio>
      ) : (
        <View style={{ gap: spazio.tre }}>
          {stato.fase === 'carico' ? <SchedeInArrivo quante={2} /> : null}
          {stato.fase === 'errore' ? (
            <>
              <Messaggio tono="errore">{stato.testo}</Messaggio>
              {stato.nonTrovata ? (
                <Pulsante testo={t('Le tue richieste', 'Your requests')} variante="contorno" onPress={() => router.replace('/assistenza')} />
              ) : (
                <Pulsante testo={t('Riprova', 'Try again')} icona="aggiorna" onPress={() => void carica(false)} />
              )}
            </>
          ) : null}

          {stato.fase === 'pronto' && r ? (
            <>
              <View style={stili.chip}>
                <Etichetta
                  testo={r.stato === 'chiuso' ? t('Chiusa', 'Closed') : r.stato === 'risposto' ? t('Il team ha risposto', 'The team has replied') : t('In attesa del team', 'Waiting for the team')}
                  tono={r.stato === 'chiuso' ? 'neutro' : r.stato === 'risposto' ? 'ok' : 'attenzione'}
                />
                <Etichetta testo={r.canale === 'app' ? t('Risposta in app', 'Reply in the app') : t('Risposta via email', 'Reply by email')} tono={r.canale === 'app' ? 'accento' : 'neutro'} />
              </View>

              {/* Quello che la persona aveva scritto aprendo la richiesta. */}
              <Fumetto
                chi="cliente"
                intestazione={t('Tu', 'You')}
                quando={quando(r.creato_il)}
                testo={r.messaggio?.trim() || t('Hai chiesto di parlare con il team, mandando la conversazione con l’assistente.', 'You asked to speak with the team, sending your conversation with the assistant.')}
                nota={r.allegato ? t(`Allegato: ${r.allegato.nome}`, `Attachment: ${r.allegato.nome}`) : undefined}
              />

              {stato.messaggi.map((m) => (
                <Fumetto
                  key={m.id}
                  chi={m.autore}
                  intestazione={m.autore === 'team' ? t('Team Athlon', 'Athlon team') : t('Tu', 'You')}
                  quando={quando(m.creato_il)}
                  testo={m.testo}
                  nuovo={nuovi.has(m.id)}
                  nota={m.autore === 'team' && m.canale === 'email' ? t('Inviata per email', 'Sent by email') : undefined}
                />
              ))}

              {r.canale === 'app' && r.stato === 'nuovo' && stato.messaggi.length === 0 ? <InvitoPushRichiesta /> : null}

              {stato.messaggi.length === 0 && r.stato !== 'chiuso' ? (
                <Text style={[stili.attesa, { color: p.testoSecondario }]}>
                  {r.canale === 'app'
                    ? t('Il team ha ricevuto la tua richiesta. Quando risponde ti avvisiamo con una notifica e la trovi qui.', 'The team has your request. When it replies we’ll notify you and you’ll find the reply here.')
                    : t('Il team ha ricevuto la tua richiesta e ti risponde via email.', 'The team has your request and will reply to you by email.')}
                </Text>
              ) : null}

              {r.puo_scrivere ? (
                <Carta piatta style={{ gap: spazio.due }}>
                  <TextInput
                    value={testo}
                    onChangeText={setTesto}
                    placeholder={t('Scrivi al team…', 'Write to the team…')}
                    placeholderTextColor={p.testoTerzo}
                    multiline
                    maxLength={MESSAGGIO_RICHIESTA_MAX + 200}
                    editable={!invio}
                    accessibilityLabel={t('Il tuo messaggio per il team', 'Your message for the team')}
                    style={[stili.campo, { color: p.testo, backgroundColor: p.incavo, borderColor: p.linea }]}
                  />
                  {troppo ? <Text style={[stili.piccolo, { color: p.errore }]}>{t(`Al massimo ${MESSAGGIO_RICHIESTA_MAX} caratteri.`, `At most ${MESSAGGIO_RICHIESTA_MAX} characters.`)}</Text> : null}
                  {errore ? <Messaggio>{errore}</Messaggio> : null}
                  <Pulsante testo={t('Invia', 'Send')} icona="invia" piccolo pieno={false} inCorso={invio} disabilitato={problema !== null} onPress={() => void invia()} />
                  <Text style={[stili.piccolo, { color: p.testoTerzo }]}>
                    {t('Non scrivere dati sulla salute: li leggono persone del club.', 'Don’t write health data: club staff read this.')}
                  </Text>
                </Carta>
              ) : r.motivo_no === 'email' ? (
                <Text style={[stili.attesa, { color: p.testoSecondario }]}>
                  {t('Hai scelto di avere la risposta via email: se vuoi aggiungere qualcosa, rispondi all’email del team oppure scrivi di nuovo dall’assistente.', 'You chose to get the reply by email: to add something, reply to the team’s email or write again from the assistant.')}
                </Text>
              ) : (
                <Carta piatta style={{ gap: spazio.due }}>
                  <Text style={[stili.attesa, { color: p.testoSecondario }]}>
                    {t('Questa richiesta è chiusa. Se ti serve ancora aiuto, scrivi di nuovo al team dall’assistente.', 'This request is closed. If you still need help, write to the team again from the assistant.')}
                  </Text>
                  <Pulsante testo={t('Apri l’assistente', 'Open the assistant')} icona="assistente" piccolo pieno={false} onPress={() => apriAssistente('assistenza')} />
                </Carta>
              )}
            </>
          ) : null}
        </View>
      )}
    </Schermata>
  )
}

/** Un messaggio del filo: il team a sinistra, la persona a destra. «Nuovo» per una risposta che non aveva ancora aperto. */
function Fumetto({ chi, intestazione, quando: ora, testo, nuovo = false, nota }: { chi: 'team' | 'cliente'; intestazione: string; quando: string; testo: string; nuovo?: boolean; nota?: string }) {
  const p = usePalette()
  const suo = chi === 'cliente'
  return (
    <View style={[stili.riga, suo ? stili.destra : stili.sinistra]}>
      <View
        style={[
          stili.fumetto,
          suo ? { backgroundColor: velo(p, 'accento', 0.12) } : { backgroundColor: p.carta, borderWidth: 1, borderColor: nuovo ? p.accento : p.linea },
        ]}
      >
        <View style={stili.testata}>
          <Text style={[stili.chi, { color: suo ? p.accento : p.testo }]}>{intestazione}</Text>
          <Text style={[stili.ora, { color: p.testoTerzo }]}>{ora}</Text>
          {nuovo ? <Text style={[stili.nuovo, { color: p.accento }]}>{t('Nuova', 'New')}</Text> : null}
        </View>
        <Text style={[stili.testo, { color: p.testo }]} selectable>
          {testo}
        </Text>
        {nota ? <Text style={[stili.piccolo, { color: p.testoSecondario }]}>{nota}</Text> : null}
      </View>
    </View>
  )
}

const stili = StyleSheet.create({
  chip: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  riga: { flexDirection: 'row', maxWidth: '100%' },
  destra: { justifyContent: 'flex-end' },
  sinistra: { justifyContent: 'flex-start' },
  fumetto: { maxWidth: '92%', gap: 4, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  testata: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  chi: { fontFamily: F.bold, fontSize: 13 },
  ora: { fontFamily: F.medio, fontSize: 12 },
  nuovo: { fontFamily: F.bold, fontSize: 12 },
  testo: { fontFamily: F.medio, fontSize: 15, lineHeight: 21 },
  piccolo: { fontFamily: F.medio, fontSize: 12.5, lineHeight: 17 },
  attesa: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  campo: { minHeight: 84, maxHeight: 180, padding: 12, borderRadius: 12, borderWidth: 1, fontFamily: F.medio, fontSize: 15, textAlignVertical: 'top' },
})
