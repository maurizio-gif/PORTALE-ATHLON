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
//
// **Le prove eseguite** (03/11/2026, richiesta di Maurizio): sotto il nome del brevetto un riquadro «Prove superate» elenca le prove di quel livello, ognuna con la sua spunta.
// **L'impaginazione e' calcolata, non fissa**: i blocchi (testata, foto e personaggio, nome, brevetto, prove) hanno la loro altezza e lo spazio che avanza fra la testata e il piede si
// divide fra i vuoti, con un tetto, e se resta altro il contenuto si centra. Per questo la storia non lascia piu' un vuoto in alto e uno in basso come quando le posizioni erano fisse
// (i margini sono scesi da 246 e 234 a 170 e 130 punti; la barra dell'app sociale copre ancora l'alto e il basso, ma il logo e il piede restano leggibili). Un riquadro con
// molte prove, o prove lunghe, scende di corpo (a 26 punti al minimo) prima di togliere spazio agli altri blocchi.

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
  /** Le prove del brevetto, nella lingua dell'app: stanno sul diploma con la spunta («Prove superate»). Vuoto se non si sa quali siano: allora non si disegna il riquadro. */
  prove: string[];
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

/** Il testo spezzato in righe che stanno nella larghezza data (il font e' quello gia' impostato sul contesto). Una parola piu' lunga della riga sta da sola. */
function avvolgi(c: CanvasRenderingContext2D, testo: string, larghezzaMax: number): string[] {
  const righe: string[] = [];
  let riga = "";
  for (const parola of testo.split(" ")) {
    const prova = riga ? `${riga} ${parola}` : parola;
    if (!riga || c.measureText(prova).width <= larghezzaMax) riga = prova;
    else {
      righe.push(riga);
      riga = parola;
    }
  }
  if (riga) righe.push(riga);
  return righe;
}

