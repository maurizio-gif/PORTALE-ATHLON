## La modalità totem: l'app sul pannello del club, con «Esci» e l'uscita da sola (02/11/2026)

Richiesta di Maurizio: **il totem è l'app intera, allo stesso indirizzo**, ottimizzata per il 27 pollici verticale all'ingresso del club. Una persona entra
con la sua email e il codice, fa la stessa procedura dell'app (un abbonamento per un adulto, l'iscrizione di un bambino alla Scuola Nuoto, le prenotazioni),
e gli ultimi due passi di un abbonamento (firma e pagamento) li fa fuori, dal telefono, con il QR o il link per email (`/r/<token>`, sezione 86). Il pannello è di
tutti: chi finisce deve uscire con un tocco, e se non lo fa si esce da soli. **Nessuna rotta separata**: l'app riconosce il formato. Tutto il codice sta in
`src/lib/totem*.ts`, `src/lib/finestra.ts` e `src/features/lab/totem/`.

### Come riconosce il formato

Dalla **forma dello schermo, mai dal puntatore**: Windows presenta il pannello touch al browser come un computer con il mouse (`pointer: fine`), quindi `pointer: coarse`
non scatta. Tre condizioni insieme: larghezza ≥ 900, altezza ≥ 1200, rapporto larghezza/altezza ≤ 7/10 (`formatoTotem` in `lib/totem.ts`). **Sono le stesse del sito**
(`@media (min-width: 900px) and (min-height: 1200px) and (max-aspect-ratio: 7/10)` in `global.css` di SITO-ATHLON, dove sta anche il perché del 7/10: la finestra vera del
pannello, barre del browser comprese, misura 1064×1725, cioè 0,617): vanno tenute in pari. Solo sul web.

- `?totem=1` forza la modalità, `?totem=0` la spegne (per provare a computer). Il parametro vive **solo in memoria**, mai in uno storage.
- **Si decide una volta, al caricamento.** Da quella dipende dove sta la sessione. Se la finestra cambia formato dopo (il browser del pannello che passa a schermo intero),
  `totemAvvio.ts` ricarica la pagina (dopo un secondo, solo se il formato è ancora diverso); se cambia solo la larghezza dentro il totem (Windows dal 100% al 150%), la scala si ricalcola senza ricaricare.

### La scala: una colonna logica da 540, ingrandita con `zoom`

La pagina si ingrandisce con `zoom` **sull'elemento radice** (non su un contenitore: i riquadri che React Native attacca al `body` sfuggirebbero a una scala messa più in basso) di
`larghezza della finestra / 540`: 2 a 1080, 1,97 a 1064, 2,67 a 1440. Il testo resta della stessa misura in millimetri a qualunque scala dichiarata da Windows: il corpo di 15 pixel diventa
circa 9 mm sul vetro (il sito tiene 8 mm). Sotto i 900 logici l'app usa già il suo schema da telefono (`LARGO`): è esattamente quello che si vuole, **un telefono grande**.

Misurato su Chromium 153 (prova prima di costruirci sopra), con `zoom` sulla radice:

- `#root` riempie esattamente la finestra; `offsetWidth` è in pixel **logici**, `getBoundingClientRect` in pixel **veri**;
- `innerWidth`, `visualViewport` e `documentElement.clientWidth` **restano veri**: per questo **ogni schermata importa `useWindowDimensions` da `lib/finestra.ts` e non da `react-native`**
  (venticinque file sono stati cambiati così). Sul totem restituisce la larghezza logica (540) e l'altezza nella stessa proporzione; fuori dal totem è quello di React Native, tale e quale. Un'importazione nuova da
  `react-native` sul totem sbaglierebbe le misure **senza nessun errore**: il controllo è `grep -rn "useWindowDimensions" src | grep "react-native'"`, che non deve trovare niente;
