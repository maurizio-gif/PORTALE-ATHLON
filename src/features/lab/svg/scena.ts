import { LARGHEZZE_FONT } from "./larghezzeFont";

// Le immagini che l'app nativa disegna da sola (09/11/2026): il diplomino del brevetto (`junior/scenaDiploma.ts`) e la locandina di un evento per la storia di Instagram
// (`clublife/scenaLocandina.ts`). Sul web si disegnano con un canvas; sul telefono il canvas non c'e' e un file non si ricava da una vista senza un modulo nativo nuovo
// (`react-native-view-shot`: una build). Qui **l'immagine e' una scena**: un elenco di forme con le coordinate gia' calcolate, che `ScenaSvg.tsx` disegna con
// `react-native-svg` (che l'app ha gia') e da cui ricava il PNG (`toDataURL`). Il file e' puro (non importa nulla di React Native): si prova da Node.

export type Elemento =
  /** Un rettangolo con una sfumatura verticale: `stops` sono (posizione da 0 a 1, colore, opacita'). */
  | { k: "sfumatura"; x: number; y: number; w: number; h: number; stops: [number, string, number][] }
  | { k: "path"; d: string; fill?: string; stroke?: string; sw?: number; cap?: "round"; join?: "round" }
  | { k: "cerchio"; cx: number; cy: number; r: number; fill?: string; stroke?: string; sw?: number }
  | { k: "ellisse"; cx: number; cy: number; rx: number; ry: number; fill: string }
  | { k: "rett"; x: number; y: number; w: number; h: number; rx: number; fill?: string; stroke?: string; sw?: number }
  | { k: "testo"; x: number; y: number; testo: string; famiglia: string; px: number; fill: string; ancora: "start" | "middle" | "end"; spaziatura?: number }
  /** Un'immagine: `chi` dice quale (il disegno che la usa la risolve in una sorgente); `allinea` e' il `preserveAspectRatio` dell'SVG; `ritaglio` la taglia in tondo. */
  | { k: "immagine"; chi: string; x: number; y: number; w: number; h: number; allinea: string; ritaglio?: { cx: number; cy: number; r: number } };

export type Scena = { larghezza: number; altezza: number; elementi: Elemento[] };

/** I caratteri di `F` (`ui/tema.ts`), qui come nomi: il file e' puro. */
export const CARATTERI = {
  extra: "PlusJakartaSans_800ExtraBold",
  bold: "PlusJakartaSans_700Bold",
  semi: "PlusJakartaSans_600SemiBold",
  medio: "PlusJakartaSans_500Medium",
} as const;

export type Misura = (testo: string, famiglia: string, px: number) => number;

/** La larghezza (in punti) che il testo occupa col carattere e il corpo dati. Un carattere che la tabella non ha vale la media dei caratteri comuni. */
export function misuraTesto(testo: string, famiglia: string, px: number): number {
  const f = LARGHEZZE_FONT[famiglia] ?? LARGHEZZE_FONT[CARATTERI.medio];
  let somma = 0;
  for (const ch of testo) somma += f.larg[ch] ?? f.media;
  return (somma * px) / 1000;
}

/** La larghezza di un testo con una spaziatura fra le lettere (come `letterSpacing`: dopo ogni carattere, l'ultimo escluso). */
export function misuraSpaziata(testo: string, famiglia: string, px: number, spaziatura: number, misura: Misura = misuraTesto): number {
  let w = 0;
  for (const ch of testo) w += misura(ch, famiglia, px) + spaziatura;
  return w - spaziatura;
}

/** «rgba(60,50,110,0.22)» o «#FF6600» in un colore pieno e la sua opacita': `react-native-svg` li vuole separati e li legge senza sorprese. */
export function colore(s: string): { c: string; o: number } {
  const m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(s.trim());
  if (!m) return { c: s, o: 1 };
  const hex = (n: string) => Math.max(0, Math.min(255, Math.round(Number(n)))).toString(16).padStart(2, "0");
  return { c: `#${hex(m[1])}${hex(m[2])}${hex(m[3])}`, o: m[4] === undefined ? 1 : Math.max(0, Math.min(1, Number(m[4]))) };
}
