import { chiediAssistente, valutaRisposta } from '@/api/assistente'

import { azzeraAssistente, impostaAssistente, leggiAssistente, useStatoAssistente, type Battuta, type StatoAssistente } from './store'

// Le azioni della chat: fare una domanda (la risposta arriva a pezzi nella battuta dell'assistente), dare un voto, ricominciare.
// **Una domanda alla volta**: finche' una risposta sta arrivando non se ne manda un'altra.

export const CARATTERI_MAX = 500

const nuovoId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

function cambiaBattuta(id: string, f: (b: Battuta) => Battuta) {
  impostaAssistente((s) => ({ ...s, battute: s.battute.map((b) => (b.id === id ? f(b) : b)) }))
}

const esiste = (id: string) => leggiAssistente().battute.some((b) => b.id === id)

/** Manda una domanda. `schermata` e' la chiave della schermata in cui si trova la persona (per il «sei gia' qui»). */
export function mandaDomanda(testo: string, schermata: string | null): void {
  const s = leggiAssistente()
  const domanda = testo.trim()
  if (s.inCorso || !domanda || domanda.length > CARATTERI_MAX) return
  const idSocio = nuovoId()
  const idRisposta = nuovoId()
  impostaAssistente((x) => ({
    ...x,
    inCorso: true,
    errore: null,
    battute: [
      ...x.battute,
      { id: idSocio, ruolo: 'socio', testo: domanda, azioni: [], messaggioId: null, valutazione: null, stato: 'fatto' },
      { id: idRisposta, ruolo: 'assistente', testo: '', azioni: [], messaggioId: null, valutazione: null, stato: 'scrive' },
    ],
  }))

  void chiediAssistente(
    { messaggio: domanda, conversazioneId: s.conversazioneId, schermata },
    {
      onInizio: ({ conversazioneId }) => {
        if (esiste(idRisposta)) impostaAssistente((x) => ({ ...x, conversazioneId }))
      },
      onTesto: (pezzo) => cambiaBattuta(idRisposta, (b) => ({ ...b, testo: b.testo + pezzo })),
      onSostituisci: (nuovo) => cambiaBattuta(idRisposta, (b) => ({ ...b, testo: nuovo })),
    },
  ).then((esito) => {
    // Se nel frattempo la conversazione e' stata buttata (uscita dall'app, «Ricomincia»), non si scrive piu' niente.
    if (!esiste(idRisposta)) return
    if (esito.ok) {
      const r = esito.risposta
      cambiaBattuta(idRisposta, (b) => ({ ...b, testo: r.testo || b.testo, azioni: r.azioni, messaggioId: r.messaggioId, origine: r.origine, stato: 'fatto' }))
      impostaAssistente((x) => ({ ...x, conversazioneId: r.conversazioneId || x.conversazioneId, inCorso: false }))
      return
    }
    impostaAssistente((x) => {
      const battuta = x.battute.find((b) => b.id === idRisposta)
      // Niente di arrivato: si toglie la battuta vuota e l'errore sta sotto la chat. Qualcosa e' arrivato: resta, segnata interrotta.
      const battute = battuta && !battuta.testo ? x.battute.filter((b) => b.id !== idRisposta) : x.battute.map((b) => (b.id === idRisposta ? { ...b, stato: 'interrotta' as const } : b))
      return { ...x, battute, inCorso: false, errore: esito.errore || null, nonAttivo: !!esito.nonAttivo }
    })
  })
}

/** Il voto alla risposta; toccare lo stesso voto lo toglie. */
export function votaRisposta(idBattuta: string, voto: 'su' | 'giu'): void {
  const b = leggiAssistente().battute.find((x) => x.id === idBattuta)
  if (!b?.messaggioId) return
  const nuovo = b.valutazione === voto ? null : voto
  cambiaBattuta(idBattuta, (x) => ({ ...x, valutazione: nuovo }))
  valutaRisposta(b.messaggioId, nuovo)
}

export function ricominciaChat(): void {
  azzeraAssistente()
}

export function useAssistente(): StatoAssistente {
  return useStatoAssistente()
}
