import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import type Animated from 'react-native-reanimated'

import type { AreaHelpDesk, EventoClub, NewsClub, SchedaHelpDesk } from '@/api/clubLife'
import { LARGO } from '@/components/Pagina'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { CampoTesto } from '../ui/Campi'
import { Icona } from '../ui/Icona'
import { Carta, Entra, Messaggio, Pulsante, Riga, SchedeInArrivo, Sezione } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, raggio, usePalette } from '../ui/tema'
import { bollinoData, cerca, dataNews, giornoEvento } from './comune'
import { ascoltaClubLifeDaCapo } from './daCapo'
import { useClubLife } from './dati'
import { percorsoScheda } from './link'

// Club Life nell'app: le news, gli eventi in arrivo e le risposte dell'Help Desk,
// disegnati qui coi dati del sito (club-life.json) invece della pagina del sito
// incorporata. La pagina era pensata per chi non e' entrato: un layout intero da
// scaricare, e moduli che chiedono email e anagrafica a chi l'app conosce gia'.
//
// I moduli per ora restano fuori (scelta del 16/10/2026: si rifanno a parte,
// sapendo chi e'). Dove una scheda ne contiene uno, il suo comando apre la
// pagina del sito proprio li'.

function colonne(width: number) {
  return width >= LARGO ? 3 : width >= 600 ? 2 : 1
}

function CartaEvento({ e }: { e: EventoClub }) {
  const p = usePalette()
  const b = bollinoData(e.data)
  return (
    <Carta onPress={() => router.push({ pathname: '/club-life/eventi/[id]', params: { id: e.id } })} style={stili.cartaFoto}>
      <View style={[stili.foto, { backgroundColor: p.incavo }]}>
        {e.miniatura ? <Image source={{ uri: e.miniatura }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} accessibilityLabel={e.alt} /> : null}
        <View style={[stili.bollino, { backgroundColor: p.carta }]}>
          <Text style={[stili.bollinoGiorno, { color: p.testo }]}>{b.giorno}</Text>
          <Text style={[stili.bollinoMese, { color: p.accento }]}>{b.mese}</Text>
        </View>
        {e.gratuito ? (
          <View style={[stili.pillola, { backgroundColor: p.accento }]}>
            <Text style={stili.pillolaTesto}>{t('GRATUITO', 'FREE')}</Text>
          </View>
        ) : null}
      </View>
      <View style={stili.cartaTesto}>
        <Text style={[stili.occhiello, { color: p.accento }]}>{e.etichetta.toUpperCase()}</Text>
        <Text style={[stili.cartaTitolo, { color: p.testo }]} numberOfLines={2}>
          {e.titolo}
        </Text>
        <Text style={[stili.cartaSotto, { color: p.testoSecondario }]} numberOfLines={1}>
          {e.ora ? `${giornoEvento(e.data)} · ${e.ora}` : giornoEvento(e.data)}
        </Text>
      </View>
    </Carta>
  )
}

/* Le news sono righe con la foto di lato, non copertine: sono comunicazioni da
   scorrere, e tre copertine a tutta larghezza spingevano l'Help Desk — la cosa
   per cui si apre Club Life — tre schermate piu' in basso. */
function CartaNews({ n }: { n: NewsClub }) {
  const p = usePalette()
  return (
    <Carta onPress={() => router.push({ pathname: '/club-life/news/[id]', params: { id: n.id } })} style={stili.cartaNews}>
      <Image source={{ uri: n.miniatura }} style={[stili.fotoNews, { backgroundColor: p.incavo }]} contentFit="cover" transition={200} accessibilityLabel={n.alt} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[stili.occhiello, { color: p.accento }]} numberOfLines={1}>
          {n.categoria.toUpperCase()}
          <Text style={{ color: p.testoTerzo }}>{`  ·  ${dataNews(n.data)}`}</Text>
        </Text>
        <Text style={[stili.titoloNews, { color: p.testo }]} numberOfLines={3}>
          {n.titolo}
        </Text>
      </View>
    </Carta>
  )
}

function Griglia<T extends { id: string }>({ voci, disegna }: { voci: T[]; disegna: (v: T) => ReactNode }) {
  const { width } = useWindowDimensions()
  const n = colonne(width)
  const larghezza = `${100 / n}%` as `${number}%`
  return (
    <View style={stili.griglia}>
      {voci.map((v, i) => (
        <Entra key={v.id} indice={i} style={{ width: larghezza, padding: META }}>
          {disegna(v)}
        </Entra>
      ))}
    </View>
  )
}

function ElencoSchede({ schede }: { schede: SchedaHelpDesk[] }) {
  return (
    <Carta style={{ paddingVertical: 4 }}>
      {schede.map((s, i) => (
        <Riga key={s.id} prima={i === 0} titolo={s.titolo} sotto={s.descrizione} onPress={() => router.push(percorsoScheda(s.id))} />
      ))}
    </Carta>
  )
}

