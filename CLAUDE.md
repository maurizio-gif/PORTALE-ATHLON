## I dati dell'app arrivano da Supabase, non da PerfectGym

**L'app non parla mai con PerfectGym.** Chiama le Edge Function `portale-*` di Supabase (`src/api/lab.ts`
e gli altri file di `src/api/`), che leggono dal mirror: PerfectGym si sincronizza nello schema `perfectgym`
del database e le funzioni leggono da lì. Una schermata che mostra un dato nuovo ha quindi bisogno di una
**azione nuova in una funzione esistente** (o di una funzione SQL nuova che la funzione legge), mai di una
chiamata diretta al gestionale. Esempio: la sezione Prodotti usa l'azione `prodotti` di
`portale-lab-pagamenti`, che chiama `prodotti_di` sul database.

- **La stessa funzione serve il CRM e l'app.** I conti di una persona (abbonamenti, prodotti, prenotazioni,
  pagamenti) li calcola una funzione SQL sola, e il CRM e l'app la leggono entrambi: se divergono, è un
  difetto. Le funzioni e la regola completa stanno nel `CLAUDE.md` di APP-ATHLON.
- **Scrivere è un'altra cosa.** Prenotare, disdire, pagare passano da una Edge Function che chiama PerfectGym:
  è l'unico caso in cui il portale lo tocca, e dopo la scrittura la funzione rilegge da PerfectGym per
  confermare, perché il mirror arriva con qualche secondo di ritardo.
- **Dopo una scrittura la schermata si aggiorna dalla risposta della funzione** o con una nuova lettura
  dopo qualche secondo, non si aspetta che il mirror sia già allineato.
- **Quello che PerfectGym non dice** (da quale dispositivo si è prenotato, per esempio) lo registra la
  nostra funzione nel suo log; la schermata non lo deduce.

## La foto del profilo si mostra nel Profilo, e solo lì

L'anagrafica che `portale-lab-anagrafica` restituisce porta `foto`: il link firmato (un'ora) della foto che il
club ha su PerfectGym, copiata nel bucket privato `foto-soci`, o `null`. È la **foto del titolare**, presa dal
token della sessione, e si mostra **solo nella sezione Profilo** (richiesta del club, 17/10/2026): non nella
Home, non in Famiglia, non nel Calendario. Il perché e il resto della pipeline stanno nel `CLAUDE.md` di
APP-ATHLON.

- **Sta dentro l'anagrafica, e non in una chiamata a parte**, perché `salva` e `conferma_email` rispondono con
  la stessa anagrafica e la schermata la sostituisce a quella che ha: se la foto vivesse altrove, cambiare il
  telefono la farebbe sparire.
