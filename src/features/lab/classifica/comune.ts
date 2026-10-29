import type { RigaClassifica } from '@/api/classifica'
import { locale, t } from '@/lib/lingua'

// Quello che le schermate della classifica hanno in comune (29/10/2026). Niente qui parla con la rete: si prova con `npx tsx`.

/** «12°» in italiano, «12th» in inglese. */
export function ordinale(n: number): string {
  if (locale().startsWith('it')) return `${n}°`
  const r = n % 100
  if (r >= 11 && r <= 13) return `${n}th`
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`
}

/** «ottobre 2026» da «2026-10». */
export function nomeMese(id: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(id)
  if (!m) return id
  return new Intl.DateTimeFormat(locale(), { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 15)))
}

/** Solo il nome del mese («ottobre»), per «Classifica di ottobre». */
export function soloMese(id: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(id)
  if (!m) return id
  return new Intl.DateTimeFormat(locale(), { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 15)))
}

/** «Mancano 3 giorni», «Ultimo giorno». */
export function giorniRimasti(n: number): string {
  if (n <= 1) return t('Ultimo giorno', 'Last day')
  return t(`Mancano ${n} giorni`, `${n} days left`)
}

export const MOTTO_MAX = 80

export type EsitoMotto = { ok: true; motto: string | null } | { ok: false; errore: string }

/**
 * Il motto come si salva: ripulito agli spazi, vuoto = nessun motto. **Lo ricontrolla il server**: qui si dice subito quello che e' ovvio
 * (troppo lungo, un indirizzo, una mail), senza aspettare la risposta.
 */
export function validaMotto(testo: string): EsitoMotto {
  const m = testo.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (!m) return { ok: true, motto: null }
  if ([...m].length > MOTTO_MAX) return { ok: false, errore: t(`Al massimo ${MOTTO_MAX} caratteri.`, `${MOTTO_MAX} characters at most.`) }
  if (/(https?:|www\.|@|\b[a-z0-9-]+\.(com|it|net|org|io|me|ly)\b)/i.test(m)) return { ok: false, errore: t('Niente indirizzi, link o mail: solo la tua frase.', 'No links, addresses or emails: just your phrase.') }
  return { ok: true, motto: m }
}

/** Qualche idea per chi non sa cosa scrivere. */
export const IDEE_MOTTO: () => string[] = () => [
  t('Un passo alla volta', 'One step at a time'),
  t('Oggi meglio di ieri', 'Better today than yesterday'),
  t('La costanza vince', 'Consistency wins'),
  t('Respira, spingi, ripeti', 'Breathe, push, repeat'),
]

export type VoceElenco = { tipo: 'riga'; riga: RigaClassifica } | { tipo: 'salto'; chiave: string }

/** Le righe con un «…» dove la graduatoria salta (le prime dieci, poi la persona coi vicini). */
export function conSalti(righe: RigaClassifica[]): VoceElenco[] {
  const ordinate = [...righe].sort((a, b) => a.posizione - b.posizione)
  const voci: VoceElenco[] = []
  ordinate.forEach((r, i) => {
    const prima = ordinate[i - 1]
    if (prima && r.posizione - prima.posizione > 1 && r.posizione !== prima.posizione) voci.push({ tipo: 'salto', chiave: `salto-${r.id}` })
    voci.push({ tipo: 'riga', riga: r })
  })
  return voci
}

/** «74 punti» / «1 punto». */
export function puntiTesto(p: number): string {
  const n = Math.round(p)
  return t(`${n} ${n === 1 ? 'punto' : 'punti'}`, `${n} ${n === 1 ? 'point' : 'points'}`)
}

/** Le iniziali per l'avatar senza foto: «Marco R.» -> «MR». */
export function iniziali(nome: string): string {
  const parti = nome.replace(/\./g, ' ').split(/\s+/).filter(Boolean)
  return ((parti[0]?.[0] ?? '') + (parti.length > 1 ? (parti[parti.length - 1]?.[0] ?? '') : '')).toUpperCase()
}
