// Il feedback dei tester (20/10/2026): le regole che non hanno bisogno della schermata. La carta in Home che lo chiede
// (`home/CartaFeedback`, dal 30/10/2026: prima era una pillola in alto a destra), il foglio per scrivere e il caricamento
// degli allegati stanno negli altri file; qui
// restano i limiti, i tipi di messaggio e il controllo dei file, cosi' si provano senza React.
//
// **I limiti ripetono quelli della funzione** (`supabase/functions/_shared/feedback.ts` di APP-ATHLON: tre allegati, 5 MB
// ciascuno, 3000 caratteri, JPG, PNG, WebP o PDF): i due repository non si importano. Servono a dirlo subito e con
// parole chiare; l'ultima parola e' della funzione, che guarda i primi byte del file e non il nome.

import { t } from '../../../lib/lingua'

export const ALLEGATI_MAX = 3
export const ALLEGATO_BYTE_MAX = 5 * 1024 * 1024
export const TESTO_MAX = 3000
/** Da qui in poi si mostra il conto dei caratteri: prima non serve a nessuno. */
export const TESTO_AVVISO = 2500

/** I tipi di messaggio (facoltativi): come sta andando, un suggerimento, un problema, altro. Le stesse quattro chiavi della funzione. */
export const TIPI_FEEDBACK = [
  { valore: 'andamento', testo: t('Come sta andando', 'How it’s going') },
  { valore: 'suggerimento', testo: t('Un suggerimento', 'A suggestion') },
  { valore: 'problema', testo: t('Un problema', 'A problem') },
  { valore: 'altro', testo: t('Altro', 'Other') },
] as const

export type TipoFeedback = (typeof TIPI_FEEDBACK)[number]['valore']

export type TipoAllegato = 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf'

/** Un allegato pronto per l'invio: il file in base64 (come lo riceve la funzione) e, per le immagini, dove guardarlo. */
export type Allegato = { nome: string; tipo: TipoAllegato; byte: number; base64: string; anteprima: string | null }

/**
 * Di che tipo e' il file scelto: dal tipo che dichiara il selettore, poi dall'estensione. Null se non e' uno dei
 * quattro ammessi. Non e' una garanzia (la funzione guarda i byte): serve a dire subito «questo no».
 */
export function tipoAllegatoDa(a: { name: string; mimeType?: string | null }): TipoAllegato | null {
  const mime = (a.mimeType ?? '').toLowerCase()
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'image/jpeg'
  if (mime === 'image/png') return 'image/png'
  if (mime === 'image/webp') return 'image/webp'
  if (mime === 'application/pdf') return 'application/pdf'
  const estensione = /\.([a-z0-9]+)$/i.exec(a.name)?.[1]?.toLowerCase()
  if (estensione === 'jpg' || estensione === 'jpeg') return 'image/jpeg'
  if (estensione === 'png') return 'image/png'
  if (estensione === 'webp') return 'image/webp'
  if (estensione === 'pdf') return 'application/pdf'
  return null
}

export const FORMATI_ALLEGATI = t('foto JPG, PNG o WebP, oppure PDF', 'JPG, PNG or WebP photos, or PDF')

/** Quanti allegati se ne possono ancora aggiungere. */
export function postiLiberi(attuali: number): number {
  return Math.max(0, ALLEGATI_MAX - attuali)
}

/** Il messaggio si puo' inviare: c'e' qualcosa di scritto (non solo spazi) e non e' oltre il tetto. */
export function testoInviabile(testo: string): boolean {
  const t = testo.trim()
  return t.length > 0 && t.length <= TESTO_MAX
}

/** Il peso come lo si legge: «2,4 MB», «380 kB». */
export function pesoLeggibile(byte: number): string {
  return byte >= 1024 * 1024 ? `${(byte / 1024 / 1024).toFixed(1).replace('.', t(',', '.'))} MB` : `${Math.max(1, Math.round(byte / 1024))} kB`
}

/**
 * La schermata in cui si trova il tester, come la manda l'app: il percorso senza parametri, sempre con la barra
 * iniziale. Quello che non sembra un percorso diventa la Home («/»): non e' un'informazione da perdere il messaggio.
 */
export function schermataDa(percorso: string | null | undefined): string {
  const p = String(percorso ?? '').split(/[?#]/)[0].trim()
  if (!p.startsWith('/') || p.length > 200) return '/'
  return p
}

/**
 * Quanto sposta a sinistra il pulsante «Assistente virtuale» quando la schermata ha gia' un comando in alto a destra (il carrello dello
 * shop, per esempio): un bottone tondo da 44 e uno spazio da 8. Senza, il pulsante sta dove di solito sta quel comando.
 */
export const SPOSTA_SE_OCCUPATO = 52

/**
 * Da questa larghezza in su il pulsante «Assistente virtuale» ha la scritta; sotto (e dove la schermata ha gia' un comando in alto a
 * destra) e' solo l'icona: con la freccia indietro e il marchio a sinistra, la pillola con la scritta finirebbe sul marchio.
 */
export const LARGHEZZA_CON_SCRITTA = 390
