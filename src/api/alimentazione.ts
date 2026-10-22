import { funzione } from './lab'
import { t } from '@/lib/lingua'

// L'alimentazione (19/10/2026): la funzione portale-lab-alimentazione di APP-ATHLON.
// Ogni azione fuori da `stato`, `consenso` e `catalogo` vuole il consenso
// all'informativa: senza, la funzione risponde 403 con `consenso: false`.

type Esito<T> = ({ ok: true } & T) | { ok: false; errore: string; senzaConsenso?: boolean }

export type Pasto = 'colazione' | 'pranzo' | 'cena' | 'spuntino'
export const PASTI: { id: Pasto; nome: string }[] = [
  { id: 'colazione', nome: t('Colazione', 'Breakfast') },
  { id: 'pranzo', nome: t('Pranzo', 'Lunch') },
  { id: 'cena', nome: t('Cena', 'Dinner') },
  { id: 'spuntino', nome: t('Spuntini', 'Snacks') },
]

export type Porzione = { nome: string; g: number }
export type Alimento = {
  id: string
  nome: string
  categoria: string
  kcal: number
  proteine: number
  carboidrati: number
  grassi: number
  fibre: number
  porzioni: Porzione[]
  sinonimi: string[]
}

export type VoceDiario = {
  id: string
  data: string
  pasto: Pasto
  alimento_id: string | null
  nome: string
  grammi: number
  kcal: number
  proteine: number
  carboidrati: number
  grassi: number
  fibre: number
  origine: 'catalogo' | 'foto'
  creato_il: string
}

export type Questionario = {
  obiettivo: 'benessere' | 'peso' | 'massa' | 'prestazione'
  dieta: 'onnivora' | 'vegetariana' | 'vegana'
  esclusioni: ('lattosio' | 'glutine' | 'frutta-secca' | 'pesce')[]
  colazione: 'sempre' | 'a-volte' | 'mai'
  frutta_verdura: '0-1' | '2-3' | '4-5' | '5+'
  acqua: 'meno-1' | '1-1.5' | '1.5-2' | 'piu-2'
  gravidanza: boolean
  condizione_medica: boolean
  rapporto_cibo: 'sereno' | 'disagio' | 'non-dico'
}

export type Profilo = { questionario: Questionario; nascondi_numeri: boolean }
export type StatoAlimentazione = {
  versione: string
  consenso: { versione: string; accettato_il: string } | null
  profilo: Profilo | null
  maggiorenne: boolean
}

/** Una proposta della foto del piatto: da confermare (e correggere) prima di finire nel diario. */
export type Proposta = {
  alimento_id: string | null
  nome: string
  grammi: number
  grammi_min: number
  grammi_max: number
  kcal100: number
  proteine100: number
  carboidrati100: number
  grassi100: number
  porzioni: Porzione[]
  dal_catalogo: boolean
}

/** Quello che si manda per aggiungere: dal catalogo basta l'id e i grammi, i numeri li calcola la funzione. */
export type DaAggiungere = { alimento_id: string | null; nome: string; grammi: number; kcal100?: number; proteine100?: number; carboidrati100?: number; grassi100?: number }

const chiama = (corpo: Record<string, unknown>) => funzione('portale-lab-alimentazione', corpo)

function errore(dati: Record<string, any>, ripiego: string) {
  return { ok: false as const, errore: (dati.errore as string) ?? ripiego, senzaConsenso: dati.consenso === false }
}

export async function statoAlimentazione(): Promise<Esito<StatoAlimentazione>> {
  const { ok, dati } = await chiama({ azione: 'stato' })
  if (ok) return { ok: true, versione: dati.versione, consenso: dati.consenso ?? null, profilo: dati.profilo ?? null, maggiorenne: !!dati.maggiorenne }
  return errore(dati, t('Non riusciamo a leggere la sezione adesso.', 'We can’t load this section right now.'))
}

export async function daiConsenso(versione: string): Promise<Esito<{ consenso: { versione: string; accettato_il: string } }>> {
  const { ok, dati } = await chiama({ azione: 'consenso', versione })
  if (ok) return { ok: true, consenso: dati.consenso }
  return errore(dati, t('Non siamo riusciti a registrare il consenso. Riprova.', 'We couldn’t record your consent. Try again.'))
}

export async function revocaConsenso(): Promise<Esito<object>> {
  const { ok, dati } = await chiama({ azione: 'revoca' })
  if (ok) return { ok: true }
  return errore(dati, t('Non siamo riusciti a revocare il consenso. Riprova.', 'We couldn’t withdraw your consent. Try again.'))
}

export async function salvaQuestionario(questionario: Questionario): Promise<Esito<{ profilo: Profilo }>> {
  const { ok, dati } = await chiama({ azione: 'questionario', questionario })
  if (ok) return { ok: true, profilo: dati.profilo }
  return errore(dati, t('Non siamo riusciti a salvare le risposte. Riprova.', 'We couldn’t save your answers. Try again.'))
}

export async function mostraNumeri(nascondi: boolean): Promise<Esito<{ profilo: Profilo }>> {
  const { ok, dati } = await chiama({ azione: 'numeri', nascondi })
  if (ok) return { ok: true, profilo: dati.profilo }
  return errore(dati, t('Non siamo riusciti a salvare la scelta. Riprova.', 'We couldn’t save your choice. Try again.'))
}

export async function catalogoAlimenti(): Promise<Esito<{ alimenti: Alimento[] }>> {
  const { ok, dati } = await chiama({ azione: 'catalogo' })
  if (ok) return { ok: true, alimenti: dati.alimenti ?? [] }
  return errore(dati, t('Non riusciamo a leggere l’elenco degli alimenti adesso.', 'We can’t load the food list right now.'))
}

export async function leggiDiario(dal: string, al: string): Promise<Esito<{ voci: VoceDiario[] }>> {
  const { ok, dati } = await chiama({ azione: 'diario', dal, al })
  if (ok) return { ok: true, voci: dati.voci ?? [] }
  return errore(dati, t('Non riusciamo a leggere il diario adesso.', 'We can’t load the diary right now.'))
}

export async function aggiungiAlDiario(data: string, pasto: Pasto, voci: DaAggiungere[], origine: 'catalogo' | 'foto'): Promise<Esito<{ voci: VoceDiario[] }>> {
  const { ok, dati } = await chiama({ azione: 'aggiungi', data, pasto, voci, origine })
  if (ok) return { ok: true, voci: dati.voci ?? [] }
  return errore(dati, t('Non siamo riusciti ad aggiungere. Riprova.', 'We couldn’t add it. Try again.'))
}

export async function togliDalDiario(id: string): Promise<Esito<object>> {
  const { ok, dati } = await chiama({ azione: 'elimina', id })
  if (ok) return { ok: true }
  return errore(dati, t('Non siamo riusciti a togliere la voce. Riprova.', 'We couldn’t remove the entry. Try again.'))
}

export async function analizzaFoto(immagine: string): Promise<Esito<{ piatto: string | null; proposte: Proposta[] }>> {
  const { ok, dati } = await chiama({ azione: 'foto', immagine })
  if (ok) return { ok: true, piatto: dati.piatto ?? null, proposte: dati.proposte ?? [] }
  return errore(dati, t('Non siamo riusciti a leggere la foto adesso.', 'We couldn’t read the photo right now.'))
}
