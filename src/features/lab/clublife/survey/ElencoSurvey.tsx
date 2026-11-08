import { router } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'

import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { Icona } from '../../ui/Icona'
import { Bollino, Carta, Etichetta, Pulsante, Riga, Sezione } from '../../ui/kit'
import { F, usePalette } from '../../ui/tema'
import { hrefModulo } from '../link'
import { Cornice } from '../moduli/Cornice'
import { survey } from './dati'
import { CAPITOLI_APP, funzioniTotali } from './dati-app'

// Le survey in Club Life (03/11/2026): una porta nella pagina e, da li', il menu degli argomenti. Come sul sito (la fascia «Raccontaci come
// sta andando» che porta a `/surveys/`): **la porta non comincia una survey**, perche' chi apre Club Life cerca una news o una risposta, e la
// prima decisione vera e' di cosa parlare. Una carta sola, e non otto righe: le news erano state ridotte a righe proprio perche' spingevano
// l'Help Desk, la cosa per cui si apre Club Life, tre schermate piu' in basso.
//
// Le survey sono scritte nell'app (`survey/dati.ts`): niente da scaricare, quindi la porta e il menu ci sono anche se il sito non risponde.

/** La carta in Club Life, fra le news e l'Help Desk: dopo l'Help Desk si leggerebbe come un passaggio del reclamo appena aperto. */
export function PortaSurvey() {
  const p = usePalette()
  const n = survey().temi.length
  return (
    <Sezione titolo={t('Raccontaci come sta andando', 'Tell us how it’s going')}>
      <Carta onPress={() => router.push('/club-life/survey')} style={stili.porta}>
        <Bollino icona="stella" size={44} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[stili.portaTitolo, { color: p.testo }]}>{t('Dai un giudizio al club', 'Rate the club')}</Text>
          <Text style={[stili.portaSotto, { color: p.testoSecondario }]}>
            {t(`${n} argomenti, meno di un minuto l’uno: lezioni, spogliatoi, piscina, prenotazioni. E una survey sull’app, funzione per funzione. È da qui che decidiamo dove intervenire.`, `${n} topics, under a minute each: classes, locker rooms, pool, bookings. And a survey on the app, feature by feature. It’s how we decide where to step in.`)}
          </Text>
        </View>
        <Icona nome="avanti" size={16} colore={p.testoTerzo} />
      </Carta>
    </Sezione>
  )
}

/** Il menu: un argomento per riga. Da qui non si «comincia» un percorso, si sceglie di cosa parlare e si finisce li'. */
export function MenuSurvey() {
  const p = usePalette()
  const { temi } = survey()
  return (
    <Cornice sopratitolo="Club Life" titolo={t('Dicci come stiamo andando', 'Tell us how we’re doing')} sottotitolo={t('Scegli di cosa vuoi parlarci: bastano pochi tocchi, e basta un giudizio.', 'Pick what you want to tell us about: a few taps, and one rating is enough.')}>
      <Text style={[stili.intro, { color: p.testoSecondario }]}>
        {t('Ascoltare chi frequenta il club è il modo in cui capiamo cosa funziona e cosa no.', 'Listening to the people who come to the club is how we learn what works and what doesn’t.')}
      </Text>
      {/* La survey dell'app (08/11/2026): un'altra forma, a capitoli, non un nono argomento. Prima degli otto, e piu' grande. */}
      <Carta onPress={() => router.push('/club-life/survey/app')} style={stili.evidenza}>
        <Bollino icona="stella" size={48} pieno />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ alignSelf: 'flex-start' }}>
            <Etichetta testo={t('La più completa', 'The most complete')} tono="accento" />
          </View>
          <Text style={[stili.evidenzaTitolo, { color: p.testo }]}>{t('L’app, funzione per funzione', 'The app, feature by feature')}</Text>
          <Text style={[stili.sotto, { color: p.testoSecondario }]}>
            {t(
              `${CAPITOLI_APP.length} capitoli e ${funzioniTotali()} funzioni: ci dici cosa usi e come ti trovi. Un capitolo richiede uno o due minuti e puoi fermarti quando vuoi.`,
              `${CAPITOLI_APP.length} chapters and ${funzioniTotali()} features: you tell us what you use and how you get on with it. A chapter takes a minute or two and you can stop whenever you like.`,
            )}
          </Text>
        </View>
        <Icona nome="avanti" size={16} colore={p.testoTerzo} />
      </Carta>
      <Text style={[stili.sezione, { color: p.testoSecondario }]}>{t('Oppure scegli un argomento del club', 'Or pick a club topic').toUpperCase()}</Text>
      <Carta style={{ paddingVertical: 4 }}>
        {temi.map((x, i) => (
          <Riga
            key={x.slug}
            prima={i === 0}
            titolo={x.titolo}
            sotto={
              <View style={{ gap: 2 }}>
                {x.eyebrow ? <Text style={[stili.occhiello, { color: p.accento }]}>{x.eyebrow.toUpperCase()}</Text> : null}
                <Text style={[stili.sotto, { color: p.testoSecondario }]}>{x.intro}</Text>
              </View>
            }
            onPress={() => router.push({ pathname: '/club-life/survey/[tema]', params: { tema: x.slug } })}
          />
        ))}
      </Carta>
      {/* Un problema da segnalare non e' un giudizio da dare: per quello c'e' una persona. */}
      <Text style={[stili.intro, { color: p.testoSecondario }]}>{t('Hai un problema da segnalare e non un giudizio da dare? Scrivi al club: ti risponde una persona.', 'Have a problem to report, not a rating to give? Write to the club: a person will answer.')}</Text>
      <Pulsante testo={t('Scrivi al club', 'Write to the club')} icona="invia" variante="contorno" onPress={() => router.push(hrefModulo('scrivi'))} />
    </Cornice>
  )
}

const stili = StyleSheet.create({
  evidenza: { flexDirection: 'row', gap: spazio.tre, alignItems: 'center', paddingVertical: spazio.quattro },
  evidenzaTitolo: { fontFamily: F.extra, fontSize: 17.5, lineHeight: 23, letterSpacing: -0.25 },
  sezione: { fontFamily: F.extra, fontSize: 11, letterSpacing: 1.1, marginTop: spazio.due },
  porta: { flexDirection: 'row', gap: spazio.tre, alignItems: 'center' },
  portaTitolo: { fontFamily: F.extra, fontSize: 16.5, lineHeight: 21, letterSpacing: -0.2 },
  portaSotto: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
  intro: { fontFamily: F.medio, fontSize: 14.5, lineHeight: 21 },
  occhiello: { fontFamily: F.extra, fontSize: 11, letterSpacing: 1.1 },
  sotto: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
})