/** Il PNG del diploma, o null se il browser non sa disegnarlo. */
export async function immagineDiploma(d: DatiDiploma, formato: FormatoImmagine = "feed"): Promise<Blob | null> {
  if (!diplomaDisponibile()) return null;
  await caricaFont([F.extra, F.bold, F.semi, F.medio]);
  const A = ALTEZZE[formato];
  const storia = formato === "storia";
  // Le misure di ogni formato. Il resto (dove stanno i blocchi) si calcola sotto.
  const G = storia
    ? { logoY: 170, logoH: 112, R: 168, nomePx: 112, subPx: 42, brevPx: 160, pillH: 78, pillPx: 48, proveFont: 40, titoloPx: 42, pad: 44, colonneDa: 6, footerY: A - 130 }
    : { logoY: 56, logoH: 104, R: 118, nomePx: 92, subPx: 36, brevPx: 130, pillH: 70, pillPx: 44, proveFont: 34, titoloPx: 36, pad: 36, colonneDa: 5, footerY: A - 44 };

  const canvas = document.createElement("canvas");
  canvas.width = L;
  canvas.height = A;
  const c = canvas.getContext("2d");
  if (!c) return null;
  c.textBaseline = "alphabetic";

  // --- Il riquadro delle prove, misurato prima di disegnare: la sua altezza decide lo spazio per il resto.
  const prove = d.prove.slice(0, 8);
  const colonne = prove.length >= G.colonneDa ? 2 : 1;
  const largPannello = L - MARGINE * 2;
  const largColonna = (largPannello - G.pad * 2 - (colonne === 2 ? 40 : 0)) / colonne;
  const misura = (px: number) => {
    c.font = carattere(F.medio, px);
    const voci = prove.map((p) => avvolgi(c, p, largColonna - px * 1.6).slice(0, 3));
    const hVoce = (v: string[]) => v.length * px * 1.28 + px * 0.55;
    const meta = Math.ceil(voci.length / colonne);
    const cols = colonne === 2 ? [voci.slice(0, meta), voci.slice(meta)] : [voci];
    const hCol = cols.map((col) => col.reduce((a, v) => a + hVoce(v), 0));
    const titoloH = G.titoloPx * 1.9;
    // Senza il respiro che ogni voce lascia sotto di se': dopo l'ultima ci pensa il margine del riquadro.
    return { px, cols, hVoce, titoloH, h: G.pad * 2 + titoloH + Math.max(...hCol) - px * 0.4 };
  };
  let pannello = prove.length ? misura(G.proveFont) : null;

  // --- I blocchi, dall'alto: la testata, la foto con il personaggio, il nome, il brevetto, le prove; poi il piede.
  const sotto = G.logoY + G.logoH;
  const limite = G.footerY - 48;
  const hHero = 2 * (G.R + 26);
  const hNome = G.nomePx * 0.85 + G.subPx * 1.7 + 6;
  const hBrev = G.brevPx * 0.8 + 28 + G.pillH;
  const spazio = () => limite - sotto - (hHero + hNome + hBrev + (pannello?.h ?? 0));
  // Se il riquadro non lascia nemmeno un respiro agli altri, scende di corpo.
  while (pannello && pannello.px > 26 && spazio() < 5 * 18) pannello = misura(pannello.px - 2);
  const nVuoti = pannello ? 5 : 4;
  const vuoto = Math.max(14, Math.min(spazio() / nVuoti, 100));
  const avanzo = Math.max(0, spazio() - vuoto * nVuoti);
  const heroTop = sotto + vuoto + avanzo / 2;
  const nomeTop = heroTop + hHero + vuoto;
  const brevTop = nomeTop + hNome + vuoto;
  const panelTop = brevTop + hBrev + vuoto;

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

  // Lo sfondo: bianco con un velo azzurro in alto, come l'acqua vista dall'alto.
  const fondo = c.createLinearGradient(0, 0, 0, A);
  fondo.addColorStop(0, "#EAF6FF");
  fondo.addColorStop(0.45, "#FFFFFF");
  fondo.addColorStop(1, "#FFFFFF");
  c.fillStyle = fondo;
  c.fillRect(0, 0, L, A);

  // L'onda lilla dei diplomi del club: dietro la foto e il personaggio, giu' fino a meta' del riquadro delle prove (o del livello, senza prove).
  const su = heroTop + hHero * 0.45;
  const giu = pannello ? panelTop + pannello.h * 0.4 : brevTop + hBrev + vuoto * 0.5;
  c.beginPath();
  c.moveTo(0, su);
  c.bezierCurveTo(L * 0.28, su - 110, L * 0.58, su + 150, L, su + 30);
  c.lineTo(L, giu);
  c.bezierCurveTo(L * 0.72, giu + 120, L * 0.3, giu - 150, 0, giu - 30);
  c.closePath();
  c.fillStyle = ONDA;
  c.fill();

  // Le bolle, sparse su tutta l'altezza.
  const bolle: [number, number, number][] = [
    [90, 0.07, 22], [170, 0.17, 9], [980, 0.2, 26], [1020, 0.13, 10], [60, 0.38, 16], [1010, 0.43, 18],
  ];
  for (const [x, y, r] of bolle) bolla(c, x, y * A, r);
  // In basso le bolle stanno fra le due scritte del piede e ai bordi, mai sopra il testo.
  for (const [x, y, r] of [[560, G.footerY - 10, 12], [1040, G.footerY - 80, 14], [40, G.footerY - 90, 18]] as const) bolla(c, x, y, r);

  // L'intestazione: il logo dei diplomi (il pittogramma con «ATHLON 4.0»), a sinistra. «Scuola Nuoto» sta nella frase sotto il nome, non da solo in alto.
  let largLogo = 0;
  if (logo) {
    largLogo = (logo.naturalWidth / logo.naturalHeight) * G.logoH;
    c.drawImage(logo, MARGINE, G.logoY, largLogo, G.logoH);
  } else {
    pittogramma(c, MARGINE, G.logoY + 6, 100 / ALTEZZA_LOGO, ARANCIO);
    largLogo = 316 * (100 / ALTEZZA_LOGO) + 200;
    c.textAlign = "left";
    c.fillStyle = INCHIOSTRO;
    c.font = carattere(F.extra, 44);
    c.fillText("ATHLON 4.0", MARGINE + 316 * (100 / ALTEZZA_LOGO) + 24, G.logoY + 72);
  }
  if (d.data) {
    c.textAlign = "right";
    c.fillStyle = GRIGIO;
    c.font = carattere(F.semi, 27);
    c.fillText(`Roma, ${d.data}`, L - MARGINE, G.logoY + G.logoH * 0.5);
  }

  // Coriandoli attorno alla foto e al personaggio.
  const cx = MARGINE + 40 + G.R + 26;
  const cy = heroTop + hHero / 2;
  stellina(c, 80, heroTop + hHero * 0.1, 26, "#FFC83D");
  stellina(c, cx + G.R + 70, heroTop - 10, 18, "#4CC3FF");
  stellina(c, 1010, heroTop + hHero * 0.15, 24, "#FF8FB1");
  stellina(c, cx + G.R + 40, heroTop + hHero + 6, 20, "#FFC83D");
  stellina(c, 1000, heroTop + hHero + 10, 16, "#4CC3FF");

  // La foto del bambino, in un cerchio con l'anello bianco e arancio e un'ombra morbida; senza foto, l'iniziale.
  const R = G.R;
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
    c.font = carattere(F.extra, R * 1.13);
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText((d.nome.trim()[0] ?? "").toUpperCase(), cx, cy + 8);
    c.textBaseline = "alphabetic";
  }
  c.restore();

  // Il personaggio del brevetto, grande a destra, con l'ombra lilla sotto come sui diplomi.
  const bw = storia ? 470 : 440;
  const bh = hHero + 40;
  const bx = L - MARGINE - bw + 10;
  const by = heroTop + hHero + 6 - bh;
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

  // Il testo: «Sara Palermo ha conseguito il brevetto di» e il nome del brevetto, grande e arancio.
  c.textAlign = "center";
  c.fillStyle = INCHIOSTRO;
  adatta(c, d.nome, F.extra, G.nomePx, L - MARGINE * 2);
  const yNome = nomeTop + G.nomePx * 0.85;
  c.fillText(d.nome, L / 2, yNome);
  c.fillStyle = GRIGIO;
  c.font = carattere(F.semi, G.subPx);
  c.fillText(t("ha conseguito il brevetto della Scuola Nuoto", "has earned the Swim School badge"), L / 2, yNome + G.subPx * 1.7);
  c.fillStyle = ARANCIO;
  adatta(c, d.brevetto, F.extra, G.brevPx, L - MARGINE * 2);
  const yBrev = brevTop + G.brevPx * 0.8;
  c.fillText(d.brevetto, L / 2, yBrev);

  if (d.livello) {
    const testoLivello = t(`Livello ${d.livello}`, `Level ${d.livello}`);
    c.font = carattere(F.extra, G.pillPx);
    const wl = c.measureText(testoLivello).width + 72;
    const yPillola = yBrev + 28;
    c.beginPath();
    c.roundRect(L / 2 - wl / 2, yPillola, wl, G.pillH, G.pillH / 2);
    c.fillStyle = "#FFFFFF";
    c.fill();
    c.lineWidth = 5;
    c.strokeStyle = ARANCIO;
    c.stroke();
    c.fillStyle = INCHIOSTRO;
    c.fillText(testoLivello, L / 2, yPillola + G.pillH * 0.7);
  }

  // Le prove eseguite: un riquadro bianco con la spunta verde accanto a ognuna. Con due colonne la prima meta' sta a sinistra, come si legge.
  if (pannello) {
    c.save();
    c.shadowColor = "rgba(60,50,110,0.14)";
    c.shadowBlur = 28;
    c.shadowOffsetY = 8;
    c.beginPath();
    c.roundRect(MARGINE, panelTop, largPannello, pannello.h, 36);
    c.fillStyle = "rgba(255,255,255,0.94)";
    c.fill();
    c.restore();
    c.lineWidth = 3;
    c.strokeStyle = "rgba(150,140,185,0.35)";
    c.stroke();
    c.textAlign = "left";
    c.fillStyle = INCHIOSTRO;
    c.font = carattere(F.extra, G.titoloPx);
    c.fillText(t("Prove superate", "Tests passed"), MARGINE + G.pad, panelTop + G.pad + G.titoloPx * 0.95);
    const px = pannello.px;
    pannello.cols.forEach((col, k) => {
      let y = panelTop + G.pad + pannello!.titoloH;
      const x = MARGINE + G.pad + k * (largColonna + 40);
      for (const voce of col) {
        const r = px * 0.5;
        c.beginPath();
        c.arc(x + r, y + px * 0.62, r, 0, Math.PI * 2);
        c.fillStyle = "#16A34A";
        c.fill();
        c.beginPath();
        c.moveTo(x + r * 0.5, y + px * 0.62);
        c.lineTo(x + r * 0.9, y + px * 0.62 + r * 0.42);
        c.lineTo(x + r * 1.55, y + px * 0.62 - r * 0.42);
        c.lineWidth = Math.max(3, px * 0.1);
        c.lineCap = "round";
        c.lineJoin = "round";
        c.strokeStyle = "#FFFFFF";
        c.stroke();
        c.fillStyle = INCHIOSTRO;
        c.font = carattere(F.medio, px);
        voce.forEach((riga, n) => c.fillText(riga, x + px * 1.2, y + px * 0.95 + n * px * 1.28));
        y += pannello!.hVoce(voce);
      }
    });
  }

  // Il piede: il club e il suo tag a sinistra, la Direzione a destra.
  c.fillStyle = GRIGIO;
  c.font = carattere(F.medio, 26);
  c.textAlign = "left";
  c.fillText("athlonroma.it  ·  #AthlonRoma", MARGINE, G.footerY);
  c.textAlign = "right";
  c.font = carattere(F.medio, 24);
  c.fillText(t("La Direzione Tecnico Sportiva", "The Technical & Sports Direction"), L - MARGINE, G.footerY);

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
