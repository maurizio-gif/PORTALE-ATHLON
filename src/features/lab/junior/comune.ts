import type { GruppoJunior, NucleoJunior, PersonaJunior } from "@/api/junior";

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

/** Come si chiama una riga: «Lunedì 15:20» per un turno con giorno e ora, il nome del gruppo per gli altri. */
export function titoloGruppo(g: GruppoJunior): string {
  if (g.giorni && g.orario)
    return `${g.giorni.replace(/, /g, " e ")} · ${g.orario}`;
  return g.corso;
}

/** «Nati nel 2023», «Nati dal 2013 al 2015»: tutti gli anni del gruppo, non solo quello scelto. */
export function annateGruppo(g: GruppoJunior): string {
  if (!g.anni.length) return "Anni di nascita non indicati";
  const min = Math.min(...g.anni);
  const max = Math.max(...g.anni);
  return min === max ? `Nati nel ${min}` : `Nati dal ${min} al ${max}`;
}

export type StatoPosti = {
  testo: string;
  tono: "ok" | "attenzione" | "neutro";
};

export function statoPosti(g: GruppoJunior): StatoPosti {
  if (g.liberi == null) return { testo: "Posti da verificare", tono: "neutro" };
  if (g.liberi <= 0) return { testo: "Completo", tono: "neutro" };
  if (g.liberi === 1) return { testo: "Ultimo posto", tono: "attenzione" };
  return { testo: `${g.liberi} posti liberi`, tono: "ok" };
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
): BloccoCorso[] {
  const blocchi = new Map<string, GruppoJunior[]>();
  for (const g of gruppi) {
    if (!g.anni.includes(anno)) continue;
    if (soloLiberi && !((g.liberi ?? 0) > 0)) continue;
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
  const nato = a ? `Classe ${a}` : "Data di nascita mancante";
  if (!p.idoneo) return p.motivo ? `${nato} · ${p.motivo}` : nato;
  if (!p.gruppi.length) return `${nato} · nessun gruppo per ora`;
  return `${nato} · ${p.gruppi.map((g) => nomeIscrizione(g.nome)).join(", ")}`;
}
