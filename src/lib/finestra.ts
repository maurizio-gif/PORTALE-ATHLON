import { useMemo } from 'react'
import { useWindowDimensions as useFinestraVera } from 'react-native'

import { dimensioniLogiche, inModalitaTotem } from './totem'
import { zoomApplicato } from './totemAvvio'

// Le misure della finestra **come le deve vedere l'app**. Fuori dal totem sono quelle di React Native, tali e quali. Sul totem
// (`totem.ts`) la pagina e' ingrandita con `zoom` e `innerWidth` resta quella vera: una schermata che leggesse la larghezza da
// React Native sceglierebbe lo schema largo (`LARGO`) e la colonna da 1180 su uno schermo logico di 540. Quindi sul totem
// ritorna la larghezza e l'altezza **logiche**: la colonna da 540 pixel (e l'altezza che ne segue, nella stessa proporzione).
//
// **Ogni schermata importa `useWindowDimensions` da qui e non da `react-native`**: un'importazione nuova da `react-native` sul
// totem sbaglierebbe le misure senza nessun errore. Il controllo e' una riga: `grep -rn "useWindowDimensions" src | grep "react-native'"`
// non deve trovare niente (se non in questo file).
export function useWindowDimensions() {
  const d = useFinestraVera()
  const scalata = inModalitaTotem() && zoomApplicato() > 1
  return useMemo(() => (scalata ? dimensioniLogiche(d) : d), [scalata, d])
}
