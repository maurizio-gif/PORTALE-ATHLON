import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native'

import { importaScheda } from '@/api/lab'
import { MAX_FILE, MAX_TOTALE_BYTE, preparaFileScheda, pesoLeggibile, scattaFoto, scegliFile, type FileGrezzo, type FileScheda } from '@/lib/fileScheda'
import { spazio } from '@/theme'

import { Icona } from '../ui/Icona'
import { Carta, Messaggio, Pulsante } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, MARE, usePalette } from '../ui/tema'
import { colpetto } from '../ui/Tocco'
import { mettiBozza, scartaBozza } from './bozza'

// L'importazione di un piano (19/10/2026): per chi ha gia' un piano del suo trainer o di un'altra
// palestra. Si scatta una foto o si sceglie un file (foto o PDF), la funzione lo manda a un modello che lo
// legge, e torna una **bozza**: l'editor (`EditorScheda.tsx`) la fa rivedere e modificare, e niente e' salvato
// finche' il socio non conferma. Il file non si conserva da nessuna parte: resta qui, in memoria, il tempo della
// lettura. Ci vogliono una decina di secondi, a volte un minuto.
//
// **Un piano lungo si importa a pagine** (20/10/2026, richiesta di un tester: una seduta lunga non sta in uno
// screenshot e due foto davano due sedute separate). Si scelgono fino a quattro file, uno alla volta o insieme, si
// vedono in un elenco (nell'ordine, si tolgono) e **solo con «Leggi il piano» partono, insieme**: la funzione li manda
// al modello come un piano solo, e una seduta che continua nella pagina dopo resta una seduta.

const PASSI = [
  { icona: 'fotocamera', testo: 'Scatta una foto al piano o scegli il file (foto o PDF). Se non sta in una foto, aggiungine altre: le leggiamo come un piano solo.' },
  { icona: 'stella', testo: 'Lo leggiamo e riconosciamo giorni, esercizi, serie e carichi.' },
  { icona: 'spunta', testo: 'Lo controlli, correggi quello che non torna e lo confermi: va fra i tuoi piani.' },
] as const

const ATTESA = [
  'Guardo il piano…',
  'Riconosco i giorni e gli esercizi…',
  'Li abbino alla libreria del club…',
  'Ricontrollo serie, ripetizioni e recuperi…',
  'Ancora qualche secondo…',
]

