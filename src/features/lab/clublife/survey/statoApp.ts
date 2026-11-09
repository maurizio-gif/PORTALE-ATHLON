import { useSyncExternalStore } from 'react'

import { BOZZA_VUOTA, FINALE_VUOTO, type BozzaCapitolo, type BozzaFinale } from './calcolo-app'

// Quello che la persona ha messo insieme nella survey dell'app, **in memoria e basta** (mai sul disco: sono giudizi di una persona).
// Le schermate sono piu' d'una — il menu dei capitoli, un capitolo, il giudizio finale — e tornando indietro con il tasto del
// telefono non si deve perdere niente: per questo le bozze stanno qui e non in uno `useState`.
//
// Resta finche' l'app e' viva, ed e' buttato in due casi: quando la persona esce dal laboratorio (`esciDalLaboratorio`, memoria.ts: un
// dispositivo condiviso non lo deve passare a chi entra dopo) e quando manda il giudizio finale (la survey e' finita, la prossima
// volta si riparte puliti). Il server conserva comunque ogni capitolo inviato.

export type StatoSurveyApp = {
  bozze: Record<string, BozzaCapitolo>
  /** I capitoli la cui riga e' arrivata al server in questa visita. */
  inviati: Record<string, true>
  /** I capitoli in cui la persona ha detto «non uso niente»: non parte nessuna riga, se ne parla nel giudizio finale. */
  nonUsa: Record<string, true>
  finale: BozzaFinale
}

export const STATO_APP_VUOTO: StatoSurveyApp = { bozze: {}, inviati: {}, nonUsa: {}, finale: FINALE_VUOTO }

let stato: StatoSurveyApp = STATO_APP_VUOTO
const ascoltatori = new Set<() => void>()

function cambia(f: (s: StatoSurveyApp) => StatoSurveyApp) {
  stato = f(stato)
  ascoltatori.forEach((a) => a())
}

export function leggiSurveyApp(): StatoSurveyApp {
  return stato
}

export function useSurveyApp(): StatoSurveyApp {
  return useSyncExternalStore(
    (a) => {
      ascoltatori.add(a)
      return () => ascoltatori.delete(a)
    },
    () => stato,
    () => STATO_APP_VUOTO,
  )
}

/** La bozza di un capitolo, o quella vuota. */
export function bozzaDi(s: StatoSurveyApp, id: string): BozzaCapitolo {
  return s.bozze[id] ?? BOZZA_VUOTA
}

export function aggiornaBozza(id: string, f: (b: BozzaCapitolo) => BozzaCapitolo) {
  cambia((s) => ({ ...s, bozze: { ...s.bozze, [id]: f(bozzaDi(s, id)) } }))
}

export function segnaInviato(id: string) {
  cambia((s) => ({ ...s, inviati: { ...s.inviati, [id]: true }, nonUsa: omettiChiave(s.nonUsa, id) }))
}

/** `true`: la persona dice di non usare niente del capitolo; `false`: ci ripensa. */
export function segnaNonUsa(id: string, non: boolean) {
  cambia((s) => ({ ...s, nonUsa: non ? { ...s.nonUsa, [id]: true } : omettiChiave(s.nonUsa, id) }))
}

export function aggiornaFinale(f: (b: BozzaFinale) => BozzaFinale) {
  cambia((s) => ({ ...s, finale: f(s.finale) }))
}

export function azzeraSurveyApp() {
  cambia(() => STATO_APP_VUOTO)
}

function omettiChiave(o: Record<string, true>, chiave: string): Record<string, true> {
  if (!(chiave in o)) return o
  const { [chiave]: _fuori, ...resto } = o
  return resto
}
