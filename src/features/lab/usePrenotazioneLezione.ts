import { router } from 'expo-router'
import { useState } from 'react'
import { Linking, Platform } from 'react-native'

import { acquistaLezione, disdiciLezione, pagaLezioneConCarta, prenotaLezione, type DaPagare } from '@/api/lab'

// Prenotare, disdire e pagare una lezione di gruppo: i quattro gesti che il Calendario faceva da solo e che
// adesso fa anche il Percorso Athlon dalle sue tappe (20/10/2026). Sono qui, in un posto solo, perche' due copie
// della stessa catena di pagamento divergono al primo ritocco. **Non cambia niente per il calendario**: le
// funzioni sono quelle di prima, spostate.
//
// Chi le usa dice cosa fare dopo una prenotazione e dopo una disdetta (`dopo`): il Calendario aggiorna la sua
// giornata, il Percorso la sua settimana. Le funzioni non sollevano mai: tornano il testo del problema, o null.
//
// Il ritorno dal pagamento di PerfectGym e' sempre `/calendario?acquisto=<id>`: li' si chiede com'e' andata
// finche' la prenotazione non c'e'. Dal Percorso si passa quindi per il Calendario, e si ritorna al Percorso
// da sé (la settimana si rilegge a ogni ritorno).

export type PrenotazioneFatta = { booking_id: number; attesa: boolean }

export type DopoLaPrenotazione = {
  prenotata: (classId: number, prenotazione: PrenotazioneFatta) => void
  /** `eraInAttesa`: la prenotazione disdetta era una lista d'attesa, e non occupava un posto. */
  disdetta: (classId: number, eraInAttesa: boolean) => void
}

export function usePrenotazioneLezione(memberId: number | null | undefined, dopo: DopoLaPrenotazione) {
  const [occupato, setOccupato] = useState(false)

  async function prenota(classId: number): Promise<({ errore: string } & Partial<DaPagare>) | null> {
    if (memberId == null) return null
    setOccupato(true)
    const esito = await prenotaLezione(classId, memberId)
    setOccupato(false)
    if (!esito.ok) return esito
    dopo.prenotata(classId, { booking_id: esito.booking_id ?? 0, attesa: esito.esito === 'attesa' })
    return null
  }

  /** Alla pagina di pagamento di PerfectGym; si torna al calendario con ?acquisto=<id>. */
  async function acquista(classId: number, pronto?: string): Promise<string | null> {
    if (memberId == null) return null
    let url = pronto
    if (!url) {
      setOccupato(true)
      const r = await acquistaLezione(classId, memberId)
      setOccupato(false)
      if (!r.ok) return r.errore
      url = r.url
    }
    if (Platform.OS === 'web') window.location.assign(url)
    else await Linking.openURL(url)
    return null
  }

  /** Con la carta salvata: l'addebito, poi l'esito come al ritorno dal pagamento. */
  async function pagaCarta(acquistoId: string): Promise<string | null> {
    setOccupato(true)
    const r = await pagaLezioneConCarta(acquistoId)
    setOccupato(false)
    if (!r.ok) return r.errore
    if (Platform.OS === 'web') window.location.assign(`/calendario?acquisto=${acquistoId}`)
    else router.replace({ pathname: '/calendario', params: { acquisto: acquistoId } })
    return null
  }

  async function disdici(classId: number, eraInAttesa: boolean): Promise<string | null> {
    if (memberId == null) return null
    setOccupato(true)
    const esito = await disdiciLezione(classId, memberId)
    setOccupato(false)
    if (!esito.ok) return esito.errore
    dopo.disdetta(classId, eraInAttesa)
    return null
  }

  return { occupato, prenota, acquista, pagaCarta, disdici }
}
