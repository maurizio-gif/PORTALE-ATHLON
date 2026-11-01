import { t } from '@/lib/lingua'

// Il respiro guidato (01/11/2026, richiesta di Maurizio: «meditazione o mindfulness o qualcosa del genere» in Recover): una pausa di 1–5 minuti in cui si segue
// un cerchio che si allarga mentre si inspira e si restringe mentre si espira. **Solo animazione, niente audio** (una voce registrata dal club si potrebbe aggiungere
// dopo); **non si registra niente** (nessun server, nessun punteggio); **non e' una terapia** e non promette niente su ansia o stress: e' una pausa per rallentare.
// Questa parte e' **pura**: le tecniche, in che punto del respiro si e' dopo tot secondi, e quale frase della scansione del corpo. Si prova con `npx tsx scripts/prova-respiro.ts`.

export type IdTecnica = 'lenta' | 'scatola' | 'scansione'
/** `inspira` e `espira` muovono il cerchio; `pienoFermo` (fiato dentro) e `vuotoFermo` (fiato fuori) lo tengono fermo, grande o piccolo. */
export type TipoFase = 'inspira' | 'pienoFermo' | 'espira' | 'vuotoFermo'
export type Fase = { tipo: TipoFase; secondi: number }

export type Tecnica = {
  id: IdTecnica
  nome: string
  descrizione: string
  fasi: Fase[]
  /** I minuti che si possono scegliere. */
  durate: number[]
  /** Si trattiene il fiato: non per tutti (gravidanza, problemi respiratori o di cuore), e l'app lo dice. */
  trattieneIlFiato: boolean
}

export const tecniche = (): Tecnica[] => [
  {
    id: 'lenta',
    nome: t('Respirazione lenta', 'Slow breathing'),
    descrizione: t('4 secondi per inspirare, 6 per espirare: un ritmo più lento del solito, senza trattenere il fiato.', '4 seconds to breathe in, 6 to breathe out: a slower rhythm than usual, without holding your breath.'),
    fasi: [
      { tipo: 'inspira', secondi: 4 },
      { tipo: 'espira', secondi: 6 },
    ],
    durate: [1, 3, 5],
    trattieneIlFiato: false,
  },
  {
    id: 'scatola',
    nome: t('Respirazione a scatola', 'Box breathing'),
    descrizione: t('Quattro tempi uguali: inspira, trattieni, espira, trattieni. Ha le pause a fiato fermo.', 'Four equal beats: breathe in, hold, breathe out, hold. It has pauses with held breath.'),
    fasi: [
      { tipo: 'inspira', secondi: 4 },
      { tipo: 'pienoFermo', secondi: 4 },
      { tipo: 'espira', secondi: 4 },
      { tipo: 'vuotoFermo', secondi: 4 },
    ],
    durate: [1, 3, 5],
    trattieneIlFiato: true,
  },
  {
    id: 'scansione',
    nome: t('Scansione del corpo', 'Body scan'),
    descrizione: t('Porti l’attenzione a una parte del corpo alla volta, dai piedi al viso, con un respiro lento.', 'You bring your attention to one part of the body at a time, from your feet to your face, with slow breathing.'),
    // Il cerchio respira piano (4 e 6) mentre le frasi si danno il cambio.
    fasi: [
      { tipo: 'inspira', secondi: 4 },
      { tipo: 'espira', secondi: 6 },
    ],
    durate: [3, 5],
    trattieneIlFiato: false,
  },
]

export const tecnicaPer = (id: IdTecnica): Tecnica => tecniche().find((x) => x.id === id) ?? tecniche()[0]

/** Le frasi della scansione del corpo, nell'ordine; il tempo si divide in parti uguali. Descrivono dove portare l'attenzione, non promettono niente. */
export const passiScansione = (): string[] => [
  t('Mettiti comodo, seduto o sdraiato. Chiudi gli occhi, o abbassa lo sguardo.', 'Get comfortable, sitting or lying down. Close your eyes, or lower your gaze.'),
  t('Senti il peso del corpo, appoggiato.', 'Feel the weight of your body, resting.'),
  t('Porta l’attenzione ai piedi. Senti e basta, senza cambiare niente.', 'Bring your attention to your feet. Just feel, without changing anything.'),
  t('Sali alle gambe: i polpacci, le cosce.', 'Move up to your legs: calves, thighs.'),
  t('Il bacino e la schiena, appoggiati.', 'Your hips and back, resting.'),
  t('Le mani, le braccia, le spalle. Lascia andare quello che puoi.', 'Your hands, arms, shoulders. Let go of what you can.'),
  t('Il collo, il viso, la mandibola. Sciogli.', 'Your neck, face, jaw. Soften.'),
  t('Senti il respiro e tutto il corpo insieme. Quando vuoi, riapri gli occhi.', 'Feel your breath and your whole body together. When you’re ready, open your eyes.'),
]

export const cicloSecondi = (fasi: readonly Fase[]): number => fasi.reduce((s, f) => s + f.secondi, 0)

export type StatoRespiro = {
  fase: TipoFase
  indice: number
  /** Quanto e' «pieno» il respiro, da 0 (vuoto) a 1 (pieno): il cerchio la segue. Dolce agli estremi (seno), cosi' non scatta. */
  pienezza: number
  /** Secondi che mancano alla fine della fase, interi per eccesso (si legge «3, 2, 1»). */
  restano: number
}

const dolce = (p: number) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, p)))) / 2

/** In che punto del respiro si e' dopo `trascorsoMs` di sessione; il ciclo si ripete. */
export function statoRespiro(fasi: readonly Fase[], trascorsoMs: number): StatoRespiro {
  const ciclo = cicloSecondi(fasi) * 1000
  const dentro = ((trascorsoMs % ciclo) + ciclo) % ciclo
  let da = 0
  for (let i = 0; i < fasi.length; i++) {
    const durata = fasi[i].secondi * 1000
    if (dentro < da + durata) {
      const p = (dentro - da) / durata
      const tipo = fasi[i].tipo
      const pienezza = tipo === 'inspira' ? dolce(p) : tipo === 'espira' ? 1 - dolce(p) : tipo === 'pienoFermo' ? 1 : 0
      return { fase: tipo, indice: i, pienezza, restano: Math.max(1, Math.ceil((da + durata - dentro) / 1000)) }
    }
    da += durata
  }
  const ultima = fasi[fasi.length - 1]
  return { fase: ultima.tipo, indice: fasi.length - 1, pienezza: 0, restano: 1 }
}

/** Quale frase della scansione e' in corso: il tempo totale diviso in parti uguali fra le frasi. */
export function passoScansione(passi: readonly string[], trascorsoMs: number, totaleMs: number): { indice: number; testo: string } {
  const parte = totaleMs / passi.length
  const indice = Math.min(passi.length - 1, Math.max(0, Math.floor(trascorsoMs / parte)))
  return { indice, testo: passi[indice] }
}

/** Il testo della fase che si legge sul cerchio. */
export const parolaFase = (f: TipoFase): string => (f === 'inspira' ? t('Inspira', 'Breathe in') : f === 'espira' ? t('Espira', 'Breathe out') : t('Fermo', 'Hold'))
