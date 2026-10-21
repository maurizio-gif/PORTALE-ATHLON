// La sezione 9 dei «Termini e Condizioni Generali» (Abbonamenti aggiuntivi: personal), mostrata nel foglio
// dell'Abbonamento PT (21/10/2026, richiesta di Maurizio). **E' testo di contratto: copiato alla lettera** da
// `src/data/termini.json` del sito (SITO-ATHLON, documento «Termini e Condizioni Athlon Club — Aprile 2026»), che e' la
// fonte e lo pubblica su /regolamento. Non si riscrive a pezzi: se il sito cambia la sezione 9, si ricopia da li'.
// Non si legge dal sito a ogni apertura perche' il catalogo pubblico (`/contratto-abbonamento.json`) porta solo le
// sezioni 1, 2, 3 e 7.

import { tv } from '../../../lib/lingua'

export const VERSIONE_TERMINI_PERSONAL = 'Aprile 2026'

/**
 * Il testo del contratto non si traduce: in inglese, accanto all'estratto, si dice che i termini sono solo in italiano.
 * `null` in italiano. Lo mostra chi disegna l'estratto (`EstrattoTermini` in Personal.tsx).
 */
export const NOTA_LINGUA_TERMINI: string | null = tv<string | null>(null, 'The terms are available in Italian only.')

export const SEZIONE_9 = {
  numero: '9',
  titolo: 'Abbonamenti aggiuntivi: lezioni individuali (personal)',
  clausole: [
    {
      id: '9.1',
      titolo: 'Attività Sportive Comprese nell’Abbonamento',
      testo:
        '2 Sedute al Mese: 2 Sedute di Personal Training utilizzabili nel mese solare (dal 1 a fine mese). 4 Sedute al Mese: 4 Sedute di Personal Training utilizzabili nel mese solare (dal 1 a fine mese). 8 Sedute al Mese: 8 Sedute di Personal Training utilizzabili nel mese solare (dal 1 a fine mese). Le sedute vengono caricate in automatico il 1 giorno del mese e possono essere utilizzate entro o non oltre il mese stesso. Nel caso il contratto cominci a mese iniziato, verrà richiesto il pagamento del mese per intero e verranno caricate il numero totale di sedute previste dal pacchetto, che potranno essere consumate entro la fine del mese solare di inizio abbonamento (Es. inizio contratto 20/10, importo del mese richiesto per intero, numero di lezioni caricate per intero, utilizzabili entro il 31/10)',
    },
    {
      id: '9.2',
      titolo: 'Piani di pagamento – mensile',
      testo:
        'L’abbonamento decorre dalla data di partenza indicata in fase di iscrizione. Piano di Pagamento Mensile a rinnovo automatico, l’addebito avviene ogni giorno 1 del mese. La durata dell’abbonamento è di almeno un mese. L’abbonamento si rinnoverà in modo automatico, mensilmente, salvo disdetta (v. punto 9.3)',
    },
    {
      id: '9.3',
      titolo: 'Disdetta',
      testo:
        'per annullare il rinnovo automatico dell’abbonamento è possibile effettuare la disdetta direttamente dalla propria area riservata cliccando su > Abbonamenti > Disdici Rinnovo Automatico. La disdetta può essere effettuata almeno 10 giorni prima del successivo ciclo di pagamento NB 10 giorni equivalgono a 240 ore prima della mezzanotte del 1 giorno del mese. ● Mese con 31 Giorni la disdetta va effettuata entro la mezzanotte del 21 ● Mese con 30 Giorni la disdetta va effettuata entro la mezzanotte del 20 ● Mese con 28 Giorni la disdetta va effettuata entro la mezzanotte del 18 In caso di disdetta e successiva iscrizione si sarà tenuti al pagamento di una nuova quota di attivazione e alle nuove condizioni contrattuali del momento',
    },
    {
      id: '9.4',
      titolo: 'Prenotazioni',
      testo:
        'a seconda del pacchetto scelto sarà possibile prenotare un certo numero di sedute di allenamento individuale nell’arco del mese solare. Le lezioni individuali devono essere prenotate e fruite nel mese di competenza. Non è possibile recuperare le lezioni del mese precedente. Le prenotazioni devono essere effettuate in anticipo attraverso il Portale/APP Athlon, scegliendo tra la disponibilità visibile dell’istruttore. Le lezioni verranno caricate alla mezzanotte del 1 giorno del mese, e da quel momento sarà possibile effettuare la prenotazione',
    },
  ],
} as const
