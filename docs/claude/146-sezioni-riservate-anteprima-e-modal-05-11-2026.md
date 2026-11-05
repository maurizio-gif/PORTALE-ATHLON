## Athlon Health System e Athlon TV: riservati a chi ha un abbonamento attivo, in anteprima per gli altri (05/11/2026)

Richiesta di Maurizio. Le due sezioni sono di chi ha un **abbonamento principale attivo**, suo e non del nucleo. Contano lo standard, l'omaggio, l'Employee anche a quota zero e il Guest Pass in corso. Non bastano un aggiuntivo, un corso Junior o un voucher Covid. **La regola la decide il server** (`portale_accesso_riservate` e `_shared/riservate.ts` di APP-ATHLON, sezione della stessa data, con l'elenco delle azioni che restano aperte). L'app la legge e la mostra. Cartella `src/features/lab/riservate/`.

- **Chi ce l'ha** non vede niente di diverso.
- **Chi non ce l'ha vede le due sezioni com'erano**: nella barra, con tutte le carte in vista, i propri dati se ce ne sono (Athlon Health System) e le raccolte con titoli e miniature (Athlon TV). In cima a ogni schermata c'è la carta «Stai guardando un'anteprima» con «Come accedere».
- **Al primo tocco su qualcosa si apre il modal** (`ModalRiservata`, un `Foglio` montato una volta nel layout di `(portale)`), con il titolo «Riservato a chi ha un abbonamento attivo»:
  - **se può attivare il Guest Pass** (lo dice il server): la carta «Guest Pass di 7 giorni a {prezzo} €», con il prezzo che manda il server e nessuna cifra scritta a mano, e due pulsanti. **«Attiva il Guest Pass»** porta a `/richiesta/guest-pass`, che con una sessione prosegue nell'app senza email (sezione 30). **«Iscriviti ora»** porta a `/abbonamento`;
  - **se no**: solo **«Attiva un abbonamento»** (`/abbonamento`);
  - **in vista cliente**: il testo, senza pulsanti d'acquisto.
- **Come si prende il tocco** (`Anteprima`): la vista avvolge le carte e, con le sezioni chiuse, prende ogni tocco prima dei pulsanti che contiene (`onStartShouldSetResponderCapture`). Al rilascio, se il dito si è mosso meno di 10 punti, apre il modal. **Lo scorrimento resta**: quando la lista scorre, il sistema toglie il tocco alla vista. Sul web il testo dell'anteprima non si seleziona (`userSelect: 'none'`), altrimenti React Native Web chiude il tocco senza rilascio e il modal non si apre. In Athlon Health System le schede **Train, Food e Recover restano fuori** dall'anteprima e si cambiano come sempre. L'invito ad attivare l'app Salute all'apertura non compare. In Athlon TV la raccolta si apre, e il modal parte dal tocco su un video o su «Guarda dall'inizio».
- **Gli indirizzi interni** (`Cancello`, nel `screenLayout` del layout): tutte le pagine `allenamento/*` tranne la principale, e il lettore `tv/[raccolta]/[video]`. Aperte da un link, dall'assistente, dal messaggio della Home o a freddo, con le sezioni chiuse aprono il modal e tornano indietro, o alla sezione se non c'è un indietro.
- **Da dove viene lo stato**:
  - `accessoRiservate()` (`api/abbonamento.ts`, azione `accesso` di `portale-abbonamento`) si legge a ogni ritorno sulla schermata, con un minuto di freschezza (`useSezioniChiuse`).
  - Un rifiuto `403 codice: 'riservata'` di qualsiasi funzione mette le sezioni in anteprima (`segnaRifiuto` in `funzione()` di `api/lab.ts`). Per esempio un lettore aperto a freddo prima che `accesso` sia arrivato. Il rifiuto **non apre il modal**: lo apre il tocco, non una lettura automatica.
  - Dopo un Guest Pass attivato dall'app o un abbonamento pagato si rilegge (`scordaAccesso`). All'uscita si azzera (`azzeraRiservate`).
- **Con la funzione di prima** (`accesso` sconosciuta) le sezioni restano aperte com'erano: pubblicare **prima l'app, poi le funzioni**.
- **Provato in Chromium** (bundle web esportato con `EXPO_PUBLIC_SUPABASE_URL` locale e un server finto al posto delle funzioni, che rifiuta come `_shared/riservate.ts`):
  - **a 375 px, tema scuro, «idoneo»**: la carta d'anteprima; il tocco su «Inserisci i tuoi dati» e sul testo di una riga apre il modal senza navigare; «Come accedere»; il Guest Pass a 19 € con i due pulsanti; «Attiva il Guest Pass» porta a `/richiesta/guest-pass`; la scheda Food si apre senza modal; un trascinamento non apre il modal; Athlon TV con la raccolta aperta e il modal sul tocco di un video; il lettore aperto a freddo (`video` rifiutato dal server) torna a `/tv` con il modal; `/allenamento/agente` a freddo torna a `/allenamento` con il modal;
  - **«non idoneo»**: solo «Attiva un abbonamento», che porta a `/abbonamento`;
  - **«con abbonamento»**: nessuna carta d'anteprima, il tocco porta a «Il tuo corpo», il video si apre;
  - **«funzione di prima»**: tutto aperto;
  - **a 1280 px, tema chiaro**: carta, modal e Athlon TV, senza scorrimento orizzontale.
  - `tsc`: gli stessi errori di `main`, nessuno nei file toccati.
  - **Un difetto visto**: col mouse, il primo tocco subito dopo un trascinamento a volte non apre il modal (il secondo sì).
- **Non provato**: un telefono vero e l'app nativa (lo scorrimento con il dito, che lì è nativo), l'inglese a schermo, una sessione vera con le funzioni pubblicate.