- **le unità `vw`/`vh` si moltiplicano per la scala** (100vw diventa 200vw): l'app non le usa, a parte la regola `display-mode: standalone` di `public/index.html`, che sul totem si riporta a `100%` (`html[data-totem]`);
- `scrollTop` è in pixel logici (100 sposta il contenuto di 200 veri): chi legge un `getBoundingClientRect` per scorrere deve dividere per la scala (`AreaRiservata`: l'ancora della Home; `FirmaPad.web`: le coordinate del dito). Fuori dal totem il rapporto è 1 e il comportamento è quello di prima.

Il tema è **sempre chiaro** sul totem (`schemaColori.ts`): la larghezza logica è da telefono, ma il totem è un computer.

### Niente resta sul dispositivo

`totemAvvio.ts`, importato per primo da `localStorage.ts` (che `supabase.ts` e `lingua.ts` importano per primi), sul totem:

1. rimpiazza `window.localStorage` con **la memoria della scheda** (`sessionStorage`): la sessione di accesso, la lingua e ogni altra chiave dell'app (`athlon_*`, `sb-…-auth-token`) muoiono con la scheda, **senza toccare il resto del codice**;
2. svuota il vero `localStorage` a ogni apertura;
3. butta una memoria di scheda con l'ultimo tocco più vecchio di sei minuti (cinque di inattività più la proroga) o senza segno: i browser che riaprono le schede (`session restore`) restituirebbero l'accesso di chi c'era. Il segno è `athlon_totem_ultimo`, che la guardia aggiorna a ogni tocco;
4. mette `autocomplete="off"` su ogni `input` e `textarea` che compare (un `MutationObserver`; nessun suggerimento di email o dati di chi c'era prima).

**Cosa scrive l'app nel browser, e cosa si cancella** (controllato con `grep` su `localStorage`, `sessionStorage`, `AsyncStorage`, `indexedDB`, `expo-sqlite`): `sb-…-auth-token` (la sessione), `athlon_lingua`, la cache di Club Life
(`api/clubLife.ts`), `athlon:installa-dopo`, `athlon:push-dopo`, le chiavi di Apple Salute (solo nativo), `athlon_vista_come`, il carrello dello shop, il «già mostrato» dell'avvio animato e di `StatoPagamento`. **Tutto
sul totem sta nella memoria della scheda e al logout si svuota intera** (`svuotaArchivi`); il vero `localStorage` non viene usato. Sul web non c'è IndexedDB né SQLite.

### «Esci» al posto di «Richiedi assistenza»

In alto a destra, **pieno e arancio, con la scritta**, nella stessa posizione e con la stessa regola di spostamento del pulsante che sostituisce (`EsciTotem.tsx`; il layout `(portale)` sceglie). Un tocco e si esce, **senza conferma**.
Il pulsante «Esci» del Profilo (`ui/Uscita.tsx`) fa la stessa cosa sul totem. Anche la carta «Ti serve una mano?» di Club Life sparisce (la chat dell'assistente non c'è: `apriAssistente` ritorna `false`, come in vista cliente).

### L'uscita, a mano e da sola: `uscitaTotem()`

Una funzione sola, e fa **più di un logout normale**, perché il totem è di tutti:

1. `esciDalLaboratorio({ soloQuestoDispositivo: true })`: toglie le notifiche, la chat, il carrello, la memoria delle schermate e chiude la sessione **solo di questo dispositivo** (`signOut({ scope: 'local' })`).
   **Il logout di sempre è `global`** (chiude l'accesso anche sul telefono): sul totem non va bene, chi esce dal pannello non deve perdere l'accesso sul suo telefono. Non aspetta oltre quattro secondi;
2. svuota la memoria della scheda e il vero `localStorage`;
3. **ricarica la pagina da capo** (`location.replace('/')`): la strada più sicura per non lasciare in memoria niente di chi c'era, anche di ciò che nessuno ha pensato di azzerare (campi scritti, codici, stato delle schermate, richieste a metà).

**L'uscita da sola** (`GuardiaTotem.tsx`, nel layout della radice, quindi anche sulla pagina d'accesso e su `/r/<token>`): **cinque minuti senza tocchi**, e negli ultimi trenta secondi compare «Sei ancora qui?» con il conto alla rovescia, «Continua» ed «Esci».

- **Cosa conta come presenza**: `pointerdown`, `touchstart`, un tasto, la rotella, uno scorrimento di qualunque cosa (`scroll` in cattura: non risale). Niente movimento del mouse: sul pannello è il dito.
- **Cosa NON la rimanda**: i tocchi mentre l'avviso è in vista (decide solo «Continua»), e **una richiesta in corso, se non per al massimo un minuto in tutto**: mentre c'è almeno una richiesta in volo il conto si ferma, per il tempo vero dell'attesa (`millisecondiInVolo`:
  una richiesta di cento millisecondi pesa cento millisecondi), fino a 60 secondi per periodo di inattività; ogni tocco riparte da zero. Il conto è sull'orologio e non su un timer da sommare: un browser che rallenta i timer non allunga l'attesa.
- **Quando è armata**: con un accesso, o dopo il primo tocco della pagina (una email appena scritta e un codice a metà sono dati di una persona). Un totem acceso e fermo sulla pagina d'accesso non si ricarica ogni cinque minuti per niente.

### Cosa si nasconde sul totem (solo ciò che è chiaramente inutile o pericoloso su un dispositivo condiviso)

| cosa | dove | perché |
| --- | --- | --- |
| «Richiedi assistenza» (pillola e carta di Club Life) | `PulsanteAssistente`, `RichiediAssistenza` | davanti c'è il desk; al suo posto «Esci» |
| «Installa l'app» | `ui/Installa.tsx` | è il pannello del club, non il telefono di qualcuno |
| notifiche push (attivazione, carta in Home, finestra d'invito, richiesta di permesso) | `notifiche/push.ts`, `supportato()` → `non_supportato` | l'indirizzo push resterebbe al pannello e le notifiche di una persona arriverebbero sullo schermo di tutti |
| dettatura vocale | `lib/dettatura.ts`, `dettaturaDisponibile()` | il permesso del microfono resterebbe al browser del pannello |
| «Salva sul dispositivo» (PDF) e «Scarica l'immagine» (mese e settimana) | `apriPdf.tsx`, `fit/Mese.tsx`, `fit/Settimana.tsx` | il file di una persona resterebbe sul disco del pannello |

### Non toccato, da decidere (il club)

- **I selettori di file e la fotocamera** (foto del profilo, certificato, piani da importare, foto del piatto, allegati): sono finestre del sistema operativo che sul pannello mostrano i file del pannello. Sono sei punti di chiamata: se serve nasconderli, la strada è un controllo
  `inModalitaTotem()` in ognuno.
- **I link che escono dall'app** (privacy, `wa.me`, il PDF che si apre in una scheda nuova, la pagina di pagamento di Adyen): in un browser a schermo intero senza schede una pagina aperta fuori può non avere un «indietro». Dipende da come è configurato il browser del pannello.
- **I pagamenti con carta fatti dal totem** (quote scadute, shop): la firma e il pagamento di un *abbonamento* escono dal totem col QR; gli altri pagamenti restano com'erano. Una carta digitata su uno schermo pubblico è un rischio che il club può voler togliere.
- **Il tocco sul link dentro una frase**: «informativa privacy» nella pagina d'accesso misura 40 pixel fisici di altezza a 1080 (è un link dentro una frase, esente come nel sito). Non è stato allargato.
- **Il blocco del browser** (kiosk senza barra, niente tasto destro, niente zoom a pizzico) è di chi configura il pannello, non dell'app.

### Provato

`npm run typecheck` (stessi 46 errori della base, nessuno nuovo), `npm run build:web`, la parte pura (`npx tsx scripts/prova-totem.ts`, o `node --experimental-strip-types`: 7 gruppi) e **nel browser** (Playwright, export web servito da un server locale, funzioni e Supabase finti, sessione fatta
passando davvero da email e codice): riconoscimento a 1080×1920, 1064×1725 e 1440×2560 senza parametri; **non** a 390×844, 768×1024 (tablet 3:4), 1920×1080 e 1400×900; `?totem=1` a 1280×800; `?totem=0` a 1080×1920; «Esci» al posto di «Richiedi assistenza» (e il
comportamento di sempre a 1400×900, con la sessione nel vero `localStorage`); «Esci» che ricarica la pagina, svuota la memoria, lascia solo `athlon_totem_ultimo` e `athlon_avvio_mostrato` e chiude con `scope=local`; scheda chiusa e riaperta nello stesso browser: l'accesso è vuoto; una memoria
di scheda di dieci minuti fa si butta, una di due si tiene; l'uscita da sola con l'orologio finto (nessun avviso a 4:28, avviso con conto alla rovescia di 30 secondi, un tocco fuori dai pulsanti non lo toglie, «Continua» lo toglie e il conto riparte, a 5:00 si esce e la pagina riparte da capo); una richiesta in corso
che non rimanda l'uscita per più di un minuto; una finestra che cambia formato dopo il caricamento (ricarica) e una che cambia solo scala (non ricarica); `autocomplete="off"` su ogni campo; **misure sugli elementi veri** (accesso a due passi, Home intera e in fondo, nei tre formati e nel forzato):
nessun overflow orizzontale, nessun testo sotto i 19 pixel fisici (il minimo è 20,7 a 1064), nessun comando sotto i 48 (tranne il link dentro la frase); la carta «Ti serve una mano?» di Club Life assente sul totem e presente altrove; la pagina `/r/<token>` della sezione 86 si disegna alla stessa scala.

**Non provato**: il totem vero (il browser del pannello, Windows, la sua scala dichiarata, l'orologio e le barre del browser), un telefono vero, la lettura del QR, le funzioni vere (nelle prove sono finte), il browser Edge (solo Chromium), Safari e Firefox (`zoom` sulla radice vale in Chromium, Safari e Firefox recenti: dove manca, la scala resta 1 e il codice non corregge le misure), e le schermate della Home che chiedono dati che nelle prove non ci sono (Calendario, Percorso, Athlon Health System: si disegnano con la stessa scala, ma non sono state viste con dati veri).
