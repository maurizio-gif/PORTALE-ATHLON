// Il token monouso dei link delle email (`#th=<token>`), letto da un indirizzo intero: la parte pura (08/11/2026).
//
// Sul web il frammento sta in `window.location.hash` e lo legge `leggiEToglieToken` (features/lab/accessoDalCrm.ts). **Nell'app nativa
// non c'e' nessuna `window`**: il link che apre l'app (un link universale `https://app.athlonroma.it/entra?d=…#th=…` o l'indirizzo
// `athlon://entra?d=…#th=…`) arriva a `Linking` come stringa intera, e il token va tirato fuori da li'. E' quello che fa questo file, senza
// React ne' moduli nativi, cosi' si prova con `node --experimental-strip-types scripts/prova-link-token.ts`. Il lato nativo, che ascolta
// `Linking`, e' `urlApertura.ts`.

/** Un token che puo' essere vero: i caratteri e la lunghezza dei token di accesso di Supabase. Qualunque altra cosa si butta. */
export const TOKEN_VALIDO = /^[A-Za-z0-9_-]{16,200}$/

/** Il token `th` in un frammento (`th=…&altro=…`, con o senza il `#` davanti), o null. Il primo `th` decide. */
export function tokenDaFrammento(frammento: string | null | undefined): string | null {
  if (typeof frammento !== 'string' || !frammento) return null
  for (const coppia of frammento.replace(/^#/, '').split('&')) {
    const uguale = coppia.indexOf('=')
    if (uguale < 0 || coppia.slice(0, uguale) !== 'th') continue
    const valore = coppia.slice(uguale + 1)
    return TOKEN_VALIDO.test(valore) ? valore : null
  }
  return null
}

/** Il token `th` nel frammento di un indirizzo intero, o null. */
export function tokenDaUrl(url: string | null | undefined): string | null {
  if (typeof url !== 'string') return null
  const i = url.indexOf('#')
  return i < 0 ? null : tokenDaFrammento(url.slice(i + 1))
}

/**
 * Il percorso di un indirizzo che apre l'app, come lo vede il router: `https://app.athlonroma.it/entra?d=x#th=…` e `athlon://entra?d=x` sono
 * tutti e due `/entra` (con uno schema suo, il primo pezzo dopo `://` e' gia' il percorso).
 */
export function percorsoDi(url: string): string {
  const senza = url.split('#')[0].split('?')[0]
  const web = senza.match(/^https?:\/\/[^/]+(\/.*)?$/i)
  if (web) return web[1] || '/'
  const schema = senza.match(/^[a-z][a-z0-9+.-]*:\/\/(.*)$/i)
  return schema ? `/${schema[1]}`.replace(/\/{2,}/g, '/') : '/'
}

/** Il percorso e' quello atteso o sta sotto: `/entra` prende `/entra` e `/entra/x`, non `/entrata`. */
export function corrisponde(percorso: string, atteso: string): boolean {
  const p = percorso.replace(/\/+$/, '') || '/'
  const a = atteso.replace(/\/+$/, '') || '/'
  return p === a || p.startsWith(`${a}/`)
}

/** Quanto resta in memoria un token visto: il link vale un'ora, ma una pagina che lo vuole lo chiede subito. */
export const VALE_MS = 15 * 60_000

/**
 * La memoria dell'ultimo link aperto con un token. **Un token solo**, **a quel percorso** e **una volta sola**: un token visto da `/delega/…` non
 * serve a `/entra`, e uno gia' preso non si riprende. `adesso` si passa nelle prove.
 */
export function memoriaLink(adesso: () => number = Date.now) {
  let visto: { token: string; percorso: string; il: number } | null = null
  return {
    /** Un indirizzo che ha aperto l'app: se porta un token, lo si tiene. */
    ricorda(url: string | null | undefined) {
      const token = tokenDaUrl(url)
      if (token && url) visto = { token, percorso: percorsoDi(url), il: adesso() }
    },
    /** Il token visto per quel percorso, e lo toglie dalla memoria. */
    prendi(atteso: string): string | null {
      const v = visto
      if (!v || adesso() - v.il > VALE_MS || !corrisponde(v.percorso, atteso)) return null
      visto = null
      return v.token
    },
  }
}
