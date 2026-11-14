import { useCallback, useEffect, useState } from 'react'
import { Keyboard, Platform, type LayoutChangeEvent } from 'react-native'

import { quantoAlzare } from './alzaPerTastiera'

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

/**
 * Di quanto alzare un livello a tutto schermo perche' la tastiera non lo copra (14/11/2026): la stessa logica di `FoglioAssistente`, per chi altro
 * sta in basso su Android 16 (`ui/Foglio` quando e' un livello). `alLayout` va sul livello stesso: misura l'altezza a tastiera chiusa e quella di
 * adesso, e se il sistema ha gia' ridimensionato la finestra si alza solo di quello che manca (`quantoAlzare`). `barra` e' la barra di navigazione
 * (`useSafeAreaInsets().bottom`). Con `attivo` false, su iOS e sul web `sollevamento` e' sempre 0.
 */
export function useSollevamentoTastiera(attivo: boolean, barra: number): { sollevamento: number; alLayout: (e: LayoutChangeEvent) => void } {
  const tastiera = useAltezzaTastiera(attivo)
  const [livello, setLivello] = useState({ massima: 0, adesso: 0 })
  const alLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height
    setLivello((l) => ({ massima: Math.max(l.massima, h), adesso: h }))
  }, [])
  // A tastiera chiusa la misura buona e' quella di adesso: se la finestra e' cambiata (schermo diviso) la massima vecchia non vale piu'.
  useEffect(() => {
    if (tastiera === 0) setLivello((l) => ({ massima: l.adesso, adesso: l.adesso }))
  }, [tastiera])
  return { sollevamento: quantoAlzare(tastiera, barra, livello.massima, livello.adesso), alLayout }
}
