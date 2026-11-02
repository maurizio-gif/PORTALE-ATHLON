import { t } from "../../../lib/lingua";
import { conseguiti, LIVELLI, NOMI_CICLO, nomeLivello, type LivelloBrevetto } from "./datiBrevetti";

// Il libretto dei brevetti come documento da stampare o salvare in PDF (02/11/2026, richiesta di Maurizio: «una sorta di libretto che possono sfogliare, scaricarsi in PDF»).
// **Puro** (si prova con `npx tsx`): produce una pagina HTML A5 in verticale, una pagina per foglio: la copertina del libretto del club (le fasce nere e arancio,
// il logo, «Questo e' il libretto di»), «Il brevetto» (come funziona), **una pagina per ognuno dei dodici livelli** e la pagina finale. Su ogni livello: il
// personaggio, «Brevetto conseguito» o «Da conseguire», le **prove** (con la spunta dove il livello e' conseguito) e il **programma**. I livelli sono progressivi: quelli
// fino al livello di adesso sono conseguiti. Sul libretto stampato ci sono anche giudizi, date e firme (S, B, O, DM): qui **non ci sono, perche' PerfectGym non li ha**.
// Le immagini (logo, personaggi, foto) sono indirizzi gia' completi: li risolve chi stampa (`esportaLibretto.ts`).

