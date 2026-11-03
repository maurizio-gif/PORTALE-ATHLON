import { funzione } from "@/api/lab";
import { t } from "@/lib/lingua";

// Le gare della Scuola Nuoto: il Trofeo Athlon 2026/27 (04/11/2026, richiesta di Maurizio), dalla funzione `portale-lab-gare` (APP-ATHLON).
// Le regole (livello ottenuto almeno A3, anno di nascita in una delle quattro categorie, chiusura alle 13:00 del giorno prima) le applica il database:
// qui si legge cosa puo' fare ogni bambino e si chiede di iscriverlo.

export type ProvaGara = { descrizione: string; distanza_m: number };

export type GaraTrofeo = {
  id: number;
  numero: number;
  titolo: string;
  inizio: string;
  /** Quando chiudono le iscrizioni (le 13:00 del giorno prima). */
  chiude: string;
  aperta: boolean;
  passata: boolean;
  /** La prova di ogni gruppo di livello (`A3-M1`, `M2-M3`, `B1-B2`, `B3-B6`). */
  prove: Record<string, ProvaGara>;
  /** A che ora gareggia ogni categoria (fascia d'eta' e sesso): per la 1ª gara li ha dati il club; per le altre arrivano quando sono noti. */
  turni: { fascia_eta: string; sesso: "Male" | "Female"; inizio: string }[];
};

export type IscrizioneBreve = {
  id: number;
  gara_id: number;
  stato: "in_attesa_pagamento" | "confermata";
  gruppo: string;
  link_pagamento: string | null;
  link_scade: string | null;
};

export type PersonaGara = {
  member_id: number;
  nome: string | null;
  cognome: string | null;
  anno: number | null;
  /** Il sesso sulla scheda su PerfectGym: `Male`, `Female` o `Other`. */
  sesso: string | null;
  /** Il sesso che dice il codice fiscale (solo se il codice torna con la data di nascita), o `null`: in quel caso e solo in quello lo sceglie il genitore. */
  sesso_cf: "Male" | "Female" | null;
  livello: string | null;
  livello_nome: string | null;
  fascia: string | null;
  gruppo: string | null;
  ammesso: boolean;
  /** Perche' non e' ammesso: `data_nascita`, `fuori_fascia` o `livello`. */
  motivo: "data_nascita" | "fuori_fascia" | "livello" | null;
  iscrizioni: IscrizioneBreve[];
};

export type IscrizioneMia = {
  id: number;
  member_id: number;
  nome: string;
  cognome: string;
  gara_id: number;
  numero: number;
  titolo: string;
  inizio: string;
  stato: "in_attesa_pagamento" | "confermata";
  gruppo: string;
  fascia_eta: string;
  sesso: "Male" | "Female";
  livello: string;
  prova: string | null;
  /** L'ora del suo turno, se la sappiamo. */
  turno_inizio: string | null;
  esito: "presente" | "assente" | "squalificato" | null;
  /** Centesimi di secondo. */
  tempo_cent: number | null;
  posizione: number | null;
  punti: number;
};

export type DatiGare = {
  edizione: string | null;
  quota_cent: number;
  gare: GaraTrofeo[];
  persone: PersonaGara[];
  mie: IscrizioneMia[];
};

export type EsitoGare = ({ ok: true } & DatiGare) | { ok: false; errore: string };

const nonAttivo = (stato: number, errore?: string) => (stato === 404 && !errore) || errore === "Azione sconosciuta." || errore === "Unknown action.";

export async function leggiGare(): Promise<EsitoGare> {
  const { ok, stato, dati } = await funzione("portale-lab-gare", { azione: "elenco" });
  if (!ok) {
    return {
      ok: false,
      errore: nonAttivo(stato, dati.errore)
        ? t("Le gare non sono ancora attive: riprova fra qualche giorno.", "Races aren’t active yet: try again in a few days.")
        : (dati.errore ?? t("Non riusciamo a leggere le gare adesso. Riprova fra qualche minuto.", "We can’t load the races right now. Try again in a few minutes.")),
    };
  }
  return {
    ok: true,
    edizione: dati.edizione ?? null,
    quota_cent: Number(dati.quota_cent ?? 800),
    gare: Array.isArray(dati.gare) ? (dati.gare as GaraTrofeo[]).map((g) => ({ ...g, turni: Array.isArray(g.turni) ? g.turni : [] })) : [],
    persone: Array.isArray(dati.persone) ? (dati.persone as PersonaGara[]) : [],
    mie: Array.isArray(dati.mie) ? (dati.mie as IscrizioneMia[]) : [],
  };
}

export type EsitoIscrizione = { ok: true; iscrizione_id: number; stato: string; sesso_aggiornato: boolean } | { ok: false; errore: string; gia_iscritto?: boolean };

/**
 * Iscrive un bambino a una gara. Il sesso lo dice il codice fiscale (`PersonaGara.sesso_cf`): `sesso` si manda solo quando il codice non lo dice, ed e' quello scelto
 * dal genitore. Non paga: dopo si chiama `pagaGara`.
 */
export async function iscriviAGara(garaId: number, memberId: number, sesso: "Male" | "Female" | null): Promise<EsitoIscrizione> {
  const { ok, dati } = await funzione("portale-lab-gare", { azione: "iscrivi", gara_id: garaId, member_id: memberId, ...(sesso ? { sesso } : {}) });
  if (!ok) {
    return {
      ok: false,
      gia_iscritto: dati.codice === "gia_iscritto",
      errore: dati.errore ?? t("Non siamo riusciti a iscriverlo adesso. Riprova fra qualche minuto.", "We couldn’t register right now. Try again in a few minutes."),
    };
  }
  return { ok: true, iscrizione_id: Number(dati.iscrizione_id), stato: String(dati.stato ?? ""), sesso_aggiornato: dati.sesso_aggiornato !== false };
}

export type EsitoPagamentoGara = { ok: true; url: string } | { ok: true; giaPagata: true; url?: undefined } | { ok: false; errore: string };

/** Il link di pagamento Adyen (8 euro): si apre nel browser integrato. L'iscrizione si conferma quando Adyen avvisa il database, non al ritorno. */
export async function pagaGara(iscrizioneId: number): Promise<EsitoPagamentoGara> {
  const { ok, dati } = await funzione("portale-lab-gare", { azione: "paga", iscrizione_id: iscrizioneId, ritorno: "https://app.athlonroma.it/junior?voce=gare" });
  if (!ok) return { ok: false, errore: dati.errore ?? t("Non riusciamo a preparare il pagamento adesso. Riprova fra qualche minuto.", "We can’t set up the payment right now. Try again in a few minutes.") };
  if (dati.gia_pagata) return { ok: true, giaPagata: true };
  return { ok: true, url: String(dati.url) };
}
