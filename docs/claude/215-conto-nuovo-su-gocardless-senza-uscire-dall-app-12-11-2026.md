## Il conto nuovo si autorizza su GoCardless senza uscire dall'app: niente modulo IBAN, Drop-in sul web, browser integrato nell'app installata, e l'esito che dice com'è andata (12/11/2026)

Richiesta di Maurizio (12/11/2026): processo chiaro su web e app, che non porti fuori (Drop-in se si può, altrimenti in app); appena il conto è autorizzato parte la richiesta di addebito, che resta «in corso» e si vede nell'area del socio e nel CRM; il conto già salvato si sceglie come sempre. Vale per i contratti del nostro sistema (oggi i corsi bambini; gli adulti al loro passaggio). Il lato server è nella sezione 244 del `CLAUDE.md` di APP-ATHLON.

### Cosa cambia

- **Niente modulo IBAN** quando il contratto ha `conto_su_gocardless` (da `stato.da_pagare`, `features/lab/Abbonamento.tsx`): sotto «Conto corrente» una spiegazione («Il conto lo scrivi su GoCardless, una volta sola…») e il pulsante **«Continua su GoCardless»**. Con un conto già salvato resta «Usiamo il conto salvato •••• 1234» e «Conferma e attiva»; «Usa un altro conto» porta alla strada di GoCardless, «Usa il conto salvato» torna indietro. Il metodo mandato al server è `{ metodo: 'conto', su_gocardless: true }` (al server arriva `{ metodo: 'conto' }`).
- **La pagina di GoCardless senza uscire** (`apriPaginaMandato`, `lib/pagamentoEsterno.ts`):
  - **web**: il **Drop-in di GoCardless** (`lib/gocardlessDropin.web.ts`), il riquadro ufficiale sopra la pagina, con l'id del flusso (`flusso`, BRF…) che manda il server. Lo script è `https://pay.gocardless.com/billing/static/dropin/v2/initialise.js`, quello delle librerie ufficiali (`@gocardless/react-dropin`): `GoCardlessDropin.create({ billingRequestFlowID, environment: 'live', onSuccess, onExit }).open()`. Senza hash di integrità (GoCardless lo aggiorna allo stesso indirizzo). Se lo script non si carica o manca l'id, la pagina cambia come prima e GoCardless riporta a `/lab/abbonamento?contratto=…`;
  - **app installata**: il browser integrato (`WebBrowser.openBrowserAsync`, con «Fine»), come Adyen. Il Drop-in lì non c'è (servirebbe una WebView, cioè una build nuova): `gocardlessDropin.ts` risponde `non_disponibile`.
- **Dopo la pagina**: firmato (Drop-in) o pannello chiuso (app) → la schermata dell'esito, che chiede al server. Chiuso il Drop-in senza finire → il messaggio «Non hai completato l'autorizzazione del conto…» sulla stessa schermata. **Prima, nell'app installata, alla chiusura del pannello non succedeva niente**: si restava su «Come paghi» senza rileggere.
- **La schermata dell'esito** (`EsitoContrattoVista`): «Tutto a posto» con, per il conto, «la richiesta di addebito della prima quota è partita. La trovi in Pagamenti come «in corso»…»; **«Non hai completato l'autorizzazione del conto»** quando il server dice `pagamento.come = 'mandato'` per due letture di fila (la prima può arrivare un attimo prima che GoCardless chiuda la richiesta), con «Riprova o scegli un altro metodo»; prima girava «Stiamo verificando» senza fine.
- **Più figli insieme** (`junior/PagamentoFigli.tsx`, `conto_su_gocardless` da `esito.contratto`): niente modulo IBAN; con il conto salvato (letto da `statoAbbonamento().metodi.conto`) «Conferma e attiva» per tutti; senza, «Continua su GoCardless» per il primo figlio e, appena il mandato c'è, gli altri si attivano da soli sullo stesso conto (`pagaGruppo(numeri, { conto_salvato: true })`).
- **Il pagamento «in corso»** si vede nella sezione Pagamenti (già prima) e ora anche nel riquadro della Home (migrazione `20261112h` di APP-ATHLON).

### Provato

`tsc` pulito su `src/` (gli errori di `docs/` e `scripts/` c'erano già). **Non provato**: il Drop-in con un flusso vero, un mandato firmato dall'app, la schermata in un browser o su un telefono.

### Da pubblicare

Prima la funzione `portale-abbonamento` (APP-ATHLON), poi l'app: con la funzione vecchia `conto_su_gocardless` non arriva e resta il modulo di prima. Sul web l'app si pubblica con l'unione su `main`; nell'app installata serve un'OTA (il codice è solo JavaScript, niente moduli nativi nuovi).
