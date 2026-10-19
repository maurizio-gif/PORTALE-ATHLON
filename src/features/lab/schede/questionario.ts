// Le risposte ammesse nel questionario «Componi il tuo piano» (`Agente.tsx`). Puro, senza React: si prova con
// `node --experimental-strip-types`. Il lato server (`_shared/schede/questionario.ts` di APP-ATHLON) ricontrolla le stesse
// risposte: se cambiano qui, cambiano anche là.
//
// **Salute non e' un obiettivo per l'agente** (20/10/2026, richiesta del club): recupero dopo un trauma, malattie metaboliche
// o cardiovascolari, problemi articolari e alterazioni posturali chiedono una persona. Scegliendola, l'app non manda nessuna
// richiesta: spiega che il piano lo costruisce un personal trainer e porta alla prenotazione (`/personal`).

export const OBIETTIVI = ['Tonificazione', 'Ipertrofia', 'Dimagrimento', 'Forza', 'Resistenza', 'Mobilità', 'Benessere generale'] as const
/** In vasca c'e' anche «Tecnica», che in sala non ha senso. */
export const OBIETTIVI_VASCA = [...OBIETTIVI, 'Tecnica'] as const

export const OBIETTIVO_SALUTE = 'Salute'

/**
 * Di cosa si tratta, sotto «Salute». Servono a dire al socio che e' nel posto giusto e a dare al personal trainer un punto di
 * partenza, non a scegliere un piano: **qualunque sia la risposta si va alla prenotazione**. `frase` e' come si legge dentro
 * «Per … il piano non si scrive da un questionario».
 */
export const CONDIZIONI_SALUTE = [
  { valore: 'post_traumatico', testo: 'Recupero post traumatico', dettaglio: null, frase: 'il recupero dopo un trauma' },
  { valore: 'metabolica', testo: 'Malattia metabolica', dettaglio: null, frase: 'una malattia metabolica' },
  { valore: 'articolari', testo: 'Problemi articolari', dettaglio: null, frase: 'i problemi articolari' },
  { valore: 'cardiovascolare', testo: 'Malattia cardiovascolare', dettaglio: null, frase: 'una malattia cardiovascolare' },
  { valore: 'posturali', testo: 'Alterazioni posturali', dettaglio: 'Scoliosi, ipercifosi, ecc.', frase: 'le alterazioni posturali' },
] as const
export type CondizioneSalute = (typeof CONDIZIONI_SALUTE)[number]['valore']

export const eSalute = (obiettivo: string | null): boolean => obiettivo === OBIETTIVO_SALUTE

/** Il testo del riquadro che porta al personal trainer: con la condizione scelta la nomina, altrimenti e' generico. */
export function testoSalute(condizione: CondizioneSalute | null): string {
  const c = CONDIZIONI_SALUTE.find((x) => x.valore === condizione)
  const per = c ? `Per ${c.frase} il piano` : 'Con un obiettivo legato alla salute il piano'
  return `${per} non si scrive da un questionario: lo costruisce un personal trainer, dopo averti conosciuto e visto muoverti. Scegli trainer, giorno e ora e prenota la tua seduta; il piano che prepara lo trovi poi fra i tuoi piani.`
}

/** Da dire sotto il riquadro: chi ha una diagnosi o un trattamento porta le indicazioni di chi lo segue. */
export const NOTA_SALUTE = 'Se hai una diagnosi o un trattamento in corso, porta alla prima seduta le indicazioni del tuo medico o del fisioterapista.'

/** Quanto dura una seduta in sala (20/10/2026: 30, 45, 60 e 80 minuti; prima 30, 45, 60, 75 e 90). */
export const DURATE_SALA = [30, 45, 60, 80] as const

/**
 * Cosa usa in sala (20/10/2026): **una prevalenza, non un'esclusiva**. Il piano usa soprattutto quello che si sceglie; cardio,
 * stretching e mobilita' ci sono comunque, per il riscaldamento e il core. I valori sono quelli della funzione.
 */
export const ATTREZZATURE = [
  { valore: 'tutto', testo: 'Tutto' },
  { valore: 'macchine', testo: 'Prevalenza macchine isotoniche' },
  { valore: 'pesi_liberi', testo: 'Prevalenza pesi liberi e corpo libero' },
] as const
export type Attrezzatura = (typeof ATTREZZATURE)[number]['valore']
