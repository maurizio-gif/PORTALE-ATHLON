import { svuotaArchivi } from '@/lib/totemAvvio'

import { esciDalLaboratorio } from '../memoria'

// L'uscita dal totem (02/11/2026): quella a mano («Esci» in alto) e quella da sola (`GuardiaTotem`, dopo cinque minuti senza che nessuno
// tocchi lo schermo) fanno **la stessa cosa**, e fanno piu' di un logout normale, perche' il totem e' di tutti:
//
// 1. `esciDalLaboratorio`: toglie le notifiche, la chat dell'assistente, il carrello, la memoria delle schermate, la vista cliente e chiude la
//    sessione **solo di questo dispositivo** (`soloQuestoDispositivo`: chi esce dal totem non deve perdere l'accesso sul suo telefono).
//    Non aspetta oltre quattro secondi: una rete lenta non deve tenere la persona lì, ne' lasciare l'accesso aperto a chi viene dopo.
// 2. Svuota tutto cio' che l'app ha scritto nel browser (`svuotaArchivi`): memoria della scheda e vero `localStorage`.
// 3. **Ricarica la pagina da capo**: la strada piu' sicura per non lasciare in memoria niente di chi c'era (campi scritti, codici, stato delle
//    schermate, richieste a meta'), anche di cio' che nessuno ha pensato di azzerare. Si riparte dall'accesso.
const ATTESA_MAX_MS = 4000

let inUscita = false

export async function uscitaTotem(): Promise<void> {
  if (inUscita) return
  inUscita = true
  try {
    await Promise.race([esciDalLaboratorio({ soloQuestoDispositivo: true }), new Promise((risolvi) => setTimeout(risolvi, ATTESA_MAX_MS))])
  } catch {
    // Un'uscita che non riesce a parlare col server si completa lo stesso: l'importante e' non lasciare niente qui.
  }
  svuotaArchivi()
  window.location.replace('/')
}
