import { CARATTERI, misuraSpaziata, misuraTesto, type Elemento, type Misura, type Scena } from "../svg/scena";

// La locandina di un evento in formato storia **sull'app nativa** (09/11/2026, richiesta di Maurizio: «anche la storia di Instagram per un evento si svolge fuori
// dall'app»). Sul web la disegna `locandina.ts` con un canvas; qui la stessa impaginazione e' una **scena** (`svg/scena.ts`), che `LocandinaSvg.tsx` disegna con
// `react-native-svg` e da cui ricava il PNG. 1080 x 1920, la foto a tutto schermo, due sfumature scure, il logo, e in basso la frase, l'occhiello, il titolo, la data,
// l'orario e l'indirizzo. **E' una copia dell'impaginazione del canvas**: se cambia l'una, va cambiata l'altra (e la pagina dell'evento del sito, `CondividiEvento.astro`).
//
// - **Il titolo e' in Plus Jakarta Sans** (800, fino a 112 punti), non in Tusker: e' il ripiego che il canvas usa quando Tusker non arriva dal sito. Il carattere del sito e' un
//   file `woff2`, che l'app nativa non sa caricare; portarlo vuole un file `ttf` fra le risorse dell'app e la sua tabella di larghezze.
// - **I testi stanno fra 250 e 1670 punti**: sopra e sotto Instagram mette la barra del profilo e il campo di risposta.
// - Il file e' puro (non importa nulla di React Native): si prova da Node. L'impaginazione e' calcolata dal basso verso l'alto, come nel canvas.

export type DatiLocandina = {
  titolo: string;
  /** L'occhiello (la categoria dell'evento), o vuoto. */
  etichetta: string;
  /** «Domenica 15 novembre»: gia' scritto da chi chiama (`giornoEvento`). */
  giorno: string;
  ora: string | null;
  frase: string;
};

export const LARGHEZZA = 1080;
export const ALTEZZA = 1920;
const X = 84;
const ARANCIO = "#ff5701";
const SCURO = "#272423";
const LUOGO = "Athlon Club · Via Ugo Ojetti 134, Roma";

/** Il testo spezzato in righe che stanno nella larghezza data (il carattere e il corpo sono quelli passati). */
function righe(testo: string, famiglia: string, px: number, larghezza: number, misura: Misura): string[] {
  const out: string[] = [];
  let riga = "";
  for (const parola of testo.split(/\s+/).filter(Boolean)) {
    const prova = riga ? `${riga} ${parola}` : parola;
    if (riga && misura(prova, famiglia, px) > larghezza) {
      out.push(riga);
      riga = parola;
    } else riga = prova;
  }
  if (riga) out.push(riga);
  return out;
}

/** `proporzioneLogo` e' larghezza / altezza del logo del club. */
export function scenaLocandina(d: DatiLocandina, proporzioneLogo: number, misura: Misura = misuraTesto): Scena {
  const W = LARGHEZZA;
  const H = ALTEZZA;
  const largo = W - X * 2;
  const testi: Elemento[] = [];
  const testo = (x: number, y: number, t: string, famiglia: string, px: number, fill: string, spaziatura?: number) =>
    testi.push({ k: "testo", x, y, testo: t, famiglia, px, fill, ancora: "start", spaziatura });

  // Dal basso verso l'alto: l'indirizzo, la data, il titolo, l'occhiello, la frase.
  let y = 1640;
  testo(X, y, LUOGO, CARATTERI.medio, 30, "rgba(255,255,255,0.72)");
  y -= 46;
  testi.push({ k: "rett", x: X, y: y - 6, w: 96, h: 6, rx: 0, fill: ARANCIO });
  y -= 52;

  for (const r of righe((d.ora ?? "").trim(), CARATTERI.bold, 46, largo, misura).reverse()) {
    testo(X, y, r, CARATTERI.bold, 46, "#ffffff");
    y -= 58;
  }
  testo(X, y, d.giorno, CARATTERI.bold, 46, "#ffffff");
  y -= 84;

  // Il titolo, maiuscolo, il piu' grande che sta in quattro righe. Come nel canvas, se nessun corpo va bene si resta con l'ultimo provato (60) e l'interlinea del successivo (54).
  const titolo = d.titolo.toUpperCase();
  let corpo = 112;
  let corpoProvato = corpo;
  let linee: string[] = [];
  for (; corpo >= 60; corpo -= 6) {
    corpoProvato = corpo;
    linee = righe(titolo, CARATTERI.extra, corpo, largo, misura);
    if (linee.length <= 4 && linee.every((l) => misura(l, CARATTERI.extra, corpo) <= largo)) break;
  }
  const interlinea = Math.round(corpo * 1.08);
  let base = y;
  for (const l of [...linee].reverse()) {
    testo(X, base, l, CARATTERI.extra, corpoProvato, "#ffffff");
    y = base;
    base -= interlinea;
  }
  y -= Math.round(corpo * 0.75) + 34;

  if (d.etichetta) {
    testo(X, y, d.etichetta.toUpperCase(), CARATTERI.extra, 32, ARANCIO, 5);
    y -= 70;
  }

  const frase = d.frase.toUpperCase();
  const pw = misuraSpaziata(frase, CARATTERI.extra, 34, 4, misura) + 64;
  const ph = 76;
  const py = y - ph + 14;
  testi.push({ k: "rett", x: X, y: py, w: pw, h: ph, rx: ph / 2, fill: ARANCIO });
  testo(X + 32, py + ph / 2 + 12, frase, CARATTERI.extra, 34, "#ffffff", 4);

  // La storia: il fondo, la foto ritagliata al centro, le sfumature, il logo, il testo.
  const inizio = Math.max(420, py - 360);
  const lw = 380;
  const e: Elemento[] = [
    { k: "rett", x: 0, y: 0, w: W, h: H, rx: 0, fill: SCURO },
    { k: "immagine", chi: "foto", x: 0, y: 0, w: W, h: H, allinea: "xMidYMid slice" },
    { k: "sfumatura", x: 0, y: 0, w: W, h: 520, stops: [[0, SCURO, 0.75], [1, SCURO, 0]] },
    { k: "sfumatura", x: 0, y: inizio, w: W, h: H - inizio, stops: [[0, SCURO, 0], [Math.min(0.95, (py - inizio) / (H - inizio)), SCURO, 0.86], [1, SCURO, 1]] },
    { k: "immagine", chi: "logo", x: X, y: 260, w: lw, h: lw / proporzioneLogo, allinea: "xMinYMin meet" },
    ...testi,
  ];
  return { larghezza: W, altezza: H, elementi: e };
}
