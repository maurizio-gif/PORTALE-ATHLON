// L'informativa dei dispositivi (Oura, Polar) e del sonno scritto a mano, da accettare nell'app
// prima di collegarne uno o di scrivere una notte (19-20/10/2026): sonno, battito e allenamenti
// di un dispositivo sono dati sulla salute (art. 9 del GDPR), e la base e' il consenso esplicito.
//
// **La versione e' la stessa della funzione** (VERSIONE_INFORMATIVA in
// supabase/functions/_shared/dispositivi/tipi.ts, APP-ATHLON). Cambiando il testo si cambia
// la versione in tutti e due i posti: la sezione si richiude, la lettura dei dispositivi si
// ferma e il socio riaccetta.
//
// Il testo descrive quello che il codice fa davvero: se il codice cambia (un dato in piu',
// un fornitore in piu', un tempo di conservazione diverso), cambia anche questo. Va fatto
// rileggere dal consulente privacy del club prima di aprire la sezione a tutti.

// 2026-10-27: dice anche di Apple Salute (passi, sonno e allenamenti letti dall'iPhone).
// 2026-10-20: dice anche del sonno che si scrive a mano e dell'Athlon Health Score.
import { t, tv } from '../../../lib/lingua'

export const VERSIONE_INFORMATIVA = '2026-10-27'

export const CONSENSO = t(
  'Acconsento al trattamento dei miei dati relativi alla salute (il sonno che scrivo io, e sonno, recupero, battito e allenamenti del mio dispositivo) per mostrarli nell’app e calcolare il mio Athlon Health Score, come descritto nell’informativa.',
  'I consent to the processing of my health data (the sleep I log myself, and the sleep, recovery, heart rate and workouts from my device) to show them in the app and calculate my Athlon Health Score, as described in the privacy notice.',
)

