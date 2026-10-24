import { funzione } from "@/api/lab";
import { t } from "@/lib/lingua";

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
  /** Il livello della Scuola Nuoto Bambini (`A1 - Stella Marina 1`…), se c'è: dal mirror, solo quello di adesso. Manca con una funzione di prima. */
  livello?: string | null;
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
  t("Non riusciamo a leggere i gruppi adesso. Riprova fra qualche minuto.", "We can’t load the groups right now. Try again in a few minutes.");
const NON_ATTIVO =
  t("La sezione Junior non è ancora attiva: riprova fra qualche giorno.", "The Junior section isn’t active yet: try again in a few days.");

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
  const nonAttivo =
    stato === 400 &&
    (dati.errore === "Azione sconosciuta." || dati.errore === "Unknown action.");
  return {
    ok: false,
    errore: nonAttivo
      ? t("Aggiungere un componente da qui non è ancora attivo: passa in segreteria.", "Adding a family member from here isn’t active yet: stop by the front desk.")
      : (dati.errore ??
        t("Non siamo riusciti ad aggiungerlo adesso. Riprova fra qualche minuto.", "We couldn’t add them right now. Try again in a few minutes.")),
    giaNelNucleo: dati.gia_nel_nucleo === true,
  };
}

// ---------------------------------------------------------------------------
// I corsi di una persona (22/10/2026): a cosa e' iscritta, le lezioni che ha in programma, disdette e recuperi, e per il Baby
// Nuoto cosa si puo' comprare. Dalla funzione `portale-lab-junior`, azione `corsi` (`public.junior_corsi_di`, APP-ATHLON).

export type ContrattoJunior = {
  id: number;
  piano: string | null;
  canone: number | null;
  stato: string | null;
  inizio: string | null;
  /** La fine del contratto: le lezioni si vedono fin li'. Il rinnovo di meta' mese la sposta al mese dopo. */
  fine: string | null;
  rinnovo_automatico: boolean | null;
  /** Il giorno in cui e' stata data la disdetta, se c'e'. */
  disdetta: string | null;
};

export type LezioneIscritto = {
  booking_id: number;
  class_id: number;
  inizio: string;
  fine: string;
  nome: string;
};

export type IscrizioneJunior = {
  iscrizione_id: number;
  gruppo_id: number;
  gruppo: string;
  /** I recuperi esistono solo per la Scuola Nuoto Bambini. */
  recuperabile: boolean;
  dal: string;
  contratto: ContrattoJunior;
  /** Dai prodotti «Recupero» della persona su PerfectGym: uno per ogni disdetta valida, usato o no, con scadenza. */
  conteggi: {
    disdette: number;
    recuperate: number;
    da_recuperare: number;
    /** Recuperi non usati e scaduti (fine del mese del contratto). */
    scadute?: number;
    /** Il primo giorno in cui scade un recupero non usato (ISO), se ce n'e'. */
    scade_il?: string | null;
  };
  prossime: LezioneIscritto[];
  /** Le lezioni che non si vedono perche' la quota del loro mese non e' ancora pagata (manca con una funzione di prima). */
  sospese?: number;
  /** Il primo mese con una quota da pagare (ISO, il giorno 1). */
  sospese_dal?: string | null;
  recuperi: LezioneIscritto[];
};

export type BabyJunior = {
  idoneo: true;
  mesi: number;
  abbonamento: ContrattoJunior | null;
  prenotate: LezioneIscritto[];
  singola: { product_id: number; prezzo: number } | null;
  mensile: {
    piano_id: number;
    canone: number;
    quota_attivazione: number;
  } | null;
};

export type CorsiPersona = {
  iscrizioni: IscrizioneJunior[];
  baby: BabyJunior | null;
};

export async function corsiJunior(
  memberId: number,
): Promise<({ ok: true } & CorsiPersona) | { ok: false; errore: string }> {
  const { ok, stato, dati } = await funzione("portale-lab-junior", {
    azione: "corsi",
    member_id: memberId,
  });
  if (!ok)
    return {
      ok: false,
      errore:
        stato === 400 && dati.errore === "Azione sconosciuta."
          ? "I corsi della persona non sono ancora attivi: riprova fra qualche giorno."
          : (dati.errore ??
            "Non riusciamo a leggere i corsi adesso. Riprova fra qualche minuto."),
    };
  return {
    ok: true,
    iscrizioni: Array.isArray(dati.iscrizioni)
      ? (dati.iscrizioni as IscrizioneJunior[])
      : [],
    baby: dati.baby && dati.baby.idoneo ? (dati.baby as BabyJunior) : null,
  };
}

export type PassaggioLivello = {
  livello: string;
  precedente: string | null;
  /** La riga con cui abbiamo cominciato a guardare: la data e' quella del primo rilevamento, non del passaggio. */
  primo_rilevamento: boolean;
  rilevato_il: string;
};

