import { t } from './lingua'
import type { FileScelto } from './fileCertificato'

// I file di una verifica del certificato medico (10/11/2026): fino a tre, perche' a volte l'ECG sta su un foglio a
// parte e il certificato da solo viene rifiutato («manca l'ECG»: 19 rifiuti su 28 in una settimana). Il primo file
// e' il certificato, gli altri l'ECG o un'altra pagina.
//
// Modulo puro (niente React Native): sono i conti che il foglio e la pagina del link fanno prima di inviare, e si
// provano con `npx tsx scripts/prova-certificato-piu-file.ts`. Gli stessi limiti della funzione
// (`_shared/certificati.ts`, APP-ATHLON): qui servono a dirlo subito e con parole chiare, la' sono l'ultima parola.

/** Quanto puo' pesare un file, e **tutti i file della verifica insieme**: un limite solo, quello di sempre. */
export const MAX_BYTE = 8 * 1024 * 1024
/** Quanti file in una verifica: il certificato, l'ECG a parte, un'altra pagina. */
export const MAX_FILE = 3

/** Il peso come lo si legge: «2,4 MB», «380 kB». */
export function pesoLeggibile(byte: number): string {
  return byte >= 1024 * 1024 ? `${(byte / 1024 / 1024).toFixed(1).replace('.', t(',', '.'))} MB` : `${Math.max(1, Math.round(byte / 1024))} kB`
}

export const totaleByte = (files: FileScelto[]): number => files.reduce((somma, f) => somma + f.byte, 0)

export type EsitoAggiunta = { ok: true; files: FileScelto[] } | { ok: false; errore: string }

/**
 * Aggiunge un file a quelli scelti. Rifiuta, dicendo perche' e lasciando l'elenco com'e': il quarto file, lo stesso file
 * due volte (stesso peso e stessi byte, anche con un nome diverso) e un totale oltre il limite.
 */
export function aggiungiFile(files: FileScelto[], nuovo: FileScelto): EsitoAggiunta {
  if (files.length >= MAX_FILE) return { ok: false, errore: t(`Puoi mandare al massimo ${MAX_FILE} file.`, `You can send up to ${MAX_FILE} files.`) }
  if (files.some((f) => f.byte === nuovo.byte && f.base64 === nuovo.base64)) {
    return { ok: false, errore: t('Hai già scelto questo file.', 'You’ve already chosen this file.') }
  }
  const totale = totaleByte(files) + nuovo.byte
  if (totale > MAX_BYTE) {
    return {
      ok: false,
      errore: t(
        `I file pesano troppo: il limite è ${MAX_BYTE / 1024 / 1024} MB in tutto, con questo sarebbero ${pesoLeggibile(totale)}.`,
        `The files are too large: the limit is ${MAX_BYTE / 1024 / 1024} MB in total, with this one it would be ${pesoLeggibile(totale)}.`,
      ),
    }
  }
  return { ok: true, files: [...files, nuovo] }
}

/**
 * Il corpo della richiesta: il primo file come l'ha sempre mandato l'app (`nome`, `base64`: una funzione di prima lo
 * capisce), gli altri in `altri`. Con un file solo il corpo e' identico a quello di prima.
 */
export function corpoFile(files: FileScelto[]): { nome: string; base64: string; altri?: { nome: string; base64: string }[] } {
  const [primo, ...altri] = files
  return { nome: primo.nome, base64: primo.base64, ...(altri.length ? { altri: altri.map((f) => ({ nome: f.nome, base64: f.base64 })) } : {}) }
}

/**
 * Quanti file ha ricevuto la funzione, dalla sua risposta (`caricamento.file`). Una funzione di prima non lo dice e
 * ne ha salvato uno solo: e' l'unico caso in cui un file in piu' si perderebbe in silenzio, e la persona lo deve
 * sapere (`incompleto`).
 */
export function fileRicevuti(dati: Record<string, any> | null | undefined): number | null {
  const n = dati?.caricamento?.file
  return typeof n === 'number' && Number.isFinite(n) ? n : null
}

/** Mandati piu' file e la funzione ne ha ricevuti meno (o non lo dice, e allora ne ha salvato uno): qualcosa e' rimasto fuori. */
export function incompleto(mandati: number, ricevuti: number | null): boolean {
  return mandati > 1 && (ricevuti ?? 1) < mandati
}