export function Importa() {
  const p = usePalette()
  const [preparo, setPreparo] = useState(false)
  // Le pagine del piano, nell'ordine in cui le si e' aggiunte: partono tutte insieme con «Leggi il piano».
  const [pagine, setPagine] = useState<FileScheda[]>([])
  const [leggendo, setLeggendo] = useState(false)
  const [frase, setFrase] = useState(0)
  const [errore, setErrore] = useState<string | null>(null)
  // Chi esce dalla schermata mentre il modello legge non deve ritrovarsi, dopo, nell'editor.
  const qui = useRef(true)
  useEffect(() => {
    qui.current = true
    return () => {
      qui.current = false
    }
  }, [])

  useEffect(() => {
    if (!leggendo) return
    setFrase(0)
    const t = setInterval(() => setFrase((f) => Math.min(ATTESA.length - 1, f + 1)), 7000)
    return () => clearInterval(t)
  }, [leggendo])

  /** Prepara i file scelti e li aggiunge alle pagine, fino al massimo; quello che non entra lo dice. */
  async function aggiungi(scelti: FileGrezzo[]) {
    if (!scelti.length) return
    setErrore(null)
    const posti = MAX_FILE - pagine.length
    const presi = scelti.slice(0, Math.max(0, posti))
    setPreparo(true)
    const nuove: FileScheda[] = []
    const problemi: string[] = []
    for (const g of presi) {
      const f = await preparaFileScheda(g)
      if (f.ok) nuove.push(f.file)
      else problemi.push(scelti.length > 1 ? `${g.name || 'Un file'}: ${f.errore}` : f.errore)
    }
    if (!qui.current) return
    setPreparo(false)
    const tutte = [...pagine, ...nuove]
    // Il peso di tutte insieme: lo stesso limite della funzione, detto qui prima di aspettare un'attesa inutile.
    while (tutte.length > pagine.length && tutte.reduce((t, x) => t + x.byte, 0) > MAX_TOTALE_BYTE) {
      const tolta = tutte.pop()
      problemi.push(`${tolta?.nome ?? 'Un file'}: insieme agli altri i file pesano più di ${pesoLeggibile(MAX_TOTALE_BYTE)}.`)
    }
    if (scelti.length > presi.length) problemi.push(`Il massimo è ${MAX_FILE} file: gli altri non sono stati aggiunti.`)
    setPagine(tutte)
    if (problemi.length) {
      colpetto('errore')
      setErrore(problemi.join(' '))
    }
  }

  async function leggi() {
    if (!pagine.length) return
    setErrore(null)
    setLeggendo(true)
    scartaBozza()
    const r = await importaScheda(pagine.map((x) => x.dati))
    if (!qui.current) return
    setLeggendo(false)
    if (!r.ok) {
      colpetto('errore')
      return setErrore(r.errore)
    }
    colpetto('ok')
    mettiBozza(r.bozza)
    router.replace({ pathname: '/allenamento/nuova', params: { da: 'bozza' } })
  }

  if (leggendo) {
    const prima = pagine[0]
    return (
      <Schermata sopratitolo="Il tuo piano" titolo="Leggo il piano" indietro="/allenamento" barra={false}>
        <LinearGradient colors={MARE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.attesa}>
          {prima?.anteprima ? (
            <Image source={{ uri: prima.anteprima }} style={stili.anteprima} resizeMode="contain" accessibilityLabel="Il piano che stiamo leggendo" />
          ) : (
            <View style={stili.pdf}>
              <Icona nome="ricevuta" size={40} colore="#fff" />
              <Text style={stili.pdfNome} numberOfLines={2}>{prima ? `${prima.nome} · ${pesoLeggibile(prima.byte)}` : 'Il piano'}</Text>
            </View>
          )}
          {pagine.length > 1 ? <Text style={stili.attesaNota}>{`${pagine.length} pagine, lette come un piano solo`}</Text> : null}
          <ActivityIndicator color="#fff" />
          <Text style={stili.attesaTesto}>{ATTESA[frase]}</Text>
          <Text style={stili.attesaNota}>Ci vuole una decina di secondi, a volte un minuto: resta su questa pagina.</Text>
        </LinearGradient>
      </Schermata>
    )
  }

  return (
    <Schermata
      sopratitolo="Il tuo piano"
      titolo="Importa il tuo piano"
      indietro="/allenamento"
      barra={false}
      sottotitolo="Hai già un piano del tuo trainer o di un’altra palestra? Fotografalo o carica il file: lo ritrovi fra i tuoi piani e lo usi come gli altri."
    >
      <Carta style={{ gap: spazio.tre }}>
        {PASSI.map((x, i) => (
          <View key={x.testo} style={stili.passo}>
            <View style={[stili.numero, { backgroundColor: p.incavo }]}>
              <Text style={{ color: p.testo, fontFamily: F.extra, fontSize: 14 }}>{i + 1}</Text>
            </View>
            <Text style={[stili.testo, { color: p.testo, flex: 1 }]}>{x.testo}</Text>
          </View>
        ))}
      </Carta>

      {pagine.length ? (
        <Carta style={{ gap: spazio.tre }}>
          <Text style={{ color: p.testo, fontFamily: F.extra, fontSize: 16 }}>{pagine.length === 1 ? 'La pagina del tuo piano' : `Le ${pagine.length} pagine del tuo piano`}</Text>
          {pagine.map((x, i) => (
            <View key={`${x.nome}-${i}`} style={stili.pagina}>
              {x.anteprima ? (
                <Image source={{ uri: x.anteprima }} style={[stili.miniatura, { backgroundColor: p.incavo }]} resizeMode="cover" accessibilityLabel={`Pagina ${i + 1}`} />
              ) : (
                <View style={[stili.miniatura, { backgroundColor: p.incavo, alignItems: 'center', justifyContent: 'center' }]}>
                  <Icona nome="ricevuta" size={22} colore={p.testoSecondario} />
                </View>
              )}
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: p.testo, fontFamily: F.semi, fontSize: 14.5 }} numberOfLines={1}>{`Pagina ${i + 1}`}</Text>
                <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 12.5 }} numberOfLines={1}>{`${x.nome} · ${pesoLeggibile(x.byte)}`}</Text>
              </View>
              <Pulsante testo="Togli" variante="fantasma" piccolo pieno={false} onPress={() => setPagine((v) => v.filter((_, k) => k !== i))} />
            </View>
          ))}
        </Carta>
      ) : null}

      {preparo ? (
        <Carta style={{ flexDirection: 'row', alignItems: 'center', gap: spazio.tre }}>
          <ActivityIndicator color={p.accento} />
          <Text style={[stili.testo, { color: p.testo }]}>Preparo il file…</Text>
        </Carta>
      ) : (
        <View style={{ gap: spazio.due }}>
          {pagine.length ? <Pulsante testo={pagine.length === 1 ? 'Leggi il piano' : `Leggi il piano (${pagine.length} pagine)`} icona="avanti" onPress={leggi} /> : null}
          {pagine.length < MAX_FILE ? (
            <>
              <Pulsante
                testo={pagine.length ? 'Aggiungi un’altra foto' : 'Scatta una foto'}
                icona="fotocamera"
                variante={pagine.length ? 'scuro' : 'primario'}
                onPress={async () => {
                  const f = await scattaFoto()
                  if (f) aggiungi([f])
                }}
              />
              <Pulsante
                testo={pagine.length ? 'Aggiungi altri file' : 'Scegli foto o PDF'}
                icona="ricevuta"
                variante={pagine.length ? 'secondario' : 'scuro'}
                onPress={async () => aggiungi(await scegliFile())}
              />
            </>
          ) : (
            <Text style={[stili.nota, { color: p.testoTerzo }]}>{`Hai aggiunto ${MAX_FILE} file: è il massimo per volta.`}</Text>
          )}
        </View>
      )}

      {errore ? <Messaggio>{errore}</Messaggio> : null}

      <Pulsante testo="Preferisci scriverlo a mano?" variante="fantasma" onPress={() => router.replace('/allenamento/nuova')} />

      <Text style={[stili.avvertenza, { color: p.testoTerzo }]}>
        La foto o il PDF vengono letti da un servizio di intelligenza artificiale, solo per riconoscere gli esercizi, e non vengono conservati: resta soltanto quello che confermi tu.
        Meglio non includere dati che non servono, come nomi e telefoni. Una lettura automatica può sbagliare: prima di confermare lo controlli sempre. Il piano che confermi lo possono vedere i trainer del club.
      </Text>
    </Schermata>
  )
}

const stili = StyleSheet.create({
  passo: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  numero: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  testo: { fontFamily: F.medio, fontSize: 14.5, lineHeight: 20 },
  nota: { fontFamily: F.medio, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  pagina: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  miniatura: { width: 52, height: 52, borderRadius: 12, overflow: 'hidden' },
  avvertenza: { fontFamily: F.medio, fontSize: 12.5, lineHeight: 18, textAlign: 'center' },
  attesa: { borderRadius: 30, padding: spazio.cinque, alignItems: 'center', gap: spazio.tre },
  anteprima: { width: '100%', height: 220, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.18)' },
  pdf: { alignItems: 'center', gap: spazio.due, paddingVertical: spazio.tre },
  pdfNome: { color: '#fff', fontFamily: F.bold, fontSize: 14, textAlign: 'center' },
  attesaTesto: { color: '#fff', fontFamily: F.extra, fontSize: 19, textAlign: 'center', letterSpacing: -0.4 },
  attesaNota: { color: 'rgba(255,255,255,0.8)', fontFamily: F.medio, fontSize: 13.5, textAlign: 'center' },
})
