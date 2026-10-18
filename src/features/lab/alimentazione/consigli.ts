import type { Questionario } from '@/api/alimentazione'

import type { NomeIcona } from '../ui/Icona'
import { LARN, type Totali } from './conti'
import { dalMedico } from './questionario'

// I consigli della sezione Alimentazione (19/10/2026). Sono educazione
// alimentare: frasi generali, prese dalle linee guida, che l'app sceglie per il
// socio secondo il questionario, l'allenamento che fa e quello che scrive nel
// diario. Non li scrive un modello e non sono un piano: il club non ha un
// nutrizionista, e nessuna frase qui dice a una persona quanto deve mangiare.
//
// **Le fonti**, citate in ogni consiglio:
//   - CREA, Linee guida per una sana alimentazione (revisione 2018);
//   - SINU, LARN – Livelli di assunzione di riferimento (IV revisione, 2014);
//   - ACSM, Academy of Nutrition and Dietetics, Dietitians of Canada, Nutrition
//     and Athletic Performance (posizione comune, 2016);
//   - OMS, raccomandazioni su zuccheri (2015) e sale (2012).
// I numeri sono quelli che ricordiamo da quelle fonti, non riletti alla fonte da
// qui (i siti non erano raggiungibili): vanno ricontrollati prima di aprire la
// sezione a tutti.
//
// **Con un si' alla gravidanza o a una condizione medica** i consigli lasciano il
// posto a un invito a parlarne col medico (dalMedico): in quei casi anche un
// consiglio generale puo' essere quello sbagliato.

export type Consiglio = { id: string; titolo: string; testo: string; fonte: string; icona: NomeIcona; tono: 'accento' | 'blu' | 'ok' | 'neutro' }

export type Contesto = {
  q: Questionario
  /** Il peso, per i grammi di proteine per kg. */
  kg: number | null
  /** La media al giorno dei giorni con qualcosa nel diario (ultimi 7), e quanti sono. */
  media: Totali | null
  giorniScritti: number
  /** Le attivita' delle ultime quattro settimane, dal contatore: «Schede di allenamento», «Acqua fitness»… */
  attivita: string[]
}

const CREA = 'CREA, Linee guida per una sana alimentazione (2018)'
const LARN_FONTE = 'SINU, LARN (2014)'
const ACSM = 'ACSM, AND, DC – Nutrition and Athletic Performance (2016)'

type Regola = Consiglio & { peso: (c: Contesto) => number }

const pesi = (c: Contesto) => c.attivita.some((a) => /scheda|forza|pesi|tonific/i.test(a))
const acqua = (c: Contesto) => c.attivita.some((a) => /acqua|nuoto/i.test(a))
const cardio = (c: Contesto) => c.attivita.some((a) => /cardio|danza|combatt|bike|acqua|nuoto/i.test(a))
const scritti = (c: Contesto) => c.giorniScritti >= 3 && !!c.media

