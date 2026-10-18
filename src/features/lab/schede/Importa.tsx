import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native'

import { importaScheda } from '@/api/lab'
import { preparaFileScheda, pesoLeggibile, scattaFoto, scegliFile, type FileGrezzo, type FileScheda } from '@/lib/fileScheda'
import { spazio } from '@/theme'

import { Icona } from '../ui/Icona'
import { Carta, Messaggio, Pulsante } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, MARE, usePalette } from '../ui/tema'
import { colpetto } from '../ui/Tocco'
import { mettiBozza, scartaBozza } from './bozza'

// L'importazione di una scheda (19/10/2026): per chi ha gia' un piano del suo trainer o di un'altra
// palestra. Si scatta una foto o si sceglie un file (foto o PDF), la funzione lo manda a un modello che lo
// legge, e torna una **bozza**: l'editor (`EditorScheda.tsx`) la fa rivedere, e niente e' salvato finche' il
// socio non preme «Salva». Il file non si conserva da nessuna parte: resta qui, in memoria, il tempo della
// lettura. Ci vogliono una decina di secondi, a volte un minuto.

const PASSI = [
  { icona: 'fotocamera', testo: 'Scatta una foto alla scheda o scegli il file (foto o PDF).' },
  { icona: 'stella', testo: 'La leggiamo e riconosciamo giorni, esercizi, serie e carichi.' },
  { icona: 'spunta', testo: 'La controlli, correggi quello che non torna e la salvi.' },
] as const

const ATTESA = [
  'Guardo la scheda…',
  'Riconosco i giorni e gli esercizi…',
  'Li abbino alla libreria del club…',
  'Ricontrollo serie, ripetizioni e recuperi…',
  'Ancora qualche secondo…',
]

export function Importa() {
  const p = usePalette()
  const [preparo, setPreparo] = useState(false)
  const [file, setFile] = useState<FileScheda | null>(null)
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

  const leggendo = !!file
  useEffect(() => {
    if (!leggendo) return
    setFrase(0)
    const t = setInterval(() => setFrase((f) => Math.min(ATTESA.length - 1, f + 1)), 7000)
    return () => clearInterval(t)
  }, [leggendo])

  async function dopoLaScelta(scelto: FileGrezzo | null) {
    if (!scelto) return
    setErrore(null)
    setPreparo(true)
    const f = await preparaFileScheda(scelto)
    if (!qui.current) return
    setPreparo(false)
    if (!f.ok) {
      colpetto('errore')
      return setErrore(f.errore)
    }
    setFile(f.file)
    scartaBozza()
    const r = await importaScheda(f.file.dati)
    if (!qui.current) return
    setFile(null)
    if (!r.ok) {
      colpetto('errore')
      return setErrore(r.errore)
    }
    colpetto('ok')
    mettiBozza(r.bozza)
    router.replace({ pathname: '/allenamento/nuova', params: { da: 'bozza' } })
  }

  if (file) {
    return (
      <Schermata sopratitolo="La tua scheda" titolo="Leggo la scheda" indietro="/allenamento" barra={false}>
        <LinearGradient colors={MARE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.attesa}>
          {file.anteprima ? (
            <Image source={{ uri: file.anteprima }} style={stili.anteprima} resizeMode="contain" accessibilityLabel="La scheda che stiamo leggendo" />
          ) : (
            <View style={stili.pdf}>
              <Icona nome="ricevuta" size={40} colore="#fff" />
              <Text style={stili.pdfNome} numberOfLines={2}>{`${file.nome} · ${pesoLeggibile(file.byte)}`}</Text>
            </View>
          )}
          <ActivityIndicator color="#fff" />
          <Text style={stili.attesaTesto}>{ATTESA[frase]}</Text>
          <Text style={stili.attesaNota}>Ci vuole una decina di secondi, a volte un minuto: resta su questa pagina.</Text>
        </LinearGradient>
      </Schermata>
    )
  }

  return (
    <Schermata
      sopratitolo="La tua scheda"
      titolo="Importa la tua scheda"
      indietro="/allenamento"
      barra={false}
      sottotitolo="Hai già un piano del tuo trainer o di un’altra palestra? Fotografalo o carica il file: lo ritrovi qui e lo usi come le altre schede."
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

      {preparo ? (
        <Carta style={{ flexDirection: 'row', alignItems: 'center', gap: spazio.tre }}>
          <ActivityIndicator color={p.accento} />
          <Text style={[stili.testo, { color: p.testo }]}>Preparo il file…</Text>
        </Carta>
      ) : (
        <View style={{ gap: spazio.due }}>
          <Pulsante testo="Scatta una foto" icona="fotocamera" onPress={async () => dopoLaScelta(await scattaFoto())} />
          <Pulsante testo="Scegli una foto o un PDF" icona="ricevuta" variante="scuro" onPress={async () => dopoLaScelta(await scegliFile())} />
        </View>
      )}

      {errore ? <Messaggio>{errore}</Messaggio> : null}

      <Pulsante testo="Preferisci scriverla a mano?" variante="fantasma" onPress={() => router.replace('/allenamento/nuova')} />

      <Text style={[stili.avvertenza, { color: p.testoTerzo }]}>
        La foto o il PDF vengono letti da un servizio di intelligenza artificiale, solo per riconoscere gli esercizi, e non vengono conservati: restano soltanto gli esercizi che confermi tu.
        Meglio non includere dati che non servono, come nomi e telefoni. Una lettura automatica può sbagliare: prima di salvare la controlli sempre. La scheda che salvi la possono vedere i trainer del club.
      </Text>
    </Schermata>
  )
}

const stili = StyleSheet.create({
  passo: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  numero: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  testo: { fontFamily: F.medio, fontSize: 14.5, lineHeight: 20 },
  avvertenza: { fontFamily: F.medio, fontSize: 12.5, lineHeight: 18, textAlign: 'center' },
  attesa: { borderRadius: 30, padding: spazio.cinque, alignItems: 'center', gap: spazio.tre },
  anteprima: { width: '100%', height: 220, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.18)' },
  pdf: { alignItems: 'center', gap: spazio.due, paddingVertical: spazio.tre },
  pdfNome: { color: '#fff', fontFamily: F.bold, fontSize: 14, textAlign: 'center' },
  attesaTesto: { color: '#fff', fontFamily: F.extra, fontSize: 19, textAlign: 'center', letterSpacing: -0.4 },
  attesaNota: { color: 'rgba(255,255,255,0.8)', fontFamily: F.medio, fontSize: 13.5, textAlign: 'center' },
})
