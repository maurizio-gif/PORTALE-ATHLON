## La tastiera su Android: `Schermata` si accorcia, e i fogli con un campo di testo stanno alla radice (`FoglioHost`) (14/11/2026)

Richiesta di Maurizio: «Fixa i problemi con la tastiera android». Seguito delle sezioni 182 (la chat) e 236 (il foglio del codice fiscale), che avevano lasciato scritto «stesso rischio, non toccato» per le altre schermate e i fogli. **Solo JavaScript**, nessun modulo nativo nuovo.

### Cosa si sa, e cosa no

- **Provato su un telefono: una cosa sola.** Maurizio ha segnalato (10/11/2026) che nella chat, che era un `Modal`, la tastiera copriva il campo (sezione 182). Tutto il resto è letto nel codice.
- **Letto nel codice di React Native 0.86.3** (`node_modules/react-native/ReactAndroid/.../ReactModalHostView.kt`): il `Modal` è una finestra a parte (`Dialog`) con `SOFT_INPUT_ADJUST_RESIZE`; `disableEdgeToEdge` è `setDecorFitsSystemWindows(true)` e il contenuto ha `fitsSystemWindows`. **Non si sa se su Android 16 basti a ridimensionarlo**: il caso della chat dice di no. Gli eventi `Keyboard` (`keyboardDidShow`) li manda `ReactRootView`, cioè la finestra dell'attività.
- **Inferenza, non verificata**: Android dice a ogni finestra che la tastiera è visibile solo se *quella finestra* l'ha chiesta. Se è così, mentre il campo è in un `Modal` l'attività non riceve `keyboardDidShow`, e **nessun `KeyboardAvoidingView` dentro un `Modal` può funzionare su Android**. Per questo i fogli non si curano con più `KeyboardAvoidingView`, ma spostandoli nella finestra dell'attività.

### Cosa è cambiato

- **`Schermata` (tutte le schermate)**: su Android, se è quella in primo piano, l'area che scorre si accorcia di quanto sale la tastiera (`useSollevamentoTastiera` in `lib/tastiera.ts`, `paddingBottom` sul contenitore), come faceva `adjustResize`; Android tiene in vista il campo col fuoco (`ScrollView.onSizeChanged`). Se il sistema ridimensiona già la finestra non si alza due volte (`quantoAlzare`). Riguarda tra le altre `Seduta` (chili e ripetizioni), `Filo` (la chat dell'assistenza), «Completa il profilo» e `Accesso`. Il comando fermo in basso (`flottante`) resta dov'era, sotto la tastiera.
- **`FoglioHost` + `Foglio tastiera`**: un foglio con un campo di testo, su Android, non è più un `Modal`: manda quello che deve disegnare a `FoglioHost` (`lib/portaleFogli.ts`, montato una volta nel layout `(portale)`), che lo mostra a tutto schermo nella finestra dell'attività, sopra a tutto (zIndex 200) e sopra alla barra delle schede, e lo alza con la tastiera. Il tasto «indietro» lo chiude. Lo stato dei figli resta (stesso `key` nell'host). **Senza un host montato (le pagine fuori dal layout del portale) o su iOS e web è il `Modal` di sempre.**
- **Dodici fogli ci sono passati** (`tastiera`): in `Profilo` (Telefono, Indirizzo, il foglio del codice), `Misure`, `FoglioFeedback`, `Gestisci` (il commento di sospensione e disdetta), `AggiungiAllenamento`, `alimentazione/Aggiungi`, `classifica/FoglioProfilo`, `junior/FoglioComponente`, `pagatore/FoglioPagatore`, `schede/SceltaEsercizio`, `schede/Test`. Il foglio del codice fiscale (236) usa `livello`, che è lo stesso livello senza passare dall'host.

### Cosa NON è stato toccato, e perché

- **Un foglio che si apre da dentro un `Modal`** non può usare `tastiera`: alla radice starebbe sotto quella finestra e non si vedrebbe. Il caso noto è `schede/Calorie.tsx` («Come le abbiamo calcolate»), dentro `FoglioLezione`: non ha campi, e resta un `Modal`.
- **I selettori con ricerca** (`CampoPaese`, `CampoTelefono`) e `CampoData` sono `Modal` a sé: la ricerca in basso può restare coperta. Se succede sul telefono, vanno resi un livello come i fogli.
- **I fogli con un campo dentro un componente figlio** (non visibile nel blocco `<Foglio>`) possono non essere nell'elenco: `AggiungiComponente`, `LivelloDaCompilare`, `CaricaCertificato`, `Delega`, `DisdiciCorso`. Controllati solo guardando il blocco, non il contenuto dei figli. Per metterne uno: la prop `tastiera`, dopo aver visto che non sta in un `Modal`.
- **`Pagina`** (le pagine pubbliche, sul web) e il totem: non cambiano.

### Provato

- `npx tsc --noEmit`: zero errori in `src/`.
- `npx tsx scripts/prova-portale-fogli.ts` (**7 prove**: l'elenco dei fogli, l'ordine nella pila, l'host montato; rottura apposta presa) e `scripts/prova-alza-per-tastiera.ts` (**8 prove**, nuova: la sezione 182 diceva «8 prove» sul calcolo ma nel repo non c'erano): `quantoAlzare` mai due volte, mai sotto zero.
- **Nel browser, con i componenti veri** (Chromium + `react-native-web`, rotta temporanea non committata, `Platform.OS` finto «android» e una tastiera finta): il foglio sta nella radice e non nella schermata, il testo scritto arriva al proprietario, **con la tastiera da 300 il foglio e la schermata salgono di 300** e tornano giù, un ridisegno del proprietario aggiorna il foglio senza perdere il testo, chiuso sparisce, **senza host ricade sul `Modal`**. Otto controlli su otto. **Si fa con `expo export -p web --dev`**: la build di produzione sostituisce `Platform.OS` al momento di compilare, e la finta non ha effetto (il primo tentativo falliva per questo).
- `expo export --platform ios --platform android`: i due bundle si compilano.
- **Non provato: un telefono Android.** Il browser prova la logica React, non le finestre di Android: né che la tastiera alzi davvero, né l'ordine sopra la barra delle schede, né il tasto «indietro».

### Da provare su un Android 15/16, con l'app dagli store

Profilo → Telefono (il campo sopra la tastiera, e il foglio sopra la barra delle schede); Misure; «Scrivi a noi» del feedback; Gestisci → sospendi, con il commento; Test dei massimali; il foglio del codice fiscale; una seduta con chili e ripetizioni (ultima serie in fondo); la chat dell'assistenza (`Filo`); «Completa il profilo». «Indietro» deve chiudere il foglio. Se il campo resta coperto: `Keyboard.addListener('keyboardDidShow')` con un `console.log` dell'altezza, come dice la 182.

### Se non va

Tolta la prop `tastiera` da un foglio, torna il `Modal` di prima. Tolte le due righe di `useSollevamentoTastiera` da `Schermata`, la schermata torna a prima. **Da pubblicare**: OTA su tre runtime (3.0.0, 3.1.0, 3.1.1) con la procedura della 227 e della 234, solo con il via di Maurizio.
