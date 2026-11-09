import { router } from 'expo-router'
import { useState } from 'react'
import { Platform, StyleSheet, Text, View } from 'react-native'

import { inviaSondaggio } from '@/api/moduli'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { CampoTesto } from '../../ui/Campi'
import { Icona } from '../../ui/Icona'
import { Bollino, Carta, Messaggio, Pulsante, SchedeInArrivo } from '../../ui/kit'
import { F, raggio, usePalette } from '../../ui/tema'
import { colpetto, Tocco } from '../../ui/Tocco'
import { Cornice } from '../moduli/Cornice'
import { inVista, useIdentita } from '../moduli/identita'
import { agenteApp } from './calcolo'
import { MAX_NOTA, capitoliFatti, mediaCapitolo, notaCapitolo, prossimoCapitolo, righeCapitolo, type BozzaCapitolo } from './calcolo-app'
import { CAPITOLI_APP, PROBLEMI, SOGLIA_PROBLEMI, STELLE_FUNZIONE, capitoloApp, testoApp, type CapitoloApp } from './dati-app'
import { Chip } from './AppPezzi'
import { aggiornaBozza, bozzaDi, segnaInviato, segnaNonUsa, useSurveyApp } from './statoApp'
import { DomandaStelle } from './Survey'

// Un capitolo della survey dell'app (08/11/2026). Due passi nella stessa schermata:
//   1. «Cosa usi?» — l'elenco delle funzioni del capitolo, da accendere; oppure «non uso niente di questo capitolo»;
//   2. «Come ti trovi?» — le sole funzioni accese, a stelle; sotto le tre stelle compare «cosa non ti convince?»; poi una nota.
// Si invia una riga sola per capitolo, con le funzioni usate: cosa significa e come arriva al server sta in `dati-app.ts` e `calcolo-app.ts`.
// In vista cliente non si invia niente: chi guarda l'app di un socio non risponde al suo posto.

const HUB = '/club-life/survey/app'

/** Una funzione da accendere: la casella a sinistra, il nome e una riga che dice cos'e'. */
function RigaUso({ nome, cosa, acceso, prima, onPress }: { nome: string; cosa: string; acceso: boolean; prima: boolean; onPress: () => void }) {
  const p = usePalette()
  return (
    <Tocco
      onPress={onPress}
      ruolo="checkbox"
      etichetta={`${nome}. ${cosa}`}
      stato={{ checked: acceso, selected: acceso }}
      vibra="scelta"
      scala={0.985}
      sollevaInHover={false}
      style={[stili.rigaUso, !prima && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.scuro ? 'rgba(255,255,255,0.09)' : 'rgba(17,17,20,0.09)' }]}
    >
      <View style={[stili.casella, { borderColor: acceso ? p.accento : p.linea, backgroundColor: acceso ? p.accento : 'transparent' }]}>
        {acceso ? <Icona nome="spunta" size={16} colore="#fff" /> : null}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[stili.nome, { color: p.testo }]}>{nome}</Text>
        <Text style={[stili.cosa, { color: p.testoSecondario }]}>{cosa}</Text>
      </View>
    </Tocco>
  )
}

