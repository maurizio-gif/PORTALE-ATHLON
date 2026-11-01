## Le notifiche del club: una finestra appena arriva, il centro notifiche, e la push se la si attiva

Richiesta del club (20/10/2026): il club scrive al socio **dentro l'app**, dalla scheda del contatto o dalla newsletter del CRM, e la notifica arriva in tre modi insieme: una
**finestra** che compare appena arriva, il **centro notifiche** (l'elenco di tutto quello che il club ha scritto) e, per chi l'ha attivata, una **notifica push** sul dispositivo.
Cartella `src/features/lab/notifiche/`, API `src/api/notifiche.ts`, rotta `src/app/(portale)/notifiche.tsx`, service worker `public/sw.js`. La funzione (`portale-lab-notifiche`), le
tabelle, la natura servizio/marketing e il consenso, i tetti, il tracciamento e come si accende: sezione «Le notifiche ai soci» del `CLAUDE.md` di APP-ATHLON.

- **L'app non sceglie niente e non manda niente**: legge quello che il club ha scritto e **dice al server cosa ha fatto la persona** (`segna`: `vista`, `aperta`, `azione`, `nascosta`),
  che è il modo in cui il club vede se la comunicazione è arrivata e se è stata aperta. `segna` non aspetta e non solleva mai: il tracciamento non deve far fallire un tocco.
  L'app non ricopia le regole di chi può scrivere a chi (consenso, tetti): le applica il database.
- **La finestra** (`FinestraNotifica.tsx`, una `Modal` nativa): una alla volta, la più recente per prima, mai più di tre di fila. Compare **dopo l'avvio animato** (`ATTESA_AVVIO_MS`,
  3,7 secondi dall'apertura: l'avvio dura 3,25 e una finestra sopra il logo che si costruisce sarebbe uno spreco per tutti e due). Chi la riceve vede titolo e testo **per intero**
  (mai tagliato) e un solo pulsante, quello che il club ha scelto (una schermata dell'app, o una pagina di athlonroma.it), con il suo testo; senza pulsante, «Ok, letto».
  **Cosa fa la persona dice com'è andata**: la comparsa è `vista` (si dice subito, una volta sola per notifica); il pulsante è `azione` e `aperta`; «Ok, letto» è `aperta`;
  **la X o un tocco fuori la chiudono e la lasciano solo `vista`**, perché chi chiude non ha letto per forza: la notifica resta fra le non lette del centro. Il server dà come finestre
  solo le notifiche create nelle ultime 48 ore e non ancora viste: una chiusura di tre giorni fa non salta fuori da sola.
- **Compare «subito» in due modi** (`Notifiche.tsx`, montata una volta sola nel layout `(portale)`): l'app in primo piano chiede cosa c'è di nuovo **ogni venti secondi** (`nuove`,
  e subito all'apertura, e al ritorno dopo averla lasciata); e chi ha la push attiva la riceve col service worker, che dice all'app aperta di rileggere **subito**
  (`notifica-arrivata`). Un solo giro per tutta l'app (`store.ts`, una sola richiesta in volo alla volta). **La coda delle finestre si allunga e non si rimpiazza**: quella che la persona
  sta leggendo è già `vista` per il server, che alla risposta dopo non la ridarà, e rimpiazzare la coda la farebbe sparire sotto gli occhi.
- **Dove il server dice «non per te» l'app smette di chiedere**: 401, 403, 404 (funzione non ancora pubblicata) o 409 (nessuna scheda) mettono lo store in `spento` finché non si rientra;
  senza risposta non compare **nemmeno il campanello**. L'app può uscire prima della funzione senza mostrare niente di rotto, e non martella una funzione che non c'è.
- **Il campanello** (`Campanello.tsx`) sta nella testata della Home, accanto a «Profilo», con il numero delle non lette (9+ oltre le nove) e porta al centro. È l'unico ingresso fisso:
  nella barra delle schede non c'è una voce, e aggiungerla è una scelta del club (come per lo Shop). **Nella testata c'è poco posto**: campanello e «Profilo» non si restringono mai e **a cedere è la data**
  (va a capo su due righe; si toglie sotto i 350 pt, dove non resterebbe leggibile): senza questo, a 360 pt «Profilo» usciva dalla carta.
  **Più in vista dal 25/10/2026** (richiesta di Maurizio, vedi «Più in vista» qui sotto): 40 punti e non 32; con notifiche da leggere diventa arancio pieno, col numero in un pallino bianco e l'anello
  che pulsa (`Richiamo`: tre raffiche e poi sta fermo, niente con «riduci movimento»). **Sotto i 400 pt la pillola «Profilo» tiene solo l'icona e la freccia** (tutta la testata porta comunque al Profilo): col campanello
  più grande la data si spezzava a metà parola nei giorni dal nome lungo («MERCOLEDÌ 30 SETTEMBRE»), e **a 340-375 pt si spezzava già prima** (misurato con il campanello da 32).
- **Il centro notifiche** (`Centro.tsx`, `/notifiche`): l'elenco dalla più recente, con il pallino sulle non lette, «oggi 10:30» / «ieri» / «12 ott» all'ora di Roma, e «Per <nome>» sulle notifiche
  rivolte a un figlio del nucleo. **Si apre una notifica toccandola**: da lì è `aperta` (dal centro) e il pallino si spegne; il pulsante è `azione`. «Togli dall'elenco» la nasconde a chi la tocca
  (`nascosta`: non cambia quello che il club vede dell'apertura). **«Segna tutte come lette» toglie i pallini e non conta come apertura**: il club vuole sapere chi l'ha letta davvero, non chi
  ha fatto pulizia. Il tocco su una push porta a `/notifiche?apri=<id della notifica>` e la apre subito, una volta sola (l'id è quello della notifica, lo stesso per tutto il nucleo, non quello
  della riga della singola persona).
- **La push** (`push.ts`, `AttivaPush.tsx`, in cima al centro): **solo sul web**, dove l'app è una PWA con il suo service worker; sul telefono nativo non c'è (servirebbero `expo-notifications` e una build
  nuova), e centro e finestra funzionano uguale. **Si attiva solo con un tocco della persona** (il browser chiede il permesso solo così) e il permesso è del dispositivo. Gli stati: nessuna carta se il
  browser non le sa fare o il club non le ha ancora attivate sul server (`disponibile: false`: manca la chiave pubblica nel segreto della funzione); un avviso su **iPhone e iPad**, dove le push esistono solo
  per l'app aggiunta alla schermata Home («Condividi», poi «Aggiungi alla schermata Home»); un avviso se la persona ha **negato** il permesso al browser (si cambia dalle impostazioni del browser, non da qui);
  «Attiva le notifiche: te lo consigliamo» / «Notifiche attive: sei sempre aggiornato», con «Spegni su questo dispositivo». **Dal 22/10/2026 (richiesta di Maurizio) l'invito
  spinge ad attivarle**, quasi come un requisito: novità, iniziative, eventi e comunicazioni del club arrivano subito, «senza rischi di perderti qualcosa»; attive, «Bene! Così resti
  aggiornato su tutte le nostre novità…». Non si dice più «il club ti scrive solo per cose che ti riguardano». **Attivarle di default non si può**: il browser accende la push
  solo dopo un tocco e il «Consenti» della persona. Ogni notifica arriva comunque anche nell'app, e quelle di marketing solo a chi ha il consenso della newsletter (lo decide il
  database, non questo testo).
- **Più in vista: carta delle non lette, invito alle push in Home e nella finestra** (25/10/2026, richiesta di Maurizio: «rendi più visibile la sezione notifiche e promuovi di più l'attivazione delle push»).
  Prima il centro si apriva solo dal campanello, nell'angolo della testata, e l'invito a attivare la push stava solo dentro il centro: chi non lo toccava non sapeva né che il club gli avesse scritto né che poteva
  ricevere le push. Tre cose, tutte in `src/features/lab/home/` e `notifiche/`:
  - **`CartaNotifiche`** («Hai N notifiche da leggere»): carta **arancio pieno**, la sola della Home di quel colore, subito sotto l'avviso del certificato e prima del messaggio di benvenuto; porta a `/notifiche`.
    **C'è solo quando ci sono non lette** e sparisce da sola a zero: una carta fissa «nessuna notifica» sarebbe rumore. Il numero è quello del campanello (`useNotifiche().nonLette`).
  - **`CartaPush`** («Non perderti le novità del club» + «Attiva le notifiche» + «Non ora»): sotto il messaggio di benvenuto. **Quando compare lo decide `invitoPush` (`notifiche/invitoPush.ts`, puro)**: push **spenta**
    (un tocco di questa carta fa partire `attiva()`, che è dove il browser vuole il permesso) o **bloccata dal browser** (solo il testo che dice di consentirle dalle impostazioni, senza pulsante di attivazione).
    **Mai** dove è già attiva, dove il browser non le sa fare o l'app è nativa, dove il club non le ha attivate sul server, **su iPhone senza app installata** (c'è già «Installa l'app», che dal 25/10 dice anche che è l'unico
    modo di ricevere le notifiche: due carte per la stessa cosa una sull'altra sarebbero troppo) e **in vista cliente**. **Il giro delle push parte solo per chi può avere le notifiche** (`useNotifiche().attivo`): per gli altri non
    parte nemmeno la lettura dello stato dal server. Dopo il tocco la carta dice «Notifiche attivate» per sei secondi (`useAppenaAttivate`, solo per chi è passato da spento ad attivo: chi le aveva già non legge niente).
  - **Nella finestra** (`FinestraNotifica`, `OffertaPush`): con la push spenta, sotto il testo, «Vuoi riceverle anche con l'app chiusa?» e «Attiva». È il momento giusto: la persona ha appena visto una notifica del club arrivare.
  - **«Non ora» rimanda di tre giorni** (`GIORNI_RIMANDO`, chiave `athlon:push-dopo` nel `localStorage`, che se manca non solleva: l'invito torna a ogni apertura) e vale per **tutti e due i posti**. Non per sempre: una carta che non si
    può togliere è una carta che si impara a non guardare, una che torna dopo qualche giorno è un invito. **Il rimando è del dispositivo e si azzera uscendo dall'app** (`azzeraRimandoPush` in `esciDalLaboratorio`): su un dispositivo
    condiviso chi entra dopo non eredita il «non ora» di chi c'era.
  - **Le istanze di `usePush` si avvisano a vicenda** (carta in Home, offerta nella finestra, carta del centro): attivata o spenta da una, le altre rileggono lo stato, o la carta in Home direbbe «Attiva» a chi ha appena
    attivato dalla finestra.
  - **Attivarla «di default» resta impossibile** (il browser la accende solo dopo un tocco e il «Consenti» della persona): l'invito è quanto si può fare. Le notifiche di marketing restano per chi ha il consenso della newsletter.
  - **Non è stato toccato**: il centro (`Centro.tsx`, e la sua carta `AttivaPush`), il tracciamento (`segna`), il giro ogni venti secondi, il service worker, la barra delle schede (una voce in più è una scelta del club).
- **Un dispositivo segue il nucleo e chi esce lo toglie.** Il server associa l'indirizzo push al titolare e ai figli (una notifica per un figlio arriva sul telefono del genitore, con «Per Giulia»);
  **uscendo dall'app** (`esciDalLaboratorio`) il dispositivo si toglie dal club e dal browser **prima** di chiudere la sessione (il server vuole sapere chi è), senza far aspettare più di quattro secondi
  chi esce: su un dispositivo condiviso le notifiche di una persona non devono passare a chi entra dopo. Chi attiva le notifiche sullo stesso browser dopo un altro se lo porta via.
- **Il service worker** (`public/sw.js`, in fondo): `push` mostra sempre un avviso (i browser lo vogliono: una push senza avviso fa revocare la sottoscrizione, su iPhone al secondo tentativo),
  segnala **«ricevuta»** al club con i gettoni della push (anche con l'app chiusa) e, se l'app è aperta, le dice di rileggere. `notificationclick` segnala **«aperta»** e porta al centro (riusa una finestra
  già aperta dell'app). **Il service worker non ha la sessione della persona**: segnala con i gettoni che stanno nella push cifrata, a un solo indirizzo (`indirizzoPing`: la funzione del club su
  `supabase.co`, qualunque cosa dica la push) e con una richiesta «semplice» (nessuna intestazione di contenuto, quindi niente richiesta preliminare). Porta **solo indirizzi dell'app stessa**: quello che
  dice la push non porta fuori. La versione della cache (`VERSIONE`) **non è cambiata**: la parte nuova non tocca le pagine né i file statici.
- **Il pulsante porta dove l'app conosce** (`DESTINAZIONI` in `api/notifiche.ts`: `home`, `calendario`, `abbonamenti`, `pagamenti`, `certificato`, `profilo`, `allenamento`, `shop`, `club-life`,
  `personal`, `tv`; **lo stesso elenco di `app_notifica_destinazioni()` nel database e di `lib/notificheApp.ts` del CRM**: chi ne aggiunge una la aggiunge nei tre posti). Una schermata che l'app non
  conosce non è un pulsante (la notifica si legge e basta), e un link che non è di athlonroma.it viene scartato. Un link del sito si apre nella schermata dell'app che lo mostra (una news, un evento) se
  Club Life è già stato letto, altrimenti nel browser, come ogni link di Club Life.
- **In vista cliente non c'è niente**: la funzione risponde 403 a tutto (non è fra le letture), il giro non gira, il campanello non compare e il centro dice che le notifiche sono del socio e che
  guardarle le segnerebbe come viste (si trovano nella sua scheda, dal pannello). `scollegaDispositivo` non scrive niente.
- **Solo in memoria**, come ogni dato del laboratorio: niente delle notifiche sta sul disco dell'app, e uscendo non resta nulla di chi c'era (`azzeraNotifiche`). Il browser conserva solo la sottoscrizione push
  di questo dispositivo, che il club toglie all'uscita.
- **L'informativa privacy del club non dice ancora** che l'app manda notifiche e che il club vede se sono state ricevute, viste e aperte da ogni persona: **va fatta rileggere al consulente privacy prima di aprire
  le notifiche a tutti**. Le notifiche di marketing partono solo con il consenso della newsletter (lo controlla il database), ma il tracciamento riguarda anche quelle di servizio.

Per verificare: `npx tsc --noEmit` pulito. **Provato in un browser vero** (Chromium, bundle web esportato, Supabase simulato con `page.route`, 360, 390, 430 e 1280 px, chiaro e scuro, anche con «riduci movimento»): la
finestra che compare dopo l'avvio e mai sopra; `vista` una volta sola; il pulsante (`azione` e navigazione al calendario); «Ok, letto» (`aperta`); la X che lascia solo `vista` e la notifica non letta nel centro;
il centro con le tre voci e «Per Giulia»; il dettaglio e il suo pulsante; «Togli dall'elenco»; «Segna tutte come lette» che chiama `leggi_tutte` e non segna nessuna apertura; `?apri=` con l'id della notifica; elenco vuoto;
nessun comando per la push senza la chiave sul server; 403 e 404 che fermano il giro; il giro ogni venti secondi (con l'orologio finto); nessuno scorrimento orizzontale; il campanello della Home che porta al centro.
**Non provato**: una push su un telefono vero, Android o iPhone con l'app installata (**la sottoscrizione, il service worker che segnala ricevuta e apertura, il tocco sull'avviso e il suo segnale al server non
sono mai stati visti girare**), il permesso del browser (`Notification.requestPermission` non si simula), l'app nativa, le finestre con la funzione vera e una sessione vera, e il carico dei venti secondi.
**«Più in vista» (25/10/2026), provato**: `invitoPush` con `npx tsx` (stati, rimando di tre giorni con l'estremo, valore sporco, memoria del browser assente; **per mutazione**, sette modifiche del codice tutte rilevate) e
`tsc` pulito; **in Chromium** (bundle web esportato con `EXPO_PUBLIC_SUPABASE_URL` locale, backend finto con `page.route`, 48 controlli): push spenta con la carta e il tocco che iscrive (`push_iscrivi` con endpoint, `p256dh` e
`auth`) e «Notifiche attivate» che poi sparisce; «Non ora» (tre giorni esatti, resta dopo il ricaricamento, torna a rimando scaduto); tre non lette (campanello arancio da 40 punti, carta, il tocco porta a `/notifiche`), una sola
(singolare), push attiva (nessun invito), bloccata (nessun pulsante), non disponibile sul server, iPhone senza app (nessuna carta, la frase su «Installa l'app»), la finestra con l'offerta (e senza, con il rimando; attivata da lì la carta in Home dietro si aggiorna),
inglese a 1280 pt, «riduci movimento», **vista cliente senza nessuna chiamata a `portale-lab-notifiche`**, e la data della testata a 340-430 pt con la domenica e col mercoledì di settembre, il caso peggiore. **La push del browser è
finta** (`PushManager.subscribe` sostituito): in Chromium headless parlerebbe con un servizio push vero. **Non provato**: un telefono vero (iPhone, dove l'invito sta in «Installa l'app»), l'app nativa (lì le push non ci sono e
la carta non compare), e **che un invito più in vista faccia attivare più push**: il numero dei dispositivi iscritti (`app_push_dispositivi`) prima e dopo il rilascio è la misura.

**Stato (20/10/2026): in produzione.** Il lato server (tabelle, funzioni SQL, permesso `notifiche-app`, `portale-lab-notifiche`, `newsletter-invio` v40) e il CRM (APP-ATHLON #385) erano già su, e
questa app è su `main` dal 20/10/2026, **dopo** `app_notifica_push_esito` (la funzione con cui la push registra l'esito per dispositivo e toglie quelli scaduti: creata a mano dall'editor SQL di Supabase, perché lo
strumento MCP va in timeout per il `delete` nel corpo; vedi APP-ATHLON, «Stato»). **Nessuna notifica è ancora stata mandata.** **Le chiavi VAPID non sono verificabili da qui** (`NOTIFICHE_VAPID_PUBLIC_KEY` nella funzione;
`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT` su Vercel): senza chiave l'app non offre il comando della push e le notifiche restano nell'app. Prima di aprire a tutti: una newsletter «Invia
prova» con un campo dinamico, una notifica vera su un telefono e l'informativa privacy aggiornata.

