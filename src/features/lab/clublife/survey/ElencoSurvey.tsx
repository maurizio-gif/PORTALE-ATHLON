import { router } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'

import type { SurveyClub } from '@/api/clubLife'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { Icona } from '../../ui/Icona'
import { Bollino, Carta, Messaggio, Pulsante, Riga, SchedeInArrivo, Sezione } from '../../ui/kit'
import { F, raggio, usePalette } from '../../ui/tema'
import { useClubLife } from '../dati'
import { hrefModulo } from '../link'
import { Cornice } from '../moduli/Cornice'
import { useIdentita } from '../moduli/identita'

// Le survey in Club Life (03/11/2026): una porta nella pagina e, da li', il menu degli argomenti. Come sul sito (la fascia «Raccontaci come
// sta andando» che porta a `/surveys/`): **la porta non comincia una survey**, perche' chi apre Club Life cerca una news o una risposta, e la
// prima decisione vera e' di cosa parlare. Una carta sola, e non otto righe: le news erano state ridotte a righe proprio perche' spingevano
// l'Help Desk, la cosa per cui si apre Club Life, tre schermate piu' in basso.

/** La carta in Club Life, fra le news e l'Help Desk: dopo l'Help Desk si leggerebbe come un passaggio del reclamo appena aperto. */
export function PortaSurvey({ survey }: { survey: SurveyClub }) {
  const p = usePalette()
  return (
    <Sezione titolo={t('Raccontaci come sta andando', 'Tell us how it’s going')}>
      <Carta onPress={() => router.push('/club-life/survey')} style={stili.porta}>
        <Bollino icona="stella" size={44} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[stili.portaTitolo, { color: p.testo }]}>{t('Dai un giudizio al club', 'Rate the club')}</Text>
          <Text style={[stili.portaSotto, { color: p.testoSecondario }]}>
            {t(`${survey.temi.length} argomenti, meno di un minuto l’uno: lezioni, spogliatoi, piscina, prenotazioni. È da qui che decidiamo dove intervenire.`, `${survey.temi.length} topics, under a minute each: classes, locker rooms, pool, bookings. It’s how we decide where to step in.`)}
          </Text>
        </View>
        <Icona nome="avanti" size={16} colore={p.testoTerzo} />
      </Carta>
    </Sezione>
  )
}

/** Il menu: un argomento per riga. Da qui non si «comincia» un percorso, si sceglie di cosa parlare e si finisce li'. */
export function MenuSurvey({ emailAccesso }: { emailAccesso?: string | null }) {
  const p = usePalette()
  const { dati, errore, riprova } = useClubLife()
  const identita = useIdentita(emailAccesso)
  const survey = dati?.survey ?? null
  return (
    <Cornice sopratitolo="Club Life" titolo={t('Dicci come stiamo andando', 'Tell us how we’re doing')} sottotitolo={t('Scegli di cosa vuoi parlarci: bastano pochi tocchi, e basta un giudizio.', 'Pick what you want to tell us about: a few taps, and one rating is enough.')}>
      {!survey ? (
        !dati && !errore ? (
          <SchedeInArrivo quante={2} />
        ) : (
          <View style={{ gap: spazio.tre }}>
            <Messaggio tono={dati ? 'attenzione' : 'errore'}>{dati ? t('Le survey non sono disponibili adesso.', 'Surveys aren’t available right now.') : errore}</Messaggio>
            {dati ? null : <Pulsante testo={t('Riprova', 'Try again')} icona="aggiorna" onPress={riprova} />}
            <Pulsante testo={t('Torna a Club Life', 'Back to Club Life')} variante="contorno" onPress={() => router.replace('/club-life')} />
          </View>
        )
      ) : (
        <>
          <Text style={[stili.intro, { color: p.testoSecondario }]}>
            {t('Ascoltare chi frequenta il club è il modo in cui capiamo cosa funziona e cosa no. Le risposte arrivano a tuo nome: se serve, possiamo risponderti.', 'Listening to the people who come to the club is how we learn what works and what doesn’t. Your answers reach us under your name: if needed, we can reply.')}
          </Text>
          {identita?.email ? (
            <View style={[stili.come, { backgroundColor: p.incavo }]}>
              <Text style={[stili.comeTesto, { color: p.testoSecondario }]}>
                {t('Rispondi come ', 'You’re answering as ')}
                <Text style={{ color: p.testo, fontFamily: F.bold }}>{identita.email}</Text>
              </Text>
            </View>
          ) : null}
          <Carta style={{ paddingVertical: 4 }}>
            {survey.temi.map((x, i) => (
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
        </>
      )}
    </Cornice>
  )
}

const stili = StyleSheet.create({
  porta: { flexDirection: 'row', gap: spazio.tre, alignItems: 'center' },
  portaTitolo: { fontFamily: F.extra, fontSize: 16.5, lineHeight: 21, letterSpacing: -0.2 },
  portaSotto: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
  intro: { fontFamily: F.medio, fontSize: 14.5, lineHeight: 21 },
  come: { borderRadius: raggio.piccolo, paddingHorizontal: spazio.tre - 2, paddingVertical: spazio.tre - 4 },
  comeTesto: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  occhiello: { fontFamily: F.extra, fontSize: 11, letterSpacing: 1.1 },
  sotto: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
})