- **Senza foto, o con il link scaduto o la rete andata, la sezione è quella di prima**: niente segnaposto e
  niente riquadro vuoto (`FotoProfilo` non rende nemmeno l'involucro). Un link nuovo, a ogni apertura del
  Profilo, è un'altra possibilità.

## I video e i poster degli esercizi arrivano da un bucket privato, già firmati

La libreria degli esercizi è **MoveKit**: 582 esercizi, ognuno con un video (MP4, muto, in loop) e un poster,
comprata dal club con una licenza che non permette di esporre gli indirizzi dei file (§3, movekit.com/license).
I file stanno nel bucket **privato** `esercizi-movekit` di Supabase e `portale-lab-schede` li dà come **link
firmati** (quattro ore) dentro le sue risposte: `immagini` e `video` di un esercizio sono indirizzi interi, già
pronti. Niente di tutto questo si ricostruisce nell'app.

- **L'app non costruisce mai un indirizzo per i file di MoveKit.** `urlEsercizio` lascia com'è un indirizzo
  intero e dà `null` a un percorso `movekit/…` (la firma non è riuscita: si mostra il segnaposto, non un link
  pubblico che non aprirebbe niente). I percorsi senza prefisso sono nel bucket pubblico `esercizi`: i video che
  il club carica dal CRM per i suoi esercizi.
- **Il poster è `immagini[0]`** e sta sotto il video (`MediaEsercizio`): si vede mentre il video si carica e
  nelle miniature ferme. I frame grandi sono 16:9, come i video: in 4:3 con `cover` si tagliano le figure
  orizzontali (plank, nuoto).
- **`public/esercizi-new` non va né committata né deployata**: sono i 5 GB originali, `public/` finisce nel build
  web e la licenza non permette di pubblicarli. Sta in `.gitignore`; sul disco di chi li ha comprati.
- **I testi** (nome, descrizione, istruzioni, errori comuni) sono nella tabella `esercizi`, in italiano, con
  l'originale inglese accanto. Come si importano, si ricomprimono e si abbinano ai vecchi esercizi: `CLAUDE.md`
  di APP-ATHLON e `docs/piano-schede.md`.

## Il certificato medico si carica dall'app, e resta «in verifica» finché la segreteria non lo guarda

Dove il certificato manca, è scaduto o sta per scadere, la sezione **Certificato** della Home propone di caricarlo
(richiesta del club, 17/10/2026): un foglio spiega **quale** certificato serve — idoneità all'attività sportiva non
agonistica, con l'ECG e la sua data, e chi può redigerlo (`src/lib/certificatoIstruzioni.ts`, lo stesso testo delle
email del CRM) — e fa scegliere una foto o un PDF. Lo stesso caricamento esiste su `/r/<token>`, la pagina che apre il
link che il CRM manda per email (`src/features/certificato/CaricaDaLink.tsx`).

- **L'app non parla con PerfectGym e non scrive nessun certificato.** Il file va a `portale-lab-certificati` (azione
  `carica`, con il `member_id` della persona del nucleo), che lo mette nel bucket privato `certificati-medici` e manda
  il file al desk. Le date le scrive la segreteria dal CRM, approvando: da lì sono su PerfectGym e nel mirror.
- **Lo stato arriva nell'area** (`certificati[].caricamento` di `portale_la_mia_area`): `in_verifica` mostra «Lo stiamo
  controllando» e toglie il comando di caricamento; `rifiutato` mostra il motivo scritto dalla segreteria, **rimette la
  situazione di prima** (scaduto da N giorni, mai consegnato, in scadenza: il rifiuto non la nasconde dietro una parola sola)
  e lo rimette in «Da fare», con il comando per caricarne uno nuovo. **Un certificato valido non si copre mai con «in verifica»**: lo stato di verifica prevale solo dove il
  certificato è da consegnare o in allarme (`statoCertificato` in `certificato.tsx`).
- **Un file solo, jpg, png o pdf, fino a 8 MB.** Il tipo lo decide il server dai primi byte; sul web una foto troppo
  grande si riduce prima dell'invio (`src/lib/fileCertificato.ts`). Il selettore è `expo-document-picker`: su iOS e
  Android serve una nuova build.
- **Nella «vista cliente» dello staff non si carica**: la funzione non è fra le letture, quindi è bloccata, e il
  comando non compare.
- **Il link per email vale 30 giorni** e porta una persona sola; scaduto, la pagina lo dice (`Stati.tsx`) e chiede di
  farsene mandare uno nuovo.

## Le calorie di una lezione: il tipo dà la forbice, non c'è un MET per lezione (prova)

Nel calendario, una lezione di gruppo porta una stima delle calorie (`schede/CalorieLezione.tsx`, il calcolo in
`schede/stimaCorso.ts`): una riga sotto i posti, sotto il turno scelto del Nuoto Libero e un riquadro nella scheda della
lezione (`FoglioLezione`, prop `extra`). Il conto è quello delle schede (`stimaCalorie.ts`: BMR / 1440 × MET × minuti, i
minuti veri della lezione, `fine − inizio`); cambia come si sceglie il MET.

- **Si capisce che tipo di lezione è**, e il tipo dà una forbice di MET: dal nome del tipo su PerfectGym, poi dal testo
  della scheda del sito, poi dalle sole barre. Dentro il tipo scorre l'intensità delle barre (65% cardiovascolare, 35%
  muscolare). Una lezione nuova entra da sola; se non si capisce niente si tace.
