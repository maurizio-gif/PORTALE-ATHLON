import { Image } from 'expo-image'
import { createContext, useContext, useState } from 'react'
import { Platform, ScrollView, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native'

import type { Blocco, ClubLife, Inline } from '@/api/clubLife'
import { spazio } from '@/theme'

import { Icona } from '../ui/Icona'
import { Bollino, Carta, Pulsante } from '../ui/kit'
import { F, raggio, usePalette, velo } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { conChiE, type ChiEntra } from './indirizzo'
import { apriFuori, apriLink } from './link'

// Il testo di una news, di un evento o di una scheda dell'Help Desk, disegnato
// coi mattoni dell'app. I blocchi li ricava il sito dalla sua pagina
// (data/blocchi.ts), quindi qui si dice la stessa cosa nella stessa struttura:
// le domande dell'Help Desk restano fisarmoniche, i riquadri restano riquadri, le
// tabelle scorrono di lato invece di stringersi fino a non leggersi.

type Contesto = { dati: ClubLife | null; chi: ChiEntra | null }
const ContestoBlocchi = createContext<Contesto>({ dati: null, chi: null })

/** «ACCEDI AL PORTALE» → «Accedi al portale»: sul sito e' uno stile, qui sarebbe un grido. */
function etichetta(s: string): string {
  return s === s.toUpperCase() ? s.charAt(0) + s.slice(1).toLowerCase() : s
}

export function TestoInline({ pezzi, stile, selezionabile = true }: { pezzi: Inline[]; stile: StyleProp<TextStyle>; selezionabile?: boolean }) {
  const p = usePalette()
  const { dati } = useContext(ContestoBlocchi)
  return (
    <Text style={stile} selectable={selezionabile}>
      {pezzi.map((x, i) => {
        const forma: TextStyle = {}
        if (x.b) forma.fontFamily = F.bold
        if (x.i) forma.fontStyle = 'italic'
        if (x.link) {
          const url = x.link
          return (
            <Text key={i} style={[forma, { color: p.accento, textDecorationLine: 'underline' }]} onPress={() => apriLink(url, dati)} accessibilityRole="link">
              {x.testo}
            </Text>
          )
        }
        return (
          <Text key={i} style={forma}>
            {x.testo}
          </Text>
        )
      })}
    </Text>
  )
}

function Dettagli({ titolo, blocchi }: { titolo: Inline[]; blocchi: Blocco[] }) {
  const p = usePalette()
  const [aperto, setAperto] = useState(false)
  return (
    <View style={[stili.dettagli, { backgroundColor: p.carta, borderColor: p.linea }]}>
      <Tocco onPress={() => setAperto((a) => !a)} etichetta={titolo.map((x) => x.testo).join('')} scala={0.99} vibra="scelta">
        <View style={stili.dettagliTesta}>
          <View style={{ flex: 1 }}>
            <TestoInline pezzi={titolo} stile={[stili.dettagliTitolo, { color: p.testo }]} selezionabile={false} />
          </View>
          <Icona nome="giu" size={18} colore={p.testoTerzo} style={{ transform: [{ rotate: aperto ? '180deg' : '0deg' }] }} />
        </View>
      </Tocco>
      {aperto ? (
        <View style={stili.dettagliCorpo}>
          <Blocchi blocchi={blocchi} />
        </View>
      ) : null}
    </View>
  )
}

function Tabella({ intestazione, righe }: { intestazione: Inline[][]; righe: Inline[][][] }) {
  const p = usePalette()
  const colonne = Math.max(intestazione.length, ...righe.map((r) => r.length))
  // Due colonne stanno nello schermo; da tre in su la tabella scorre di lato.
  const larghezza = colonne <= 2 ? undefined : 170
  const riga = (celle: Inline[][], testa: boolean, k: number) => (
    <View key={k} style={[stili.rigaTabella, { borderTopColor: p.linea, borderTopWidth: k === 0 ? 0 : StyleSheet.hairlineWidth }, testa && { backgroundColor: p.incavo }]}>
      {Array.from({ length: colonne }, (_, i) => (
        <View key={i} style={[stili.cella, larghezza ? { width: larghezza } : { flex: 1 }]}>
          <TestoInline pezzi={celle[i] ?? []} stile={[stili.cellaTesto, { color: p.testo }, testa && { fontFamily: F.bold }]} />
        </View>
      ))}
    </View>
  )
  const corpo = (
    <View style={[stili.tabella, { borderColor: p.linea, backgroundColor: p.carta }]}>
      {intestazione.length ? riga(intestazione, true, 0) : null}
      {righe.map((r, i) => riga(r, false, i + (intestazione.length ? 1 : 0)))}
    </View>
  )
  return larghezza ? (
    <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ paddingBottom: 4 }}>
      {corpo}
    </ScrollView>
  ) : (
    corpo
  )
}

