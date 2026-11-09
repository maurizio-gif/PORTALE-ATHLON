## Da iPhone e iPad, dal web, si propone l'app dell'App Store (08/11/2026)

Richiesta di Maurizio, con l'app 3.0.0 sull'App Store e il rilascio aperto a tutti: se qualcuno apre il portale dal web e il sistema riconosce un
iPhone o un iPad, gli propone **direttamente il download dell'app**. **Solo JavaScript del web**: nessuna modifica a `app.json`, `package.json` o
plugin, quindi non serve nessuna build dell'app nativa e non si tocca l'app già installata.

- **Dove compare**: la carta «Installa l'app» (`features/lab/ui/Installa.tsx`) che c'era già, nella Home e nella pagina d'accesso (prima di
  entrare). Sul telefono con l'app nativa non compare, come prima (`Platform.OS !== 'web'`), e nemmeno sul totem o a chi ha già installato la PWA
  (`installata()`). **Non c'è un secondo avviso**: nessun banner di Safari (`apple-itunes-app`), perché con la carta sarebbero due inviti insieme e
  il banner perderebbe il contesto di `/invito/<codice>` e di `/entra` (senza `app-argument`, «Apri» riporta alla Home dell'app).
- **Cosa cambia per chi è su iOS** (`telefonoDelBrowser() === 'ios'`, qualunque browser: Safari, Chrome, Firefox, Edge, e anche dentro Instagram
  e simili, dove la PWA non si installa e l'App Store invece si apre): titolo «Scarica l'app Athlon Club», un pulsante pieno «Scarica
  dall'App Store» e il testo che dice cosa dà l'app (apertura con un tocco, avvisi del club, Apple Salute che spunta da sola le abitudini) e che
  si entra con la stessa email e il codice. **I passi della PWA restano**, ma chiusi dietro «Preferisci la versione web? Ecco i passi», per chi non
  vuole installare niente dallo store. La frase «non serve passare dall'App Store» e quella sulle notifiche «solo con l'app installata» non
  compaiono più sulla carta dell'App Store: erano della PWA.
- **Il pulsante apre l'App Store nella stessa scheda** (`window.location.assign`, non una scheda nuova): se Safari passa la mano all'app dello
  store la pagina resta dov'era, se non lo fa si vede la pagina dello store e il tasto indietro riporta qui.
- **Il link dell'App Store è scritto nel codice** (`lib/appNativa.ts`, `https://apps.apple.com/it/app/athlon-club/id1584157295`): l'app è pubblicata
  e il link risponde. `EXPO_PUBLIC_APP_STORE_URL` lo sostituisce se un giorno serve un altro indirizzo (deve cominciare per `https://`), ma
  **non va più impostato su Vercel perché funzioni**: il piano di `118-pubblicazione-app-store` («dopo il rilascio, e non prima: impostarlo su
  Vercel») è superato. Lo stesso link accende anche il pulsante «Scarica l'app Athlon Club» della carta delle abitudini (`fit/Abitudini.tsx`), che
  prima, senza link, diceva «cerca Athlon Club nello store».
- **Android non cambia**: `linkAppNativa('android')` resta `null` finché non c'è `EXPO_PUBLIC_PLAY_STORE_URL`, quindi la carta è quella della PWA
  (pulsante «Installa» del browser e i passi). **Quando Google approva l'app** basta impostare quella variabile su Vercel, e la carta Android va
  trattata come questa (oggi `store` si calcola solo per iOS in `Installa.tsx`, e il testo dice «App Store»: va generalizzato).
- **«Non ora»** nasconde la carta per una settimana, come prima, e vale anche per l'invito all'App Store.
- **Non risolto, e va saputo**: non c'è `/.well-known/apple-app-site-association` (vedi la nota sui link universali in `118-pubblicazione-app-store`),
  quindi i link che arrivano dalle email — `/entra`, `/r/` — si aprono nel browser anche a chi ha l'app. Il file va servito col Team ID `RFSG2LMFH2`
  e il bundle `com.netpulse.centrosportivoathlon`, ma prima va provato su un iPhone con l'app installata che `/entra#token` (il token sta nel
  frammento) arrivi intero all'app: se non arriva, aprirebbe l'app senza far entrare.
- **Provato** (Chromium su `expo export -p web`, con Supabase intercettato): con l'user agent di un iPhone la carta mostra il pulsante dell'App Store in
  Safari, in Chrome per iOS e dentro Instagram, in italiano e in inglese; il tocco naviga a `apps.apple.com/it/app/athlon-club/id1584157295`; «Preferisci
  la versione web?» apre i quattro passi; nessuno scorrimento orizzontale e nessun errore JavaScript; su Android Chrome resta la carta della PWA; su un
  Mac nessuna carta. `tsc` senza errori in `src/`. **Non provato** su un iPhone vero: il passaggio di mano all'app dell'App Store, e cosa fa
  Instagram con quel link.
