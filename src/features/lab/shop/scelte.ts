import type { ArticoloShop, Opzione, PersonaShop, Scelte } from '@/api/shop'

// Le risposte al questionario di un articolo (06/11/2026): quali mancano, se tornano ancora con la vetrina, come si scrivono nel carrello.
// Modulo puro (niente React ne' React Native): si prova con `npx tsx scripts/prova-shop.ts`.
//
// **Il server e' l'ultima parola.** Qui si decide solo se il pulsante si accende e come si legge una riga del carrello; le risposte le valida di nuovo
// `portale-lab-shop` (codice `scelte`). Per questo un valore che la vetrina non offre piu' (una taglia tolta, un atleta che non e' piu' nel nucleo)
// conta come «manca»: meglio chiedere di nuovo che mandare una scelta che il server rifiuta.

type ConOpzioni = Pick<ArticoloShop, 'opzioni'>

/** Nome e cognome come si leggono: «Sara Rossi». */
export function nomePersona(p: Pick<PersonaShop, 'nome' | 'cognome'>): string {
  return [p.nome, p.cognome].map((x) => x?.trim()).filter(Boolean).join(' ')
}

/**
 * Chi del nucleo si puo' scegliere per questa domanda: tutti, oppure — se la domanda ha un limite di eta' (il Kit Agonismo, da 7 a 18 anni) — solo gli `ammessi` che il server ha
 * calcolato. L'app non conta gli anni: ha l'anno di nascita e non la data intera, e un conto a meta' sbaglierebbe nei giorni intorno al compleanno.
 */
export function personeAmmesse(o: Pick<Opzione, 'ammessi'>, persone: PersonaShop[]): PersonaShop[] {
  const ammessi = o.ammessi
  return Array.isArray(ammessi) ? persone.filter((p) => ammessi.includes(p.member_id)) : persone
}

/** Il valore rimandato per questa domanda, se e' ancora una risposta valida; altrimenti `null`. */
function rispostaValida(o: Opzione, scelte: Scelte | undefined, persone: PersonaShop[]): string | number | null {
  const v = scelte?.[o.id]
  if (o.tipo === 'persona') {
    if (!v || typeof v === 'string' || !Number.isInteger(v.member_id)) return null
    // Chi non e' (piu') ammesso conta come «manca»: per esempio un atleta che ha compiuto 19 anni dopo che il kit era nel carrello.
    return personeAmmesse(o, persone).some((p) => p.member_id === v.member_id) ? v.member_id : null
  }
  if (typeof v !== 'string') return null
  return (o.valori ?? []).some((x) => x.v === v) ? v : null
}

/** Le domande senza una risposta valida, nell'ordine in cui compaiono nella scheda. */
export function opzioniMancanti(a: ConOpzioni, scelte: Scelte | undefined, persone: PersonaShop[]): Opzione[] {
  return a.opzioni.filter((o) => rispostaValida(o, scelte, persone) === null)
}

/** Tutte le domande hanno una risposta valida (vero anche per un articolo senza domande). */
export const rispostaCompleta = (a: ConOpzioni, scelte: Scelte | undefined, persone: PersonaShop[]): boolean => opzioniMancanti(a, scelte, persone).length === 0

/** Il testo del pulsante spento: dice cosa manca, per nome della domanda. */
export function testoMancante(mancanti: Opzione[], manca: (e: string) => string, mancano: (e: string) => string): string {
  const nomi = mancanti.map((o) => o.etichetta.trim()).filter(Boolean)
  if (nomi.length === 1) return manca(nomi[0])
  return mancano(nomi.join(', '))
}

/** «T-shirt» + «M» → «T-shirt M»; se il valore la contiene gia' («T-shirt M») resta com'e'. */
export function conEtichetta(etichetta: string, valore: string): string {
  const e = etichetta.trim()
  const v = valore.trim()
  if (!e) return v
  return v.toLowerCase().includes(e.toLowerCase()) ? v : `${e} ${v}`
}

/**
 * Le risposte scritte per il carrello, nell'ordine delle domande: «Sara Rossi», «T-shirt M», «Short 12 anni». Il nome viene da `persone`, il testo del
 * valore da `v_testo`. Una risposta che la vetrina non conosce piu' si salta (la riga viene tolta dall'allineamento, vedi `carrello.ts`).
 */
export function testoScelte(a: ConOpzioni, scelte: Scelte | undefined, persone: PersonaShop[]): string[] {
  const fuori: string[] = []
  for (const o of a.opzioni) {
    const v = scelte?.[o.id]
    if (o.tipo === 'persona') {
      if (v && typeof v !== 'string') {
        const p = persone.find((x) => x.member_id === v.member_id)
        const nome = p ? nomePersona(p) : ''
        if (nome) fuori.push(nome)
      }
    } else if (typeof v === 'string') {
      const x = (o.valori ?? []).find((y) => y.v === v)
      if (x) fuori.push(conEtichetta(o.etichetta, x.v_testo))
    }
  }
  return fuori
}
