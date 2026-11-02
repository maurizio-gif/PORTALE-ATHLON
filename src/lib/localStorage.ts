// Sul web `localStorage` c'e' gia': niente da installare.
//
// Sul totem (`totem.ts`) lo rimpiazza `totemAvvio.ts`, che ha il suo effetto al caricamento: questo e' il primo modulo che
// `supabase.ts` e `lingua.ts` importano, quindi la memoria giusta c'e' prima che qualcuno la usi.
import './totemAvvio'

export {}
