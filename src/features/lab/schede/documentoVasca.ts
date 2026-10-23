import type { SchedaLab } from '@/api/lab'
import { locale, t } from '../../../lib/lingua'
import { recupero } from './comune'
import { inMetri, metriDelGiorno, nomeIntensita, nomeParte, parteDa } from './nuoto'

// Il piano di nuoto su carta (23/10/2026, richiesta di Maurizio: «esportare in pdf, stampare e salvare»). Un piano di
// vasca si legge a bordo vasca, quindi serve anche fuori dall'app: qui si compone il documento — un testo semplice per
// condividerlo o salvarlo, e una pagina HTML pronta per la stampa, da cui il browser fa anche il PDF. Niente va al
// server e niente si conserva: e' il piano che il socio ha gia' davanti, scritto in un altro formato.
//
// Questo file e' puro (nessun React Native): si prova con `npx tsx`. Chi apre la stampa o il foglio di condivisione
// sta in `esportaVasca.ts`. Il documento dice le stesse cose della schermata e non ne aggiunge: metri (un'addizione,
// mai minuti), parte, distanza, intensita' come parola, recupero. Niente calorie, niente stime.

const maiuscola = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Il nome del file che il browser propone per il PDF: lettere, cifre e trattini. */
export function nomeFilePiano(titolo: string): string {
  const base = titolo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `piano-nuoto-${base || 'athlon'}`
}

type Riga = { parte: string | null; nome: string; dettaglio: string; recupero: string; nota: string }

/** Le righe di una seduta come si leggono: «4 × 100 m», intensita' e recupero come sulla schermata. */
function righe(g: SchedaLab['giorni'][number]): Riga[] {
  return g.esercizi.map((e) => {
    const { parte, resto } = parteDa(e.note)
    const intensita = e.carico ? nomeIntensita(e.carico) : ''
    return {
      parte: parte ? nomeParte(parte) : null,
      nome: e.nome,
      dettaglio: `${e.serie} × ${e.ripetizioni}${intensita ? ` · ${intensita}` : ''}`,
      recupero: t(`recupero ${recupero(e.recupero_serie)}`, `rest ${recupero(e.recupero_serie)}`),
      nota: resto,
    }
  })
}

const intestazione = (s: SchedaLab): string[] => {
  const sedute = s.giorni.length
  return [
    t(`${sedute} ${sedute === 1 ? 'seduta' : 'sedute'}`, `${sedute} ${sedute === 1 ? 'session' : 'sessions'}`),
    s.livello ? t(`livello ${s.livello}`, `${s.livello} level`) : '',
  ].filter(Boolean)
}

export const AVVERTENZA_DOCUMENTO = t(
  'Piano di nuoto Athlon Club, da leggere a bordo vasca. Non sostituisce il parere di un istruttore: con dolori o infortuni chiedi al tecnico a bordo vasca. Meglio una seduta corta e fatta bene.',
  'Athlon Club swim plan, to read at the poolside. It doesn’t replace an instructor’s advice: with pain or injuries, ask the coach at the poolside. Better a short session done well.',
)

/** Il piano come testo semplice: per condividerlo, incollarlo in una nota, salvarlo. */
export function testoPianoVasca(s: SchedaLab): string {
  const out: string[] = [s.titolo, [t('Piano di nuoto', 'Swim plan'), ...intestazione(s)].join(' · ')]
  if (s.descrizione) out.push('', s.descrizione)
  for (const g of s.giorni) {
    const metri = metriDelGiorno(g)
    out.push('', `${g.nome.toUpperCase()}${metri > 0 ? ` · ${inMetri(metri)}` : ''}`)
    if (g.note) out.push(g.note)
    for (const r of righe(g)) {
      out.push(`${r.parte ? `[${r.parte}] ` : ''}${r.nome}: ${r.dettaglio}, ${r.recupero}`)
      if (r.nota) out.push(`   ${r.nota}`)
    }
  }
  out.push('', AVVERTENZA_DOCUMENTO)
  return out.join('\n')
}

/** La data di oggi come si legge sul foglio: «23 ottobre 2026». */
export const dataDocumento = (adesso: Date = new Date()): string => adesso.toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Rome' })

/** La pagina da stampare: bianco e nero leggibile, una seduta per blocco che non si spezza fra due fogli. */
export function htmlPianoVasca(s: SchedaLab, adesso: Date = new Date()): string {
  const sedute = s.giorni
    .map((g) => {
      const metri = metriDelGiorno(g)
      const corpo = righe(g)
        .map(
          (r) =>
            `<tr><td class="parte">${r.parte ? escape(r.parte) : ''}</td><td><strong>${escape(r.nome)}</strong>${r.nota ? `<div class="nota">${escape(r.nota)}</div>` : ''}</td><td class="num">${escape(r.dettaglio)}</td><td class="num">${escape(r.recupero)}</td></tr>`,
        )
        .join('')
      return `<section><h2>${escape(g.nome)}${metri > 0 ? `<span>${escape(inMetri(metri))}</span>` : ''}</h2>${g.note ? `<p class="nota">${escape(g.note)}</p>` : ''}<table>${corpo}</table></section>`
    })
    .join('')
  return `<!doctype html><html lang="${locale() === 'it-IT' ? 'it' : 'en'}"><head><meta charset="utf-8"><title>${escape(nomeFilePiano(s.titolo))}</title>
<style>
@page{margin:16mm}
*{box-sizing:border-box}
body{font:14px/1.45 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#111;margin:0}
header{border-bottom:3px solid #ff5701;padding-bottom:8px;margin-bottom:14px}
.marchio{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#bb4001;font-weight:700}
h1{font-size:24px;margin:4px 0 2px}
.meta{color:#555;font-size:12.5px}
section{break-inside:avoid;margin:0 0 18px}
h2{font-size:16px;margin:0 0 6px;display:flex;justify-content:space-between;border-bottom:1px solid #ccc;padding-bottom:3px}
h2 span{font-weight:600;color:#444}
table{width:100%;border-collapse:collapse;table-layout:fixed}
td{padding:5px 6px;border-bottom:1px solid #e3e3e3;vertical-align:top}
.parte{width:22%;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#bb4001;font-weight:700}
.num{width:19%;white-space:nowrap;text-align:right}
.nota{color:#555;font-size:12.5px}
footer{margin-top:18px;color:#555;font-size:11.5px;border-top:1px solid #ccc;padding-top:8px}
</style></head><body>
<header><div class="marchio">Athlon Club · ${escape(t('Piano di nuoto', 'Swim plan'))}</div><h1>${escape(s.titolo)}</h1><div class="meta">${escape([...intestazione(s), dataDocumento(adesso)].join(' · '))}</div>${s.descrizione ? `<p class="nota">${escape(s.descrizione)}</p>` : ''}</header>
${sedute}
<footer>${escape(AVVERTENZA_DOCUMENTO)}</footer>
</body></html>`
}