export type DatiLibretto = {
  /** Nome e cognome del bambino. */
  nome: string;
  /** La sigla del livello di adesso («M1»). */
  codice: string;
  /** La foto del bambino (un indirizzo), o null. */
  foto: string | null;
  /** L'indirizzo del logo («pittogramma ATHLON 4.0»), o null. */
  logo: string | null;
  /** L'indirizzo del personaggio di ogni brevetto, per nome («Stella Marina»). */
  personaggi: Record<string, string | null>;
  /** Il giorno in cui si stampa, «12 novembre 2026». */
  data: string;
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const STILE = `
@page { size: 148mm 210mm; margin: 0 }
* { box-sizing: border-box }
body { margin: 0; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; color: #231F20; -webkit-print-color-adjust: exact; print-color-adjust: exact }
.p { width: 148mm; height: 210mm; position: relative; overflow: hidden; page-break-after: always; break-after: page; padding: 12mm 13mm 10mm; background: #fff }
.p:last-child { page-break-after: auto; break-after: auto }
.fascia { position: absolute; left: 0; right: 0; height: 7mm; background: linear-gradient(#231F20 0 60%, #FF5500 60% 100%) }
.fascia.su { top: 5mm } .fascia.giu { bottom: 5mm; transform: scaleY(-1) }
.onda { position: absolute; left: -10mm; right: -10mm; bottom: 28mm; height: 70mm; background: #EDE6F0; border-radius: 60% 40% 0 0 / 40% 30% 0 0 }
.centro { text-align: center }
.logo { height: 26mm; margin-top: 18mm }
.sn { color: #FF5500; font-size: 9mm; font-weight: 900; letter-spacing: .5mm; margin: 12mm 0 10mm }
.piccolo { font-size: 3mm; font-weight: 800; letter-spacing: .3mm }
.nome { margin: 4mm auto 0; width: 98mm; border: .5mm solid #FF5500; border-radius: 4mm; padding: 5mm 4mm; font-size: 6mm; font-weight: 800; box-shadow: 1.2mm 1.2mm 0 #EDE6F0 }
.foto { width: 38mm; height: 38mm; border-radius: 50%; object-fit: cover; border: 1.2mm solid #FF5500; margin: 0 auto 6mm; display: block }
.foto.vuota { border: .6mm dashed #FF5500; background: #FFF3EA; color: #FF5500; font-weight: 900; font-size: 4mm; display: flex; align-items: center; justify-content: center }
.indirizzo { position: absolute; left: 0; right: 0; bottom: 18mm; text-align: center; font-size: 3mm; font-style: italic; font-weight: 700 }
h1 { color: #FF5500; font-size: 7.5mm; margin: 4mm 0 4mm; line-height: 1.1 }
h2 { font-size: 4mm; margin: 0 0 1.5mm; color: #2B3350 }
p { font-size: 3.5mm; line-height: 1.45; margin: 0 0 3mm }
.ciclo { margin: 0 0 3.5mm; padding: 3mm 4mm; border-radius: 3mm; background: #EDE6F0 }
.ciclo b { color: #FF5500 }
.stato { display: inline-block; padding: 1mm 4mm; border-radius: 99mm; font-size: 3.2mm; font-weight: 800 }
.si { background: #DDF4E4; color: #16803C } .no { background: #EDE6F0; color: #5A6380 }
.testa { display: flex; justify-content: space-between; align-items: flex-start; gap: 4mm }
.sigla { background: #FF5500; color: #fff; font-weight: 900; font-size: 6mm; padding: 1.5mm 4mm; border-radius: 3mm }
.pers { height: 32mm; display: block; margin: 2mm auto 1mm; object-fit: contain }
ul { list-style: none; padding: 0; margin: 0 0 3mm }
li { font-size: 3.4mm; line-height: 1.3; padding: 1.1mm 0 1.1mm 7mm; position: relative; border-bottom: .2mm solid #E6E1EA }
li:before { content: ""; position: absolute; left: 0; top: 1.5mm; width: 3.8mm; height: 3.8mm; border: .4mm solid #9A93B0; border-radius: 50% }
.ok li:before { background: #16803C; border-color: #16803C; content: "✓"; color: #fff; font-size: 2.8mm; line-height: 3mm; text-align: center }
.prog li { font-size: 3mm; line-height: 1.25; border: 0; padding: .45mm 0 .45mm 5mm; color: #3F4660 }
.prog li:before { content: "•"; border: 0; top: .3mm; width: auto; height: auto; color: #FF5500; font-size: 4mm; line-height: 3.6mm }
.fine { font-style: italic; font-size: 4.2mm; line-height: 1.6; color: #2B3350; margin-top: 40mm }
.fine hr { border: 0; border-top: .4mm solid #2B3350; width: 60mm; margin: 6mm auto }
`;

function pagina(contenuto: string, extra = ""): string {
  return `<section class="p ${extra}">${contenuto}</section>`;
}

function copertina(d: DatiLibretto): string {
  return pagina(
    `<div class="fascia su"></div><div class="fascia giu"></div>
<div class="centro">
${d.logo ? `<img class="logo" src="${esc(d.logo)}" alt="Athlon 4.0">` : `<div class="logo" style="font-weight:900;font-size:11mm">ATHLON 4.0</div>`}
<div class="sn">${esc(t("SCUOLA NUOTO", "SWIM SCHOOL"))}</div>
${d.foto ? `<img class="foto" src="${esc(d.foto)}" alt="">` : `<div class="foto vuota">FOTO</div>`}
<div class="piccolo">${esc(t("QUESTO È IL LIBRETTO DI", "THIS IS THE BOOKLET OF"))}</div>
<div class="nome">${esc(d.nome)}</div>
</div>
<div class="indirizzo">Athlon Club<br>Roma – Via Ugo Ojetti, 134</div>`,
  );
}

function introduzione(d: DatiLibretto, fatti: number): string {
  const cicli = (["pre", "mini", "brevetti"] as const)
    .map((c) => {
      const n = NOMI_CICLO[c]();
      const livelli = LIVELLI.filter((l) => l.ciclo === c)
        .map((l) => `${esc(nomeLivello(l))} (${l.codice})`)
        .join(" · ");
      return `<div class="ciclo"><b>${esc(n.titolo)}</b><br>${livelli}</div>`;
    })
    .join("");
  return pagina(
    `<h1>${esc(t("Il brevetto", "The badge"))}</h1>
<p>${esc(t(
      "Il brevetto è il libretto che attesta il grado di apprendimento raggiunto: gli elementi tecnici che permettono di nuotare i vari stili, dorso, stile libero, rana e delfino. È composto di diversi livelli, che si conquistano uno dopo l’altro (generalmente se ne acquisiscono due l’anno).",
      "The badge booklet records the level of learning reached: the technical elements that allow swimming the different strokes, backstroke, freestyle, breaststroke and butterfly. It is made of several levels, earned one after the other (usually two a year).",
    ))}</p>
<h2>${esc(t("I tre cicli", "The three cycles"))}</h2>
${cicli}
<p>${esc(t(
      "La Commissione esaminatrice è composta da due insegnanti ed è presieduta dal Direttore Tecnico. Il giudizio è: sufficiente, buono, ottimo, oppure da migliorare. L’iscrizione all’esame di brevetto è gratuita.",
      "The examining board is made of two teachers and chaired by the Technical Director. The judgement is: sufficient, good, excellent, or to be improved. Registration for the badge exam is free.",
    ))}</p>
<p><b>${esc(d.nome)}</b> — ${esc(t(`${fatti} brevetti conseguiti su ${LIVELLI.length}`, `${fatti} of ${LIVELLI.length} badges earned`))}</p>`,
  );
}

function paginaLivello(l: LivelloBrevetto, fatto: boolean, d: DatiLibretto): string {
  const img = d.personaggi[l.specie];
  return pagina(
    `<div class="testa"><div><h1 style="margin:0">${esc(nomeLivello(l))}</h1>
<div style="font-size:3.2mm;color:#5A6380;font-weight:700">${esc(NOMI_CICLO[l.ciclo]().titolo)}${l.ausili ? ` · ${esc(t("con ausili didattici", "with learning aids"))}` : ""}</div></div>
<div class="sigla">${esc(l.codice)}</div></div>
${img ? `<img class="pers" src="${esc(img)}" alt="">` : ""}
<div class="centro" style="margin-bottom:3mm"><span class="stato ${fatto ? "si" : "no"}">${esc(fatto ? t("Brevetto conseguito", "Badge earned") : t("Da conseguire", "To be earned"))}</span></div>
<h2>${esc(t("Le prove", "The tests"))}</h2>
<ul class="${fatto ? "ok" : ""}">${l.prove().map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
<h2>${esc(t("Il programma", "The programme"))}</h2>
<ul class="prog">${l.programma().map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`,
  );
}

function finale(): string {
  return pagina(
    `<div class="fascia su"></div><div class="fascia giu"></div>
<div class="centro fine"><hr>${esc(t("Ora che sei arrivato all’ultima pagina,", "Now that you have reached the last page,"))}<br>${esc(t("sei veramente un buon nuotatore.", "you are truly a good swimmer."))}<br><br>${esc(t("Ricorda però di essere prudente.", "But remember to be careful."))}<br>${esc(t("La prudenza spesso è una prova di coraggio.", "Caution is often a proof of courage."))}<hr></div>`,
  );
}

/** Il documento HTML del libretto. */
export function htmlLibretto(d: DatiLibretto): string {
  const fatti = conseguiti(d.codice);
  const sigleFatte = new Set(fatti.map((l) => l.codice));
  return `<!doctype html><html lang="${t("it", "en")}"><head><meta charset="utf-8"><title>${esc(nomeFileLibretto(d.nome))}</title><style>${STILE}</style></head><body>${copertina(d)}${introduzione(d, fatti.length)}${LIVELLI.map((l) => paginaLivello(l, sigleFatte.has(l.codice), d)).join("")}${finale()}</body></html>`;
}

/** Il nome proposto per il PDF: «libretto-brevetti-sara-palermo». */
export function nomeFileLibretto(nome: string): string {
  const base = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `libretto-brevetti${base ? `-${base}` : ""}`;
}
