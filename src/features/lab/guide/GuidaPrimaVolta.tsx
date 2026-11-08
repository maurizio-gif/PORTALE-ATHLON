import { router, useGlobalSearchParams, usePathname } from 'expo-router'
import { useEffect, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { spazio } from '@/theme'
import { t } from '@/lib/lingua'

import { useClubLife } from '../clublife/dati'
import { percorsoScheda } from '../clublife/link'
import { useNotifiche } from '../notifiche/store'
import { Icona } from '../ui/Icona'
import { Pulsante } from '../ui/kit'
import { F, FUOCO, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { SCHEDA_DI_GUIDA, giaVista, guidaDiRotta, schedaPresente, segnaVista, type ChiaveGuida } from './guide'
import { PAROLE_GUIDA, testiGuida } from './testi'

// La finestra che propone la guida con il video la **prima volta** che si apre una sezione (08/11/2026, richiesta di Maurizio):
// Home, Prenotazioni, Junior, Certificato, Invita un amico e Athlon Health System. «Guarda la guida» apre la scheda dell'Help Desk
// con il video (`percorsoScheda`); «Non ora», la X e un tocco fuori la chiudono. **Una volta sola per sezione**, per persona e per
// dispositivo (`guide.ts`): la guida si rivede sempre dall'Help Desk di Club Life, area «L'app Athlon Club».
//
// Si monta una volta sola nel layout del portale (`app/(portale)/_layout.tsx`), accanto alle notifiche, e legge da sola dove si e'.
// Non compare:
//   - sul totem e in vista cliente (il layout non la monta): li' non c'e' nessuno che impari l'app, e lo staff non deve segnare come
//     viste le guide di un socio;
//   - prima della fine dell'avvio animato, che dura 3,25 s, e prima di un istante dopo l'arrivo nella sezione: chi entra guarda la
//     schermata, non una finestra;
//   - mentre c'e' una finestra del club da leggere (le notifiche hanno la precedenza, e due modal insieme non stanno su iOS);
//   - se la scheda non e' nel feed di Club Life.
// **Si segna come vista solo quando la persona risponde**, non quando compare: se l'app si chiude con la finestra aperta, o se arriva una
// notifica e la finestra si ritira, la guida torna alla prossima apertura della sezione.
//
// **Il feed di Club Life (240 kB) si chiede solo se c'e' una guida da proporre**: `GuidaPrimaVolta` decide con il solo `localStorage`, e
// `Proposta`, che chiama `useClubLife`, si monta soltanto allora. Chi le ha viste tutte, o sta in una schermata senza guida, non scarica niente.

/** L'avvio animato (avvio/Avvio.tsx) dura 3,25 s: la prima finestra aspetta che finisca, o gli starebbe sopra. */
const ATTESA_AVVIO_MS = 3_700
/** Dopo essere entrati in una sezione si aspetta un istante: il tempo di guardarla, e che chi passa di corsa non la veda comparire. */
const RITARDO_MS = 900
const T0 = Date.now()

function memoria(): Storage | undefined {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

export function GuidaPrimaVolta({ utente }: { utente: string }) {
  const percorso = usePathname()
  const { sezione } = useGlobalSearchParams<{ sezione?: string | string[] }>()
  const chiave = guidaDiRotta(percorso, Array.isArray(sezione) ? sezione[0] : sezione)
  if (!chiave || giaVista(memoria(), utente, chiave)) return null
  return <Proposta key={chiave} chiave={chiave} utente={utente} />
}

function Proposta({ chiave, utente }: { chiave: ChiaveGuida; utente: string }) {
  const { dati } = useClubLife()
  const { finestre } = useNotifiche()
  const [aperta, setAperta] = useState(false)
  const presente = schedaPresente(chiave, dati?.schede)

  useEffect(() => {
    if (aperta || !presente || finestre.length) return
    if (giaVista(memoria(), utente, chiave)) return
    const attesa = Math.max(ATTESA_AVVIO_MS - (Date.now() - T0), 0) + RITARDO_MS
    const timer = setTimeout(() => setAperta(true), attesa)
    return () => clearTimeout(timer)
  }, [aperta, presente, finestre.length, utente, chiave])

  // Arriva una notifica mentre la guida e' aperta: la notifica ha la precedenza, e la guida non e' stata segnata, quindi torna.
  useEffect(() => {
    if (aperta && finestre.length) setAperta(false)
  }, [aperta, finestre.length])

  if (!aperta) return null

  function rispondi(vai: boolean) {
    segnaVista(memoria(), utente, chiave)
    setAperta(false)
    if (vai) router.push(percorsoScheda(SCHEDA_DI_GUIDA[chiave]))
  }

  return <FinestraGuida guida={chiave} onGuarda={() => rispondi(true)} onNonOra={() => rispondi(false)} />
}

/** Solo il disegno: si prova da solo e non sa niente di dove si e'. */
export function FinestraGuida({ guida, onGuarda, onNonOra }: { guida: ChiaveGuida; onGuarda: () => void; onNonOra: () => void }) {
  const p = usePalette()
  const ins = useSafeAreaInsets()
  const { titolo, testo } = testiGuida(guida)
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onNonOra} statusBarTranslucent>
      <View style={[stili.velo, { paddingTop: ins.top + spazio.tre, paddingBottom: ins.bottom + spazio.tre }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onNonOra} accessibilityLabel={t('Chiudi', 'Close')} />
        <View style={[stili.carta, { backgroundColor: p.carta, borderColor: p.linea, boxShadow: p.ombra }]} accessibilityViewIsModal>
          <View style={stili.testa}>
            <View style={[stili.bollino, { backgroundColor: FUOCO[1] }]}>
              <Icona nome="play" size={20} colore="#fff" />
            </View>
            <Text style={[stili.sopra, { color: p.accento }]} numberOfLines={1}>
              {PAROLE_GUIDA.sopra()}
            </Text>
            <Tocco onPress={onNonOra} etichetta={t('Chiudi', 'Close')} style={[stili.chiudi, { backgroundColor: p.incavo }]}>
              <Icona nome="chiudi" size={16} colore={p.testo} />
            </Tocco>
          </View>
          <Text style={[stili.titolo, { color: p.testo }]} accessibilityRole="header">
            {titolo}
          </Text>
          <Text style={[stili.testo, { color: p.testoSecondario }]}>{testo}</Text>
          <View style={{ gap: spazio.due, marginTop: spazio.due }}>
            <Pulsante testo={PAROLE_GUIDA.guarda()} icona="avanti" onPress={onGuarda} />
            <Pulsante testo={PAROLE_GUIDA.nonOra()} variante="fantasma" onPress={onNonOra} />
          </View>
        </View>
      </View>
    </Modal>
  )
}

const stili = StyleSheet.create({
  velo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: spazio.tre },
  carta: { width: '100%', maxWidth: 440, borderRadius: 30, borderWidth: 1, padding: spazio.quattro - 2, gap: spazio.tre },
  testa: { flexDirection: 'row', alignItems: 'center', gap: spazio.due + 2 },
  bollino: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sopra: { flex: 1, fontFamily: F.extra, fontSize: 11.5, letterSpacing: 1.2 },
  chiudi: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  titolo: { fontFamily: F.extra, fontSize: 24, lineHeight: 29, letterSpacing: -0.7 },
  testo: { fontFamily: F.medio, fontSize: 16, lineHeight: 23 },
})
