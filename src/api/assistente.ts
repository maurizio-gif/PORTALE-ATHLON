import { SUPABASE_URL } from '@/config'
import { fetchFlusso } from '@/features/lab/assistente/fetchFlusso'
import { LettoreSse } from '@/features/lab/assistente/sse'
import { funzione } from '@/api/lab'
import { supabase } from '@/lib/supabase'
import { intestazioneLingua, t } from '@/lib/lingua'

// L'assistente del portale (29/10/2026): una chat che legge quello che l'app gia' mostra e porta nel punto giusto. La funzione e'
// `portale-lab-assistente` di APP-ATHLON. **La risposta arriva a pezzi** (`text/event-stream`): il testo si vede mentre il modello scrive.
// L'app non sceglie niente: mostra il testo e i pulsanti che le arrivano, e dice alla funzione quale pulsante e' stato toccato e che voto
// ha dato la persona. Tutte le domande e le risposte si conservano e le legge il CRM (scheda del cliente).

export type AzioneAssistente = { destinazione: string; parametri: Record<string, string>; etichetta: string }

export type RispostaAssistente = {
  conversazioneId: string
  /** Manca se il registro non si e' scritto: allora non si puo' dare un voto. */
  messaggioId: string | null
  testo: string
  azioni: AzioneAssistente[]
  origine: 'ai' | 'regole'
}

export type Ascoltatori = {
  onInizio?: (d: { conversazioneId: string }) => void
  /** Un pezzo di testo da aggiungere. */
  onTesto: (pezzo: string) => void
  /** Il testo mostrato non reggeva i controlli: si sostituisce tutto (col ripiego). */
  onSostituisci: (testo: string) => void
}

export type EsitoChiedi = { ok: true; risposta: RispostaAssistente } | { ok: false; errore: string; nonAttivo?: boolean; limite?: boolean }

const ERRORE_RETE = () => t('Connessione non riuscita. Controlla la rete e riprova.', 'Connection failed. Check your network and try again.')

function azioniDa(v: unknown): AzioneAssistente[] {
  if (!Array.isArray(v)) return []
  return v
    .filter((a) => a && typeof a === 'object' && typeof (a as any).destinazione === 'string')
    .map((a: any) => ({
      destinazione: a.destinazione as string,
      parametri: a.parametri && typeof a.parametri === 'object' && !Array.isArray(a.parametri) ? (a.parametri as Record<string, string>) : {},
      etichetta: typeof a.etichetta === 'string' ? a.etichetta : '',
    }))
}