const REGOLE: Regola[] = [
  {
    id: 'frutta-verdura',
    titolo: 'Cinque porzioni di frutta e verdura',
    testo: 'Le linee guida suggeriscono almeno cinque porzioni al giorno, fra frutta e verdura, di colori diversi: una a ogni pasto e una negli spuntini ci arriva da sola.',
    fonte: CREA,
    icona: 'foglia',
    tono: 'ok',
    peso: (c) => (c.q.frutta_verdura === '0-1' ? 9 : c.q.frutta_verdura === '2-3' ? 7 : 0),
  },
  {
    id: 'acqua',
    titolo: 'Bevi prima di avere sete',
    testo: 'Un litro e mezzo, due litri d’acqua al giorno, di più nei giorni di allenamento e quando fa caldo. Una borraccia in borsa aiuta più di ogni promemoria.',
    fonte: `${CREA}; ${LARN_FONTE}`,
    icona: 'goccia',
    tono: 'blu',
    peso: (c) => (c.q.acqua === 'meno-1' ? 9 : c.q.acqua === '1-1.5' ? 6 : 0) + (acqua(c) ? 1 : 0),
  },
  {
    id: 'acqua-piscina',
    titolo: 'In vasca si suda senza accorgersene',
    testo: 'Nuoto e acqua fitness fanno sudare come gli altri allenamenti, ma l’acqua intorno lo nasconde. Bevi prima e dopo, anche se non hai sete.',
    fonte: ACSM,
    icona: 'goccia',
    tono: 'blu',
    peso: (c) => (acqua(c) ? 5 : 0),
  },
  {
    id: 'proteine-pesi',
    titolo: 'Le proteine, distribuite nella giornata',
    testo: 'Chi si allena con i pesi trae beneficio da un po’ di proteine a ogni pasto, e in quello dopo l’allenamento: per chi si allena con regolarità i riferimenti vanno da 1,2 a 2 g per kg di peso al giorno, contro gli 0,9 di chi è sedentario.',
    fonte: `${ACSM}; ${LARN_FONTE}`,
    icona: 'peso',
    tono: 'accento',
    peso: (c) => (c.q.obiettivo === 'massa' ? 8 : 0) + (pesi(c) ? 3 : 0),
  },
  {
    id: 'proteine-vegetali',
    titolo: 'Proteine anche dalle piante',
    testo: 'Legumi, soia e derivati, cereali integrali e frutta a guscio: abbinare legumi e cereali nello stesso giorno dà proteine complete anche senza carne.',
    fonte: CREA,
    icona: 'foglia',
    tono: 'ok',
    peso: (c) => (c.q.dieta !== 'onnivora' ? 7 : 0),
  },
  {
    id: 'b12',
    titolo: 'La vitamina B12 si integra',
    testo: 'In un’alimentazione vegana la vitamina B12 non arriva dal cibo e va integrata: chiedi al medico quale integratore e quanto.',
    fonte: LARN_FONTE,
    icona: 'info',
    tono: 'neutro',
    peso: (c) => (c.q.dieta === 'vegana' ? 10 : 0),
  },
  {
    id: 'carboidrati',
    titolo: 'I carboidrati sono il carburante',
    testo: 'Nei giorni di allenamento lungo o intenso pasta, riso, pane, patate e frutta danno l’energia che serve: meglio integrali, e non saltarli proprio nei giorni in cui ti alleni.',
    fonte: ACSM,
    icona: 'fulmine',
    tono: 'accento',
    peso: (c) => (c.q.obiettivo === 'prestazione' ? 8 : 0) + (cardio(c) ? 2 : 0),
  },
  {
    id: 'peso-costanza',
    titolo: 'Il peso si muove con la costanza',
    testo: 'Le diete fai-da-te molto basse non durano. Funzionano di più piatti pieni di verdura, legumi e cereali integrali, meno bevande zuccherate e alcol, e un allenamento regolare. Per un percorso su misura serve un professionista.',
    fonte: CREA,
    icona: 'grafico',
    tono: 'neutro',
    peso: (c) => (c.q.obiettivo === 'peso' ? 9 : 0),
  },
  {
    id: 'prima-allenamento',
    titolo: 'Se ti alleni senza colazione',
    testo: 'Uno spuntino leggero un’ora o due prima dell’allenamento (una banana, uno yogurt, due fette biscottate) dà energia senza appesantire.',
    fonte: ACSM,
    icona: 'orologio',
    tono: 'neutro',
    peso: (c) => (c.q.colazione === 'mai' ? 7 : c.q.colazione === 'a-volte' ? 3 : 0),
  },
  {
    id: 'pesce',
    titolo: 'Il pesce due o tre volte a settimana',
    testo: 'Pesce, anche quello azzurro e il surgelato, due o tre volte a settimana, alternato a legumi, uova e carni bianche.',
    fonte: CREA,
    icona: 'piatto',
    tono: 'blu',
    peso: (c) => (c.q.dieta === 'onnivora' && !c.q.esclusioni.includes('pesce') ? 3 : 0),
  },
  {
    id: 'calcio',
    titolo: 'Il calcio senza latte',
    testo: 'Se eviti il lattosio, il calcio arriva anche dai latticini senza lattosio, dalle bevande vegetali arricchite, dai legumi, dalle verdure a foglia verde e da molte acque minerali.',
    fonte: LARN_FONTE,
    icona: 'info',
    tono: 'neutro',
    peso: (c) => (c.q.esclusioni.includes('lattosio') || c.q.dieta === 'vegana' ? 6 : 0),
  },
  {
    id: 'proteine-diario',
    titolo: 'Dal diario: poche proteine',
    testo: `Negli ultimi giorni che hai scritto, le proteine stanno sotto il riferimento per gli adulti (${String(LARN.proteineGKg).replace('.', ',')} g per kg di peso). Un uovo, uno yogurt greco o una porzione di legumi in più fanno la differenza.`,
    fonte: LARN_FONTE,
    icona: 'grafico',
    tono: 'accento',
    peso: (c) => (scritti(c) && c.kg && c.media!.proteine / c.kg < LARN.proteineGKg ? 10 : 0),
  },
  {
    id: 'grassi-diario',
    titolo: 'Dal diario: tanti grassi',
    testo: `I grassi stanno sopra il ${LARN.grassi[1]}% dell’energia, il limite di riferimento. Preferisci l’olio extravergine e misuralo col cucchiaio: un cucchiaio sono circa 90 kcal.`,
    fonte: LARN_FONTE,
    icona: 'grafico',
    tono: 'accento',
    peso: (c) => {
      if (!scritti(c)) return 0
      const m = c.media!
      const e = m.proteine * 4 + m.carboidrati * 4 + m.grassi * 9
      return e > 0 && (m.grassi * 9 * 100) / e > LARN.grassi[1] ? 9 : 0
    },
  },
  {
    id: 'fibre-diario',
    titolo: 'Dal diario: poche fibre',
    testo: 'Per gli adulti il riferimento è di almeno 25 g di fibre al giorno: cereali integrali, legumi, verdura e frutta con la buccia.',
    fonte: LARN_FONTE,
    icona: 'grafico',
    tono: 'ok',
    peso: (c) => (scritti(c) && c.media!.fibre < 25 ? 6 : 0),
  },
  {
    id: 'sale',
    titolo: 'Meno di un cucchiaino di sale',
    testo: 'L’OMS indica meno di 5 g di sale al giorno, un cucchiaino raso, compreso quello già nel pane, nei salumi e nei formaggi. Spezie ed erbe aiutano a non sentirne la mancanza.',
    fonte: 'OMS (2012)',
    icona: 'info',
    tono: 'neutro',
    peso: () => 1,
  },
  {
    id: 'zuccheri',
    titolo: 'Gli zuccheri aggiunti, con misura',
    testo: 'L’OMS raccomanda che gli zuccheri aggiunti stiano sotto il 10% dell’energia della giornata: le bevande zuccherate ne sono la fonte più facile da togliere.',
    fonte: 'OMS (2015)',
    icona: 'info',
    tono: 'neutro',
    peso: () => 1,
  },
]

/** I consigli per questo socio, i piu' pertinenti per primi; con le domande di cautela, l'invito al medico. */
export function consigliPer(c: Contesto, quanti = 4): Consiglio[] {
  if (dalMedico(c.q)) {
    return [
      {
        id: 'medico',
        titolo: 'Per te, prima il medico',
        testo: c.q.gravidanza
          ? 'In gravidanza e in allattamento le indicazioni sull’alimentazione le dà il medico o l’ostetrica: qui puoi tenere il diario, ma i consigli generali non sono pensati per questo periodo.'
          : 'Con una condizione per cui il medico ti ha dato indicazioni sull’alimentazione, valgono le sue: qui puoi tenere il diario e mostrarglielo, ma i consigli generali potrebbero non essere giusti per te.',
        fonte: 'Athlon Club',
        icona: 'certificato',
        tono: 'neutro',
      },
    ]
  }
  return REGOLE.map((r) => ({ r, p: r.peso(c) }))
    .filter((x) => x.p > 0)
    .sort((a, b) => b.p - a.p)
    .slice(0, quanti)
    .map(({ r }) => ({ id: r.id, titolo: r.titolo, testo: r.testo, fonte: r.fonte, icona: r.icona, tono: r.tono }))
}
