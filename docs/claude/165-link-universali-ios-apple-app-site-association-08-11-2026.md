## I link delle email aprono l'app su iPhone: il file `apple-app-site-association` (08/11/2026, **pubblicato solo per `/`**)

Passo 2 di due, dopo `164-entra-nell-app-nativa-token-dal-link`. **Pubblicato a pezzi, per prudenza**: una volta servito il file, iOS lo tiene in memoria e **non si toglie in fretta**
(togliere il file dal dominio non ferma i telefoni che l'hanno già letto: aprono ancora l'app fino al prossimo aggiornamento del file, ore o giorni). Maurizio ha provato il link
`https://app.athlonroma.it/?sezione=certificato` (la Home, senza token) e ha visto che si apriva in Safari: il 08/11/2026 il file è stato servito **con il solo `/`**, per far provare quel link.
**Restano da aggiungere** `/entra`, `/delega/conferma/*` e `/r/*`, **dopo** la prova del passo 1 (il token con `athlon://`, che non è ancora stata fatta): il codice che li legge è già nell'app
(`164`), ma finché non è provato su un iPhone non va dato a iOS.

- **Cosa fa.** `public/.well-known/apple-app-site-association` (Expo lo copia nell'export; `vercel.json` lo serve come `application/json`, senza redirect) dice a iOS che i link
  `https://app.athlonroma.it/…` elencati sotto si aprono nell'app `com.netpulse.centrosportivoathlon` (Team ID `RFSG2LMFH2`), se è installata. L'entitlement
  `applinks:app.athlonroma.it` c'è già in `app.json`; **non è verificato che sia nella build 3.0.0 pubblicata**: lo dirà la prova.
- **Quali percorsi** (`components`, in ordine: vince il primo che combacia). **Oggi nel file ci sono solo i punti 1 e 2**; i punti 3, 4 e 5 sono il passo dopo:
  1. **esclusione** `/` con `?come=…`: la vista cliente del CRM (`/?come=<email>#th=…`) è solo web, e uno staff con l'app sul telefono (o su un Mac Apple silicon) non deve vederla
     aprirsi nell'app, che non sa leggerla;
  2. `/` — la Home: il pulsante «Apri l'app» del benvenuto e i link `/?sezione=…`;
  3. `/entra` — i link dal sito (prenota, gare, certificato, Junior, iscrizione), con il token nel frammento che il passo 1 sa leggere;
  4. `/delega/conferma/*` — la conferma della delega, stesso token;
  5. `/r/*` — il Guest Pass e il ritorno dal pagamento con carta (`/r/<token>/fatto`): oggi su iPhone tornano in Safari, con il file tornano nell'app.
- **Cosa resta fuori, di proposito.** Le sezioni nude (`/calendario`, `/pagamenti`, `/junior`, `/personal`, `/shop`, `/allenamento/…`) e `/invito/*`, `/email/*`, `/richiesta/*`, `/lab/*`. Sono
  rotte che l'app ha, ma non sono state provate da un link universale; si aggiungono a `components` dopo la prova, una per volta. I percorsi `/lab/*` non vanno mai aggiunti: sono
  reindirizzamenti di Vercel che l'app non conosce.
- **Per il telefono di chi ha già l'app**: iOS legge il file **quando installa l'app** (un aggiornamento via aria non conta) e poi di tanto in tanto. Per provare subito su un telefono: cancellare l'app e
  reinstallarla (si rientra col codice via email). Per tutti gli altri può volerci qualche giorno: finché non l'hanno letto, quei link si aprono ancora in Safari.
- **Dopo la pubblicazione**, in quest'ordine:
  1. `curl -sI https://app.athlonroma.it/.well-known/apple-app-site-association` → `200`, `content-type: application/json`, nessun `location`;
  2. `curl -s https://app-site-association.cdn-apple.com/a/v1/app.athlonroma.it` → lo stesso JSON (è la copia che leggono i telefoni: può metterci qualche minuto);
  3. su un iPhone con l'app: tocca un link `/entra?…#th=…` **nell'app Mail o Messaggi** (non nella barra di Safari, e non dentro Instagram: lì i link universali non scattano) → deve aprirsi
     l'app sulla pagina con il pulsante. Un telefono che aveva già l'app prima del file può non rilevarlo subito: eliminare e reinstallare l'app forza la lettura.
- **Se qualcosa non va**: tenere premuto il link e scegliere «Apri in Safari» (o «Apri nel browser») entra come prima, e il token non è consumato finché non si tocca «Entra nell'app».
- **Android non c'è**: serve `/.well-known/assetlinks.json` con l'impronta SHA-256 del certificato di firma di Google Play, che si legge dalla Play Console solo dopo l'approvazione. L'`intentFilter`
  di `app.json` ha solo `/r/` e va esteso allo stesso elenco.
- **Provato**: il JSON è valido e l'export web lo copia identico in `dist/.well-known/`; la regola di riscrittura di `vercel.json` (`/((?!.*\.).*)`) non lo cattura, perché il percorso ha un punto.
  **Sull'anteprima di Vercel della PR** (letta con lo strumento autenticato, perché le anteprime sono protette dal login): `200`, `content-type: application/json`, `cache-control: public, max-age=3600`, nessun
  `location`, JSON identico al file. **Non provato**: il dominio vero (`app.athlonroma.it`, dopo la pubblicazione) e iOS (nessun iPhone qui).
