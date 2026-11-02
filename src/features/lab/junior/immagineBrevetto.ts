import { Platform } from "react-native";

import { t } from "../../../lib/lingua";
import { FORME, ALTEZZA as ALTEZZA_LOGO } from "../avvio/logo";
import type { FormatoImmagine } from "../fit/immagineSettimana";
import { F } from "../ui/tema";
import { indirizzoImmagine, LOGO_SCUOLA_NUOTO, personaggioDi } from "./personaggiBrevetti";

// Il diplomino del brevetto come immagine (02/11/2026, richiesta di Maurizio): «il bambino ha ottenuto il brevetto tal dei tali», da **condividere sui
// social** (e da stampare, se si vuole). Un PNG disegnato con un canvas, **solo sul web**, con lo stesso giro di «Il tuo mese» e «La tua settimana»
// (`condividiImmagine`): due formati, `feed` (1080 x 1350, 4:5) e `storia` (1080 x 1920, 9:16, con logo, contenuto e piede dentro la parte sicura). Sull'app nativa
// non si disegna una vista in un file senza un modulo nuovo: li' si condivide il testo. Niente passa da un server: l'immagine nasce e resta sul dispositivo.
//
// **La grafica e' quella dei diplomi del club** (il PDF «diplomi brevetti nuovi», 02/11/2026), rifatta **a misura di bambino piccolo (3-8 anni) e su fondo chiaro**:
// l'onda lilla e le bolle dei diplomi, il logo in alto (il pittogramma con «ATHLON 4.0 SCUOLA NUOTO»), il personaggio del brevetto (`personaggiBrevetti.ts`),
// il nome del brevetto in arancio e grande, «Livello N», e la foto del bambino in un cerchio con stelline e coriandoli. **Dentro ci sono nome e cognome
// e la foto del bambino: l'immagine la pubblica il genitore, non l'app**, e per questo la foto non e' mai ricavata da sola. Il solo punto da
// cambiare per ritoccare il disegno e' `immagineDiploma`.

const L = 1080;
const ALTEZZE: Record<FormatoImmagine, number> = { feed: 1350, storia: 1920 };
const MARGINE = 72;

// I colori: quelli del club (arancio del pittogramma, grigio scuro del logo) su un fondo quasi bianco con l'onda lilla dei diplomi.
const ARANCIO = "#FF6600";
const INCHIOSTRO = "#2B3350";
const GRIGIO = "#5A6380";
const ONDA = "#EDE6F0";
const BOLLE = "rgba(150,140,185,0.38)";

export const diplomaDisponibile = (): boolean => Platform.OS === "web" && typeof document !== "undefined";

const carattere = (famiglia: string, px: number) => `${px}px "${famiglia}", system-ui, -apple-system, sans-serif`;

export type DatiDiploma = {
  /** Nome e cognome del bambino («Sara Palermo»): su richiesta della regia, non il solo nome. */
  nome: string;
  /** «A2», o vuoto: non si disegna (sul diploma del club non c'e'). */
  codice: string;
  /** Il nome del brevetto senza il numero, nella lingua dell'app: «Stella Marina», in inglese «Starfish». */
  brevetto: string;
  /** Il nome italiano del brevetto («Stella Marina»): e' la chiave del personaggio. */
  chiave: string;
  /** La sigla del livello come la scrive il club («Livello M1»). */
  livello: string | null;
  /** «Scuola Nuoto Bambini». */
  corso: string;
  /** «12 novembre 2026», se si sa quando e' passato: altrimenti non si scrive nessuna data. */
  data: string | null;
  /** La foto (un indirizzo o un data URL), o null: restano le iniziali. */
  foto: string | null;
};

async function caricaFont(font: string[]) {
  try {
    await Promise.all(font.map((f) => document.fonts.load(`40px "${f}"`)));
  } catch {
    // Senza i caratteri del club si usa quello di sistema: l'immagine si fa lo stesso.
  }
}

