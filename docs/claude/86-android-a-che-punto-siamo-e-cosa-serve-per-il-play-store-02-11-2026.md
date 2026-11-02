## Android: a che punto siamo e cosa serve per il Play Store (02/11/2026)

Richiesta di Maurizio: l'account sviluppatore di Google Play è attivato (restano le verifiche del documento), si comincia l'app Android. **Questa sezione è la fotografia di partenza e la lista di cosa manca**; non c'è ancora una build Android né un telefono Android su cui sia stata provata.

**Lo stesso codice dell'iPhone.** Android non è un progetto a parte: è Expo/React Native come iOS, e `android/` non esiste nel repository (si genera con `expo prebuild`, non si scrive a mano: `AGENTS.md`). Quello che serve sta in `app.json`, nei plugin e in `eas.json`.

### Cosa c'è già (letto nel codice, non provato su un telefono)

- **`app.json`**: pacchetto `it.athlonroma.app`, `versionCode` 1, icona adattiva (primo piano, sfondo e monocromatica), compile/target SDK 36, min SDK 26, intent filter `https://app.athlonroma.it/r/*` con `autoVerify`, schema `athlon`, i sette permessi di lettura di Health Connect.
- **`expo prebuild --platform android` passa** (provato il 02/11/2026 su una copia fuori dal repository, con `npm ci`): il manifest generato ha i permessi `android.permission.health.*`, l'attività del «rationale» di Health Connect (`ACTION_SHOW_PERMISSIONS_RATIONALE`), l'alias `ViewPermissionUsageActivity`, il deep link verificato e il colore delle notifiche. Nuova architettura, Hermes ed edge-to-edge attivi. **Non è stato compilato con Gradle**: da qui non c'è l'SDK Android.
- **Codice con ramo Android**: Health Connect (`dispositivi/healthConnect.ts`, fonte `google_salute`), push native (`notifiche/pushNativo.ts`, `piattaforma: 'android'`), wallet Google nel badge (`walletDelTelefono`), barra delle schede senza sfocatura su Android (`BarraSchede.tsx`), link al Play Store (`lib/appNativa.ts`).
- **Server già pronto** (APP-ATHLON): `portale-lab-notifiche` accetta `piattaforma: 'android'`; `portale-lab-dispositivi` conosce `fonte: 'google_salute'`. Niente da cambiare lato server per cominciare.
- **`eas.json`**: profili `development`, `test` e `production` (App Bundle, per lo store). **Aggiunto il profilo `preview`** (APK, distribuzione interna, canale `test`): `npx eas-cli build -p android --profile preview` dà un file da installare direttamente su un telefono di prova, senza passare dal Play Store.

### Cosa manca (in ordine di blocco)

1. **Prima build e prova su un telefono Android vero.** Tutto il ramo Android è scritto ma mai visto girare. Da guardare con attenzione: edge-to-edge (barre di sistema, tastiera, `Schermata`), tasto indietro, Health Connect (foglio dei permessi, prima sincronizzazione), la finestra e il tocco delle notifiche, la condivisione di immagini e PDF.
2. **Push: serve Firebase (FCM).** Il token di Expo su Android non si ottiene senza la chiave: progetto Firebase del club → app Android `it.athlonroma.app` → `google-services.json` (da indicare in `android.googleServicesFile` di `app.json`, **file da non committare se contiene chiavi riservate: la chiave pubblica del client sì, il file account di servizio no**) e la chiave FCM v1 caricata nelle credenziali del progetto Expo. Finché manca, `gettone()` dice `null` senza errore e il comando delle push non compare.
3. **`assetlinks.json` per i deep link.** `public/.well-known/assetlinks.json` con il pacchetto e l'impronta SHA-256 del certificato di firma. **L'impronta giusta è quella di «Firma app di Play» (Play Console → Integrità dell'app)**, che esiste solo dopo il primo caricamento: scriverla prima porterebbe fuori strada. Vercel lo serve già come file statico (il catch-all di `vercel.json` esclude i percorsi con un punto).
4. **Il primo caricamento sul Play Store si fa a mano** dalla Console (un file `.aab` da `eas build -p android --profile production`); solo dopo `eas submit` può caricare le versioni successive (serve l'account di servizio Google con i permessi sulla Console).
5. **Informativa dei dispositivi** (`dispositivi/informativa.ts`): nomina ancora Oura e Polar; la bozza nuova è `docs/informativa-dispositivi-bozza.md` e va aggiornata con Health Connect **prima** di aprire Android. Cambiarla cambia `VERSIONE_INFORMATIVA` qui e in `_shared/dispositivi/tipi.ts`, e tutti riaccettano.
6. **Dichiarazioni della Play Console** (da fare e da leggere sulla Console, le regole cambiano): modulo sull'uso dei dati di Health Connect (un motivo per ognuno dei sette permessi, e l'informativa deve coincidere), scheda «Sicurezza dei dati», indirizzo dell'informativa privacy, **eliminazione dell'account** (nell'app c'è già «Elimina account» nel Profilo; la Console chiede anche un indirizzo web dove chiederla), classificazione dei contenuti, pubblico di destinazione (la sezione Junior tratta dati di minori: un genitore che li gestisce, ma la scelta del pubblico va ragionata, non lasciata di default).
7. **Test chiuso prima della produzione, se l'account è personale.** Per gli account personali creati dopo novembre 2023 Google chiede un test chiuso con un numero minimo di tester per 14 giorni consecutivi prima di pubblicare (oggi 12, **da verificare sulla Console**); un account di organizzazione di solito no. I tester dell'app (CRM → tester) sono già una lista pronta da cui partire.
8. **Variabile `EXPO_PUBLIC_PLAY_STORE_URL`** su Vercel, a pubblicazione fatta (`https://play.google.com/store/apps/details?id=it.athlonroma.app`): senza, la PWA non mostra «Scarica l'app» ai possessori di Android.

### Pareggio con l'iPhone (non è un problema solo di Android)

- **Pagamento con carta nell'app nativa** (`adyen.tsx`): oggi un avviso «apri app.athlonroma.it dal browser», uguale su iOS e Android. Serve `@adyen/react-native` con la sua build.
- **Firma del contratto** (`FirmaPad.tsx`): non c'è il campo di firma nativo.
- **Badge nel wallet**: la schermata c'è (`in_arrivo`), la funzione `portale-lab-wallet` che emette il pass no; per Android vuol dire Google Wallet API (account emittente a parte, da aprire).
- **Il benvenuto della Home** resta solo Apple (`salute_collegabile` solo su iPhone).

### Dubbio da chiudere, non deciso

`allowBackup` è `true` nel manifest generato (valore predefinito di Expo): Android può copiare nel backup di Google i dati dell'app, compresa la sessione di Supabase tenuta in `expo-sqlite`. Per un'app con dati sulla salute conviene `android.allowBackup: false` in `app.json`; **non cambiato**, da decidere con la prima build.

### Controlli di partenza

`npm ci` e `expo prebuild -p android` (copia fuori dal repository) senza errori. `tsc --noEmit`: 3 errori fuori da `docs/`, **già presenti e senza legame con Android** (`features/delega/ConfermaDelega.tsx`, `features/lab/accessoDalCrm.ts` ×2). **Non provato**: compilazione Gradle, un emulatore, un telefono, Health Connect, push, App Links.
