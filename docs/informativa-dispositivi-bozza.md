# Informativa dei dispositivi: bozza per il consulente privacy (29/10/2026)

**Stato: bozza, non pubblicata.** Il testo in uso sta in `src/features/lab/dispositivi/informativa.ts` (versione `2026-10-28`) e descrive ancora i collegamenti con Oura e Polar, che l'app non offre più. Questa bozza descrive quello che il codice fa **oggi**: i dispositivi arrivano solo da Apple Salute, e l'app non parla più con i fornitori.

Da far rileggere dal consulente prima di pubblicarla: è un testo legale, e il consenso è la base (art. 9, par. 2, lett. a del GDPR).

## Cosa cambia rispetto al testo in uso

| Prima | Adesso |
|---|---|
| Collegamento con l'account Oura o Polar (OAuth, pulsante «Collega») | **Nessun collegamento con i fornitori.** Si legge da Apple Salute, dove i dispositivi della persona scrivono con la loro app |
| Punteggio di sonno e di «recupero» del dispositivo, profilo Oura/Polar | **Non si leggono più** (da Apple Salute non arrivano) |
| «Chiavi di accesso (token) cifrate» | **Non ci sono più token nuovi**: non c'è nessun account di un fornitore a cui accedere |
| Aggiornamento «ogni mezz'ora» dal fornitore | **Solo quando la persona apre l'app** (e al massimo ogni dieci minuti) |
| «Pilastro Relax» | Si chiama **Recover** |
| Calorie degli allenamenti | Si dice che **le calorie si stimano** e che gli allenamenti dei dispositivi contano come giorni attivi nel punteggio |

## Come si pubblica (ordine)

1. **Server prima** (`APP-ATHLON`, `supabase/functions/_shared/dispositivi/tipi.ts`): cambiare `VERSIONE_INFORMATIVA` (proposta: la data di pubblicazione, `2026-10-29` o successiva).
2. **Poi l'app**, `informativa.ts`: stessa versione, `INFORMATIVA` e `CONSENSO` col testo sotto.
3. **Effetto**: chi aveva accettato la versione di prima **riaccetta**; finché non lo fa, la sezione dei dispositivi si richiude e la lettura da Apple Salute si ferma. Vale per tutti: da verificare con la funzione se, in quel passaggio, un'app non ancora aggiornata riceve un rifiuto sul consenso (la funzione confronta la versione), e quindi se conviene pubblicare server e app a distanza di pochi minuti.
4. **Insieme**: ripulire sul server i collegamenti Oura e Polar fatti in prova: **i token cifrati dei tester sono ancora nella tabella dei collegamenti** e la funzione continua a leggere i loro dati. Con la funzionalità tolta non c'è più motivo di tenerli: cancellare i collegamenti e i token, e (se si vuole) revocare l'autorizzazione presso i due fornitori. È minimizzazione dei dati, e va fatta prima di aprire a tutti.

**Health Connect (Android) non è nel testo di proposito**: non è ancora nell'app, e un'informativa non deve descrivere un trattamento che non c'è. Quando c'è, si aggiunge una frase (e si cambia di nuovo la versione).

## Testo proposto: la casella del consenso (`CONSENSO`)

