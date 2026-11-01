## Il messaggio di benvenuto: sotto la testata della Home, scritto a ogni ritorno nell'app

Nella Home (`AreaRiservata.tsx`), **subito sotto la testata scura** e sopra «Da fare», una carta con un messaggio personale: titolo, due righe e un pulsante che porta al prossimo passo (richiesta
del club): attivare la prova se non l'ha mai fatta, scegliere un abbonamento, dare seguito ai suoi allenamenti, ricominciare. Lo scrive l'AI, a ogni ritorno nell'app. File:
`src/features/lab/home/MessaggioBenvenuto.tsx` (la carta), `useMessaggioBenvenuto.ts` (quando se ne scrive uno nuovo), `src/api/benvenuto.ts` (la funzione `portale-lab-benvenuto` di APP-ATHLON).
A che punto è il socio, qual è il suo passo, come si controlla quello che scrive l'AI, privacy e come si accende: `CLAUDE.md` di APP-ATHLON.

- **L'app non sceglie niente**: mostra il titolo, il testo e il pulsante (`azione.etichetta`, `azione.destinazione`) che le arrivano. Il passo lo decide il server dai dati del mirror. La
  destinazione è una delle cinque che l'app conosce: `prova` → `/richiesta/guest-pass`, `abbonamento` → `/abbonamento`, `calendario` → `/calendario`, `allenamento` → `/allenamento` (tutte con
  `router.navigate`, come la barra delle schede), `pagamenti` → la sezione della Home (`onSezione`). Una destinazione sconosciuta non rompe niente: `api/benvenuto.ts` ricontrolla la forma e senza
  pulsante resta il solo messaggio.
- **Quando se ne scrive uno nuovo**: all'apertura dell'app (memoria vuota, `apertura`); tornando alla Home dopo **mezz'ora o più** dall'ultimo (`VALIDITA_MS`), sia con la Home rimasta aperta (si lascia
  l'app o la scheda del browser e si torna: `AppState`, che sul web segue la visibilità della scheda) sia rientrando da un'altra schermata (`ritorno`). Un passaggio più breve rivede lo stesso: un
  messaggio che cambia a ogni passaggio non è un messaggio, e ognuno costa. Il server in più riusa quello di due minuti fa (un ricaricamento). **Solo in memoria**, come ogni dato del laboratorio, e
  **legata all'email della sessione**: una richiesta ancora in volo quando si esce non finisce nella Home di chi entra dopo.
- **Mentre arriva c'è uno scheletro** (la richiesta dura qualche secondo, AI compresa): all'apertura si confonde con l'avvio animato (3,25 s), che lo copre. **Se la funzione non risponde** (o non è ancora
  pubblicata, o per un minorenne) **la carta non compare**: niente riquadro vuoto e niente errore per una cosa che nessuno ha chiesto. L'attesa massima è 15 secondi.
- **L'etichetta è sempre «PER TE»**, senza dire chi ha scritto il messaggio (richiesta del club, 19/10/2026: prima diceva «PER TE · SCRITTO DALL'AI» quando il testo era dell'AI). La funzione manda comunque
  `origine` (`ai` o `regole`) e la registra, ma l'app non la mostra: per sapere quanti messaggi escono dall'AI e quanti dai testi di riserva si guarda il registro. Si può **nascondere** (la X):
  resta nascosto fino al prossimo messaggio. Il tocco sul pulsante si segna (`toccato`, senza aspettare e senza sollevare): è il solo segno, per il club, che il messaggio ha funzionato.
- **In vista cliente dello staff non c'è e non si chiama la funzione** (`vistaCorrente()`): chi guarda l'app di un socio non genera messaggi a suo nome.
- **Le parole**: la prova non è mai «gratis» né ha un prezzo nel messaggio (il passo mostra il prezzo); niente peso, dimagrimento, salute; niente colpa per chi manca da un po'. Lo garantisce il controllo
  del server, non l'app.
- **L'invito alla prova ha una carta tutta sua** (30/10/2026, richiesta di Maurizio: «più accattivante, il testo più bold, 19 euro, prova tutto il club per una settimana in evidenza»): quando `azione.destinazione` è `prova`, `MessaggioBenvenuto.tsx` disegna `CartaProva` al posto della carta di sempre: fondo scuro in tutti e due i temi con l'arancio che sale da un angolo, il marchio in filigrana, il titolo **fisso** «Prova tutto il club per una settimana» (al posto del titolo scritto dall'AI), **«7 giorni» come numero grande, con «a 19 € · senza impegno» accanto** (richiesta di Maurizio, stesso giorno: il numero in evidenza è la durata, il prezzo sta dentro la riga; `PREZZO_PROVA` in `lib/guestPass.ts`, scritto a mano: cambia insieme al piano su PerfectGym; con l'invito di un socio il prezzo è 5 e questa carta non lo sa) e il testo del server in grassetto. **Il server non è cambiato e il suo testo continua a non nominare soldi**: il prezzo lo mette solo l'app. Titolo, X e pulsante funzionano come prima. Provato in Chromium (bundle web, 390/360/1280 px, chiaro e scuro, inglese) con una pagina provvisoria poi tolta: **non provato** nella Home vera dietro il login e su un telefono.

Per verificare: `npx tsc --noEmit` pulito. **Si guarda renderizzato** (390 e 1280 px, chiaro e scuro): lo scheletro mentre arriva, il messaggio con l'etichetta «PER TE» e il pulsante, la X, nessuna carta se la funzione dà errore o `messaggio: null`, nessuno scorrimento orizzontale a 390. Con le risposte della funzione simulate (Playwright con `page.route` su
Supabase e `page.clock`): all'apertura una richiesta `apertura`; cinque minuti fuori dall'app non ne chiedono un'altra; oltre mezz'ora fuori ne arriva una `ritorno`; il pulsante porta a
`/richiesta/guest-pass` e segna `toccato`; in vista cliente nessuna richiesta. **Acceso il 19/10/2026 per i tester del portale**, con la funzione vera: un tester ha aperto l'app, il messaggio è arrivato (scritto da Gemini, registrato) e il pulsante è stato premuto. Il lato server (workflow, controlli, cosa si è
provato con le risposte vere dei modelli) sta nel `CLAUDE.md` di APP-ATHLON. **Non provato**: un telefono vero (iOS e Android, dove `AppState` ha anche lo stato `inactive`).