function HelpDesk({ aree, schede }: { aree: AreaHelpDesk[]; schede: SchedaHelpDesk[] }) {
  const p = usePalette()
  const [domanda, setDomanda] = useState('')
  const trovate = useMemo(() => cerca(schede, domanda), [schede, domanda])
  const cercando = domanda.trim().length > 1
  return (
    <Sezione titolo="Help Desk" conteggio={schede.length}>
      <Text style={[stili.intro, { color: p.testoSecondario }]}>{t('Le risposte su iscrizioni, prenotazioni, pagamenti e regole del club.', 'Answers about enrollment, bookings, payments and club rules.')}</Text>
      <CampoTesto
        etichetta={t('Cerca una risposta', 'Search for an answer')}
        icona="cerca"
        placeholder={t('Certificato, sospensione, recuperi…', 'Certificate, freeze, make-up classes…')}
        value={domanda}
        onChangeText={setDomanda}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
      {cercando ? (
        trovate.length ? (
          <ElencoSchede schede={trovate.slice(0, 12)} />
        ) : (
          <Text style={[stili.intro, { color: p.testoSecondario }]}>{t(`Nessuna scheda risponde a «${domanda.trim()}». Prova con un'altra parola.`, `No article matches “${domanda.trim()}”. Try another word.`)}</Text>
        )
      ) : (
        aree.map((a) => {
          const sue = schede.filter((s) => s.area === a.id)
          return (
            <View key={a.id} style={{ gap: spazio.due }}>
              <View style={{ gap: 2, paddingHorizontal: 2 }}>
                <Text style={[stili.area, { color: p.testo }]}>{a.etichetta}</Text>
                {a.descrizione ? <Text style={[stili.areaSotto, { color: p.testoSecondario }]}>{a.descrizione}</Text> : null}
              </View>
              <ElencoSchede schede={sue} />
            </View>
          )
        })
      )}
    </Sezione>
  )
}

const META = 6

export function ClubLife() {
  const p = usePalette()
  const { dati, errore, riprova, inCorso } = useClubLife()
  const scorrimento = useRef<Animated.ScrollView>(null)

  useEffect(() => ascoltaClubLifeDaCapo(() => scorrimento.current?.scrollTo({ y: 0, animated: true })), [])

  return (
    <Schermata sopratitolo={t('La vita del club', 'Club life')} titolo="Club Life" sottotitolo={t("News, eventi e le risposte dell'Help Desk.", 'News, events and answers from the Help Desk.')} scorrimento={scorrimento}>
      {!dati ? (
        errore ? (
          <View style={{ gap: spazio.tre }}>
            <Messaggio>{errore}</Messaggio>
            <Pulsante testo={t('Riprova', 'Try again')} icona="aggiorna" onPress={riprova} inCorso={inCorso} />
          </View>
        ) : (
          <SchedeInArrivo />
        )
      ) : (
        <>
          {dati.eventi.length ? (
            <Sezione titolo={t('Eventi', 'Events')} conteggio={dati.eventi.length}>
              <Griglia voci={dati.eventi} disegna={(e) => <CartaEvento e={e} />} />
            </Sezione>
          ) : null}
          {dati.news.length ? (
            <Sezione titolo="News" conteggio={dati.news.length}>
              <Griglia voci={dati.news} disegna={(n) => <CartaNews n={n} />} />
            </Sezione>
          ) : null}
          {!dati.eventi.length && !dati.news.length ? (
            <Carta piatta style={{ flexDirection: 'row', gap: spazio.tre, alignItems: 'center' }}>
              <Icona nome="giornale" size={22} colore={p.testoTerzo} />
              <Text style={[stili.intro, { color: p.testoSecondario, flex: 1 }]}>{t('Per ora nessuna news e nessun evento in arrivo.', 'No news or upcoming events for now.')}</Text>
            </Carta>
          ) : null}
          <HelpDesk aree={dati.aree} schede={dati.schede} />
        </>
      )}
    </Schermata>
  )
}

const stili = StyleSheet.create({
  griglia: { flexDirection: 'row', flexWrap: 'wrap', margin: -META },
  cartaFoto: { padding: 0, overflow: 'hidden', gap: 0 },
  foto: { aspectRatio: 16 / 9, width: '100%' },
  cartaTesto: { padding: spazio.tre, gap: 6 },
  occhiello: { fontFamily: F.extra, fontSize: 11.5, letterSpacing: 1.2 },
  cartaTitolo: { fontFamily: F.extra, fontSize: 17, lineHeight: 22, letterSpacing: -0.3 },
  cartaSotto: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  bollino: { position: 'absolute', top: spazio.tre - 4, left: spazio.tre - 4, borderRadius: raggio.piccolo, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', minWidth: 52 },
  bollinoGiorno: { fontFamily: F.extra, fontSize: 20, lineHeight: 22 },
  bollinoMese: { fontFamily: F.extra, fontSize: 11, letterSpacing: 1 },
  pillola: { position: 'absolute', top: spazio.tre - 4, right: spazio.tre - 4, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  pillolaTesto: { color: '#fff', fontFamily: F.extra, fontSize: 11, letterSpacing: 1 },
  cartaNews: { flexDirection: 'row', gap: spazio.tre, alignItems: 'center', padding: spazio.tre - 4 },
  fotoNews: { width: 92, height: 92, borderRadius: raggio.piccolo },
  titoloNews: { fontFamily: F.extra, fontSize: 15.5, lineHeight: 20, letterSpacing: -0.2 },
  intro: { fontFamily: F.medio, fontSize: 14.5, lineHeight: 21 },
  area: { fontFamily: F.extra, fontSize: 15.5, letterSpacing: -0.2 },
  areaSotto: { fontFamily: F.medio, fontSize: 13, lineHeight: 18 },
})