function Foto({ src, alt }: { src: string; alt: string }) {
  const p = usePalette()
  const [proporzione, setProporzione] = useState(4 / 3)
  return (
    <Image
      source={{ uri: src }}
      accessibilityLabel={alt}
      style={{ width: '100%', aspectRatio: proporzione, borderRadius: raggio.medio, backgroundColor: p.incavo }}
      contentFit="cover"
      transition={200}
      onLoad={(e) => e.source.width && e.source.height && setProporzione(e.source.width / e.source.height)}
    />
  )
}

function Codice({ etichetta: nome, codice }: { etichetta: string; codice: string }) {
  const p = usePalette()
  const [copiato, setCopiato] = useState(false)
  // Sul web gli appunti ci sono; sull'app nativa servirebbe un modulo in piu':
  // li' il codice si tiene premuto per copiarlo, come ogni testo.
  const copiabile = Platform.OS === 'web' && typeof navigator !== 'undefined' && !!navigator.clipboard
  return (
    <Carta style={stili.codice}>
      <Text style={[stili.codiceNome, { color: p.testoSecondario }]}>{nome.toUpperCase()}</Text>
      <Text style={[stili.codiceValore, { color: p.testo }]} selectable>
        {codice}
      </Text>
      {copiabile ? (
        <Pulsante
          testo={copiato ? 'Copiato' : 'Copia il codice'}
          icona={copiato ? 'spunta' : 'copia'}
          variante="secondario"
          piccolo
          pieno={false}
          onPress={() => navigator.clipboard.writeText(codice).then(() => setCopiato(true), () => undefined)}
        />
      ) : null}
    </Carta>
  )
}

function Modulo({ etichetta: nome, url }: { etichetta: string; url: string }) {
  const p = usePalette()
  const { chi } = useContext(ContestoBlocchi)
  return (
    <Carta style={{ gap: spazio.tre }}>
      <View style={{ flexDirection: 'row', gap: spazio.tre, alignItems: 'center' }}>
        <Bollino icona="modifica" />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[stili.moduloTitolo, { color: p.testo }]}>{nome}</Text>
          <Text style={[stili.moduloSotto, { color: p.testoSecondario }]}>Il modulo si apre sul sito del club.</Text>
        </View>
      </View>
      <Pulsante testo="Apri il modulo" icona="apriFuori" onPress={() => apriFuori(conChiE(url, chi ?? {}))} />
    </Carta>
  )
}

function UnBlocco({ b }: { b: Blocco }) {
  const p = usePalette()
  const { dati } = useContext(ContestoBlocchi)
  switch (b.t) {
    case 'titolo':
      return <TestoInline pezzi={b.testo} stile={[b.livello === 2 ? stili.h2 : b.livello === 3 ? stili.h3 : stili.h4, { color: p.testo }]} />
    case 'paragrafo':
      return <TestoInline pezzi={b.testo} stile={[b.piccolo ? stili.piccolo : stili.paragrafo, { color: b.piccolo ? p.testoSecondario : p.testo }]} />
    case 'elenco':
      return (
        <View style={{ gap: spazio.due + 2 }}>
          {b.voci.map((v, i) => (
            <View key={i} style={stili.voce}>
              {v.spunta !== undefined ? (
                <View style={[stili.casella, { borderColor: v.spunta ? p.accento : p.testoTerzo, backgroundColor: v.spunta ? p.accento : 'transparent' }]}>
                  {v.spunta ? <Icona nome="spunta" size={13} colore="#fff" /> : null}
                </View>
              ) : (
                <Text style={[stili.segno, { color: p.accento }, b.ordinato && { minWidth: 22 }]}>{b.ordinato ? `${i + 1}.` : '•'}</Text>
              )}
              <View style={{ flex: 1 }}>
                <Blocchi blocchi={v.blocchi} stretto />
              </View>
            </View>
          ))}
        </View>
      )
    case 'citazione':
      return (
        <View style={[stili.citazione, { borderLeftColor: p.accento, backgroundColor: velo(p, 'accento', 0.08) }]}>
          <Blocchi blocchi={b.blocchi} stretto />
        </View>
      )
    case 'riquadro':
      return (
        <View style={[stili.riquadro, { backgroundColor: velo(p, 'accento', 0.12), borderColor: velo(p, 'accento', 0.3) }]}>
          <Blocchi blocchi={b.blocchi} stretto />
        </View>
      )
    case 'dettagli':
      return <Dettagli titolo={b.titolo} blocchi={b.blocchi} />
    case 'tabella':
      return <Tabella intestazione={b.intestazione} righe={b.righe} />
    case 'pulsanti':
      return (
        <View style={{ gap: spazio.due }}>
          {b.voci.map((v, i) => (
            <Pulsante key={i} testo={etichetta(v.etichetta)} variante={v.primario ? 'primario' : 'contorno'} icona={/^https?:\/\/(www\.)?athlonroma\.it/i.test(v.url) ? undefined : 'apriFuori'} onPress={() => apriLink(v.url, dati)} />
          ))}
        </View>
      )
    case 'codice':
      return <Codice etichetta={b.etichetta} codice={b.codice} />
    case 'immagine':
      return <Foto src={b.src} alt={b.alt} />
    case 'separatore':
      return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: p.linea, marginVertical: spazio.uno }} />
    case 'modulo':
      return <Modulo etichetta={b.etichetta} url={b.url} />
    default:
      return null
  }
}

