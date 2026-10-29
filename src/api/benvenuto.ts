import { funzione } from './lab'
import { t } from '@/lib/lingua'

// Il messaggio di benvenuto della Home: la funzione portale-lab-benvenuto di APP-ATHLON scrive, a ogni ritorno nell'app, un
// messaggio personale che spinge il socio verso il suo prossimo passo. **Il passo lo decide il server** (a che punto e' il socio,
// dai dati del mirror): l'app mostra il testo e il pulsante che le arrivano, e non sceglie niente. Le funzioni non sollevano mai:
// se qualcosa non va, `ok: false` e la Home non mostra il messaggio (non c'e' niente da riparare per chi guarda).

/** Dove porta il pulsante: l'app traduce la destinazione in un indirizzo (`home/MessaggioBenvenuto.tsx`). */
export const DESTINAZIONI = ['pagamenti', 'prova', 'abbonamento', 'calendario', 'allenamento', 'consigli', 'salute'] as const
export type DestinazioneBenvenuto = (typeof DESTINAZIONI)[number]

export type MessaggioBenvenuto = {
  /** Vuoto se il server non ha potuto scrivere il registro: il messaggio si mostra lo stesso, ma non si puo' segnare che l'hai toccato. */
  id: string
  titolo: string
  testo: string
  azione: { destinazione: DestinazioneBenvenuto; etichetta: string } | null
  /** `ai`: l'ha scritto un modello. `regole`: e' un testo scritto a mano dal club (il server ripiega su quelli se l'AI non risponde). */
  origine: 'ai' | 'regole'
}

export type EsitoBenvenuto = { ok: true; messaggio: MessaggioBenvenuto | null } | { ok: false; errore: string }

/** Il server ci mette al massimo una decina di secondi (AI compresa): oltre, la Home va avanti senza il messaggio. */
const ATTESA_MS = 15_000

/** Ricontrolla la forma di quello che arriva: un campo mancante o una destinazione sconosciuta non deve rompere la Home. */
function leggi(m: unknown): MessaggioBenvenuto | null {
  if (!m || typeof m !== 'object') return null
  const x = m as Record<string, unknown>
  if (typeof x.titolo !== 'string' || typeof x.testo !== 'string' || !x.titolo.trim() || !x.testo.trim()) return null
  const a = x.azione as Record<string, unknown> | null | undefined
  const azione =
    a && typeof a.etichetta === 'string' && a.etichetta.trim() && DESTINAZIONI.includes(a.destinazione as DestinazioneBenvenuto)
      ? { destinazione: a.destinazione as DestinazioneBenvenuto, etichetta: a.etichetta }
      : null
  return { id: typeof x.id === 'string' ? x.id : '', titolo: x.titolo.trim(), testo: x.testo.trim(), azione, origine: x.origine === 'ai' ? 'ai' : 'regole' }
}

/**
 * Il messaggio per questo ritorno. `motivo`: `apertura` (l'app e' stata appena aperta) o `ritorno` (e' tornato dopo un po').
 * `saluteCollegabile`: questo telefono puo' collegare Apple Salute e non l'ha ancora fatto (29/10/2026): e' una cosa che sa solo
 * l'app, e il server la usa per proporre il collegamento solo dove si puo'.
 */
export async function messaggioDiBenvenuto(motivo: 'apertura' | 'ritorno', saluteCollegabile = false): Promise<EsitoBenvenuto> {
  const attesa = new Promise<null>((ok) => setTimeout(() => ok(null), ATTESA_MS))
  const r = await Promise.race([funzione('portale-lab-benvenuto', { azione: 'messaggio', motivo, salute_collegabile: saluteCollegabile }), attesa])
  if (!r) return { ok: false, errore: t('Il messaggio non e’ arrivato in tempo.', 'The message didn’t arrive in time.') }
  if (!r.ok) return { ok: false, errore: String(r.dati.errore ?? t('Non riusciamo a leggere il messaggio adesso.', 'We can’t load the message right now.')) }
  return { ok: true, messaggio: leggi(r.dati.messaggio) }
}

/** Il socio ha premuto il pulsante del messaggio: e' il solo segno, per il club, che il messaggio ha portato a un passo. Non aspetta e non solleva. */
export function messaggioToccato(id: string): void {
  if (!id) return
  funzione('portale-lab-benvenuto', { azione: 'toccato', id }).catch(() => undefined)
}