function Capitolo({ cap, emailAccesso }: { cap: CapitoloApp; emailAccesso?: string | null }) {
  const p = usePalette()
  const stato = useSurveyApp()
  const identita = useIdentita(emailAccesso)
  const bozza = bozzaDi(stato, cap.id)
  const [fase, setFase] = useState<'uso' | 'voti'>('uso')
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [inviato, setInviato] = useState(false)

  const numero = CAPITOLI_APP.findIndex((c) => c.id === cap.id) + 1
  const sopratitolo = `${t(`Capitolo ${numero} di ${CAPITOLI_APP.length}`, `Chapter ${numero} of ${CAPITOLI_APP.length}`)} · ${testoApp(cap.eyebrow)}`
  const parole = STELLE_FUNZIONE.map(testoApp)
  const usate = cap.funzioni.filter((f) => bozza.usate.includes(f.id))
  const cambia = (f: (b: BozzaCapitolo) => BozzaCapitolo) => {
    setErrore(null)
    aggiornaBozza(cap.id, f)
  }

  function alterna(id: string) {
    cambia((b) => ({ ...b, usate: b.usate.includes(id) ? b.usate.filter((x) => x !== id) : [...b.usate, id] }))
  }

  function nonUsoNiente() {
    colpetto('scelta')
    segnaNonUsa(cap.id, true)
    router.dismissTo(HUB)
  }

  function avanti() {
    segnaNonUsa(cap.id, false)
    setFase('voti')
  }

  async function invia() {
    if (inCorso || !identita || inVista()) return
    setErrore(null)
    // Il solo controllo che ferma l'invio: il server rifiuta una riga senza nemmeno una stella, e una risposta senza un voto non dice come ti trovi.
    if (mediaCapitolo(cap, bozza) === null) return setErrore(t('Dai un voto ad almeno una funzione: basta una stella.', 'Rate at least one feature: one star is enough.'))
    setInCorso(true)
    const esito = await inviaSondaggio(
      { sondaggio: cap.slug, risposte: righeCapitolo(cap, bozza), nps: null, nota: notaCapitolo(cap, bozza), email: identita.email, numero: identita.numero },
      agenteApp(Platform.OS),
    )
    setInCorso(false)
    if (!esito.ok) {
      colpetto('errore')
      return setErrore(esito.errore)
    }
    colpetto('ok')
    segnaInviato(cap.id)
    setInviato(true)
  }

  // La fine del capitolo: quanti ne ha fatti e dove andare dopo.
  if (inviato) {
    const prossimo = prossimoCapitolo(cap.id, { ...stato.inviati, [cap.id]: true }, stato.nonUsa)
    const fatti = capitoliFatti({ ...stato.inviati, [cap.id]: true }, stato.nonUsa)
    return (
      <Cornice sopratitolo={sopratitolo} titolo={t('Capitolo inviato', 'Chapter sent')} indietro={HUB}>
        <Carta style={{ gap: spazio.tre }}>
          <Bollino icona="ok" tono="ok" size={48} pieno />
          <Text style={[stili.fattoTitolo, { color: p.testo }]} accessibilityRole="header">
            {t('Grazie, è arrivato.', 'Thank you, it’s arrived.')}
          </Text>
          <Text style={[stili.cosa, { color: p.testoSecondario, fontSize: 15, lineHeight: 22 }]}>
            {t(`Hai completato ${fatti} capitoli su ${CAPITOLI_APP.length}. Puoi continuare o fermarti qui: quello che hai inviato non si perde.`, `You’ve completed ${fatti} of ${CAPITOLI_APP.length} chapters. You can carry on or stop here: what you’ve sent isn’t lost.`)}
          </Text>
        </Carta>
        {prossimo ? (
          <Pulsante testo={t(`Prossimo: ${testoApp(prossimo.titolo)}`, `Next: ${testoApp(prossimo.titolo)}`)} icona="avanti" onPress={() => router.replace({ pathname: '/club-life/survey/app/[capitolo]', params: { capitolo: prossimo.id } })} />
        ) : (
          <Pulsante testo={t('Vai al giudizio finale', 'Go to the final rating')} icona="avanti" onPress={() => router.replace('/club-life/survey/app/finale')} />
        )}
        <Pulsante testo={t('Torna ai capitoli', 'Back to the chapters')} variante="contorno" onPress={() => router.dismissTo(HUB)} />
      </Cornice>
    )
  }

  if (fase === 'uso') {
    return (
      <Cornice sopratitolo={sopratitolo} titolo={testoApp(cap.titolo)} sottotitolo={testoApp(cap.intro)} indietro={HUB}>
        {stato.inviati[cap.id] ? (
          <Messaggio tono="attenzione" icona="info">{t('Hai già inviato questo capitolo: se lo invii di nuovo, la nuova risposta si aggiunge alla prima.', 'You’ve already sent this chapter: if you send it again, the new answers are added to the first ones.')}</Messaggio>
        ) : null}
        <Text style={[stili.domandaFase, { color: p.testo }]} accessibilityRole="header">
          {t('Quali di queste usi?', 'Which of these do you use?')}
        </Text>
        <Text style={[stili.cosa, { color: p.testoSecondario, fontSize: 14, lineHeight: 20 }]}>
          {t('Accendi quelle che usi, anche ogni tanto. Le altre lasciale spente: non ti chiederemo niente.', 'Switch on the ones you use, even occasionally. Leave the others off: we won’t ask you anything about them.')}
        </Text>
        <Carta style={{ paddingVertical: 4 }}>
          {cap.funzioni.map((f, i) => (
            <RigaUso key={f.id} prima={i === 0} nome={testoApp(f.nome)} cosa={testoApp(f.cosa)} acceso={bozza.usate.includes(f.id)} onPress={() => alterna(f.id)} />
          ))}
        </Carta>
        <Pulsante
          testo={usate.length ? t(`Avanti · ${usate.length} ${usate.length === 1 ? 'scelta' : 'scelte'}`, `Next · ${usate.length} selected`) : t('Accendi almeno una funzione', 'Switch on at least one feature')}
          icona="avanti"
          disabilitato={usate.length === 0}
          onPress={avanti}
        />
        {!stato.inviati[cap.id] ? (
          <Pulsante testo={t('Non uso niente di questo capitolo', 'I use nothing from this chapter')} variante="contorno" onPress={nonUsoNiente} />
        ) : null}
      </Cornice>
    )
  }

  return (
    <Cornice sopratitolo={sopratitolo} titolo={testoApp(cap.titolo)} sottotitolo={t('Come ti trovi con quelle che usi?', 'How do you get on with the ones you use?')} indietro={HUB}>
      {!identita ? (
        <SchedeInArrivo quante={2} />
      ) : (
        <>
          {usate.map((f) => {
            const voto = bozza.voti[f.id]
            const scelti = bozza.problemi[f.id] ?? []
            return (
              <DomandaStelle
                key={f.id}
                testo={testoApp(f.nome)}
                sotto={testoApp(f.cosa)}
                voto={voto}
                parole={parole}
                onVoto={(n) => cambia((b) => ({ ...b, voti: { ...b.voti, [f.id]: n } }))}
              >
                {voto !== undefined && voto <= SOGLIA_PROBLEMI ? (
                  <View style={{ gap: spazio.due }}>
                    <Text style={[stili.cosa, { color: p.testoSecondario, fontFamily: F.bold }]}>{t('Cosa non ti convince? (facoltativo)', 'What doesn’t work for you? (optional)')}</Text>
                    <View style={stili.chips}>
                      {PROBLEMI.map((m) => (
                        <Chip
                          key={m.id}
                          testo={testoApp(m.testo)}
                          scelto={scelti.includes(m.id)}
                          onPress={() => cambia((b) => ({ ...b, problemi: { ...b.problemi, [f.id]: scelti.includes(m.id) ? scelti.filter((x) => x !== m.id) : [...scelti, m.id] } }))}
                        />
                      ))}
                    </View>
                  </View>
                ) : null}
              </DomandaStelle>
            )
          })}
          <Carta style={{ gap: spazio.due }}>
            <Text style={[stili.domandaFase, { color: p.testo }]} accessibilityRole="header">
              {t('Vuoi aggiungere qualcosa su questo capitolo?', 'Anything to add about this chapter?')}
            </Text>
            <Text style={[stili.cosa, { color: p.testoSecondario }]}>
              {t('Facoltativo, ed è la parte che ci serve di più: più è preciso — quando, quale schermata, cosa ti aspettavi — più possiamo farci qualcosa.', 'Optional, and it’s the part we need most: the more specific — when, which screen, what you expected — the more we can do about it.')}
            </Text>
            <CampoTesto
              etichetta={t('La tua nota', 'Your note')}
              value={bozza.nota}
              onChangeText={(v) => cambia((b) => ({ ...b, nota: v }))}
              multiline
              submitBehavior="blurAndSubmit"
              returnKeyType="done"
              numberOfLines={4}
              maxLength={MAX_NOTA}
              style={{ minHeight: 110, textAlignVertical: 'top' }}
            />
          </Carta>
          {errore ? <Messaggio>{errore}</Messaggio> : null}
          <Pulsante testo={t('Invia il capitolo', 'Send the chapter')} icona="invia" onPress={invia} inCorso={inCorso} disabilitato={inVista()} />
          <Pulsante testo={t('Cambia le funzioni che usi', 'Change the features you use')} variante="fantasma" onPress={() => setFase('uso')} />
        </>
      )}
    </Cornice>
  )
}

