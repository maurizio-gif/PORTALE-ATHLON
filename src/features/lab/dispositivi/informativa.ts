// L'informativa dei dispositivi (Apple Salute, Health Connect) e del sonno scritto a mano, da accettare nell'app
// prima di far arrivare i dati di un dispositivo o di scrivere una notte (19-20/10/2026): sonno, battito e allenamenti
// di un dispositivo sono dati sulla salute (art. 9 del GDPR), e la base e' il consenso esplicito.
//
// **La versione e' la stessa della funzione** (VERSIONE_INFORMATIVA in
// supabase/functions/_shared/dispositivi/tipi.ts, APP-ATHLON). Cambiando il testo si cambia
// la versione in tutti e due i posti: la sezione si richiude, la lettura dei dispositivi si
// ferma e il socio riaccetta.
//
// Il testo descrive quello che il codice fa davvero: se il codice cambia (un dato in piu',
// un fornitore in piu', un tempo di conservazione diverso), cambia anche questo. **Va fatto
// rileggere dal consulente privacy del club prima di pubblicarlo** (bozza e punti da verificare:
// docs/informativa-dispositivi-bozza.md).

// 2026-11-02: via Oura e Polar e il pulsante «Collega» (il club non si collega ai servizi dei produttori), dice di Health Connect (Android),
// che la lettura avviene solo quando si apre l'app, dei dati aggiunti il 31/10 (esercizio, ore in piedi, meditazione, luce del giorno)
// e che la revoca cancella anche le abitudini scelte.
// 2026-10-28: Apple Salute fa da hub (battito a riposo, variabilita', fasi del sonno, calorie, battito degli allenamenti, nome dell'app o
// dispositivo che li ha scritti) e gli allenamenti si possono scrivere a mano.
// 2026-10-27: dice anche di Apple Salute (passi, sonno e allenamenti letti dall'iPhone).
// 2026-10-20: dice anche del sonno che si scrive a mano e dell'Athlon Health Score.
import { t, tv } from '../../../lib/lingua'

export const VERSIONE_INFORMATIVA = '2026-11-02'

export const CONSENSO = t(
  'Acconsento al trattamento dei miei dati relativi alla salute (il sonno e gli allenamenti che scrivo io, e i dati che Apple Salute o Health Connect condividono con l’app: sonno, passi, battito, calorie e allenamenti) per mostrarli nell’app, stimare le calorie e calcolare il mio Athlon Health Score, come descritto nell’informativa.',
  'I consent to the processing of my health data (the sleep and workouts I log myself, and the data Apple Health or Health Connect share with the app: sleep, steps, heart rate, calories and workouts) to show them in the app, estimate calories and calculate my Athlon Health Score, as described in the privacy notice.',
)

