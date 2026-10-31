// Le regole della pagina pubblica della delega (31/10/2026), pure: si provano con `node --experimental-strip-types`.
// Qui solo quello che si vede subito (maggiorenne, campi pieni); il resto lo ricontrolla `delega-invito` (APP-ATHLON).

export type CampiDelegato = { nome: string; cognome: string; email: string; telefono: string; nascita: string }

/** Gli anni compiuti al giorno `al` («AAAA-MM-GG»), da una data di nascita «AAAA-MM-GG»; null se non sono date. */
export function anniAl(nascita: string, al: string): number | null {
  const n = /^(\d{4})-(\d{2})-(\d{2})$/.exec(nascita)
  const o = /^(\d{4})-(\d{2})-(\d{2})$/.exec(al)
  if (!n || !o) return null
  const [a, m, g] = [Number(n[1]), Number(n[2]), Number(n[3])]
  const [oa, om, og] = [Number(o[1]), Number(o[2]), Number(o[3])]
  return oa - a - (om < m || (om === m && og < g) ? 1 : 0)
}

export function maggiorenne(nascita: string, oggi: string): boolean {
  const a = anniAl(nascita, oggi)
  return a != null && a >= 18
}

/** Cosa manca per poter inviare: i nomi dei campi vuoti, nell'ordine della pagina. */
export function mancanti(d: CampiDelegato): (keyof CampiDelegato)[] {
  const out: (keyof CampiDelegato)[] = []
  if (!d.nome.trim()) out.push('nome')
  if (!d.cognome.trim()) out.push('cognome')
  if (!d.email.trim()) out.push('email')
  // Il cellulare e' vuoto finche' non si scrive il numero (la tendina del prefisso da sola non conta); sotto 8 cifre con il prefisso non e' un cellulare.
  if (d.telefono.replace(/\D/g, '').length < 8) out.push('telefono')
  if (!d.nascita) out.push('nascita')
  return out
}