/** Un elenco di blocchi. `stretto`: dentro una voce, una citazione o una fisarmonica, dove lo spazio fra i blocchi e' minore. */
export function Blocchi({ blocchi, stretto = false }: { blocchi: Blocco[]; stretto?: boolean }) {
  return (
    <View style={{ gap: stretto ? spazio.due + 2 : spazio.tre }}>
      {blocchi.map((b, i) => (
        <View key={i} style={b.t === 'titolo' && i > 0 && !stretto ? { marginTop: spazio.due } : undefined}>
          <UnBlocco b={b} />
        </View>
      ))}
    </View>
  )
}

/** Il testo di un contenuto, con i dati per riconoscere i link interni e chi e' per i moduli. */
export function Contenuto({ blocchi, dati, chi }: { blocchi: Blocco[]; dati: ClubLife | null; chi: ChiEntra | null }) {
  return (
    <ContestoBlocchi.Provider value={{ dati, chi }}>
      <Blocchi blocchi={blocchi} />
    </ContestoBlocchi.Provider>
  )
}

const stili = StyleSheet.create({
  h2: { fontFamily: F.extra, fontSize: 21, lineHeight: 27, letterSpacing: -0.5 },
  h3: { fontFamily: F.extra, fontSize: 17.5, lineHeight: 23, letterSpacing: -0.3 },
  h4: { fontFamily: F.bold, fontSize: 15.5, lineHeight: 22 },
  paragrafo: { fontFamily: F.medio, fontSize: 15.5, lineHeight: 24 },
  piccolo: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 20 },
  voce: { flexDirection: 'row', gap: spazio.due + 2, alignItems: 'flex-start' },
  segno: { fontFamily: F.extra, fontSize: 15.5, lineHeight: 24, minWidth: 14 },
  casella: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, marginTop: 2, alignItems: 'center', justifyContent: 'center' },
  citazione: { borderLeftWidth: 3, borderRadius: 12, paddingVertical: spazio.tre - 4, paddingHorizontal: spazio.tre },
  riquadro: { borderRadius: raggio.medio, borderWidth: 1, padding: spazio.tre },
  dettagli: { borderRadius: raggio.medio, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  dettagliTesta: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, paddingHorizontal: spazio.tre, paddingVertical: spazio.tre - 2, minHeight: 52 },
  dettagliTitolo: { fontFamily: F.bold, fontSize: 15, lineHeight: 21 },
  dettagliCorpo: { paddingHorizontal: spazio.tre, paddingBottom: spazio.tre },
  tabella: { borderRadius: raggio.piccolo, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  rigaTabella: { flexDirection: 'row' },
  cella: { paddingHorizontal: spazio.tre - 4, paddingVertical: spazio.due + 2 },
  cellaTesto: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  codice: { gap: spazio.due, alignItems: 'flex-start' },
  codiceNome: { fontFamily: F.extra, fontSize: 11.5, letterSpacing: 1.4 },
  codiceValore: { fontFamily: F.extra, fontSize: 26, letterSpacing: 0.5 },
  moduloTitolo: { fontFamily: F.bold, fontSize: 15.5, lineHeight: 21 },
  moduloSotto: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
})
