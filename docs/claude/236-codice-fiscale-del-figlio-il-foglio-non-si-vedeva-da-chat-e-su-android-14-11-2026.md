## Il codice fiscale del figlio: il foglio non si vedeva dalla chat dell'assistente (iOS) e con la tastiera su Android; ora è un livello, non un `Modal` (14/11/2026)

Segnalazione dei clienti: «il campo del codice fiscale non si vede» quando si prenota il Baby Nuoto. Il blocco è quello della sezione 226 (server: APP-ATHLON, sezione 271). **Server e foglio, presi da soli, funzionavano**: `portale-lab-calendario` risponde 409 `codice_fiscale` con `persone_dati` (`senza_codice_fiscale: false`, `codice_fiscale: null`), `richiestaDaRisposta` ne ricava la richiesta, `CorreggiDati` mostra il campo. Il guasto era **dove** si apriva il foglio.

### Le due cause (lette nel codice, non viste su un telefono)

1. **iOS e web: la chat dell'assistente.** `FoglioCodiceFiscale` era un `Modal` montato nel layout, accanto agli altri. La chat (`FoglioAssistente`) è un `Modal` su iOS e sul web, e dentro ha `PrenotaDaChat`, che prenota con gli stessi comandi del Calendario. Dalla chat il server bloccava, l'app chiedeva il foglio e **su iOS un secondo `Modal` non si apre sopra uno già aperto** (lo dice già la sezione 162, per `GuidaPrimaVolta`): il genitore leggeva «Scrivilo e poi prenota di nuovo» senza un campo dove scriverlo. Calendario, sezione Junior e Consigli non stanno in un `Modal`: lì il foglio si apriva.
2. **Android nativo, Android 15/16: la tastiera.** Il foglio è `ui/Foglio`, un `Modal` con `KeyboardAvoidingView` spento su Android. Da quando l'app è compilata per `targetSdk` 36 la finestra di un `Modal` **non si ridimensiona più** con la tastiera (sezione 182, che già segnalava `ui/Foglio` «stesso rischio, non toccato»): toccando il campo del codice fiscale la tastiera lo copriva.

### I dati del server (14/11/2026, solo conteggi su `audit_log`)

Dal 13/11 alle 12:00 UTC (primo blocco) alle 11:25 UTC di oggi: **40 blocchi `prenotazione_rifiutata` con `codice_fiscale`, 13 bambini, 13 genitori**. **11 bambini su 13 hanno ora un codice valido** (non si sa se scritto dal foglio o dal desk). **Cinque genitori hanno ritentato la stessa lezione a distanza di ore** (da 152 a 991 minuti); uno ha premuto «Prenota» 13 volte in 61 minuti. Il registro non dice dispositivo né da dove si è prenotato: non si può confermare che siano passati dalla chat. Un'altra causa possibile, che si spegne da sola: l'OTA del 13/11 (≈11:00 UTC) è uscita prima della funzione, e `expo-updates` applica l'aggiornamento al riavvio **dopo** quello che lo scarica.

### Cosa è cambiato (solo JavaScript)

- **`ui/Foglio.tsx`: prop `livello`.** Non una finestra a parte ma un livello a tutto schermo (`position: absolute`, `zIndex` e `elevation` 200) nella finestra dove è montato, con dissolvenza (`FadeIn`). **Su Android nativo** riceve l'altezza della tastiera e si alza (`useSollevamentoTastiera`, `src/lib/tastiera.ts`: la stessa logica di `FoglioAssistente`, `quantoAlzare` compreso, senza toccare l'assistente) e il tasto «indietro» lo chiude (`BackHandler`). Il fondo del foglio non conta due volte la barra di navigazione quando la tastiera è su. **Senza `livello` il foglio è identico a prima** (`Modal`, `slide`): `sollevamento` vale 0, e il `paddingBottom` resta `ins.bottom + spazio.tre`.
- **`lib/richiestaCodiceFiscale.ts`: due elenchi.** `ascoltaRichiestaCodiceFiscale(a, { dentro: true })` iscrive un foglio che sta **dentro** una finestra aperta; finché ce n'è uno la richiesta va a lui e solo a lui, altrimenti al foglio del layout, come prima.
- **`FoglioCodiceFiscale` ha il prop `dentro`**, e usa `livello` quando è `dentro` o su Android. Il layout lo monta come prima; `FoglioAssistente` ne monta un secondo **dentro la chat, solo a chat aperta e solo fuori da Android** (`aperto && !android`). Su Android il foglio del layout è un livello sopra la chat (200 contro 100): non serve un secondo.
- **Sul web** il foglio del layout resta un `Modal`; dentro la chat è un livello (niente trappola del fuoco di due `Modal` insieme).

### Provato

- `npx tsx scripts/prova-richiesta-codice-fiscale.ts`: **8 prove** (le 5 di prima + 3 nuove: il foglio dentro prende la richiesta al posto di quello del layout, chiusa la finestra torna al layout, da solo la riceve e disiscritto no). **Rottura fatta apposta: con l'instradamento tolto la sesta prova fallisce**, rimesso passano tutte.
- `npx tsc --noEmit`: **zero errori in `src/`**.
- **Non provato**: nessuna schermata su un telefono né su un emulatore. In particolare **l'apertura sopra la chat su iOS, la tastiera su Android 16 e l'ordine dei livelli sopra la chat e la barra delle schede su Android**. Se su Android il campo resta coperto, vale quello che dice la 182: guardare `keyboardDidShow` con un `console.log`.

### Da sapere

- **Gli altri `Foglio` con campi di testo hanno ancora il rischio della tastiera su Android 16** (`Misure`, `AggiungiAllenamento`, `FoglioProfilo`, `FoglioFeedback`, `Gestisci`, `schede/Test`, `SceltaEsercizio`, `Profilo`, `alimentazione/Aggiungi`, `FoglioPagatore`), come `CampoTelefono` e `CampoPaese`. Non toccati: la cura è `livello`, ma ogni foglio che si apre sopra un altro `Modal` va guardato prima. **Un foglio che si apre da dentro un `Modal` (`FoglioLezione`, la chat) ha lo stesso problema di iOS.**
- **Un'altra richiesta di codice fiscale da un `Modal` nuovo** deve montare un suo `<FoglioCodiceFiscale dentro />` dentro quella finestra, come fa `FoglioAssistente`.
- **Da pubblicare**: solo JavaScript (nessun modulo nativo nuovo: `react-native-reanimated` e `FadeIn` c'erano già), quindi OTA su **tre runtime** (3.0.0, 3.1.0, 3.1.1) con la procedura della 227 e della 234. Da fare solo con il via di Maurizio. Dopo, guardare in `audit_log` se i `prenotazione_rifiutata` con `codice_fiscale` ripetuti sulla stessa lezione calano, e far provare un iPhone dalla chat con un bambino senza codice.
