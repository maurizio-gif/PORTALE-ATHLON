## Il rilascio: portale web, App Store e Google Play, e cosa va fatto prima (02/11/2026)

Preparato il 02/11/2026 per pubblicare la settimana dopo: **tutto quello che si può preparare da qui è pronto, e restano le cose che può fare solo una persona** (elencate sotto). Niente è stato pubblicato.

### Cosa è pronto

- **`eas.json`**: `submit.production` per Android (traccia `production`, **`releaseStatus: draft`**: la versione arriva su Google Play come bozza e la si manda in revisione con un click dalla Console) e per iOS (`ascAppId` 1584157295: arriva su App Store Connect, poi si invia alla revisione dalla Console).
- **Due comandi**: `npm run rilascio:android` e `npm run rilascio:ios` (build col profilo `production`, canale `production`, numero di build che sale da solo, e invio allo store appena finita).
- **Il server** (APP-ATHLON, PR «Dispositivi: via Oura e Polar dal server»): funzione e migrazione pronte, da pubblicare con l'ordine di `docs/claude/90-oura-e-polar-tolti-02-11-2026.md` di APP-ATHLON.
- **L'informativa nuova** (`dispositivi/informativa.ts`, versione `2026-11-02`): scritta, **non rivista da un consulente**.
- **Su Expo**: la chiave Firebase (FCM V1) c'è, `google-services.json` è nel repository.

### Prima di tutto: cose che serve una persona

1. **Il consulente privacy rilegge l'informativa dei dispositivi** (testo in `informativa.ts`, punti da confermare in `docs/informativa-dispositivi-bozza.md`) e **l'informativa privacy generale** del club, che oggi non dice che l'app manda notifiche e che il club vede se sono state ricevute e aperte. Chi aveva accettato la versione di prima riaccetta alla prima apertura.
2. **Google Play Console**: l'app `it.athlonroma.app` deve esistere. **La prima versione si carica a mano** (scaricando l'AAB dalla pagina della build su Expo); dalle successive lavora `eas submit`, che vuole una **chiave dell'account di servizio di Google Play** (diversa da quella di Firebase) caricata su Expo in Credentials › Android. Prima della pubblicazione la Console chiede la **dichiarazione sui dati di salute / Health Connect** e il modulo «Sicurezza dei dati»: l'app legge sonno, passi, battito e allenamenti.
3. **Chiave di firma Android**: EAS ne ha generata una nuova alla prima build (02/11/2026). **Se l'app è già su Google Play firmata con un'altra chiave**, le build non verrebbero accettate: serve la chiave originale oppure il ripristino della chiave di caricamento dalla Console. Da chiarire prima di mandare la prima build di produzione.
4. **App Store Connect**: schede, schermate e testi della versione, **etichette sulla privacy (dati sulla salute)**, e per la revisione di Apple un **account di prova** da scrivere nelle note.
5. **Chiave di Apple/EAS per iOS**: già usata dalle build `test` (la 7 è del 29/10), non serve altro.

### Il giorno del rilascio (nell'ordine)

1. **Server** (APP-ATHLON): pubblicare `portale-lab-dispositivi`, `portale-lab-classifica`, `portale-lab-livelli` (importano la versione dell'informativa); **subito dopo** il punto 2.
2. **Portale web**: unire la PR di PORTALE-ATHLON su `main` (Vercel pubblica app.athlonroma.it). Il web ha l'informativa nuova, quindi va a pochi minuti dal punto 1.
3. **Store**: `npm run rilascio:ios` e `npm run rilascio:android` (30-60 minuti l'uno, la coda del piano gratuito può allungare). Poi dalle due Console: **iOS** «Aggiungi per la revisione», **Android** «Invia per revisione» della bozza.
4. **Migrazione** `20261102e_togli_oura_polar.sql` (SQL Editor di Supabase) e, a mano, i segreti `oura_*`, `polar_*`, `dispositivi_chiave` dal Vault.
5. **Verifiche**: aprire l'app, riaccettare l'informativa, attivare Apple Salute / Health Connect e una notifica push di prova dal CRM.

### Cosa non è coperto

- La **revisione di Apple e di Google** richiede giorni, e può chiedere correzioni: la data di uscita non la decidiamo noi.
- Il web e le app non escono insieme: **fra la pubblicazione del server e quella delle app, chi ha l'app vecchia vede «l'informativa è cambiata»** sulla sezione dei dispositivi finché non aggiorna. Le altre sezioni non cambiano.
- **iPhone**: le push e Apple Salute non sono state riprovate in questa sessione; tutta la prova su telefono è stata fatta su Android.
