import { router } from 'expo-router'
import { useState, type ReactNode } from 'react'
import { Platform, StyleSheet, Text, View } from 'react-native'

import { inviaSondaggio } from '@/api/moduli'
import { LARGO } from '@/components/Pagina'
import { useWindowDimensions } from '@/lib/finestra'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { CampoTesto } from '../../ui/Campi'
import { Carta, Messaggio, Pulsante, SchedeInArrivo } from '../../ui/kit'
import { Stella } from '../../ui/Stella'
import { F, FUOCO, raggio, usePalette } from '../../ui/tema'
import { colpetto, Tocco } from '../../ui/Tocco'
import { apriFuori, hrefModulo } from '../link'
import { Cornice, Fatto } from '../moduli/Cornice'
import { inVista, useIdentita } from '../moduli/identita'
import { agenteApp, formaNota, giudizioPositivo, mediaVoti, votiInOrdine } from './calcolo'
import { survey as comporreSurvey, type SurveyClub, type TemaSurvey } from './dati'

// Una survey del club dentro l'app (03/11/2026, richiesta di Maurizio): le stesse domande di `/surveys/<tema>/` del sito, **scritte nell'app**
// (`survey/dati.ts`, niente feed) e inviate alla stessa funzione. La differenza e' chi risponde: la persona e' gia' dentro, quindi **non si chiede
// l'email** — si prende dall'accesso, con il numero socio, e la risposta si aggancia alla sua anagrafica come ogni form del sito. Non si scrive in
// pagina «rispondi come…»: e' scontato, e non va sottolineato.
//
// Come sul sito: un giudizio basta (le altre domande, l'NPS e la nota sono facoltativi), la domanda aperta cambia con i voti, e solo chi e'
// contento — NPS alto o media alta — riceve la richiesta di una recensione su Google. In vista cliente non si invia niente: chi guarda l'app
// di un socio non risponde al suo posto.

/**
 * Una domanda a stelle: il testo, cinque stelle da toccare, e sotto la parola della stella scelta («Molto»). Sul telefono il testo sta sopra
 * e le stelle sotto; da schermo largo (`LARGO`) stanno sulla stessa riga, il testo a sinistra e le stelle a destra: in una carta larga
 * mille punti le stelle schiacciate a sinistra lasciavano meta' carta vuota, e sette domande diventavano un'altezza di sette schermate.
 *
 * Le parole delle stelle sono quelle di chi la usa (`parole`, da «Per niente» a «Moltissimo» nelle survey del club, da «Male» a
 * «Benissimo» in quella dell'app). `sotto` e' una riga di spiegazione sotto il testo, e `children` qualcosa sotto le stelle (i motivi per cui
 * una funzione non convince): sono della survey dell'app e senza non cambia niente per le altre.
 */
export function DomandaStelle({ testo, sotto, voto, parole, onVoto, children }: { testo: string; sotto?: string; voto: number | undefined; parole: string[]; onVoto: (n: number) => void; children?: ReactNode }) {
  const p = usePalette()
  const { width } = useWindowDimensions()
  const largo = width >= LARGO
  const stelle = (
    <View style={[stili.stelle, largo && { marginLeft: 0, marginRight: -6 }]} accessibilityRole="radiogroup" accessibilityLabel={testo}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Tocco
          key={n}
          onPress={() => onVoto(n)}
          scala={0.9}
          vibra="scelta"
          ruolo="radio"
          etichetta={t(`${n} ${n === 1 ? 'stella' : 'stelle'} su 5: ${parole[n - 1]}`, `${n} ${n === 1 ? 'star' : 'stars'} out of 5`)}
          stato={{ selected: voto === n, checked: voto === n }}
          style={stili.bersaglioStella}
        >
          <Stella piena={voto !== undefined && n <= voto} size={34} colore={FUOCO[0]} vuota={p.testoTerzo} />
        </Tocco>
      ))}
    </View>
  )
  // La parola della stella scelta occupa sempre la sua riga (o la sua larghezza): scegliere non sposta niente.
  const parola = (
    <Text style={[stili.voto, { color: voto ? p.accento : p.testoTerzo }, largo && stili.votoLargo]} accessibilityLiveRegion="polite">
      {(voto && voto >= 1 && voto <= parole.length ? parole[voto - 1] : '') || ' '}
    </Text>
  )
  const intestazione = (
    <View style={largo ? { flex: 1, gap: 3 } : { gap: 3 }}>
      <Text style={[stili.domanda, { color: p.testo }]} accessibilityRole="header">
        {testo}
      </Text>
      {sotto ? <Text style={[stili.aiuto, { color: p.testoSecondario }]}>{sotto}</Text> : null}
    </View>
  )
  return (
    <Carta style={{ gap: spazio.tre }}>
      <View style={largo ? stili.cartaLarga : { gap: spazio.due }}>
        {intestazione}
        {largo ? (
          <View style={stili.stelleLarghe}>
            {parola}
            {stelle}
          </View>
        ) : (
          <View>
            {stelle}
            {parola}
          </View>
        )}
      </View>
      {children}
    </Carta>
  )
}