- **Scuola Nuoto Adulti**: il livello è nel nome del tipo (`Nuoto Adulti - Base/Intermedio/Avanzato`) e il consumo cresce
  con lui. **Nuoto Libero**: un consumo *indicativo*, con la forbice più larga. Le schede di nuoto (per calcolare anche
  quelle) non ci sono ancora.
- **Non si stima**: la Gym Floor (ha la stima della sua scheda), l'Aqua Gestanti, i corsi e gli eventi dei bambini.
- **Solo al titolare e solo se maggiorenne**: peso, altezza ed età sono i suoi, e dal calendario si sceglie anche un altro del
  nucleo (`titolare` arriva da `persone`).
- **Servono tutti e quattro i dati**: peso, altezza, età e sesso. Senza il sesso non si stima (nelle schede vale il valore di
  mezzo, qui no): nella scheda della lezione si dice cosa manca, nella riga niente.
- **Le fonti dei MET** sono il Compendium of Physical Activities (Ainsworth 2011; aggiornamento 2024, pacompendium.com), e le
  forbici sono tarate sui suoi valori (elencati in `stimaCorso.ts`). Non verificati alla fonte: boxing (da pagine che
  riportano il Compendium), e senza voce nel Compendium la danza di gruppo, la bicicletta in acqua e i MET per livello del
  corso di nuoto, che sono stime nostre da far validare col Direttore Tecnico. Il Compendium non era raggiungibile
  dall'ambiente in cui è stato scritto: i valori vengono dalle pagine che lo riportano.
- **Scuola Nuoto Adulti, i Master Class (`… (M)`, `Workshop Hatha Yoga`) e l'Aqua Gestanti non hanno scheda sul sito**: niente
  finestra della lezione, quindi la stima sta solo nella riga. Un alias nel sito e in `chiaveScheda` darebbe loro anche foto e
  finestra; non è stato fatto.
- **Una spiegazione che mescola testo e un elemento si scrive in JSX, mai in un template**: `${<Text/>}` diventa
  «[object Object]» e `tsc` non lo vede. Si è visto solo rendendo la schermata.

## Il contatore delle calorie conta solo quello che si sa

`/allenamento/calorie` (`schede/ContatoreCalorie.tsx`, il conto in `schede/contatoreCalorie.ts`) somma le calorie del
titolare giorno per giorno: due anelli in cima (la settimana rispetto alla settimana migliore, oggi rispetto a un giorno
medio), i sette giorni, le ultime 12 settimane, il confronto e da dove vengono. Si entra dalla carta «Le tue calorie» nell'area
Train dell'Athlon Health System.

- **Due fonti, e nessun'altra.** Le sedute delle schede chiuse nell'app (durata vera fra 10 minuti e 3 ore, il consumo
  della scheda al MET di mezzo col dopo-allenamento) e le lezioni a cui la reception ha segnato la presenza (azione
  `presenze` di `portale-lab-calendario`, che legge `prenotazioni_di`: la stessa presenza della scheda del CRM). Una
  lezione si stima come nel calendario (`stimaLezione`, con la sua scheda), quindi il numero è quello che il socio ha visto.
- **La Gym Floor non conta come presenza**: in sala vale la seduta della scheda, e contarle tutte e due conterebbe due
  volte la stessa ora. Chi si allena in sala senza chiudere la seduta nell'app lì non compare.
- **Il giorno è quello di Roma e la settimana parte dal lunedì.** Il confronto con la settimana scorsa è alla pari: fino
  allo stesso giorno della settimana.
- **Servono gli stessi quattro dati delle lezioni** (`useStatoCorpo` di `CalorieLezione.tsx`); senza, la schermata dice
  cosa manca. Se la lettura delle presenze non riesce si contano le schede, e lo si dice.
- **Le animazioni che arrivano a un valore** (anelli, numeri, barre, linea, ciambella) seguono `useProgresso`, con
  requestAnimationFrame e semplici props dell'SVG, per non dipendere dalle proprietà animate di Reanimated sull'SVG, che sul
  web non sono state provate; **partono quando la sezione entra nello schermo** (`useVisibile`), o sotto la piega sarebbero già finite.
  Con «riduci movimento» vanno subito al valore finale e niente gira in loop.

