import { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { t } from '@/lib/lingua'
import { AVVISO_MS, INATTIVITA_MS, PROROGA_RICHIESTA_MS, inModalitaTotem } from '@/lib/totem'
import { millisecondiInVolo, segnaUltimoTocco } from '@/lib/totemAvvio'
import { spazio } from '@/theme'

import { Pulsante } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { useSessione } from '../useSessione'
import { uscitaTotem } from './uscita'

// L'uscita da sola del totem (02/11/2026, richiesta di Maurizio): **dopo cinque minuti senza che nessuno tocchi lo schermo si esce**, e negli
// ultimi trenta secondi compare «Sei ancora qui?», con «Continua» e «Esci». E' montata nel layout di tutta l'app (non in una schermata): deve
// guardare anche la pagina d'accesso e i link `/r/<token>`, dove una persona puo' aver scritto la sua email o la data di nascita.
//
// **Cosa conta come presenza**: un tocco (`pointerdown`, `touchstart`), un tasto, la rotella e uno scorrimento di qualunque cosa (`scroll` in cattura,
// perche' non risale). Niente movimento del mouse: sul pannello e' il dito. **Cosa NON la rimanda**: i tocchi mentre l'avviso e' in vista (decide solo
// «Continua»), e una richiesta in corso, se non per **al massimo un minuto in tutto** (`PROROGA_RICHIESTA_MS`: mentre c'e' una richiesta in volo
// il conto si ferma, fino a un minuto; ogni tocco riparte da zero). Il conto e' sull'orologio e non su un timer da sommare: un browser che rallenta
// i timer non allunga l'attesa.
//
// **Quando e' armata**: con un accesso, o dopo il primo tocco della pagina (una email appena scritta e un codice a meta' sono dati di una persona).
// Un totem acceso e fermo sulla pagina d'accesso non si ricarica ogni cinque minuti per niente.
//
// L'uscita e' `uscitaTotem`, la stessa del pulsante «Esci»: esce, svuota il browser e ricarica la pagina da capo.
export function GuardiaTotem() {
  if (!inModalitaTotem()) return null
  return <Guardia />
}

function Guardia() {
  const p = usePalette()
  const sessione = useSessione()
  const [rimasti, setRimasti] = useState<number | null>(null)
  const haSessione = useRef(false)
  haSessione.current = Boolean(sessione)
  const s = useRef({ ultima: Date.now(), sospeso: 0, tocco: false, voloVisto: millisecondiInVolo(), avviso: false, uscito: false })

  useEffect(() => {
    const st = s.current
    let ultimoSegno = 0
    const tocca = () => {
      if (st.avviso || st.uscito) return
      const ora = Date.now()
      st.ultima = ora
      st.sospeso = 0
      st.tocco = true
      // Il segno nella memoria della scheda serve ai browser che la restituiscono: basta aggiornarlo ogni pochi secondi.
      if (ora - ultimoSegno > 5000) {
        ultimoSegno = ora
        segnaUltimoTocco()
      }
    }
    const eventi = ['pointerdown', 'touchstart', 'keydown', 'wheel', 'scroll'] as const
    eventi.forEach((e) => window.addEventListener(e, tocca, { capture: true, passive: true }))
    const giro = setInterval(() => {
      if (st.uscito) return
      const ora = Date.now()
      // Il tempo in cui c'e' stata almeno una richiesta in corso dall'ultimo giro: ferma il conto, fino a un minuto in tutto.
      const volo = millisecondiInVolo()
      const attesa = Math.max(0, volo - st.voloVisto)
      st.voloVisto = volo
      if (st.sospeso < PROROGA_RICHIESTA_MS) st.sospeso = Math.min(PROROGA_RICHIESTA_MS, st.sospeso + attesa)
      if (!haSessione.current && !st.tocco) return
      const fermo = ora - st.ultima - st.sospeso
      if (fermo >= INATTIVITA_MS) {
        st.uscito = true
        setRimasti(0)
        uscitaTotem()
        return
      }
      if (fermo >= INATTIVITA_MS - AVVISO_MS) {
        st.avviso = true
        setRimasti(Math.ceil((INATTIVITA_MS - fermo) / 1000))
      }
    }, 1000)
    return () => {
      eventi.forEach((e) => window.removeEventListener(e, tocca, { capture: true }))
      clearInterval(giro)
    }
  }, [])

  function continua() {
    const st = s.current
    st.ultima = Date.now()
    st.sospeso = 0
    st.avviso = false
    setRimasti(null)
    segnaUltimoTocco()
  }

  if (rimasti === null) return null
  return (
    <View style={stili.velo} accessibilityViewIsModal accessibilityLiveRegion="assertive">
      <View style={[stili.carta, { backgroundColor: p.carta, borderColor: p.linea }]}>
        <Text style={[stili.titolo, { color: p.testo }]} accessibilityRole="header">
          {t('Sei ancora qui?', 'Are you still there?')}
        </Text>
        <Text style={[stili.numero, { color: p.accento }]}>{rimasti}</Text>
        <Text style={[stili.sotto, { color: p.testoSecondario }]}>
          {t('Per la tua sicurezza esci da solo fra pochi secondi. Tocca «Continua» per restare.', 'For your security you’ll be logged out in a few seconds. Tap “Stay” to keep going.')}
        </Text>
        <View style={{ gap: spazio.due, alignSelf: 'stretch' }}>
          <Pulsante testo={t('Continua', 'Stay')} onPress={continua} />
          <Pulsante testo={t('Esci', 'Log out')} icona="esci" variante="secondario" onPress={() => uscitaTotem()} />
        </View>
      </View>
    </View>
  )
}

const stili = StyleSheet.create({
  // `fixed` e non `absolute`: sul totem la pagina e' scalata, e il velo deve coprire la finestra intera sopra ogni schermata.
  velo: { position: 'fixed' as 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, alignItems: 'center', justifyContent: 'center', padding: spazio.quattro, backgroundColor: 'rgba(17, 18, 20, 0.72)' },
  carta: { alignSelf: 'stretch', maxWidth: 440, alignItems: 'center', gap: spazio.tre, padding: spazio.quattro, borderRadius: 28, borderWidth: 1 },
  titolo: { fontFamily: F.extra, fontSize: 24, letterSpacing: -0.4, textAlign: 'center' },
  numero: { fontFamily: F.extra, fontSize: 64, lineHeight: 70, letterSpacing: -1 },
  sotto: { fontFamily: F.medio, fontSize: 16, lineHeight: 23, textAlign: 'center' },
})
