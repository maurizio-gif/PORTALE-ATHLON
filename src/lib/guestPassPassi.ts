// I passi del Guest Pass dal link (07/11/2026): «Passo N di 4», come l'abbonamento dal link, ma senza il contratto da firmare.
// Qui sta la parte che si puo' provare senza un telefono: dati, metodo di partenza e il passo da cui si riparte. La pagina e'
// `features/guest-pass/AttivaGuestPass.tsx`; la prova, `scripts/prova-guest-pass-passi.ts`.
//
// **Non c'e' stato nuovo sul server**: i passi sono solo presentazione. Il server ha gia' i dati confermati (`dati_confermati`), il giorno
// (`inizio.scelto`) e il metodo (`scelte`): chi riapre il link a meta' riparte dal primo passo che manca, e ogni controllo di prima
// (la spunta dei consensi, il server alla conferma) e' rimasto dov'era.

import { problemaCodiceFiscale } from './codiceFiscale'
import { CAMPI, CAMPI_RICHIESTI, type PaginaGuestPass } from './guestPass'

/** 1 Dati · 2 Giorno · 3 Pagamento · 4 Conferma. */
export type Passo = 1 | 2 | 3 | 4

/** I dati che la persona vede nel primo passo: quelli di PerfectGym (e di quello che ha confermato sul sito). `residente_estero` ('1'/'0') e `paese` sono le chiavi che `guest-pass` legge e scrive. */
export function datiDa(pp: PaginaGuestPass): Record<string, string> {
  return {
    ...Object.fromEntries(Object.keys(CAMPI).map((k) => [k, String((pp.persona as Record<string, unknown>)[k] ?? '')])),
    residente_estero: pp.persona.residente_estero ? '1' : '0',
    paese: pp.persona.paese ?? '',
  }
}

/** Residente all'estero: niente codice fiscale (e niente controlli su di lui) e il Paese e' obbligatorio. Altrimenti il codice fiscale deve essere ben scritto e di questa persona. */
export function analisiDati(dati: Record<string, string>) {
  const estero = dati.residente_estero === '1'
  const erroreCf = estero ? null : problemaCodiceFiscale(dati)
  const senzaPaese = estero && !dati.paese
  const completi = CAMPI_RICHIESTI.every((k) => (estero && k === 'codice_fiscale') || (dati[k] ?? '').trim()) && !erroreCf && !senzaPaese
  return { estero, erroreCf, senzaPaese, completi }
}

/** La scelta del metodo di partenza: uno gia' salvato («s<id>»), una carta nuova o un IBAN nuovo. */
export function metodoIniziale(i: PaginaGuestPass): string | null {
  const id = i.scelte.payment_source_id
  if (id && (i.salvati ?? []).some((m) => m.id === id)) return `s${id}`
  return i.scelte.metodo
}

/**
 * Da quale passo si riparte: chi riapre il link a meta' (o torna dalla pagina della carta) non ricomincia dai dati, ma dal primo passo
 * che manca. Il primo passo non si salta mai se i dati non sono completi e confermati, se manca la scelta di per chi e', o se chi sta
 * creando l'account deve ancora scrivere la password (che non si salva fra un passo e l'altro).
 */
export function passoIniziale(i: PaginaGuestPass, tornatoDallaCarta: boolean): Passo {
  const sceltoPerChi = !i.scelta || !!i.scelta.per
  if (i.stato === 'attivato' || i.password?.obbligatoria || !sceltoPerChi || !analisiDati(datiDa(i)).completi || !i.scelte.dati_confermati) return 1
  if (tornatoDallaCarta) return 4
  if (!i.inizio.scelto) return 2
  const sceltaMetodo = metodoIniziale(i)
  const metodoPronto = !!sceltaMetodo && (sceltaMetodo.startsWith('s') || sceltaMetodo === 'carta' || (sceltaMetodo === 'iban' && !!i.scelte.metodo_pronto))
  return metodoPronto ? 4 : 3
}
