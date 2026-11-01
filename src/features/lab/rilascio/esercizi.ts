import { t } from '@/lib/lingua'

import type { ZonaFastidio } from '../fit/mobilita'

// Il rilascio con il foam roller (01/11/2026, richiesta di Maurizio: «rilascio miofasciale, trigger point: al club ho il foam roller»): una sessione
// a richiesta in Recover, accanto a quella di mobilita'. **Gli esercizi stanno qui, nell'app** (non nella libreria del server: MoveKit non ha esercizi di
// rilascio, solo un'estensione toracica sul rullo), e la sessione si compone qui (`componiSessione`, pura: si prova con `npx tsx scripts/prova-rilascio.ts`).
//
// **I video non ci sono ancora**: ogni esercizio ha `video: null` e la schermata mostra un segnaposto «Video in arrivo». Quando il tecnico li gira, si
// caricano nel bucket pubblico `esercizi` (dal CRM o dalla console) e qui si scrive il percorso, per esempio `rilascio/polpacci.mp4`: `MediaEsercizio`
// lo risolve da solo (`urlEsercizio`) e il segnaposto sparisce, esercizio per esercizio. Stessa cosa per `immagini` (il poster, 16:9).
//
// **Cosa dice e cosa no.** Il foam roller puo' dare la sensazione di muscoli piu' sciolti e un movimento migliore subito dopo; **non cura contratture, dolori
// o «aderenze»**, e non si parla di «trigger point» come di una terapia (le prove sono deboli e il meccanismo e' discusso). Come per Food, sono consigli di
// base che non sostituiscono il parere di un medico o di un fisioterapista. **Niente cifre mediche da rispettare**: tempi e pressione sono indicazioni di
// buon senso. Le zone a rischio (zona lombare, collo, articolazioni) sono escluse: nessun esercizio le carica.

export type FocusRilascio = 'tutto' | 'gambe' | 'schiena_spalle'
export const MINUTI_RILASCIO = [5, 10, 15] as const

export const vociFocusRilascio = (): { valore: FocusRilascio; testo: string }[] => [
  { valore: 'tutto', testo: t('Tutto il corpo', 'Whole body') },
  { valore: 'gambe', testo: t('Gambe e glutei', 'Legs and glutes') },
  { valore: 'schiena_spalle', testo: t('Schiena e spalle', 'Back and shoulders') },
]

export const nomeFocusRilascio = (f: string): string => vociFocusRilascio().find((x) => x.valore === f)?.testo ?? f

export type EsercizioRilascio = {
  id: string
  nome: string
  zona: Exclude<FocusRilascio, 'tutto'>
  /** Una frase: cosa si lavora. */
  descrizione: string
  istruzioni: string[]
  /** Si fa su un lato e poi sull'altro: il tempo si divide a meta'. */
  perLato: boolean
  /** Una cautela particolare di questo esercizio. */
  attenzione: string | null
  /** I fastidi che questo esercizio carica: se la persona ne indica uno, l'esercizio salta (come `NON_CON_ZONA` per le schede di sala). */
  evita: ZonaFastidio[]
  /** Il percorso del video nel bucket `esercizi` (es. `rilascio/polpacci.mp4`), o null finche' non c'e'. */
  video: string | null
  /** Il poster, 16:9, o niente. */
  immagini: string[]
}

