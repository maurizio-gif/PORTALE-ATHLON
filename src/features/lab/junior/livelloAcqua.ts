import type { PersonaJunior } from "@/api/junior";

// Il questionario di livello in acqua, la parte che non disegna (10/11/2026): le tre domande, quando si fanno e **chi e' fermato prima dei turni**.
// Pura (niente React): si prova con `npx tsx scripts/prova-livello-acqua.ts`.
//
// Le domande sono quelle del modulo del sito (`DOMANDE_LIVELLO` in `data/contatto.ts` di SITO-ATHLON) e di «Aggiungi un componente».

export type Risposta = "si" | "no" | null;
export type RisposteLivello = { ha_frequentato: Risposta; sa_nuotare: Risposta; stile_libero: Risposta };

export const LIVELLO_VUOTO: RisposteLivello = {
  ha_frequentato: null,
  sa_nuotare: null,
  stile_libero: null,
};

export const DOMANDE_LIVELLO = [
  { id: "ha_frequentato", it: "Ha mai frequentato un corso di nuoto?", en: "Has your child ever taken a swimming course?" },
  { id: "sa_nuotare", it: "Sa nuotare senza ausili (braccioli, ciambella)?", en: "Can your child swim without aids (armbands, rubber ring)?" },
  { id: "stile_libero", it: "Sa eseguire correttamente lo stile libero completo?", en: "Can your child swim full front crawl correctly?" },
] as const;

/** Il giorno di oggi a Roma, `AAAA-MM-GG`. */
export function oggi(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
}

/** Le domande sul nuoto si fanno da tre anni di calendario in su (fuori dalle annate del Baby Nuoto, dove si entra in acqua col genitore). */
export function chiedeLivello(nascita: string, giorno: string = oggi()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nascita)) return false;
  return Number(nascita.slice(0, 4)) <= Number(giorno.slice(0, 4)) - 3;
}

const ORDINE = ["ha_frequentato", "sa_nuotare", "stile_libero"] as const;

/**
 * Una risposta al questionario, **con la cascata** (10/11/2026, richiesta di Maurizio): le tre domande sono consequenziali, e dalle risposte il club attribuisce un livello
 * provvisorio (si · no · no: A1, si · si · no: A3, si · si · si: B2). Chi non ha mai fatto un corso non sa nuotare senza ausili ne' fare lo stile libero; chi non sa nuotare senza
 * ausili non sa fare lo stile libero. Quindi:
 *  - **«no» a una domanda: «no» anche a quelle dopo**, senza chiederle;
 *  - **«si» a una domanda che era «no»: quelle dopo tornano da rispondere**, perche' i loro «no» erano una conseguenza e non una risposta: chi cambia idea non si ritrova «no» che non ha dato.
 * Il database applica la stessa regola a ogni risposta che arriva (migrazione 20261110a di APP-ATHLON): questa e' quella che si vede mentre si compila.
 */
export function applicaRisposta(r: RisposteLivello, id: keyof RisposteLivello, v: Exclude<Risposta, null>): RisposteLivello {
  // Una domanda a cui la cascata ha gia' risposto «no» non si cambia: l'interfaccia la spegne, e anche chi la chiamasse lo stesso non ottiene una risposta incoerente.
  if (domandaChiusa(r, id)) return r;
  const prossima: RisposteLivello = { ...r, [id]: v };
  const dopo = ORDINE.slice(ORDINE.indexOf(id) + 1);
  if (v === "no") for (const k of dopo) prossima[k] = "no";
  else if (r[id] === "no") for (const k of dopo) prossima[k] = null;
  return prossima;
}

/** Questa domanda e' gia' risposta dalla cascata («no» a quella prima): non si tocca. */
export function domandaChiusa(r: RisposteLivello, id: keyof RisposteLivello): boolean {
  const i = ORDINE.indexOf(id);
  return i > 0 && r[ORDINE[i - 1]] === "no";
}

/** Le tre risposte ci sono tutte. */
export function livelloCompleto(r: RisposteLivello): boolean {
  return Object.values(r).every((v) => v !== null);
}

/**
 * Questa persona **deve ancora compilare il questionario** (10/11/2026, richiesta di Maurizio): prima di vedere i turni, un bambino
 * gia' registrato che non l'ha mai fatto lo compila. Serve tutto insieme:
 *  - la funzione ha detto che non c'e' (`livello_acqua === null`): **se il campo manca** (`undefined`: una funzione di prima, o una
 *    lettura che non e' riuscita) non si ferma nessuno, perche' non si sa e un guasto non deve chiudere i turni a una famiglia;
 *  - e' un minorenne del nucleo, **non il titolare**: il questionario lo fa un genitore per il figlio, e un ragazzo che entra con
 *    l'indirizzo suo (il titolare della sua sessione) non lo fa, e la funzione non glielo lascerebbe salvare;
 *  - e' in eta' per i corsi e dai tre anni di calendario in su, la stessa regola di «Aggiungi un componente» e del sito.
 * **Non guarda se e' iscritto**: lo decide chi la chiama. La sezione la usa dove si sceglie un turno nuovo (chi e' gia' iscritto ha
 * il suo menu e non vede quei turni).
 */
export function livelloMancante(p: PersonaJunior, giorno: string = oggi()): boolean {
  return (
    p.livello_acqua === null &&
    p.minorenne &&
    !p.titolare &&
    p.idoneo &&
    chiedeLivello(p.data_nascita ?? "", giorno)
  );
}
