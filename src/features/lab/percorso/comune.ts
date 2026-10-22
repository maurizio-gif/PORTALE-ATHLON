import type { Fascia, Gruppo, GiornoSettimana, Tappa, TipoTappa } from '@/api/percorso'
import { locale, t, t as tr, tv } from '@/lib/lingua'

// Le parole e i piccoli conti del Percorso Athlon (20/10/2026). **Non e' un piano di allenamento**: il piano
// (nel codice, la «scheda») sono gli esercizi di un allenamento in sala; il Percorso e' la settimana intera, e
// i piani ci entrano come tappe di sala. Nei testi per il socio si scrive «percorso» e mai «piano» o «scheda»
// per questo: la distinzione e' la prima cosa che la schermata deve far capire.

export const NOME_GIORNO: Record<GiornoSettimana, string> = tv(
  { 1: 'Lunedì', 2: 'Martedì', 3: 'Mercoledì', 4: 'Giovedì', 5: 'Venerdì', 6: 'Sabato', 7: 'Domenica' },
  { 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday', 7: 'Sunday' },
)
export const GIORNO_BREVE: Record<GiornoSettimana, string> = tv(
  { 1: 'Lun', 2: 'Mar', 3: 'Mer', 4: 'Gio', 5: 'Ven', 6: 'Sab', 7: 'Dom' },
  { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' },
)
export const GIORNI: GiornoSettimana[] = [1, 2, 3, 4, 5, 6, 7]

export const NOME_GRUPPO: Record<Gruppo, { titolo: string; nota: string }> = {
  mente_corpo: { titolo: t('Mente e corpo', 'Mind and body'), nota: t('Yoga, pilates, Reformer, postura', 'Yoga, pilates, Reformer, posture') },
  forza_tono: { titolo: t('Forza e tono', 'Strength and tone'), nota: t('Body sculpt, calisthenics, circuiti', 'Body sculpt, calisthenics, circuits') },
  cardio_danza: { titolo: t('Cardio e danza', 'Cardio and dance'), nota: t('Coreografie, balli, ritmo', 'Choreography, dance, rhythm') },
  acqua: { titolo: t('Acqua', 'Water'), nota: t('Aqua fitness, nuoto libero, corsi di nuoto', 'Aqua fitness, lap swimming, swim courses') },
  combat: { titolo: 'Combat', nota: t('Boxe e difesa personale', 'Boxing and self-defense') },
}

export const NOME_FASCIA: Record<Fascia, { titolo: string; nota: string }> = {
  mattina_presto: { titolo: t('Mattina presto', 'Early morning'), nota: t('prima delle 9', 'before 9') },
  mattina: { titolo: t('Mattina', 'Morning'), nota: '9–12' },
  pranzo: { titolo: t('Pranzo', 'Lunchtime'), nota: '12–14:30' },
  pomeriggio: { titolo: t('Pomeriggio', 'Afternoon'), nota: '14:30–17:30' },
  sera: { titolo: t('Sera', 'Evening'), nota: t('dopo le 17:30', 'after 17:30') },
  weekend: { titolo: 'Weekend', nota: t('sabato e domenica', 'Saturday and Sunday') },
}

export const ETICHETTA_TIPO: Record<TipoTappa, string> = { lezione: t('Lezione', 'Class'), sala: t('In sala', 'Gym floor'), cardio: 'Cardio' }

/** L'istante in minuti dalla mezzanotte di «HH:MM», o null. */
export function minutiDaOra(ora: string | null | undefined): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(ora ?? ''))
  if (!m) return null
  const h = Number(m[1])
  const mm = Number(m[2])
  return h < 24 && mm < 60 ? h * 60 + mm : null
}

export function oraDaMinuti(minuti: number): string {
  const m = ((Math.round(minuti) % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** «18:30 – 19:20», o solo la durata se l'ora non c'e'. */
export function fasciaOraria(ora: string | null, minuti: number): string {
  const da = minutiDaOra(ora)
  return da === null ? `${minuti} min` : `${oraDaMinuti(da)} – ${oraDaMinuti(da + minuti)}`
}

/** Cosa si fa in una tappa, in due parole: il nome della lezione, il giorno del piano, la macchina. */
export function titoloTappa(t: Tappa): string {
  if (t.tipo === 'lezione') return t.lezione?.nome ?? tr('Lezione', 'Class')
  if (t.tipo === 'cardio') return t.cardio?.nome ?? 'Cardio'
  const giorno = t.sala?.giorno_nome ? ` · ${t.sala.giorno_nome}` : ''
  return `${t.sala?.scheda_titolo ?? tr('Sala', 'Gym floor')}${giorno}`
}

/** Le tappe di un giorno, nell'ordine in cui si fanno. */
export function tappeDelGiorno<T extends Pick<Tappa, 'giorno' | 'ordine' | 'ora'>>(tappe: T[], giorno: GiornoSettimana): T[] {
  return tappe
    .filter((t) => t.giorno === giorno)
    .sort((a, b) => (minutiDaOra(a.ora) ?? 9999) - (minutiDaOra(b.ora) ?? 9999) || a.ordine - b.ordine)
}

/** Dopo una modifica a mano: l'`ordine` di ogni giorno riparte da 1 nell'ordine in cui le tappe si fanno, e le ancore seguono. */
export function rinumera(tappe: Tappa[]): Tappa[] {
  const nuovo = new Map<Tappa, number>()
  for (const g of GIORNI) tappeDelGiorno(tappe, g).forEach((t, i) => nuovo.set(t, i + 1))
  // Una tappa agganciata (cardio prima della lezione) punta all'`ordine` vecchio dell'altra: si ritrova per identita'.
  return tappe.map((t) => {
    const ancora = t.ancora == null ? null : (tappe.find((x) => x.giorno === t.giorno && x.ordine === t.ancora) ?? null)
    return { ...t, ordine: nuovo.get(t) ?? t.ordine, ancora: ancora ? (nuovo.get(ancora) ?? null) : null, posizione: ancora ? t.posizione : null }
  })
}

const dataLunga = new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'long', timeZone: 'UTC' })
const dataBreve = new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short', timeZone: 'UTC' })

/** «21 ottobre», da AAAA-MM-GG. */
export const dataEstesa = (giorno: string) => dataLunga.format(new Date(`${giorno}T12:00:00Z`))
export const dataCorta = (giorno: string) => dataBreve.format(new Date(`${giorno}T12:00:00Z`))

/** «Dal 20 al 26 ottobre», da due AAAA-MM-GG. */
export function intervallo(da: string, a: string): string {
  const x = new Date(`${da}T12:00:00Z`)
  const y = new Date(`${a}T12:00:00Z`)
  if (x.getUTCMonth() === y.getUTCMonth()) return `${x.getUTCDate()}–${dataLunga.format(y)}`
  return `${dataCorta(da)} – ${dataCorta(a)}`
}

/** Le chiavi di memoria del laboratorio. */
export const CHIAVE_STATO_PERCORSO = 'percorso:stato'
export const chiaveSettimana = (lunedi: string) => `percorso:settimana:${lunedi}`
export const CHIAVE_CATALOGO_PERCORSO = 'percorso:catalogo'
