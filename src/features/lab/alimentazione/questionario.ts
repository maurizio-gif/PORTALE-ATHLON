import type { Questionario } from '@/api/alimentazione'

import type { NomeIcona } from '../ui/Icona'

// Il questionario della sezione Alimentazione (19/10/2026): una domanda per
// schermata, come quello dell'agente delle schede. Le chiavi e le risposte sono
// le stesse che la funzione accetta (SCELTE in portale-lab-alimentazione).
//
// Le ultime tre domande sono di cautela: gravidanza, condizioni mediche, rapporto
// col cibo. Non escludono nessuno dal diario, cambiano cosa la sezione mostra
// (consigli.ts e Alimentazione.tsx): chi risponde si' alle prime due vede l'invito
// a parlarne col medico al posto dei consigli; chi dice che contare lo mette a
// disagio ha i numeri nascosti (si possono riaccendere).

type Scelta<V> = { valore: V; testo: string; sotto?: string; icona?: NomeIcona }

export type Domanda =
  | { chiave: 'obiettivo' | 'dieta' | 'colazione' | 'frutta_verdura' | 'acqua' | 'rapporto_cibo'; tipo: 'una'; titolo: string; sotto?: string; scelte: Scelta<string>[] }
  | { chiave: 'gravidanza' | 'condizione_medica'; tipo: 'si-no'; titolo: string; sotto?: string }
  | { chiave: 'esclusioni'; tipo: 'piu'; titolo: string; sotto?: string; scelte: Scelta<string>[] }

export const DOMANDE: Domanda[] = [
  {
    chiave: 'obiettivo',
    tipo: 'una',
    titolo: 'Che cosa ti interessa di più?',
    sotto: 'I consigli partono da qui.',
    scelte: [
      { valore: 'benessere', testo: 'Mangiare meglio', sotto: 'Più equilibrio, senza contare tutto', icona: 'stella' },
      { valore: 'peso', testo: 'Il peso e la forma', sotto: 'Capire dove vanno le calorie', icona: 'grafico' },
      { valore: 'massa', testo: 'Più muscolo', sotto: 'Sostenere l’allenamento con i pesi', icona: 'peso' },
      { valore: 'prestazione', testo: 'Rendere di più', sotto: 'Energia per allenarsi e recuperare', icona: 'fulmine' },
    ],
  },
  {
    chiave: 'dieta',
    tipo: 'una',
    titolo: 'Come mangi?',
    scelte: [
      { valore: 'onnivora', testo: 'Di tutto' },
      { valore: 'vegetariana', testo: 'Vegetariano', sotto: 'Niente carne né pesce' },
      { valore: 'vegana', testo: 'Vegano', sotto: 'Niente di origine animale' },
    ],
  },
  {
    chiave: 'esclusioni',
    tipo: 'piu',
    titolo: 'C’è qualcosa che eviti?',
    sotto: 'Per intolleranza, allergia o scelta. Puoi non sceglierne nessuno.',
    scelte: [
      { valore: 'lattosio', testo: 'Lattosio' },
      { valore: 'glutine', testo: 'Glutine' },
      { valore: 'frutta-secca', testo: 'Frutta a guscio' },
      { valore: 'pesce', testo: 'Pesce e crostacei' },
    ],
  },
  {
    chiave: 'colazione',
    tipo: 'una',
    titolo: 'Fai colazione?',
    scelte: [
      { valore: 'sempre', testo: 'Sempre' },
      { valore: 'a-volte', testo: 'A volte' },
      { valore: 'mai', testo: 'Quasi mai' },
    ],
  },
  {
    chiave: 'frutta_verdura',
    tipo: 'una',
    titolo: 'Quante porzioni di frutta e verdura al giorno?',
    sotto: 'Una porzione è un frutto, un piatto di verdura cotta o una ciotola d’insalata.',
    scelte: [
      { valore: '0-1', testo: 'Nessuna o una' },
      { valore: '2-3', testo: 'Due o tre' },
      { valore: '4-5', testo: 'Quattro o cinque' },
      { valore: '5+', testo: 'Più di cinque' },
    ],
  },
  {
    chiave: 'acqua',
    tipo: 'una',
    titolo: 'Quanta acqua bevi al giorno?',
    scelte: [
      { valore: 'meno-1', testo: 'Meno di un litro' },
      { valore: '1-1.5', testo: 'Da uno a un litro e mezzo' },
      { valore: '1.5-2', testo: 'Da un litro e mezzo a due' },
      { valore: 'piu-2', testo: 'Più di due litri' },
    ],
  },
  {
    chiave: 'gravidanza',
    tipo: 'si-no',
    titolo: 'Sei in gravidanza o stai allattando?',
    sotto: 'In questo periodo le indicazioni sull’alimentazione le dà il medico.',
  },
  {
    chiave: 'condizione_medica',
    tipo: 'si-no',
    titolo: 'Il medico ti ha dato indicazioni sull’alimentazione?',
    sotto: 'Per esempio per diabete, pressione, colesterolo, reni o un’altra condizione.',
  },
  {
    chiave: 'rapporto_cibo',
    tipo: 'una',
    titolo: 'Contare le calorie o pesare il cibo ti mette a disagio?',
    sotto: 'Anche se in passato hai avuto un disturbo alimentare. Puoi non rispondere.',
    scelte: [
      { valore: 'sereno', testo: 'No, mi sta bene' },
      { valore: 'disagio', testo: 'Sì', sotto: 'Teniamo i numeri nascosti: il diario resta' },
      { valore: 'non-dico', testo: 'Preferisco non rispondere' },
    ],
  },
]

/** Le risposte vuote, prima di cominciare. */
export const VUOTO: Partial<Questionario> = { esclusioni: [] }

export function completo(q: Partial<Questionario>): q is Questionario {
  return DOMANDE.every((d) => (d.tipo === 'piu' ? Array.isArray(q[d.chiave]) : q[d.chiave] !== undefined))
}

/** Le domande di cautela: con un si' alla gravidanza o a una condizione medica i consigli lasciano il posto al medico. */
export const dalMedico = (q: Questionario) => q.gravidanza || q.condizione_medica
