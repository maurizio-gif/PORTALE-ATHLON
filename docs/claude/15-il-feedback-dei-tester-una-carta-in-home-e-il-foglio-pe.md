## Il feedback dei tester: una carta in Home, e il foglio per scrivere

Richiesta di Maurizio (20/10/2026). Un invito ai tester a dirci come sta andando, cosa suggeriscono e che problemi hanno avuto. Toccato, sale un foglio con un campo di testo e, se serve, fino a tre allegati.
**Dal 30/10/2026 l'invito è una carta della Home** («Aiutaci a migliorare l'app», `home/CartaFeedback.tsx`, al posto di «Cerchi qualcosa?»: «Sei un tester? Se hai segnalazioni, suggerimenti o problemi, lasciali qui…»), e **non più la pillola «Feedback» in alto a destra**, che
è passata all'assistente (sezione sotto). Il foglio, i limiti, gli allegati e la funzione sono quelli di prima: è cambiato solo da dove si apre. Il messaggio arriva nella sezione **Tester app** del CRM, che e' anche dove si aggiungono i tester: funzione
`portale-lab-feedback`, tabella `portale_feedback`, bucket privato e tutto il resto nel `CLAUDE.md` di APP-ATHLON («I tester dell'app»). Cartella `src/features/lab/feedback/`, API `src/api/feedback.ts`.

- **Il posto.** La carta sta nella Home, **sotto il messaggio di benvenuto** (dove stava la carta dell'assistente), con il fumetto, il titolo, due righe e «Lascia un feedback». **Solo in Home**: nelle altre schermate non c'è un modo di scrivere un feedback (prima la pillola era
  ovunque). Se serve di nuovo ovunque, il foglio (`FoglioFeedback`) si può aprire da qualunque posto con `useFeedback`: non è stato fatto perché il posto in alto a destra ora è dell'assistente.
- **Solo per chi usa l'app da tester.** Il portale e' aperto solo ai tester e il layout lo monta solo con una sessione: senza accesso (e nelle pagine pubbliche `/r/<token>`, `/richiesta`) non c'e'.
  **In vista cliente non c'e'** (`vistaCorrente()`): chi guarda l'app di un cliente non scrive feedback al suo posto, e la funzione risponderebbe 403 (non e' fra le letture).
- **Il foglio** (`FoglioFeedback`): «Come sta andando?», una guida di cosa scrivere (come ti sembra l'app, un'idea o un suggerimento, un problema: cosa stavi facendo e cosa e' successo), le pillole **facoltative** «Come sta andando /
  Un suggerimento / Un problema / Altro» (si tolgono ritoccandole), il campo del messaggio (fino a 3000 caratteri; il conto compare dopo 2500) e gli allegati. **Il testo e' obbligatorio**, il resto no. Niente parte prima di
  «Invia il messaggio». Il foglio dice cosa arriva insieme al testo — **la schermata in cui si era e il dispositivo** — e chi lo legge («le persone del club che seguono i tester»).
- **La bozza non si perde.** Lo stato del foglio vive in `CartaFeedback` (`useFeedback`): chiudere per sbaglio, o un invio rifiutato (limite orario, rete, funzione non pubblicata), lascia
  testo, tipo e allegati dove stanno. Si svuota solo quando il messaggio e' partito; dopo il grazie il foglio torna com'era. **La bozza resta finche' la Home e' montata** (lasciarla per un'altra schermata non la smonta, sta sotto nella pila); uscendo dall'app si perde (non e' piu' montata in modo permanente nel layout, come la pillola).
- **La schermata che parte e' quella in cui si e' toccata la carta** (la Home, `/`), non quella in cui si preme «Invia» (`schermataDa`: il percorso senza parametri). Insieme vanno la piattaforma (`web`, `ios`, `android`) e il dispositivo
  (sul web quello che dice il browser, sul telefono sistema e versione); la funzione li ripulisce e, se mancano, prende il dispositivo dall'intestazione. **Non parte nessuna email e nessun id di persona**: la funzione ricava chi e' dalla sessione.
- **Gli allegati** (`allegati.ts`): si scelgono anche piu' d'uno insieme (`expo-document-picker`, `multiple`), **al massimo tre, JPG, PNG, WebP o PDF, 5 MB l'uno** (stessi limiti della funzione, che guarda i primi byte: qui servono a dirlo subito).
  **Sul web uno screenshot sopra 1,2 MB si porta a 1800 pixel in JPEG** (una PNG retina da 4 MB diventa circa 1 MB), solo se il risultato pesa meno; un PDF non si tocca. Nell'app nativa il file parte com'e' (ridurlo vorrebbe
  `expo-image-manipulator` e una nuova build, come per le schede). Il selettore non si aspetta con una rotellina (chi chiude la finestra senza scegliere non lascia traccia). Gli allegati che non vanno dicono perche', per
  nome, e **non restano**; se se ne scelgono piu' di quelli che restano, ne entrano tre e lo dice. Il foglio invita a coprire gli screenshot che mostrano **dati sulla salute** (diario alimentare, sonno, misure del corpo): lo staff
  non li vede per i consensi dell'app, e un'immagine non si controlla.
- **Cosa risponde quando non va.** Funzione non ancora pubblicata (404 senza il nostro corpo): «Il feedback non e' ancora attivo: riprova fra qualche giorno» (`src/api/feedback.ts`); limite orario o giornaliero (429), tipo o
  allegato non validi (400) e guasti arrivano con le parole della funzione.
- **L'app non riapre i messaggi.** Non c'e' uno storico da mostrare e nessuna risposta del club: il foglio non la promette.
- **Provato.** `npx tsc --noEmit` pulito. Le regole pure (`comune.ts`: tipo dell'allegato da mime ed estensione, posti, testo inviabile, peso, schermata) con `node --experimental-strip-types`. **A schermo, in Chromium** (bundle web esportato,
  funzioni simulate, nessuna richiesta fuori dal computer), 72 controlli: la pillola nel gutter di 18 punti e a meta' della barra col marchio (390), nella colonna da 1180 sullo schermo largo (1280), solo icona accanto al carrello dello shop e
  a 320 punti, e **di nuovo al suo posto quando dalla vetrina si va al carrello** (la vetrina resta montata sotto); il foglio vuoto e compilato (tipo che si sceglie e si toglie, «Invia» spento senza testo), gli allegati (screenshot grande ridotto
  a JPEG, PDF, tre file e il comando che si spegne, «Togli», `.txt` e file oltre 5 MB rifiutati con il motivo, quattro file scelti insieme), la bozza che resta dopo aver chiuso e dopo un errore 429, il payload che parte (azione, testo ripulito
  ai capi, tipo, schermata, piattaforma, dispositivo, nomi e base64 degli allegati, un JPEG vero, nessuna email, la sessione e nessuna vista cliente), il grazie e il foglio pulito alla riapertura, la schermata `/calendario` che parte da li', la
  funzione 404, tema chiaro e scuro; e **in vista cliente e senza accesso la pillola non c'e'**. In piu' tutte le rotte principali (22, con e senza accesso) senza errori di pagina, perche' `Schermata` (usata in 149 punti) ora legge se e' in vista.
  **Non provato**: un telefono vero (il selettore dei file e la fotocamera dell'iOS, il peso del base64 su una rete mobile), l'app nativa, e la funzione vera con una sessione vera (era simulata).

