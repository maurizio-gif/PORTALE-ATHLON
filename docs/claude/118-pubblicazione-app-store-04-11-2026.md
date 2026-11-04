## La pubblicazione ufficiale sull'App Store: la 3.0.0 sostituisce la 2.2 di Netpulse (04/11/2026)

Richiesta di Maurizio. Lo stato, letto il 04/11/2026:

- **Il record su App Store Connect esiste già**: «Athlon Club», id `1584157295`, venditore POINT 2000 SRL SSD, bundle
  `com.netpulse.centrosportivoathlon`. In vendita c'è la **2.2** (l'app di Netpulse, ultimo aggiornamento 04/10/2026). La nostra è la
  **3.0.0** sullo stesso bundle: approvata e rilasciata, **arriva come aggiornamento a tutti quelli che hanno la 2.2**, che da quel momento
  entrano con email e codice e non più con le credenziali di prima. Il rilascio va quindi deciso, non lasciato partire da solo.
- **Su TestFlight c'è la build 7** (profilo `test`, 29/10/2026). Da allora sono cambiate cose native (la frase di Apple Salute in
  `app.json`, `react-native-health-connect`, `expo-build-properties`): **per la revisione serve una build nuova col profilo `production`**
  (canale `production`, numero di build incrementato da EAS):
  `npx eas-cli@latest build -p ios --profile production --auto-submit`. Va su TestFlight, non in vendita.
- **L'accesso per il revisore** è l'azione `revisione` di `portale-accesso` (`CLAUDE.md` di APP-ATHLON, «L'accesso del revisore di
  Apple»): un indirizzo di una scheda di prova su PerfectGym con un codice fisso di otto cifre. `entra()` (`src/api/lab.ts`) la prova
  solo quando il codice normale non vale. Senza, il revisore si ferma alla pagina d'accesso e l'app viene respinta (guideline 2.1).

### Cosa si fa su App Store Connect (non si fa da qui)

1. **Versione 3.0.0**: la build `production`, «Novità di questa versione», descrizione, parole chiave, URL di supporto e
   **URL della privacy** (`https://www.athlonroma.it/privacy/`). Screenshot iPhone 6,9" (l'app non dichiara `supportsTablet`, quindi
   niente iPad).
2. **Privacy dell'app (le «etichette»)**: vanno rifatte, l'app nuova raccoglie cose che la 2.2 non raccoglieva — dati di salute (letti da
   Apple Salute, solo se autorizzati), nome, email, telefono, data di nascita, codice fiscale, foto (profilo, certificati, pasti),
   contenuti dell'utente (messaggi all'assistente), identificativo per le notifiche. Nessuno usato per tracciare né per pubblicità.
   I pagamenti passano da Adyen e i dati della carta non arrivano a noi.
3. **Note per la revisione**: l'email e il codice di prova; che si entra con email e codice senza password; che gli acquisti in app sono
   abbonamenti alla palestra, lezioni, sedute e articoli da ritirare al club (beni e servizi consumati fuori dall'app, guideline 3.1.3(e));
   che Apple Salute si legge e non si scrive; che l'account si elimina da Profilo (5.1.1(v)).
4. **Rilascio manuale** dopo l'approvazione, e se si vuole graduale (7 giorni): è l'aggiornamento di tutti gli utenti della 2.2.

### Da sapere prima di mandarla

- **Athlon TV** (i video) è compresa nell'abbonamento, che l'app vende con Adyen. Apple chiede l'acquisto in app per i contenuti digitali
  (3.1.1); un abbonamento a una palestra con dei video accessori di solito passa, ma è il punto su cui un revisore può fermarsi. Se succede,
  la risposta è che i video sono un accessorio dell'abbonamento al club, non si vendono da soli.
- **I link universali** (`applinks:app.athlonroma.it` in `app.json`) non funzionano ancora: il dominio non serve
  `/.well-known/apple-app-site-association`. Non blocca la revisione; i link di `/r/` ed `/entra` si aprono nel browser invece che
  nell'app. Per farli funzionare serve il Team ID di Apple.
- **Dopo il rilascio**, e non prima: `EXPO_PUBLIC_APP_STORE_URL=https://apps.apple.com/it/app/athlon-club/id1584157295` su Vercel, così la
  carta «Scarica l'app» (`src/lib/appNativa.ts`) mostra il pulsante. Prima porterebbe a scaricare la 2.2.