/** Un'immagine pronta per il canvas, o null se non si carica (rete, o un indirizzo che non lascia disegnare). */
function caricaImmagine(url: string): Promise<HTMLImageElement | null> {
  return new Promise((risolvi) => {
    const img = new Image();
    // Senza questo il canvas si «sporca» con una foto di un altro indirizzo e `toBlob` non esce.
    img.crossOrigin = "anonymous";
    img.onload = () => risolvi(img);
    img.onerror = () => risolvi(null);
    img.src = url;
  });
}

function pittogramma(c: CanvasRenderingContext2D, x: number, y: number, scala: number, colore: string) {
  c.save();
  c.translate(x, y);
  c.scale(scala, scala);
  c.fillStyle = colore;
  for (const f of FORME) {
    c.beginPath();
    f.punti.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
    c.closePath();
    c.fill();
  }
  c.restore();
}

/** Una stellina a quattro punte, per i coriandoli. */
function stellina(c: CanvasRenderingContext2D, x: number, y: number, r: number, colore: string) {
  c.save();
  c.translate(x, y);
  c.fillStyle = colore;
  c.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i - Math.PI / 2;
    const raggio = i % 2 === 0 ? r : r * 0.38;
    c.lineTo(Math.cos(a) * raggio, Math.sin(a) * raggio);
  }
  c.closePath();
  c.fill();
  c.restore();
}

function bolla(c: CanvasRenderingContext2D, x: number, y: number, r: number) {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.strokeStyle = BOLLE;
  c.lineWidth = Math.max(2, r * 0.12);
  c.stroke();
}

/** Il testo piu' grande possibile (fino a `max` px) che sta nella larghezza data. */
function adatta(c: CanvasRenderingContext2D, testo: string, famiglia: string, max: number, larghezza: number): number {
  let px = max;
  c.font = carattere(famiglia, px);
  while (px > 40 && c.measureText(testo).width > larghezza) {
    px -= 4;
    c.font = carattere(famiglia, px);
  }
  return px;
}

