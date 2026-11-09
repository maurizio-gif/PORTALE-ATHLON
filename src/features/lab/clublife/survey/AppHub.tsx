import { router } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'

import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { Carta, Etichetta, Pulsante, Riga } from '../../ui/kit'
import type { NomeIcona } from '../../ui/Icona'
import { F, usePalette } from '../../ui/tema'
import { Cornice } from '../moduli/Cornice'
import { capitoliFatti } from './calcolo-app'
import { CAPITOLI_APP, funzioniTotali, testoApp } from './dati-app'
import { useSurveyApp } from './statoApp'

// Il menu dei capitoli della survey dell'app (08/11/2026, richiesta di Maurizio: «una survey sull'app bella completa su tutte le sue
// funzionalita', chiedendo cosa utilizzano ed il giudizio»). Un capitolo per ogni parte dell'app; si sceglie quali fare, in qualunque
// ordine, e ognuno si invia da solo: chi si ferma a meta' ha comunque lasciato quello che aveva finito. In fondo il giudizio sull'app
// nel suo insieme. Come funziona e cosa arriva al server: la testata di `dati-app.ts`.

const ICONE: Record<string, NomeIcona> = {
  home: 'casa',
  prenotazioni: 'calendario',
  abbonamento: 'abbonamento',
  train: 'fiamma',
  'food-recover': 'torta',
  punteggio: 'grafico',
  'famiglia-junior': 'famiglia',
  club: 'giornale',
}

export function HubApp() {
  const p = usePalette()
  const stato = useSurveyApp()
  const n = CAPITOLI_APP.length
  const fatti = capitoliFatti(stato.inviati, stato.nonUsa)
  return (
    <Cornice
      sopratitolo={t('Club Life · Survey', 'Club Life · Survey')}
      titolo={t('L’app, funzione per funzione', 'The app, feature by feature')}
      sottotitolo={t('Cosa usi e come ti trovi, parte per parte.', 'What you use and how you get on with it, part by part.')}
      indietro="/club-life/survey"
    >
      <Text style={[stili.intro, { color: p.testoSecondario }]}>
        {t(
          `${n} capitoli, uno per ogni parte dell’app, e ${funzioniTotali()} funzioni in tutto. Scegli quelli che ti riguardano: per ognuno ci dici quali funzioni usi e come ti ci trovi. Un capitolo richiede uno o due minuti e, una volta inviato, è già arrivato: puoi fermarti quando vuoi.`,
          `${n} chapters, one for each part of the app, and ${funzioniTotali()} features in all. Pick the ones that matter to you: for each, tell us which features you use and how you get on with them. A chapter takes a minute or two and, once sent, it has already reached us: you can stop whenever you like.`,
        )}
      </Text>
      <Text style={[stili.intro, { color: p.testoSecondario }]}>
        {t('Se di un capitolo non usi niente, dillo: ci aiuta quanto un voto.', 'If you use nothing from a chapter, say so: it helps as much as a rating.')}
      </Text>

      <Carta style={{ paddingVertical: 4 }}>
        {CAPITOLI_APP.map((c, i) => {
          const inviato = !!stato.inviati[c.id]
          const non = !!stato.nonUsa[c.id]
          const anteprima = c.funzioni
            .slice(0, 3)
            .map((f) => testoApp(f.nome))
            .join(', ')
          return (
            <Riga
              key={c.id}
              prima={i === 0}
              icona={ICONE[c.id]}
              tono={inviato ? 'ok' : 'accento'}
              titolo={testoApp(c.titolo)}
              sotto={
                <View style={{ gap: 2 }}>
                  <Text style={[stili.occhiello, { color: p.accento }]}>{testoApp(c.eyebrow).toUpperCase()}</Text>
                  <Text style={[stili.sotto, { color: p.testoSecondario }]}>{t(`${c.funzioni.length} funzioni: ${anteprima}…`, `${c.funzioni.length} features: ${anteprima}…`)}</Text>
                </View>
              }
              coda={
                inviato ? (
                  <Etichetta testo={t('Inviato', 'Sent')} tono="ok" icona="ok" />
                ) : non ? (
                  <Etichetta testo={t('Non lo uso', 'Not for me')} tono="neutro" />
                ) : undefined
              }
              onPress={() => router.push({ pathname: '/club-life/survey/app/[capitolo]', params: { capitolo: c.id } })}
            />
          )
        })}
      </Carta>

      <Carta style={{ gap: spazio.tre }}>
        <Text style={[stili.titolo, { color: p.testo }]} accessibilityRole="header">
          {t('Quando hai finito', 'When you’re done')}
        </Text>
        <Text style={[stili.sotto, { color: p.testoSecondario }]}>
          {t(
            'Quattro domande sull’app nel suo insieme e una sola cosa da dirci: da dove cominciare a migliorarla. Ci vuole un minuto.',
            'Four questions about the app as a whole and one thing to tell us: where to start improving it. It takes a minute.',
          )}
        </Text>
        {fatti > 0 ? (
          <Text style={[stili.sotto, { color: p.accento, fontFamily: F.bold }]}>{t(`Hai completato ${fatti} capitoli su ${n}.`, `You’ve completed ${fatti} of ${n} chapters.`)}</Text>
        ) : null}
        <Pulsante testo={t('Vai al giudizio finale', 'Go to the final rating')} icona="avanti" onPress={() => router.push('/club-life/survey/app/finale')} />
      </Carta>
    </Cornice>
  )
}

const stili = StyleSheet.create({
  intro: { fontFamily: F.medio, fontSize: 14.5, lineHeight: 21 },
  titolo: { fontFamily: F.extra, fontSize: 16.5, lineHeight: 22, letterSpacing: -0.2 },
  occhiello: { fontFamily: F.extra, fontSize: 11, letterSpacing: 1.1 },
  sotto: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
})
