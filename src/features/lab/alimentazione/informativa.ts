// L'informativa della sezione Alimentazione (19/10/2026), da accettare nell'app
// prima di usarla: diario, questionario e foto dei pasti sono dati sulla salute
// (art. 9 del GDPR), e la base e' il consenso esplicito.
//
// **La versione e' la stessa della funzione** (VERSIONE_INFORMATIVA in
// portale-lab-alimentazione, APP-ATHLON). Cambiando il testo si cambia la
// versione in tutti e due i posti: la sezione si richiude e il socio la riaccetta.
//
// Il testo descrive quello che il codice fa davvero: se il codice cambia (un dato
// in piu', un fornitore diverso per le foto), cambia anche questo. Va fatto
// rileggere dal consulente privacy del club prima di aprire la sezione a tutti.

export const VERSIONE_INFORMATIVA = '2026-10-19'

export const CONSENSO =
  'Acconsento al trattamento dei miei dati relativi alla salute (diario dei pasti, risposte al questionario e foto dei piatti) per usare la sezione Alimentazione, come descritto nell’informativa.'

export const INFORMATIVA: { titolo: string; testo: string }[] = [
  {
    titolo: 'Che cos’è',
    testo:
      'Una sezione di educazione alimentare: un diario di quello che mangi, una stima delle calorie e dei nutrienti, e dei consigli generali presi dalle linee guida per una sana alimentazione. Non è una dieta, non è un parere medico e non c’è un nutrizionista che ti segue: per un piano su misura serve un professionista (medico, dietista o biologo nutrizionista).',
  },
  {
    titolo: 'Quali dati usiamo',
    testo:
      'Quello che scrivi nel diario (cosa, quanto, quando); le risposte al questionario, comprese quelle sulla gravidanza, su eventuali condizioni mediche e sul tuo rapporto col cibo; il numero e l’esito delle foto analizzate (non la foto). Per le stime usiamo anche peso, altezza, età e sesso che hai già nell’app, e le attività che il contatore delle calorie conta.',
  },
  {
    titolo: 'La foto del piatto',
    testo:
      'Quando scatti o scegli una foto, la mandiamo a un servizio di intelligenza artificiale esterno (il modello Claude di Anthropic, attraverso OpenRouter) che riconosce gli alimenti e stima i grammi. Questi fornitori possono trattarla anche fuori dall’Unione Europea. Noi non la salviamo: né l’app né i nostri server ne conservano una copia. Fotografa solo il piatto, senza persone.',
  },
  {
    titolo: 'Perché e su quale base',
    testo:
      'Per mostrarti il diario, le stime e i consigli, e per nient’altro. Sono dati relativi alla salute: li trattiamo solo con il tuo consenso esplicito (art. 9, par. 2, lett. a del GDPR), che dai qui sotto.',
  },
  {
    titolo: 'Chi li vede',
    testo:
      'Solo tu. Lo staff del club non vede la tua sezione Alimentazione né dall’app né dal gestionale, i dati non vanno su PerfectGym e non li usiamo per comunicazioni commerciali.',
  },
  {
    titolo: 'Per quanto e come toglierli',
    testo:
      'Li teniamo finché usi la sezione. Puoi revocare il consenso quando vuoi, da questa stessa sezione: il diario, il questionario e il registro delle foto vengono cancellati subito. Conserviamo solo la registrazione di quando hai dato e revocato il consenso, come prova. Per gli altri diritti (accesso, rettifica, cancellazione, reclamo al Garante) vale l’informativa privacy del club.',
  },
  {
    titolo: 'Per chi non è',
    testo:
      'La sezione è riservata ai maggiorenni. In gravidanza o allattamento, con una condizione medica che riguarda l’alimentazione, o se contare il cibo ti mette a disagio, parlane prima con il tuo medico: il questionario te lo chiede, e in quei casi la sezione resta un semplice diario.',
  },
]