/** Il PNG del diploma, o null se il browser non sa disegnarlo. */
export async function immagineDiploma(d: DatiDiploma, formato: FormatoImmagine = "feed"): Promise<Blob | null> {
  if (!diplomaDisponibile()) return null;
  await caricaFont([F.extra, F.bold, F.semi, F.medio]);
  const urlPersonaggio = (() => {
    const i = personaggioDi(d.chiave);
    return i ? indirizzoImmagine(i) : null;
  })();
  const urlLogo = indirizzoImmagine(LOGO_SCUOLA_NUOTO);
  const [foto, personaggio, logo] = await Promise.all([
    d.foto ? caricaImmagine(d.foto) : Promise.resolve(null),
    urlPersonaggio ? caricaImmagine(urlPersonaggio) : Promise.resolve(null),
    urlLogo ? caricaImmagine(urlLogo) : Promise.resolve(null),
  ]);
  const A = ALTEZZE[formato];
  const storia = formato === "storia";
  // Quanto scendono logo, contenuto e piede nella storia: le barre dell'app sociale coprono circa 250 punti in alto e in basso.
  const alLogo = storia ? 190 : 0;
  const alContenuto = storia ? 330 : 0;
  const alPiede = storia ? 190 : 0;

  const canvas = document.createElement("canvas");
  canvas.width = L;
  canvas.height = A;
  const c = canvas.getContext("2d");
  if (!c) return null;

  // Lo sfondo: bianco con un velo azzurro in alto, come l'acqua vista dall'alto.
  const fondo = c.createLinearGradient(0, 0, 0, A);
  fondo.addColorStop(0, "#EAF6FF");
  fondo.addColorStop(0.45, "#FFFFFF");
  fondo.addColorStop(1, "#FFFFFF");
  c.fillStyle = fondo;
  c.fillRect(0, 0, L, A);

  // L'onda lilla dei diplomi del club.
  const su = 400 + alContenuto * 0.7;
  const giu = 1130 + alContenuto * 0.85;
  c.beginPath();
  c.moveTo(0, su);
  c.bezierCurveTo(L * 0.28, su - 110, L * 0.58, su + 150, L, su + 30);
  c.lineTo(L, giu);
  c.bezierCurveTo(L * 0.72, giu + 120, L * 0.3, giu - 150, 0, giu - 30);
  c.closePath();
  c.fillStyle = ONDA;
  c.fill();

  // Le bolle.
  const bolle: [number, number, number][] = [
    [90, 120, 22], [170, 250, 9], [980, 300, 26], [1020, 200, 10], [60, 560, 16], [1010, 640, 18], [120, 1240, 24], [1000, 1180, 14], [520, 1290, 12], [880, 1280, 22],
  ];
  for (const [x, y, r] of bolle) bolla(c, x, y + (y > 500 ? alContenuto * 0.8 : alLogo * 0.6), r);

  // L'intestazione: il logo dei diplomi (il pittogramma con «ATHLON 4.0»), a sinistra. «Scuola Nuoto» sta nella frase sotto il nome, non da solo in alto.
  c.textBaseline = "alphabetic";
  let largLogo = 0;
  if (logo) {
    const hl = 104;
    largLogo = (logo.naturalWidth / logo.naturalHeight) * hl;
    c.drawImage(logo, MARGINE, 56 + alLogo, largLogo, hl);
  } else {
    pittogramma(c, MARGINE, 62 + alLogo, 100 / ALTEZZA_LOGO, ARANCIO);
    largLogo = 316 * (100 / ALTEZZA_LOGO) + 200;
    c.textAlign = "left";
    c.fillStyle = INCHIOSTRO;
    c.font = carattere(F.extra, 44);
    c.fillText("ATHLON 4.0", MARGINE + 316 * (100 / ALTEZZA_LOGO) + 24, 128 + alLogo);
  }
  if (d.data) {
    c.textAlign = "right";
    c.fillStyle = GRIGIO;
    c.font = carattere(F.semi, 27);
    c.fillText(`Roma, ${d.data}`, L - MARGINE, 100 + alLogo);
  }

  const y0 = alContenuto;

  // Coriandoli attorno alla foto e al personaggio.
  stellina(c, 80, 330 + y0, 26, "#FFC83D");
  stellina(c, 470, 300 + y0, 18, "#4CC3FF");
  stellina(c, 1010, 330 + y0, 24, "#FF8FB1");
  stellina(c, 520, 690 + y0, 20, "#FFC83D");
  stellina(c, 1000, 700 + y0, 16, "#4CC3FF");

  // La foto del bambino, in un cerchio con l'anello bianco e arancio e un'ombra morbida; senza foto, l'iniziale.
  const R = 150;
  const cx = 290;
  const cy = 490 + y0;
  c.save();
  c.shadowColor = "rgba(60,50,110,0.22)";
  c.shadowBlur = 36;
  c.shadowOffsetY = 12;
  c.beginPath();
  c.arc(cx, cy, R + 26, 0, Math.PI * 2);
  c.fillStyle = "#FFFFFF";
  c.fill();
  c.restore();
  c.beginPath();
  c.arc(cx, cy, R + 12, 0, Math.PI * 2);
  c.fillStyle = ARANCIO;
  c.fill();
  c.save();
  c.beginPath();
  c.arc(cx, cy, R, 0, Math.PI * 2);
  c.clip();
  if (foto) {
    // «cover»: il lato corto riempie il cerchio, il taglio sta sopra il centro dove stanno le facce.
    const lato = Math.min(foto.naturalWidth, foto.naturalHeight);
    const sx = (foto.naturalWidth - lato) / 2;
    const sy = Math.max(0, (foto.naturalHeight - lato) * 0.3);
    c.drawImage(foto, sx, sy, lato, lato, cx - R, cy - R, R * 2, R * 2);
  } else {
    c.fillStyle = "#FFE3CC";
    c.fillRect(cx - R, cy - R, R * 2, R * 2);
    c.fillStyle = ARANCIO;
    c.font = carattere(F.extra, 170);
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText((d.nome.trim()[0] ?? "").toUpperCase(), cx, cy + 8);
    c.textBaseline = "alphabetic";
  }
  c.restore();

  // Il personaggio del brevetto, grande a destra, con l'ombra lilla sotto come sui diplomi.
  const bx = 570;
  const bw = 440;
  const by = 292 + y0;
  const bh = 390;
  if (personaggio) {
    const rapporto = Math.min(bw / personaggio.naturalWidth, bh / personaggio.naturalHeight);
    const w = personaggio.naturalWidth * rapporto;
    const h = personaggio.naturalHeight * rapporto;
    const px = bx + (bw - w) / 2;
    const py = by + bh - h;
    c.beginPath();
    c.ellipse(bx + bw / 2, by + bh - 6, Math.min(w * 0.55, bw / 2), 20, 0, 0, Math.PI * 2);
    c.fillStyle = "rgba(150,130,190,0.22)";
    c.fill();
    c.drawImage(personaggio, px, py, w, h);
  }

  // Il testo: «Sara ha conseguito il brevetto di» e il nome del brevetto, grande e arancio.
  c.textAlign = "center";
  c.fillStyle = INCHIOSTRO;
  const pxNome = adatta(c, d.nome, F.extra, 104, L - MARGINE * 2);
  c.fillText(d.nome, L / 2, 800 + y0);
  void pxNome;
  c.fillStyle = GRIGIO;
  c.font = carattere(F.semi, 40);
  c.fillText(t("ha conseguito il brevetto della Scuola Nuoto", "has earned the Swim School badge"), L / 2, 868 + y0);
  c.fillStyle = ARANCIO;
  adatta(c, d.brevetto, F.extra, 150, L - MARGINE * 2);
  c.fillText(d.brevetto, L / 2, 1010 + y0);

  if (d.livello) {
    const testoLivello = t(`Livello ${d.livello}`, `Level ${d.livello}`);
    c.font = carattere(F.extra, 48);
    const wl = c.measureText(testoLivello).width + 72;
    c.beginPath();
    c.roundRect(L / 2 - wl / 2, 1046 + y0, wl, 78, 39);
    c.fillStyle = "#FFFFFF";
    c.fill();
    c.lineWidth = 5;
    c.strokeStyle = ARANCIO;
    c.stroke();
    c.fillStyle = INCHIOSTRO;
    c.fillText(testoLivello, L / 2, 1101 + y0);
  }

  // Il piede: il club e il suo tag a sinistra, la Direzione a destra.
  c.fillStyle = GRIGIO;
  c.font = carattere(F.medio, 26);
  c.textAlign = "left";
  c.fillText("athlonroma.it  ·  #AthlonRoma", MARGINE, A - 44 - alPiede);
  c.textAlign = "right";
  c.font = carattere(F.medio, 24);
  c.fillText(t("La Direzione Tecnico Sportiva", "The Technical & Sports Direction"), L - MARGINE, A - 44 - alPiede);

  return new Promise((risolvi) => canvas.toBlob((b) => risolvi(b), "image/png"));
}

/** Il testo che accompagna la condivisione (e che sull'app nativa e' tutta la condivisione). */
export function testoDiploma(d: DatiDiploma): string {
  const brevetto = d.livello ? `${d.brevetto} (${t(`livello ${d.livello}`, `level ${d.livello}`)})` : d.brevetto;
  return t(
    `${d.nome} ha conseguito il brevetto di ${brevetto} alla ${d.corso} di Athlon Roma! athlonroma.it #AthlonRoma`,
    `${d.nome} has earned the ${brevetto} badge at the Athlon Roma ${d.corso}! athlonroma.it #AthlonRoma`,
  );
}
