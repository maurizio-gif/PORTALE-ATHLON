// Quale certificato medico serve, scritto una volta sola (17/10/2026, dal club):
// lo leggono il fumetto «i» della sezione Certificato, il foglio in cui si carica il
// file e la pagina del link dell'email. Lo stesso testo dice il CRM nelle email che
// chiedono il certificato (`dettagliCertificato`, APP-ATHLON): se cambia, cambia in
// tutti e due i posti.
//
// Senza «invialo al desk»: nel portale non si rimanda al desk (13/10/2026). Il
// certificato si consegna da qui, in formato digitale.

export const CERTIFICATO_ISTRUZIONI = {
  titolo: 'Quale certificato serve',
  /** Il tipo, e cosa non va bene. */
  tipo: 'Certificato di idoneità all’attività sportiva non agonistica.',
  escluso: 'Non vanno bene il certificato di «sana e robusta costituzione» né quello «ludico motorio».',
  /** Cosa deve riportare. */
  ecg: 'Deve riportare scritto che è stato eseguito l’ECG, con la data di esecuzione. Basta averlo fatto almeno una volta nella vita.',
  /** Chi puo' rilasciarlo. */
  chiTitolo: 'Può essere redatto da:',
  chi: [
    'un medico sportivo',
    'un medico iscritto alla FMSI',
    'il medico curante: in questo caso deve esserci il timbro con il codice regionale della ASL di riferimento',
  ],
  bambini: 'Per i soli bambini può rilasciarlo anche il pediatra di libera scelta.',
  /** Le cose da sapere intorno. */
  note: [
    'Obbligatorio dai 6 anni. Vale un anno dalla data di rilascio; dopo i 60 anni, con fattori di rischio cardiovascolare, l’ECG va rifatto ogni anno.',
    'Il certificato agonistico serve solo per pallanuoto Under 14 e Under 16, nuoto agonistico e nuoto propaganda: lo rilascia solo il medico dello sport, con il modulo della società.',
  ],
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
export const FORMATI_CERTIFICATO = 'JPG, PNG o PDF'