// L'ordine e' quello della sessione: dal basso verso l'alto, le gambe, i glutei, poi la schiena e le spalle.
export const ESERCIZI: EsercizioRilascio[] = [
  {
    id: 'polpacci',
    nome: t('Polpacci', 'Calves'),
    zona: 'gambe',
    descrizione: t('Rilascio dei polpacci, dalla caviglia fin sotto il ginocchio.', 'Release for the calves, from the ankle to just below the knee.'),
    istruzioni: [
      t('Siediti a terra con le gambe tese e il rullo sotto i polpacci, le mani a terra dietro di te.', 'Sit on the floor with your legs straight and the roller under your calves, hands on the floor behind you.'),
      t('Solleva i fianchi e rotola piano dalla caviglia fin sotto il ginocchio, mai sopra l’articolazione.', 'Lift your hips and roll slowly from the ankle to just below the knee, never over the joint.'),
      t('Per aumentare la pressione accavalla una gamba sull’altra; per diminuirla, tieni i fianchi appoggiati.', 'To add pressure cross one leg over the other; to ease off, keep your hips on the floor.'),
      t('Se trovi un punto sensibile fermati lì qualche secondo e respira.', 'If you find a tender spot, stay there for a few seconds and breathe.'),
    ],
    perLato: true,
    attenzione: null,
    evita: ['polsi_gomiti', 'caviglie'],
    video: null,
    immagini: [],
  },
  {
    id: 'dietro-coscia',
    nome: t('Dietro la coscia', 'Back of the thigh'),
    zona: 'gambe',
    descrizione: t('Rilascio dei muscoli posteriori della coscia, dal gluteo fin sopra il ginocchio.', 'Release for the hamstrings, from the glute to just above the knee.'),
    istruzioni: [
      t('Siediti con il rullo sotto le cosce, appena sotto i glutei, le mani a terra dietro di te.', 'Sit with the roller under your thighs, just below your glutes, hands on the floor behind you.'),
      t('Solleva i fianchi e rotola piano verso il ginocchio, fermandoti sopra l’articolazione.', 'Lift your hips and roll slowly toward the knee, stopping above the joint.'),
      t('Per lavorare un lato alla volta, accavalla le gambe e scarica più peso su quella sotto.', 'To work one side at a time, cross your legs and put more weight on the bottom one.'),
    ],
    perLato: true,
    attenzione: null,
    evita: ['polsi_gomiti', 'lombare'],
    video: null,
    immagini: [],
  },
  {
    id: 'davanti-coscia',
    nome: t('Davanti della coscia', 'Front of the thigh'),
    zona: 'gambe',
    descrizione: t('Rilascio del quadricipite, dall’anca fin sopra il ginocchio.', 'Release for the quadriceps, from the hip to just above the knee.'),
    istruzioni: [
      t('A pancia in giù, sugli avambracci come in un plank, con il rullo sotto le cosce.', 'Face down on your forearms as in a plank, with the roller under your thighs.'),
      t('Rotola piano avanti e indietro, dall’anca fin sopra il ginocchio, senza inarcare la schiena.', 'Roll slowly back and forth, from the hip to just above the knee, without arching your back.'),
      t('Per lavorare un lato solo, appoggia l’altra gamba a terra e scarica il peso su quella sul rullo.', 'To work one side only, rest the other leg on the floor and put your weight on the one on the roller.'),
    ],
    perLato: true,
    attenzione: t('Se la schiena si inarca o la zona lombare protesta, salta questo esercizio.', 'If your back arches or your lower back complains, skip this exercise.'),
    evita: ['spalle', 'polsi_gomiti', 'lombare'],
    video: null,
    immagini: [],
  },
  {
    id: 'interno-coscia',
    nome: t('Interno coscia', 'Inner thigh'),
    zona: 'gambe',
    descrizione: t('Rilascio degli adduttori, la parte interna della coscia.', 'Release for the adductors, the inner side of the thigh.'),
    istruzioni: [
      t('A pancia in giù sugli avambracci, con una gamba piegata di lato e il rullo sotto l’interno della coscia.', 'Face down on your forearms, one leg bent out to the side and the roller under your inner thigh.'),
      t('Rotola piano dall’inguine verso il ginocchio, evitando l’articolazione.', 'Roll slowly from the groin toward the knee, avoiding the joint.'),
      t('Cambia lato a metà del tempo.', 'Switch sides halfway through.'),
    ],
    perLato: true,
    attenzione: t('È una zona delicata: pressione leggera, e se senti dolore acuto fermati.', 'This is a delicate area: light pressure, and stop if you feel sharp pain.'),
    evita: ['anche', 'ginocchia', 'spalle'],
    video: null,
    immagini: [],
  },
  {
    id: 'glutei',
    nome: t('Glutei', 'Glutes'),
    zona: 'gambe',
    descrizione: t('Rilascio dei glutei e della parte profonda dell’anca.', 'Release for the glutes and the deep part of the hip.'),
    istruzioni: [
      t('Siediti sul rullo, mani a terra dietro di te, e porta la caviglia di una gamba sopra il ginocchio dell’altra.', 'Sit on the roller, hands on the floor behind you, and cross one ankle over the opposite knee.'),
      t('Inclinati verso il lato della gamba accavallata e rotola piano con piccoli movimenti.', 'Lean toward the side of the crossed leg and roll slowly in small movements.'),
      t('Cambia lato a metà del tempo.', 'Switch sides halfway through.'),
    ],
    perLato: true,
    attenzione: null,
    evita: ['anche', 'lombare', 'polsi_gomiti', 'ginocchia'],
    video: null,
    immagini: [],
  },
  {
    id: 'dorsale-alta',
    nome: t('Dorsale alta', 'Upper back'),
    zona: 'schiena_spalle',
    descrizione: t('Rilascio della parte alta della schiena, fra le scapole.', 'Release for the upper back, between the shoulder blades.'),
    istruzioni: [
      t('Sdraiati sulla schiena con il rullo sotto la parte alta, sotto le scapole; mani incrociate sul petto o dietro la testa a sostenere il collo.', 'Lie on your back with the roller under your upper back, below the shoulder blades; hands crossed on your chest or behind your head to support your neck.'),
      t('Solleva i fianchi e rotola piano dalla metà della schiena fino alle spalle, in piccoli tratti.', 'Lift your hips and roll slowly from mid-back up to the shoulders, in small stretches.'),
      t('Respira a fondo: a ogni espirazione lascia andare il peso sul rullo.', 'Breathe deeply: with every exhale let your weight sink onto the roller.'),
    ],
    perLato: false,
    attenzione: t('Mai sulla zona lombare e mai sul collo: il rullo non va sotto la fine delle costole né sopra le spalle.', 'Never on the lower back or the neck: the roller stays above the bottom of your ribs and below your shoulders.'),
    evita: ['cervicale', 'lombare', 'spalle'],
    video: null,
    immagini: [],
  },
  {
    id: 'grande-dorsale',
    nome: t('Fianco e dorsale', 'Side of the back'),
    zona: 'schiena_spalle',
    descrizione: t('Rilascio del grande dorsale, il muscolo laterale della schiena, sotto l’ascella.', 'Release for the lat, the muscle on the side of the back, below the armpit.'),
    istruzioni: [
      t('Sdraiati su un fianco con il rullo sotto l’ascella e il braccio disteso sopra la testa.', 'Lie on your side with the roller under your armpit and your arm stretched overhead.'),
      t('Con i piedi a terra a controllare il peso, rotola piano su e giù in piccoli tratti, fino a metà delle costole.', 'With your feet on the floor to control the weight, roll slowly up and down in small stretches, down to mid-ribs.'),
      t('Cambia lato a metà del tempo.', 'Switch sides halfway through.'),
    ],
    perLato: true,
    attenzione: null,
    evita: ['spalle', 'polsi_gomiti'],
    video: null,
    immagini: [],
  },
  {
    id: 'apertura-petto',
    nome: t('Apertura del petto', 'Chest opener'),
    zona: 'schiena_spalle',
    descrizione: t('Una posizione per aprire il petto e le spalle, sdraiati sul rullo.', 'A position to open your chest and shoulders, lying on the roller.'),
    istruzioni: [
      t('Siediti all’estremità del rullo, tenuto nel senso della lunghezza, e sdraiati con la schiena e la testa appoggiate sopra.', 'Sit at one end of the roller, placed lengthwise, and lie back with your back and head resting on it.'),
      t('Piedi a terra, ginocchia piegate; apri le braccia ai lati con i palmi verso l’alto.', 'Feet on the floor, knees bent; open your arms to the sides with palms facing up.'),
      t('Resta fermo e respira piano: non si rotola, si lascia andare il peso.', 'Stay still and breathe slowly: no rolling, just let your weight go.'),
    ],
    perLato: false,
    attenzione: t('Se il rullo ti fa perdere l’equilibrio o senti formicolio alle braccia, esci dalla posizione.', 'If the roller makes you lose your balance or your arms tingle, come out of the position.'),
    evita: ['spalle', 'cervicale'],
    video: null,
    immagini: [],
  },
]

