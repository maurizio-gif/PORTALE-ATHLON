import { router } from 'expo-router'
import { useState } from 'react'
import { Platform, StyleSheet, Text, View } from 'react-native'

import { inviaSondaggio } from '@/api/moduli'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { CampoTesto } from '../../ui/Campi'
import { Carta, Messaggio, Pulsante, SchedeInArrivo } from '../../ui/kit'
import { F, usePalette } from '../../ui/tema'
import { colpetto } from '../../ui/Tocco'
import { Cornice } from '../moduli/Cornice'
import { inVista, useIdentita } from '../moduli/identita'
import { Chip } from './AppPezzi'
import { agenteApp, giudizioPositivo, mediaVoti } from './calcolo'
import { MAX_NOTA, capitoliFatti, notaFinale, righeFinale } from './calcolo-app'
import { survey as comporreSurvey } from './dati'
import { CAPITOLI_APP, DOMANDE_GENERALI, MAX_PRIORITA, NPS_APP, SLUG_FINALE, testoApp } from './dati-app'
import { aggiornaFinale, azzeraSurveyApp, leggiSurveyApp, useSurveyApp } from './statoApp'
import { DomandaNps, DomandaStelle, Grazie } from './Survey'

// Il giudizio finale sull'app (08/11/2026): quattro domande a stelle sull'app nel suo insieme, l'NPS, «da dove cominciare a migliorarla»
// e una nota. E' la riga `app-generale`, e porta anche — come voci senza voto — i capitoli in cui la persona ha detto di non usare niente
// (`non-usa-<capitolo>`): per quei capitoli non e' partita nessuna riga, e il server ne rifiuta una senza giudizi. Dopo l'invio, come per
// ogni survey del club, solo chi e' contento (NPS ≥ 9 oppure media ≥ 4,5) riceve la richiesta di una recensione su Google.

const HUB = '/club-life/survey/app'

function Finale({ emailAccesso }: { emailAccesso?: string | null }) {
  const p = usePalette()
  const stato = useSurveyApp()
  const identita = useIdentita(emailAccesso)
  const club = comporreSurvey()
  const bozza = stato.finale
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [positivo, setPositivo] = useState<boolean | null>(null)

  const fatti = capitoliFatti(stato.inviati, stato.nonUsa)
  const cambia = (f: Parameters<typeof aggiornaFinale>[0]) => {
    setErrore(null)
    aggiornaFinale(f)
  }

  async function invia() {
    if (inCorso || !identita || inVista()) return
    setErrore(null)
    const attuale = leggiSurveyApp()
    const voci = righeFinale(attuale.finale, Object.keys(attuale.nonUsa))
    const media = mediaVoti(voci)
    if (media === null && attuale.finale.nps === null) return setErrore(t('Dai almeno un giudizio: basta una domanda.', 'Give at least one rating: one question is enough.'))
    setInCorso(true)
    const esito = await inviaSondaggio(
      { sondaggio: SLUG_FINALE, risposte: voci, nps: attuale.finale.nps, nota: notaFinale(attuale.finale), email: identita.email, numero: identita.numero },
      agenteApp(Platform.OS),
    )
    setInCorso(false)
    if (!esito.ok) {
      colpetto('errore')
      return setErrore(esito.errore)
    }
    colpetto('ok')
    // La survey e' finita: la prossima volta si riparte puliti (e il ringraziamento sta nello stato di questa schermata, che non si butta).
    setPositivo(giudizioPositivo(media, attuale.finale.nps, club.soglia))
    azzeraSurveyApp()
  }

  if (positivo !== null) return <Grazie positivo={positivo} survey={club} />

  return (
    <Cornice
      sopratitolo={t('Ultimo passo', 'Last step')}
      titolo={t('Il giudizio sull’app', 'Your verdict on the app')}
      sottotitolo={t('Quattro domande, un consiglio e una nota. Ci vuole un minuto.', 'Four questions, one pointer and a note. It takes a minute.')}
      indietro={HUB}
    >
      {!identita ? (
        <SchedeInArrivo quante={2} />
      ) : (
        <>
          {fatti === 0 ? (
            <Messaggio tono="attenzione" icona="info">{t('Non hai ancora completato nessun capitolo: va bene lo stesso, ma i capitoli sono la parte che ci dice di più.', 'You haven’t completed any chapter yet: that’s fine, but the chapters are the part that tells us the most.')}</Messaggio>
          ) : null}
          {DOMANDE_GENERALI.map((q) => (
            <DomandaStelle
              key={q.id}
              testo={testoApp(q.testo)}
              voto={bozza.voti[q.id]}
              parole={club.stelle}
              onVoto={(n) => cambia((b) => ({ ...b, voti: { ...b.voti, [q.id]: n } }))}
            />
          ))}
          <DomandaNps
            domanda={{ testo: testoApp(NPS_APP.testo), minimo: testoApp(NPS_APP.minimo), massimo: testoApp(NPS_APP.massimo) }}
            nps={bozza.nps}
            onNps={(n) => cambia((b) => ({ ...b, nps: n }))}
          />
          <Carta style={{ gap: spazio.tre }}>
            <View style={{ gap: 3 }}>
              <Text style={[stili.domanda, { color: p.testo }]} accessibilityRole="header">
                {t('Se potessimo migliorare una parte sola, quale?', 'If we could improve just one part, which would it be?')}
              </Text>
              <Text style={[stili.aiuto, { color: p.testoSecondario }]}>
                {t(`Facoltativo. Scegline fino a ${MAX_PRIORITA === 2 ? 'due' : MAX_PRIORITA}.`, `Optional. Pick up to ${MAX_PRIORITA}.`)}
              </Text>
            </View>
            <View style={stili.chips}>
              {CAPITOLI_APP.map((c) => {
                const scelto = bozza.priorita.includes(c.id)
                return (
                  <Chip
                    key={c.id}
                    testo={testoApp(c.titolo)}
                    scelto={scelto}
                    spento={!scelto && bozza.priorita.length >= MAX_PRIORITA}
                    onPress={() => cambia((b) => ({ ...b, priorita: scelto ? b.priorita.filter((x) => x !== c.id) : [...b.priorita, c.id] }))}
                  />
                )
              })}
            </View>
          </Carta>
          <Carta style={{ gap: spazio.due }}>
            <Text style={[stili.domanda, { color: p.testo }]} accessibilityRole="header">
              {t('Cosa ti manca di più nell’app?', 'What do you miss most in the app?')}
            </Text>
            <Text style={[stili.aiuto, { color: p.testoSecondario }]}>
              {t('Facoltativo, ed è la parte che ci serve di più: una funzione che non c’è, una che cambieresti, una che ti ha cambiato la giornata.', 'Optional, and it’s the part we need most: a feature that isn’t there, one you’d change, one that made your day.')}
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
          <Pulsante testo={t('Invia', 'Send')} icona="invia" onPress={invia} inCorso={inCorso} disabilitato={inVista()} />
          <Pulsante testo={t('Torna ai capitoli', 'Back to the chapters')} variante="fantasma" onPress={() => router.dismissTo(HUB)} />
        </>
      )}
    </Cornice>
  )
}

export function FinaleApp({ emailAccesso }: { emailAccesso?: string | null }) {
  return <Finale emailAccesso={emailAccesso} />
}

const stili = StyleSheet.create({
  domanda: { fontFamily: F.extra, fontSize: 16.5, lineHeight: 22, letterSpacing: -0.2 },
  aiuto: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
})
