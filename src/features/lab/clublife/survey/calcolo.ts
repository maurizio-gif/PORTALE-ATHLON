import type { DomandaSurvey, FormaNota, SurveyClub } from '@/api/clubLife'

// Le regole delle survey che dal disegno non si leggono. **Modulo puro** (niente React ne' React Native): si prova con
// `npx tsx scripts/prova-survey.ts`.
//
// Le regole sono quelle del sito (`data/surveys.ts`, `lib/surveyForm.client.js`) e la soglia arriva dal feed, non e' scritta
// qui: due copie di un numero rispondono in due modi al primo ritocco. Quello che si ricopia e' solo il modo di combinare:
// la media a due decimali, il «positivo» in OR, e quale forma della nota mostrare.

export type Voto = { id: string; voto: number | null }

/** I voti nell'ordine delle domande, con `null` dove la persona non ha risposto: e' la forma che la funzione si aspetta. */
export function votiInOrdine(domande: DomandaSurvey[], dati: Record<string, number>): Voto[] {
  return domande.map((d) => {
    const v = dati[d.id]
    return { id: d.id, voto: Number.isInteger(v) && v >= 1 && v <= 5 ? v : null }
  })
}

/** La media delle stelle date, a due decimali; `null` se non ce n'e' nemmeno una. Come la calcola il sito. */
export function mediaVoti(voti: Voto[]): number | null {
  const dati = voti.filter((v): v is { id: string; voto: number } => v.voto !== null)
  if (!dati.length) return null
  return Math.round((dati.reduce((s, v) => s + v.voto, 0) / dati.length) * 100) / 100
}

/**
 * Il giudizio e' positivo? NPS alto **oppure** media alta, in OR: chiedere entrambi vorrebbe dire non chiedere la recensione a chi ha
 * dato 5, 5, 4 e un 9, un promotore vero, per un decimale. Quando non si sa (nessuna stella, nessun NPS) il confronto e' falso: si sbaglia
 * nel verso di non chiedere. E' `giudizioPositivo()` del sito, con la soglia presa dal feed.
 */
export function giudizioPositivo(media: number | null, nps: number | null, soglia: SurveyClub['soglia']): boolean {
  if (nps !== null && nps >= soglia.nps) return true
  if (media !== null && media >= soglia.media) return true
  return false
}

/**
 * La domanda aperta cambia con i voti: neutra finche' non c'e' un giudizio, «cosa potevamo fare meglio» sotto soglia, «cosa ti piacerebbe
 * trovare» sopra. A chi ha dato cinque stelle «cosa non va» e' una domanda a cui non ha risposta, e la lascia in bianco.
 */
export function formaNota(survey: SurveyClub, media: number | null, nps: number | null): FormaNota {
  if (media === null && nps === null) return survey.nota.neutra
  return giudizioPositivo(media, nps, survey.soglia) ? survey.nota.sopra : survey.nota.sotto
}

/**
 * L'user-agent con cui l'app si presenta dal telefono, o niente sul web (il browser ha il suo, e un'intestazione in piu' obbligherebbe il
 * server a dichiararla nel CORS). **Non e' un vezzo:** su Android React Native non ne manda uno e OkHttp mette `okhttp/x.y.z`, che
 * `sito-valutazioni` scarta come uno script; iOS manda `CFNetwork` e passa. `isbot` tratta come script le stringhe «prodotto/versione»
 * senza il commento della piattaforma e lascia passare quelle col formato di un client vero: provato il 03/11/2026 con isbot 5.2.2 — `AthlonClub-App/1.0 (android)`
 * e `(ios)` passano, `AthlonClub-App/1.0` e `AthlonClub/1.0 (android)` no. Se il server cambiera' filtro, l'app lo vede: `inviaSondaggio` ritorna un
 * errore invece di dire «inviata».
 */
export const VERSIONE_AGENTE = '1.0'

export function agenteApp(piattaforma: string): Record<string, string> {
  if (piattaforma !== 'android' && piattaforma !== 'ios') return {}
  return { 'User-Agent': `AthlonClub-App/${VERSIONE_AGENTE} (${piattaforma})` }
}

/** Il testo di un voto da 1 a 5 dalla scala del sito («Per niente»…«Moltissimo»), vuoto se manca. */
export function etichettaVoto(survey: SurveyClub, voto: number | undefined): string {
  return voto && voto >= 1 && voto <= survey.stelle.length ? survey.stelle[voto - 1] : ''
}