// ---------------------------------------------------------------------------------------------------------------------------------
// La sessione

/** Un passo della sessione: la forma della `Corsa` di mobilita' (`PassoMobilita`), con qualcosa in piu'. */
export type PassoRilascio = {
  id: string
  nome: string
  tipo: 'rilascio'
  secondi: number
  descrizione: string
  istruzioni: string[]
  immagini: string[]
  video: string | null
  perLato: boolean
  attenzione: string | null
}

export type SessioneRilascio = { focus: FocusRilascio; /** I minuti veri: possono essere meno di quelli chiesti se gli esercizi adatti sono pochi. */ minuti: number; esercizi: PassoRilascio[] }

export const SECONDI_MIN = 50
export const SECONDI_MAX = 90

/**
 * Compone la sessione: gli esercizi della zona scelta senza quelli che caricano un fastidio indicato, **uno al minuto** (al massimo uno per minuto
 * chiesto); se sono pochi il tempo di ciascuno si allunga, fino a 90 secondi (sempre a multipli di 10), e i minuti veri possono scostarsi da quelli chiesti. `variante` (da 0) fa girare quali
 * esercizi entrano quando non ci stanno tutti, cosi' «un'altra sessione» non e' la stessa. L'ordine resta sempre dal basso verso l'alto.
 */
export function componiSessione(r: { focus: FocusRilascio; minuti: number; zone?: ZonaFastidio[]; variante?: number }): SessioneRilascio {
  const zone = r.zone ?? []
  const pool = ESERCIZI.filter((e) => (r.focus === 'tutto' || e.zona === r.focus) && !e.evita.some((z) => zone.includes(z)))
  const n = Math.min(pool.length, Math.max(1, Math.floor(r.minuti)))
  if (!pool.length) return { focus: r.focus, minuti: 0, esercizi: [] }
  const via = pool.length > n ? Math.abs(Math.floor(r.variante ?? 0)) % pool.length : 0
  const scelti = new Set(Array.from({ length: n }, (_, i) => pool[(via + i) % pool.length].id))
  // A multipli di 10 secondi: cosi' il mezzo tempo (cambio di lato) e' sempre un numero tondo, mai «37,5 secondi per lato».
  const secondi = Math.max(SECONDI_MIN, Math.min(SECONDI_MAX, Math.round((r.minuti * 6) / n) * 10))
  const esercizi = pool
    .filter((e) => scelti.has(e.id))
    .map<PassoRilascio>((e) => ({ id: e.id, nome: e.nome, tipo: 'rilascio', secondi, descrizione: e.descrizione, istruzioni: e.istruzioni, immagini: e.immagini, video: e.video, perLato: e.perLato, attenzione: e.attenzione }))
  return { focus: r.focus, minuti: Math.round((esercizi.length * secondi) / 60), esercizi }
}
