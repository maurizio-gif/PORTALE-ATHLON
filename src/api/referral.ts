import { SUPABASE_URL } from '@/config'
import { funzione } from '@/api/lab'

// L'invito di un amico (21/10/2026): il link personale del socio e gli amici che l'hanno accettato, dalla funzione
// `portale-lab-referral` (APP-ATHLON); e, per la pagina pubblica dell'invito, il nome di chi ha invitato (`guest-pass`,
// azione `invito`). Il voucher da 50 € non passa di qui: quando l'amico si iscrive, il desk riceve un task in Agenda.

export type StatoAmico = 'accettato' | 'in_prova' | 'prova_finita' | 'iscritto' | 'scaduto'

export type Amico = {
  id: string
  /** «Luca N.»: il nome e l'iniziale del cognome, mai l'email. */
  amico: string
  accettato_il: string
  /** L'ultimo giorno utile per iscriversi (30 giorni, o il giorno dopo la fine della prova). */
  ultimo_giorno: string
  stato: StatoAmico
  prova_inizio: string | null
  prova_fine: string | null
  firmato_il: string | null
}

export type StatoInvito =
  | { ok: true; idoneo: false; motivo: string }
  | {
      ok: true
      idoneo: true
      codice: string
      link: string
      nome: string
      oggetto: string
      messaggio: string
      giorni: number
      voucher: number
      inviti: Amico[]
    }
  | { ok: false; errore: string }

const GUASTO = 'Non riusciamo a preparare il tuo invito adesso. Riprova fra qualche minuto.'
const NON_ATTIVO = 'L’invito di un amico non è ancora attivo: riprova fra qualche giorno.'

export async function statoInvito(): Promise<StatoInvito> {
  const { ok, stato, dati } = await funzione('portale-lab-referral', { azione: 'stato' })
  if (!ok) return { ok: false, errore: dati.errore ?? (stato === 404 ? NON_ATTIVO : GUASTO) }
  if (!dati.idoneo) return { ok: true, idoneo: false, motivo: String(dati.motivo ?? '') }
  return {
    ok: true,
    idoneo: true,
    codice: String(dati.codice),
    link: String(dati.link),
    nome: String(dati.nome ?? ''),
    oggetto: String(dati.oggetto ?? 'Allenati con me da Athlon'),
    messaggio: String(dati.messaggio ?? dati.link),
    giorni: Number(dati.giorni ?? 30),
    voucher: Number(dati.voucher ?? 50),
    inviti: Array.isArray(dati.inviti) ? (dati.inviti as Amico[]) : [],
  }
}

/** La pagina pubblica dell'invito: chi ha invitato (solo il primo nome) e se il link vale. Senza sessione. */
export async function leggiInvito(codice: string): Promise<{ valido: boolean; nome: string | null }> {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/guest-pass`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ azione: 'invito', codice }),
    })
    const d = (await r.json().catch(() => null)) as { ok?: boolean; valido?: boolean; nome?: string | null } | null
    return { valido: d?.ok === true && d.valido === true, nome: d?.nome ?? null }
  } catch {
    return { valido: false, nome: null }
  }
}