## L'alimentazione è educazione alimentare, e si apre solo col consenso

`/allenamento/alimentazione` (cartella `src/features/lab/alimentazione/`, area Food dell'Athlon Health System): il diario
dei pasti, la foto del piatto che diventa una stima delle calorie, il bilancio con quello che si consuma e i consigli
(richiesta del club, 19/10/2026). Il club **non ha un nutrizionista**: niente diete, niente obiettivi di calorie da
raggiungere, nessuna frase che dica a una persona quanto deve mangiare.

- **Bloccata finché il socio non accetta l'informativa nell'app** (`Vetrina.tsx`, testo in `informativa.ts`). Diario,
  questionario e foto sono dati sulla salute (art. 9 GDPR): la funzione `portale-lab-alimentazione` rifiuta ogni azione
  senza un consenso vivo alla versione corrente. **Cambiando il testo si cambia `VERSIONE_INFORMATIVA` qui e nella
  funzione**: la sezione si richiude e il socio la riaccetta. La revoca, in fondo alla sezione, cancella tutto subito.
  L'informativa va fatta rileggere al consulente privacy del club prima di aprire la sezione a tutti.
- **Solo il socio la vede.** Nella vista cliente dello staff non si apre (la funzione non ha azioni fra le LETTURE), e
  il CRM non legge le sue tabelle. Solo per i maggiorenni.
- **I numeri li calcola il server**: dal catalogo (`alimenti`, 147 alimenti, valori medi per 100 g) per i grammi scelti.
  La foto passa dal workflow n8n `athlon-foto-piatto` (Claude via OpenRouter, con l'elenco del catalogo): riconosce gli
  alimenti e stima i grammi con una forbice, e **niente entra nel diario senza conferma** (`FotoPiatto.tsx`). La foto non
  si salva: né l'app, né la funzione, né n8n (il workflow non conserva le esecuzioni).
- **Il consumo è quello del contatore** (`consumoDelGiorno` in `conti.ts`): riposo × 1,2 più l'attività contata, al netto
  del riposo in quei minuti. I nutrienti si confrontano coi riferimenti LARN 2014 (carboidrati 45–60%, grassi 20–35%,
  proteine 0,9 g/kg; 1,2–2 per chi si allena, ACSM 2016), mostrati come riferimenti e non come traguardi.
- **I consigli li sceglie l'app da un elenco scritto** (`consigli.ts`), non un modello: questionario, attività del
  contatore e media dei giorni scritti. Con un sì a gravidanza o a una condizione medica resta solo l'invito al medico;
  chi dice che contare lo mette a disagio ha calorie e grammi nascosti (si riaccendono). I numeri delle fonti (CREA 2018,
  LARN 2014, ACSM 2016, OMS) sono ricordati, non riletti alla fonte: vanno ricontrollati.
- **La foto si sceglie con `expo-document-picker`** (`src/lib/fotoPiatto.ts`), che sul telefono dal browser offre anche la
  fotocamera; sul web si porta a 1280 px in JPEG prima dell'invio.

## I piani di allenamento: si parte da quattro origini, si modifica e si conferma, e restano suoi

Nell'app si chiamano **piani di allenamento** (richiesta del club, 19/10/2026): nei testi mai «schede» per questi. Resta «scheda» dove
vuol dire altro (la scheda del socio al club, la scheda di una lezione, l'Help Desk), e nel codice (`/allenamento/[scheda]`,
`SchedaLab`, `salva_mia`…). Cartella `src/features/lab/schede/`; funzione, tabelle e limiti sono nel `CLAUDE.md` di APP-ATHLON.

- **La schermata Train (`Schede.tsx`) ha le origini sopra e «I tuoi piani» in fondo.** Dopo il test e le calorie: «Crea il tuo piano di
  allenamento» con le quattro origini, poi **«I tuoi piani»** (quelli che il socio ha scelto: suoi, del suo trainer, e gli «AI» di prima), poi gli
  ultimi allenamenti. Le origini: **«Crealo con l'aiuto dell'AI»** (`Agente.tsx`), **«Importa il tuo piano»** (`Importa.tsx`: «Da foto o
  file», e «Scrivilo tu» per chi parte da zero) e **i piani consigliati dal club**, in un **carosello che scorre in orizzontale** (`PianoClub`,
  non una lista verticale: con dieci piani non allunga la pagina), filtrabile per obiettivo. Su telefono la carta è larga il 74% dello
  schermo, così si intravede la successiva e si capisce che scorre; su schermo largo compare la barra di scorrimento. **La quarta origine è il personal trainer** (`CartaPersonal`, dopo i piani del club):
  «Vuoi essere seguito da un personal trainer?» porta **direttamente alla prenotazione** (`/personal`, l'altra faccia di Prenotazioni:
  scegli trainer, giorno e ora). Non produce un piano da modificare: lo costruisce il trainer, e compare poi fra i piani «Dal tuo trainer».
- **Qualunque sia l'origine, si modifica e si conferma, e solo allora è fra i suoi piani.** Un piano del club si apre (`Scheda.tsx`) con
  **«Aggiungi ai tuoi piani»** (la copia com'è, `comeDaSalvare` in `copia.ts`) e **«Modifica e aggiungi»** (l'editor con `?copia=<id>`); quello
  di un trainer (o un «AI» di prima) solo **«Modifica una copia»**, perché è già suo. L'originale non si tocca. Un piano del club si può ancora
  **iniziare direttamente** senza copiarlo: non si è tolto quello che c'era. L'agente AI e l'importazione rispondono con una **bozza**
  (`bozza.ts`, in memoria, mai sul disco, con la sua `origine`) che passa all'editor (`?da=bozza`), dove si guarda, si cambia e si conferma.
- **L'editor è uno solo per cinque modi** (`EditorScheda.tsx`, `modo`): nuovo, modifica di un piano suo (`?id=`), copia (`?copia=`), bozza
  letta da un file e bozza dell'agente. Cambiano titolo, sottotitolo, avvisi e il tasto («Salva il piano» / «Salva le modifiche» / «Conferma
  e aggiungi ai tuoi piani»). L'`origine` si manda solo alla nascita (`creata`, `importata`, `ai`, `club`): in modifica non si cambia. Le
  validazioni (titolo, giorni vuoti, percentuale 20-100) sono qui e **anche nella funzione**.
- **Le percentuali del massimale restano nella copia.** Un piano del club scrive i carichi in % del massimale (e l'agente pure): l'editor
  le porta con sé (campo «% del massimale» per esercizio, vuoto = vale il carico a parole) e nell'app diventano i chili del socio dopo
  il test. Anche `obiettivo` e `livello` si copiano. Se un esercizio del club è stato spento dopo, la conferma risponde che non è più in
  libreria: il socio lo cambia con «Cambia esercizio».
- **Gli esercizi si scelgono dalla libreria del club** (`SceltaEsercizio.tsx`, senza video né poster: sono seicento, e la lista si ricorda
  sotto `schede:libreria`) **oppure si scrive il nome**: diventa un esercizio suo, senza video. In un esercizio letto da un file che non è in
  libreria resta «Hai scritto: …» e il segno «Da controllare».
- **Da dove viene si dice sulla carta** (`etichettaPiano` in `comune.ts`): «Scritto da te», «Importato da te», «Creato con l'AI», «Dal club,
  tuo», «Dal tuo trainer». Il piano consigliato dal club si legge «Consigliato dal club».
- **I trainer del club vedono i piani dei soci dal CRM, in sola lettura** (richiesta del club: chi porta un piano suo va verificato), e l'app
  lo dice al socio in tre punti: nel piano, in fondo all'editor e sotto l'avvertenza dell'importazione (più l'avviso dell'agente). Se cambia,
  cambiano tutti. Togliere un piano lo ritira e chiede conferma; le sedute fatte restano.
- **L'importazione non salva mai da sola.** `Importa.tsx` manda il file a `importaScheda`: ci vogliono una decina di secondi, a volte un
  minuto (la schermata d'attesa lo dice), e chi esce nel frattempo non si ritrova nell'editor (`qui`). **Il file** (`fileScheda.ts`): foto
  JPG, PNG o WebP e PDF, fino a 4 MB; sul web una foto si porta a 1800 px in JPEG (300–600 kB, meno attesa). «Scatta una foto» apre la
  fotocamera posteriore del telefono dal browser (`capture`); **nell'app nativa non c'è la fotocamera diretta** (serve `expo-image-picker`
  e una nuova build).
- **L'agente AI** (`Agente.tsx`) fa le sue sei domande e **non salva più un piano da solo**: torna una bozza (`origine: 'ai'`), con
  l'avviso «Scritto da un'intelligenza artificiale». La quota (tre in trenta giorni) la dice `elenco`.
- **L'avvertenza è parte del comando**: la foto o il PDF vengono letti da un servizio di intelligenza artificiale, non si conservano,
  meglio non includere dati che non servono, e una lettura automatica può sbagliare. Se il testo cambia, va riletto con quello
  dell'informativa privacy del club.
- **Nella vista cliente dello staff i comandi falliscono** (le azioni nuove non stanno fra le letture): come per ogni altra scrittura.

## Athlon Health System: la ruota, il Balance, Train e Food

La scheda che era **Workout** (poi «Fit») si chiama **Athlon Health System** (richiesta del club, 19/10/2026):
l'allenamento, l'alimentazione e il recupero dell'adulto in un posto solo. Nel codice la cartella resta `fit/`. L'indirizzo resta `/allenamento` (è quello dei link già dati); l'area scelta sta in
`?area=food`, così tornando dal diario si ritrova Food. Nomi in inglese di proposito, il resto in italiano.

- **Sotto il titolo la ruota** (`fit/Ruota.tsx`): tre frecce che si rincorrono, Train → Food → Relax, e girano piano
  (un giro in 24 s). Le etichette seguono la loro freccia ma restano diritte; la rotazione è una trasformazione della
  View, non una proprietà animata dell'SVG. Con «riduci movimento» è ferma.
- **Poi «Il tuo corpo»** (`fit/Corpo.tsx`, dettaglio in `/allenamento/misure`): peso con la variazione degli ultimi 90
  giorni, BMI con la fascia, massa grassa (o la vita). Sta in alto e non in Train perché non è del solo allenamento: è il
  punto di partenza (stima le calorie) e la verifica dell'equilibrio. Le misure di composizione corporea che arriveranno
  (una bilancia BIA, per esempio) si aggiungono qui. **La fascia del BMI non usa i nomi dell'OMS** (`fasciaBmi` in
  `lab/dati/calcoli.ts`): su richiesta del club niente «Sottopeso», «Sovrappeso» o «Obesità» davanti al socio, ma
  *Leggero · Equilibrio · Un po’ sopra · Da bilanciare* (le soglie sono quelle di sempre: 18,5 · 25 · 30). Le parole stanno
  in una casella da una riga e sotto i 72 pt (11,5 pt SemiBold) non si troncano su un telefono da 375 pt.
- **Poi l'introduzione** (`fit/Intro.tsx`): il benessere come equilibrio di allenamento giusto (Train), buona
  alimentazione (Food) e recupero (Relax: sonno e giorni di riposo, senza una sezione sua), cosa fa il Balance e, in un pannello che si apre, come leggere i
  numeri (`ComeLeggere` in `fit/Balance.tsx`, lo stesso testo in fondo alla schermata di Balance).
- **Balance** (`fit/Balance.tsx`, conto in `fit/bilancio.ts`, schermata `/allenamento/balance`): le calorie consumate
  (le stime del contatore: riposo × 1,2 più l'attività contata) accanto a quelle del diario. **Un giorno senza niente nel
  diario non vale zero** ed esce dalle medie; **oggi non è finito** ed esce dalle medie. Sotto 150 kcal di differenza
  media al giorno le due cifre sono «pari»: tutte e due sbagliano del 10–20%. Descrive, non dà traguardi; il peso delle
  misure è la verifica. Senza consenso a Food, o nella vista cliente, mostra solo il consumo; con i numeri nascosti
  resta spento.
- **Train** è il Workout di prima, senza l'alimentazione e senza i dati del corpo. **Food** (`fit/Food.tsx`) è la porta del diario: prima del
  consenso racconta cosa c'è e porta all'informativa; dopo, oggi e i comandi «Il diario» e «Fotografa»
  (`/allenamento/alimentazione?foto=1` apre la foto sul pasto dell'ora).
- **I dati li legge `useFit`** con le chiavi di memoria del diario e del contatore (`alimentazione/chiavi.ts`), e li rilegge
  a ogni ritorno su Fit: un pasto scritto nel diario cambia il Balance appena si torna indietro.

## I dispositivi: Oura e Polar si collegano da Relax, e i dati restano del socio

L'area **Relax** di Athlon Health System (`fit/Relax.tsx`) mostra il recupero con quello che dicono l'anello Oura e gli orologi Polar del socio, e
la schermata `/allenamento/dispositivi` (`dispositivi/Dispositivi.tsx`) li collega e li scollega (19/10/2026). Funzione, tabelle, sicurezza e
lista di cosa controllare con i fornitori: `CLAUDE.md` di APP-ATHLON.

- **Relax compare solo dove i dispositivi sono aperti** (`relaxAperto` in `useDispositivi.ts`): almeno un fornitore disponibile (il club ha
  registrato le sue applicazioni) o un consenso già dato. Altrimenti la terza scheda non c'è, `?area=relax` torna a Train e Fit è quello di
  prima. Nella vista cliente dello staff non si apre e **non si chiama la funzione**.
- **Consenso prima di tutto** (`Vetrina.tsx`, testo in `informativa.ts`): senza, niente si collega. **Cambiando il testo si cambia
  `VERSIONE_INFORMATIVA` qui e nella funzione**: la sezione si richiude e il socio riaccetta. La revoca (in fondo a `Dispositivi.tsx`) scollega
  tutto e cancella i dati. Solo maggiorenni. L'informativa va fatta rileggere al consulente privacy prima di aprire a tutti.
- **Il ritorno dal fornitore arriva su `/allenamento/dispositivi?code=…&state=…`** (è il redirect URI registrato presso Oura e Polar): la
  schermata manda codice e state a `completa` con la sessione del socio e **toglie subito i parametri con `router.setParams`, non con
  `replace`** (un replace rifà la schermata da capo e l'avviso «Oura collegato» andrebbe perso: si è visto nel browser). Se il socio annulla
  il fornitore rimanda `error`: nessuna chiamata, solo un avviso. La pagina aspetta la sessione (`useSessione`) prima di leggere l'indirizzo.
- **Sul web si lascia l'app per il sito del fornitore e si torna** (`window.location.assign`, come per i pagamenti). Nell'app nativa si apre il
  browser (`Linking.openURL`) e il ritorno si completa nel browser, **dove la sessione potrebbe non esserci**: da provare su una build nativa
  prima di offrirlo lì.
- **Descrive, non consiglia.** Niente frasi su cosa fare in base ai numeri, niente obiettivi (gli anelli e le colonne del sonno sono in scala
  0-10 ore, non c'è un «8 ore» da riempire), parole morbide per il recupero (`recupero()` in `comune.ts`: ottimo, buono, discreto, «da
  ricaricare»; mai un allarme) con il numero del fornitore sempre accanto («88 su 100», «4 su 6»), e la nota «valori indicativi del tuo
  dispositivo, non un parere medico». I dati del dispositivo **non entrano nel contatore delle calorie né nel Balance**: un allenamento fatto
  in app e uno registrato dall'orologio rischiano di contare due volte la stessa ora; se il club lo vuole, si decide come evitarlo prima.
- **I dati li legge `useDispositivi`** (memoria `dispositivi:stato` e `dispositivi:dati`, rilettura a ogni ritorno su Fit). Dopo una
  scrittura la schermata si aggiorna dalla risposta (`imposta`), dopo un consenso o una revoca rilegge tutto (`rileggi`, con una lettura
  esplicita: non ci si affida al rinfresco del focus, che qui non ripartiva).

## L'avvio animato: il logo che si costruisce, una volta a ogni apertura

Quando si apre l'app (richiesta del club, 19/10/2026) il pittogramma di Athlon si costruisce da solo (`src/features/lab/avvio/`): le due forme del logo si
disegnano con una punta luminosa, arrivano da lati opposti e si incastrano con un piccolo rimbalzo, il riempimento di fuoco sale e allo scatto si accende
l'alone e parte un anello sottile; poi un riflesso lento attraversa il logo e il logo respira una volta. Dura 3,25 secondi, poi si dissolve nell'app;
**un tocco la salta** (via in un terzo di secondo). **Solo il logo: niente scritte** (né «Athlon Club 4.0» né il motto: erano nella prima versione e il
club le ha tolte) **e niente coriandoli** (scintille, polvere, punti in orbita, lampo bianco): il club vuole un movimento sobrio, e la costruzione del
logo è la parte che gli piace, quindi non si tocca. Un effetto nuovo si chiede al club prima di aggiungerlo.

- **Quando si vede** (`mostra.ts`): una volta per apertura. Sul web vuol dire una volta per scheda del browser (`sessionStorage`: ricaricare la pagina
  non la rifà, riaprire l'app dopo averla chiusa sì); sul telefono, finché il processo è vivo. Si vede anche prima del login (è l'apertura
  dell'app). **Non si vede** nelle pagine pubbliche (`/r/<token>`, `/richiesta`: non stanno nel layout del portale, dove è montata), in vista cliente
  (`?come=`: lo staff non aspetta) e quando l'indirizzo è un ritorno da un altro sito (`?code=`, `state`, `error`: il collegamento di un dispositivo, un
  pagamento). Decidere e segnare è un'operazione sola: un ricaricamento a metà non la rifà.
- **Il fondo scuro prima del codice** sta in `public/index.html` (`data-avvio` su `<html>`): senza, per mezzo secondo si vedrebbe il grigio chiaro della
  pagina prima che il codice giri. **Ripete le regole di `mostra.ts`**: se cambiano in uno, vanno cambiate nell'altro (se qui si sbaglia l'effetto è solo
  un fondo scuro per un istante, mai un avvio che non parte).
- **Tutto è una funzione pura del tempo** (`tempi.ts`): un solo orologio (`requestAnimationFrame`) scrive `t` e ogni elemento si calcola da lì, senza
  stato nascosto. Le forme SVG hanno semplici proprietà e **non sono animate da Reanimated** (sul web non è provato, come per il contatore delle calorie).
  La tabella delle tappe, in millisecondi, sta in testa a `Avvio.tsx`. Misurato in un browser vero (rendering software, quindi il peggio): 17 ms a
  fotogramma di media, 16,8 al 95°; il sipario compare appena il codice gira e se ne va da solo a 3,25 s.
- **Il logo è vettoriale** (`logo.ts`): due poligoni ricavati da `assets/images/pittogramma.png` seguendo il contorno dell'alfa a mezzo pixel e
  semplificandolo (21 e 18 punti, 98,9 % del disegno originale; gli spigoli appena arrotondati si rifanno con `strokeLinejoin="round"`). **Se il logo
  cambia, si rifanno da quel file**, non a mano.
- **«Riduci movimento»**: niente si muove, la scena finita entra e esce in dissolvenza in un secondo e mezzo, e il tocco non serve. Un colpetto
  (`colpetto('ok')`) allo scatto sul telefono, niente sul web. Etichetta per i lettori di schermo: «Athlon. Tocca per continuare.»
- **Non è provato su un telefono vero**, solo nel browser (schermi 360, 390, 430 e 1280 px, anche con «riduci movimento» e tutti i casi in cui non si
  vede). Sul telefono si passa dalla schermata nativa arancione (`expo-splash-screen`) al fondo scuro dell'avvio senza dissolvenza: da guardare, e se
  stona si fa partire l'avvio dallo stesso arancio.
