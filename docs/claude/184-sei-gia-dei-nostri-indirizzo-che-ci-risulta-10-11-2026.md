## «Sei già dei nostri»: l'indirizzo che ci risulta, in parte nascosto (10/11/2026)

Richiesta di Maurizio: chi si registra con un indirizzo nuovo ed è già del club, quasi sempre, ha **sbagliato indirizzo**. La schermata `CompletaProfilo` lo dice: «Ci risulta già un account a tuo nome» e mostra l'email che abbiamo **in parte nascosta** (`si***i@icloud.com`), così la persona la riconosce e entra con quella. La segreteria non riceve niente. Lato server: `CLAUDE.md` di APP-ATHLON, «Chi si registra con un indirizzo nuovo vede quello che ci risulta».

- **La schermata** (`CompletaProfilo.tsx`, quando `completaProfilo` risponde `somiglianza` con `emailNote`): titolo «Sei già dei nostri», sotto «Hai già un account con un altro indirizzo.». Una carta con l'indirizzo (o gli indirizzi, al massimo tre) in grassetto e selezionabile, e due pulsanti: **«Entra con quell'indirizzo»** (esce e torna all'email) e **«Non lo riconosco o non lo uso più»**.
- **«Non lo riconosco o non lo uso più»** rimanda i dati con `segnala: true` (`DatiProfilo`, `api/registrazione.ts`). Solo allora la funzione scrive la richiesta per la segreteria, e la schermata diventa quella di prima: «colleghiamo noi questo indirizzo al tuo profilo», con «Mandami il codice al ••65» se l'SMS è acceso. Un errore (la rete, il gestionale) si legge sulla stessa schermata.
- **Senza `emailNote`** (nessun indirizzo da mostrare, o più di tre) la schermata è quella di prima: la funzione decide.
- **`emailNote` si legge con cautela** (`emailNoteDa`): solo testo con una chiocciola, al massimo tre voci da ottanta caratteri.
- **Le app già installate** non conoscono `emailNote`: mostrano il messaggio della funzione, che porta l'indirizzo scritto dentro, e il pulsante «Entra con l'altro indirizzo». Non hanno «Non lo riconosco».
- **Provato**: `tsc --noEmit`, con gli stessi 45 errori di prima, tutti in `docs/classifica-server/` e nessuno in `src/`. **Non provato**: la schermata in un browser o su un telefono, e una risposta vera della funzione.
- **Da pubblicare prima della funzione.**
