// Quale certificato medico serve, scritto una volta sola (17/10/2026, dal club):
// lo leggono il fumetto «i» della sezione Certificato, il foglio in cui si carica il
// file e la pagina del link dell'email. Lo stesso testo dice il CRM nelle email che
// chiedono il certificato (`dettagliCertificato`, APP-ATHLON): se cambia, cambia in
// tutti e due i posti.
//
// Senza «invialo al desk»: nel portale non si rimanda al desk (13/10/2026). Il
// certificato si consegna da qui, in formato digitale.

import { t, tv } from './lingua'

export const CERTIFICATO_ISTRUZIONI = {
  titolo: t('Quale certificato serve', 'Which certificate you need'),
  /** Il tipo, e cosa non va bene. */
  tipo: t('Certificato di idoneità all’attività sportiva non agonistica.', 'A certificate of fitness for non-competitive sports (certificato di idoneità all’attività sportiva non agonistica).'),
  escluso: t('Non vanno bene il certificato di «sana e robusta costituzione» né quello «ludico motorio».', 'A «sana e robusta costituzione» (general good health) certificate or a «ludico motorio» (recreational activity) certificate won’t do.'),
  /** Cosa deve riportare. */
  ecg: t('Deve riportare scritto che è stato eseguito l’ECG, con la data di esecuzione. Basta averlo fatto almeno una volta nella vita.', 'It must state that an ECG was performed, with the date it was done. Having one at least once in your life is enough.'),
  /** Chi puo' rilasciarlo. */
  chiTitolo: t('Può essere redatto da:', 'It can be issued by:'),
  chi: tv(
    [
      'un medico sportivo',
      'un medico iscritto alla FMSI',
      'il medico curante: in questo caso deve esserci il timbro con il codice regionale della ASL di riferimento',
    ],
    [
      'a sports doctor',
      'a doctor registered with the FMSI',
      'your family doctor: in this case it must carry the stamp with the regional code of the local health authority (ASL)',
    ],
  ),
  bambini: t('Per i soli bambini può rilasciarlo anche il pediatra di libera scelta.', 'For children only, it can also be issued by their pediatrician.'),
  /** Le cose da sapere intorno. */
  note: tv(
    [
      'Obbligatorio dai 6 anni. Vale un anno dalla data di rilascio; dopo i 60 anni, con fattori di rischio cardiovascolare, l’ECG va rifatto ogni anno.',
      'Il certificato agonistico serve solo per pallanuoto Under 14 e Under 16, nuoto agonistico e nuoto propaganda: lo rilascia solo il medico dello sport, con il modulo della società.',
    ],
    [
      'Required from age 6. It’s valid for one year from the date of issue; after age 60, with cardiovascular risk factors, the ECG must be repeated every year.',
      'A competitive-sports certificate is only needed for water polo Under 14 and Under 16, competitive swimming and pre-competitive swimming (nuoto propaganda): only a sports doctor can issue it, using the club’s form.',
    ],
  ),
} as const

/** Le stesse cose in righe, per il fumetto «i» e per chi legge con uno screen reader. */
export function istruzioniInRighe(): string[] {
  const i = CERTIFICATO_ISTRUZIONI
  return [
    `${i.tipo} ${i.escluso}`,
    i.ecg,
    `${i.chiTitolo} ${i.chi.join('; ')}. ${i.bambini}`,
    ...i.note,
  ]
}

/** Il file che si carica: foto o PDF. */
export const FORMATI_CERTIFICATO = t('JPG, PNG o PDF', 'JPG, PNG or PDF')
