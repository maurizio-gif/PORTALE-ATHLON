import { usePathname } from 'expo-router'
import { useRef, useState } from 'react'
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { LARGO } from '@/components/Pagina'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { Icona } from '../ui/Icona'
import { LARGHEZZA_APP } from '../ui/Schermata'
import { F, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { vistaCorrente } from '../vista'
import { LARGHEZZA_COMPATTA, SPOSTA_SE_OCCUPATO, schermataDa } from './comune'
import { FoglioFeedback } from './FoglioFeedback'
import { useAzioneInAltoPresente } from './posizione'
import { useFeedback } from './useFeedback'

// Il pulsante «Feedback» (20/10/2026, richiesta di Maurizio): una pillola discreta in alto a destra, sopra ogni schermata
// dell'app, per spingere i tester a dirci come sta andando, cosa suggeriscono e che problemi hanno avuto. Tocca e sale il
// foglio (`FoglioFeedback`): un campo di testo e, se serve, degli allegati.
//
// **Sta nel posto in cui le schermate mettono il loro comando in alto a destra**, allineato alla barra col marchio
// (stessa colonna di `Schermata`, stesso gutter, stessa altezza): sembra parte della testata ma e' uno solo per tutta
// l'app. Dove la schermata ha gia' un comando li' (il carrello dello shop, il salvataggio dell'editor) si sposta di un
// bottone a sinistra invece di coprirlo (`posizione.ts`).
//
// **Solo per chi e' un tester che usa l'app**: il portale e' aperto solo ai tester, e il layout lo monta solo con una
// sessione. **In vista cliente non c'e'**: chi guarda l'app di un cliente non scrive feedback al suo posto (e la funzione
// risponderebbe 403).
//
// **Con un comando accanto, o su uno schermo stretto, e' solo l'icona** (`LARGHEZZA_COMPATTA`): a 360 punti, con la
// freccia indietro, il marchio e il carrello, la pillola con la scritta andrebbe sul marchio. Il nome resta per lo
// screen reader.
//
// **Resta montato**: lo stato del foglio vive qui, cosi' chiudere per sbaglio non fa perdere il testo. La schermata che
// parte col messaggio e' quella in cui si e' toccato il pulsante, non quella in cui si preme «Invia».
export function PulsanteFeedback() {
  const p = usePalette()
  const ins = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const percorso = usePathname()
  const occupato = useAzioneInAltoPresente()
  const f = useFeedback()
  const [aperto, setAperto] = useState(false)
  const schermata = useRef('/')

  if (vistaCorrente()) return null

  // La stessa colonna delle schermate: 640 sul telefono e sul tablet stretto, 1180 sullo schermo largo, centrata.
  const colonna = width < LARGO ? 640 : LARGHEZZA_APP
  const destra = Math.max(0, (width - colonna) / 2) + spazio.tre + 2 + (occupato ? SPOSTA_SE_OCCUPATO : 0)
  // Con un comando accanto, o su uno schermo molto stretto, resta l'icona: la scritta andrebbe sul marchio.
  const compatto = occupato || width < LARGHEZZA_COMPATTA

  return (
    <>
      {/* L'area che si tocca e' alta quanto la barra delle schermate (44): la pillola dentro e' piu' bassa e non pesa. */}
      <Tocco
        onPress={() => {
          schermata.current = schermataDa(percorso)
          setAperto(true)
        }}
        etichetta={t('Lascia un feedback sull’app', 'Leave feedback about the app')}
        scala={0.95}
        style={[stili.area, { top: ins.top + spazio.tre, right: destra }]}
      >
        <View style={[stili.pillola, compatto && stili.compatta, { backgroundColor: p.vetro, borderColor: p.linea }]}>
          <Icona nome="feedback" size={compatto ? 16 : 14} colore={p.accento} />
          {compatto ? null : <Text style={[stili.testo, { color: p.testoSecondario }]}>Feedback</Text>}
        </View>
      </Tocco>
      <FoglioFeedback aperto={aperto} f={f} schermata={schermata.current} onChiudi={() => setAperto(false)} />
    </>
  )
}

const stili = StyleSheet.create({
  area: { position: 'absolute', zIndex: 30, height: 44, justifyContent: 'center' },
  pillola: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    boxShadow: '0 4px 14px rgba(18, 19, 22, 0.08)',
  },
  // Solo l'icona: un cerchio da 34, come l'altezza della pillola.
  compatta: { width: 34, paddingHorizontal: 0, justifyContent: 'center' },
  testo: { fontFamily: F.semi, fontSize: 12.5, letterSpacing: -0.1 },
})
