import { inModalitaTotem } from '@/lib/totem'

// Il passaggio dal totem per ogni pagamento (04/11/2026, richiesta di Maurizio: «per ogni azione con un pagamento, sempre QR, email o con operatore: cosi' si lavora in sicurezza»).
//
// Sul totem una carta o un IBAN non si digitano da soli su uno schermo pubblico. Prima di ogni pagamento (la pagina della carta, un addebito su un metodo salvato, un IBAN nuovo)
// il codice chiama `passaDalTotem`, che **fuori dal totem risponde subito `true`** (niente cambia) e **sul totem apre `PagamentoTotem`** con le tre strade:
//   - QR e email portano il pagamento sul telefono (`url` se c'e' la pagina di pagamento di quello che si e' scelto; altrimenti la stessa sezione dell'app, `percorso`);
//   - con un operatore: digita il suo codice, e solo allora `passaDalTotem` risponde `true` e il pagamento prosegue qui.
// Se si sceglie QR o email, o si annulla, risponde `false` e **il pagamento non parte**: chi chiama si ferma.
//
// **Senza la schermata che lo mostra non si paga** (`false`): meglio un pagamento che non parte che una carta digitata senza nessuno accanto.

export type RichiestaPassaggio = {
  /** Una parola sola per il registro e per il testo: «pagamento», «carta salvata», «metodo di pagamento»… */
  cosa: string
  /** La pagina di pagamento di quello che si e' scelto (PerfectGym o Adyen): il QR e l'email portano li'. */
  url?: string
  /** Senza `url`: la sezione dell'app che si riapre sul telefono (`/pagamenti`, `/shop`…). */
  percorso?: string
}

type Corrente = { richiesta: RichiestaPassaggio; risolvi: (ok: boolean) => void }

let corrente: Corrente | null = null
const ascoltatori = new Set<() => void>()

function avvisa() {
  ascoltatori.forEach((f) => f())
}

export function ascoltaPassaggio(f: () => void): () => void {
  ascoltatori.add(f)
  return () => {
    ascoltatori.delete(f)
  }
}

export function passaggioCorrente(): Corrente | null {
  return corrente
}

export function passaDalTotem(richiesta: RichiestaPassaggio): Promise<boolean> {
  if (!inModalitaTotem()) return Promise.resolve(true)
  // Nessuna schermata che lo mostri: non si paga.
  if (ascoltatori.size === 0) return Promise.resolve(false)
  // Una richiesta nuova chiude quella di prima (che non parte).
  corrente?.risolvi(false)
  return new Promise<boolean>((risolvi) => {
    const mia: Corrente = {
      richiesta,
      risolvi: (ok) => {
        if (corrente === mia) corrente = null
        avvisa()
        risolvi(ok)
      },
    }
    corrente = mia
    avvisa()
  })
}

/** L'indirizzo che il telefono apre per una sezione dell'app: lo stesso dominio del totem. */
export function indirizzoSezione(percorso: string): string {
  const origine = typeof window !== 'undefined' ? window.location.origin : 'https://app.athlonroma.it'
  return `${origine}${percorso.startsWith('/') ? percorso : `/${percorso}`}`
}
