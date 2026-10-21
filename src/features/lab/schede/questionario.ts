// Le risposte ammesse nel questionario «Componi il tuo piano» (`Agente.tsx`). Puro, senza React: si prova con
// `node --experimental-strip-types`. Il lato server (`_shared/schede/questionario.ts` di APP-ATHLON) ricontrolla le stesse
// risposte: se cambiano qui, cambiano anche là.
//
// **Salute non e' un obiettivo per l'agente** (20/10/2026, richiesta del club): recupero dopo un trauma, malattie metaboliche
// o cardiovascolari, problemi articolari e alterazioni posturali chiedono una persona. Scegliendola, l'app non manda nessuna
// richiesta: spiega che il piano lo costruisce un personal trainer e porta alla prenotazione (`/personal`).
//
// I valori (`OBIETTIVI`, `valore`) vanno al server e restano in italiano: si traducono solo le etichette (`nomeObiettivo`, `testo`).

import { t } from '@/lib/lingua'

export const OBIETTIVI = ['Tonificazione', 'Ipertrofia', 'Dimagrimento', 'Forza', 'Resistenza', 'Mobilità', 'Benessere generale'] as const
/** In vasca c'e' anche «Tecnica», che in sala non ha senso. */
export const OBIETTIVI_VASCA = [...OBIETTIVI, 'Tecnica'] as const

export const OBIETTIVO_SALUTE = 'Salute'

/** L'etichetta di un obiettivo (il valore resta quello che va alla funzione). */
const NOMI_OBIETTIVO: Record<string, string> = {
  Tonificazione: t('Tonificazione', 'Toning'),
  Ipertrofia: t('Ipertrofia', 'Muscle growth'),
  Dimagrimento: t('Dimagrimento', 'Weight loss'),
  Forza: t('Forza', 'Strength'),
  Resistenza: t('Resistenza', 'Endurance'),
  Mobilità: t('Mobilità', 'Mobility'),
  'Benessere generale': t('Benessere generale', 'General wellbeing'),
  Tecnica: t('Tecnica', 'Technique'),
  Salute: t('Salute', 'Health'),
}
export const nomeObiettivo = (o: string): string => NOMI_OBIETTIVO[o] ?? o

/**
 * Di cosa si tratta, sotto «Salute». Servono a dire al socio che e' nel posto giusto e a dare al personal trainer un punto di
 * partenza, non a scegliere un piano: **qualunque sia la risposta si va alla prenotazione**. `frase` e' come si legge dentro
 * «Per … il piano non si scrive da un questionario».
 */
export const CONDIZIONI_SALUTE = [
  { valore: 'post_traumatico', testo: t('Recupero post traumatico', 'Post-injury recovery'), dettaglio: null, frase: t('il recupero dopo un trauma', 'recovery after an injury') },
  { valore: 'metabolica', testo: t('Malattia metabolica', 'Metabolic condition'), dettaglio: null, frase: t('una malattia metabolica', 'a metabolic condition') },
  { valore: 'articolari', testo: t('Problemi articolari', 'Joint problems'), dettaglio: null, frase: t('i problemi articolari', 'joint problems') },
  { valore: 'cardiovascolare', testo: t('Malattia cardiovascolare', 'Cardiovascular condition'), dettaglio: null, frase: t('una malattia cardiovascolare', 'a cardiovascular condition') },
  { valore: 'posturali', testo: t('Alterazioni posturali', 'Postural problems'), dettaglio: t('Scoliosi, ipercifosi, ecc.', 'Scoliosis, kyphosis, etc.'), frase: t('le alterazioni posturali', 'postural problems') },
] as const
export type CondizioneSalute = (typeof CONDIZIONI_SALUTE)[number]['valore']

export const eSalute = (obiettivo: string | null): boolean => obiettivo === OBIETTIVO_SALUTE

/** Il testo del riquadro che porta al personal trainer: con la condizione scelta la nomina, altrimenti e' generico. */
export function testoSalute(condizione: CondizioneSalute | null): string {
  const c = CONDIZIONI_SALUTE.find((x) => x.valore === condizione)
  const per = c ? t(`Per ${c.frase} il piano`, `For ${c.frase}, a plan`) : t('Con un obiettivo legato alla salute il piano', 'With a health-related goal, a plan')
  return t(
    `${per} non si scrive da un questionario: lo costruisce un personal trainer, dopo averti conosciuto e visto muoverti. Scegli trainer, giorno e ora e prenota la tua seduta; il piano che prepara lo trovi poi fra i tuoi piani.`,
    `${per} can’t come from a questionnaire: a personal trainer builds it, after meeting you and seeing how you move. Choose a trainer, day and time and book your session; the plan they prepare will then be among your plans.`,
  )
}

/** Da dire sotto il riquadro: chi ha una diagnosi o un trattamento porta le indicazioni di chi lo segue. */
export const NOTA_SALUTE = t(
  'Se hai una diagnosi o un trattamento in corso, porta alla prima seduta le indicazioni del tuo medico o del fisioterapista.',
  'If you have a diagnosis or ongoing treatment, bring your doctor’s or physiotherapist’s advice to your first session.',
)

/** Quanto dura una seduta in sala (20/10/2026: 30, 45, 60 e 80 minuti; prima 30, 45, 60, 75 e 90). */
export const DURATE_SALA = [30, 45, 60, 80] as const

/**
 * Cosa usa in sala (20/10/2026): **una prevalenza, non un'esclusiva**. Il piano usa soprattutto quello che si sceglie; cardio,
 * stretching e mobilita' ci sono comunque, per il riscaldamento e il core. I valori sono quelli della funzione.
 */
export const ATTREZZATURE = [
  { valore: 'tutto', testo: t('Tutto', 'Everything') },
  { valore: 'macchine', testo: t('Prevalenza macchine isotoniche', 'Mostly weight machines') },
  { valore: 'pesi_liberi', testo: t('Prevalenza pesi liberi e corpo libero', 'Mostly free weights and bodyweight') },
] as const
export type Attrezzatura = (typeof ATTREZZATURE)[number]['valore']
