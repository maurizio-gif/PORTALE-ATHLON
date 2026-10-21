import { funzione } from '@/api/lab'

// La sezione Junior (21/10/2026, richiesta di Maurizio): i gruppi dei corsi per bambini e ragazzi che sono attivi, con
// gli anni di nascita e i posti che restano, dalla funzione `portale-lab-junior` (APP-ATHLON), che legge il mirror con
// `public.gruppi_junior()`. Gli anni li legge il database dal nome del gruppo («(2018-17-16)», «(2008 - 2015)»).

export type GruppoJunior = {
  id: string
  nome: string
  /** Il nome senza le annate: «Scuola Nuoto Monosettimanale Lun 15.20», «Pallanuoto Under 14». */
  corso: string
  /** La categoria di PerfectGym: «Scuola Nuoto Bambini - Monosettimanale», «Pallanuoto»… */
  categoria: string | null
  anni: number[]
  /** «Lunedì, Giovedì»: solo per i turni che hanno giorno e ora nel nome (la Scuola Nuoto). */
  giorni: string | null
  orario: string | null
  data_inizio: string | null
  data_fine: string | null
  posti: number | null
  iscritti: number
  liberi: number | null
}

export type EsitoGruppi = { ok: true; gruppi: GruppoJunior[]; aggiornato_il: string } | { ok: false; errore: string }

const GUASTO = 'Non riusciamo a leggere i gruppi adesso. Riprova fra qualche minuto.'
const NON_ATTIVO = 'La sezione Junior non è ancora attiva: riprova fra qualche giorno.'

export async function gruppiJunior(): Promise<EsitoGruppi> {
  const { ok, stato, dati } = await funzione('portale-lab-junior', { azione: 'gruppi' })
  if (!ok) return { ok: false, errore: stato === 404 && !dati.errore ? NON_ATTIVO : dati.errore ?? GUASTO }
  return {
    ok: true,
    gruppi: Array.isArray(dati.gruppi) ? (dati.gruppi as GruppoJunior[]) : [],
    aggiornato_il: String(dati.aggiornato_il ?? new Date().toISOString()),
  }
}