export const INFORMATIVA: { titolo: string; testo: string }[] = tv([
  {
    titolo: 'Che cos’è',
    testo:
      'Puoi scrivere ogni mattina quanto hai dormito, e collegare il tuo anello Oura o il tuo orologio Polar all’app del club. L’app mostra il tuo sonno, come ti sei ripreso e gli allenamenti che il dispositivo ha registrato, accanto a quelli fatti nel club. Sono valori indicativi: non sono un parere medico e non servono a fare diagnosi.',
  },
  {
    titolo: 'Quali dati leggiamo',
    testo:
      'Il sonno che scrivi tu: la notte, a che ora sei andato a dormire e a che ora ti sei svegliato. Dal dispositivo, per ogni giorno: il punteggio e la durata del sonno (con le fasi profonda e REM), il punteggio di recupero del dispositivo, il battito più basso della notte e la sua variabilità, i passi e le calorie dell’attività. Per ogni allenamento: lo sport, quando è iniziato, quanto è durato, le calorie e, se il dispositivo li dà, il battito medio e massimo. Non leggiamo la tua posizione né i tuoi percorsi, né la serie dei battiti (da quella della notte prendiamo solo il valore più basso e il resto lo scartiamo), né i dati del tuo profilo presso Oura o Polar come email, età o sesso. Su iPhone puoi anche leggere da Apple Salute i tuoi passi, il sonno e gli allenamenti: sceglie Apple, nel suo foglio, cosa condividere, e noi leggiamo solo quello. Dall’iPhone non leggiamo il battito né la posizione.',
  },
  {
    titolo: 'Come funziona il collegamento',
    testo:
      'Dal pulsante «Collega» vai sul sito di Oura o di Polar, accedi con il tuo account e autorizzi il club a leggere quei dati: noi non vediamo mai la tua password. Il permesso si può togliere quando vuoi, da qui e anche dalle impostazioni del tuo account Oura o Polar. I dati si aggiornano da soli, circa ogni mezz’ora, quando il dispositivo ha sincronizzato col telefono. Oura e Polar trattano i tuoi dati anche per conto loro, secondo le loro informative.',
  },
  {
    titolo: 'Perché e su quale base',
    testo:
      'Per mostrarti i tuoi dati, metterli accanto al tuo allenamento e calcolare il tuo Athlon Health Score (il punteggio dell’Athlon Health System: il sonno è una delle sue tre parti), e per nient’altro: non li usiamo per decidere niente su di te né per comunicazioni commerciali. Sono dati relativi alla salute: li trattiamo solo con il tuo consenso esplicito (art. 9, par. 2, lett. a del GDPR), che dai qui sotto.',
  },
  {
    titolo: 'Chi li vede',
    testo:
      'Solo tu. Lo staff del club e i trainer non vedono i dati dei tuoi dispositivi né dall’app né dal gestionale, e non vanno su PerfectGym. Li conserviamo in un database protetto, e le chiavi di accesso al tuo dispositivo (i «token») le teniamo cifrate: nemmeno l’app le vede.',
  },
  {
    titolo: 'Per quanto e come toglierli',
    testo:
      'Teniamo il riassunto dei tuoi ultimi 90 giorni e gli allenamenti di quel periodo, e cancelliamo il resto. Se scolleghi un dispositivo cancelliamo subito i suoi dati. Se revochi il consenso, da questa stessa sezione, scolleghiamo tutti i dispositivi e cancelliamo tutto subito, comprese le notti che hai scritto tu: resta solo la registrazione di quando hai dato e revocato il consenso, come prova. Per gli altri diritti (accesso, rettifica, cancellazione, reclamo al Garante) vale l’informativa privacy del club.',
  },
  {
    titolo: 'Per chi non è',
    testo:
      'La sezione è riservata ai maggiorenni. Se un numero ti preoccupa o ti mette a disagio, non interpretarlo da solo: parlane con il tuo medico. L’app non dà consigli medici e non ti dice cosa fare in base ai tuoi valori.',
  },
], [
  {
    titolo: 'Courtesy translation',
    testo:
      'Courtesy translation: the Italian text is the binding version.',
  },
  {
    titolo: 'What it is',
    testo:
      'You can log how long you slept each morning, and connect your Oura ring or Polar watch to the club app. The app shows your sleep, how well you’ve recovered and the workouts your device recorded, next to the ones you do at the club. These are approximate values: they are not medical advice and are not for diagnosis.',
  },
  {
    titolo: 'What data we read',
    testo:
      'The sleep you log yourself: the night, what time you went to bed and what time you woke up. From your device, for each day: the sleep score and duration (with deep and REM stages), the device’s recovery score, the lowest heart rate of the night and its variability, steps and activity calories. For each workout: the sport, when it started, how long it lasted, calories and, if the device provides them, average and maximum heart rate. We don’t read your location or routes, or the heart-rate series (from the night’s series we take only the lowest value and discard the rest), or your profile data at Oura or Polar such as email, age or sex. On iPhone you can also read your steps, sleep and workouts from Apple Health: Apple’s own sheet lets you choose what to share, and we only read that. We don’t read heart rate or location from the iPhone.',
  },
  {
    titolo: 'How the connection works',
    testo:
      'With the “Connect” button you go to the Oura or Polar site, sign in to your account and authorize the club to read that data: we never see your password. You can remove the permission whenever you like, from here and also from your Oura or Polar account settings. The data updates by itself, about every half hour, when the device has synced with your phone. Oura and Polar also process your data on their own behalf, under their own privacy notices.',
  },
  {
    titolo: 'Why and on what basis',
    testo:
      'To show you your data, put it next to your training and calculate your Athlon Health Score (the Athlon Health System score: sleep is one of its three parts), and for nothing else: we don’t use it to decide anything about you or for marketing communications. This is health data: we process it only with your explicit consent (art. 9(2)(a) GDPR), which you give below.',
  },
  {
    titolo: 'Who sees it',
    testo:
      'Only you. Club staff and trainers can’t see your device data, neither from the app nor from the management system, and it doesn’t go to PerfectGym. We keep it in a protected database, and the access keys to your device (the “tokens”) are stored encrypted: not even the app sees them.',
  },
  {
    titolo: 'How long, and how to remove it',
    testo:
      'We keep the summary of your last 90 days and the workouts from that period, and delete the rest. If you disconnect a device we delete its data straight away. If you withdraw consent, from this same section, we disconnect all devices and delete everything straight away, including the nights you logged yourself: only the record of when you gave and withdrew consent is kept, as proof. For your other rights (access, correction, deletion, complaint to the Italian Data Protection Authority) the club’s privacy notice applies.',
  },
  {
    titolo: 'Who it isn’t for',
    testo:
      'This section is for adults only. If a number worries you or makes you uncomfortable, don’t interpret it on your own: talk to your doctor. The app doesn’t give medical advice and doesn’t tell you what to do based on your values.',
  },
])
