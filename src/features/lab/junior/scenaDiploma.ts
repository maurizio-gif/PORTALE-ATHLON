import { t } from "../../../lib/lingua";
import { CARATTERI, misuraTesto, type Elemento, type Misura, type Scena } from "../svg/scena";

import type { DatiDiploma } from "./immagineBrevetto";

// Il diplomino del brevetto **sull'app nativa** (09/11/2026, segnalazione di Maurizio dall'iPhone: «qui non si genera il diploma da app»). Sul web il diploma si
// disegna con un canvas (`immagineBrevetto.ts`), che sul telefono non c'e': li' si condivideva solo il testo. Qui lo stesso disegno e' una **scena**: un elenco di
// forme con le coordinate gia' calcolate (1080 punti di larghezza, 1350 o 1920 di altezza). `DiplomaSvg.tsx` la disegna con `react-native-svg` (che l'app ha gia'; il disegno e' `svg/ScenaSvg.tsx`)
// e ne ricava il PNG con `toDataURL`: nessun modulo nativo nuovo, quindi arriva con un aggiornamento (OTA), senza una build dello store.
//
// **E' una copia dell'impaginazione del canvas**, e va tenuta in pari: stesse misure (l'oggetto `G`), stesso ordine di disegno, stessi colori. Il testo non si puo'
// misurare con un canvas: la misura viene dalla tabella dei caratteri di Plus Jakarta Sans (`svg/larghezzeFont.ts`, generata da `scripts/larghezze-font-svg.py`).
// Differenze volute dal canvas: le ombre morbide sono qualche cerchio traslucido (react-native-svg non ha il filtro sfocato che serve), e la foto si ritaglia dall'alto
// (`xMidYMin slice`) invece che al 30% dell'altezza.
//
// Le forme e la misura del testo sono quelle condivise (`svg/scena.ts`); il file e' puro (non importa nulla di React Native): si prova da Node, con lo stesso disegno dentro un browser.

export type FormatoDiploma = "feed" | "storia";

export const LARGHEZZA = 1080;
const ALTEZZE: Record<FormatoDiploma, number> = { feed: 1350, storia: 1920 };
const MARGINE = 72;

// Gli stessi colori del canvas.
const ARANCIO = "#FF6600";
const INCHIOSTRO = "#2B3350";
const GRIGIO = "#5A6380";
const ONDA = "#EDE6F0";
const BOLLE = "rgba(150,140,185,0.38)";

/** Le proporzioni delle due immagini del club (larghezza / altezza), che l'impaginazione deve conoscere. `personaggio` e' null se il brevetto non ha il suo animale. */
export type Proporzioni = { logo: number; personaggio: number | null };

const stellina = (x: number, y: number, r: number): string => {
  const punti: string[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i - Math.PI / 2;
    const raggio = i % 2 === 0 ? r : r * 0.38;
    punti.push(`${(x + Math.cos(a) * raggio).toFixed(1)} ${(y + Math.sin(a) * raggio).toFixed(1)}`);
  }
  return `M ${punti.join(" L ")} Z`;
};

