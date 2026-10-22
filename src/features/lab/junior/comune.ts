import type { GruppoJunior, NucleoJunior, PersonaJunior } from "@/api/junior";

import { locale, t } from "../../../lib/lingua";

// La sezione Junior, la parte che non disegna: quali anni ci sono, quali gruppi accolgono un anno, in che ordine. Pura:
// si prova con `npx tsx`.

/** Gli anni di nascita che hanno almeno un gruppo, dal piu' giovane al piu' grande. */
export function anniDisponibili(gruppi: GruppoJunior[]): number[] {
  return [...new Set(gruppi.flatMap((g) => g.anni))].sort((a, b) => b - a);
}

const GIORNI = [
  "lunedì",
  "martedì",
  "mercoledì",
  "giovedì",
  "venerdì",
  "sabato",
  "domenica",
];

/** L'indice del primo giorno del turno (lunedi' 0), per metterli in ordine di settimana; senza giorni in fondo. */
function primoGiorno(g: GruppoJunior): number {
  const primo = (g.giorni ?? "").split(",")[0]?.trim().toLowerCase();
  const i = GIORNI.indexOf(primo);
  return i < 0 ? 99 : i;
}

/** I giorni della settimana del turno (lunedi' 0), senza ripetizioni; vuoti se il gruppo non li dice. */
export function giorniDelGruppo(g: GruppoJunior): number[] {
  const out = new Set<number>();
  for (const x of (g.giorni ?? "").split(",")) {
    const i = GIORNI.indexOf(x.trim().toLowerCase());
    if (i >= 0) out.add(i);
  }
  return [...out].sort((a, b) => a - b);
}

/** Le sigle dei giorni per le pillole, nell'ordine di settimana. */
export const SIGLE_GIORNI = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

/** I giorni in cui c'e' almeno un gruppo che accoglie quell'anno: solo questi si offrono come filtro. */
export function giorniDelAnno(gruppi: GruppoJunior[], anno: number): number[] {
  const out = new Set<number>();
  for (const g of gruppi)
    if (g.anni.includes(anno)) giorniDelGruppo(g).forEach((i) => out.add(i));
  return [...out].sort((a, b) => a - b);
}

/** Un gruppo passa il filtro se ha almeno uno dei giorni scelti; senza giorni scelti passano tutti, senza giorni dichiarati nessuno. */
function passaGiorni(g: GruppoJunior, giorni: number[]): boolean {
  if (!giorni.length) return true;
  return giorniDelGruppo(g).some((i) => giorni.includes(i));
}

/** Il nome del corso come lo dice il club: «Scuola Nuoto Bambini · Monosettimanale», o il nome della categoria. */
export function nomeCorso(g: GruppoJunior): string {
  const c = g.categoria?.trim();
  if (c) return c.replace(/\s+-\s+/, " · ");
  return (
    g.corso.replace(/\s+(Lun|Mar|Mer|Gio|Ven|Sab|Dom)\b.*$/i, "").trim() ||
    g.corso
  );
}

/** In che ordine vengono i corsi: prima la Scuola Nuoto (mono, poi bi), poi gli altri in ordine di nome. */
function pesoCorso(nome: string): string {
  const n = nome.toLowerCase();
  if (n.includes("scuola nuoto") && n.includes("mono")) return "0";
  if (n.includes("scuola nuoto")) return "1";
  return `2${n}`;
}

/** Un turno col giorno e l'ora nel nome («Lun 15.20»): l'orario e' la sola ora d'inizio. Gli altri gruppi la ricevono dal palinsesto, con la fine. */
function turnoNelNome(g: GruppoJunior): boolean {
  return !!g.giorni && !!g.orario && !g.orario.includes("–");
}

/** Come si chiama una riga: «Lunedì e Giovedì · 15:20» per un turno con giorno e ora nel nome, il nome del gruppo per gli altri. */
export function titoloGruppo(g: GruppoJunior): string {
  if (turnoNelNome(g))
    return `${g.giorni!.replace(/, /g, t(" e ", " and "))} · ${g.orario}`;
  return g.corso;
}

