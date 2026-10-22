// L'informativa di «Il tuo corpo» (20/10/2026), da accettare nell'app prima di segnare o usare le misure: altezza,
// peso, BMI, circonferenze, massa grassa e magra e il sesso scelto per le calorie sono dati relativi alla salute
// (art. 9 GDPR), e la base e' il consenso esplicito. Fino al 20/10/2026 l'app li trattava senza un consenso
// proprio: la correzione e' venuta dall'analisi privacy dell'Athlon Health Score.
//
// **La versione e' la stessa della funzione** (VERSIONE_INFORMATIVA_CORPO in `_shared/consensi/corpo.ts`,
// APP-ATHLON, che leggono portale-lab-misure e portale-lab-schede). Cambiando il testo si cambia la versione nei
// due posti: il consenso decade, le misure tornano vuote e il socio riaccetta.
//
// Il testo descrive quello che il codice fa davvero: se il codice cambia (un uso in piu' delle misure), cambia anche
// questo. Va fatto rileggere dal consulente privacy del club prima di aprire la sezione a tutti.

import { t, tv } from '../../../lib/lingua'

export const VERSIONE_INFORMATIVA_CORPO = '2026-10-20'

export const CONSENSO_CORPO = t(
  'Acconsento al trattamento dei miei dati relativi alla salute (altezza, peso, circonferenze, massa grassa e massa magra, sesso scelto per il calcolo) per usare «Il tuo corpo» e le stime che ne dipendono, come descritto nell’informativa.',
  'I consent to the processing of my health data (height, weight, body measurements, body fat and lean mass, sex chosen for the calculation) to use “Your body” and the estimates based on it, as described in the privacy notice.',
)

export const INFORMATIVA_CORPO: { titolo: string; testo: string }[] = tv([
  {
    titolo: 'Che cos’è',
    testo:
      '«Il tuo corpo» è il posto dove segni altezza e peso (il BMI lo calcola l’app) e, se vuoi, circonferenze e composizione corporea (massa grassa e massa magra), per vedere come cambi nel tempo. Non è una valutazione medica: il BMI è un’indicazione generale e non distingue i muscoli dal grasso.',
  },
  {
    titolo: 'Quali dati usiamo',
    testo:
      'Quello che scrivi: altezza, peso, vita, fianchi, petto, braccio, coscia, massa grassa e massa magra, una nota e la data di ogni misurazione; e il sesso (uomo o donna) che scegli per il calcolo delle calorie. Per le stime usiamo anche l’età che risulta sulla tua scheda del club.',
  },
  {
    titolo: 'A che cosa servono',
    testo:
      'A mostrarti l’andamento e a stimare quanto consumi: il contatore delle calorie, le calorie delle lezioni, il Balance, i riferimenti della sezione Alimentazione e il carico stimato di alcuni esercizi dei piani di allenamento (dal peso). Per nient’altro: non entrano nell’Athlon Health Score né nei livelli, e non vanno a nessun fornitore esterno.',
  },
  {
    titolo: 'Su quale base',
    testo:
      'Sono dati relativi alla salute: li trattiamo solo con il tuo consenso esplicito (art. 9, par. 2, lett. a del GDPR), che dai qui sotto. Se non lo dai, le stime che dipendono da peso e altezza non sono disponibili, e il resto dell’app funziona.',
  },
  {
    titolo: 'Chi li vede',
    testo:
      'Solo tu: dall’app lo staff del club non li vede e non vanno su PerfectGym. Se un istruttore del club ha segnato delle misure per te, restano dati del club e non si cancellano con la revoca, ma l’app non te le mostra finché non c’è il consenso.',
  },
  {
    titolo: 'Per quanto e come toglierli',
    testo:
      'Finché li tieni. Puoi toglierle una per una, o ritirare il consenso quando vuoi da «Il tuo corpo»: le misure e il sesso che hai scritto vengono cancellati subito. Conserviamo solo la registrazione di quando hai dato e ritirato il consenso, come prova. Per gli altri diritti (accesso, rettifica, cancellazione, reclamo al Garante) vale l’informativa privacy del club.',
  },
], [
  {
    titolo: 'Courtesy translation',
    testo: 'Courtesy translation: the Italian text is the binding version.',
  },
  {
    titolo: 'What it is',
    testo:
      '“Your body” is where you log your height and weight (the app calculates your BMI) and, if you like, body measurements and body composition (body fat and lean mass), to see how you change over time. It isn’t a medical assessment: BMI is a general indication and doesn’t tell muscle from fat.',
  },
  {
    titolo: 'What data we use',
    testo:
      'What you write: height, weight, waist, hips, chest, arm, thigh, body fat and lean mass, a note and the date of each measurement; and the sex (man or woman) you choose for the calorie calculation. For the estimates we also use the age shown on your club profile.',
  },
  {
    titolo: 'What it’s used for',
    testo:
      'To show you the trend and to estimate how much you burn: the calorie counter, class calories, Balance, the reference values in the Nutrition section and the estimated load of some exercises in workout plans (from your weight). Nothing else: it doesn’t go into the Athlon Health Score or the levels, and it isn’t sent to any outside provider.',
  },
  {
    titolo: 'On what basis',
    testo:
      'This is health data: we process it only with your explicit consent (art. 9(2)(a) GDPR), which you give below. If you don’t give it, the estimates based on weight and height aren’t available, and the rest of the app works.',
  },
  {
    titolo: 'Who sees it',
    testo:
      'Only you: club staff can’t see it from the app, and it doesn’t go to PerfectGym. If a club instructor recorded measurements for you, they remain club data and aren’t deleted when you withdraw consent, but the app won’t show them to you until consent is given.',
  },
  {
    titolo: 'How long, and how to remove it',
    testo:
      'For as long as you keep it. You can remove measurements one by one, or withdraw consent whenever you like from “Your body”: the measurements and sex you wrote are deleted straight away. We keep only the record of when you gave and withdrew consent, as proof. For your other rights (access, correction, deletion, complaint to the Italian Data Protection Authority) the club’s privacy notice applies.',
  },
])