/** Un capitolo che non c'e': un indirizzo vecchio o sbagliato. Si torna ai capitoli. */
function NonTrovato() {
  return (
    <Cornice sopratitolo="Club Life" titolo="Survey" indietro={HUB}>
      <View style={{ gap: spazio.tre }}>
        <Messaggio tono="attenzione">{t('Questo capitolo non è disponibile.', 'This chapter isn’t available.')}</Messaggio>
        <Pulsante testo={t('Tutti i capitoli', 'All chapters')} variante="contorno" onPress={() => router.replace(HUB)} />
      </View>
    </Cornice>
  )
}

/** Un capitolo della survey dell'app. `emailAccesso` e' quella con cui la persona e' entrata: serve solo se l'anagrafica non si legge. */
export function CapitoloApp({ id, emailAccesso }: { id: string; emailAccesso?: string | null }) {
  const cap = capitoloApp(id)
  if (!cap) return <NonTrovato />
  return <Capitolo key={cap.id} cap={cap} emailAccesso={emailAccesso} />
}

const stili = StyleSheet.create({
  rigaUso: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, paddingVertical: 13, minHeight: 56 },
  casella: { width: 26, height: 26, borderWidth: 2, borderRadius: raggio.piccolo - 4, alignItems: 'center', justifyContent: 'center' },
  nome: { fontFamily: F.extra, fontSize: 15.5, lineHeight: 21, letterSpacing: -0.15 },
  cosa: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
  domandaFase: { fontFamily: F.extra, fontSize: 16.5, lineHeight: 22, letterSpacing: -0.2 },
  fattoTitolo: { fontFamily: F.extra, fontSize: 20, lineHeight: 26, letterSpacing: -0.3 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
})