const GAP_NPS = 6
const MINIMO_NPS = 44
const MASSIMO_NPS = 56

/** L'NPS: undici tocchi, da 0 a 10. In una riga se ci stanno tutti a misura di dito, altrimenti in due (0–5 e 6–10). */
export function DomandaNps({ domanda, nps, onNps }: { domanda: { testo: string; minimo: string; massimo: string }; nps: number | null; onNps: (n: number) => void }) {
  const p = usePalette()
  const [larghezza, setLarghezza] = useState(0)
  const unaRiga = larghezza >= 11 * MINIMO_NPS + 10 * GAP_NPS
  const perRiga = unaRiga ? 11 : 6
  const lato = larghezza ? Math.min(MASSIMO_NPS, Math.floor((larghezza - GAP_NPS * (perRiga - 1)) / perRiga)) : MINIMO_NPS
  const valori = Array.from({ length: 11 }, (_, n) => n)
  const righe = unaRiga ? [valori] : [valori.slice(0, 6), valori.slice(6)]
  return (
    <Carta style={{ gap: spazio.tre }}>
      <Text style={[stili.domanda, { color: p.testo }]} accessibilityRole="header">
        {domanda.testo}
      </Text>
      <View style={{ gap: GAP_NPS }} onLayout={(e) => setLarghezza(e.nativeEvent.layout.width)} accessibilityRole="radiogroup" accessibilityLabel={domanda.testo}>
        {righe.map((riga, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: GAP_NPS }}>
            {riga.map((n) => {
              const scelto = nps === n
              return (
                <Tocco
                  key={n}
                  onPress={() => onNps(n)}
                  scala={0.92}
                  vibra="scelta"
                  ruolo="radio"
                  etichetta={t(`${n} su 10`, `${n} out of 10`)}
                  stato={{ selected: scelto, checked: scelto }}
                  style={[stili.nps, { width: lato, backgroundColor: scelto ? p.accento : p.incavo, borderColor: scelto ? p.accento : p.linea }]}
                >
                  <Text style={{ color: scelto ? '#fff' : p.testo, fontFamily: scelto ? F.extra : F.semi, fontSize: 16 }}>{n}</Text>
                </Tocco>
              )
            })}
          </View>
        ))}
      </View>
      <View style={stili.scala}>
        <Text style={[stili.scalaTesto, { color: p.testoSecondario }]}>{`0 — ${domanda.minimo}`}</Text>
        <Text style={[stili.scalaTesto, { color: p.testoSecondario, textAlign: 'right' }]}>{`10 — ${domanda.massimo}`}</Text>
      </View>
    </Carta>
  )
}