/** Fa una domanda e legge la risposta mentre arriva. Non solleva mai. */
export async function chiediAssistente(
  o: { messaggio: string; conversazioneId: string | null; schermata: string | null },
  a: Ascoltatori,
  segnale?: AbortSignal,
): Promise<EsitoChiedi> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) return { ok: false, errore: t('Sessione scaduta: entra di nuovo.', 'Session expired: sign in again.') }
  try {
    const r = await fetchFlusso(`${SUPABASE_URL}/functions/v1/portale-lab-assistente`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', ...intestazioneLingua(), Authorization: `Bearer ${token}` },
      body: JSON.stringify({ azione: 'chiedi', stream: true, messaggio: o.messaggio, conversazione_id: o.conversazioneId, schermata: o.schermata }),
      signal: segnale,
    })
    // Un 404 senza il nostro corpo e' la funzione non ancora pubblicata.
    if (r.status === 404) return { ok: false, nonAttivo: true, errore: t('L’assistente non è ancora attivo: riprova fra qualche giorno.', 'The assistant isn’t available yet: try again in a few days.') }
    if (!(r.headers.get('content-type') ?? '').includes('text/event-stream')) {
      const j = ((await r.json().catch(() => null)) ?? {}) as Record<string, any>
      return { ok: false, limite: r.status === 429, errore: typeof j.errore === 'string' ? j.errore : t('Non riusciamo a rispondere adesso. Riprova fra poco.', 'We can’t answer right now. Please try again shortly.') }
    }

    const lettore = new LettoreSse()
    let conversazioneId = o.conversazioneId ?? ''
    let fine: RispostaAssistente | null = null
    let errore: string | null = null
    const tratta = (eventi: ReturnType<LettoreSse['push']>) => {
      for (const e of eventi) {
        if (e.evento === 'inizio') {
          conversazioneId = String(e.dati.conversazione_id ?? conversazioneId)
          a.onInizio?.({ conversazioneId })
        } else if (e.evento === 'testo') a.onTesto(String(e.dati.t ?? ''))
        else if (e.evento === 'sostituisci') a.onSostituisci(String(e.dati.testo ?? ''))
        else if (e.evento === 'fine') {
          fine = {
            conversazioneId: String(e.dati.conversazione_id ?? conversazioneId),
            messaggioId: typeof e.dati.messaggio_id === 'string' ? e.dati.messaggio_id : null,
            testo: String(e.dati.testo ?? ''),
            azioni: azioniDa(e.dati.azioni),
            origine: e.dati.origine === 'regole' ? 'regole' : 'ai',
          }
        } else if (e.evento === 'errore') errore = String(e.dati.errore ?? '')
      }
    }

    if (r.body) {
      const lett = r.body.getReader()
      const dec = new TextDecoder()
      while (true) {
        const { done, value } = await lett.read()
        if (done) break
        tratta(lettore.push(dec.decode(value, { stream: true })))
      }
      tratta(lettore.push(dec.decode()))
    } else {
      // Un ambiente che non da' il corpo a pezzi: si legge tutto insieme (la risposta arriva intera, ma arriva).
      tratta(lettore.push(await r.text()))
    }
    tratta(lettore.fine())

    if (fine) return { ok: true, risposta: fine }
    return { ok: false, errore: errore || ERRORE_RETE() }
  } catch (e) {
    if ((e as { name?: string } | null)?.name === 'AbortError') return { ok: false, errore: '' }
    return { ok: false, errore: ERRORE_RETE() }
  }
}

/** Il voto alla risposta. Non aspetta e non solleva mai: un voto perso non deve far fallire niente. */
export function valutaRisposta(messaggioId: string, valutazione: 'su' | 'giu' | null): void {
  funzione('portale-lab-assistente', { azione: 'valuta', messaggio_id: messaggioId, valutazione }).catch(() => undefined)
}

/** Ha premuto un pulsante: e' il segno che la risposta ha portato dove doveva. Non aspetta e non solleva mai. */
export function pulsanteToccato(messaggioId: string, destinazione: string): void {
  funzione('portale-lab-assistente', { azione: 'toccato', messaggio_id: messaggioId, destinazione }).catch(() => undefined)
}

/**
 * «Scrivi al team» (31/10/2026): la persona ha toccato Invia sulla carta che l'assistente le ha proposto. La funzione manda al desk la conversazione (le ultime battute, lette dal
 * registro del server) e quello che la persona ha aggiunto: email a desk@, compito in Agenda sulla sua scheda. Non solleva mai.
 */
export async function scriviAlTeam(conversazioneId: string, messaggio: string, allegato?: { nome: string; base64: string } | null): Promise<{ ok: true } | { ok: false; errore: string }> {
  const { ok, stato, dati } = await funzione('portale-lab-assistente', { azione: 'ticket', conversazione_id: conversazioneId, messaggio, ...(allegato ? { allegato: { nome: allegato.nome, base64: allegato.base64 } } : {}) })
  if (ok) return { ok: true }
  // Una funzione non ancora aggiornata risponde «Azione sconosciuta.»: non e' una cosa da leggere alla persona.
  if (dati.errore === 'Azione sconosciuta.' || dati.errore === 'Unknown action.' || stato === 404) {
    return { ok: false, errore: t('Il team non è ancora raggiungibile da qui: riprova fra qualche giorno.', 'The team can’t be reached from here yet: try again in a few days.') }
  }
  return { ok: false, errore: typeof dati.errore === 'string' && dati.errore ? dati.errore : t('Non siamo riusciti a mandarla adesso. Riprova fra qualche minuto.', 'We couldn’t send it right now. Please try again in a few minutes.') }
}
