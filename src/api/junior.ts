import { funzione } from "@/api/lab";

// La sezione Junior (21/10/2026, richiesta di Maurizio): i gruppi dei corsi per bambini e ragazzi che sono attivi, con
// gli anni di nascita e i posti che restano, dalla funzione `portale-lab-junior` (APP-ATHLON), che legge il mirror con
// `public.gruppi_junior()`. Gli anni li legge il database dal nome del gruppo («(2018-17-16)», «(2008 - 2015)»).

export type GruppoJunior = {
  id: string;
  nome: string;
  /** Il nome senza le annate: «Scuola Nuoto Monosettimanale Lun 15.20», «Pallanuoto Under 14». */
  corso: string;
  /** La categoria di PerfectGym: «Scuola Nuoto Bambini - Monosettimanale», «Pallanuoto»… */
  categoria: string | null;
  anni: number[];
  /** «Lunedì, Giovedì»: solo per i turni che hanno giorno e ora nel nome (la Scuola Nuoto). */
  giorni: string | null;
  orario: string | null;
  data_inizio: string | null;
  data_fine: string | null;
  posti: number | null;
  iscritti: number;
  liberi: number | null;
};

/** Una persona del nucleo, per la sezione Junior (`public.junior_nucleo`). */
export type PersonaJunior = {
  member_id: number;
  nome: string | null;
  cognome: string | null;
  data_nascita: string | null;
  titolare: boolean;
  minorenne: boolean;
  /** Dai 3 mesi ai nati nell'anno piu' vecchio dei gruppi del Nuoto Agonistico: lo decide il database. */
  idoneo: boolean;
  motivo: string | null;
  gruppi: { group_id: number; nome: string }[];
};

export type NucleoJunior = {
  trovato: boolean;
  titolare?: number;
  anno_minimo: number;
  mesi_minimi: number;
  persone: PersonaJunior[];
};

/** `nucleo` manca se la funzione e' quella di prima (senza il nucleo): la sezione mostra solo i gruppi. */
export type EsitoGruppi =
  | {
      ok: true;
      gruppi: GruppoJunior[];
      aggiornato_il: string;
      nucleo: NucleoJunior | null;
    }
  | { ok: false; errore: string };

const GUASTO =
  "Non riusciamo a leggere i gruppi adesso. Riprova fra qualche minuto.";
const NON_ATTIVO =
  "La sezione Junior non è ancora attiva: riprova fra qualche giorno.";

export async function gruppiJunior(): Promise<EsitoGruppi> {
  const { ok, stato, dati } = await funzione("portale-lab-junior", {
    azione: "gruppi",
  });
  if (!ok)
    return {
      ok: false,
      errore:
        stato === 404 && !dati.errore ? NON_ATTIVO : (dati.errore ?? GUASTO),
    };
  return {
    ok: true,
    gruppi: Array.isArray(dati.gruppi) ? (dati.gruppi as GruppoJunior[]) : [],
    aggiornato_il: String(dati.aggiornato_il ?? new Date().toISOString()),
    nucleo:
      dati.nucleo && Array.isArray(dati.nucleo.persone)
        ? (dati.nucleo as NucleoJunior)
        : null,
  };
}

export type NuovoComponente = {
  nome: string;
  cognome: string;
  nascita: string;
  codice_fiscale: string;
  tutore: boolean;
};

/**
 * Aggiunge un figlio al nucleo: la funzione controlla i dati, che non ci sia gia' (nel nucleo o al club) e crea la scheda su
 * PerfectGym agganciata al titolare. Risponde col nucleo aggiornato.
 */
export async function aggiungiComponente(
  d: NuovoComponente,
): Promise<
  | { ok: true; nome: string; nucleo: NucleoJunior | null }
  | { ok: false; errore: string; giaNelNucleo: boolean }
> {
  const { ok, stato, dati } = await funzione("portale-lab-junior", {
    azione: "aggiungi",
    ...d,
  });
  if (ok)
    return {
      ok: true,
      nome: String(dati.nome ?? d.nome),
      nucleo:
        dati.nucleo && Array.isArray(dati.nucleo.persone)
          ? (dati.nucleo as NucleoJunior)
          : null,
    };
  const nonAttivo = stato === 400 && dati.errore === "Azione sconosciuta.";
  return {
    ok: false,
    errore: nonAttivo
      ? "Aggiungere un componente da qui non è ancora attivo: passa in segreteria."
      : (dati.errore ??
        "Non siamo riusciti ad aggiungerlo adesso. Riprova fra qualche minuto."),
    giaNelNucleo: dati.gia_nel_nucleo === true,
  };
}
