import type { SchedaDaSalvare, SchedaLab } from '@/api/lab'

// Un piano (del club, dell'agente, del trainer) copiato fra i piani del socio (19/10/2026): stessi giorni ed
// esercizi, e anche le percentuali del massimale, che nell'app diventano i suoi chili. Serve a due posti: il
// pulsante «Aggiungi ai tuoi piani» (`Scheda.tsx`), che lo salva com'e', e l'editor (`EditorScheda.tsx`,
// `?copia=`), che lo fa modificare prima. L'originale non si tocca: il socio ne tiene una copia.

/** Da dove si dice che viene la copia: un piano del socio che si copia resta «creato» (non e' del club). */
export const origineDellaCopia = (s: SchedaLab): 'club' | 'creata' => (s.tipo === 'socio' ? 'creata' : 'club')

/** Il piano com'e', pronto per `salvaSchedaMia`. */
export function comeDaSalvare(s: SchedaLab): SchedaDaSalvare {
  return {
    titolo: s.titolo,
    descrizione: s.descrizione ?? '',
    obiettivo: s.obiettivo ?? '',
    livello: s.livello ?? '',
    origine: origineDellaCopia(s),
    giorni: s.giorni.map((g) => ({
      nome: g.nome,
      note: g.note ?? '',
      esercizi: g.esercizi.map((e) => ({
        esercizio_id: e.esercizio_id,
        serie: e.serie,
        ripetizioni: e.ripetizioni,
        carico: e.carico ?? '',
        percentuale: e.percentuale,
        recupero_serie: e.recupero_serie,
        recupero_dopo: e.recupero_dopo,
        superserie: e.superserie ?? '',
        note: e.note ?? '',
      })),
    })),
  }
}