const SIGLE_IT = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const SIGLE_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * I giorni e le ore dei gruppi che non li hanno nel nome (Nuoto Agonistico e Propaganda, Pallanuoto: dal palinsesto, 22/10/2026):
 * «Lun, Mar, Gio, Ven · 15:00–15:50», o per piu' fasce «17:30–18:20 (Lun, Gio) · 18:30–19:20 (Sab)». Vuoto per un turno che li ha
 * gia' nel titolo, e per un gruppo senza lezioni in programma.
 */
export function calendarioGruppo(g: GruppoJunior): string | null {
  if (turnoNelNome(g)) return null;
  const orario = g.orario?.trim();
  if (!g.giorni || !orario) return null;
  const en = (s: string) =>
    SIGLE_IT.reduce((acc, it, i) => acc.replace(new RegExp(`\\b${it}\\b`, "g"), t(it, SIGLE_EN[i])), s);
  if (/\(/.test(orario)) return en(orario);
  const giorni = giorniDelGruppo(g)
    .map((i) => t(SIGLE_IT[i], SIGLE_EN[i]))
    .join(", ");
  return `${giorni} · ${orario}`;
}

/** «Nati nel 2023», «Nati dal 2013 al 2015»: tutti gli anni del gruppo, non solo quello scelto. */
export function annateGruppo(g: GruppoJunior): string {
  if (!g.anni.length)
    return t("Anni di nascita non indicati", "Birth years not specified");
  const min = Math.min(...g.anni);
  const max = Math.max(...g.anni);
  return min === max
    ? t(`Nati nel ${min}`, `Born in ${min}`)
    : t(`Nati dal ${min} al ${max}`, `Born ${min} to ${max}`);
}

export type StatoPosti = {
  testo: string;
  tono: "ok" | "attenzione" | "neutro";
};

export function statoPosti(g: GruppoJunior): StatoPosti {
  if (g.liberi == null)
    return {
      testo: t("Posti da verificare", "Spots to be confirmed"),
      tono: "neutro",
    };
  if (g.liberi <= 0) return { testo: t("Completo", "Full"), tono: "neutro" };
  if (g.liberi === 1)
    return { testo: t("Ultimo posto", "Last spot"), tono: "attenzione" };
  return {
    testo: t(`${g.liberi} posti liberi`, `${g.liberi} spots available`),
    tono: "ok",
  };
}

export type BloccoCorso = {
  corso: string;
  gruppi: GruppoJunior[];
  liberi: number;
};

/** I gruppi che accolgono quell'anno, divisi per corso e in ordine di settimana e di ora. */
export function gruppiDellAnno(
  gruppi: GruppoJunior[],
  anno: number,
  soloLiberi = false,
  giorni: number[] = [],
): BloccoCorso[] {
  const blocchi = new Map<string, GruppoJunior[]>();
  for (const g of gruppi) {
    if (!g.anni.includes(anno)) continue;
    if (soloLiberi && !((g.liberi ?? 0) > 0)) continue;
    if (!passaGiorni(g, giorni)) continue;
    const c = nomeCorso(g);
    blocchi.set(c, [...(blocchi.get(c) ?? []), g]);
  }
  return [...blocchi.entries()]
    .sort(([a], [b]) => pesoCorso(a).localeCompare(pesoCorso(b), "it"))
    .map(([corso, gs]) => ({
      corso,
      gruppi: gs.sort(
        (a, b) =>
          primoGiorno(a) - primoGiorno(b) ||
          (a.orario ?? "").localeCompare(b.orario ?? "") ||
          a.nome.localeCompare(b.nome, "it"),
      ),
      liberi: gs.reduce((s, g) => s + Math.max(g.liberi ?? 0, 0), 0),
    }));
}

/** Quanti gruppi con almeno un posto ha un anno, per la tessera. */
export function conPosto(gruppi: GruppoJunior[], anno: number): number {
  return gruppi.filter((g) => g.anni.includes(anno) && (g.liberi ?? 0) > 0)
    .length;
}

/** L'anno da aprire: quello chiesto, se c'e', o il primo (il piu' giovane). */
export function annoIniziale(
  anni: number[],
  chiesto?: string | null,
): number | null {
  const n = Number(chiesto);
  if (Number.isInteger(n) && anni.includes(n)) return n;
  return anni[0] ?? null;
}

// ---------------------------------------------------------------------------
// Il nucleo in cima alla sezione (21/10/2026)

/** Chi si mostra: gli idonei, e i minorenni non ancora idonei (un neonato) col perche'. Gli adulti fuori eta' no. */
export function personeDaMostrare(n: NucleoJunior | null): PersonaJunior[] {
  if (!n) return [];
  return n.persone.filter((p) => p.idoneo || (p.minorenne && !p.titolare));
}

export function annoDi(p: PersonaJunior): number | null {
  const a = Number(String(p.data_nascita ?? "").slice(0, 4));
  return Number.isInteger(a) && a > 1900 ? a : null;
}

/** L'anno da aprire se l'indirizzo non ne chiede uno: il piu' giovane del nucleo che ha dei gruppi. */
export function annoDalNucleo(
  n: NucleoJunior | null,
  anni: number[],
): number | null {
  for (const p of personeDaMostrare(n)) {
    const a = annoDi(p);
    if (p.idoneo && a != null && anni.includes(a)) return a;
  }
  return null;
}

/** «Scuola Nuoto Monosettimanale Lun 15.20» dal nome del gruppo, senza le annate. */
export function nomeIscrizione(nome: string): string {
  return nome
    .replace(/\s*\([^)]*\)\s*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** La riga sotto il nome: l'anno e i gruppi a cui e' iscritto, o il motivo per cui non e' ancora idoneo. */
export function descriviPersona(p: PersonaJunior): string {
  const a = annoDi(p);
  const nato = a
    ? t(`Classe ${a}`, `Born ${a}`)
    : t("Data di nascita mancante", "Date of birth missing");
  if (!p.idoneo) return p.motivo ? `${nato} · ${p.motivo}` : nato;
  // Il Baby Nuoto non ha gruppi: si prenota lezione per lezione, come le attività degli adulti.
  if (!p.gruppi.length)
    return eBaby(p.data_nascita)
      ? `${nato} · Baby Nuoto`
      : t(`${nato} · nessun gruppo per ora`, `${nato} · no group yet`);
  return `${nato} · ${p.gruppi.map((g) => nomeIscrizione(g.nome)).join(", ")}`;
}

/**
 * Chi del nucleo puo' iscriversi a un gruppo da qui (21/10/2026): idoneo, nato in uno degli anni del gruppo, non gia' dentro,
 * e che firma qualcuno: un minorenne (firma il genitore) o il titolare adulto. Un gruppo completo non si offre. Il server
 * ricontrolla tutto con PerfectGym (`GetEnrollmentOptions`): questo serve a mostrare il comando solo dove puo' funzionare.
 */
export function chiPuoIscriversi(
  n: NucleoJunior | null,
  g: GruppoJunior,
): PersonaJunior[] {
  if (!n || g.liberi === 0) return [];
  return n.persone.filter((p) => {
    const a = annoDi(p);
    return (
      p.idoneo &&
      a != null &&
      g.anni.includes(a) &&
      (p.minorenne || p.titolare) &&
      !p.gruppi.some((x) => String(x.group_id) === String(g.id))
    );
  });
}

// ---------------------------------------------------------------------------
// I corsi di una persona (22/10/2026): contratto, finestra delle lezioni, conteggi.

/** «2026-10-31» -> «31 ottobre 2026». Una data senza ora si legge a mezzogiorno, o il fuso la sposta di un giorno. */
export function dataIt(d: string | null | undefined): string {
  if (!d) return "";
  const x = new Date(`${d.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(x.getTime())) return "";
  return x.toLocaleDateString(locale(), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const statiContratto = (): Record<string, string> => ({
  Current: t("In corso", "Active"),
  NotStarted: t("Non ancora iniziato", "Not started yet"),
  Freezed: t("Sospeso", "Frozen"),
  Ended: t("Finito", "Ended"),
});

export function statoContratto(stato: string | null | undefined): string {
  return (stato && statiContratto()[stato]) || t("In corso", "Active");
}

/** Come si rinnova, in una riga: da dove la persona legge se l'abbonamento continua da solo. */
export function rinnovoContratto(c: {
  rinnovo_automatico: boolean | null;
  disdetta: string | null;
  fine: string | null;
}): string {
  if (c.disdetta)
    return t(
      `Disdetto il ${dataIt(c.disdetta)}: finisce il ${dataIt(c.fine)} e non si rinnova`,
      `Cancelled on ${dataIt(c.disdetta)}: ends on ${dataIt(c.fine)} and won’t renew`,
    );
  if (c.rinnovo_automatico)
    return t("Si rinnova ogni mese", "Renews every month");
  return c.fine
    ? t(`Fino al ${dataIt(c.fine)}`, `Until ${dataIt(c.fine)}`)
    : t("Senza scadenza", "No end date");
}

/**
 * Perche' le lezioni si vedono solo fin li': PerfectGym tiene vive le lezioni fino alla fine del contratto, e il rinnovo di
 * meta' mese (di solito fra il 20 e il 21) la sposta al mese dopo. Chi ha disdetto non ha un mese dopo.
 */
export function finestraLezioni(c: {
  fine: string | null;
  disdetta: string | null;
}): string {
  if (!c.fine)
    return t(
      "Qui vedi le lezioni che hai in programma.",
      "Here you can see your upcoming classes.",
    );
  if (c.disdetta)
    return t(
      `Qui vedi le lezioni fino al ${dataIt(c.fine)}, quando finisce il tuo abbonamento.`,
      `Here you can see classes up to ${dataIt(c.fine)}, when your membership ends.`,
    );
  return t(
    `Qui vedi le lezioni fino al ${dataIt(c.fine)}, la fine del mese pagato. Quando l’abbonamento si rinnova (di solito fra il 20 e il 21) compaiono quelle del mese dopo.`,
    `Here you can see classes up to ${dataIt(c.fine)}, the end of the paid month. When the membership renews (usually around the 20th–21st) next month’s classes appear.`,
  );
}

/** «1 lezione» / «3 lezioni». */
export function nLezioni(n: number): string {
  return t(
    `${n} ${n === 1 ? "lezione" : "lezioni"}`,
    `${n} ${n === 1 ? "class" : "classes"}`,
  );
}

/** Il canone, «109 €» o «89,50 €». */
export function euroIt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "";
  return `${n.toLocaleString(locale(), { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })} €`;
}

/** L'iscrizione che la persona ha alla Scuola Nuoto (da cui i recuperi), se c'e'. */
export function iscrizioneScuola<T extends { recuperabile: boolean }>(
  iscrizioni: T[],
): T | null {
  return iscrizioni.find((i) => i.recuperabile) ?? null;
}

/** I mesi compiuti alla data, dalla nascita «AAAA-MM-GG»; null se la data non c'e'. */
export function mesiCompiuti(
  nascita: string | null | undefined,
  oggi: Date = new Date(),
): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(nascita ?? "");
  if (!m) return null;
  const [a, me, g] = [Number(m[1]), Number(m[2]), Number(m[3])];
  let mesi = (oggi.getFullYear() - a) * 12 + (oggi.getMonth() + 1 - me);
  if (oggi.getDate() < g) mesi -= 1;
  return mesi;
}

/**
 * In eta' per il Baby Nuoto: da 3 a 36 mesi compiuti, i limiti dei due tipi di lezione («3-15 Mesi», «16-36 Mesi»). E' la stessa
 * regola di `junior_corsi_di` nel database, che resta l'autorita': qui serve a non mostrare i gruppi della scuola a un lattante.
 */
export function eBaby(
  nascita: string | null | undefined,
  oggi: Date = new Date(),
): boolean {
  const m = mesiCompiuti(nascita, oggi);
  return m != null && m >= 3 && m <= 36;
}