export type EsitoLivelli =
  | {
      ok: true;
      livello: string | null;
      rilevato_dal: string | null;
      /** Dal piu' recente. */
      passaggi: PassaggioLivello[];
    }
  | { ok: false; errore: string };

/**
 * Lo storico dei livelli della Scuola Nuoto Bambini di una persona del nucleo. PerfectGym non da' le date dei passaggi: le scrive il
 * nostro database quando vede cambiare il livello (da 22/10/2026), quindi sono date «rilevate».
 */
export async function livelliJunior(memberId: number): Promise<EsitoLivelli> {
  const { ok, stato, dati } = await funzione("portale-lab-junior", {
    azione: "livelli",
    member_id: memberId,
  });
  if (!ok) {
    const nonAttivo =
      (stato === 404 && !dati.errore) ||
      dati.errore === "Azione sconosciuta." ||
      dati.errore === "Unknown action.";
    return {
      ok: false,
      errore: nonAttivo
        ? t("La storia dei livelli non è ancora attiva: riprova fra qualche giorno.", "The level history isn’t active yet: try again in a few days.")
        : (dati.errore ??
          t("Non riusciamo a leggere i livelli adesso. Riprova fra qualche minuto.", "We can’t load the levels right now. Try again in a few minutes.")),
    };
  }
  return {
    ok: true,
    livello: dati.livello ?? null,
    rilevato_dal: dati.rilevato_dal ?? null,
    passaggi: Array.isArray(dati.passaggi)
      ? (dati.passaggi as PassaggioLivello[])
      : [],
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Il Direttore Tecnico (22/10/2026, richiesta di Maurizio): dalla scheda di un bambino iscritto il genitore vede gli orari liberi e
// prenota una telefonata, senza riscrivere nessun dato. Genitore e bambino li ricava la funzione; l'unico dato che puo' mancare e' il
// cellulare del genitore. Stessa agenda e stesse email del modulo del sito.

export type GiornoDt = { data: string; etichetta: string; slot: string[] };

export type EsitoSlotDt =
  | { ok: true; durataMinuti: number | null; giorni: GiornoDt[]; telefonoMancante: boolean }
  | { ok: false; errore: string };

const NON_ATTIVO_DT = () =>
  t(
    "L’appuntamento col Direttore Tecnico non è ancora attivo: riprova fra qualche giorno.",
    "Appointments with the Technical Director aren’t active yet: try again in a few days.",
  );

function dtNonAttivo(stato: number, errore?: string): boolean {
  return (
    (stato === 404 && !errore) ||
    errore === "Azione sconosciuta." ||
    errore === "Unknown action."
  );
}

export async function slotDirettoreTecnico(memberId: number, appuntamentoId?: string): Promise<EsitoSlotDt> {
  const { ok, stato, dati } = await funzione("portale-lab-junior", {
    azione: "dt_slot",
    member_id: memberId,
    ...(appuntamentoId ? { appuntamento_id: appuntamentoId } : {}),
  });
  if (!ok) {
    return {
      ok: false,
      errore: dtNonAttivo(stato, dati.errore)
        ? NON_ATTIVO_DT()
        : (dati.errore ??
          t("Non riusciamo a leggere gli orari adesso. Riprova fra qualche minuto.", "We can’t load the available times right now. Try again in a few minutes.")),
    };
  }
  return {
    ok: true,
    durataMinuti: typeof dati.durata_minuti === "number" ? dati.durata_minuti : null,
    giorni: Array.isArray(dati.giorni)
      ? (dati.giorni as GiornoDt[]).filter((g) => Array.isArray(g.slot) && g.slot.length > 0)
      : [],
    telefonoMancante: dati.telefono_mancante === true,
  };
}

export type EsitoPrenotaDt =
  | { ok: true; id: string | null; data: string; ora: string; durataMinuti: number | null }
  | { ok: false; errore: string; slotOccupato?: boolean; telefonoMancante?: boolean };

export async function prenotaDirettoreTecnico(d: {
  memberId: number;
  data: string;
  ora: string;
  motivo: string;
  telefono?: string;
}): Promise<EsitoPrenotaDt> {
  const { ok, stato, dati } = await funzione("portale-lab-junior", {
    azione: "dt_prenota",
    member_id: d.memberId,
    data: d.data,
    ora: d.ora,
    motivo: d.motivo,
    ...(d.telefono ? { telefono: d.telefono } : {}),
  });
  if (!ok) {
    return {
      ok: false,
      slotOccupato: dati.slot_occupato === true,
      telefonoMancante: dati.telefono_mancante === true,
      errore: dtNonAttivo(stato, dati.errore)
        ? NON_ATTIVO_DT()
        : (dati.errore ??
          t("Non riusciamo a registrare l’appuntamento adesso. Riprova fra qualche minuto.", "We can’t book the appointment right now. Try again in a few minutes.")),
    };
  }
  return {
    ok: true,
    id: typeof dati.id === "string" ? dati.id : null,
    data: String(dati.data ?? d.data),
    ora: String(dati.ora ?? d.ora),
    durataMinuti: typeof dati.durata_minuti === "number" ? dati.durata_minuti : null,
  };
}

/** Un appuntamento col Direttore Tecnico ancora da fare (25/10/2026): si mostra subito dopo averlo preso, e si sposta o si annulla. */
export type AppuntamentoDt = {
  id: string;
  data: string;
  ora: string;
  durataMinuti: number | null;
  bambino: string | null;
  memberId: number | null;
  motivo: string;
};

/** I suoi appuntamenti ancora da fare. Null se la funzione e' di prima o non risponde: allora l'elenco semplicemente non compare. */
export async function appuntamentiDirettoreTecnico(): Promise<AppuntamentoDt[] | null> {
  const { ok, dati } = await funzione("portale-lab-junior", { azione: "dt_mie" });
  if (!ok || !Array.isArray(dati.appuntamenti)) return null;
  return (dati.appuntamenti as Record<string, any>[]).map((a) => ({
    id: String(a.id),
    data: String(a.data),
    ora: String(a.ora),
    durataMinuti: typeof a.durata_minuti === "number" ? a.durata_minuti : null,
    bambino: typeof a.bambino === "string" ? a.bambino : null,
    memberId: typeof a.member_id === "number" ? a.member_id : null,
    motivo: String(a.motivo ?? ""),
  }));
}

export type EsitoGestioneDt = { ok: true } | { ok: false; errore: string; slotOccupato?: boolean };

async function gestisciDt(corpo: Record<string, unknown>): Promise<EsitoGestioneDt> {
  const { ok, stato, dati } = await funzione("portale-lab-junior", corpo);
  if (ok) return { ok: true };
  return {
    ok: false,
    slotOccupato: dati.slot_occupato === true,
    errore: dtNonAttivo(stato, dati.errore)
      ? NON_ATTIVO_DT()
      : (dati.errore ?? t("Non riusciamo adesso. Riprova fra qualche minuto.", "We can’t do it right now. Try again in a few minutes.")),
  };
}

export const annullaDirettoreTecnico = (id: string) => gestisciDt({ azione: "dt_annulla", id });
export const spostaDirettoreTecnico = (id: string, data: string, ora: string) =>
  gestisciDt({ azione: "dt_sposta", id, data, ora });

export type EsitoCambioOrario = { ok: true; giaChiesto: boolean } | { ok: false; errore: string };

/** Chiede alla segreteria di passare a un altro turno dello stesso tipo: non cambia niente da solo (lo fa la segreteria su PerfectGym). */
export async function chiediCambioOrario(d: { memberId: number; groupId: string | number; nota?: string }): Promise<EsitoCambioOrario> {
  const { ok, stato, dati } = await funzione("portale-lab-junior", {
    azione: "cambio_orario",
    member_id: d.memberId,
    group_id: Number(d.groupId),
    ...(d.nota ? { nota: d.nota } : {}),
  });
  if (!ok) {
    return {
      ok: false,
      errore:
        stato === 400 && dati.errore === "Azione sconosciuta."
          ? t("Il cambio orario non è ancora attivo: riprova fra qualche giorno.", "Schedule changes aren’t active yet: try again in a few days.")
          : (dati.errore ?? t("Non riusciamo a mandare la richiesta adesso. Riprova fra qualche minuto.", "We can’t send the request right now. Try again in a few minutes.")),
    };
  }
  return { ok: true, giaChiesto: dati.gia_chiesto === true };
}

export type EsitoDisdetta = { ok: true; fine: string } | { ok: false; errore: string; giaDisdetto?: boolean };

/**
 * Disdice l'abbonamento mensile di un gruppo (22/10/2026): la fine la decide la regola dei 10 giorni (entro il 21 di un mese da 31
 * giorni finisce a fine mese, dopo a fine del mese dopo). Scrive su PerfectGym (`Contracts/Cancel`), poi rilegge.
 */
export async function disdiciCorso(d: { memberId: number; contractId: number }): Promise<EsitoDisdetta> {
  const { ok, stato, dati } = await funzione("portale-lab-junior", {
    azione: "disdici_corso",
    member_id: d.memberId,
    contract_id: d.contractId,
  });
  if (ok && typeof dati.fine === "string") return { ok: true, fine: dati.fine };
  return {
    ok: false,
    giaDisdetto: dati.gia_disdetto === true,
    errore:
      stato === 400 && dati.errore === "Azione sconosciuta."
        ? t("La disdetta dall’app non è ancora attiva: scrivi a disdetta@athlonroma.it.", "Cancelling from the app isn’t active yet: write to disdetta@athlonroma.it.")
        : (dati.errore ?? t("Non riusciamo a disdire adesso. Riprova fra qualche minuto.", "We can’t cancel right now. Try again in a few minutes.")),
  };
}
