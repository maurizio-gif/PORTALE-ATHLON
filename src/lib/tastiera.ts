import { useEffect, useState } from 'react'
import { Keyboard, Platform } from 'react-native'

/**
 * Quanto sale la tastiera dal bordo di sotto dello schermo, in punti, solo su Android nativo; 0 con la tastiera chiusa, su iOS e sul web.
 *
 * **Perche' esiste** (10/11/2026): da quando l'app e' compilata per Android 16 (`targetSdk` 36) il sistema disegna sempre a schermo intero e **non
 * ridimensiona piu' la finestra** quando compare la tastiera: la tastiera si appoggia sopra, e chi sta in basso (il campo della chat) resta coperto.
 * Va alzato a mano. L'altezza viene dalle notifiche di React Native (`ReactRootView`, dalle `WindowInsets` della finestra dell'attivita'): e' la
 * tastiera **senza** la barra di navigazione, che sta sotto di lei e che chi usa questo valore somma da se' (`useSafeAreaInsets().bottom`).
 *
 * `attivo` = false non ascolta niente (il componente che la usa e' montato sempre, e non deve rileggere a ogni tastiera di un'altra schermata).
 */
export function useAltezzaTastiera(attivo: boolean): number {
  const [altezza, setAltezza] = useState(0)
  useEffect(() => {
    if (Platform.OS !== 'android' || !attivo) {
      setAltezza(0)
      return
    }
    // Se la tastiera era gia' su prima di cominciare ad ascoltare, la notifica di quando e' comparsa e' passata.
    if (Keyboard.isVisible()) setAltezza(Keyboard.metrics()?.height ?? 0)
    const mostra = Keyboard.addListener('keyboardDidShow', (e) => setAltezza(e.endCoordinates.height))
    const nascondi = Keyboard.addListener('keyboardDidHide', () => setAltezza(0))
    return () => {
      mostra.remove()
      nascondi.remove()
    }
  }, [attivo])
  return altezza
}