export function scenaDiploma(d: DatiDiploma, formato: FormatoDiploma, proporzioni: Proporzioni, misura: Misura = misuraTesto): Scena {
  const L = LARGHEZZA;
  const A = ALTEZZE[formato];
  const storia = formato === "storia";
  // Le misure di ogni formato: le stesse del canvas.
  const G = storia
    ? { logoY: 170, logoH: 112, R: 168, nomePx: 112, subPx: 42, brevPx: 160, pillH: 78, pillPx: 48, proveFont: 40, titoloPx: 42, pad: 44, colonneDa: 6, footerY: A - 130 }
    : { logoY: 56, logoH: 104, R: 118, nomePx: 92, subPx: 36, brevPx: 130, pillH: 70, pillPx: 44, proveFont: 34, titoloPx: 36, pad: 36, colonneDa: 5, footerY: A - 44 };

  /** Il corpo piu' grande (fino a `max`) in cui il testo sta nella larghezza data. */
  const adatta = (testo: string, famiglia: string, max: number, larghezza: number): number => {
    let px = max;
    while (px > 40 && misura(testo, famiglia, px) > larghezza) px -= 4;
    return px;
  };
  /** Il testo spezzato in righe che stanno nella larghezza data. Una parola piu' lunga della riga sta da sola. */
  const avvolgi = (testo: string, famiglia: string, px: number, larghezzaMax: number): string[] => {
    const righe: string[] = [];
    let riga = "";
    for (const parola of testo.split(" ")) {
      const prova = riga ? `${riga} ${parola}` : parola;
      if (!riga || misura(prova, famiglia, px) <= larghezzaMax) riga = prova;
      else {
        righe.push(riga);
        riga = parola;
      }
    }
    if (riga) righe.push(riga);
    return righe;
  };

  // --- Il riquadro delle prove, misurato prima di disegnare: la sua altezza decide lo spazio per il resto.
  const prove = d.prove.slice(0, 8);
  const colonne = prove.length >= G.colonneDa ? 2 : 1;
  const largPannello = L - MARGINE * 2;
  const largColonna = (largPannello - G.pad * 2 - (colonne === 2 ? 40 : 0)) / colonne;
  const calcolaPannello = (px: number) => {
    const voci = prove.map((p) => avvolgi(p, CARATTERI.medio, px, largColonna - px * 1.6).slice(0, 3));
    const hVoce = (v: string[]) => v.length * px * 1.28 + px * 0.55;
    const meta = Math.ceil(voci.length / colonne);
    const cols = colonne === 2 ? [voci.slice(0, meta), voci.slice(meta)] : [voci];
    const hCol = cols.map((col) => col.reduce((a, v) => a + hVoce(v), 0));
    const titoloH = G.titoloPx * 1.9;
    return { px, cols, hVoce, titoloH, h: G.pad * 2 + titoloH + Math.max(...hCol) - px * 0.4 };
  };
  let pannello = prove.length ? calcolaPannello(G.proveFont) : null;

  // --- I blocchi, dall'alto: la testata, la foto con il personaggio, il nome, il brevetto, le prove; poi il piede.
  const sotto = G.logoY + G.logoH;
  const limite = G.footerY - 48;
  const hHero = 2 * (G.R + 26);
  const hNome = G.nomePx * 0.85 + G.subPx * 1.7 + 6;
  const hBrev = G.brevPx * 0.8 + 28 + G.pillH;
  const spazio = () => limite - sotto - (hHero + hNome + hBrev + (pannello?.h ?? 0));
  while (pannello && pannello.px > 26 && spazio() < 5 * 18) pannello = calcolaPannello(pannello.px - 2);
  const nVuoti = pannello ? 5 : 4;
  const vuoto = Math.max(14, Math.min(spazio() / nVuoti, 100));
  const avanzo = Math.max(0, spazio() - vuoto * nVuoti);
  const heroTop = sotto + vuoto + avanzo / 2;
  const nomeTop = heroTop + hHero + vuoto;
  const brevTop = nomeTop + hNome + vuoto;
  const panelTop = brevTop + hBrev + vuoto;

  const e: Elemento[] = [];

  // Lo sfondo: bianco con un velo azzurro in alto, come l'acqua vista dall'alto.
  e.push({ k: "sfumatura", x: 0, y: 0, w: L, h: A, stops: [[0, "#EAF6FF", 1], [0.45, "#FFFFFF", 1], [1, "#FFFFFF", 1]] });

  // L'onda lilla dei diplomi del club: dietro la foto e il personaggio, giu' fino a meta' del riquadro delle prove (o del livello, senza prove).
  const su = heroTop + hHero * 0.45;
  const giu = pannello ? panelTop + pannello.h * 0.4 : brevTop + hBrev + vuoto * 0.5;
  e.push({
    k: "path",
    d: `M 0 ${su} C ${L * 0.28} ${su - 110} ${L * 0.58} ${su + 150} ${L} ${su + 30} L ${L} ${giu} C ${L * 0.72} ${giu + 120} ${L * 0.3} ${giu - 150} 0 ${giu - 30} Z`,
    fill: ONDA,
  });

  // Le bolle, sparse su tutta l'altezza; in basso fra le due scritte del piede e ai bordi, mai sopra il testo.
  const bolle: [number, number, number][] = [
    [90, 0.07 * A, 22], [170, 0.17 * A, 9], [980, 0.2 * A, 26], [1020, 0.13 * A, 10], [60, 0.38 * A, 16], [1010, 0.43 * A, 18],
    [560, G.footerY - 10, 12], [1040, G.footerY - 80, 14], [40, G.footerY - 90, 18],
  ];
  for (const [x, y, r] of bolle) e.push({ k: "cerchio", cx: x, cy: y, r, stroke: BOLLE, sw: Math.max(2, r * 0.12) });

  // L'intestazione: il logo dei diplomi, a sinistra, e a destra la data.
  const largLogo = proporzioni.logo * G.logoH;
  e.push({ k: "immagine", chi: "logo", x: MARGINE, y: G.logoY, w: largLogo, h: G.logoH, allinea: "xMinYMid meet" });
  if (d.data) e.push({ k: "testo", x: L - MARGINE, y: G.logoY + G.logoH * 0.5, testo: `Roma, ${d.data}`, famiglia: CARATTERI.semi, px: 27, fill: GRIGIO, ancora: "end" });

  // Coriandoli attorno alla foto e al personaggio.
  const R = G.R;
  const cx = MARGINE + 40 + R + 26;
  const cy = heroTop + hHero / 2;
  const coriandoli: [number, number, number, string][] = [
    [80, heroTop + hHero * 0.1, 26, "#FFC83D"],
    [cx + R + 70, heroTop - 10, 18, "#4CC3FF"],
    [1010, heroTop + hHero * 0.15, 24, "#FF8FB1"],
    [cx + R + 40, heroTop + hHero + 6, 20, "#FFC83D"],
    [1000, heroTop + hHero + 10, 16, "#4CC3FF"],
  ];
  for (const [x, y, r, fill] of coriandoli) e.push({ k: "path", d: stellina(x, y, r), fill });

  // La foto del bambino, in un cerchio con l'anello bianco e arancio e un'ombra morbida (qualche cerchio traslucido, sfumato verso l'esterno).
  for (let i = 6; i >= 1; i--) e.push({ k: "cerchio", cx, cy: cy + 12, r: R + 26 + i * 6, fill: "rgba(60,50,110,0.032)" });
  e.push({ k: "cerchio", cx, cy, r: R + 26, fill: "#FFFFFF" });
  e.push({ k: "cerchio", cx, cy, r: R + 12, fill: ARANCIO });
  // Sotto la foto c'e' sempre l'iniziale: se la foto manca (o non si carica) resta quella.
  e.push({ k: "cerchio", cx, cy, r: R, fill: "#FFE3CC" });
  const iniziale = (d.nome.trim()[0] ?? "").toUpperCase();
  const pxIniziale = R * 1.13;
  if (iniziale) e.push({ k: "testo", x: cx, y: cy + 8 + pxIniziale * 0.36, testo: iniziale, famiglia: CARATTERI.extra, px: pxIniziale, fill: ARANCIO, ancora: "middle" });
  if (d.foto) e.push({ k: "immagine", chi: "foto", x: cx - R, y: cy - R, w: R * 2, h: R * 2, allinea: "xMidYMin slice", ritaglio: { cx, cy, r: R } });

  // Il personaggio del brevetto, grande a destra, con l'ombra lilla sotto come sui diplomi.
  if (proporzioni.personaggio) {
    const bw = storia ? 470 : 440;
    const bh = hHero + 40;
    const bx = L - MARGINE - bw + 10;
    const by = heroTop + hHero + 6 - bh;
    // Il personaggio sta nel riquadro in basso e al centro, intero («meet»): la sua larghezza vera serve solo all'ombra.
    const w = Math.min(bw, bh * proporzioni.personaggio);
    e.push({ k: "ellisse", cx: bx + bw / 2, cy: by + bh - 6, rx: Math.min(w * 0.55, bw / 2), ry: 20, fill: "rgba(150,130,190,0.22)" });
    e.push({ k: "immagine", chi: "personaggio", x: bx, y: by, w: bw, h: bh, allinea: "xMidYMax meet" });
  }

  // Il testo: «Sara Palermo ha conseguito il brevetto di» e il nome del brevetto, grande e arancio.
  const pxNome = adatta(d.nome, CARATTERI.extra, G.nomePx, L - MARGINE * 2);
  const yNome = nomeTop + G.nomePx * 0.85;
  e.push({ k: "testo", x: L / 2, y: yNome, testo: d.nome, famiglia: CARATTERI.extra, px: pxNome, fill: INCHIOSTRO, ancora: "middle" });
  e.push({
    k: "testo",
    x: L / 2,
    y: yNome + G.subPx * 1.7,
    testo: t("ha conseguito il brevetto della Scuola Nuoto", "has earned the Swim School badge"),
    famiglia: CARATTERI.semi,
    px: G.subPx,
    fill: GRIGIO,
    ancora: "middle",
  });
  const pxBrev = adatta(d.brevetto, CARATTERI.extra, G.brevPx, L - MARGINE * 2);
  const yBrev = brevTop + G.brevPx * 0.8;
  e.push({ k: "testo", x: L / 2, y: yBrev, testo: d.brevetto, famiglia: CARATTERI.extra, px: pxBrev, fill: ARANCIO, ancora: "middle" });

  if (d.livello) {
    const testoLivello = t(`Livello ${d.livello}`, `Level ${d.livello}`);
    const wl = misura(testoLivello, CARATTERI.extra, G.pillPx) + 72;
    const yPillola = yBrev + 28;
    e.push({ k: "rett", x: L / 2 - wl / 2, y: yPillola, w: wl, h: G.pillH, rx: G.pillH / 2, fill: "#FFFFFF", stroke: ARANCIO, sw: 5 });
    e.push({ k: "testo", x: L / 2, y: yPillola + G.pillH * 0.7, testo: testoLivello, famiglia: CARATTERI.extra, px: G.pillPx, fill: INCHIOSTRO, ancora: "middle" });
  }

  // Le prove eseguite: un riquadro bianco con la spunta verde accanto a ognuna. Con due colonne la prima meta' sta a sinistra, come si legge.
  if (pannello) {
    for (let i = 5; i >= 1; i--) {
      e.push({ k: "rett", x: MARGINE - i * 5, y: panelTop + 8 - i * 5, w: largPannello + i * 10, h: pannello.h + i * 10, rx: 36 + i * 5, fill: "rgba(60,50,110,0.028)" });
    }
    e.push({ k: "rett", x: MARGINE, y: panelTop, w: largPannello, h: pannello.h, rx: 36, fill: "rgba(255,255,255,0.94)", stroke: "rgba(150,140,185,0.35)", sw: 3 });
    e.push({ k: "testo", x: MARGINE + G.pad, y: panelTop + G.pad + G.titoloPx * 0.95, testo: t("Prove superate", "Tests passed"), famiglia: CARATTERI.extra, px: G.titoloPx, fill: INCHIOSTRO, ancora: "start" });
    const px = pannello.px;
    pannello.cols.forEach((col, k) => {
      let y = panelTop + G.pad + pannello!.titoloH;
      const x = MARGINE + G.pad + k * (largColonna + 40);
      for (const voce of col) {
        const r = px * 0.5;
        e.push({ k: "cerchio", cx: x + r, cy: y + px * 0.62, r, fill: "#16A34A" });
        e.push({
          k: "path",
          d: `M ${x + r * 0.5} ${y + px * 0.62} L ${x + r * 0.9} ${y + px * 0.62 + r * 0.42} L ${x + r * 1.55} ${y + px * 0.62 - r * 0.42}`,
          stroke: "#FFFFFF",
          sw: Math.max(3, px * 0.1),
          cap: "round",
          join: "round",
        });
        voce.forEach((riga, n) => e.push({ k: "testo", x: x + px * 1.2, y: y + px * 0.95 + n * px * 1.28, testo: riga, famiglia: CARATTERI.medio, px, fill: INCHIOSTRO, ancora: "start" }));
        y += pannello!.hVoce(voce);
      }
    });
  }

  // Il piede: il club e il suo tag a sinistra, la Direzione a destra.
  e.push({ k: "testo", x: MARGINE, y: G.footerY, testo: "athlonroma.it  ·  #AthlonRoma", famiglia: CARATTERI.medio, px: 26, fill: GRIGIO, ancora: "start" });
  e.push({
    k: "testo",
    x: L - MARGINE,
    y: G.footerY,
    testo: t("La Direzione Tecnico Sportiva", "The Technical & Sports Direction"),
    famiglia: CARATTERI.medio,
    px: 24,
    fill: GRIGIO,
    ancora: "end",
  });

  return { larghezza: L, altezza: A, elementi: e };
}