export function Grazie({ positivo, survey }: { positivo: boolean; survey: SurveyClub }) {
  const p = usePalette()
  // `dismissTo` e non `navigate`: torna al menu che e' gia' nello stack invece di impilarne una copia a ogni argomento, e se la survey si e' aperta da un
  // link (e il menu non c'e') lo apre.
  const altro = <Pulsante testo={t('Rispondi a un altro argomento', 'Answer another topic')} variante="contorno" onPress={() => router.dismissTo('/club-life/survey')} />
  if (positivo) {
    return (
      <Cornice sopratitolo={t('Grazie', 'Thank you')} titolo={t('Ci fa piacere davvero', 'That means a lot')} indietro="/club-life/survey">
        <Fatto titolo={t('Risposta inviata', 'Answers sent')}>
          <View style={{ gap: spazio.tre }}>
            <Text style={[stili.fattoTesto, { color: p.testoSecondario }]}>{t('Grazie per il tempo che ci hai dedicato: quello che hai scritto arriva a chi se ne occupa.', 'Thank you for your time: what you wrote reaches the people who handle it.')}</Text>
            {survey.recensione ? (
              <>
                <Text style={[stili.fattoTesto, { color: p.testoSecondario }]}>
                  {t('Se ti va di darci una mano a farci conoscere, la cosa che vale di più è una recensione su Google: la leggono le persone che stanno decidendo se venire a provare, e ci mette due minuti.', 'If you’d like to help people find us, the best thing you can do is a Google review: it’s read by people deciding whether to come and try us, and it takes two minutes.')}
                </Text>
                <Pulsante testo={t('Scrivi una recensione su Google', 'Write a Google review')} icona="apriFuori" onPress={() => apriFuori(survey.recensione)} />
              </>
            ) : null}
            {altro}
          </View>
        </Fatto>
      </Cornice>
    )
  }
  return (
    <Cornice sopratitolo={t('Grazie', 'Thank you')} titolo={t('Grazie, l’abbiamo letta', 'Thanks, we’ve read it')} indietro="/club-life/survey">
      <Fatto titolo={t('Risposta inviata', 'Answers sent')}>
        <View style={{ gap: spazio.tre }}>
          <Text style={[stili.fattoTesto, { color: p.testoSecondario }]}>{t('La tua risposta è arrivata. Le leggiamo tutte, e quelle che dicono cosa non va sono quelle da cui cambiamo qualcosa.', 'Your answers have arrived. We read them all, and the ones that tell us what’s wrong are the ones that make us change things.')}</Text>
          <Text style={[stili.fattoTesto, { color: p.testoSecondario }]}>
            {t('Se c’è una cosa che va sistemata adesso — un abbonamento, una prenotazione, qualcosa che è successo — scrivi al club: ti risponde una persona, non un questionario.', 'If something needs sorting out right now — a membership, a booking, something that happened — write to the club: a person will answer, not a questionnaire.')}
          </Text>
          <Pulsante testo={t('Scrivi al club', 'Write to the club')} icona="invia" onPress={() => router.push(hrefModulo('scrivi'))} />
          {altro}
        </View>
      </Fatto>
    </Cornice>
  )
}

