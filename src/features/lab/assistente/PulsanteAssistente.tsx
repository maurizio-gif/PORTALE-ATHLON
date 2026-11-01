import { useGlobalSearchParams, usePathname } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { LARGO } from '@/components/Pagina'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { LARGHEZZA_CON_SCRITTA, SPOSTA_SE_OCCUPATO } from '../feedback/comune'
import { useAzioneInAltoPresente } from '../feedback/posizione'
import { Icona } from '../ui/Icona'
import { LARGHEZZA_APP } from '../ui/Schermata'
import { F, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { vistaCorrente } from '../vista'
import { schermataAssistente } from './destinazioni'
import { FoglioAssistente } from './FoglioAssistente'
import { registraApertura } from './store'

// **Sta dentro la testata e ne segue il centro** (01/11/2026, richiesta di Maurizio: «dentro l'header, centrato, cosi' scorre e rimane comunque dentro»): la testata sottile e' alta
// `ins.top + 52`, la pillola (34) sta al suo centro verticale, in alto a destra; il titolo piccolo si ferma prima di lei (`ui/Schermata.tsx`, `riservaDestra`), quindi non si sovrappongono mai.
const DENTRO_TESTATA = 26 - 22 // centro della testata (52 / 2) meno meta' dell'area che si tocca (44)

// Il pulsante «Richiedi assistenza» (30/10/2026, richiesta di Maurizio; fino al 31/10/2026 si chiamava «Assistente virtuale»: il foglio che apre si intitola ancora cosi', e dice chi risponde): una pillola in alto a destra, sopra ogni schermata dell'app, sempre
// visibile. Tocca e sale la chat (`FoglioAssistente`). Sta qui, montata nel layout, e non in una schermata, perche' deve esserci **ovunque**: se
// l'assistente propone un pulsante, la persona lo tocca, si apre la pagina giusta, e la conversazione si riprende dallo stesso posto, in alto a destra
// (la chat sta in memoria, `assistente/store.ts`: chiudere il foglio o cambiare schermata non la perde).
//
// **Sta dove stava il pulsante «Feedback»** (che da oggi e' una carta della Home, `home/CartaFeedback`): allineato alla barra col marchio (stessa colonna
// di `Schermata`, stesso gutter, stessa altezza). Dove la schermata ha gia' un comando li' (il carrello dello shop, il salvataggio dell'editor) si sposta
// di un bottone a sinistra invece di coprirlo (`feedback/posizione.ts`).
//
// **Con la scritta dove c'e' posto, la sola icona dove no** (`LARGHEZZA_CON_SCRITTA`): con la freccia indietro e il marchio a sinistra, su uno schermo
// stretto «Richiedi assistenza» finirebbe sul marchio; lo stesso se un comando occupa gia' il posto. Il nome resta per lo screen reader.
//
// **Mai in vista cliente**: chi guarda l'app di un socio non conversa a suo nome (la funzione risponderebbe 403). Il layout lo monta solo con una sessione.
export function PulsanteAssistente() {
  const p = usePalette()
  const ins = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const percorso = usePathname()
  const { sezione } = useGlobalSearchParams<{ sezione?: string }>()
  const occupato = useAzioneInAltoPresente()
  const [aperto, setAperto] = useState(false)
  // La schermata in cui si e' toccato il pulsante, non quella di quando si preme «Invia»: e' li' che la persona stava guardando.
  const schermata = useRef<string | null>(null)
  // Altri punti dell'app (il bottone di Club Life) aprono la stessa chat da qui (`apriAssistente`, store.ts).
  useEffect(
    () =>
      registraApertura((s) => {
        schermata.current = s
        setAperto(true)
      }),
    [],
  )

  if (vistaCorrente()) return null

  // La stessa colonna delle schermate: 640 sul telefono e sul tablet stretto, 1180 sullo schermo largo, centrata.
  const colonna = width < LARGO ? 640 : LARGHEZZA_APP
  const destra = Math.max(0, (width - colonna) / 2) + spazio.tre + 2 + (occupato ? SPOSTA_SE_OCCUPATO : 0)
  const compatto = occupato || width < LARGHEZZA_CON_SCRITTA

  return (
    <>
      {/* L'area che si tocca e' alta quanto la barra delle schermate (44): la pillola dentro e' piu' bassa e non pesa. */}
      <Tocco
        onPress={() => {
          schermata.current = schermataAssistente(percorso, typeof sezione === 'string' ? sezione : null)
          setAperto(true)
        }}
        etichetta={t('Richiedi assistenza: chiedi dove trovare le cose', 'Get support: ask where to find things')}
        scala={0.95}
        style={[stili.area, { top: ins.top + DENTRO_TESTATA, right: destra }]}
      >
        <View style={[stili.pillola, compatto && stili.compatta, { backgroundColor: p.vetro, borderColor: p.linea }]}>
          <Icona nome="assistente" size={compatto ? 17 : 15} colore={p.accento} />
          {compatto ? null : <Text style={[stili.testo, { color: p.testo }]}>{t('Richiedi assistenza', 'Get support')}</Text>}
        </View>
      </Tocco>
      <FoglioAssistente aperto={aperto} schermata={schermata.current} onChiudi={() => setAperto(false)} />
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