**IT.** Acconsento al trattamento dei miei dati relativi alla salute (il sonno che scrivo io, e i dati che Apple Salute condivide con l'app: sonno, passi, battito e allenamenti) per mostrarli nell'app, stimare le calorie e calcolare il mio Athlon Health Score, come descritto nell'informativa.

**EN.** I consent to the processing of my health data (the sleep I log myself, and the data Apple Health shares with the app: sleep, steps, heart rate and workouts) to show them in the app, estimate calories and calculate my Athlon Health Score, as described in the privacy notice.

## Testo proposto: le sezioni dell'informativa (`INFORMATIVA`)

### Che cos'è

**IT.** Puoi scrivere ogni mattina quanto hai dormito, e far arrivare all'app i dati del tuo orologio, del tuo anello o della tua app di fitness attraverso Apple Salute. L'app mostra il tuo sonno e gli allenamenti che il dispositivo ha registrato, accanto a quelli fatti nel club, e li usa nella sezione Recover e in Train. Sono valori indicativi: non sono un parere medico e non servono a fare diagnosi.

**EN.** You can log how long you slept each morning, and have the data from your watch, ring or fitness app reach the app through Apple Health. The app shows your sleep and the workouts your device recorded, next to the ones you do at the club, and uses them in the Recover section and in Train. These are approximate values: they are not medical advice and are not for diagnosis.

### Quali dati leggiamo

**IT.** Il sonno che scrivi tu: la notte, a che ora sei andato a dormire e a che ora ti sei svegliato. Da Apple Salute, per ogni giorno: i passi, il sonno con le sue fasi, il battito a riposo e la sua variabilità, le calorie di movimento; e per ogni allenamento: lo sport, quando è iniziato, quanto è durato, le calorie e il battito medio e massimo. Leggiamo anche il nome dell'app o del dispositivo che ha scritto ogni dato (per esempio «Apple Watch» o «Garmin Connect»), per mostrarti da chi stai ricevendo. Nel foglio di Apple scegli tu cosa condividere, e noi leggiamo solo quello. Non leggiamo la tua posizione né i tuoi percorsi, né la serie dei battiti, né altri dati di Salute (peso, altezza, ciclo, glicemia…). Puoi anche scrivere a mano un allenamento (sport, quando, quanto è durato, quanto è stato intenso, e il battito medio se lo conosci): le calorie le stimiamo noi.

**EN.** The sleep you log yourself: the night, what time you went to bed and what time you woke up. From Apple Health, for each day: steps, sleep with its stages, resting heart rate and its variability, active calories; and for each workout: the sport, when it started, how long it lasted, calories and average and maximum heart rate. We also read the name of the app or device that wrote each piece of data (for example “Apple Watch” or “Garmin Connect”), to show you who you’re receiving from. In Apple’s own sheet you choose what to share, and we only read that. We don’t read your location or routes, or the heart-rate series, or any other Health data (weight, height, cycle, glucose…). You can also log a workout by hand (sport, when, how long, how hard, and average heart rate if you know it): we estimate the calories.

### Come arrivano i dati

**IT.** Il tuo orologio, il tuo anello o la tua app di fitness scrivono su Apple Salute con la loro app: è lì che attivi la condivisione, e puoi cambiarla quando vuoi. L'app del club legge da Apple Salute **solo quando la apri**, e solo le categorie che hai consentito; puoi toglierle in Impostazioni › Salute › Accesso ai dati e dispositivi. **Il club non si collega ai servizi dei produttori** (Garmin, Oura, Polar, Fitbit…) e non ha le credenziali del tuo account con loro. Quei produttori trattano i tuoi dati anche per conto loro, secondo le loro informative.

**EN.** Your watch, ring or fitness app write to Apple Health with their own app: that’s where you turn sharing on, and you can change it whenever you like. The club app reads from Apple Health **only when you open it**, and only the categories you allowed; you can remove them in Settings › Health › Data Access & Devices. **The club doesn’t connect to the manufacturers’ services** (Garmin, Oura, Polar, Fitbit…) and doesn’t have your account credentials with them. Those manufacturers also process your data on their own behalf, under their own privacy notices.

### Perché e su quale base

**IT.** Per mostrarti i tuoi dati, metterli accanto al tuo allenamento, stimare le calorie e calcolare il tuo Athlon Health Score (il punteggio dell'Athlon Health System: il sonno è una delle sue tre parti, Recover, e gli allenamenti dei dispositivi contano come giorni di attività), e per nient'altro: non li usiamo per decidere niente su di te né per comunicazioni commerciali. Sono dati relativi alla salute: li trattiamo solo con il tuo consenso esplicito (art. 9, par. 2, lett. a del GDPR), che dai qui sotto.

**EN.** To show you your data, put it next to your training, estimate calories and calculate your Athlon Health Score (the Athlon Health System score: sleep is one of its three parts, Recover, and workouts from devices count as active days), and for nothing else: we don’t use it to decide anything about you or for marketing communications. This is health data: we process it only with your explicit consent (art. 9(2)(a) GDPR), which you give below.

### Chi li vede

**IT.** Solo tu. Lo staff del club e i trainer non vedono i dati dei tuoi dispositivi né dall'app né dal gestionale, e non vanno su PerfectGym. Li conserviamo in un database protetto.

**EN.** Only you. Club staff and trainers can’t see your device data, neither from the app nor from the management system, and it doesn’t go to PerfectGym. We keep it in a protected database.

### Per quanto e come toglierli

**IT.** Teniamo il riassunto dei tuoi ultimi 90 giorni e gli allenamenti di quel periodo, e cancelliamo il resto. Se disattivi Apple Salute, nell'app, cancelliamo subito i suoi dati. Se revochi il consenso, da questa stessa sezione, cancelliamo tutto subito, comprese le notti e gli allenamenti che hai scritto tu: resta solo la registrazione di quando hai dato e revocato il consenso, come prova. Per gli altri diritti (accesso, rettifica, cancellazione, reclamo al Garante) vale l'informativa privacy del club.

**EN.** We keep the summary of your last 90 days and the workouts from that period, and delete the rest. If you turn off Apple Health, in the app, we delete its data straight away. If you withdraw consent, from this same section, we delete everything straight away, including the nights and workouts you logged yourself: only the record of when you gave and withdrew consent is kept, as proof. For your other rights (access, correction, deletion, complaint to the Italian Data Protection Authority) the club’s privacy notice applies.

### Per chi non è

**IT.** La sezione è riservata ai maggiorenni. Se un numero ti preoccupa o ti mette a disagio, non interpretarlo da solo: parlane con il tuo medico. L'app non dà consigli medici e non ti dice cosa fare in base ai tuoi valori.

**EN.** This section is for adults only. If a number worries you or makes you uncomfortable, don’t interpret it on your own: talk to your doctor. The app doesn’t give medical advice and doesn’t tell you what to do based on your values.

*(La nota «Courtesy translation: the Italian text is the binding version» resta come prima.)*

## Da verificare con chi conosce la funzione (APP-ATHLON)

- «**Solo quando apri l'app, e al massimo ogni dieci minuti**»: è quello che fa l'app (`sincronizzaSalute`), ma la funzione `importa` potrebbe essere chiamata anche in altri momenti. Confermare.
- «**Non leggiamo… altri dati di Salute**»: l'app chiede in lettura solo passi, sonno, allenamenti, battito a riposo, HRV, battito e calorie attive (`LETTURE` in `appleSalute.ts`). Confermare che la funzione non salvi altro.
- «**Il nome dell'app o del dispositivo**» (`origine`): è un dato che si salva; se contiene il nome della persona («Apple Watch di Marco») è già ripulito nell'app per la schermata, **non per il salvataggio**: decidere se ripulirlo anche alla fonte.
- **Conservazione**: 90 giorni, come nel testo in uso. Confermare che vale anche per i dati letti da Apple Salute.
- **Dati dei tester ancora presenti** da Oura e Polar: vedi il punto 4 sopra.
