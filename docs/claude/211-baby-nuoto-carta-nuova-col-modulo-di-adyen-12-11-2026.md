## Baby Nuoto: la carta nuova si paga col modulo di Adyen, non più col link (12/11/2026)

Richiesta di Maurizio: «non voglio il link: nel web l'embed di Adyen, in app la finestrella che si apre». La lezione singola del Baby Nuoto, nel Calendario, apriva ancora il link di Adyen nel browser. Ora usa il Drop-in, come le gare e lo shop (sezione 189). Il lato server (`sessione_acquisto`, `esito_sessione`, il riferimento `BABY-<n>`, la carta salvata): `CLAUDE.md` di APP-ATHLON, sezione 233.

- **Quando.** La risposta di `prenota` (402) e quella di `acquista` portano `drop_in: true` per la lezione singola del Baby Nuoto. L'app lo usa solo se la build ha il modulo (`pagamentoDisponibile`, sul web sempre): senza, o per gli acquisti di PerfectGym, resta il link di prima. Un'app di prima ignora il campo.
- **`CassaLezione.tsx`.** Prende la sessione dal server (`sessioneAcquistoLezione`: stessa chiamata di gare e shop, col canale iOS o Android dell'app), monta il `DropIn` (sul web il modulo nella pagina, nell'app la finestra nativa) e, finito, chiede l'esito al server (`esitoSessioneAcquisto`). Non conferma niente: la conferma è del webhook.
- **Dopo il pagamento si va a `/calendario?acquisto=<id>`**, la schermata che c'era già per il link e per la carta salvata: aspetta la prenotazione (il server la fa al pagamento) e dice com'è andata. Rifiutato o non completato: il messaggio e «Riprova», senza lasciare il Calendario.
- **3D Secure sul web.** Adyen riporta su `/calendario?acquisto=<id>&sessionId=…&redirectResult=…`: il Calendario consegna il risultato ad Adyen (`riprendiDopoRedirect`) prima di aspettare il webhook. Nell'app nativa lo fa l'SDK.
- **Con una carta salvata** resta «Paga 32 € con la carta •••• xxxx» (un tocco); «Usa un'altra carta» apre il modulo invece del link. Sul totem passa dalle tre strade (`passaDalTotem`).
- **È un OTA**, nessuna build nuova: il Drop-in nativo c'è nelle build che hanno l'SDK (3.1.0 in poi). Da pubblicare **dopo** la funzione `portale-lab-calendario`.
- **Provato**: la sintassi dei tre file (`transpileModule`). **Non provato**: `tsc` (qui non ci sono le dipendenze dell'app), il modulo sul web, la finestra nativa, il 3D Secure.
