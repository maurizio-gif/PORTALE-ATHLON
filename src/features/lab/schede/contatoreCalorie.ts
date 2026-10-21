import type { PresenzaLezione, SchedaLezione, SedutaStorico } from '@/api/lab'
import { t } from '../../../lib/lingua'

import { dopoSeduta, kcal, MET_MEDIO, metabolismoBasale, type Sesso } from './stimaCalorie'
import { stimaLezione } from './stimaCorso'

// Il contatore delle calorie (18/10/2026): quanto ha consumato il socio, giorno
// per giorno e settimana per settimana, con quello che ha fatto davvero.
//
// **Cosa conta**, e niente altro:
//   - le sedute delle schede chiuse nell'app, con la loro durata vera (dall'avvio
//     alla chiusura): il consumo dei pesi come nella stima della scheda, al MET di
//     mezzo e col dopo-allenamento (stimaCalorie.ts);
//   - le lezioni a cui la reception l'ha segnato presente (`presenze` di
//     portale-lab-calendario), stimate come le stima la loro scheda nel
//     calendario (stimaCorso.ts), coi minuti veri della lezione.
// La Gym Floor non conta come presenza: in sala la stima e' quella della scheda,
// e contarle tutte e due vorrebbe dire contare due volte la stessa ora. Chi si
// allena in sala senza chiudere una seduta nell'app non compare: e' il prezzo di
// contare solo quello che si sa.
//
// **Il giorno e' quello di Roma**, e la settimana va dal lunedi' alla domenica.
// Il confronto con la settimana scorsa e' alla pari: fino allo stesso giorno della
// settimana, non con la settimana intera.

export type Corpo = { kg: number; cm: number; anni: number; sesso: NonNullable<Sesso> }

export type Voce = {
  quando: string
  /** «AAAA-MM-GG», a Roma. */
  giorno: string
  fonte: 'scheda' | 'lezione'
  nome: string
  /** Il tipo, per «da dove vengono»: «Schede di allenamento», «Yoga e mobilità», … */
  tipo: string
  minuti: number
  kcal: number
}

export type GiornoCalorie = { giorno: string; schede: number; lezioni: number; totale: number; voci: number }
export type SettimanaCalorie = { lunedi: string; schede: number; lezioni: number; totale: number; voci: number }

export type Contatore = {
  bmr: number
  voci: Voce[]
  /** I sette giorni della settimana in corso, da lunedi' a domenica. */
  settimanaGiorni: GiornoCalorie[]
  /** Le ultime settimane, dalla piu' vecchia alla corrente (l'ultima). */
  settimane: SettimanaCalorie[]
  oggi: GiornoCalorie
  settimana: SettimanaCalorie
  /** La settimana scorsa fino allo stesso giorno di oggi, e intera. */
  scorsaAllaPari: number
  scorsa: number
  /** La media delle quattro settimane intere prima di questa. */
  media4: number
  /** La settimana piu' alta delle ultime, e se e' questa. */
  record: number
  recordOra: boolean
  /** Da dove vengono le calorie delle ultime quattro settimane (questa compresa). */
  perTipo: { tipo: string; kcal: number; volte: number }[]
}

const giorniRoma = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' })

/** «AAAA-MM-GG» del giorno di Roma in cui cade l'istante. */
export function giornoRoma(d: Date | string): string {
  return giorniRoma.format(typeof d === 'string' ? new Date(d) : d)
}