function Modulo({ survey, tema, emailAccesso }: { survey: SurveyClub; tema: TemaSurvey; emailAccesso?: string | null }) {
  const p = usePalette()
  const identita = useIdentita(emailAccesso)
  const [scelte, setScelte] = useState<Record<string, number>>({})
  const [nps, setNps] = useState<number | null>(null)
  const [nota, setNota] = useState('')
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  /** `null` finche' non e' partita; poi se il giudizio e' da recensione. */
  const [positivo, setPositivo] = useState<boolean | null>(null)

  const media = mediaVoti(votiInOrdine(tema.domande, scelte))
  const forma = formaNota(survey, media, nps)

  async function invia() {
    if (inCorso || !identita || inVista()) return
    setErrore(null)
    const voti = votiInOrdine(tema.domande, scelte)
    const m = mediaVoti(voti)
    // Il solo controllo che ferma l'invio: una risposta senza nemmeno un voto non e' una risposta. Il resto e' facoltativo per scelta.
    if (m === null && nps === null) return setErrore(t('Dai almeno un giudizio: basta una domanda.', 'Give at least one rating: one question is enough.'))
    setInCorso(true)
    const esito = await inviaSondaggio({ sondaggio: tema.slug, risposte: voti, nps, nota: nota.trim(), email: identita.email, numero: identita.numero }, agenteApp(Platform.OS))
    setInCorso(false)
    if (!esito.ok) {
      colpetto('errore')
      return setErrore(esito.errore)
    }
    colpetto('ok')
    setPositivo(giudizioPositivo(m, nps, survey.soglia))
  }

  if (positivo !== null) return <Grazie positivo={positivo} survey={survey} />

  return (
    <Cornice sopratitolo={tema.eyebrow || 'Survey'} titolo={tema.titolo} sottotitolo={tema.intro} indietro="/club-life/survey">
      {!identita ? (
        <SchedeInArrivo quante={2} />
      ) : (
        <>
          {tema.domande.map((d) => (
            <DomandaStelle
              key={d.id}
              testo={d.testo}
              voto={scelte[d.id]}
              parole={survey.stelle}
              onVoto={(n) => {
                setScelte((prima) => ({ ...prima, [d.id]: n }))
                setErrore(null)
              }}
            />
          ))}
          <DomandaNps
            domanda={survey.nps}
            nps={nps}
            onNps={(n) => {
              setNps(n)
              setErrore(null)
            }}
          />
          {/* La domanda aperta c'e' sempre, ed e' l'unica che puo' dirci una cosa che non avevamo pensato di chiedere: cambia solo la frase. */}
          <Carta style={{ gap: spazio.due }}>
            <Text style={[stili.domanda, { color: p.testo }]} accessibilityRole="header">
              {forma.titolo}
            </Text>
            {forma.aiuto ? <Text style={[stili.aiuto, { color: p.testoSecondario }]}>{forma.aiuto}</Text> : null}
            <CampoTesto
              etichetta={t('La tua nota', 'Your note')}
              value={nota}
              onChangeText={setNota}
              multiline
              submitBehavior="blurAndSubmit"
              returnKeyType="done"
              numberOfLines={4}
              maxLength={1000}
              style={{ minHeight: 110, textAlignVertical: 'top' }}
            />
          </Carta>
          {errore ? <Messaggio>{errore}</Messaggio> : null}
          <Pulsante testo={t('Invia', 'Send')} icona="invia" onPress={invia} inCorso={inCorso} disabilitato={inVista()} />
        </>
      )}
    </Cornice>
  )
}

/** Un argomento che non c'e': un indirizzo vecchio o sbagliato (una notifica, un link). Si torna al menu. */
function NonTrovato() {
  return (
    <Cornice sopratitolo="Club Life" titolo="Survey" indietro="/club-life/survey">
      <View style={{ gap: spazio.tre }}>
        <Messaggio tono="attenzione">{t('Questo argomento non è disponibile.', 'This topic isn’t available.')}</Messaggio>
        <Pulsante testo={t('Tutti gli argomenti', 'All topics')} variante="contorno" onPress={() => router.replace('/club-life/survey')} />
      </View>
    </Cornice>
  )
}

/** La survey di un argomento. `emailAccesso` e' quella con cui la persona e' entrata: serve solo se l'anagrafica non si legge. */
export function Survey({ slug, emailAccesso }: { slug: string; emailAccesso?: string | null }) {
  const survey = comporreSurvey()
  const tema = survey.temi.find((x) => x.slug === slug)
  if (!tema) return <NonTrovato />
  return <Modulo key={tema.slug} survey={survey} tema={tema} emailAccesso={emailAccesso} />
}

const stili = StyleSheet.create({
  domanda: { fontFamily: F.extra, fontSize: 16.5, lineHeight: 22, letterSpacing: -0.2 },
  aiuto: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
  cartaLarga: { flexDirection: 'row', alignItems: 'center', gap: spazio.quattro },
  stelle: { flexDirection: 'row', gap: 4, marginLeft: -6 },
  bersaglioStella: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  voto: { fontFamily: F.bold, fontSize: 13.5, lineHeight: 19 },
  votoLargo: { minWidth: 110, textAlign: 'right' },
  stelleLarghe: { flexDirection: 'row', alignItems: 'center', gap: spazio.due },
  nps: { height: 48, borderWidth: 1.5, borderRadius: raggio.piccolo, alignItems: 'center', justifyContent: 'center' },
  scala: { flexDirection: 'row', justifyContent: 'space-between', gap: spazio.tre },
  scalaTesto: { flex: 1, fontFamily: F.medio, fontSize: 12.5, lineHeight: 17 },
  fattoTesto: { fontFamily: F.medio, fontSize: 15, lineHeight: 22 },
})
