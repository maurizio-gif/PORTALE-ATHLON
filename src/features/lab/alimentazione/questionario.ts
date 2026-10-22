import type { Questionario } from '@/api/alimentazione'
import { t } from '@/lib/lingua'

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
    titolo: t('Che cosa ti interessa di più?', 'What matters most to you?'),
    sotto: t('I consigli partono da qui.', 'The tips start from here.'),
    scelte: [
      { valore: 'benessere', testo: t('Mangiare meglio', 'Eat better'), sotto: t('Più equilibrio, senza contare tutto', 'More balance, without counting everything'), icona: 'stella' },
      { valore: 'peso', testo: t('Il peso e la forma', 'Weight and shape'), sotto: t('Capire dove vanno le calorie', 'Understand where the calories go'), icona: 'grafico' },
      { valore: 'massa', testo: t('Più muscolo', 'More muscle'), sotto: t('Sostenere l’allenamento con i pesi', 'Support your weight training'), icona: 'peso' },
      { valore: 'prestazione', testo: t('Rendere di più', 'Perform better'), sotto: t('Energia per allenarsi e recuperare', 'Energy to train and recover'), icona: 'fulmine' },
    ],
  },
  {
    chiave: 'dieta',
    tipo: 'una',
    titolo: t('Come mangi?', 'How do you eat?'),
    scelte: [
      { valore: 'onnivora', testo: t('Di tutto', 'Everything') },
      { valore: 'vegetariana', testo: t('Vegetariano', 'Vegetarian'), sotto: t('Niente carne né pesce', 'No meat or fish') },
      { valore: 'vegana', testo: t('Vegano', 'Vegan'), sotto: t('Niente di origine animale', 'Nothing of animal origin') },
    ],
  },
  {
    chiave: 'esclusioni',
    tipo: 'piu',
    titolo: t('C’è qualcosa che eviti?', 'Is there anything you avoid?'),
    sotto: t('Per intolleranza, allergia o scelta. Puoi non sceglierne nessuno.', 'Because of an intolerance, an allergy or by choice. You can leave them all unselected.'),
    scelte: [
      { valore: 'lattosio', testo: t('Lattosio', 'Lactose') },
      { valore: 'glutine', testo: t('Glutine', 'Gluten') },
      { valore: 'frutta-secca', testo: t('Frutta a guscio', 'Tree nuts') },
      { valore: 'pesce', testo: t('Pesce e crostacei', 'Fish and shellfish') },
    ],
  },
  {
    chiave: 'colazione',
    tipo: 'una',
    titolo: t('Fai colazione?', 'Do you eat breakfast?'),
    scelte: [
      { valore: 'sempre', testo: t('Sempre', 'Always') },
      { valore: 'a-volte', testo: t('A volte', 'Sometimes') },
      { valore: 'mai', testo: t('Quasi mai', 'Hardly ever') },
    ],
  },
  {
    chiave: 'frutta_verdura',
    tipo: 'una',
    titolo: t('Quante porzioni di frutta e verdura al giorno?', 'How many servings of fruit and vegetables a day?'),
    sotto: t('Una porzione è un frutto, un piatto di verdura cotta o una ciotola d’insalata.', 'A serving is a piece of fruit, a plate of cooked vegetables or a bowl of salad.'),
    scelte: [
      { valore: '0-1', testo: t('Nessuna o una', 'None or one') },
      { valore: '2-3', testo: t('Due o tre', 'Two or three') },
      { valore: '4-5', testo: t('Quattro o cinque', 'Four or five') },
      { valore: '5+', testo: t('Più di cinque', 'More than five') },
    ],
  },
  {
    chiave: 'acqua',
    tipo: 'una',
    titolo: t('Quanta acqua bevi al giorno?', 'How much water do you drink a day?'),
    scelte: [
      { valore: 'meno-1', testo: t('Meno di un litro', 'Less than a liter') },
      { valore: '1-1.5', testo: t('Da uno a un litro e mezzo', 'One to one and a half liters') },
      { valore: '1.5-2', testo: t('Da un litro e mezzo a due', 'One and a half to two liters') },
      { valore: 'piu-2', testo: t('Più di due litri', 'More than two liters') },
    ],
  },
  {
    chiave: 'gravidanza',
    tipo: 'si-no',
    titolo: t('Sei in gravidanza o stai allattando?', 'Are you pregnant or breastfeeding?'),
    sotto: t('In questo periodo le indicazioni sull’alimentazione le dà il medico.', 'During this time, nutrition advice comes from your doctor.'),
  },
  {
    chiave: 'condizione_medica',
    tipo: 'si-no',
    titolo: t('Il medico ti ha dato indicazioni sull’alimentazione?', 'Has your doctor given you instructions about your diet?'),
    sotto: t('Per esempio per diabete, pressione, colesterolo, reni o un’altra condizione.', 'For example for diabetes, blood pressure, cholesterol, kidneys or another condition.'),
  },
  {
    chiave: 'rapporto_cibo',
    tipo: 'una',
    titolo: t('Contare le calorie o pesare il cibo ti mette a disagio?', 'Does counting calories or weighing food make you uncomfortable?'),
    sotto: t('Anche se in passato hai avuto un disturbo alimentare. Puoi non rispondere.', 'Including if you’ve had an eating disorder in the past. You don’t have to answer.'),
    scelte: [
      { valore: 'sereno', testo: t('No, mi sta bene', 'No, I’m fine with it') },
      { valore: 'disagio', testo: t('Sì', 'Yes'), sotto: t('Teniamo i numeri nascosti: il diario resta', 'We’ll keep the numbers hidden: the diary stays') },
      { valore: 'non-dico', testo: t('Preferisco non rispondere', 'I’d rather not answer') },
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