/** Il giorno spostato di n giorni, sul calendario (a mezzogiorno UTC: l'ora legale non lo sposta). */
export function spostaGiorno(giorno: string, n: number): string {
  const d = new Date(`${giorno}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Il lunedi' della settimana del giorno. */
export function lunediDi(giorno: string): string {
  const dow = new Date(`${giorno}T12:00:00Z`).getUTCDay() // 0 domenica
  return spostaGiorno(giorno, -((dow + 6) % 7))
}

const minutiTra = (inizio: string, fine: string) => (new Date(fine).getTime() - new Date(inizio).getTime()) / 60000

/** Le voci: le sedute chiuse (fra 10 minuti e 3 ore, come la durata vera della scheda) e le lezioni stimabili. */
export function vociCalorie(sedute: SedutaStorico[], presenze: PresenzaLezione[], schede: Record<string, SchedaLezione>, corpo: Corpo): Voce[] {
  const bmr = metabolismoBasale(corpo)
  const voci: Voce[] = []
  for (const s of sedute) {
    if (!s.fine || s.serie <= 0) continue
    const minuti = minutiTra(s.inizio, s.fine)
    if (minuti < 10 || minuti > 180) continue
    voci.push({
      quando: s.inizio,
      giorno: giornoRoma(s.inizio),
      fonte: 'scheda',
      nome: [s.titolo, s.giorno_nome].filter(Boolean).join(' · ') || t('Allenamento', 'Workout'),
      tipo: t('Piani di allenamento', 'Workout plans'),
      minuti: Math.round(minuti),
      kcal: Math.round(kcal(bmr, MET_MEDIO, minuti) + dopoSeduta(bmr, MET_MEDIO, minuti)),
    })
  }
  for (const l of presenze) {
    const minuti = Math.round(minutiTra(l.inizio, l.fine))
    const scheda = l.scheda ? schede[l.scheda] ?? null : null
    const stima = stimaLezione({ nome: l.nome, categoria: l.categoria, minuti }, scheda, corpo)
    if (!stima) continue
    voci.push({ quando: l.inizio, giorno: giornoRoma(l.inizio), fonte: 'lezione', nome: l.nome, tipo: stima.tipo.etichetta, minuti, kcal: stima.kcal.circa })
  }
  return voci.sort((a, b) => b.quando.localeCompare(a.quando))
}

export function contaCalorie(voci: Voce[], corpo: Corpo, adesso: Date = new Date(), quanteSettimane = 12): Contatore {
  const oggi = giornoRoma(adesso)
  const lunedi = lunediDi(oggi)
  const perGiorno = new Map<string, GiornoCalorie>()
  for (const v of voci) {
    const g = perGiorno.get(v.giorno) ?? { giorno: v.giorno, schede: 0, lezioni: 0, totale: 0, voci: 0 }
    if (v.fonte === 'scheda') g.schede += v.kcal
    else g.lezioni += v.kcal
    g.totale += v.kcal
    g.voci++
    perGiorno.set(v.giorno, g)
  }
  const giorno = (d: string): GiornoCalorie => perGiorno.get(d) ?? { giorno: d, schede: 0, lezioni: 0, totale: 0, voci: 0 }
  const settimanaDi = (lun: string, fino = 6): SettimanaCalorie => {
    const s: SettimanaCalorie = { lunedi: lun, schede: 0, lezioni: 0, totale: 0, voci: 0 }
    for (let i = 0; i <= fino; i++) {
      const g = giorno(spostaGiorno(lun, i))
      s.schede += g.schede
      s.lezioni += g.lezioni
      s.totale += g.totale
      s.voci += g.voci
    }
    return s
  }

  const settimane = Array.from({ length: quanteSettimane }, (_, i) => settimanaDi(spostaGiorno(lunedi, -7 * (quanteSettimane - 1 - i))))
  const settimana = settimane[settimane.length - 1]
  const oggiIndice = Math.round((new Date(`${oggi}T12:00:00Z`).getTime() - new Date(`${lunedi}T12:00:00Z`).getTime()) / 86_400_000)
  const prima4 = settimane.slice(-5, -1)
  const record = Math.max(0, ...settimane.map((s) => s.totale))

  const dal4 = spostaGiorno(lunedi, -21)
  const tipi = new Map<string, { tipo: string; kcal: number; volte: number }>()
  for (const v of voci) {
    if (v.giorno < dal4 || v.giorno > oggi) continue
    const t = tipi.get(v.tipo) ?? { tipo: v.tipo, kcal: 0, volte: 0 }
    t.kcal += v.kcal
    t.volte++
    tipi.set(v.tipo, t)
  }

  return {
    bmr: Math.round(metabolismoBasale(corpo)),
    voci,
    settimanaGiorni: Array.from({ length: 7 }, (_, i) => giorno(spostaGiorno(lunedi, i))),
    settimane,
    oggi: giorno(oggi),
    settimana,
    scorsaAllaPari: settimanaDi(spostaGiorno(lunedi, -7), oggiIndice).totale,
    scorsa: settimane.length > 1 ? settimane[settimane.length - 2].totale : 0,
    media4: prima4.length ? Math.round(prima4.reduce((x, s) => x + s.totale, 0) / prima4.length) : 0,
    record,
    recordOra: settimana.totale > 0 && settimana.totale >= record && settimane.slice(0, -1).some((s) => s.totale > 0),
    perTipo: [...tipi.values()].sort((a, b) => b.kcal - a.kcal),
  }
}