export const INFORMATIVA: { titolo: string; testo: string }[] = tv([
  {
    titolo: 'Che cos’è',
    testo:
      'Puoi scrivere ogni mattina quanto hai dormito, e far arrivare all’app i dati del tuo orologio, del tuo anello o della tua app di fitness attraverso Apple Salute (iPhone) o Health Connect (Android). L’app mostra il tuo sonno e gli allenamenti che il dispositivo ha registrato, accanto a quelli fatti nel club, e li usa nella sezione Recover e in Train. Sono valori indicativi: non sono un parere medico e non servono a fare diagnosi.',
  },
  {
    titolo: 'Quali dati leggiamo',
    testo:
      'Il sonno che scrivi tu: la notte, a che ora sei andato a dormire e a che ora ti sei svegliato. Da Apple Salute o da Health Connect, per ogni giorno, quello che il telefono ha e tu consenti: i passi, il sonno con le sue fasi, il battito a riposo, le calorie di movimento, i minuti di esercizio e di meditazione e, su iPhone, anche la variabilità del battito, le ore in piedi e il tempo alla luce del giorno; e per ogni allenamento: lo sport, quando è iniziato, quanto è durato, le calorie e il battito medio e massimo. Leggiamo anche il nome dell’app o del dispositivo che ha scritto ogni dato (per esempio «Apple Watch» o «Garmin Connect»), per mostrarti da chi stai ricevendo. Quando consenti l’accesso, il telefono ti fa scegliere cosa condividere, e noi leggiamo solo quello. Non leggiamo la tua posizione né i tuoi percorsi, non salviamo la serie dei battiti (solo il battito medio e massimo di ogni allenamento) né altri dati di Salute (peso, altezza, ciclo, glicemia…). Puoi anche scrivere a mano un allenamento (sport, quando, quanto è durato, quanto è stato intenso, e il battito medio se lo conosci): le calorie le stimiamo noi.',
  },
  {
    titolo: 'Come arrivano i dati',
    testo:
      'Il tuo orologio, il tuo anello o la tua app di fitness scrivono su Apple Salute o su Health Connect con la loro app: è lì che attivi la condivisione, e puoi cambiarla quando vuoi. L’app del club legge solo quando la apri, e solo le categorie che hai consentito; puoi toglierle da Impostazioni › Salute › Accesso ai dati e dispositivi (iPhone) o da Impostazioni › Health Connect › Autorizzazioni delle app (Android). Il club non si collega ai servizi dei produttori (Garmin, Fitbit e gli altri) e non ha le credenziali del tuo account con loro. Quei produttori trattano i tuoi dati anche per conto loro, secondo le loro informative.',
  },
  {
    titolo: 'Perché e su quale base',
    testo:
      'Per mostrarti i tuoi dati, metterli accanto al tuo allenamento, stimare le calorie e calcolare il tuo Athlon Health Score (il punteggio dell’Athlon Health System: il sonno è una delle sue tre parti, Recover, e gli allenamenti dei dispositivi contano come giorni di attività), e per nient’altro: non li usiamo per decidere niente su di te né per comunicazioni commerciali. Sono dati relativi alla salute: li trattiamo solo con il tuo consenso esplicito (art. 9, par. 2, lett. a del GDPR), che dai qui sotto.',
  },
  {
    titolo: 'Chi li vede',
    testo:
      'Solo tu. Lo staff del club e i trainer non vedono i dati dei tuoi dispositivi né dall’app né dal gestionale, e non vanno su PerfectGym. Li conserviamo in un database protetto.',
  },
  {
    titolo: 'Per quanto e come toglierli',
    testo:
      'Teniamo il riassunto dei tuoi ultimi 90 giorni e gli allenamenti di quel periodo, e cancelliamo il resto. Se disattivi Apple Salute o Health Connect, nell’app, cancelliamo subito i suoi dati. Se revochi il consenso, da questa stessa sezione, cancelliamo tutto subito, comprese le notti e gli allenamenti che hai scritto tu e le abitudini che hai scelto con i valori che hai scritto: resta solo la registrazione di quando hai dato e revocato il consenso, come prova. Per gli altri diritti (accesso, rettifica, cancellazione, reclamo al Garante) vale l’informativa privacy del club.',
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
      'You can log how long you slept each morning, and have the data from your watch, ring or fitness app reach the app through Apple Health (iPhone) or Health Connect (Android). The app shows your sleep and the workouts your device recorded, next to the ones you do at the club, and uses them in the Recover section and in Train. These are approximate values: they are not medical advice and are not for diagnosis.',
  },
  {
    titolo: 'What data we read',
    testo:
      'The sleep you log yourself: the night, what time you went to bed and what time you woke up. From Apple Health or Health Connect, for each day, whatever your phone has and you allow: steps, sleep with its stages, resting heart rate, active calories, minutes of exercise and mindfulness and, on iPhone, also heart rate variability, stand hours and time in daylight; and for each workout: the sport, when it started, how long it lasted, calories and average and maximum heart rate. We also read the name of the app or device that wrote each piece of data (for example “Apple Watch” or “Garmin Connect”), to show you who you’re receiving from. When you allow access, your phone lets you choose what to share, and we only read that. We don’t read your location or routes, we don’t store the heart-rate series (only the average and maximum heart rate of each workout) or any other Health data (weight, height, cycle, glucose…). You can also log a workout by hand (sport, when, how long, how hard, and average heart rate if you know it): we estimate the calories.',
  },
  {
    titolo: 'How the data arrives',
    testo:
      'Your watch, ring or fitness app write to Apple Health or Health Connect with their own app: that’s where you turn sharing on, and you can change it whenever you like. The club app reads only when you open it, and only the categories you allowed; you can remove them from Settings › Health › Data Access & Devices (iPhone) or Settings › Health Connect › App permissions (Android). The club doesn’t connect to the manufacturers’ services (Garmin, Fitbit and the others) and doesn’t have your account credentials with them. Those manufacturers also process your data on their own behalf, under their own privacy notices.',
  },
  {
    titolo: 'Why and on what basis',
    testo:
      'To show you your data, put it next to your training, estimate calories and calculate your Athlon Health Score (the Athlon Health System score: sleep is one of its three parts, Recover, and workouts from devices count as active days), and for nothing else: we don’t use it to decide anything about you or for marketing communications. This is health data: we process it only with your explicit consent (art. 9(2)(a) GDPR), which you give below.',
  },
  {
    titolo: 'Who sees it',
    testo:
      'Only you. Club staff and trainers can’t see your device data, neither from the app nor from the management system, and it doesn’t go to PerfectGym. We keep it in a protected database.',
  },
  {
    titolo: 'How long, and how to remove it',
    testo:
      'We keep the summary of your last 90 days and the workouts from that period, and delete the rest. If you turn off Apple Health or Health Connect, in the app, we delete its data straight away. If you withdraw consent, from this same section, we delete everything straight away, including the nights and workouts you logged yourself and the habits you chose with the values you logged: only the record of when you gave and withdrew consent is kept, as proof. For your other rights (access, correction, deletion, complaint to the Italian Data Protection Authority) the club’s privacy notice applies.',
  },
  {
    titolo: 'Who it isn’t for',
    testo:
      'This section is for adults only. If a number worries you or makes you uncomfortable, don’t interpret it on your own: talk to your doctor. The app doesn’t give medical advice and doesn’t tell you what to do based on your values.',
  },
])
