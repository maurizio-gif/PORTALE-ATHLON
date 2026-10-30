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
- **Il Calendario ha un gemello nel CRM: il Planning** (20/10/2026, funzione `crm-planning` di APP-ATHLON): le stesse lezioni, lo stesso filtro per età, la stessa apertura delle
  prenotazioni e gli stessi limiti per categoria, ma a prenotare (e a disdire, con `CancelSingleBooking` e le regole di PerfectGym per la disdetta in ritardo) è l'operatore, a nome del cliente, e da lì non si incassa. **Non condivide il codice con
  `portale-lab-calendario`** (la funzione dell'app non è stata toccata): se qui cambia la lettura del giorno, il filtro d'età, l'apertura o i limiti, va cambiato anche in
  `_shared/planning-crm.ts` di APP-ATHLON. Il Calendario resta quello che il socio vede: il Planning non cambia niente nell'app.
- **I filtri per attività sono tessere** (20/10/2026, richiesta dei tester: «non si vedono»; proposta B scelta da Maurizio): sotto «Cosa vuoi fare?» ogni attività del giorno ha la sua tessera con icona, nome e numero di lezioni, tutte in vista (niente fila da scorrere). Quella scelta diventa arancione, e toccarla di nuovo toglie il filtro; «Tutte» lo toglie sempre. Icona e colore vengono da `segnoAttivita` in `Calendario.tsx` (dal nome: acqua e nuoto in blu, sala e corsi in arancio, il resto neutro): un'attività nuova del listino prende l'icona del calendario finché non si sceglie. Cambia solo il filtro: lezioni, Gym Floor e Nuoto Libero a griglia, regole sono quelli di prima. `tsc` pulito; **non guardato in un browser né su un telefono**.

## Il tema: sul computer sempre chiaro, sul telefono quello del sistema

Richiesta di Maurizio (20/10/2026). **Su web, da 900 px di larghezza in su, l'app è sempre chiara**, qualunque tema abbia il sistema; sotto i 900 px e nell'app nativa **segue il sistema**
(`useSchemaColori` in `src/lib/schemaColori.ts`: è il solo posto che chiede a React Native il tema, e lo leggono `useColori` in `theme.ts` e `usePalette` in `lab/ui/tema.ts`). I 900 px sono la soglia con cui le
schermate passano alle colonne larghe (`LARGO`, che `components/Pagina.tsx` riesporta): **se cambia, cambia anche in `public/index.html`** (fondo e `theme-color` prima che parta il codice) **e in `public/offline.html`**.
Un tablet di traverso (da 900 px) conta come computer, e **ridimensionare la finestra attraverso i 900 px cambia il tema**. **L'avvio animato resta scuro** (è il suo design, e dura tre secondi), come le fasce scure della
testata e le schede «carbone», che sono scure anche nel tema chiaro. Provato in Chromium (bundle web esportato, pagina d'accesso): computer con sistema scuro e chiaro → fondo `#E4E5EA` in tutti e due i casi; 390 px con sistema scuro → fondo `#050506`, con sistema chiaro → `#E4E5EA`. **Non provato**: le altre schermate e un telefono vero.

## La foto del profilo si mostra nel Profilo e nella testata della Home; dal Profilo e dalla Home si cambia

L'anagrafica che `portale-lab-anagrafica` restituisce porta `foto`: il link firmato (un'ora) della foto che il
club ha su PerfectGym, copiata nel bucket privato `foto-soci`, o `null`. È la **foto del titolare**, presa dal
token della sessione, e nell'app si mostra **in due posti**: la sezione Profilo (richiesta del club, 17/10/2026) e, dal
19/10/2026 (richiesta di Maurizio), **l'avatar della testata scura della Home**, al posto delle iniziali. Non in Famiglia, non
nel Calendario, non nei riquadri né negli elenchi. Il perché e il resto della pipeline stanno nel `CLAUDE.md` di
APP-ATHLON.

- **Sta dentro l'anagrafica, e non in una chiamata a parte**, perché `salva` e `conferma_email` rispondono con
  la stessa anagrafica e la schermata la sostituisce a quella che ha: se la foto vivesse altrove, cambiare il
  telefono la farebbe sparire.
- **Dove la persona non può cambiare la foto, e il link è scaduto o la rete è andata, la sezione è quella di
  prima**: niente segnaposto e niente riquadro vuoto (`FotoProfilo` non rende nemmeno l'involucro). Un link nuovo,
  a ogni apertura del Profilo, è un'altra possibilità.

### Si cambia da qui, e chi non ha una foto è invitato a metterla (20/10/2026)

Cartella `src/features/lab/profilo/`, `src/lib/fotoProfilo.ts` e `src/lib/ritaglio.ts`; la funzione e la scrittura su PerfectGym
sono nel `CLAUDE.md` di APP-ATHLON (`portale-lab-anagrafica`, azione `foto`). **Nell'app la foto sta in due posti soli**
(Profilo e avatar della testata della Home, vedi sotto), più la testata della scheda del CRM: l'invito nel Profilo non la mostra.

- **Chi non ha una foto trova al suo posto un invito** (`FotoProfilo`): un riquadro vuoto nell'arancio del club con la
  fotocamera e un «+», un anello che pulsa piano, «Aggiungi la tua foto» e una riga che dice dove si vedrà («nel tuo
  Profilo, in cima alla Home e sulla tua scheda in segreteria»: i tre posti, e non di più). Chi ce l'ha vede la foto con una fotocamera
  sull'angolo e «Cambia foto». **Un comando c'è solo dove c'è qualcosa da fare**: per chi non può cambiarla è soltanto la foto.
- **Il richiamo è lampeggiante ma discreto** (`profilo/Richiamo.tsx`): un anello che si allarga e svanisce, piccolo e lento
  (1,5 s), nell'arancio del club; **tre anelli di fila, una pausa di 4,5 s, tre raffiche in tutto (una trentina di
  secondi) e poi sta fermo fino alla prossima apertura**. Un'animazione che non finisce mai dopo una settimana non si vede
  più o non si sopporta. **Con «riduci movimento» non c'è l'anello**: l'invito resta nel testo e nel pulsante. Sono due
  posti e un effetto solo per posto: l'anello intorno al riquadro nel Profilo e quello intorno all'avatar della testata della Home
  (sotto); il riquadro Profilo della Home dice «Aggiungi la tua foto» al posto dell'email, fermo. Il **pallino sul «Profilo»**
  della testata (`PuntoInvito`) c'è stato per qualche ora e **non c'è più**: con l'anello sull'avatar sarebbe stato un secondo
  effetto per lo stesso invito. **Un richiamo in più, o un altro posto, si chiede al club**, come per l'avvio animato.
- **Quando si invita lo decide la funzione**, con `foto_modificabile` nell'anagrafica, e la Home aggiunge solo che una foto
  non c'è (`invitoDa` in `AreaRiservata.tsx`). In vista cliente è falso, e con una funzione non ancora aggiornata il campo non
  c'è: **niente invito e niente comando**, e la sezione è quella di prima. L'app può uscire prima della funzione senza offrire
  un comando che non risponde, ma il cambio parte solo dopo la funzione.
- **Il foglio** (`FoglioFoto`): «Scatta una foto» (solo dove c'è un touch, `fotocameraDisponibile`: sul computer `capture`
  non conta e si aprirebbe una finestra di file, quindi lì c'è solo «Scegli una foto») e «Scegli dalla galleria», poi
  l'**anteprima** («Così ti vedranno») e **«Usa questa foto»: niente parte prima**. Durante l'invio il foglio non si chiude.
  Gli errori della funzione (formato, troppo piccola, limite di cinque cambi in un'ora, rifiutata da PerfectGym) arrivano così
  come sono, nel foglio, e si può riprovare.
- **La foto diventa un quadrato di 800 pixel in JPEG, sul web** (`fotoProfilo.ts`): ritagliato come li ritagliano gli avatar
  del Profilo (`ritaglioQuadrato`: lato corto per intero, lungo l'altro lato al 30%, sopra il centro dove stanno le facce),
  quindi l'anteprima è quello che si salva e non viene più tagliata. Pesa 60-200 kB e **perde l'EXIF, posizione compresa**;
  l'orientamento lo applica il browser. Sotto i 200 pixel per lato la ferma l'app, prima di scomodare il server (che
  ricontrolla tutto sui byte). **Nell'app nativa la foto parte com'è** (JPEG, PNG o WebP fino a 4 MB: un HEIC no), con l'EXIF
  che ha, e senza fotocamera diretta: ritagliare e ripulire vorrebbero `expo-image-manipulator` e `expo-image-picker`, e
  quindi una nuova build, come per le schede (`fileScheda.ts`).
- **Se le misure non sono ancora pronte** (`in_arrivo`) la foto è salvata ma il link non c'è: per dieci minuti l'anagrafica
  che si mostra porta quella appena scelta (`profilo/fotoLocale.ts`, solo in memoria, esce con l'uscita dall'app), così
  non sparisce e l'invito non riappare a chi l'ha appena messa. Il messaggio lo dice: «Per la segreteria sarà pronta fra
  qualche minuto».

### Nella testata della Home l'avatar è la foto (19/10/2026)

Richiesta di Maurizio: all'apertura dell'app il riquadro con le iniziali («MT») in alto a sinistra della testata scura mostra **la foto del
profilo**, se c'è. Se non c'è restano le iniziali, **un po' più grandi** (52 punti, erano 38: una faccia in 38 non si riconosce), con l'invito a
metterla. File: `profilo/AvatarFoto.tsx` (l'avatar), `AreaRiservata.tsx` (`Benvenuto`, lo stato e il foglio).

- **Con la foto** sta nello stesso riquadro 52×52 e con lo stesso bordo chiaro delle iniziali (`AvatarFoto`), ritagliata come gli altri avatar
  (`contentPosition` 50% / 30%). Le iniziali stanno **sotto**: la foto entra in dissolvenza quando è caricata, e se il link è scaduto o la rete
  è andata (`onError`) restano le iniziali, senza buchi e senza invito (una foto il server dice che c'è). **Non è un comando a parte**: il tocco
  sulla testata porta al Profilo, dove «Cambia foto» c'è già.
- **Senza foto** (e solo dove `foto_modificabile` è vero, `invitoDa`): le iniziali con l'anello che pulsa (`Richiamo`, lo stesso del Profilo: tre
  raffiche e poi fermo), una fotocamera sull'angolo e, accanto alla data, «Aggiungi la tua foto» in arancio. **Con la sezione Profilo aperta sotto i riquadri l'invito della testata non c'è** (ha già il suo, `sezione !== 'profilo'`: un invito solo sullo schermo). **Toccando avatar e scritta si apre
  subito il foglio** (`FoglioFoto`, lo stesso del Profilo): niente passa dal Profilo, e a salvataggio fatto la foto prende il posto delle iniziali,
  con «Foto aggiornata.» sotto la testata per qualche secondo (o, se le misure non sono pronte, «Foto salvata. Per la segreteria sarà pronta fra
  qualche minuto.» e la foto appena scelta resta per dieci minuti, `fotoLocale.ts`).
- **La Home legge l'anagrafica a ogni apertura**, anche se in memoria c'è (`anagraficaRiletta`): il link della foto è firmato e dura un'ora, e uno
  scaduto mostrerebbe le iniziali a chi ha una foto. Una sola rilettura per apertura, non a ogni `carica` (che gira anche dopo un certificato).
  Il Profilo, aperto sotto i riquadri, aggiorna la testata (`aggiornaAnagrafica`): cambiare la foto lì la cambia in alto.
- **In vista cliente** lo staff vede nella testata la foto del cliente, come nel Profilo (`foto` è del titolare che guarda); senza foto, o con una
  funzione che non conosce il cambio, le iniziali di sempre, **senza invito e senza comando**. La testata è un posto in più rispetto alla regola del
  17/10/2026 («solo nel Profilo»): **un altro posto si chiede al club**, e questo è una richiesta di Maurizio non ancora confermata dal club.

Per verificare: `npx tsc --noEmit` pulito; `ritaglioQuadrato` (`src/lib/ritaglio.ts`, puro) si prova con
`node --experimental-strip-types`. **Provato in un browser vero** (Chromium, bundle web esportato, funzione simulata con
`page.route`; 390 px con touch e 1280 px senza, tema chiaro e scuro): l'invito e il pallino che pulsano (fotogrammi diversi) e
che con «riduci movimento» non si muovono; foglio, scelta dalla galleria e da «scatta», anteprima, invio, e cosa parte (un solo
data URL JPEG, 800×800, 21 kB, senza EXIF); ritorno con foto, con `in_arrivo`, con 422, 429 e con la funzione che non conosce
l'azione; foto troppo piccola ferma prima di ogni richiesta; vista cliente e funzione vecchia senza invito né comando; chi ha
già la foto. **La testata della Home** (19/10/2026) nello stesso modo, 20 prove: senza foto (avatar 52, anello che pulsa, il «Profilo» fermo, il
tocco apre il foglio e non il Profilo, la foto prende il posto delle iniziali dopo il salvataggio, un invito solo con il Profilo aperto), con la foto (riquadro 52×52, immagine caricata, il tocco
porta al Profilo), link scaduto, vista cliente e funzione vecchia, «riduci movimento», misure non pronte, foto rifiutata e riprovata, 360, 430 e 1280 px
senza scorrimento orizzontale. **Non provato**: un telefono vero (la fotocamera frontale, `capture="user"`, e l'HEIC di iOS), l'app
nativa, e **PerfectGym vero** (vedi APP-ATHLON): la funzione era simulata.

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

## L'avviso del certificato, subito sotto la testata, e gli abbonamenti a quota zero che contano

Richiesta del club (20/10/2026). Due cose che si tengono insieme, perché l'avviso guarda gli abbonamenti:

- **L'avviso** (`home/AvvisoCertificato.tsx`) sta **subito sotto la testata della Home**, prima del messaggio di benvenuto e di «Da fare»: bordo
  e velo rossi, il titolo («Certificato medico mancante» / «scaduto» / «rifiutato», o «Certificati medici da sistemare» se sono più persone del
  nucleo), chi e da quando, e il pulsante che apre la sezione Certificato (dove c'è la «i» di quale certificato serve e il caricamento). **Compare
  solo per chi ha un abbonamento in vigore** (`personeConAbbonamento`) **e il certificato scaduto o mancante** (`StatoCertificato.scadutoOMancante`).
  Vale **per persona**: il titolare senza abbonamento non è avvisato perché il figlio ha il corso. Non è un avviso: «in scadenza», «da consegnare entro
  i 6 anni», sotto i 6 anni, un certificato caricato e «in verifica» (la persona ha fatto la sua parte). Un certificato **rifiutato** su uno scaduto o
  mancante sì: la situazione di prima resta, e il motivo è nel dettaglio. Un abbonamento «in vigore» è come lo intende il resto della Home: in corso,
  non ancora iniziato o sospeso (i contratti dell'area sono tutti vivi). Il tasto è a tutta larghezza sul telefono e largo quanto il testo sul desktop;
  in vista cliente dello staff dice «Vedi il certificato», perché lì non si carica niente.
- **Chi ha l'avviso non ha la stessa voce in «Da fare»** (sarebbe due volte la stessa cosa uno sopra l'altra): `vociDaFare` salta le persone avvisate.
  Restano in «Da fare» il certificato in scadenza o da consegnare entro i 6 anni, **solo per chi ha un abbonamento in vigore**.
- **Chi non ha un abbonamento in vigore non legge niente del suo certificato in «Da fare»** (20/10/2026, richiesta di Maurizio): un ex socio, una prova
  (Guest Pass), un familiare senza corso, un abbonamento finito. Vale per persona, titolare compreso: `vociDaFare` salta chi non è in `personeConAbbonamento`,
  cioè chi non ha un contratto dell'area che sia un abbonamento (`eAbbonamento`) in corso, non ancora iniziato o sospeso (`vivo` = `Current`, `NotStarted`,
  `Freezed`). **La sezione Certificato** (che si apre dal riquadro) **non è cambiata**: chi la apre vede lo stato e può caricare, abbonamento o no.
- **Gli abbonamenti principali a quota zero sono abbonamenti** (`eAbbonamento` in `home/regolarita.ts`): gli omaggi e gli employee (`tipo = 'gratuito'`,
  non aggiuntivi: «Employee contract» e «Omaggio Club») contano nel riquadro Abbonamenti («1 attivo», prima «0
  attivi»), nell'elenco «In vigore» sotto di lui e nell'avviso. **Restano fuori il Guest Pass** (è una prova: ha lo stesso canone zero), **i contratti
  aggiuntivi a zero e i voucher Covid** (richiesta del club: per il database sono `gratuito` come gli omaggi, ma la funzione li manda con `tipo = 'voucher_covid'`). Il metodo di pagamento non si pretende dove non c'è un canone, e un pagamento in sospeso resta un pagamento in sospeso.
- **Il tipo viene dal database**: `portale_la_mia_area` porta su ogni contratto `tipo` e `aggiuntivo` (migrazione `20261020g` di APP-ATHLON), e `portale-abbonamento`
  (azione `contratti`) elenca anche i gratuiti principali. **Con la funzione non ancora aggiornata `tipo` non c'è e l'app fa come prima**: conta solo chi ha
  un canone, nessun avviso nuovo per un employee, niente si rompe. **Pubblicare prima migrazione e funzione, poi l'app**: un'app nuova con la
  funzione `contratti` vecchia dice «1 attivo» sopra e «Non troviamo abbonamenti in corso» sotto.
- **Il CRM non è allineato su un punto**: `certificati_stato` (la pagina Certificati e i promemoria) guarda `socio_stato.stato = 'abbonato'`, cioè un contratto vivo
  **a canone > 0**. Un employee o un omaggio con il certificato scaduto ha l'avviso nell'app ma non compare nelle liste Certificati del CRM né riceve il
  promemoria per email. Se il club vuole le due cose uguali, si cambia lì (`socio_stato` ha già lo stato `gratuito`).

Per verificare: `npx tsc --noEmit` pulito. **Provato in un browser vero** (Chromium, bundle web esportato con `EXPO_PUBLIC_SUPABASE_URL` locale, funzione simulata con
`page.route`; 390 px chiaro e scuro, 1280 px): employee con certificato mancante (avviso, nessun «Da fare» doppio, «1 attivo»), famiglia con uno scaduto e uno
mancante (titolo plurale, due righe), senza abbonamento (nessun avviso; allora la voce restava in «Da fare», ora non c’è più), Guest Pass (nessun avviso), funzione vecchia (come prima),
omaggio con certificato valido (nessun avviso), il pulsante che apre `?sezione=certificato`, nessuno scorrimento orizzontale, nessuna richiesta fuori dal computer.
La logica pura (`eAbbonamento`, `personeDaAvvisare`, `vociDaFare`, `riepilogoAbbonamenti`) con 35 prove su dati finti (voucher Covid compresi), e provata con mutazioni (togliendo la regola le
prove falliscono). **Non provato**: un telefono vero, e una sessione vera con la funzione del database aggiornata.

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

## I piani di allenamento: si compone insieme o si importa, si modifica e si conferma, e restano suoi

Nell'app si chiamano **piani di allenamento** (richiesta del club, 19/10/2026): nei testi mai «schede» per questi. Resta «scheda» dove
vuol dire altro (la scheda del socio al club, la scheda di una lezione, l'Help Desk), e nel codice (`/allenamento/[scheda]`,
`SchedaLab`, `salva_mia`…). Cartella `src/features/lab/schede/`; funzione, tabelle e limiti sono nel `CLAUDE.md` di APP-ATHLON.

- **La schermata Train (`Schede.tsx`) ha le due origini sopra e «I tuoi piani» in fondo** (rifatta il 20/10/2026, richiesta del club: **via i piani
  consigliati dal club e via l'AI come titolo**). Dopo il test e le calorie: «Crea il tuo piano di allenamento» con **due strade sole**, poi **«I tuoi
  piani»** (quelli che il socio ha scelto: suoi, importati, composti, del suo trainer, e gli «AI» di prima), poi gli ultimi allenamenti. Le strade:
  **«Componi il tuo piano»** (`CartaComponi`, che porta a `Agente.tsx`: «Generiamo insieme il tuo piano, in sala o in vasca: rispondi a qualche
  domanda…», con la quota «Puoi comporne ancora N questo mese» e, sotto, «Preferisci partire da zero? Scrivilo tu», che porta all'editor vuoto: era
  un pulsante della carta «Importa») e **«Importa il tuo piano»** (`CartaImporta`, `Importa.tsx`: «Da foto o file»). **Il carosello dei piani del club
  (`PianoClub`, il filtro per obiettivo) è stato tolto**, e con lui il colore viola e l'icona «stella» dell'AI: la carta «Componi» è nei colori del club
  (`FUOCO`, il manubrio). **Non è stato tolto altro**: i piani `standard` restano nel database e nella risposta di `elenco` (l'app li scarta), e la scheda di
  un piano del club (`Scheda.tsx`, «Aggiungi ai tuoi piani», «Modifica e aggiungi») si apre ancora da un indirizzo già dato; semplicemente nessuna
  schermata li offre più. Se il club li rivuole, basta rimettere la sezione (è nella cronologia di git, «Oppure scegli un piano consigliato dal club»).
  **Dopo le due strade c'è il personal trainer** (`CartaPersonal`): «Vuoi essere seguito da un personal trainer?» porta **direttamente alla
  prenotazione** (`/personal`, l'altra faccia di Prenotazioni: scegli trainer, giorno e ora). Non produce un piano da modificare: lo costruisce il
  trainer, e compare poi fra i piani «Dal tuo trainer».
- **Qualunque sia l'origine, si modifica e si conferma, e solo allora è fra i suoi piani.** Un piano del club si apre (`Scheda.tsx`) con
  **«Aggiungi ai tuoi piani»** (la copia com'è, `comeDaSalvare` in `copia.ts`) e **«Modifica e aggiungi»** (l'editor con `?copia=<id>`); quello
  di un trainer (o un «AI» di prima) solo **«Modifica una copia»**, perché è già suo. L'originale non si tocca. Un piano del club si può ancora
  **iniziare direttamente** senza copiarlo: non si è tolto quello che c'era (ma dal 20/10/2026 nessuna schermata lo offre). «Componi» e l'importazione rispondono con una **bozza**
  (`bozza.ts`, in memoria, mai sul disco, con la sua `origine`) che passa all'editor (`?da=bozza`), dove si guarda, si cambia e si conferma.
- **L'editor è uno solo per cinque modi** (`EditorScheda.tsx`, `modo`): nuovo, modifica di un piano suo (`?id=`), copia (`?copia=`), bozza
  letta da un file e bozza dell'agente. Cambiano titolo, sottotitolo, avvisi e il tasto («Salva il piano» / «Salva le modifiche» / «Conferma
  e aggiungi ai tuoi piani»). L'`origine` si manda solo alla nascita (`creata`, `importata`, `ai`, `club`): in modifica non si cambia. Le
  validazioni (titolo, giorni vuoti, percentuale 20-100) sono qui e **anche nella funzione**.
- **Ogni esercizio della libreria ha la sua miniatura** (23/10/2026, segnalazione di un tester: «insieme al nome degli esercizi potrebbe essere carino mettere
  l'immagine, così si capisce di quale esercizio si tratta prima di accettare il programma»; il caso era «Allungamento addominali, variante 1 / 3»). Nell'editor
  (`EditorScheda.tsx`, qualunque modo) la riga porta a sinistra il **poster** MoveKit, ritagliato a quadrato (68 pt, `cover`, fermo: il video resta nella scheda del
  piano). Il poster **non sta nella bozza**: lo chiede `schede/anteprime.ts` (`useAnteprime`, azione `anteprime` di `portale-lab-schede`) con **una chiamata per tutti gli
  esercizi della libreria del piano** appena l'editor si apre, e una per quello che si sceglie con «Cambia esercizio». **Un piano già salvato** (modifica, copia) ha già
  i poster firmati nella risposta di `scheda` (`seminaAnteprime`) e non fa nessuna richiesta. Solo in memoria (`memoria.ts`: esce con l'uscita dall'app e dopo un
  salvataggio), con i link ricordati tre ore su quattro di validità.
  **Il riquadro tiene il posto mentre si aspetta** (un quadrato vuoto, così la riga non si sposta quando arriva) **e sparisce se non arriva niente**: un esercizio suo
  («Tuo», `socio-…`) o senza id («Da controllare») non l'ha mai, e dove la funzione non risponde o non conosce l'azione (un'app nuova con la funzione vecchia) l'elenco
  è quello di prima. È decorativo (il nome gli sta accanto e lo legge lo screen reader). **Il selettore «Cambia esercizio» / «Aggiungi un esercizio» non ha le miniature**:
  sono 582 poster da firmare e una ricerca che cambia a ogni lettera; se serve si chiedono solo per i quaranta in vista, con lo stesso `useAnteprime` e un po' di attesa.
  `tsc` pulito (0 errori su Linux). **Guardato in Chromium** (bundle web esportato, funzione simulata con `page.route`, 390 px chiaro e scuro, 1280 px): bozza letta da un file con
  i riquadri che aspettano e poi i poster, un esercizio senza poster che perde il riquadro, una chiamata sola per sei esercizi e una sola per quello cambiato, la funzione
  vecchia senza riquadri vuoti, un piano salvato aperto in modifica senza richieste e con l'esercizio «Tuo» senza riquadro, nessuno scorrimento orizzontale, nessun errore in console.
  **Non provato**: poster veri (le prove usano immagini finte: come si ritaglia un 16:9 a quadrato su plank e nuoto va guardato con i primi poster veri), la funzione vera con
  una sessione vera, l'app nativa, un telefono. **Da pubblicare: prima la funzione (APP-ATHLON), poi l'app.**
- **Le percentuali del massimale restano nella copia.** Un piano del club scrive i carichi in % del massimale (e l'agente pure): l'editor
  le porta con sé (campo «% del massimale» per esercizio, vuoto = vale il carico a parole) e nell'app diventano i chili del socio dopo
  il test. Anche `obiettivo` e `livello` si copiano. Se un esercizio del club è stato spento dopo, la conferma risponde che non è più in
  libreria: il socio lo cambia con «Cambia esercizio».
- **Gli esercizi si scelgono dalla libreria del club** (`SceltaEsercizio.tsx`, senza video né poster: sono seicento, e la lista si ricorda
  sotto `schede:libreria`) **oppure si scrive il nome**: diventa un esercizio suo, senza video. In un esercizio letto da un file che non è in
  libreria resta «Hai scritto: …» e il segno «Da controllare».
- **Da dove viene si dice sulla carta** (`etichettaPiano` in `comune.ts`): «Scritto da te», «Importato da te», **«Composto per te»** (era «Creato con
  l'AI»: un piano composto non dice «AI», 20/10/2026), «Dal club, tuo», «Dal tuo trainer». Il piano consigliato dal club si legge «Consigliato dal club».
- **I trainer del club vedono i piani dei soci dal CRM, in sola lettura** (richiesta del club: chi porta un piano suo va verificato), e l'app
  lo dice al socio in tre punti: nel piano, in fondo all'editor e sotto l'avvertenza dell'importazione (più l'avviso dell'agente). Se cambia,
  cambiano tutti. Togliere un piano lo ritira e chiede conferma; le sedute fatte restano.
- **In vasca il piano si legge e non si registra** (20/10/2026): l'agente («Dove ti alleni» → «In vasca») scrive un piano di nuoto per il Nuoto Libero, con distanze e
  recuperi; stesso editor, stesse conferme, ma senza «Inizia». Sezione «Il piano di nuoto» in fondo.
- **L'importazione non salva mai da sola.** `Importa.tsx` manda il file a `importaScheda`: ci vogliono una decina di secondi, a volte un
  minuto (la schermata d'attesa lo dice), e chi esce nel frattempo non si ritrova nell'editor (`qui`). **Il file** (`fileScheda.ts`): foto
  JPG, PNG o WebP e PDF, fino a 4 MB; sul web una foto si porta a 1800 px in JPEG (300–600 kB, meno attesa). «Scatta una foto» apre la
  fotocamera posteriore del telefono dal browser (`capture`); **nell'app nativa non c'è la fotocamera diretta** (serve `expo-image-picker`
  e una nuova build).
- **Un piano lungo si importa a pagine** (20/10/2026, segnalazione di un tester: una seduta lunga non sta in uno screenshot, e due foto davano due sedute, A e B, invece di una).
  `Importa.tsx` fa scegliere **fino a quattro file** (foto o PDF, 4 MB l'uno e 10 MB in tutto, anche insieme dalla galleria), li mostra in un elenco nell'ordine («Pagina 1», «Pagina 2», con «Togli») e
  **solo con «Leggi il piano» partono tutti insieme** (`importaScheda(files)`): la funzione li manda al modello come un piano solo, e una seduta che continua nella pagina dopo resta una seduta. Il
  tasto «Leggi il piano» è un tocco in più anche per chi ha un file solo. **Serve la funzione aggiornata**: una vecchia (`file` e non `files`) risponde «Manca il file». Pubblicare prima il
  workflow `athlon-scheda-import`, poi `portale-lab-schede`, poi l'app (APP-ATHLON, «I piani del socio»). Un'importazione con più file conta **una** nelle dieci al giorno. `tsc` pulito; **la schermata non è
  stata guardata renderizzata né provata su un telefono**.
- **«Componi il tuo piano»** (`Agente.tsx`, indirizzo `/allenamento/agente`: è quello dei link già dati) fa le sue domande e **non salva un piano da solo**:
  torna una bozza (`origine: 'ai'`) che passa dall'editor. La quota (tre in trenta giorni) la dice `elenco`, e il messaggio quando è finita non nomina
  l'agente («Hai già composto 3 piani negli ultimi trenta giorni…»). Le risposte ammesse sono in `schede/questionario.ts` (puro) e la funzione le ricontrolla:
  - **Obiettivo «Salute»** (20/10/2026, richiesta del club; **sempre l'ultima pillola**, in sala e in vasca). **Non produce un piano**: sotto compaiono
    le sottovoci **Recupero post traumatico, Malattia metabolica, Problemi articolari, Malattia cardiovascolare, Alterazioni posturali (scoliosi,
    ipercifosi, ecc.)** e un riquadro «Per questo ti serve un personal trainer» col pulsante **«Prenota un personal trainer»**, che va a `/personal`.
    Le sottovoci servono solo a dire al socio che è nel posto giusto (il riquadro nomina quella scelta); **qualunque sia la risposta si va dal
    trainer**, e non si porta niente alla prenotazione (`/personal` non ha un campo note). Con «Salute» sparisce il resto del questionario (livello, giorni…)
    e non parte nessuna richiesta; **la funzione la rifiuta comunque** (400, la stessa frase del riquadro), in sala e in vasca. Sotto «Limitazioni o
    infortuni» una riga dice di scegliere «Salute» per un recupero o una patologia. Il testo del riquadro e la nota («porta le indicazioni del tuo medico o del
    fisioterapista») sono miei, da far leggere al club.
  - **Durata: 30, 45, 60 o 80 minuti** (prima 30, 45, 60, 75 e 90). Un'app rimasta aperta manda ancora 75 o 90: la funzione li accetta.
  - **Cosa usi: «Tutto», «Prevalenza macchine isotoniche», «Prevalenza pesi liberi e corpo libero»** (`tutto`, `macchine`, `pesi_liberi`; prima `sala_completa`,
    `manubri_e_corpo_libero`, `corpo_libero`, che la funzione legge come il più vicino). **È una prevalenza, non un'esclusiva**: lo dice una riga sotto le
    pillole. La funzione filtra solo forza e pliometria (solo macchine e cavi, o tutto tranne loro); cardio, stretching e mobilità restano sempre.
    **Dal 22/10/2026 in sala la domanda è «Con cosa ti trovi bene in sala?»** (multipla) e la prevalenza si ricava dagli strumenti scelti; in vasca non c'è.
  - **In sala il questionario è a passi** (22/10/2026, richiesta di Maurizio: «le domande che facciamo oggi per la scheda d'allenamento sono veramente troppo poche»; l'idea
    è delle app che chiedono una cosa per schermata). **Una domanda per schermata**, indietro a sinistra, **l'anello in alto a destra che si chiude** (`AnelloPassi.tsx`: un
    `Svg` fermo, il valore passa da `requestAnimationFrame`; con «riduci movimento» salta) e «Continua» in basso, spento finché non si risponde. File: `Agente.tsx` (sceglie fra sala e
    vasca), `PassiSala.tsx` (i passi), `PassiUI.tsx` (la carta di una risposta, la griglia), `SaluteBlocco.tsx` (il riquadro del personal trainer, lo stesso in sala e in vasca), `rispostePiano.ts`
    (le risposte in memoria). **La vasca ha il suo questionario a passi, più corto** (22/10/2026, più sotto): qui non ci sono squat o flessioni.
    - **I 18 passi, in ordine**: obiettivo (con «Salute» che porta al personal trainer, **com'era**: non c'è una domanda in più sui limiti del medico), su cosa concentrarsi (fino a 3, facoltativo),
      esperienza, **con cosa ti trovi bene** (multipla), i tre test (squat, piegamenti, plank, con «non lo so») (nel testo si dice «piegamenti», mai «flessioni»; la chiave `flessioni` resta com'è nel codice e nella richiesta alla funzione, che la conosce con quel nome), **il tuo livello** (stimato, cambiabile), fastidi per zona (o «nessun fastidio»; se c'è una
      zona compare un campo facoltativo), com'è la giornata, cosa evitare (o «niente»), cardio, intensità (dolce, media, intensa: le parole dei consigli), durata, **giorni a settimana** (solo il numero,
      con «Consigliato»; **non si chiede quali giorni**), quando ti alleni (la fascia), una nota facoltativa e **il riepilogo «Ecco cosa abbiamo capito»**, dove ogni riga si tocca per cambiarla e,
      cambiata, si torna al riepilogo. Solo «Componi il mio piano» fa partire la richiesta. Con `?dove=sala` (dai Consigli) la prima domanda è già risposta e si parte da «Qual è il tuo obiettivo?».
      Niente calorie, niente peso, niente promesse nel riepilogo (`riepilogoDa`).
    - **Le regole sono pure, in `questionario.ts`** (si provano con `LC_ALL=it_IT.UTF-8 npx tsx`, perché `t()` fuori da un browser sceglie l'inglese): `livelloDa` (esperienza e tre test pesano metà
      ciascuno; «non lo so» non conta; senza test basta l'esperienza, e solo chi si allena regolarmente è intermedio; chi non ha mai fatto niente non va oltre intermedio), `giorniConsigliati` (3, 4 per un
      esperto, +1 per sedute da 30 minuti o per un'intensità intensa di chi non comincia, −1 per sedute da 80, sempre fra 2 e 5), `passoCompleto` (obbligatori e facoltativi), `accendi` («nessuno» esclude le altre),
      `questionarioSalaDa` (cosa parte: solo le risposte date; «nessuno» e «non lo so» non partono). **Soglie nostre, da far validare dal Direttore Tecnico**: il livello è una stima e il socio lo vede e lo può
      cambiare; i giorni li calcola il codice, non un modello.
    - **Cosa parte per la funzione** (`Questionario` di `api/lab.ts`): le sette risposte di sempre più `focus`, `esperienza`, `strumenti`, `capacita`, `zone`, `giornata`, `evita`, `cardio`, `intensita`, `fascia`, tutte
      facoltative. La prevalenza `attrezzatura` si ricava dagli strumenti. **Una funzione che non le conosce ancora le ignora** e il piano si scrive con le sette di prima: l'app può uscire prima. Lato server e
      prompt: `CLAUDE.md` di APP-ATHLON, «Il questionario di sala a passi».
    - **Cosa ne fa la funzione, e cosa vede il socio** (22/10/2026): le risposte non vengono solo passate al modello, **la funzione ne ricava il programma** (giorni, distretti, quanti esercizi per distretto, serie,
      ripetizioni, percentuale, recupero, cardio) e il modello sceglie gli esercizi dentro quella struttura; poi un controllo corregge i numeri fuori scala. L'app non ricalcola né mostra il programma: il
      socio vede il piano nell'editor, come prima. Cose che noterà: **il numero di esercizi di una seduta dipende dai minuti e dal tipo di lavoro** (una seduta di forza pesante, con tre minuti di recupero,
      ne ha meno di una da quindici ripetizioni, e meno ancora con il cardio in fondo), il cardio c'è in ogni seduta se si allena fino a tre giorni e a giorni alterni da quattro, e con un fastidio a ginocchio, anca,
      caviglia o schiena non compaiono pliometria e corsa. Se in futuro l'editor dovesse mostrare perché un esercizio c'è, la fonte è il programma, non il modello.
    - **I tre test hanno il video che spiega il movimento** (23/10/2026, richiesta di Maurizio: «c'è gente che non sa cosa sono»). Sopra le opzioni di squat, piegamenti e plank, `VideoTest` (`PassiSala.tsx`) mostra poster e video MoveKit (`MediaEsercizio`, in loop, muto) dell'esercizio che il test chiede: `bodyweight-squat`, `push-up`, `front-plank`. I link li firma `portale-lab-schede` (azione `video_capacita`, `videoCapacita()` in `api/lab.ts`): l'app non costruisce nessun indirizzo. Una lettura sola per apertura, in memoria; **senza la funzione aggiornata o senza rete non si vede niente e il passo è quello di prima**. Pubblicare prima la funzione. Non guardato in un browser.
    - **Le risposte non restano.** Le zone che danno fastidio sono dati sulla salute: stanno solo in memoria (`rispostePiano.ts`, mai sul disco, niente nel `localStorage`: provato), servono a non perdere venti risposte
      se si esce per sbaglio (si riparte da dove si era), si buttano quando il piano è composto e uscendo dall'app (`esciDalLaboratorio`). Dopo un ricaricamento della pagina si ricomincia.
    - **Il profilo comune con i Consigli** (22/10/2026, richiesta di Maurizio: i due questionari erano lunghi e si ripetevano; `schede/profiloComune.ts`, **puro**).
      Cinque risposte sono *la stessa domanda* nei due posti e passano dall'uno all'altro: **obiettivo** (il primo dei Consigli), **esperienza** (le due «ho smesso» della sala sono
      «ho smesso» con da quanto nei Consigli: meno di un anno / oltre; «ho smesso da tempo» non dice se uno o tre anni, e nei Consigli quella domanda resta da fare), **intensità**,
      **quando si viene** (le fasce dei Consigli ridotte a una; più fasce diverse sono «cambia da un giorno all'altro») e **la forma di oggi**, che scrive solo la sala (stimata dai test,
      quando la persona ha visto il passo «Il tuo livello») e che i Consigli mostrano come risposta loro. **Non si porta altro, di proposito**: «quante volte a settimana» nei Consigli
      sono le volte al club, lezioni comprese, non i giorni di sala; «lezioni da evitare» sono nomi di lezioni, non esercizi; e **niente di sanitario** (zone, limitazioni, note, test,
      strumenti): resta dove è stato scritto.
      **Le regole**: si porta **solo dove la persona non ha ancora risposto, e una risposta sua non si riscrive mai**; la risposta riportata si vede (in sala «Dalle tue risposte
      precedenti» sopra l'opzione, nei Consigli una riga arancio sotto la domanda) finché non la tocca, e finché è riportata e non toccata **segue il profilo** (a ogni apertura si
      rifà da lì); nel profilo vince l'ultima risposta data, in uno dei due posti (una risposta tolta nei Consigli la toglie dal profilo), e si scrive quando la persona tocca una
      risposta o conferma il questionario, mai solo perché una schermata si apre. **Il profilo sta in memoria** (mai sul disco) e esce con l'uscita dall'app
      (`dimenticaTutteLeRisposte`). Per non perderlo fra un'apertura dell'app e l'altra, **la sala, se non c'è un profilo, cerca i Consigli salvati dalla funzione** (`consigli_ultimi`:
      una volta per apertura, mai in vista cliente, e si riprova solo se la funzione non ha risposto): niente di nuovo sul server.
      **Non c'è un profilo salvato oltre a quello**: chi compone un piano in sala senza aver mai chiesto i Consigli non lascia niente che sopravviva a una nuova apertura dell'app.
      Se serve, è una tabella sul server, con la decisione se salvare anche i fastidi (oggi no).
      **Provato**: le regole pure con `LC_ALL=it_IT.UTF-8 npx tsx` (19 gruppi, provati per mutazione: 19 modifiche del codice, tutte rilevate), `tsc` pulito e, in Chromium (bundle
      web esportato, funzioni simulate con `page.route`; 390 e 1280 px, chiaro e scuro, italiano e inglese): dai Consigli alla sala (obiettivo, esperienza, intensità e fascia già
      scelti e segnati, la forma no, toccarne una toglie il segno), dalla sala ai Consigli (cinque risposte riportate; nessun fastidio né nota sulla pagina, nella richiesta o nel browser),
      l'avvio a freddo con i Consigli salvati (una sola richiesta, nessuna alla riapertura), senza Consigli salvati o con la funzione che non risponde (la sala è quella di prima),
      nessuno scorrimento orizzontale. **Non provato**: una sessione vera, un telefono, e la vista cliente (dove la sala non cerca niente).
    - **Il pulsante «Assistente virtuale» si fa da parte** (fino al 30/10/2026 era quello del «Feedback»): l'anello sta dove di solito sta lui, quindi `PassiSala` dice `useSegnaAzioneInAlto` (resta la sola icona, accanto all'anello; durante l'attesa torna al suo posto).
    - **Provato in Chromium** (bundle web esportato, funzione simulata con `page.route`; 390 px chiaro e scuro, 360 px, 1280 px): i 18 passi di fila, Salute (riquadro del personal trainer, niente «Continua»), il
      tetto di tre zone, il livello stimato, il campo dei fastidi, il riepilogo con la riga che si cambia, la richiesta che parte con le risposte giuste (e senza il quarto «su cosa concentrarti» né i «non lo so»), il
      passaggio alla vasca e il ritorno in sala, `?dove=sala` e `?dove=vasca`, la memoria uscendo e rientrando, niente delle risposte sul disco. **Non provato**: un telefono vero, la funzione vera con una sessione vera,
      il piano che il modello scrive visto dall'app (provato con il modello vero dal database, otto profili: vedi APP-ATHLON), e le animazioni con «riduci movimento».
      **Pubblicato il 22/10/2026 nell'ordine giusto**: prima il nodo n8n e `portale-lab-schede` v16 (la funzione accetta sia le risposte di prima sia le nuove, quindi un'app rimasta aperta funziona), poi questa app.
  - **In vasca il questionario è a passi, e più semplice** (22/10/2026, richiesta di Maurizio: «qualcosa di più semplice e focalizzato sull'acqua»). Stesso schema della sala (una domanda per
    schermata, l'anello che si chiude, «Continua», il riepilogo «Ecco cosa abbiamo capito» che si corregge riga per riga; solo «Componi il mio piano di nuoto» fa partire la richiesta), ma **sei domande
    sole e tutte sul nuoto**. File: `PassiVasca.tsx` (i passi), `questionarioVasca.ts` (le regole, **pure**: si provano con `LC_ALL=it_IT.UTF-8 npx tsx`), `rispostePiano.ts` (la memoria, ora una per la
    sala e una per la vasca) e gli stessi `PassiUI.tsx`, `AnelloPassi.tsx`, `SaluteBlocco.tsx` della sala. **`FormVasca.tsx`, il modulo a pagina sola, è stato tolto**; `CampiNuoto.tsx` resta (lo usa il
    Percorso, in standby).
    - **I sei passi e il riepilogo.** (1) **Cosa vuoi ottenere in vasca**, con le parole dell'acqua: Nuotare meglio (`Tecnica`), Avere più fiato (`Resistenza`), Tonificarmi (`Tonificazione`), Dimagrire
      (`Dimagrimento`), Stare bene (`Benessere generale`), e «Salute» in fondo, che porta al personal trainer **com'era**. Mobilità, Forza e Ipertrofia non si offrono più (la funzione li accetta ancora).
      (2) **Che stili sai nuotare** (multipla, con «Non ne so ancora nessuno» che esclude gli altri): senza stile libero e dorso si legge dove si comincia (`MESSAGGIO_SCUOLA_NUOTO`, la Scuola Nuoto Adulti,
      mai un «non sei pronto») e «Continua» resta spento. (3) **Quanto riesci a nuotare di fila**, con le vasche accanto ai metri (la vasca è da 25 m: quattro vasche sono 100 m). (4) **Quanto tempo hai**
      (30, 45 o 60 minuti: il turno è di un'ora, il piano sta nel tempo che scegli). (5) **Quante volte a settimana** (da 1 a 4, con «Consigliato»). (6) **Fastidi** (spalle, collo, zona lombare, ginocchia,
      anche, o «nessun fastidio»; con una zona si può aggiungere due righe). Il **riepilogo** ha sette righe e ognuna si tocca per cambiarla.
    - **Il livello non si chiede: si stima e si mostra nel riepilogo** (`livelloVascaDa`). Quanto nuota di fila (da 0 a 3 punti) più un punto se sa tre stili o più: da 2 punti è intermedio, da 4 esperto
      (oltre 1000 m con due stili resta intermedio). Toccando la riga «Livello» si apre «Il tuo livello in acqua» (`PassoVascaTutti`: un passo che non è di fila e a cui si arriva solo dal riepilogo), dove
      si cambia; cambiare stili o distanza fa decadere un livello scelto a mano. **Le volte consigliate** (`volteConsigliate`): due, tre per un esperto, una in più per chi è intermedio e punta a fiato o
      dimagrimento e per le sedute da 30 minuti, sempre fra 2 e 4. **Soglie nostre, da far validare dal Direttore Tecnico.**
    - **La funzione non è cambiata**: parte lo stesso `QuestionarioNuoto` di prima (otto campi). I **fastidi** vanno nel testo delle `limitazioni` («Fastidio o dolore a: spalle, ginocchia. <quello che ha
      scritto>», in italiano, al massimo 500 caratteri, e **solo se c'è una zona**); `note` parte vuota. **Non c'è una regola che tolga la farfalla a chi ha male a una spalla o la rana per le
      ginocchia**: lo decide il modello dalla regola 9 del suo prompt (esercizi e distanze prudenti, ricordare il tecnico a bordo vasca). Se il club la vuole, è una regola nel codice della funzione
      (APP-ATHLON), come la pliometria in sala.
    - **Le risposte non restano**: solo in memoria (`rispostePiano.ts`), si buttano a piano composto e uscendo dall'app (`dimenticaTutteLeRisposte` in `memoria.ts`). Dal primo passo, con `?dove=vasca` (dai
      Consigli) si esce; se invece si è scelto «In vasca» in «Dove ti alleni?», indietro riporta a quella domanda e le risposte della vasca restano.
    - **Provato.** `npx tsc --noEmit` pulito; le regole pure con `LC_ALL=it_IT.UTF-8 npx tsx` (7 gruppi: stili e Scuola Nuoto, livello, volte, passi, questionario, opzioni, riepilogo; provate per
      mutazione); **in Chromium** (bundle web esportato, funzione simulata con `page.route`; 390, 360 e 1280 px, tema chiaro e scuro, e in inglese): i sei passi e il riepilogo, Salute (nessun «Continua»),
      il messaggio della Scuola Nuoto, il livello cambiato dal riepilogo, la richiesta che parte (otto campi, valori giusti), una prima richiesta non riuscita con l'errore sul riepilogo e le risposte che
      restano, la partenza con `?dove=vasca`, il ritorno a «Dove ti alleni?»; nessuno scorrimento orizzontale. **Non provato**: un telefono vero, la funzione vera con una sessione vera, e il piano
      che il modello scrive con le risposte nuove (i campi sono gli stessi, ma `limitazioni` ora comincia con una frase fissa).
  - **L'AI non è in primo piano** (20/10/2026): niente «Agente AI», niente viola, i testi dicono «generiamo insieme» e «componi» («Stiamo leggendo le tue
    risposte…» nell'attesa, che ora dura una decina di secondi e non un paio di minuti). **Che dietro ci sia un'intelligenza artificiale si dice nelle
    postille**, in piccolo e senza nasconderlo: la nota in fondo al questionario, quella in fondo all'editor («Questa bozza è stata composta con il supporto di
    un'intelligenza artificiale, che può sbagliare») e quella in fondo al piano composto (`Scheda.tsx`). **Non vanno tolte**: le limitazioni che il socio scrive sono
    dati sulla salute e vanno a un fornitore di AI, e il socio ha il diritto di saperlo; l'avviso in cima all'editor, invece, non nomina più l'AI («Controllalo
    prima di confermare»). L'informativa privacy del club va aggiornata di conseguenza (vedi più sotto «La privacy dell'Athlon Health System»).
- **L'avvertenza è parte del comando**: la foto o il PDF vengono letti da un servizio di intelligenza artificiale, non si conservano,
  meglio non includere dati che non servono, e una lettura automatica può sbagliare. Se il testo cambia, va riletto con quello
  dell'informativa privacy del club.
- **Nella vista cliente dello staff i comandi falliscono** (le azioni nuove non stanno fra le letture): come per ogni altra scrittura.

Per verificare (20/10/2026): `npx tsc --noEmit` senza errori nuovi (41 di base); `schede/questionario.ts` è puro (`node --experimental-strip-types`). **Guardato in un browser vero**
(Expo web con una finta funzione che registra le richieste, 390 e 1024 px): la schermata Train senza i piani del club, con «Componi il tuo piano» e «Importa il tuo piano» (a due
colonne di pari altezza su schermo largo), la carta «Composto per te» e il piano vecchio «AI» senza viola; il questionario con «Salute» (le cinque sottovoci, il riquadro, il
pulsante che apre `/personal`, nessuna richiesta partita), le durate 30/45/60/80, «Cosa usi», la richiesta che parte con `attrezzatura: 'macchine'` e `minuti: 80`, l'attesa, l'editor col
nuovo avviso e la postilla, il piano composto con la postilla in fondo, «Salute» in vasca (con «Tecnica» prima) e l'errore 502 («Non siamo riusciti a comporre il piano adesso…»,
il questionario resta com'era). **Non provato**: l'errore di quota nella schermata, un telefono, e una sessione vera (la funzione era finta).

## Athlon Health System: la ruota, il Balance, Train e Food

La scheda che era **Workout** (poi «Fit») si chiama **Athlon Health System** (richiesta del club, 19/10/2026):
l'allenamento, l'alimentazione e il recupero dell'adulto in un posto solo. Nel codice la cartella resta `fit/`. L'indirizzo resta `/allenamento` (è quello dei link già dati); l'area scelta sta in
`?area=food`, così tornando dal diario si ritrova Food. Nomi in inglese di proposito, il resto in italiano.

- **In cima parte il video, che comincia dalla ruota** (25/10/2026, richiesta di Maurizio: «quando apri la sezione Athlon Health System deve partire in automatico
  questo video che ti spiega come funziona e parte subito dall'animazione. Train, food e relax»). `fit/VideoIntro.tsx`, montato da `schede/Schede.tsx` **al posto della
  ruota**: aprendo la scheda si vede subito la ruota che arriva (Train · Food · Relax). **Comincia spiegando cos'è Athlon Health System** (richiesta di Maurizio, stesso giorno:
  «fai un intro iniziale, se no non si capisce di cos'è»): «Il benessere è un equilibrio. Il benessere nasce tra allenamento, alimentazione e riposo» con la scheda dei tre
  pilastri (Allenamento = Train, Alimentazione = Food, Riposo = Relax), poi «Tienili d'occhio, tutti e tre. Athlon Health System ti permette di tenere traccia di tutti e tre» con
  cosa si tiene d'occhio (Train: lezioni e allenamenti; Food: il diario dei pasti; Relax: il sonno), poi «Come arrivi a 100?». Da lì il video spiega come si arriva a 100: il
  punteggio 70 + 15 + 15, i massimali e le misure, i giorni attivi e le lezioni, il diario dei pasti, il sonno. **I testi dell'intro sono miei, non del club**: da far leggere.
  Dura circa 60 secondi (6 di intro, 12 battute della musica), è **in italiano con i sottotitoli dentro il video** (si capisce anche senza audio) e ha una musica,
  nessuna voce. Lo ha fatto `/brag`; i sorgenti (composizione Hyperframes, piano, testi per la condivisione) stanno **fuori dal repository**, in `brag-output-2026-10-25-173714/`
  (escluso da git), e il file della versione per i social (1080×1920, con la copertina nel primo fotogramma) è `brag.mp4` lì.
  - **I file dell'app** sono `public/video/athlon-health-system.mp4` (720×1280, 2,9 MB, 60 s, −16 LUFS, comincia direttamente dalla ruota: **nessuna copertina cotta nel primo
    fotogramma**) e `athlon-health-system.jpg` (la copertina che si vede mentre il video si carica). Vercel serve `public/` com'è (la riscrittura verso `index.html` non
    tocca i file con un punto) e `public/sw.js` non intercetta né il video né le richieste a intervalli. **Se il video cambia si rifanno tutti e due i file**, con la stessa
    ricompressione, e si guarda che il primo fotogramma sia ancora la ruota. Sull'app nativa l'indirizzo è assoluto (`https://app.athlonroma.it/video/…`).
  - **Parte muto**: è la regola di ogni browser per l'avvio automatico (su iPhone con `playsInline`). L'altoparlante in basso a destra attiva la musica, ed è un tocco
    della persona; **non c'è un modo di avviare il suono da solo**. Il tocco sul video lo mette in pausa e lo riprende; alla fine il pulsante diventa «Rivedi il video».
  - **Si ferma quando si lascia la schermata o l'app** (`useIsFocused`, `AppState`) e riprende da dov'era; se era finito, alla prossima apertura **riparte da capo** (è il senso
    di «quando apri la sezione»). Una pausa data a mano resta pausa.
  - **Con «riduci movimento» non parte da solo**: si vede la copertina e il pulsante «Avvia il video».
  - **Il video è in italiano**: **in inglese resta la ruota di prima** (`VideoIntro` riceve la lingua da `useLingua`), e resta la ruota anche se il file non si carica o il
    lettore dà errore (`statusChange` con `error`): niente riquadro nero e niente errore a schermo. Un video in inglese è un altro `/brag` con il testo tradotto: non fatto.
  - **Nella vista cliente dello staff si vede come al socio** (non scrive niente e non chiama nessuna funzione). Il numero e le soglie che il video racconta sono quelli del
    punteggio qui sotto (20 minuti, 2-4 giorni, 5 giorni di pasti, 7 ore): **se cambiano nel codice, il video va rifatto**, o direbbe una cosa diversa dall'app. I livelli
    (Legno … Diamante) nel video non ci sono, di proposito.
  - **Provato** (Chromium, bundle web esportato, pagina provvisoria poi tolta, server statico con le richieste a intervalli; 390 px con touch e 1280 px, locale italiano): parte
    da solo e muto e avanza, è il file 720×1280, il comando «Attiva l'audio» accende il suono e passa a «Spegni l'audio», il pulsante mette in pausa e il tempo si ferma, il tocco
    sul video riprende, a fine video i comandi dicono «Rivedi il video» e riparte da capo, nessun errore in console; in inglese non c'è nessun `<video>` e si vede la ruota; con
    «riduci movimento» resta fermo e si avvia dal comando; con il file bloccato sparisce il video e resta la ruota; sul desktop parte da solo. `tsc` pulito. **Rifatto con l'intro** (il video da 60 s,
    gli stessi controlli, tutti passati): i fotogrammi dell'intro guardati uno a uno (0,4 s fino a 13 s: titolo, sottotitolo, scheda dei pilastri e ruota senza sovrapposizioni,
    la prima battuta della musica sul titolo) e il controllo tecnico di Hyperframes senza errori (restano gli avvisi sulla struttura del file). **Non provato**: un
    telefono vero (Safari da PWA su iPhone: `playsInline` e l'avvio automatico muto sono quelli della documentazione, non visti girare), l'app nativa (`expo-video` con l'indirizzo
    assoluto), la scheda vera dietro il login, **il suono con un tocco vero** (qui si è provato che `muted` cambia, non che si senta), il peso su una rete mobile (2,9 MB alla prima apertura, poi
    li serve la cache del browser), e il livello audio (misurato −16 LUFS, **non ascoltato**).
- **La ruota** (`fit/Ruota.tsx`, **ora il ripiego del video**; la matematica del 3D in `fit/ruota3d.ts`, le forme in `fit/ruotaForme.ts`, tutte e due pure): tre frecce che
  si rincorrono, Train → Food → Relax, un giro in 9 s (`GIRO_S`). Il video ne riprende la scena (stesse forme, stessa matrice, stessi colori). **Rifatta il 25/10/2026** (Maurizio, sulla prima versione 3D del 24/10: «non gira in modo
  simmetrico e poi vorrei qualcosa di più moderno ed energico»). La prima versione (tubi di plastica a 18 strati, inclinazione che respira e precede di lato,
  velocità che varia, galleggiamento) è nella cronologia di git (PR #138): **non va rimessa**, è quella che non è piaciuta.
  - **Il moto è simmetrico, ed è la regola che decide tutto il resto.** L'inclinazione è **fissa e verticale** (27 gradi: la scena a destra è lo specchio di
    quella a sinistra), il giro è **a velocità costante** (40 gradi al secondo, esatti), e l'unico moto in più è un **battito** (1,2% della grandezza) che si
    ripete **tre volte a giro**, quanto le frecce: ogni 120 gradi (`PERIODO_S`, 3 s) la ruota è identica a com'era. **Niente può rompere questa simmetria**:
    né una rotazione di lato (`rotY`), né un'oscillazione dell'inclinazione, né una velocità variabile, né un galleggiamento. Nella prima versione la
    rotazione di lato arrivava a 12 gradi, cioè a 12 punti di scarto fra destra e sinistra (misurato). Chi vuole altro movimento deve prima chiedersi se lo
    stesso, a 120 gradi di distanza, ricompare uguale.
  - **Il disegno è una cometa** (`ruotaForme.ts`): ogni freccia è un solo poligono con la coda sottile che **sfuma nel nulla** (gradiente lineare lungo la
    corda dell'arco, che per un arco sotto i 180 gradi cresce sempre dalla coda alla testa), il corpo che si allarga e una **punta netta**, larga 1,6 volte il
    corpo, in una tinta più calda (`chiaro`: 34% di bianco). La direzione del moto si legge da sola (la coda sta dietro) e la ruota sembra più veloce di
    quanto giri. Le tre frecce sono la stessa forma ruotata di 120 gradi (provato sui vertici).
  - **Il 3D** (invariato nell'idea): una **pila di dodici View**, ognuna con una **matrice 4x4 con prospettiva** (inclinazione + giro, alzata lungo la normale
    del disco): la base (il binario tenue, l'alone e il lampo delle teste), **dieci pareti** scure che danno lo spessore (10 punti) e la faccia (colore del
    brand, luce calda sulla testa, un filo di riflesso lungo il bordo esterno). Niente librerie 3D né canvas. Sotto, l'ombra a terra; sopra, le tre etichette
    **piene** (colore della freccia, testo bianco, un'ombra colorata) che restano diritte e seguono la profondità, e «Equilibrio» fermo al centro.
  - **L'alone** (`Base`): sullo scuro un bagliore (nove pennellate larghe e debolissime a passi di 3 punti, più un gradiente radiale attorno a ogni testa);
    sul chiaro uno più stretto e tenue (cinque pennellate). **Perché così**: una pennellata sola, larga, ha il bordo netto e la testa tonda («una bolla»);
    a passi grandi si vedono i gradini come curve di livello; e su fondo bianco un colore sotto un altro diventa una sbavatura grigia. Le **pareti**
    cominciano più avanti della faccia (`ALFA_PARETE`): con la stessa sfumatura, dove la faccia è quasi trasparente (la coda) le pareti scure si vedevano
    più di lei, come una macchia.
  - **Fluida.** Un solo orologio (`useFrameCallback`) somma i secondi veri fra un fotogramma e l'altro (al massimo 50 ms, per non saltare dopo una pausa) e da
    quel numero discende tutto, in `scenaDa(s)`: nessun tween che riparte, nessuno scatto al giro, e **niente passa da React** (i dischi, le etichette e
    l'ombra sono `useAnimatedStyle` che leggono un solo `useDerivedValue`). L'orologio si **ferma quando la scheda non è in primo piano** (`useIsFocused`) e
    riprende da dove era. **All'apertura la ruota «atterra»** in 1,4 s (parte più inclinata, più piccola e più bassa, gira in più di un tratto che si spegne,
    e si assesta): è l'unica parte non periodica.
  - **La matrice si chiama `matrix3d` sul web e `matrix` sul telefono** (`MATRICE`): react-native-web trasforma `matrix` in `matrix(...)`, che in CSS vuole
    6 numeri e non 16; React Native non conosce `matrix3d`. Il tipo di React Native non ha `matrix3d`, quindi c'è un `as unknown as ViewStyle['transform']`
    (`conMatrice`). Le funzioni di `ruota3d.ts` hanno la direttiva `'worklet'`: chi ne aggiunge una che `useAnimatedStyle` chiama, la deve mettere anche lì.
  - **Geometria di base invariata**: raggio, centro e `SPICCHI` (lo usa `ui/IconaRuota.tsx`, l'icona della barra delle schede, che non gira e non è cambiata:
    ha ancora le frecce piatte di prima, non le comete). Il riquadro è sempre 220×220; le etichette e l'alone ne sporgono di qualche punto, nessun
    contenitore taglia (`Entra` non ha `overflow`). **Con «riduci movimento» è ferma**, in posa (`POSA_FERMA_S`), senza arrivo e senza orologio.
  - **Costo**: dodici View composte (ognuna con un `Svg` statico), aggiornate a ogni fotogramma solo nella trasformazione. La prima versione ne aveva 18.
    Le pareti sono `PARETI`: con meno si vedono i gradini sulle punte (provato con 7: si vedono a 4×).
  - **Provato.** Le due parti pure con `node --experimental-strip-types` (16 gruppi): la proiezione della matrice coincide con un calcolo indipendente
    su 200 pose a caso; **simmetria allo specchio** (la scena a +g è lo specchio di quella a −g: 200 punti, 50 istanti; **provata per mutazione**: con una
    rotazione di lato di 5 gradi lo scarto è 5 punti, con 12 gradi è 12); **periodo di un terzo di giro** (punti ruotati di 120 gradi, 100 istanti); velocità
    esattamente 40 gradi al secondo a regime e mai all'indietro, arrivo compreso; battito dentro l'1,2%; nessun salto in 1 ms; inclinazione fissa a regime;
    la forma delle tre frecce è la stessa ruotata di 120 gradi (tutti i vertici), il profilo della coda, la punta all'angolo giusto, le alette più larghe del
    corpo, il poligono semplice (nessun lato ne incrocia un altro). `tsc` pulito. **In Chromium** (bundle web esportato, pagina provvisoria poi tolta;
    390 px a densità 3, tema chiaro e scuro, e 4× per guardare da vicino): 60 fotogrammi al secondo in 6 secondi, 95° percentile 16,8 ms, nessun fotogramma oltre,
    nessuna *long task*, tutti i dodici dischi aggiornati a ogni fotogramma, nessun errore in console; «riduci movimento» ferma le matrici. Registrati due video
    (chiaro e scuro) per il giudizio sul moto. **Non provato**: un telefono vero (Safari da PWA su iPhone, dove Chromium software è un'altra cosa), **l'app
    nativa** (la `matrix` con prospettiva su iOS e Android, le worklet su thread UI, e `boxShadow` con colore esadecimale a 8 cifre sulle etichette sono
    scritti secondo la documentazione, non visti girare), la schermata vera dietro il login, la pausa quando si cambia scheda (`useIsFocused`) e come
    l'alone si legge su un telefono con schermo OLED a luminosità bassa. Se su iPhone il lato vicino fosse sfocato (il browser rasterizza ogni disco a una
    scala sola) o l'alone troppo forte, è il primo posto da guardare. **I numeri da giudicare a occhio** sono costanti in cima a `ruota3d.ts`:
    `GIRO_S` (9 s), `INCLINAZIONE` (27 gradi), `BATTITO` (1,2%).
- **Poi l'Athlon Health Score** (`fit/Punteggio.tsx`, sezione sotto): il punteggio da 0 a 100 sui tre pilastri, con l'anello a tre settori e il dettaglio in
  `/allenamento/punteggio`. **Subito sotto il titolo una riga dice da dove arriva** (24/10/2026, richiesta di Maurizio: «chi accede all'app e non ha mai messo nessun
  dato trova comunque le lezioni registrate e un punteggio relativo alle lezioni», `DaDoveArriva`): «dalle lezioni che hai fatto (ne risultano N registrate nelle ultime
  4 settimane), dagli allenamenti registrati e poi da Food e Relax, se li usi» (24/10/2026, ritoccata su richiesta di Maurizio). **N lo conta l'app** dalle
  sessioni con `fonte = 'lezione'` (le presenze segnate dalla reception, le stesse del punteggio) nelle quattro settimane del calcolo; senza lezioni la riga c'è lo stesso,
  senza il conteggio; dove Food e Relax non esistono (vista cliente, minorenni) la coda «e Food e Relax se li usi» non compare. **Solo sulla carta di Fit**, non sulla
  schermata del dettaglio, che ha già «Come si calcola». Chi non ha ancora niente di registrato legge sotto i pallini «Ancora nessuna lezione o allenamento registrato:
  dal primo, il punteggio comincia a salire» (`fraseTrain`, prima ripeteva quello che ora dice la riga in cima).
- **Poi l'introduzione, come seconda carta** (`fit/Intro.tsx`; 24/10/2026, richiesta di Maurizio: la descrizione dell'Athlon Health System viene subito
  dopo il punteggio): il benessere come equilibrio di allenamento giusto (Train), buona
  alimentazione (Food) e recupero (Relax: sonno e giorni di riposo, senza una sezione sua), cosa fa il Balance e, in un pannello che si apre, come leggere i
  numeri (`ComeLeggere` in `fit/Balance.tsx`, lo stesso testo in fondo alla schermata di Balance). **L'ordine su Fit** (`schede/Schede.tsx`) è: ruota, punteggio,
  introduzione, «Il tuo corpo», Balance. Su schermo largo (da 900 px) l'introduzione sta a sinistra e, a destra, corpo e Balance in colonna.
- **Poi «Il tuo corpo»** (`fit/Corpo.tsx`, dettaglio in `/allenamento/misure`). **Su Fit si presenta compresso** (24/10/2026, richiesta di Maurizio, come il Balance):
  il titolo e una riga che dice cosa c'è di là («Qui trovi le tue misure: aggiornale e consulta come cambiano nel tempo»); **le cifre compaiono toccando**
  (la carta si apre e si chiude, la freccia gira) e, aperta, c'è il tasto «Apri il dettaglio». **Senza misure non si apre: è una call to action** (24/10/2026, richiesta
  di Maurizio): la riga sotto il titolo diventa «Inserisci qui i tuoi dati per avere il consumo calorico delle lezioni e dei tuoi allenamenti», sotto una riga che dice cosa
  serve (peso, altezza, età e sesso: sono i quattro dati delle stime, vedi «Le calorie di una lezione») e il pulsante «Inserisci i tuoi dati», pieno e nell'arancio del club,
  che porta a `/allenamento/misure` (come il tocco sulla testata; il vecchio «Aggiungi le tue misure» dentro l'accordion non c'è più). **Senza il consenso alle misure**
  è la stessa carta, con in più il testo sul consenso: il pulsante porta alla pagina dell'informativa, dove il consenso si dà e si inseriscono i dati.
  Aperta: peso con la variazione degli ultimi 90
  giorni, BMI con la fascia, massa grassa (o la vita). Sta in alto e non in Train perché non è del solo allenamento: è il
  punto di partenza (stima le calorie) e la verifica dell'equilibrio. Le misure di composizione corporea che arriveranno
  (una bilancia BIA, per esempio) si aggiungono qui. **La fascia del BMI non usa i nomi dell'OMS** (`fasciaBmi` in
  `lab/dati/calcoli.ts`): su richiesta del club niente «Sottopeso», «Sovrappeso» o «Obesità» davanti al socio, ma
  *Leggero · Equilibrio · Un po’ sopra · Da bilanciare* (le soglie sono quelle di sempre: 18,5 · 25 · 30). Le parole stanno
  in una casella da una riga e sotto i 72 pt (11,5 pt SemiBold) non si troncano su un telefono da 375 pt.
  *Provato (24/10/2026)*: `tsc` pulito e, in Chromium (bundle web esportato, funzioni simulate con `page.route`; 390 px chiaro e scuro, 1280 px), l'ordine delle carte,
  il corpo compresso che si apre e si chiude (e con la carta aperta il Balance scende), «Apri il dettaglio» che porta a `/allenamento/misure`, nessuno scorrimento
  orizzontale, nessun errore di pagina. **Rifatto lo stesso giorno per la riga «da dove arriva» e per l'invito del corpo** (34 controlli in tutto, 390 px chiaro e scuro,
  1280 px, italiano e inglese, con la funzione delle presenze simulata con 0, 1 e 3 lezioni): la riga sta subito sotto il titolo e conta le lezioni («ne risultano 3 registrate»,
  «ne risulta 1», nessun conteggio a zero), l'anello non è a zero con le sole lezioni (52 su 100 con tre lezioni in due settimane), senza misure e senza consenso la riga
  sotto il titolo è l'invito e non c'è l'accordion, il pulsante e la testata portano alle misure. **Non provato**: un telefono vero, e dati veri con una sessione vera. Con tre cifre su 390 px «MASSA GRASSA» va su due righe nel Chromium di prova: le cifre non sono state ritoccate.
- **Balance** (`fit/Balance.tsx`, conto in `fit/bilancio.ts`, schermata `/allenamento/balance`): **su Fit si presenta chiuso** (20/10/2026, richiesta del club:
  titolo, «consumate e mangiate» e due righe che dicono cos'è; **i dati compaiono solo toccando**, e aperto ha il tasto «Apri il dettaglio»; sulla sua
  schermata è sempre aperto): le calorie consumate
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

- **Relax c'è per tutti i maggiorenni** (`relaxAperto` in `useDispositivi.ts`, dal 20/10/2026: prima compariva solo dove un fornitore era
  disponibile o c'era un consenso). Il sonno si scrive anche a mano (`fit/CheckInSonno.tsx`, vedi l'Athlon Health Score sotto), quindi la scheda
  non dipende dal possedere un anello; **i dispositivi sono un modo in più di riempirla**, e la carta «Hai un anello o un orologio?» compare solo se
  almeno un fornitore è disponibile (`dispositiviCollegabili`). Nella vista cliente dello staff non si apre e **non si chiama la funzione**.
- **Consenso prima di tutto** (`Vetrina.tsx`, testo in `informativa.ts`): senza, niente si collega. **Cambiando il testo si cambia
  `VERSIONE_INFORMATIVA` qui e nella funzione**: la sezione si richiude e il socio riaccetta. La revoca (in fondo a `Dispositivi.tsx`) scollega
  tutto e cancella i dati (**comprese le notti scritte a mano**). Solo maggiorenni. L'informativa va fatta rileggere al consulente privacy prima di aprire a tutti.
  Dal 20/10/2026 (`VERSIONE_INFORMATIVA = '2026-10-20'`, qui e nella funzione) il testo dice anche del sonno scritto a mano e dell'Athlon Health Score.
- **Il ritorno dal fornitore arriva su `/allenamento/dispositivi?code=…&state=…`** (è il redirect URI registrato presso Oura e Polar): la
  schermata manda codice e state a `completa` con la sessione del socio e **toglie subito i parametri con `router.setParams`, non con
  `replace`** (un replace rifà la schermata da capo e l'avviso «Oura collegato» andrebbe perso: si è visto nel browser). Se il socio annulla
  il fornitore rimanda `error`: nessuna chiamata, solo un avviso. La pagina aspetta la sessione (`useSessione`) prima di leggere l'indirizzo.
- **Sul web si lascia l'app per il sito del fornitore e si torna** (`window.location.assign`, come per i pagamenti). Nell'app nativa si apre il
  browser (`Linking.openURL`) e il ritorno si completa nel browser, **dove la sessione potrebbe non esserci**: da provare su una build nativa
  prima di offrirlo lì.
- **Descrive, non consiglia.** Niente frasi su cosa fare in base ai numeri, niente obiettivi (gli anelli e le colonne del sonno sono in scala
  0-10 ore, non c'è un «8 ore» da riempire; **il solo posto dove «7 ore» pesa è l'Athlon Health Score**, dove una notte da 7 ore in su vale il massimo:
  è una soglia del punteggio, non una frase rivolta al socio, e l'ha chiesta il club), parole morbide per il recupero (`recupero()` in `comune.ts`: ottimo, buono, discreto, «da
  ricaricare»; mai un allarme) con il numero del fornitore sempre accanto («88 su 100», «4 su 6»), e la nota «valori indicativi del tuo
  dispositivo, non un parere medico». I dati del dispositivo **non entrano nel contatore delle calorie né nel Balance**: un allenamento fatto
  in app e uno registrato dall'orologio rischiano di contare due volte la stessa ora; se il club lo vuole, si decide come evitarlo prima.
- **I dati li legge `useDispositivi`** (memoria `dispositivi:stato` e `dispositivi:dati`, rilettura a ogni ritorno su Fit). Dopo una
  scrittura la schermata si aggiorna dalla risposta (`imposta`), dopo un consenso o una revoca rilegge tutto (`rileggi`, con una lettura
  esplicita: non ci si affida al rinfresco del focus, che qui non ripartiva).

## L'Athlon Health Score: un punteggio da 0 a 100 sui tre pilastri, regolarità e non volume

Richiesta del club (20/10/2026): in Athlon Health System un punteggio che dica **come stai andando**, come fa Move di Technogym (non si chiama
così: è un marchio). Cartella `src/features/lab/fit/`: `calcoloPunteggio.ts` (il calcolo, **puro**), `usePunteggio.ts`, `Punteggio.tsx` (la carta in
cima a Fit, l'anello a tre settori e la schermata `/allenamento/punteggio`), `CheckInSonno.tsx`. Il lato server (il sonno scritto a mano) è nel
`CLAUDE.md` di APP-ATHLON, «I dispositivi dei soci». **Non si salva niente**: si ricalcola a ogni apertura da quello che Fit e Relax già leggono.

- **Tre pilastri, 70 + 15 + 15.** Train fino a 70 punti, Food fino a 15, Relax fino a 15: **il 100 serve tutti e tre**. Un pilastro non attivato non
  toglie niente, semplicemente non aggiunge, e il suo posto resta visibile («Con Food e Relax puoi arrivare fino a 100»).
- **Le ultime quattro settimane, mobili** (non da lunedì a domenica: il lunedì non riparte da zero e una settimana storta non azzera): ogni pilastro è la
  media pesata di quattro blocchi di 7 giorni, 40% il più recente, poi 30, 20 e 10. **I blocchi prima della prima attività registrata non contano**
  (chi comincia adesso non parte penalizzato) e la schermata dice su quante settimane è calcolato.
- **Train conta i giorni attivi, non le sedute**: un giorno è attivo con almeno 20 minuti fra le sedute dei piani chiuse nell'app e le lezioni con la
  presenza segnata dalla reception (le stesse fonti del contatore, ma **senza peso, altezza e sesso**: il punteggio non stima calorie; per questo
  `useFit` espone `sessioni`). Due lezioni lo stesso giorno valgono una volta, ed è anche per questo che un domani gli allenamenti di un orologio si
  potranno unire per giorno senza contarli due volte. **La curva premia il ritmo costante**: 2-4 giorni su 7 è il massimo, con 1 si prende il 40%,
  oltre i quattro scende di un decimo al giorno (con 7 su 7, il 70%), mai sotto. «Più lezioni ti penalizza leggermente, non ti dà punti»: è così.
  **Limite noto**: chi si allena in sala senza chiudere la seduta nell'app non compare (gli ingressi in palestra sarebbero la terza fonte: non
  verificato se il database li ha); se la reception non segna una presenza, quella lezione non c'è.
- **Food guarda i pasti, non le calorie**: un giorno vale se nel diario ci sono colazione, pranzo e cena (chi ha risposto «quasi mai» a «Fai colazione?»
  basta pranzo e cena), 5 giorni su 7 danno il massimo, e **oggi non conta** (non è finito). Niente macro, niente soglie: il club non ha un
  nutrizionista. **Chi ha nascosto i numeri in Food (o ha detto che contare lo mette a disagio) esce dal conto**: il punteggio si rapporta ai pilastri
  che restano e non c'è nessun invito a tornarci.
- **Relax guarda le notti**: ogni notte (scritta a mano o letta dal dispositivo) vale in base alle ore (7 o più = 1; 6 = 0,7; 5 = 0,4; meno = 0,2; una
  notte più lunga non costa punti) e 5 notti su 7 danno il massimo. Per la stessa notte vale il dispositivo, non quella scritta a mano. **Il pilastro
  si chiama ancora Relax** (la ruota, l'introduzione e l'indirizzo lo usano): il sonno è il suo primo strumento, non il suo nome.
- **Il check-in del sonno** (`CheckInSonno.tsx`, in cima a Relax): «a che ora sei andato a dormire e a che ora ti sei svegliato?», due tasti a un quarto
  d'ora che **tenuti premuti scorrono** (e passano la mezzanotte), la notte fra le ultime sette, di partenza le ore dell'ultima notte scritta (o 23:00 e
  07:00): **niente si salva da solo**, conta quando si preme «Salva». **La durata si ricava dalle due ore** (la ricalcola anche la funzione; da 2 a 16
  ore). Sta nella stessa tabella dei dispositivi con `fornitore = 'manuale'`; stesso consenso, stessa revoca.
- **Le parole sono morbide** (`Banda`: «Si comincia», «Sulla strada», «Buon ritmo», «Ottimo ritmo», e «In equilibrio» quando tutti i pilastri in gioco
  sono almeno al 60%), mai un allarme, mai un confronto con altri soci, nessuna classifica (con l'alimentazione sarebbe pericolosa), nessun premio.
- **Dove un pilastro non esiste** (vista cliente dello staff, minorenni) resta il solo allenamento, in settantesimi («70 su 70»), senza inviti.
- **Le soglie sono nostre** (20 minuti, 2-4 giorni, 5 giorni di diario, 7 ore, i pesi delle settimane) e vanno fatte validare dal Direttore Tecnico;
  le 7 ore per gli adulti sono la posizione comune delle società scientifiche, ricordata e non riletta alla fonte. **Dare punti per il consenso a dati
  sulla salute** (Food e Relax) è una scelta del club da far rileggere al consulente privacy: il punteggio senza di loro resta sensato (fino a 70).
- **Da fare, non fatto**: **il calcolo dei punti nel server** (se il club vuole premi: oggi li calcola l'app, vedi i livelli); gli ingressi in sala come terza fonte di Train; gli allenamenti di Oura e Polar (si uniscono per giorno); Apple Salute e Health
  Connect (build nativa, vedi `docs/analisi-wearable-salute.md`); un grafico storico (oggi si ricalcola dalle fonti: se il club vuole l'andamento nel
  tempo o le classifiche serve salvare uno snapshot, e allora è un lavoro del server); la regolarità dell'ora in cui si va a dormire (le due ore ci sono).

### Il Train in profondità: «Il tuo allenamento» (20/10/2026)

Dal pilastro Train del dettaglio («L'analisi del tuo allenamento») si apre `/allenamento/training` (`fit/Training.tsx`, calcolo **puro** in `fit/analisiTraining.ts`): le
stesse quattro settimane del punteggio viste da vicino. Quanti giorni e quante sessioni (e a settimana), le ore, **di che tipo** (sala o lezioni; le lezioni per categoria e
per nome), **quando** (che giorno della settimana e che parte della giornata, a Roma), **la sala** (serie, chili sollevati, esercizi, e il confronto fra gli ultimi 7 giorni e la media
delle tre settimane prima), **il riposo** (giorni senza allenamento, pausa più lunga, da quanto non ci si allena) e **le calorie** dell'allenamento (settimana per settimana e per
tipo, dalle voci del contatore: servono peso, altezza, età e sesso, altrimenti la schermata lo dice e porta a «Aggiungi i tuoi dati»; rimanda al contatore e al Balance, che restano
com'erano). Le «frasi» in cima («In breve») sono scritte dal codice: **descrivono, non danno consigli** (una prova controlla che non ci siano «dovresti», «devi», «prova a»). La sola soglia
è quella del punteggio: 2-4 giorni su 7. Per questo `Sessione` (da `sessioniDa`) porta nome, categoria, orario, serie, chili ed esercizi, e il resto del punteggio usa solo `SessioneBase`.

### I livelli: punti che si accumulano, e un equilibrio che li tiene attivi (20/10/2026)

Richiesta del club: oltre al punteggio (come stai andando adesso) un percorso a livelli, **Legno, Bronzo, Argento, Oro, Platino, Diamante**, che dia sempre qualcosa: ogni allenamento fa salire i
punti, e il livello si mantiene finché c'è l'equilibrio. Calcolo puro in `fit/calcoloLivelli.ts`, interfaccia in `fit/Livelli.tsx` (la medaglia, l'**anello di sei segmenti**, una per livello, che si
riempie, la riga della carta di Fit e il dettaglio), registro in `fit/useLivelli.ts` e `src/api/livelli.ts`. Lato server (`portale-lab-livelli`, tabella `athlon_punti_settimane`): `CLAUDE.md` di APP-ATHLON.

- **I punti si accumulano e non tornano indietro.** Una settimana finita (lunedì-domenica) dà i punti dei tre pilastri, con le regole del punteggio ma su quella settimana sola: Train fino a 70 (la stessa curva: **un solo
  allenamento fa comunque 28**, con 2-4 giorni 70), Food fino a 15, Relax fino a 15. In più due premi che si leggono dal registro: la **costanza** (+5 per ogni settimana di fila nel ritmo giusto dopo la prima, al
  massimo +20) e l'**equilibrio** (+10 se tutti i pilastri che si usano sono almeno al 60%). Una settimana vale al massimo 130.
- **Le soglie**: Legno 0, Bronzo 150, Argento 500, Oro 1200, Platino 2400, Diamante 4200. Per un socio sempre nel ritmo giusto, con il solo Train: Oro in circa 14 settimane, Platino in 27, Diamante in 47; con i tre pilastri: 10, 19 e 33.
  **Nomi, soglie e premi sono miei da far validare al club**: stanno in `LIVELLI`, `BONUS_COSTANZA` e `BONUS_EQUILIBRIO`.
- **Il registro sta nel server perché i dati vecchi escono dalle finestre di lettura** (le presenze arrivano a 12 settimane, il diario a 31 giorni, il sonno a 30) e i punti non devono sparire. L'app, aprendo il
  punteggio, calcola le **ultime 4 settimane finite** (le stesse del punteggio: è «il punto di partenza», la prima volta; poi ogni apertura aggiunge le nuove) e manda quelle in cui i punti sono di più di quelli
  registrati; il server non li fa mai scendere. **I punti li calcola l'app**: un socio potrebbe gonfiare i propri. Finché i livelli sono un gioco va bene; **se il club ci attacca dei premi, il calcolo va spostato nel server**.
  Chi apre l'app meno di una volta ogni quattro settimane perde le settimane in mezzo.
- **Per mantenere il livello serve l'equilibrio**: il livello si raggiunge coi punti e **non si perde mai**, ma è «attivo» solo se il punteggio di adesso è almeno al 50% di quello possibile (`SOGLIA_MANTENIMENTO`);
  sotto è **«in pausa»** (la medaglia si spegne un po', c'è scritto «IN PAUSA» e cosa lo riattiva) e torna attivo da solo. Mai una retrocessione, mai un allarme: i punti restano tuoi.
- **Food e Relax sono dati sulla salute**: i loro punti nel registro esistono solo con un consenso vivo **alla versione corrente dell'informativa** (la funzione li tiene a zero senza), e **la revoca di Food o dei dispositivi li azzera** (`portale-lab-alimentazione` e
  `portale-lab-dispositivi`). I punti di Train non dipendono da nessun consenso. In vista cliente i livelli non si vedono e la funzione non si chiama.
- **Dove la funzione non c'è ancora (404) i livelli non compaiono**: il punteggio resta com'era. L'app può uscire prima della funzione senza rompere niente.
- **Descrive e incoraggia, non confronta**: nessuna classifica, nessun confronto con altri soci, nessun premio (con l'alimentazione sarebbe pericoloso).

Per verificare: `npx tsc --noEmit` ha **32 errori di base** che non sono nostri (nella cartella `schede` ci sono `ContatoreCalorie.tsx` e
`contatoreCalorie.ts`, che il compilatore su macOS confonde: ogni import di `useProgresso`, `useVisibile` ecc. «dal maiuscolo» ne fa tre in più, anche in
`Punteggio.tsx`, `Livelli.tsx` e `Training.tsx`: nove in tutto); **non vanno aggiunti altri**. **Due file non possono chiamarsi uguale a meno delle maiuscole** (`punteggio.ts` e `Punteggio.tsx`: per questo i
calcoli si chiamano `calcoloPunteggio.ts` e `calcoloLivelli.ts`). `calcoloPunteggio.ts`, `calcoloLivelli.ts` e `analisiTraining.ts` si provano con `npx tsx` (curva, finestre, esclusioni, e su 200 casi a caso che i
punti dei pilastri sommano al totale; soglie dei livelli, costanza e serie interrotte, equilibrio, quali settimane registrare; ora e giorno a Roma, sala, riposo, calorie, e che le frasi non diano consigli). **La schermata si guarda renderizzata** (390 e 800 px, chiaro e scuro): con la funzione simulata (un piccolo
server che risponde alle `portale-lab-*`, sessione di prova nel `localStorage` e `.env.local` con `EXPO_PUBLIC_SUPABASE_URL` locale) si sono provati: tutto
al massimo (100, «In equilibrio»), senza consenso a Food e Relax (70 con l'invito), Food nascosto (rapportato, nessun invito), minorenne (70 su 70), il check-in
(salvataggio, «Cambia», «Togli», scorrimento a tasto premuto oltre la mezzanotte) e il dettaglio. **Non provato**: una sessione vera, un telefono, la
funzione vera (migrazioni e funzioni sono in produzione dal 20/10/2026, ma nessuna è stata provata con una sessione vera).

## La privacy dell'Athlon Health System: tre consensi, un'informativa generale, e niente premi legati ai dati sulla salute

Analisi del 20/10/2026, scritta anche come documento per il consulente privacy del club («Athlon Health Score: analisi privacy», Claude Docs di Maurizio). Il lato server (tabella dei consensi, funzioni, versioni da far
combaciare, ordine di pubblicazione) è nel `CLAUDE.md` di APP-ATHLON, «I consensi dell'Athlon Health System».

- **Cosa chiede consenso e cosa no.** Train (sedute chiuse, presenze, punti e livelli) non chiede un consenso speciale: contratto e informativa generale. **Food** (diario, questionario, foto), **Relax** (sonno e dispositivi) e
  **le misure del corpo** sono dati sulla salute (art. 9 GDPR) e hanno **un consenso esplicito ciascuno**, chiesto la prima volta che si usa la funzione (non all'accesso: mescolerebbe scopi diversi), con una versione e una
  revoca che cancella.
- **All'accesso solo un link, non un consenso.** `Accesso.tsx` e la riga «Informativa privacy» del Profilo aprono l'informativa del club (`PRIVACY_URL` di `lib/guestPass.ts`, athlonroma.it/privacy: titolare Società
  Sportiva Dilettantistica Point 2000 SSD). Nessuna casella: all'accesso si dà solo l'email, per farti entrare. **L'informativa del club non cita ancora il benvenuto con l'AI né Food, Relax e le misure**: va aggiornata dal
  consulente.
- **Le misure del corpo hanno il loro consenso** (`dati/informativaCorpo.ts` per il testo e la versione, `dati/ConsensoCorpo.tsx` per la pagina e per l'informativa e la revoca in fondo). Senza consenso la funzione non restituisce
  le misure (`consenso: null`): **«Il tuo corpo» mostra la pagina del consenso al posto dei dati**, la carta in cima a Fit invita a darlo (`CartaCorpo`, `senzaConsenso`), e le stime che dipendono da peso e altezza dicono
  «mancano dati» e portano a «Il tuo corpo», dove c'è il consenso. **Con una funzione che non lo conosce ancora il campo `consenso` non c'è** (`undefined`): nessun blocco e nessun comando di revoca, così l'app può uscire
  prima della funzione. Dopo il consenso o la revoca si butta la memoria del laboratorio (`dimentica`). La revoca cancella le misure e il sesso che il socio ha scritto; quelle della segreteria restano.
- **Food, informativa 2026-10-20**: dice che il diario alimenta il punteggio e i livelli (i giorni in cui sono scritti i pasti principali, non cosa si è mangiato), e che i punti si conservano. **Prima il punteggio usava il
  diario senza che il testo lo dicesse**: chi aveva accettato la versione del 19/10 riaccetta. Cambiando il testo si cambia `VERSIONE_INFORMATIVA` qui e in `_shared/alimentazione/versione.ts`.
- **Regola: nessun livello, soglia o premio dipende dal consenso a Food, Relax o alle misure.** Un consenso che si dà per non perdere un vantaggio non è libero (art. 7, par. 4; considerando 42-43). Oggi i livelli si
  raggiungono anche con il solo Train, più lentamente (Oro in circa 14 settimane invece di 10, Platino 27 invece di 19, Diamante 47 invece di 33): va mantenuto. **I punti di Food e Relax si contano solo con il consenso alla
  versione corrente** e si azzerano alla revoca.
- **Classifica e premi: decisione del club, nulla costruito.** Un piccolo gioco interno che incentiva lo stile di vita: **premi a soglia** (chi raggiunge un traguardo), **nessuna classifica pubblica, nessuna estrazione**.
  Prima di qualunque premio: il calcolo dei punti **nel server** da fonti che il socio non scrive (sedute chiuse, presenze della reception) — oggi li calcola l'app e sonno e diario sono dichiarati dal socio —, una misura
  sola (i punti di allenamento), l'Athlon Health Score che resta privato del socio, lo staff che vede solo «traguardo raggiunto», un regolamento di una pagina, solo adulti. Una gara su cibo e sonno può spingere chi è fragile
  a comportamenti scorretti, e una classifica espone nome e punteggio di una persona: se un giorno si vuole, è un consenso a parte (opt-in con un'anteprima di come si apparirà). **Dal 29/10/2026 la classifica mensile esiste (lato app) e segue questo disegno**: consenso a parte, anteprima di come si appare, nessun premio; vedi la sezione «La classifica mensile» in fondo. Il DPR 430/2001 (concorsi a premio) va
  fatto confermare dal consulente.
- **Da fare, non fatto**: valutazione d'impatto (art. 35), accordi con i fornitori e trasferimenti extra-UE, conservazione del registro dei punti, esportazione dei dati (art. 20), proporzionalità del questionario di
  Food, e i minorenni per le misure (il consenso non controlla l'età).

Per verificare: `npx tsc --noEmit` senza errori nuovi (41 di base). **Provato nel browser con la funzione simulata**: la pagina del consenso (la casella accende il pulsante, il consenso manda la versione corrente e rilegge),
«Il tuo corpo» con i dati e in fondo consenso e revoca (la conferma, e dopo la revoca la pagina del consenso), la funzione vecchia senza il campo `consenso` (nessun blocco, nessun comando), la carta in Fit con l'invito, la
nuova informativa di Food (versione del 20/10/2026 e il punteggio nel testo) e il link all'informativa nell'accesso. **Non provato**: la riga «Informativa privacy» del Profilo (la Home non si simula), un telefono, e le funzioni
vere con una sessione vera.

## Il feedback dei tester: una carta in Home, e il foglio per scrivere

Richiesta di Maurizio (20/10/2026). Un invito ai tester a dirci come sta andando, cosa suggeriscono e che problemi hanno avuto. Toccato, sale un foglio con un campo di testo e, se serve, fino a tre allegati.
**Dal 30/10/2026 l'invito è una carta della Home** («Aiutaci a migliorare l'app», `home/CartaFeedback.tsx`, al posto di «Cerchi qualcosa?»: «Sei un tester? Se hai segnalazioni, suggerimenti o problemi, lasciali qui…»), e **non più la pillola «Feedback» in alto a destra**, che
è passata all'assistente (sezione sotto). Il foglio, i limiti, gli allegati e la funzione sono quelli di prima: è cambiato solo da dove si apre. Il messaggio arriva nella sezione **Tester app** del CRM, che e' anche dove si aggiungono i tester: funzione
`portale-lab-feedback`, tabella `portale_feedback`, bucket privato e tutto il resto nel `CLAUDE.md` di APP-ATHLON («I tester dell'app»). Cartella `src/features/lab/feedback/`, API `src/api/feedback.ts`.

- **Il posto.** La carta sta nella Home, **sotto il messaggio di benvenuto** (dove stava la carta dell'assistente), con il fumetto, il titolo, due righe e «Lascia un feedback». **Solo in Home**: nelle altre schermate non c'è un modo di scrivere un feedback (prima la pillola era
  ovunque). Se serve di nuovo ovunque, il foglio (`FoglioFeedback`) si può aprire da qualunque posto con `useFeedback`: non è stato fatto perché il posto in alto a destra ora è dell'assistente.
- **Solo per chi usa l'app da tester.** Il portale e' aperto solo ai tester e il layout lo monta solo con una sessione: senza accesso (e nelle pagine pubbliche `/r/<token>`, `/richiesta`) non c'e'.
  **In vista cliente non c'e'** (`vistaCorrente()`): chi guarda l'app di un cliente non scrive feedback al suo posto, e la funzione risponderebbe 403 (non e' fra le letture).
- **Il foglio** (`FoglioFeedback`): «Come sta andando?», una guida di cosa scrivere (come ti sembra l'app, un'idea o un suggerimento, un problema: cosa stavi facendo e cosa e' successo), le pillole **facoltative** «Come sta andando /
  Un suggerimento / Un problema / Altro» (si tolgono ritoccandole), il campo del messaggio (fino a 3000 caratteri; il conto compare dopo 2500) e gli allegati. **Il testo e' obbligatorio**, il resto no. Niente parte prima di
  «Invia il messaggio». Il foglio dice cosa arriva insieme al testo — **la schermata in cui si era e il dispositivo** — e chi lo legge («le persone del club che seguono i tester»).
- **La bozza non si perde.** Lo stato del foglio vive in `CartaFeedback` (`useFeedback`): chiudere per sbaglio, o un invio rifiutato (limite orario, rete, funzione non pubblicata), lascia
  testo, tipo e allegati dove stanno. Si svuota solo quando il messaggio e' partito; dopo il grazie il foglio torna com'era. **La bozza resta finche' la Home e' montata** (lasciarla per un'altra schermata non la smonta, sta sotto nella pila); uscendo dall'app si perde (non e' piu' montata in modo permanente nel layout, come la pillola).
- **La schermata che parte e' quella in cui si e' toccata la carta** (la Home, `/`), non quella in cui si preme «Invia» (`schermataDa`: il percorso senza parametri). Insieme vanno la piattaforma (`web`, `ios`, `android`) e il dispositivo
  (sul web quello che dice il browser, sul telefono sistema e versione); la funzione li ripulisce e, se mancano, prende il dispositivo dall'intestazione. **Non parte nessuna email e nessun id di persona**: la funzione ricava chi e' dalla sessione.
- **Gli allegati** (`allegati.ts`): si scelgono anche piu' d'uno insieme (`expo-document-picker`, `multiple`), **al massimo tre, JPG, PNG, WebP o PDF, 5 MB l'uno** (stessi limiti della funzione, che guarda i primi byte: qui servono a dirlo subito).
  **Sul web uno screenshot sopra 1,2 MB si porta a 1800 pixel in JPEG** (una PNG retina da 4 MB diventa circa 1 MB), solo se il risultato pesa meno; un PDF non si tocca. Nell'app nativa il file parte com'e' (ridurlo vorrebbe
  `expo-image-manipulator` e una nuova build, come per le schede). Il selettore non si aspetta con una rotellina (chi chiude la finestra senza scegliere non lascia traccia). Gli allegati che non vanno dicono perche', per
  nome, e **non restano**; se se ne scelgono piu' di quelli che restano, ne entrano tre e lo dice. Il foglio invita a coprire gli screenshot che mostrano **dati sulla salute** (diario alimentare, sonno, misure del corpo): lo staff
  non li vede per i consensi dell'app, e un'immagine non si controlla.
- **Cosa risponde quando non va.** Funzione non ancora pubblicata (404 senza il nostro corpo): «Il feedback non e' ancora attivo: riprova fra qualche giorno» (`src/api/feedback.ts`); limite orario o giornaliero (429), tipo o
  allegato non validi (400) e guasti arrivano con le parole della funzione.
- **L'app non riapre i messaggi.** Non c'e' uno storico da mostrare e nessuna risposta del club: il foglio non la promette.
- **Provato.** `npx tsc --noEmit` pulito. Le regole pure (`comune.ts`: tipo dell'allegato da mime ed estensione, posti, testo inviabile, peso, schermata) con `node --experimental-strip-types`. **A schermo, in Chromium** (bundle web esportato,
  funzioni simulate, nessuna richiesta fuori dal computer), 72 controlli: la pillola nel gutter di 18 punti e a meta' della barra col marchio (390), nella colonna da 1180 sullo schermo largo (1280), solo icona accanto al carrello dello shop e
  a 320 punti, e **di nuovo al suo posto quando dalla vetrina si va al carrello** (la vetrina resta montata sotto); il foglio vuoto e compilato (tipo che si sceglie e si toglie, «Invia» spento senza testo), gli allegati (screenshot grande ridotto
  a JPEG, PDF, tre file e il comando che si spegne, «Togli», `.txt` e file oltre 5 MB rifiutati con il motivo, quattro file scelti insieme), la bozza che resta dopo aver chiuso e dopo un errore 429, il payload che parte (azione, testo ripulito
  ai capi, tipo, schermata, piattaforma, dispositivo, nomi e base64 degli allegati, un JPEG vero, nessuna email, la sessione e nessuna vista cliente), il grazie e il foglio pulito alla riapertura, la schermata `/calendario` che parte da li', la
  funzione 404, tema chiaro e scuro; e **in vista cliente e senza accesso la pillola non c'e'**. In piu' tutte le rotte principali (22, con e senza accesso) senza errori di pagina, perche' `Schermata` (usata in 149 punti) ora legge se e' in vista.
  **Non provato**: un telefono vero (il selettore dei file e la fotocamera dell'iOS, il peso del base64 su una rete mobile), l'app nativa, e la funzione vera con una sessione vera (era simulata).

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

## I consigli di Athlon: le lezioni che potrebbero interessarti, e quando le trovi; sala e vasca portano al piano

Richiesta del club (20/10/2026), **rifatti il 21/10/2026** su richiesta di Maurizio: il Percorso (sezione sotto) era troppo complesso e la prenotazione dentro la settimana troppo stretta. Nella schermata
Train la carta che c'era (`CartaConsigli` in `schede/Schede.tsx`) porta ai **consigli** (`/allenamento/consigli`, cartella `src/features/lab/consigli/`). Il socio racconta **chi è e cosa gli piace**,
non i dati di una scheda, e riceve **le lezioni che potrebbero interessargli, perché, con le alternative e gli orari in cui le trova**. Non è un programma («oggi fai questo»): niente tappe, niente
editor, niente conferma, niente «Prenota la settimana». Funzione, controlli, quota e workflow: `CLAUDE.md` di APP-ATHLON (`portale-lab-percorso`, azioni `consigli_stato` e `consigli`).

- **Il questionario** (`Consigli.tsx`, parole e conti in `comune.ts`): **i tuoi obiettivi** (fino a tre, il primo è il principale), **la tua esperienza** (non ho mai praticato · ho praticato, poi ho
  smesso · mi alleno già), e per chi ha smesso **quando** e **cosa facevi**, per chi pratica **cosa fai**, e per tutti e due **com'è la tua forma oggi** (chi non ha mai praticato non lo dice: è un
  principiante); poi **cosa ti piace fare** (mente e corpo, forza e tono, cardio e musica, combattimento, lezioni in acqua, nuotare, sala pesi per conto mio), e chi sceglie «Nuotare» risponde **se sa
  stile libero e dorso** (sì: Nuoto Libero; non ancora: si parte dalla Scuola Nuoto Adulti); l'**intensità** che preferisce, quante volte pensa di venire, **quando gli piacerebbe venire** (giorni e
  fasce) e le lezioni da evitare, le limitazioni. Obbligatori solo un obiettivo, l'esperienza e la forma (o la risposta sul nuoto, per chi ha scelto «Nuotare»): sotto il pulsante si legge cosa manca.
- **Giorni e fasce non sono un vincolo, e la schermata lo dice**: le lezioni nei suoi orari vengono prima, e quelle adatte che si tengono in altri momenti restano, con la riga «Non nei giorni o negli
  orari che preferisci: te la proponiamo lo stesso». L'unico limite duro sono le lezioni che evita.
- **I consigli sono carte per tipo di lezione** (`CartaConsiglio`): il nome, categoria, durata e quante volte a settimana conviene, «Da acquistare» dove serve (**«Spesso al completo» non c'è**: tolta il 21/10/2026 su richiesta di Maurizio, anche dalle alternative; la funzione lo manda ancora in `spessoCompleta`), il perché (legato
  ai suoi obiettivi e gusti, senza numeri: li scrive il codice), **«La trovi di solito»** (gli orari ricorrenti in pillole, `OrariDiSolito`, quelli nelle sue preferenze per primi e in arancio), **le
  prossime lezioni** (le prime due, le altre con «Mostra altre») e **le alternative** in una riga che si apre, ognuna con i suoi orari e le sue lezioni. Con una funzione di prima gli orari non ci
  sono e la carta è quella di prima.
- **Sala e vasca: «In sala e in vasca, con il tuo piano»** (`BloccoSedute`, `CartaSeduta`). Dove serve — un lavoro di forza, un riscaldamento prima di una lezione, il Nuoto Libero come recupero —
  una carta dice cosa fare in due parole, perché, quante volte e **«Potresti metterla fra martedì e venerdì»**, e porta a **«Componi il tuo piano in sala / di nuoto»** (`/allenamento/agente?dove=…`,
  che si apre già in sala o in vasca: `Agente.tsx` legge `dove`) e a «Prenota un turno», il calendario sul primo giorno con turni e sull'attività (`?giorno=…&attivita=Gym Floor|Nuoto Libero`). **Qui non si
  scrivono esercizi**: il piano se lo compone il socio con il suo obiettivo. I turni di Gym Floor e di Nuoto Libero non sono più elencati qui: si prenotano dal calendario. La vasca c'è solo per chi sa
  stile libero e dorso; l'assistente di sala supervisiona le attività, non segue il socio.
- **Il personal trainer** (21/10/2026): nel questionario «Cosa c'è dietro ai tuoi obiettivi» (imparare a fare bene gli esercizi, ho una data in mente, ripartire dopo uno stop, restare costante, un lavoro su
  misura) sono le domande indirette; «Ti ha mai seguito un personal trainer?» (mai · in passato · sì, adesso) e «Ti piacerebbe allenarti con un personal trainer?» (no, grazie · mi incuriosisce · sì) quelle
  dirette. Se serve, i consigli hanno la carta **«Con un personal trainer»** (`CartaPersonal`): «Ti consigliamo N sedute al mese» e il perché, poi la formula consigliata in evidenza e le altre sotto
  («Oppure»), tutte con **i prezzi di PerfectGym** letti da `statoPersonal` (la stessa lettura della schermata Personal; `formulePersonal` in `comune.ts`). La seduta singola porta a `/personal` (si sceglie
  trainer e orario, e si paga); un abbonamento PT a **`/personal?compra=<piano>`**, che apre subito il suo foglio d'acquisto (regole del mese, consensi, carta o conto: `Personal.tsx` legge `compra`, anche
  `compra=seduta`, e lo apre solo se quel piano è davvero in vendita a quella persona). Chi ha già un abbonamento PT legge «Hai già…» e prenota; chi non ha un abbonamento attivo non può attivarne uno PT e la
  carta glielo dice, con la seduta singola. A chi ha risposto «No, grazie» non compare mai (lo garantisce la funzione).
- **Gusti per tipologia, ambiente e cose da evitare** (23/10/2026, richiesta di Maurizio: via il campo libero «lezioni che vuoi evitare»). Il questionario chiede, tutte facoltative e a scelta multipla (`SceltePiu`): **che tipo di lezioni ti attraggono** (`tipologie`: yoga, Pilates e Reformer, postura, tono e forza, danza, boxe, fitness in acqua, Hydrobike: `TIPOLOGIA_TESTO`), **dove preferisci fare lezione** (`ambienti`: sala e/o acqua; con una scelta sola l'altro ambiente cade, con nessuna o due non si toglie niente), **generi da evitare** (`evita_gruppi`) e **tipologie da evitare** (`evita_tipologie`). Le tipologie che attraggono si propongono per prime e non escludono; **evitare è l'unico limite duro**, anche per le alternative, che la funzione mostra sempre. Un valore evitato esce dai gusti e viceversa (`conEvitate`, `conTipologie`, pure). Il testo libero non parte più (`evitate: []`: la funzione lo legge ancora da un'app di prima). Le liste sono le stesse di `_shared/percorso/consigli.ts` (APP-ATHLON #430): **si pubblica prima la funzione, poi l'app**; con la funzione di prima i campi nuovi si ignorano e le lezioni da evitare non hanno più effetto. `tsc` pulito e logica pura provata con `npx tsx`; **non guardato in un browser né su un telefono**.
- **Si prenota con i pulsanti del Calendario** (`RigaLezione` in `Lezioni.tsx`: `AzioniLezione` e `usePrenotazioneLezione`, gli stessi del Percorso): prenota, lista d'attesa, disdici, acquista se non è compresa, «Prenotabile da…»
  se non si è ancora aperta, il motivo del limite della categoria. **Nessuna regola in più**: se il Calendario dice «hai già una prenotazione di Group Reformer», lo dice anche qui. Dopo un clic la riga si aggiorna
  subito con quello che ha detto PerfectGym (`conPrenotazione`, in ogni posto dove compare quella lezione) e la memoria del giorno del calendario si butta (`dimenticaGiornoCalendario`).
- **Gli ultimi consigli restano salvati** (21/10/2026, richiesta di Maurizio): li salva la funzione, e chi riapre la schermata senza una risposta in memoria li ritrova (`ultimiConsigli`, azione
  `consigli_ultimi`; finché non si sa c'è lo scheletro, non il questionario), **con le lezioni di adesso**: la prenotazione si apre tre giorni prima, quindi quelle prenotabili cambiano da sole. Il
  questionario si riapre com'era (`scelteDa`, l'inverso di `questionarioDa`; **le limitazioni no**, non si conservano). In cima alla risposta la carta **«Come leggere questi consigli»** dice che sono
  suggerimenti basati sulle risposte date (e quando), che restano salvati, che le lezioni prenotabili cambiano con la finestra di prenotazione e che **se ne chiedono di nuovi una volta a settimana**; lo
  stesso nella carta in cima al questionario e nell'avvertenza in fondo. Con una funzione di prima (`Azione sconosciuta.`) si parte dal questionario, come prima.
- **Una volta a settimana, e in prova senza limite**: `quota` porta `periodo: 'settimana'` e `in_prova`. `quotaFinita` blocca solo fuori prova («…potrai chiederne di nuovi da mercoledì 28 ottobre»); in prova
  il pulsante resta acceso e il testo dice comunque «una volta a settimana». Il contatore «Hai chiesto i consigli N volte oggi» non c'è più.
- **Quello che hai già detto nel piano in sala si ritrova scelto** (22/10/2026, `schede/profiloComune.ts`: le regole stanno in «In sala il questionario è a passi»): obiettivo, esperienza
  (con da quanto, se si sa), forma di oggi, intensità e quando; sotto ogni risposta riportata una riga arancio «Riportato dalle tue risposte precedenti», finché non la tocchi. Le risposte
  che hai già dato nei Consigli non cambiano mai, e fastidi, limitazioni e note della sala non passano.
- **La memoria dell'app è solo in memoria** (`consigli:ultimi`, `consigli:scelte`, `consigli:riportate` — le scelte portate dal profilo e non ancora toccate —, `consigli:stato`, mai sul disco): l'ultima risposta e le scelte, **senza le limitazioni**, così dopo un pagamento o un
  «Dettagli» si ritrovano i consigli («Cambia le risposte» → «Torna ai consigli di prima»). Le scelte ricordate si fondono con quelle di partenza (una memoria di una versione di prima non ha i campi nuovi).
- **Nella vista cliente dello staff non si apre**: la schermata dice che i consigli li chiede solo il socio e la funzione risponde 403. Solo maggiorenni. Una funzione che non conosce ancora l'azione («Azione sconosciuta.») per
  il socio è «non ancora attivi».
- **Il Percorso è in standby** (richiesta del club, 20/10/2026): non si vede e non si raggiunge. Il link in fondo ai consigli («Preferisci una settimana già a tappe?», `AltraStrada`) non compare, e le tre schermate (`/allenamento/percorso`, `percorso-nuovo`, `percorso-modifica`) rimandano ai consigli, così un vecchio link non apre una funzione che non si offre più. Non è stato tolto niente: la cartella `percorso/`, `src/api/percorso.ts`, la funzione e le tabelle restano. **Si riaccende con `PERCORSO_IN_STANDBY = false` in `percorso/standby.ts`**, ma prima si decide dove deve ricomparire (il link in fondo ai consigli o di nuovo la carta in Train) e lo si ricontrolla con i tester: dall'accensione non è mai stato provato con una sessione vera.
- **Parole**: «consigli», «lezioni», «sala», «vasca»; mai «percorso» né «piano» per questa cosa, e niente promesse di risultati. I posti cambiano in fretta: l'ultima parola è del Calendario, e la schermata lo dice.

Per verificare: `npx tsc --noEmit` pulito; `consigli/comune.ts` è puro (`questionarioDa`, `cosaManca`, `conGusti`, `orariOrdinati`, `giorniTesto`, `destinazioniSeduta`, `conPrenotazione`) e si prova con
`npx tsx`. **Guardato in un browser vero** (21/10/2026: Chromium, bundle web esportato con un indirizzo Supabase finto e la funzione simulata con `page.route`, 390 px con touch e 1280 px): il questionario
compilato (obiettivi, esperienza «ho smesso» con quando e cosa, forma, gusti con «Nuotare» e la domanda sullo stile, giorni e fasce), «Per continuare manca…», il questionario che parte (`obiettivi`,
`obiettivo`, `esperienza`, `pausa`, `discipline`, `giorni`, `nuoto: 'libero'`, `personal_esperienza`, `personal_interesse`, `bisogni`), la carta del personal con i prezzi letti da `statoPersonal` e «Attiva
l’abbonamento PT» che apre `/personal?compra=226` sul foglio dell'abbonamento da 4 sedute, le carte con «La trovi di solito» e gli orari suoi in arancio, quella fuori dai suoi orari, le sedute in sala e in vasca con
«Potresti metterla…», e «Componi il tuo piano di nuoto» che apre `/allenamento/agente?dove=vasca` già in vasca; nessuno scorrimento orizzontale, nessun errore di pagina. **Non provato**: una sessione vera, la
funzione vera e il prompt nuovo con un modello vero, un telefono, e il tema scuro sotto i 900 px. **In produzione dal 21/10/2026** (merge di questa app dopo `portale-lab-percorso` v4 e prima del nodo n8n nuovo, vedi APP-ATHLON).

## Il Percorso Athlon: la settimana a tappe, composta dal tutor dentro il palinsesto vero

Nella schermata Train (`/allenamento`), sotto il test e le calorie, c'è la carta **Percorso Athlon** («Il tutor tecnico della tua settimana:
sala, lezioni e acqua, insieme»; richiesta del club, 20/10/2026). Un agente, il **tutor**, profila il socio con domande più ricche di quelle del
piano di allenamento (che lezioni gli piacciono, quante volte in sala, in quali orari) e compone una **settimana tipo a tappe**: la sala (coi
piani di allenamento che il socio ha già), il cardio, le lezioni di gruppo e l'acqua. Ogni lezione si prenota dalla sua tappa, e il percorso
spiega **cosa fa la settimana**, non solo quante calorie costa. Cartella `src/features/lab/percorso/`; funzione, tabelle, quota e regole del
server sono nel `CLAUDE.md` di APP-ATHLON (`portale-lab-percorso`, migrazione `20261019e_percorso.sql`).
**Dal 20/10/2026 la carta in Train porta ai consigli** (sezione sopra), più semplici; il Percorso è **in standby** (vedi il punto «Il Percorso è in standby» nella sezione dei consigli): nell'app non si raggiunge, e il resto è com'era.

- **Non è un piano di allenamento**, e la schermata lo dice prima di tutto (`PianoOPercorso`): il piano (nel codice, la «scheda») sono gli
  esercizi di un allenamento in sala, serie, ripetizioni e carichi; il percorso è la settimana intera e usa i piani come tappe di sala. **Nei testi
  per il socio: «percorso» per questo, mai «piano» né «scheda»**, e «piano» solo per gli esercizi. Un piano non diventa un percorso né il contrario.
- **Il flusso è quello dei piani**: `Questionario.tsx` → il tutor risponde con una **bozza** (`bozzaPercorso.ts`, in memoria, mai sul disco) →
  `EditorPercorso.tsx`, dove si guarda, si cambia e si conferma → solo allora è del socio. Il tutor non salva niente. La richiesta ci mette una
  decina di secondi, a volte un paio di minuti (la schermata d'attesa lo dice), e chi esce nel frattempo non si ritrova nell'editor (`qui`).
- **Il questionario non si conserva**: le limitazioni sono dati sulla salute. Vive nello stato della schermata e arriva al tutor, e basta. Del
  percorso confermato restano le `preferenze` che non lo sono (giorni, volte, gruppi, fasce, lezioni amate o evitate): servono a riaprire il
  questionario già compilato. Le tre richieste al tutor in trenta giorni le conta il server (`stato.quota`).
- **Il nuoto** (20/10/2026): nel questionario c'è «Quante volte in vasca» (0-3 turni di Nuoto Libero in più delle lezioni), con gli stili che il socio sa nuotare e quanto
  nuota di fila. Chi la sceglie riceve, con la bozza, **un piano di nuoto** che si conferma con il percorso, e ogni turno di Nuoto Libero apre il suo giorno. Cosa fa
  l'app e perché, nella sezione «Il piano di nuoto» in fondo.
- **Solo maggiorenni**, come Food. Nella **vista cliente** dello staff il percorso si guarda (`stato`, `leggi`, `settimana` sono letture) e basta:
  niente questionario, niente prenotazioni, niente comandi per cambiarlo; il server risponde 403 a tutto il resto.

### La settimana vera, e la prenotazione dalle tappe

- **Una tappa è un modello, la settimana è la sua realizzazione.** Il percorso dice «martedì alle 18:30, Pilates Matwork»; `settimana` (una
  lettura, `useSettimana`) lo trasforma, per una settimana precisa, nella lezione di quel martedì con i posti, la prenotazione del socio (letta
  da PerfectGym e non dal mirror: dopo un clic il mirror è indietro), quando si apre e se il limite delle prenotazioni la blocca. Si vedono questa
  settimana e la prossima: la prenotazione si apre tre giorni prima.
- **Quattro cose possono succedere a una lezione, e `TappaCarta` le dice tutte**: c'è e si prenota; **è al completo** (vedi sotto); **questa settimana non c'è** (il
  palinsesto cambia a inizio mese) e si propongono le tre più vicine, prima quelle con posti; c'è ma il limite della categoria è pieno **per colpa di
  un'altra lezione dello stesso percorso** («prenotabile dopo la lezione di martedì»: con una sola prenotazione attiva di Reformer alla volta è il
  caso normale, e non è un rifiuto, è l'ordine in cui si prenota).
- **Una lezione al completo ha le alternative** (20/10/2026). La tappa dice «Questa settimana è al completo», tiene il pulsante «Lista d'attesa» e sotto mostra **fino
  a tre lezioni con posti liberi** (`alternative` di `settimana`): prima lo stesso tipo di lezione in un altro orario, poi le **simili**, segnate «lezione simile»,
  ognuna con i suoi posti, il «Dettagli» e i pulsanti del Calendario. Se il socio ne prende una la tappa lo dice («Hai prenotato un'alternativa») e non gli offre più
  la lista d'attesa. Il perimetro, le regole e perché lo decide il server stanno nel `CLAUDE.md` di APP-ATHLON: **l'app non sceglie le alternative**. Se il limite
  della categoria blocca anche la lista d'attesa (conta come una prenotazione), il motivo è quello e viene prima; e una lezione che non si è ancora aperta non è
  «al completo»: i posti si sanno solo dopo l'apertura.
- **«Prenota la settimana» non mette in lista d'attesa da sola** (`dividi.ts`, che è pura e si prova senza schermata). Le lezioni con posti si prenotano; **quelle al
  completo hanno la loro sezione, «Al completo»**, dove per ognuna il socio sceglie: la lista d'attesa (**resta scelta se non tocca niente**, come prima), una
  delle alternative che si prenotano già adesso (non una non compresa, né una che aspetta l'apertura o il limite) o «Lascia stare». Una stessa alternativa non si
  sceglie per due lezioni. La conferma è sempre una sola, e alla fine dice «Al posto di Group Reformer di lun 19 ott, che è al completo». Una lezione piena che il
  socio ha già sostituito sta fra le «Già prenotate».
- **Nell'editor, «Spesso al completo»** (`affollamento.ts`): una lezione il cui slot ha chiuso al completo da metà delle volte in su (almeno tre osservate) porta un
  avviso — «nelle ultime quattro settimane questo orario ha chiuso con tutti i posti presi 4 volte su 4; i posti si prenotano da tre giorni prima» — e fino a
  due alternative con meno attesa, che si mettono con un tocco («Metti questa»). **Dice com'è andata, non come andrà**. Le alternative stanno nel catalogo che
  l'editor già legge: stesso tipo prima, poi le simili, mai una che si sovrappone o che è già nel percorso. **Il cardio agganciato alla lezione la segue** (si rifà
  l'orario come farà l'editor) e quindi un'alternativa di un altro giorno non si propone se la lezione ha il cardio, che resterebbe da solo. Cambiando solo l'orario la
  frase del tutor resta; cambiando tipo di lezione no. Nell'elenco delle lezioni del foglio «Aggiungi una tappa» lo slot dice «spesso al completo».
- **I pulsanti sono quelli del Calendario**: `AzioniLezione` (esportato da `Calendario.tsx`) e `usePrenotazioneLezione`, che è la catena
  prenota / lista d'attesa / disdici / acquista / paga con la carta **spostata** dal Calendario in un posto solo, senza cambiare comportamento. Il
  ritorno dal pagamento di PerfectGym è sempre `/calendario?acquisto=`: dal Percorso, comprare una lezione non compresa passa per il Calendario, e la
  settimana si rilegge da sé al ritorno. Dopo un clic la riga si aggiorna subito e la memoria dei giorni del calendario si butta
  (`dimenticaGiornoCalendario`); fra poco si rilegge la settimana, perché i limiti delle altre lezioni sono cambiati.
- **«Prenota la settimana»** è un riepilogo e **una conferma sola** (`PrenotaSettimana`), poi le lezioni si prenotano in ordine di tempo,
  una chiamata ciascuna: se una non riesce le altre vanno avanti e alla fine si dice com'è andata ognuna. **Niente parte da solo.** Entra solo
  quello che si può prenotare adesso (c'è, è compresa, la prenotazione è aperta, il limite non è pieno e non aspetta un'altra lezione del
  percorso). Restano fuori, ognuna col suo motivo: quelle che si aprono più avanti, quelle **non comprese** (si prenotano una per una pagando la
  lezione singola: non si addebita niente in blocco), quelle che questa settimana non ci sono, e la **sala**.
- **La sala ha due turni fra cui sceglie il socio.** La Gym Floor è un turno ogni mezz'ora, e ognuno è di un tipo solo («Con Assistenza» o
  «Allenamento Libero»): la tappa mostra i due più vicini all'ora scelta, uno per tipo, con l'orario vero. Le parole sono quelle del sito:
  **l'assistente di sala supervisiona le attività in sala**, non «ti segue» né «ti controlla mentre lavori» (quello è il personal training, che si
  paga a parte). L'orario di una fascia non si scrive mai a mano.
- **Quali lezioni spettano al socio è una stima.** Il database non ha una mappa piano → lezioni: la funzione la ricava da una tabella curata
  (`piani_categorie`, partita dalle prenotazioni reali) e dove non c'è una regola **non filtra** e lo dice (`idoneita.incerta`). Le lezioni non
  comprese sono escluse di default e si includono con un interruttore: compaiono segnate «Da acquistare». La prenotazione vera resta il controllo.

### Gli effetti: `effetti.ts` è puro, e non inventa

`Effetti.tsx` mostra cosa fa la settimana, e tutto quello che dice lo calcola `effetti.ts` — una funzione pura delle tappe e delle schede delle
lezioni, che si **ricalcola mentre il socio cambia una tappa**. **Il tutor non scrive mai un numero** (il «perché» di una tappa è una riga senza
cifre: la funzione toglie le frasi che ne hanno). Sette riquadri: la settimana in minuti giorno per giorno; il **profilo delle lezioni** (radar a
quattro assi: muscolare, cardio, coordinazione, flessibilità); il lavoro in sala; i **riferimenti dell'OMS**; carico e recupero; cosa copre
l'obiettivo; il confronto con le ultime quattro settimane e, per ultime, le calorie.

- **La sala non entra nel radar, le lezioni non entrano nella mappa dei muscoli.** La sala non ha barre di intensità e non se ne inventano; le
  barre di una lezione dicono quanto è intensa, non quali muscoli lavora. La sala si misura coi muscoli primari degli esercizi dei piani (e dice
  quali gruppi principali **in sala** non si lavorano mai).
- **Dove manca un dato lo si dice**: un asse senza barre è «dato non disponibile», mai zero, e il radar dice su che quota dei minuti è calcolato.
  Le barre mancano per il Nuoto Libero, la Scuola Nuoto e la flessibilità delle lezioni in acqua (il sito non le ha): le lezioni senza barre sono
  nominate. Si completano dal sito (`planning-lessons.json`), non qui.
- **Riferimenti, non traguardi**, come Food coi LARN: 150–300 minuti a intensità moderata (o la metà se intensa, che conta il doppio) e almeno due
  giorni di rinforzo muscolare (OMS 2020). **Sono numeri ricordati, non riletti alla fonte: vanno ricontrollati.** I minuti si classificano coi MET di
  `stimaCorso.ts` (moderato da 3, intenso da 6); la sala conta come rinforzo e non come attività aerobica; **il cardio si conta come moderato**
  perché la tappa non dice se è una camminata o una corsa.
- **«Cosa copre l'obiettivo» sono regole fisse scritte in `righeObiettivo`**, non un giudizio del tutor, e dicono se la settimana ha gli
  ingredienti che le linee guida indicano per quel lavoro (ogni gruppo principale due volte per l'ipertrofia, tre giorni aerobici per la
  resistenza…), **non se il risultato arriverà**. Nessun chilo, nessuna promessa estetica. Le soglie (due volte per gruppo, tre giorni, la barra di
  flessibilità da 50 in su) sono nostre e vanno fatte validare dal Direttore Tecnico. I testi «cosa aspettarsi» per obiettivo **non ci sono**: si
  aggiungono quando il club li ha validati.
- **Le calorie sono una riga fra le altre** e una stima: la formula di schede e calendario (BMR / 1440 × MET × minuti), la sala come nella stima
  del piano. Servono i quattro dati del corpo (`useStatoCorpo`); senza, il pannello dice cosa manca e non stima. Il confronto con le ultime
  quattro settimane usa le stesse attività del contatore (sedute chiuse nell'app e lezioni con la presenza segnata) e **lascia fuori il cardio**,
  che non si registra.
- **Le animazioni** (radar, barre) seguono `useProgresso` e partono quando il riquadro entra nello schermo (`useVisibile`), come il contatore
  delle calorie; con «riduci movimento» vanno subito al valore finale.

### L'editor, e perché `controllo.ts` esiste

- **Aggiungere, cambiare o togliere una tappa** (`FoglioTappa`): una lezione fra quelle che ricorrono quel giorno, la sala (un giorno di uno dei
  piani, a un'ora e per un tempo) o il cardio (una macchina, per un tempo, prima o dopo un'altra tappa o a un'ora precisa). Una tappa cambiata
  perde il «perché» del tutor se cambia cosa si fa, lo tiene se cambia solo giorno o ora.
- **`controllo.ts` è lo specchio di `validaRisposta`** (funzione, `_shared/percorso/validazione.ts`): niente si sovrappone, sala e cardio stanno
  nell'orario della sala (lun–ven 6–22, sab 8–20, dom 9–18: da `gymFloor.hours` del sito), al massimo quattro tappe e tre ore al giorno, diciotto
  tappe a settimana, sei giorni, un giorno di solo cardio non è un giorno. Il server **non tronca in silenzio** un percorso del socio: se una tappa
  non regge risponde 422 e dice quale. Per questo l'editor dice le stesse cose prima, sulla tappa giusta, e «Conferma» non si accende finché ci
  sono problemi. **Il server resta l'autorità**; se le due copie divergono vince lui. Chi cambia una regola la cambia nei due posti.
- **Una lezione non compresa è una scelta del socio**: se il percorso ne contiene una, alla conferma `includi_non_comprese` si accende da solo, o
  la funzione la rifiuterebbe come «slot che non esiste».
- **Confermare sostituisce il percorso attivo** (uno solo per socio) e lo dice sopra l'editor; le lezioni già prenotate restano prenotate. Togliere
  il percorso non tocca i piani di allenamento.

### Cosa manca, e cosa serve per accenderlo

- **È acceso, per i tester del portale** (20/10/2026): il workflow n8n del tutor (`athlon-percorso-ai`) è pubblicato, la chiave è nel Vault (`percorso_n8n_chiave`) e la funzione
  `portale-lab-percorso` è in produzione; chi non è fra i tester non apre la funzione. **Il tutor usa modelli a pagamento con la riservatezza dei dati** (prima i gratuiti, con cui `genera` non dava un percorso a nessun tentativo): risponde in una decina di secondi, e in prova ha composto la settimana chiesta nove volte su dieci circa. Se un modello non regge la funzione risponde 502 («Il tutor non è riuscito a
  comporre il percorso adesso. Riprova fra qualche minuto»), che l'app mostra; non conta nella quota. Quando la settimana non ha tutte le tappe chieste la funzione lo dice negli avvisi e il socio corregge nell'editor. Non è stato provato con una sessione vera, quindi il primo percorso generato da un tester è la prima prova di tutta la schermata. Dettagli e cosa è stato verificato: `CLAUDE.md` di APP-ATHLON.
- **Non ci sono promemoria**: l'app non ha notifiche. Se il club li vuole, si decide come (email?).
- **Da fare col club**: le barre del Nuoto Libero e della Scuola Nuoto Adulti e la flessibilità delle lezioni in acqua; la revisione della tabella
  `piani_categorie` (anche se i piani Short e Open hanno limiti d'orario); i testi «cosa aspettarsi» per obiettivo, validati dal Direttore Tecnico;
  l'informativa privacy (il questionario va a un servizio esterno, come per l'agente dei piani).

Per verificare: `npx tsc --noEmit` pulito. `effetti.ts` e `controllo.ts` sono funzioni pure e si provano con `npx tsx` (nel repo non c'è un test
runner): la prova di `controllo.ts` confronta l'editor con `validaRisposta` su qualche migliaia di percorsi a caso, e **ogni percorso che l'editor
accetta la funzione lo accetta** (il contrario no: l'editor è più severo sui minuti, che il server riporta nei limiti). **Le schermate si guardano
renderizzate** (360, 390, 430 e 1280 px, anche con «riduci movimento»): `tsc` non vede gli errori di resa, come `${<Text/>}` che diventa «[object
Object]». Nel questionario, sala + lezioni almeno una; giorni liberi o nessuno o almeno i giorni di allenamento; a «Componi» le tre richieste al
mese si fermano alla quarta; nella vista cliente nessun comando compare.

## Il piano di nuoto: si chiede dall'agente o dal Percorso, si legge a bordo vasca e non si registra

Richiesta del club (20/10/2026). Cartelle `src/features/lab/schede/` (`nuoto.ts`, `CampiNuoto.tsx`, `Agente.tsx`, `EditorScheda.tsx`, `Scheda.tsx`, `SceltaEsercizio.tsx`) e
`src/features/lab/percorso/` (`nuoto.ts`, `PianoNuotoCarta.tsx`, `Questionario.tsx`, `EditorPercorso.tsx`, `TappaCarta.tsx`). Chi si allena in vasca, al **Nuoto Libero**, ha un
**piano di nuoto**: un piano come gli altri (`schede`, `tipo = 'socio'`, `origine = 'ai'`), fatto con gli esercizi di nuoto della libreria — «4 × 100 m, recupero 20″, medio» —
e scritto dall'agente. Funzione, regole del codice, quota e come si accende: sezione «Il piano di nuoto» del `CLAUDE.md` di APP-ATHLON.

- **Due strade, un piano solo.** Dall'**agente dei piani** (`Agente.tsx`): la prima domanda è «Dove ti alleni» (in sala / in vasca · Nuoto Libero); in vasca il questionario è a passi
  (22/10/2026, `PassiVasca.tsx`: cosa vuoi ottenere in vasca, che stili sai, quanto nuoti di fila, quanto tempo hai, quante volte, fastidi; il livello si stima e si cambia dal riepilogo, vedi la sezione dei piani);
  `chiediPianoNuoto` risponde con una **bozza** che passa dall'editor (`?da=bozza`). Dal **Percorso**: «Quante volte in vasca» (0-3), con gli stessi due campi
  (`CampiNuoto`), e il piano torna con la bozza del percorso. In tutti e due i casi lo si rivede, lo si modifica e lo si conferma: solo allora è un piano suo.
- **Il Nuoto Libero chiede stile libero e dorso.** Scelti gli stili senza uno dei due, `PassiVasca` (e `CampiNuoto`, nel Percorso) dice dove si comincia (`MESSAGGIO_SCUOLA_NUOTO`: la Scuola Nuoto Adulti, dove
  sono gli istruttori a dire quando passare — **non «non sei pronto»**) e il pulsante resta spento. Il testo è lo stesso della funzione, che ricontrolla (400): se cambia, cambia
  in `src/api/lab.ts` e là.
- **Si legge, non si registra** (`Scheda.tsx`, `ambiente: 'vasca'`): niente «Inizia» (il server rifiuta), niente calorie, niente «ultima volta». Al posto del conto degli esercizi
  i **metri** della seduta (`metriDelGiorno`: serie per distanza, un'addizione; **mai i minuti**, che sarebbero una stima), e ogni blocco porta la sua parte — riscaldamento,
  tecnica, serie principale, defaticamento — ricavata dalla testa della nota (`parteDa`). Nel foglio dell'esercizio «Ripetizioni × distanza», «Intensità», «Recupero». **L'intensità
  è una parola** (facile, medio, sostenuto, forte), mai un ritmo. L'elenco dei piani lo segna «Piano di nuoto» (la goccia, «sedute»).
- **L'editor è lo stesso, con altri campi** (`EditorScheda.tsx`, `vasca`): sedute al posto dei giorni; ripetizioni, **metri per ripetizione a multipli di 25** (la vasca è da 25;
  si ferma nel modulo prima del server) e l'intensità a pillole; niente «% del massimale» né superserie. Gli esercizi si scelgono **solo fra quelli di vasca** e **non si scrive un
  nome proprio** (`SceltaEsercizio ambiente="vasca"`): un esercizio suo è di sala, e il piano smetterebbe di essere di vasca. In un piano di sala gli esercizi di vasca non compaiono.
- **Nel Percorso ogni turno di Nuoto Libero apre la sua seduta** («Cosa fai in vasca oggi», `TappaCarta`: «Apri il piano» → `/allenamento/[scheda]?giorno=<posizione>`). Nell'editor
  del percorso `PianoNuotoCarta` mostra le sedute coi metri e quale turno apre quale, e il piano si può togliere (il percorso resta, i turni restano senza piano). **Spostando o
  aggiungendo turni le sedute si riagganciano** (`riagganciaNuoto`, lo specchio di `agganciaNuoto` della funzione: in ordine di giorno e ora, ricominciando dalla prima; provato su
  300 casi a caso contro la funzione) e un turno cambiato di giorno o di ora **tiene la sua seduta** (`ereditaPiano`). **Un piano di nuoto senza un turno che lo apra non si
  conferma** (il server risponderebbe 422): lo dice il controllo, e si aggiunge un turno o si toglie il piano; un turno il cui piano non c'è più blocca finché non lo si cambia («Cambia»
  lo scollega). Dopo la conferma l'elenco dei piani si rilegge (`CHIAVE_ELENCO_PIANI`).
- **Non entra nel contatore delle calorie, nel Balance né negli effetti del Percorso**: non c'è un MET per esercizio in vasca che non sia inventato, e le sedute non si registrano.
  Per gli effetti il Nuoto Libero resta com'era (senza barre: «dato non disponibile»). Se il club vuole i metri in vasca fra gli effetti, si decide come.
- **Lo staff lo vede dal CRM, in sola lettura**, come ogni piano dei soci, e l'app lo dice nel piano e sotto l'avvertenza dell'agente («con il tecnico a bordo vasca»).
- **Acceso per i tester del portale (20/10/2026), ma non provato su un telefono né con una sessione vera.** Il workflow `athlon-piano-nuoto` è pubblicato e la chiave è nel Vault: `chiedi_nuoto` risponde
  e il Percorso torna con il piano. Se il modello (a pagamento, con la riservatezza dei dati) non regge, la funzione risponde 502 con «L'agente non è riuscito a scrivere il piano adesso. Riprova fra qualche minuto» e l'app mostra
  quel testo; «Il piano di nuoto non è ancora attivo: puoi scriverlo tu» resta per la chiave mancante (503) e per una funzione che non conosce l'azione (`lab.ts`). Ritmi, metri massimi e regole (farfalla, sprint) sono nostri e vanno validati dal Direttore Tecnico.

Per verificare: `npx tsc --noEmit` pulito. `schede/nuoto.ts` e `percorso/nuoto.ts` sono puri e si provano con `npx tsx` (metri, parti della nota, aggancio, eredità). **Le schermate si
guardano renderizzate** (360, 390, 430 e 1280 px): l'agente in vasca (il messaggio senza dorso e il pulsante spento, il questionario che arriva alla funzione), l'editor di vasca
(distanza non multipla di 25 ferma il salvataggio; il selettore senza una panca e senza «Non lo trovi?»), il piano di vasca (nessun «Inizia», nessuna caloria), l'elenco dei piani,
il questionario del Percorso, l'editor del percorso con `PianoNuotoCarta` (togliere i turni accende il messaggio e spegne «Conferma»; «Togli il piano di nuoto» lo toglie; la
conferma manda `piano_nuoto` e le tappe con la loro seduta) e la settimana con «Cosa fai in vasca oggi».

## Il messaggio di benvenuto: sotto la testata della Home, scritto a ogni ritorno nell'app

Nella Home (`AreaRiservata.tsx`), **subito sotto la testata scura** e sopra «Da fare», una carta con un messaggio personale: titolo, due righe e un pulsante che porta al prossimo passo (richiesta
del club): attivare la prova se non l'ha mai fatta, scegliere un abbonamento, dare seguito ai suoi allenamenti, ricominciare. Lo scrive l'AI, a ogni ritorno nell'app. File:
`src/features/lab/home/MessaggioBenvenuto.tsx` (la carta), `useMessaggioBenvenuto.ts` (quando se ne scrive uno nuovo), `src/api/benvenuto.ts` (la funzione `portale-lab-benvenuto` di APP-ATHLON).
A che punto è il socio, qual è il suo passo, come si controlla quello che scrive l'AI, privacy e come si accende: `CLAUDE.md` di APP-ATHLON.

- **L'app non sceglie niente**: mostra il titolo, il testo e il pulsante (`azione.etichetta`, `azione.destinazione`) che le arrivano. Il passo lo decide il server dai dati del mirror. La
  destinazione è una delle cinque che l'app conosce: `prova` → `/richiesta/guest-pass`, `abbonamento` → `/abbonamento`, `calendario` → `/calendario`, `allenamento` → `/allenamento` (tutte con
  `router.navigate`, come la barra delle schede), `pagamenti` → la sezione della Home (`onSezione`). Una destinazione sconosciuta non rompe niente: `api/benvenuto.ts` ricontrolla la forma e senza
  pulsante resta il solo messaggio.
- **Quando se ne scrive uno nuovo**: all'apertura dell'app (memoria vuota, `apertura`); tornando alla Home dopo **mezz'ora o più** dall'ultimo (`VALIDITA_MS`), sia con la Home rimasta aperta (si lascia
  l'app o la scheda del browser e si torna: `AppState`, che sul web segue la visibilità della scheda) sia rientrando da un'altra schermata (`ritorno`). Un passaggio più breve rivede lo stesso: un
  messaggio che cambia a ogni passaggio non è un messaggio, e ognuno costa. Il server in più riusa quello di due minuti fa (un ricaricamento). **Solo in memoria**, come ogni dato del laboratorio, e
  **legata all'email della sessione**: una richiesta ancora in volo quando si esce non finisce nella Home di chi entra dopo.
- **Mentre arriva c'è uno scheletro** (la richiesta dura qualche secondo, AI compresa): all'apertura si confonde con l'avvio animato (3,25 s), che lo copre. **Se la funzione non risponde** (o non è ancora
  pubblicata, o per un minorenne) **la carta non compare**: niente riquadro vuoto e niente errore per una cosa che nessuno ha chiesto. L'attesa massima è 15 secondi.
- **L'etichetta è sempre «PER TE»**, senza dire chi ha scritto il messaggio (richiesta del club, 19/10/2026: prima diceva «PER TE · SCRITTO DALL'AI» quando il testo era dell'AI). La funzione manda comunque
  `origine` (`ai` o `regole`) e la registra, ma l'app non la mostra: per sapere quanti messaggi escono dall'AI e quanti dai testi di riserva si guarda il registro. Si può **nascondere** (la X):
  resta nascosto fino al prossimo messaggio. Il tocco sul pulsante si segna (`toccato`, senza aspettare e senza sollevare): è il solo segno, per il club, che il messaggio ha funzionato.
- **In vista cliente dello staff non c'è e non si chiama la funzione** (`vistaCorrente()`): chi guarda l'app di un socio non genera messaggi a suo nome.
- **Le parole**: la prova non è mai «gratis» né ha un prezzo nel messaggio (il passo mostra il prezzo); niente peso, dimagrimento, salute; niente colpa per chi manca da un po'. Lo garantisce il controllo
  del server, non l'app.
- **L'invito alla prova ha una carta tutta sua** (30/10/2026, richiesta di Maurizio: «più accattivante, il testo più bold, 19 euro, prova tutto il club per una settimana in evidenza»): quando `azione.destinazione` è `prova`, `MessaggioBenvenuto.tsx` disegna `CartaProva` al posto della carta di sempre: fondo scuro in tutti e due i temi con l'arancio che sale da un angolo, il marchio in filigrana, il titolo **fisso** «Prova tutto il club per una settimana» (al posto del titolo scritto dall'AI), **«19 €» grande con «una volta sola · senza rinnovo»** (`PREZZO_PROVA` in `lib/guestPass.ts`, scritto a mano: cambia insieme al piano su PerfectGym; con l'invito di un socio il prezzo è 5 e questa carta non lo sa) e il testo del server in grassetto. **Il server non è cambiato e il suo testo continua a non nominare soldi**: il prezzo lo mette solo l'app. Titolo, X e pulsante funzionano come prima. Provato in Chromium (bundle web, 390/360/1280 px, chiaro e scuro, inglese) con una pagina provvisoria poi tolta: **non provato** nella Home vera dietro il login e su un telefono.

Per verificare: `npx tsc --noEmit` pulito. **Si guarda renderizzato** (390 e 1280 px, chiaro e scuro): lo scheletro mentre arriva, il messaggio con l'etichetta «PER TE» e il pulsante, la X, nessuna carta se la funzione dà errore o `messaggio: null`, nessuno scorrimento orizzontale a 390. Con le risposte della funzione simulate (Playwright con `page.route` su
Supabase e `page.clock`): all'apertura una richiesta `apertura`; cinque minuti fuori dall'app non ne chiedono un'altra; oltre mezz'ora fuori ne arriva una `ritorno`; il pulsante porta a
`/richiesta/guest-pass` e segna `toccato`; in vista cliente nessuna richiesta. **Acceso il 19/10/2026 per i tester del portale**, con la funzione vera: un tester ha aperto l'app, il messaggio è arrivato (scritto da Gemini, registrato) e il pulsante è stato premuto. Il lato server (workflow, controlli, cosa si è
provato con le risposte vere dei modelli) sta nel `CLAUDE.md` di APP-ATHLON. **Non provato**: un telefono vero (iOS e Android, dove `AppState` ha anche lo stato `inactive`).

## Lo shop: Articoli e Merchandising, si compra dall'app e si ritira in segreteria

Richiesta del club (18/10/2026). Cartella `src/features/lab/shop/`, API `src/api/shop.ts`, rotte `src/app/(portale)/shop/`. Un negozio
nell'app dei soci per le due categorie di PerfectGym **Articoli** e **Merchandising**: foto, prezzi, carrello, pagamento online con Adyen
attraverso PerfectGym (come le lezioni singole), **ritiro in segreteria**, nessuna spedizione. Funzione `portale-lab-shop`, tabelle, bucket
delle foto, i tre segnali di «pagato», il giro del cron e la sezione Shop del CRM: sezione «Lo shop» del `CLAUDE.md` di APP-ATHLON.

- **L'app non parla con PerfectGym e non manda mai un prezzo.** Alla funzione arrivano solo `product_id` e quantità (`src/api/shop.ts`); nome,
  foto e prezzo li rilegge la funzione, che prima di aprire il pagamento **ricontrolla da PerfectGym** prezzo e vendibilità di ogni riga. Il totale
  che si vede nel carrello è una somma per comodità (in centesimi, `Math.round(prezzo * 100) * quantità`); **dopo «Vai al pagamento» vale quello
  della funzione**. Se un prezzo è cambiato, un articolo è finito o non è più in vendita l'ordine non parte (409 con `codice`): l'app rilegge la
  vetrina (`carica(true)`), toglie dal carrello ciò che non c'è più (`allineaAllaVetrina`) e lo dice.
- **Il catalogo lo cura la segreteria dal CRM** (foto, descrizione, ordine, visibile, esaurito). **Un articolo può stare in vetrina senza foto**
  (19/10/2026, richiesta del club: i tester vedono subito tutto, le foto arrivano dopo): al posto dell'immagine c'è un segnaposto, un sacchetto su
  fondo neutro (`SegnapostoFoto`, senza testo), nella vetrina, nella scheda articolo, nelle miniature del carrello e degli ordini. Un prodotto
  nuovo del listino non compare finché qualcuno non lo accende. **Cosa
  vede il socio dipende dal suo abbonamento** (alcuni prodotti spettano a chi ha un contratto vivo, altri a chi non l'ha), e lo decide la
  funzione: l'app mostra quello che torna.
- **Le schermate.** `/shop` (`Vetrina.tsx`: schede in griglia, filtro per categoria, «Esaurito» sulla foto spenta; la lettura sta in
  memoria sotto `shop:vetrina`, `useVetrina`), `/shop/[id]` (`Articolo.tsx`: foto, descrizione, quantità, «Aggiungi al carrello»), `/shop/carrello`
  (`Carrello.tsx`), `/shop/ordine/[id]` (`EsitoOrdine.tsx`, il ritorno dal pagamento) e `/shop/ordini` (`Ordini.tsx`, «I miei ordini»). **Si chiama «Shop» e
  si entra da un posto solo: la carta «Shop» della Home** (`home/CartaShop.tsx`, fra «Da fare» e i riquadri, **fuori da ogni sezione**; 19/10/2026,
  richiesta del club: prima era una carta «Shop del club» dentro la sezione Prodotti, che quasi nessuno apre, e Prodotti torna a mostrare solo gli acquisti
  già fatti). **Non ha una voce nella barra delle schede**: l'ha avuta per qualche minuto (sesta, fra Athlon Health System e TV) e il club l'ha tolta, quindi
  non va rimessa senza chiederlo. Per questo la vetrina è una schermata di dettaglio come le altre dello shop: senza barra, con la freccia che torna alla
  Home (articolo, carrello, ordini ed esito tornano alla vetrina).
- **Il carrello** (`carrello.ts`, un solo store per app, `useCarrello` con `useSyncExternalStore`) tiene **solo identificativi e quantità**. Sul web sta
  nella scheda del browser (`sessionStorage`, chiave `athlon_shop_carrello`) perché il pagamento porta fuori dall'app, sulla pagina di Adyen, e al
  ritorno la pagina si ricarica da capo: un carrello solo in memoria sarebbe vuoto proprio quando serve. **Non nel `localStorage`**: un dispositivo
  condiviso non deve ritrovare il carrello di chi c'era prima. **All'uscita dal laboratorio si svuota** (`esciDalLaboratorio` in `memoria.ts`), e si
  svuota quando un ordine risulta pagato, non prima: tornando indietro senza pagare il carrello c'è ancora. Tetti: **cinque pezzi per articolo e
  dodici righe** (li dice la funzione nella vetrina, `quantita_max`; l'app non ne ricopia i numeri se non come ripiego).
- **Il pagamento ha due strade, come le lezioni.** Chi ha una **carta salvata** vede «Paga 25,00 € con la carta •••• 1234» e paga senza uscire; l'altra
  voce, «Usa un'altra carta», e la sola strada per chi la carta non ce l'ha, porta sulla pagina protetta di Adyen (`window.location.assign` sul
  web, `Linking.openURL` sul telefono), dove la carta si salva. «Vai al pagamento» **non addebita niente**: apre l'ordine. Con l'ordine aperto
  il carrello non si cambia più (niente quantità né cestino: l'ordine è quello), si può solo «Tornare al carrello», che lo riapre con un
  ordine nuovo.
- **Il ritorno dal pagamento** (`/shop/ordine/<id>`) chiede com'è andata ogni 4 secondi, per due minuti (30 giri), perché PerfectGym registra il
  pagamento qualche secondo dopo: «Verifichiamo il pagamento…», poi «Pagamento ricevuto» (da ritirare in segreteria) o «Pagamento non riuscito» o,
  dopo i due minuti, «Non vediamo ancora il pagamento». **Quest'ultimo non è un errore**: chi ha pagato e chiude la pagina lo ritrova in «I miei
  ordini», che compare appena PerfectGym lo registra; chi è tornato indietro senza pagare non ha addebiti. Il testo lo dice, e dice di non chiudere la
  pagina mentre aspetta.
- **Il ritiro** si legge ovunque come «Da ritirare in segreteria, negli orari di apertura del club», e passa a «Ritirato il …» quando la segreteria
  lo segna consegnato dal CRM. Non c'è nessuna notifica (l'app non ne ha) e **nessuna email di conferma**: la ricevuta è la schermata e «I miei
  ordini».
- **Solo i tester del portale**: chi non è in `portale_lab_tester` riceve 403 da `portale-lab-shop` e la schermata mostra il messaggio. **Nella vista
  cliente dello staff lo shop si guarda e basta** (`catalogo` e `ordini` sono letture; `ordina`, `paga_con_carta` ed `esito` rispondono 403): il
  pulsante «Vai al pagamento» è spento e un avviso lo dice, e il bottone del carrello nella testata dell'articolo non compare.
- **Le foto sono indirizzi interi e pubblici** (bucket `shop-prodotti`, merce e non persone): l'app le mostra con `expo-image`, `contentFit="cover"` in
  riquadri quadrati. A differenza di MoveKit e dei certificati non c'è niente da firmare.

**Cosa è provato.** `npx tsc --noEmit` pulito. In un browser vero (Chromium, 19 gruppi di prove contro la funzione simulata, nessun errore di
pagina né di console): vetrina con filtro per categoria e «Esaurito»; articolo con quantità, tetto di cinque pezzi, articolo esaurito, indirizzi
strani (`/shop/abc`, un prodotto che non c'è); carrello con totale in centesimi che sopravvive al ricaricamento; **prezzo cambiato** (l'ordine non
parte, messaggio, prezzo nuovo a schermo) e articolo finito che esce da solo; «Vai al pagamento» che manda **solo id e quantità** e mostra la carta
salvata; ritorno dal pagamento («Verifichiamo…» poi «Pagamento ricevuto») col carrello svuotato; «I miei ordini»; la carta «Shop» in Home;
vetrina vuota e in errore con «Riprova». Le schermate sono state **guardate** su telefono (390 px) e su desktop (1280 px, quattro colonne, nessun
overflow), in tema chiaro e scuro. **Cosa non lo è:**

- **Nessun pagamento vero**: la funzione era simulata. Il primo pagamento di produzione dello shop è anche il primo della strada PerfectGym → Adyen
  online (vedi APP-ATHLON).
- **La vista cliente dello staff** (pulsante spento, avviso, niente bottone del carrello) è scritta ma **non è stata provata nel browser**, né il
  pagamento con carta salvata fino in fondo né un ordine «non riuscito» (`EsitoOrdine` con `errore`): sono coperti dalla funzione, non dalla schermata.
- **Larghezza 430 px, «riduci movimento», nessuna prova su un telefono** (a 360 px sono provate solo vetrina e Home, non carrello, articolo ed esito) e **nessuna prova dell'apertura di Adyen dall'app nativa**
  (`Linking.openURL`): sul web si lascia l'app e si torna, come per i pagamenti del Calendario; il ritorno su nativo non è stato provato, e il carrello lì
  sta solo in memoria.
- **Nessuna foto vera**: le prove usano immagini finte. Come si vede una foto 4:3 o molto alta in un riquadro quadrato va guardato con le prime foto del club.
  Il segnaposto invece è provato nel browser (vetrina, scheda, carrello, ordine pagato, tema scuro, senza overflow su 390 px).

**Da sapere.** Nessuna giacenza (esaurito è un interruttore a mano), nessun avviso alla segreteria per un ordine nuovo (si guarda «Da consegnare»
nel CRM), nessuna spedizione e **nessuna fattura o ricevuta fiscale generata qui**: quello che emette PerfectGym per il pagamento è quello che il
socio ha.

Per verificare: `npx tsc --noEmit` pulito. **Le schermate si guardano renderizzate** (360, 390, 430 e 1280 px): vetrina senza articoli (messaggio, non
una griglia vuota), articolo esaurito (foto smorzata, pulsante spento), carrello con l'ordine aperto (stepper e cestino spariti, «Torna al carrello»),
ritorno dal pagamento che passa da «Verifichiamo…» a «Pagamento ricevuto», la Home con la carta «Shop» (e Prodotti senza), la vetrina senza barra e con la freccia alla Home (360, 390 e 1280 px), e la vista cliente.
Nel carrello: cinque pezzi di un articolo e nessuno di più; con un prezzo cambiato lato funzione l'ordine non parte e il carrello si allinea; a logout il
carrello è vuoto.

## I pagamenti dell'app mostrano solo i pagamenti veri; i crediti non si vedono

Richiesta del club (19/10/2026): nella sezione Pagamenti (`pagamenti/Movimenti.tsx`, `src/api/lab.ts`) il socio vede **solo i pagamenti**. I **pagamenti non fiscali** di
PerfectGym — voucher, crediti referral, gift card, rettifiche, crediti di chiusura abbonamento: nel CRM sono i «crediti» — **per ora non si mostrano**. L'app non fa niente
di nuovo: li toglie la funzione (`portale-lab-pagamenti`, azione `movimenti`, che non restituisce le righe con `fonte = 'credito'`), e la regola che li riconosce sta nel database
(`perfectgym.pagamenti_non_fiscali`), la stessa del CRM. Dettagli e perché: `CLAUDE.md` di APP-ATHLON, «I pagamenti: reali e crediti, e la prima nota».

- **Il rimborso di un pagamento vero resta** («Rimborso», in blu, col «+»), anche se al desk lo registrano come una riga a parte: è un movimento vero. L'importo arriva già
  positivo dalla funzione (nel mirror è negativo: prima usciva «+-690,00 €»).
- **Il totale «Pagato» di un abbonamento** (`AbbonamentiMiei.tsx`, da `portale-abbonamento`) **include ancora i crediti**: è il conto del contratto (addebitato − pagato = da pagare). Se si
  vogliono fuori anche da lì, i tre numeri della riga non quadrano più per chi ha avuto un credito: va deciso col club prima.
- **Se un giorno i crediti si mostrano**, è una scelta del club: la funzione li ha già (`fonte = 'credito'`) e basta non escluderli; l'app dovrebbe dare loro un nome e un'icona
  suoi (non «Pagato») e dire che non sono soldi spesi.

Per verificare: nessun codice di questo repository è cambiato per questa richiesta (solo questa nota). Con una sessione di un socio che ha un voucher o un credito referral: la
sezione Pagamenti non lo elenca e lo storico non cambia per chi non ne ha.

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

## L'Abbonamento PT: le regole del mese nel foglio, e la sezione 9 dei Termini

Il foglio d'acquisto dell'abbonamento PT (`FoglioCompra` in `src/features/lab/Personal.tsx`, 21/10/2026, richiesta di Maurizio) dice prima di pagare che **le sedute si caricano il
giorno 1 e vanno usate entro la fine del mese solare**, e che **a mese iniziato la quota si paga per intero e le sedute si caricano tutte subito**, da usare entro la fine del mese in corso
(la data la calcola `fineMeseRoma`). Sotto la casella dei consensi c'è l'**estratto espandibile della sezione 9 dei Termini e Condizioni** (`EstrattoTermini`), chiuso di partenza.
**Non c'è il pro-rata: l'importo è fisso, qualunque sia il giorno di partenza** (Maurizio, 21/10/2026), e il foglio non dice più che «l'importo esatto lo calcola PerfectGym». Il file dei Termini allegato su PerfectGym **non si apre più da qui** (richiesta di Maurizio, 21/10/2026): resta solo l'estratto. Il testo è **copiato alla lettera** in `src/features/lab/personal/termini.ts` da `src/data/termini.json` del sito (SITO-ATHLON, versione Aprile 2026): è testo di contratto, non si
riscrive; se il sito cambia la sezione 9, si ricopia da lì. Non si legge dal sito a ogni apertura perché il catalogo pubblico (`/contratto-abbonamento.json`) ha solo le sezioni 1, 2, 3 e 7.

## Gli eventi di Club Life: si prenota dal calendario e si condividono con un amico

Pagina dell'evento (`EventoDettaglio` in `src/features/lab/clublife/Dettaglio.tsx`, 21/10/2026, richiesta di Maurizio):

- **Gli eventi che si prenotano dal sito (`prenotaSulSito`) non mandano più il link per email**: il pulsante «Prenota nel calendario» porta alle Prenotazioni
  (`/calendario?giorno=AAAA-MM-GG&attivita=<categoria>`) già sul giorno dell'evento e sulla sua categoria su PerfectGym («Eventi Gratuiti», «Master Class»). La categoria
  arriva da `categoria` dell'evento nel `club-life.json` del sito (che la prende da `sito-eventi`); finché non c'è, si apre il giorno e basta. Il `Calendario` legge i due
  valori dall'indirizzo (`giorno` solo se ha la forma di una data, `attivita` solo insieme al giorno, al massimo 60 caratteri) e riparte da lì; il filtro si toglie dalle
  tessere come sempre. **Il calendario mostra oggi e i 14 giorni dopo**, ed è anche quando si aprono le prenotazioni di un evento: se l'evento è più lontano, al posto del
  pulsante c'è «Le prenotazioni non sono ancora aperte … a partire da <giorno>». Chi guarda in vista cliente arriva alle Prenotazioni come tutti: lì i comandi sono già chiusi.
  Il modulo per email dell'app (`richiediLinkEvento`, `api/moduli.ts`) non è più chiamato da qui; il link per email esiste ancora dal sito.
- **«Condividi con un amico»** (`condividi.ts`): il foglio di condivisione del telefono (Web Share sul web, `Share` sul nativo) con testo e link alla **pagina pubblica dell'evento
  sul sito**; sul computer il link si copia. Non porta nessun dato di chi condivide. Lo stesso pulsante c'è nella pagina dell'evento del sito.

## «Invita un amico»: il link personale del socio, e l'amico fa la procedura del Guest Pass

Richiesta di Maurizio (21/10/2026). Cartella `src/features/lab/invita/` (`Invita.tsx`, `condividi.ts`), carta `home/CartaInvita.tsx`, rotta `(portale)/invita.tsx`, API `src/api/referral.ts`; la pagina pubblica dell'invito e' `src/app/invito/[codice].tsx`, che usa la stessa procedura di `/richiesta/guest-pass` (`features/guest-pass/RichiestaGuestPass.tsx`, spostata li' da `app/richiesta/guest-pass.tsx`). Funzione, tabelle, regole e task del desk: `CLAUDE.md` di APP-ATHLON, «L'invito di un amico dall'app». **Il sito non cambia**: il suo referral resta per chi non usa l'app.

- **La carta in Home** sta subito sotto «Da fare», prima dello Shop, e non gli somiglia: scura (`carbone`) col regalo, il titolo dice il vantaggio («Allenati con un amico»). **Solo per chi puo' invitare**: il titolare con un abbonamento in vigore, anche a quota zero (`personeConAbbonamento`, la stessa regola che la funzione ricontrolla); mai in vista cliente. Mentre si guarda la Home il link si prepara (`precarica`).
- **La schermata** (`/invita`): il link, **Manda su WhatsApp** (pulsante pieno), **Email**, **SMS** (solo dove c'e' un touch o sull'app nativa: sul computer `sms:` non apre niente) e **Copia il link**; poi «Come funziona» e **«I tuoi inviti»** (il nome dell'amico e l'iniziale del cognome, con lo stato: ha accettato e fino a quando, in prova, prova finita, iscritto con il voucher in arrivo, scaduto). Il messaggio da condividere lo scrive la funzione. Sul web WhatsApp si apre in una scheda nuova (`wa.me`); copiare usa gli appunti del browser, e sull'app nativa (senza un modulo per gli appunti) apre il foglio di condivisione, che ha «Copia».
- **Non si nomina il vantaggio della quota di attivazione** per chi continua dopo la prova: il club lo svela solo dopo che l'amico ha attivato la prova (decisione del 21/10/2026). Le regole dette sono i 30 giorni dall'accettazione (o fino al giorno dopo la fine della prova, se iniziata nei 30 giorni), il voucher da 50 € che carica la segreteria, chi puo' essere invitato (niente abbonamenti o Guest Pass negli ultimi 3 anni) e che vince il primo invito.
- **La pagina pubblica** `/invito/<codice>`: «Marco ti invita da Athlon» (solo il primo nome, da `guest-pass` azione `invito`), poi email, dati e il link per email, come il Guest Pass; la richiesta porta il codice. Dopo l'invio dice «Hai accettato l'invito di Marco: hai 30 giorni per iscriverti» e offre **«Scegli l'abbonamento»** (il listino del sito) a chi preferisce iscriversi senza la prova: l'invito vale lo stesso. Un codice che non vale piu' non ferma niente: la pagina lo dice e resta il Guest Pass senza invito.
- **La prova costa 5 € invece di 19 per chi arriva da un invito** (21/10/2026, decisione di Maurizio: niente sconto sull'abbonamento, l'occasione e' la prova). Il prezzo lo dice la funzione (`prezzo` e `prezzo_pieno` dall'azione `invito` di `guest-pass`, `prezzo_prova` e `prezzo_pieno` da `stato` di `portale-lab-referral`) e l'app lo ripete nella pagina dell'invito, nella conferma, nella schermata `/invita` e nella pagina di attivazione (`AttivaGuestPass`, che legge `prezzo` invece dei 19 € scritti a mano). Il messaggio da condividere: «puoi provare il club con me per una settimana pagando solo 5 € invece di 19, oppure iscriverti subito». Con un codice non valido resta il Guest Pass da 19 €, e la pagina lo dice. Lato server (piano 228, `piano_id`, ordine di pubblicazione): `CLAUDE.md` di APP-ATHLON.
- **Fase 2, non fatta**: dal link per email l'amico sceglie anche l'abbonamento dentro l'app (oggi solo la prova, e l'iscrizione diretta passa dal sito).

Per verificare: `npx tsc --noEmit` pulito. **Provato in un browser vero** (Chromium, bundle web esportato, funzioni simulate con `page.route`, 390 px con touch e 1280 px senza, tema chiaro e scuro), 34 controlli: la carta in Home prima dello Shop e assente senza abbonamento; la schermata con il link, WhatsApp che apre `wa.me` col messaggio, «Copia il link» che mette il link negli appunti e lo dice, SMS solo col touch, i cinque stati degli inviti, nessuna parola sulla quota di attivazione; la pagina dell'invito («Marco ti invita da Athlon», la richiesta col codice, la conferma con «Scegli l'abbonamento»), il codice non valido, e la richiesta del Guest Pass di sempre senza nessun codice e senza iscrizione diretta; nessuno scorrimento orizzontale, nessun errore di pagina. **Non provato**: un telefono vero (WhatsApp e SMS da iOS e Android), l'app nativa, e le funzioni vere con una sessione vera.

## Il Guest Pass per sé o per un figlio (21/10/2026)

Decisione di Maurizio. Funzione, regole e controlli: `CLAUDE.md` di APP-ATHLON, «Il Guest Pass per sé o per un figlio, e le anagrafiche simili». Cartella `src/features/guest-pass/`.

- **Il primo passo** (`RichiestaGuestPass`, `/richiesta/guest-pass` e `/invito/<codice>`) è l'email con la privacy (e il marketing facoltativo), e la risposta è sempre «controlla la tua email»: niente «non idoneo», niente «hai già iniziato», niente nome e cellulare. `richiediGuestPass` manda solo email, consensi e invito.
- **Nel link, il primo blocco è «Per chi è il Guest Pass»** (`PerChi.tsx`): per me, per un figlio del nucleo (13-17 anni), o per un figlio non ancora iscritto (nome, cognome, nascita, codice fiscale controllato subito con `problemaCodiceFiscale`). Chi non può averlo resta spento col perché. Per un figlio serve la dichiarazione di genitore o tutore. Finché non si sceglie il resto della pagina non si vede. Per un figlio il primo blocco dei dati è «I tuoi dati, come genitore», il riepilogo dice «Intestatario» (il figlio) e «Genitore che paga», i giorni d'inizio finiscono prima dei 18 anni, la pagina finale dice che le lezioni le prenota il genitore. Con una funzione di prima (`scelta` assente) la pagina è quella di sempre.
- **«Attiva un altro Guest Pass»** (a contratto fatto, se c'è un altro idoneo): `anche_per` crea un link nuovo e la pagina ci va (`router.replace`; `AttivaGuestPass` ha `key={token}` per ripartire da capo).
- **Un'anagrafica simile da verificare** (`p.verifica`): un avviso in cima e il pulsante di conferma spento finché la segreteria non risponde per email.
- `cosaComprende(prezzo)` al posto di `COSA_COMPRENDE`: prima il riepilogo diceva 19 € anche a chi pagava 5 con l'invito.
- **Il cellulare ha la tendina del prefisso** (`components/CampoTelefono.tsx`, prefissi in `lib/prefissi.ts`; richiesta di Maurizio, 21/10/2026): a sinistra il prefisso internazionale, già su +39, che si apre come la tendina del Paese e si cerca per nome o per numero; a destra il numero. Parte un valore solo, «+<prefisso><numero>» senza spazi, come lo legge `telefonoDa`; un numero già scritto si divide da sé (senza «+» è italiano; «+1», «+7», «+44» condivisi valgono Stati Uniti, Russia, Regno Unito), e chi incolla «+44…» nel numero sposta il prefisso nella tendina. **Il prezzo del riepilogo non dice più «IVA inclusa»** (richiesta di Maurizio). Provato nel browser con la funzione simulata: +39 di partenza, la ricerca, +41 scelto che fa partire `+413401234567`.

Per verificare: `npx tsc --noEmit` con i soli 41 errori di base. **Provato in un browser vero** (Expo web, Supabase simulato da un piccolo server locale, 375 px e schermo largo): il primo passo (senza consenso non parte niente; poi parte solo `{ azione, email, privacy, marketing }`), la scelta con un genitore socio (per me spento col perché, Valentina 16 anni, Luca 10 anni spento), la dichiarazione, i dati del genitore, il riepilogo con intestataria e genitore, la conferma e la pagina finale del figlio, «Attiva un altro Guest Pass» (link nuovo, Valentina «ha già il Guest Pass»), il figlio nuovo con un codice fiscale già registrato (fermo) e con un caso da verificare (avviso, conferma spenta), chi il club non conosce («Per te» e la password). **Non provato**: le funzioni vere, PerfectGym vero, un telefono.

## Il Guest Pass non chiede l'indirizzo (29/10/2026)

Decisione di Maurizio: l'indirizzo e' un attrito in piu' per la prova, e si chiede quando si sottoscrive l'abbonamento. Nel primo blocco della pagina del link (`AttivaGuestPass.tsx`) restano «Chi sei» (nome, cognome, nascita, codice fiscale) e «Contatti» (email, cellulare): `GRUPPI` in `src/lib/guestPass.ts` non ha piu' «Residenza», e quello che serve per attivare e' `CAMPI_RICHIESTI`. Chi vive all'estero sceglie ancora il Paese, sotto la casella «Risiedo all'estero». **Resta l'indirizzo dell'intestatario nell'addebito su conto (IBAN)**: e' del conto e lo chiede quel metodo, non e' la residenza. Lato server (`validaPersona` con l'indirizzo facoltativo, cosa si manda a PerfectGym, cosa non e' provato): `CLAUDE.md` di APP-ATHLON, stessa data. **Pubblicare prima `guest-pass`, poi l'app.** `tsc` senza errori nuovi; la schermata non e' stata guardata a video.

## La pagina del Guest Pass racconta la prova: prezzo in vetrina e attività a fisarmonica (30/10/2026)

Richiesta di Maurizio, guardando la pagina di attivazione (`/r/<codice>`, `AttivaGuestPass.tsx`) da telefono: «scrivi meglio sia a livello di testo che graficamente la settimana a 19 euro. Prova tutto il club per una settimana, metti la lista delle
attività con gli accordion con l'upsell che ti dice cosa c'è dentro, simile alla pagina /prova del sito». File: `features/guest-pass/ProvaTuttoIlClub.tsx` (nuovo), `lib/guestPass.ts` (`ATTIVITA_PROVA`), `AttivaGuestPass.tsx`.

- **Il titolo dice cosa si fa**: «Ciao Maurizio, prova tutto il club per una settimana» (per un figlio, «Fai provare tutto il club a Luca»; «Per chi è il Guest Pass?» resta com'era finché non si sceglie). Il sottotitolo non ripete il prezzo, che ora ha un blocco suo: «Pochi passi e la tua settimana è pronta…».
- **`PrezzoProva`, il cartellino** (come l'hero di `/prova`: il prezzo è l'argomento): carta scura in tutti e due i temi (come le fasce «carbone»), il marchio in filigrana, «19 € una volta sola» in grande e arancio, due righe che dicono che non è un abbonamento e non si rinnova, e tre spunte: 7 giorni dal giorno che scegli, nessun rinnovo automatico, alla fine decidi tu. **Il prezzo è `p.prezzo`** (5 con l'invito di un socio): nessuna cifra scritta a mano.
- **`AttivitaComprese`, «Tutto il club, per una settimana»**: le attività del Premium, che il Pass apre per sette giorni, una riga a fisarmonica ciascuna (icona, nome, una riga di cosa è; aperta spiega cosa c'è dentro e rimanda alla pagina del sito, in un'altra scheda). **Una aperta alla volta.** Voci, ordine e testi sono quelli di `/prova` e della spiegazione che il sito mostra per ogni attività (`activityInfo` in `data/abbonamenti.ts` di SITO-ATHLON), **senza Athlon TV** (è in streaming: sta nella riga di testo, come sul sito) **e senza i conteggi di lezioni**, che sul sito li calcola il palinsesto: se il Premium cambia, si cambia `ATTIVITA_PROVA` insieme al sito. `ATTIVITA_GUEST_PASS` (la pagina finale, con le sue etichette) non è stato toccato. Le icone sono quelle del sito (`ICONE_ATTIVITA`) ridisegnate con `react-native-svg`; i testi sono in italiano e inglese.
- **Per chi sta solo finendo l'elenco parte chiuso**: chi ha già confermato i dati o torna dalla pagina di pagamento o della carta (`ridotta`) vede un comando «Vedi cosa comprende», per non spingere il resto della pagina sotto la piega.
- **Nel blocco «Per chi è il Guest Pass»** (`PerChi.tsx`, richiesta di Maurizio, stesso giorno): sotto «Per te» ci sono **nome e cognome** (quelli dei dati che la persona sta controllando, quindi seguono le correzioni; per un figlio c'era già il suo nome) e un riquadro con **cosa comprende** (le attività di `ATTIVITA_PROVA` più Athlon TV, un elenco solo) e **quando**: prima della scelta «7 giorni consecutivi dal giorno che scegli, fra <primo> e <ultimo giorno d'inizio>», poi «7 giorni, dal … al … compresi». Provato in Chromium con le date che cambiano scegliendo il giorno.
- **Non è cambiato**: i blocchi della procedura, i dati, i consensi, il riepilogo e il pagamento. `RichiestaGuestPass` (il modulo con l'email, per chi non ha una sessione) è allineato nel testo: titolo «Prova tutto il club per una settimana» (con un invito resta «… ti invita da Athlon») e sottotitolo «Il Guest Pass Premium: sala, corsi e vasche per 7 giorni a 19 €, senza impegno e senza rinnovo…». **Il 19 lì è ancora scritto a mano** (non c'è una richiesta da cui leggerlo).
- **Provato**: `npx tsc --noEmit` senza errori fuori da `docs/`; in Chromium (bundle web esportato, funzione `portale-link` simulata con `page.route`; 390, 360 e 1280 px, tema chiaro e scuro, italiano e inglese): titolo, cartellino, elenco, una sola attività aperta alla volta, elenco chiuso per chi ha confermato i dati, nessuno scorrimento orizzontale, nessun errore in console. **Non provato**: un telefono vero, l'app nativa (le animazioni con il driver nativo, `expo-image` e le SVG), il collegamento «Scopri di più sul sito» (le pagine del sito erano simulate), e con una sessione vera.

## «Attiva la prova» da dentro l'app: niente email, la procedura continua qui (29/10/2026)

Richiesta di Maurizio (guardando l'app da loggato: «Attiva la prova» portava a un modulo che chiedeva l'email per mandare un link): chi e' gia' dentro l'app non deve scrivere l'email ne' uscire ad aspettare una posta; la procedura del Guest Pass finisce nell'app. File: `features/guest-pass/ProvaDallApp.tsx` (nuovo), `RichiestaGuestPass.tsx`, `AttivaGuestPass.tsx`, `GuestPassAttivo.tsx`, `api/guestPass.ts` (`apriGuestPassDallApp`). Lato server (azione `app_apri`, chi puo' averlo, cosa non cambia): `CLAUDE.md` di APP-ATHLON, stessa data.

- **Chi ha una sessione non vede mai il modulo con l'email**: `RichiestaGuestPass` (le rotte `/richiesta/guest-pass` e `/invito/<codice>`, e quindi il pulsante «Attiva la prova» del messaggio di benvenuto, che non e' cambiato) guarda la sessione. Con una sessione (fuori dalla vista cliente) mostra `ProvaDallApp`: «Apriamo il tuo Guest Pass», che chiede alla funzione di aprire la richiesta dalla sessione e **passa subito a `/r/<codice>`** (`router.replace`, il tasto indietro non ricade sullo spinner): la stessa pagina e la stessa procedura del link per email (per chi, dati, giorno d'inizio, pagamento, conferma), dentro l'app. Il ritorno dalla pagina di Adyen e' gia' `/r/<codice>`. **Senza una sessione il modulo con l'email resta com'era** (sito, amico che apre un invito, chi non ha ancora fatto l'accesso). In vista cliente resta il modulo: non si apre niente a nome del cliente.
- **Se non si puo' averlo** (un abbonamento in corso, un Guest Pass gia' fatto) la funzione risponde 409 col perche' e la schermata lo dice con «Torna alla Home»; se la rete cade o la funzione non risponde c'e' «Riprova». **Non si ricade sul modulo con l'email**: e' proprio quello che si voleva togliere.
- **A Guest Pass attivato, chi e' dentro non legge «scarica l'app e accedi»** (`GuestPassAttivo`, prop `dallApp`: la sessione e' quella dell'email della richiesta): al posto di «Entra nell'app» c'e' «Il Guest Pass e' gia' nella tua app», con «Vai alla Home» e «Prenota una lezione». In piu' si buttano le memorie `area` e `benvenuto`, o la Home continuerebbe a offrire «Attiva la prova» fino a mezz'ora dopo.
- **Pubblicare prima la funzione `guest-pass`, poi l'app.** Con la funzione vecchia la schermata dice che non riesce ad aprire il Guest Pass e lascia riprovare.
- **Provato**: `npx tsc --noEmit` senza errori nuovi (43 di base, nessuno nei file toccati). **In Chromium** (bundle web esportato con `EXPO_PUBLIC_SUPABASE_URL` finto, funzioni simulate con `page.route`, 390 px, 16 controlli): da loggato `/richiesta/guest-pass` manda una sola `app_apri` e apre `/r/<codice>` con «Ciao Maurizio, attiva il tuo Guest Pass», senza campo email e senza nessuna `richiedi`; un 409 dice il perche' con «Torna alla Home» e senza «Riprova», e non ricade sul modulo; un 502 offre «Riprova» e al secondo giro si apre; senza sessione resta il modulo con l'email e nessuna chiamata a `guest-pass`; a Guest Pass attivato da loggato c'e' «Il Guest Pass e' gia' nella tua app» e niente «Scarica l'app», mentre dal link senza sessione «Entra nell'app» e' quella di prima. **Non provato**: una sessione vera con la funzione vera, la procedura fino al pagamento (invariata), un telefono, la vista cliente, il tema scuro e l'inglese a schermo.

## Il messaggio di benvenuto su misura e l'iscrizione dalla prova (29/10/2026)

Richiesta di Maurizio. Lato server (profili, passi, testi, migrazione, regole): `CLAUDE.md` di APP-ATHLON, «Dalla prova all'abbonamento e il «prossimo passo» del benvenuto». Qui cosa fa l'app.

- **Il messaggio della Home** (`home/MessaggioBenvenuto.tsx`) conosce **due destinazioni in piu'**: `consigli` → `/allenamento/consigli`, e `salute` → `/allenamento/dispositivi?attiva=apple` (la schermata apre da sola il foglio di Apple, dopo il consenso se manca: lo stesso
  percorso dell'invito e della carta «Da attivare»). Le altre sono quelle di prima (`prova` «Prova ora», `abbonamento` «Iscriviti ora», `calendario`, `allenamento`, `pagamenti`). L'etichetta del pulsante la scrive il server.
- **L'app dice al server se puo' collegare Apple Salute** (`messaggioDiBenvenuto(motivo, saluteCollegabile)`, campo `salute_collegabile`): vero solo su iPhone nativo e se l'attivazione non e' gia' fatta (`appSaluteDelTelefono() !== null && !appleSaluteAttivo()`); su web e Android e' falso e
  il server non propone il collegamento. **Health Connect si aggiunge in `appSaluteDelTelefono()` e il passo funziona da solo.**
- **Chi ha un Guest Pass in corso e si iscrive non sceglie la data** (`Abbonamento.tsx`, `abbonamento/DallaProva.tsx`): se la persona ha `da_guest_pass` (`inizio_min` = `inizio_max`): nel primo passo c'e' l'avviso verde **«Dalla prova all'abbonamento»** (l'abbonamento parte il <data>, il giorno dopo la fine del
  Guest Pass, senza perdere un giorno, e **la quota di attivazione di <cifra> e' in omaggio solo se l'abbonamento parte quel giorno: per questo la data e' obbligatoria**, 29/10/2026 su indicazione di Maurizio), nel secondo passo al posto delle pillole dei giorni c'e' la carta **«Parte il <data>»** con la stessa spiegazione, e il piano di pagamento mostra la quota «non dovuta». La data la decide il server e la ricontrolla alla firma:
  l'app non offre un giorno diverso. Senza Guest Pass la schermata e' quella di sempre. **Il messaggio di benvenuto non parla di soldi**: la quota in omaggio si legge solo qui, nella procedura (richiesta di Maurizio).
- **Con la funzione `portale-abbonamento` di prima** `da_guest_pass` non c'e' e l'app mostra la scelta del giorno; con la funzione nuova e l'app di prima la scelta del giorno si riduce a un giorno solo, che e' quello giusto.
- **Provato.** `npx tsc --noEmit` senza errori nei sorgenti (restano quelli di `docs/classifica-server`, che non sono nostri); **in Chromium** (bundle web esportato con `EXPO_PUBLIC_SUPABASE_URL` finto, funzioni simulate con `page.route`, 390 px con touch):
  i quattro pulsanti nuovi o cambiati del messaggio portano dove dicono e segnano il tocco, la richiesta del messaggio porta `salute_collegabile: false` fuori da iPhone nativo, il passo 1 con l'avviso e la data del 3 novembre 2026, il passo 2 con la carta «Parte il» e senza le pillole dei giorni, il riepilogo dei costi
  che parte con `data_inizio` del giorno dopo la fine della prova, e senza Guest Pass nessun avviso e le pillole di prima. **Non provato**: un iPhone vero (`salute_collegabile: true` e il foglio di Apple), la procedura fino alla firma e al pagamento con un Guest Pass vero, l'inglese e il tema scuro a schermo.
- **Pubblicato il 29/10/2026**, su richiesta di Maurizio («Fai merge poi»): prima il lato server (APP-ATHLON: migrazione, `portale-lab-benvenuto`, `portale-abbonamento`, `guest-pass`), poi questa app.

## La sezione Junior: i gruppi dei corsi per bambini e ragazzi, per anno di nascita, con i posti liberi (21/10/2026)

Richiesta di Maurizio. Cartella `src/features/lab/junior/` (`Junior.tsx`, `comune.ts` puro), rotta `(portale)/junior.tsx`, API `src/api/junior.ts`, carta `home/CartaJunior.tsx` (in Home dopo lo Shop). Dati: funzione
`portale-lab-junior` di APP-ATHLON, che legge `public.gruppi_junior()` dal mirror (anni di nascita dal nome del gruppo, posti da PerfectGym): `CLAUDE.md` di APP-ATHLON.

- **Si legge e basta**: tessere degli anni di nascita (dal piu' giovane; un anno senza posti e' piu' chiaro), «Solo i gruppi con posti liberi», poi i gruppi divisi per corso (Scuola Nuoto mono, bi, poi gli altri) in
  ordine di settimana e di ora, con «N posti liberi» / «Ultimo posto» / «Completo». Un gruppo di piu' anni («(2015-14-13)») compare sotto ognuno. **Da qui non ci si iscrive** (primo passo).
- **L'anno si apre sul figlio**: la carta in Home, se nel nucleo c'e' un figlio fra i 3 e i 17 anni, apre `/junior?anno=<il suo anno>` e lo nomina; altrimenti il piu' giovane. In vista cliente si vede (nessun dato di persona).
- **Filtro per giorno della settimana** (21/10/2026): sotto gli anni, pillole «Tutti · Lun … Dom» a selezione multipla (`giorniDelAnno`, `giorniDelGruppo` in `comune.ts`): si offrono solo i giorni che l'anno scelto ha davvero, e un gruppo passa se ha **almeno uno** dei giorni scelti (un bisettimanale «Lunedì, Giovedì» compare sotto Lun e sotto Gio). Si combina con l'anno e con «Solo i gruppi con posti liberi». I gruppi **senza giorni** nel nome (4 su 146 il 21/10) escono appena un giorno è scelto e tornano con «Tutti». `tsc` pulito e logica provata con `npx tsx`; **non guardato renderizzato né su un telefono**.
- La nota in fondo dice che i posti sono quelli del gestionale e che la conferma e' della segreteria.
- **In cima, «La tua famiglia»** (stesso giorno, seconda richiesta): chi del nucleo puo' fare le attivita' junior, con «Classe 2015» e i gruppi a cui e' iscritto (o «nessun gruppo per ora»); i minorenni non ancora
  idonei (un neonato sotto i 3 mesi) si vedono con il perche' e «Non ancora», gli adulti no. Chi e' idoneo lo dice il database (`nucleo` di `portale-lab-junior`: dai 3 mesi ai nati nell'anno piu' vecchio dei gruppi
  del Nuoto Agonistico). Toccando una persona si apre il suo anno, e senza `?anno=` la schermata parte dall'anno del piu' giovane idoneo (`annoDalNucleo`). Con una funzione che non da' `nucleo` il blocco non c'e'.
- **«Aggiungi un componente»** (`FoglioComponente`, mai in vista cliente): nome, cognome, data di nascita, codice fiscale, tutti obbligatori, e la casella «Dichiaro di esserne il genitore o il tutore legale». L'app
  ferma prima il codice fiscale non valido o non coerente (`problemaCodiceFiscale`, lo stesso del Guest Pass) e il maggiorenne; il resto lo controlla la funzione, compreso che la persona **non ci sia gia'** (nel nucleo:
  «è già nel tuo nucleo familiare»; al club: «ha già una scheda… passa in segreteria», senza dire di chi). A scheda creata il nucleo si aggiorna dalla risposta e la memoria dell'area della Home si butta (`scorda('area')`).
  `CampoData` sta dentro una `View` perche' ha `flex: 1` e in una colonna che scorre si schiacciava sul campo dopo (visto nel browser).

Per verificare: `npx tsc --noEmit` pulito; `comune.ts` con `npx tsx`. **Guardato in Chromium** (bundle web esportato, funzione simulata con `page.route`, 390 px chiaro e scuro, 1280 px): tessere degli anni, filtro, gruppi
di piu' anni, «Ultimo posto» e «Completo», il nucleo (l'anno del figlio aperto da solo, «Non ancora» per il neonato), il foglio (pulsante spento senza la dichiarazione, quello che parte: azione, nome, cognome, data
`AAAA-MM-GG`, codice maiuscolo, `tutore: true`), il nucleo aggiornato dopo l'aggiunta, l'errore «già al club» nel foglio, nessuno scorrimento orizzontale, nessun errore di pagina. **Non provato**: la funzione vera con una
sessione vera (e quindi la creazione su PerfectGym), un telefono, la carta in Home renderizzata.

**Stato (21/10/2026): in produzione**, su richiesta di Maurizio: migrazione `20261021d` e `portale-lab-junior` (v1) pubblicate prima, poi questa app su `main` (vedi APP-ATHLON).

## L'app in due lingue: italiano e inglese, con le parole di PerfectGym (21/10/2026)

Richiesta di Maurizio. Il socio sceglie la lingua nel **Profilo** (Account → Lingua) o in fondo alla **pagina d'accesso**; la prima volta vale
quella del dispositivo (italiano se il dispositivo è in italiano, altrimenti inglese). La scelta si ricorda sul dispositivo (`localStorage`,
`athlon_lingua`). Il lato server: `CLAUDE.md` di APP-ATHLON, «Le lingue del portale».

- **Il link `?lingua=en` (o `?lingua=it`) apre l'app in quella lingua** (22/10/2026, per l'invito ai tester in inglese dal CRM, APP-ATHLON «I tester dell'app»):
  `dallIndirizzo()` in `lingua.ts` lo legge alla prima domanda, **vale come una scelta del socio** (si ricorda sul dispositivo, sopra a quella di prima) e toglie il
  parametro dall'indirizzo con `history.replaceState`. Solo sul web. **Su iPhone l'app aggiunta alla schermata Home ha una memoria sua**: si apre nella lingua del
  dispositivo, e l'email lo dice (Profilo → Lingua). Un valore diverso da `it` e `en` non conta.
- **I testi stanno accanto all'originale**: `t('Prenota', 'Book')` (`src/lib/lingua.ts`), non una chiave in un dizionario. Un testo nuovo si
  scrive sempre con i due argomenti; `tv(it, en)` per elenchi ed elementi, `locale()` per date e numeri (`it-IT` / `en-GB`), mai `'it-IT'` scritto.
  `lingua.ts` è un modulo puro (lo importano anche i calcoli provati con `npx tsx`); il gancio per i componenti è `useLingua` in `lingua-react.ts`.
- **Cambiare lingua ricarica l'app sul web**: costanti di modulo, formattatori e risposte già in memoria si rifanno nella lingua nuova, quindi
  un `t()` a livello di modulo va bene. Sull'app nativa il layout radice ha `key={lingua}` e ridisegna le schermate; le costanti di modulo si
  aggiornano alla prossima apertura.
- **Le parole inglesi sono quelle di PerfectGym** (`docs/glossario-inglese.md`, ricavato dal manuale inglese di PerfectGym e dallo swagger):
  membership, payment plan, freeze, booking, waiting list, joining fee, payment method, front desk… Ortografia americana come PerfectGym, date
  all'europea. **I nomi propri del club** (attività, abbonamenti, prodotti) e i marchi dell'app (Athlon Health System, Train, Food, Relax,
  Club Life, Gym Floor, Guest Pass…) non si traducono nel codice: i nomi inglesi delle attività, dei piani e dei prodotti li scrive il club su
  PerfectGym e arrivano dal mirror. **Il glossario va riletto dal club** accanto al Client Portal in inglese.
- **Le funzioni rispondono nella lingua dell'app**: `intestazioneLingua()` manda `Accept-Language: en-x-athlon` (o `it-x-athlon`) da
  `funzione()` di `api/lab.ts` e dalle altre chiamate alle funzioni (`link`, `guestPass`, `referral`). È un'intestazione che non passa dal
  CORS, quindi un'app nuova con funzioni vecchie non si rompe (riceve l'italiano), e il segno `x-athlon` fa sì che un browser in inglese con
  un'app di prima riceva ancora l'italiano.
- **Cosa resta in italiano**: i contenuti del sito (news, eventi, schede dell'Help Desk, le schede delle lezioni), le notifiche scritte dallo
  staff, il testo dei contratti e dei Termini e Condizioni (in inglese c'è una riga che lo dice: fa fede l'italiano), e i nomi da PerfectGym
  che il club non ha tradotto. Le **informative privacy** sono tradotte con «Courtesy translation: the Italian text is the binding version»;
  le versioni dei consensi non sono cambiate (stesso testo, due lingue): **la traduzione va fatta rileggere al consulente privacy**.

## Iscriversi a un gruppo Junior dall'app (21/10/2026)

Dalla sezione Junior, toccando un gruppo con posti si sceglie chi del nucleo iscrivere (`chiPuoIscriversi` in `junior/comune.ts`: idoneo, anno di nascita nel gruppo, minorenne o titolare, non già dentro, gruppo non completo) e si apre `/iscrizione?group=&membro=` (`junior/Iscrizione.tsx`). Due passi: **Costi** (parte sempre subito, nessuna scelta della data; riepilogo col pro-rata di PerfectGym) e **Dati e firma** (dati, contratto, consensi, firma). Funzione: `portale-abbonamento`, azioni `junior_anteprima` e `junior_firma` (APP-ATHLON). Dopo la firma si torna a `/abbonamento`, che riprende dal pagamento (stesso percorso degli adulti).

- **Solo abbonamento mensile**: i piani «con Preiscrizione» e «Stagionale» sono fuori. Tutti i gruppi sono aperti (anche Agonistico e Pallanuoto: la prova di inserimento non viene chiesta da qui, scelta di Maurizio).
- **Consensi: 20, 29, 32, 23, 1** (il 29 con il testo degli adulti, non il 28; niente 37 e 36). Le voci arrivano dal catalogo del sito (`junior` in `/contratto-abbonamento.json`).
- **Vista cliente**: si vede, non si firma.
- **Minorenne**: indirizzo e cellulare sono quelli del genitore (la carta del bambino chiede solo il codice fiscale: `senzaRecapiti` di `CorreggiDati`), l'email non si chiede.
- **Non provato**: `EnrollMemberToGroup` vero, nomi dei parametri di `GetEnrollmentOptions`/`CalculateProrata`, primo addebito su PerfectGym. Il browser è stato provato con funzioni simulate (390 e 1280 px). **Pubblicare in ordine**: sito, `portale-abbonamento`, app.

## Junior: i corsi della persona scelta (22/10/2026)

Sotto «La tua famiglia» della sezione Junior si sceglie una persona (tocco su «Vedi i corsi»; di partenza la prima in età) e sotto compaiono i suoi corsi (`junior/Corsi.tsx`, `CorsiPersona`). Funzioni e regole del database: `CLAUDE.md` di APP-ATHLON, «I corsi di una persona».

- **Iscritta a un gruppo**: «L'abbonamento di <nome>» (piano, quota, stato, dal, rinnovo, pagato fino al), i conteggi **Disdette / Recuperate / Da recuperare** (dai prodotti «Recupero» del profilo su PerfectGym, con la scadenza e gli eventuali recuperi scaduti), «Le prossime lezioni del corso» con **Disdici** (conferma, regole di PerfectGym) e «Prenota un recupero» col calendario dei recuperi. **Le lezioni si vedono fino alla fine del contratto**; il rinnovo di metà mese (20-21) porta quelle del mese dopo, e la schermata lo dice. Disdire e recuperare solo per la Scuola Nuoto.
- **In età Baby Nuoto** (3-36 mesi, `eBaby`): l'abbonamento mensile se c'è; se no le due strade con i prezzi (lezione singola, che si compra prenotando dal calendario; mensile + quota). **L'iscrizione al mensile si fa da qui** (22/10/2026, vedi sotto). Sotto, il calendario Baby Nuoto.
- **I gruppi per anno di nascita** restano per chi non è iscritto e non è in età Baby Nuoto; per gli iscritti dietro «Vedi tutti i gruppi».
- **In vista cliente** si legge soltanto (niente Disdici né calendari: `periodo` non è fra le letture).
- Provato: `comune.ts` con `node --experimental-strip-types`; browser (Chromium, 390 e 1280 px, chiaro e scuro, funzioni simulate): 46 controlli, nessun errore di pagina. **Non provato**: funzioni vere, `CancelSingleBooking` su una prenotazione di gruppo, un telefono.
- **Pubblicato il 22/10/2026** (migrazione `20261022a`, `portale-lab-junior` v4, `portale-lab-calendario` v22, app #105). Tradotti in inglese con `t()` anche `Corsi.tsx`, `comune.ts` e `Iscrizione.tsx`.
- **Il mensile del Baby Nuoto** (22/10/2026, richiesta di Maurizio): «Attiva l'abbonamento mensile» sulla carta del mensile apre `/iscrizione?membro=<id>&baby=1`, la stessa schermata dell'iscrizione ai gruppi (`Iscrizione.tsx`, `baby` dall'indirizzo, niente `group`): costi e pro-rata, dati, contratto, firma del genitore, poi il pagamento degli abbonamenti. Come un Flex adulti **senza** il consenso 37 (scelta della formula) e **col genitore firmatario** (indirizzo e cellulare suoi, niente email del bambino). Funzione: azioni `baby_anteprima` e `baby_firma` di `portale-abbonamento` (APP-ATHLON); la condizione `corsi.baby` e la sezione 8 arrivano dal catalogo del sito. **Da pubblicare nell'ordine: sito (catalogo), `portale-abbonamento`, app.** Non provato con PerfectGym vero (`AddContract` sul piano 248, pro-rata) né con una sessione vera.

## Junior: il livello del bambino e la sua storia (22/10/2026)

Nella scheda «La tua famiglia» il livello della Scuola Nuoto Bambini sta accanto al nome («Nome Cognome · A2 - Stella Marina 2», `livello` di `junior_nucleo`: dal mirror, solo quello di adesso). Sotto, per la persona scelta, una carta «Livello» che apre **«La storia dei livelli»** (`junior/FoglioLivelli.tsx`, azione `livelli` di `portale-lab-junior`): una timeline dal più recente. **PerfectGym non dà le date dei passaggi**: le scrive il nostro database (`junior_livelli_storico`, APP-ATHLON) a ogni giro, da quando ha cominciato a guardare (22/10/2026). Sono date «rilevate», la prima riga dice «Livello al primo rilevamento» e una nota in fondo lo spiega; per i passaggi di prima non c'è nessuna data. **Pubblicato il 22/10/2026**: migrazione `20261022c`, `portale-lab-junior` v5, poi l'app. `tsc` pulito sui file toccati; **non guardato in un browser**, né con la funzione vera.

## Junior: la sezione come area a sé e i giorni dei gruppi agonistici (22/10/2026)

Richiesta di Maurizio: Junior deve essere «una vera sezione junior only one», dove si controlla tutto e dove, in futuro, andranno direttamente anche i nuovi. File: `junior/Presentazione.tsx`, `junior/ComeFunziona.tsx`, `junior/comune.ts`, `junior/Junior.tsx`.
- **Testata blu** (`TestataJunior`, colore `MARE`, due cerchi come sola decorazione, solo Views): «I corsi dei tuoi figli, in un posto solo», col nome della persona scelta; quattro pillole (Lezioni, Recuperi, Livelli, Iscrizioni).
- **«Come funziona» è stato tolto** (23/10/2026, richiesta di Maurizio: `ComeFunziona.tsx` eliminato; le regole stanno solo in «Da sapere»).
- **Giorni di Agonistico, Propaganda e Pallanuoto**: prima non comparivano (non stanno nel nome del gruppo); ora arrivano da `gruppi_junior()` (APP-ATHLON, migrazione `20261022d`, dal palinsesto) e `calendarioGruppo` li scrive sotto il nome: «Lun, Mar, Gio, Ven · 15:00–15:50», o per più fasce «17:30–18:20 (Lun, Gio) · 18:30–19:20 (Sab)». Alimentano anche il filtro per giorno. La Scuola Nuoto non cambia (`turnoNelNome`: l'orario è la sola ora d'inizio; gli altri hanno un trattino lungo). **Pubblicare prima la migrazione**: senza, i gruppi sono quelli di prima.
- **L'attività spiegata per la persona** (`SchedaAttivita`, contenuti in `junior/attivita.ts`): nella pagina Junior, per la persona scelta, una scheda per ogni attività che la riguarda — quelle a cui è iscritta; se no quelle che l'anno di nascita apre (Baby Nuoto per l'età del Baby; Scuola Nuoto per i nati 2013-2023; Pallanuoto 2013-2018, Propaganda 2014-2018, Agonistico 2008-2015) — con cos'è, i dati in breve e il riquadro «Da sapere». La prima si apre da sola. ****Dal 23/10/2026 `DaSapere` è una FAQ**: ogni voce ha titolo e anteprima di una riga, chiuse, e si aprono una a una. Per la Scuola Nuoto: «Prima di cominciare» dice che il certificato si carica in app (link alla sezione Certificato della Home), «Turno al completo» senza il rinvio alla segreteria, «Rinnovo e disdetta» rimanda alla procedura in app (non più disdetta@), **«Se serve fermarsi» tolta**, e una voce nuova «Segui i livelli nell’app». Lo stesso riquadro compare nel primo passo dell'iscrizione**, per l'attività del gruppo scelto (o il Baby Nuoto). Gli aspetti messi in evidenza sono quelli del Wiki (iscrizione, recuperi, disdetta, sospensione) e delle pagine dei corsi: turno fisso, recuperi (prima settimana e settimana dei Brevetti senza, abbonamento attivo, persi con la disdetta, entro il 20 giugno), gruppo deciso in vasca e istruttore dopo la prima settimana, certificato (non agonistico; agonistico per Propaganda e Agonistico), prova di inserimento obbligatoria per Pallanuoto e Agonistico, nessuna lista d'attesa per il turno, disdetta a 10 giorni e sospensione solo per inidoneità. **Nessun prezzo nelle schede**: lo calcola PerfectGym. Fa eccezione la quota mensile della Scuola Nuoto Bambini sulle righe dei gruppi (`quotaMensile` in `comune.ts`, 23/10/2026, richiesta di Maurizio): 89 € il monosettimanale e 109 € il bisettimanale, scritti a mano nel codice, da cambiare se il listino cambia. Anni, giorni e regole sono della stagione 2026/27 e vanno ripresi ogni anno insieme al sito (`data/junior.ts`). **I claim di Propaganda e i testi sono miei: da far rileggere al club.** L'orario del sabato della Propaganda è 18:30–19:20, come su PerfectGym: il sito è stato corretto (22/10/2026).
- `tsc` pulito sui file Junior; logica di `calendarioGruppo`, `titoloGruppo` e `attivitaDiPersona` provata con `npx tsx`. **Non guardato renderizzato** (390 e 1280 px, chiaro e scuro) né su un telefono.

## Junior: il Direttore Tecnico, dalla scheda di un bambino iscritto (22/10/2026)

`junior/DirettoreTecnico.tsx`, API `slotDirettoreTecnico` / `prenotaDirettoreTecnico` in `src/api/junior.ts`, funzione `portale-lab-junior` (azioni `dt_slot` e `dt_prenota`, APP-ATHLON). Richiesta di Maurizio: sotto i corsi di un bambino **iscritto** (dove ci sono disdette e recuperi) c'è la spiegazione del ruolo del Direttore Tecnico e il calendario per fissargli una telefonata, **senza chiedere nessun dato**.

- **Compare solo per un minorenne con almeno un gruppo** (`persona.minorenne && persona.gruppi.length > 0`), sotto `CorsiPersona`. Spiega cosa fa (progressione, cambio gruppo o orario, segnalazioni, dubbi sul percorso) e che **non è la strada per iscriversi** né per un posto in un turno pieno: le stesse parole della scheda «Direzione Tecnica» del Wiki, da tenere in pari.
- **Gli orari si leggono solo quando si apre il calendario** («Fissa una telefonata»): giorno, orario, poi **di cosa vuoi parlare** (obbligatorio: lo legge il Direttore Tecnico prima di chiamare) e, **solo se PerfectGym non ha il cellulare del genitore**, il cellulare. Nient'altro: genitore e bambino li ricava la funzione.
- **Chi prenota lo decide il server**: il titolare è l'indirizzo della sessione, il bambino deve essere un minorenne del suo nucleo con un'iscrizione in corso. Poi la funzione chiama la stessa rotta del sito: stessa agenda, stesso tetto di due al giorno, stessa email di conferma e avviso a nuoto@; la riga nasce con `origine = 'app'`. Un orario preso nel frattempo rilegge gli orari e lo dice.
- **In vista cliente** si vede la spiegazione e non si prenota (`dt_prenota` risponde 403).
- **Non provato**: una prenotazione vera con una sessione vera, la schermata resa (390 e 1280 px), un telefono. `tsc` pulito sui file toccati. **Pubblicare in ordine**: migrazione `20261022e`, `portale-lab-junior`, CRM (merge), app.

## Junior: l'anno di nascita non si sceglie, è quello della persona (22/10/2026)

Richiesta di Maurizio. Con una persona scelta in «La tua famiglia» (`Junior.tsx`, `annoFisso`) i gruppi sono **solo quelli del suo anno di nascita**: le tessere degli anni non compaiono, al loro posto una riga «Gruppi per <nome> · nato nel <anno>». Le tessere restano solo se non c'è una persona o se il suo anno non ha nessun gruppo. Il filtro per giorno e «solo con posti liberi» restano. `tsc` pulito; **non guardato renderizzato**.
- **Titolo e nota** (22/10/2026): con una persona scelta la riga sopra i gruppi dice «Le nostre attività per <nome> · nato nel <anno>», e sotto «La pallanuoto è solo maschile» (anche nella scheda dell'attività, «In breve»). **È una nota, non un filtro**: il sesso non è nel `nucleo` di `portale-lab-junior`, quindi le bambine vedono comunque i gruppi di Pallanuoto; per nasconderli serve il sesso da `junior_nucleo` (APP-ATHLON).

## Junior: un bambino iscritto cambia orario, vede il contratto e i pagamenti, e le lezioni sono quelle pagate (22/10/2026)

Richiesta di Maurizio (dallo schermo di un bambino della Scuola Nuoto Monosettimanale). File: `junior/CambioOrario.tsx`, `junior/PagamentiContratto.tsx`, `junior/Corsi.tsx`, `junior/Junior.tsx`, `src/api/junior.ts` (`chiediCambioOrario`).

- **Chi è iscritto non si iscrive ad altri corsi**: sparisce «Vedi tutti i gruppi» e con lui l'elenco dei gruppi. Al suo posto **«Cambio orario»** (`CambioOrario`): solo i turni **dello stesso tipo** (la categoria di PerfectGym: un monosettimanale vede i monosettimanali, un bisettimanale i bisettimanali), del suo anno di nascita, con un posto libero (`turniPerCambio`, pura). Si tocca un turno e si manda la richiesta: **non cambia niente da sola**, la segreteria sposta il turno su PerfectGym e conferma (nello stesso tipo non c'è una nuova quota). In vista cliente si guarda e basta.
- **Il Baby Nuoto non compare per chi è iscritto a un gruppo** (la funzione restituiva `baby` per ogni bambino di 3-36 mesi): lo toglie la funzione e lo ricontrolla `Corsi.tsx` (`esito.baby && iscrizioni.length === 0`).
- **Sotto la carta dell'abbonamento** (`PagamentiContratto`, stessa lettura di «I tuoi abbonamenti», azione `contratti` di `portale-abbonamento`): sottoscritto il, addebitato / pagato / da pagare, **il PDF del contratto firmato** (`documentoAbbonamento`) e i pagamenti, **in arrivo (da pagare) prima, poi quelli fatti**. Se il contratto non è nell'elenco la sezione non compare. Il PDF c'è solo per i contratti firmati dall'app.
- **«Le prossime lezioni» sono solo quelle di un mese pagato**: se la quota già scaduta del mese non è pagata, le sue lezioni non si vedono né si disdicono; un messaggio dice quante sono (`sospese`) e da che mese (`sospese_dal`). Il 22/10 si vedono le lezioni rimaste di ottobre e quelle di novembre (dal 21, il rinnovo, si vede anche il mese dopo; una quota conta «da pagare» solo se è già scaduta e non pagata). Lo decide la funzione SQL (APP-ATHLON, `20261022f`); con la funzione di prima le lezioni si vedono come prima.
- **Da pubblicare in quest'ordine**: migrazione `20261022f`, `portale-lab-junior`, app. **Non provato**: una richiesta vera con una sessione vera, la schermata resa, il PDF su un telefono. `tsc` pulito sui file toccati.

## Junior: solo i posti disponibili, e un pulsante per iscriversi su ogni gruppo (22/10/2026)

Richiesta di Maurizio. Nella riga di un gruppo (`Junior.tsx`) **non c'e' piu' il totale** («2 su 10 iscritti»): l'etichetta dice solo «N posti disponibili» / «1 posto disponibile» / «Completo» (`statoPosti` in `comune.ts`). **Aggiornato lo stesso giorno** (troppo impattante, e non si capiva a quale turno appartenesse): dentro il testo di ogni riga, sotto orario e anni, c'e' un link discreto **«Iscriviti a questo turno →»** in arancio (non piu' un pulsante pieno sotto la riga); la riga non e' piu' toccabile per intero. Il titolo della scheda attivita' e' «L'attivita' per <nome>». Stessa strada di prima (`tocca`: uno solo del nucleo idoneo apre `/iscrizione`, piu' di uno chiede prima chi), dove si spiegano costi e regole e da cui si arriva al pagamento. In vista cliente e per chi non puo' iscriversi il pulsante non c'e'. `tsc` pulito sui file toccati; **non guardato renderizzato**.

## La sezione Pagamenti: il metodo da una parte, i pagamenti dall'altra, e le quote scadute si pagano da qui (22/10/2026)

Richiesta di Maurizio (un socio con la carta registrata e una quota da pagare leggeva «Aggiorna il metodo di pagamento» quattro volte e non poteva pagare). File:
`home/MetodoPagamento.tsx`, `home/SezionePagamenti.tsx`, `pagamenti/Movimenti.tsx` (`DaPagare`), `home/DaFare.tsx`, `src/api/lab.ts` (`saldaPagamenti`, `esitoSaldo`). Lato server: `CLAUDE.md` di APP-ATHLON, «Il saldo delle quote scadute».

- **Sopra, «Metodo di pagamento»** (`MetodoPagamento`, dall'area: nessuna chiamata in più): una riga per metodo («Carta •••• 2365 · scade 04/2029», «Addebito sul conto •••• 1234») con gli abbonamenti che lo usano e per chi, l'etichetta «Registrato» / «Scaduta» / «Manca», e un solo comando: «Cambia metodo» (grigio) o, se manca o è scaduto, «Aggiungi il metodo di pagamento» (arancio). È l'unico posto della sezione che porta a `/metodo-pagamento`.
- **Sotto, lo stato dei pagamenti**: «Da pagare» (rosso), prossimi pagamenti, effettuati. **«Da pagare» non dice più «non è andato a buon fine»**: una quota che scade oggi non è ancora stata addebitata, e il dato non dice se un addebito è fallito. Dice «Scade oggi e non risulta ancora pagata» o «È scaduta e non risulta ancora pagata», e si paga: **«Paga 21,00 € con la carta •••• 2365»** (la carta registrata sul contratto, anche quella del genitore per il figlio: `saldo.carta` di `movimenti`) e **«Usa un’altra carta»** (la pagina della carta di Adyen, che torna su `/?sezione=pagamenti&saldo=1`; il parametro si toglie). Senza carta resta solo «Paga … con la carta». Dopo il pagamento si chiede com'è andata ogni 4 secondi per due minuti (`esitoSaldo`): «Pagamento ricevuto», il motivo del rifiuto di Adyen, o «Non vediamo ancora il pagamento». Se il totale è cambiato il server non addebita niente e la lista si rilegge. Nel dettaglio di una quota da pagare non c'è più il pulsante del metodo.
- **«Da fare»**: per un pagamento in sospeso il pulsante è «Paga adesso» (apre la sezione Pagamenti); «Aggiorna il metodo» c'è solo se il metodo manca o la carta è scaduta.
- **In vista cliente** niente pulsanti di pagamento (le azioni `salda` e `saldo_esito` rispondono 403) e «Da fare» dice «Vedi i pagamenti».
- **Con la funzione di prima** `saldo` non c'è: niente carta proposta, e «Paga … con la carta» risponde che il pagamento dall'app non è ancora attivo. **Pubblicare prima `portale-lab-pagamenti`, poi l'app.** **Pubblicato così il 22/10/2026**, su richiesta di Maurizio («pubblica tutto»): `portale-lab-pagamenti` v14, poi l'app.

Per verificare: `npx tsc --noEmit` pulito. **Provato in Chromium** (bundle web esportato, Supabase simulato con `page.route`, 390 px e 1280 px), sul caso del 22/10: carta •••• 2365 del genitore su Scuola Nuoto di un figlio, pro-rata di 21 € che scade oggi. Il metodo in un riquadro suo, «Da pagare» con «Scade oggi», nessun «Aggiorna il metodo» né «non è andato a buon fine», il clic che manda `salda` con `totale: 21` e `con_carta: true`, la verifica che diventa «Pagato», il ritorno con `?saldo=1` che chiede `saldo_esito` e toglie il parametro, nessuno scorrimento orizzontale. **Non provato**: un pagamento vero (PerfectGym e Adyen erano simulati), un telefono.

## Junior: rinnovo mensile, contratto scaricabile e Disdici (22/10/2026)

Richiesta di Maurizio. File: `junior/Corsi.tsx` (`DisdiciAbbonamento`), `junior/PagamentiContratto.tsx`, `junior/comune.ts` (`disdettaVera`, `rinnovoJunior`, `fineDisdettaMensile`), `api/junior.ts`
(`disdiciCorso`), `api/documenti.ts` (`apriFilePgm`). Lato server: `CLAUDE.md` di APP-ATHLON, stessa data.

- **Rinnovo**: «Abbonamento mensile: si rinnova automaticamente ogni mese, salvo disdetta». Via «Disdetto il … finisce il 20 giugno» e «Pagato fino al»: era la «disdetta» che PerfectGym mette su ogni
  iscrizione a un corso, con la fine del corso. Una disdetta vera finisce l'ultimo giorno di un mese (`disdettaVera`), e allora la riga dice «Disdetto: finisce il …».
- **Il contratto si scarica**: quello firmato dall'app (`firmato`) o quello firmato al desk che PerfectGym conserva fra i file (`documento_pgm`). Se PerfectGym non l'ha ancora creato **non c'è nessuna
  scritta** (non più «chiedilo alla segreteria»): il pulsante compare quando il file c'è.
- **«Disdici l'abbonamento»** sotto il contratto (mai in vista cliente): un foglio dice quando finisce con la regola dei 10 giorni (il 22/10: il 30 novembre), che fino ad allora le lezioni restano e le quote
  sono dovute, e che dopo il posto si libera e i recuperi non usati si perdono. Poi `disdici_corso` su PerfectGym; la data la decide la funzione.
- Provato: `tsc` pulito; in Chromium (bundle web, funzioni simulate, 390 px chiaro e 1280 px scuro): rinnovo mensile, nessun «Disdetto il» né «Pagato fino al», il PDF che apre il file del desk, il foglio
  col 30 novembre, la richiesta con member e contratto giusti, «Disdetta registrata» e la riga «Disdetto: finisce il 30 novembre», niente Disdici in vista cliente, nessuno scorrimento orizzontale.
  **Non provato**: le funzioni vere e PerfectGym.


## Il badge di accesso al club: la carta per il wallet, parte grafica (22/10/2026)

Richiesta di Maurizio. Cartella `src/features/lab/badge/` e rotta `/badge` (`src/app/(portale)/badge.tsx`). **È solo la parte grafica**: la funzione che emette il pass (`portale-lab-wallet`: aggiungere, cambiare telefono) e il controllo accessi coi lettori VTAP sono nel `CLAUDE.md` di APP-ATHLON («Il controllo accessi: l'anti-passback di 10 secondi»); la funzione del wallet **non c'è ancora**.

- **`BadgeAccesso`** è la carta: formato di una carta (1,586 : 1), «carbone» **scura uguale nei due temi**, alone arancio in alto a destra, anelli in basso, marchio, nome, numero socio e il segno del «senza contatto» (SVG, `SegnoSenzaContatto`). **Niente foto**: nell'app la foto sta in due posti soli (Profilo e Home), e un posto in più si chiede al club. **Niente stato** («attivo», «scaduto»): se si entra lo decide il database a ogni passaggio, il badge non lo sa. Un nome scritto tutto in maiuscolo su PerfectGym si legge «Marco Rossi» (`nomeLeggibile`).
- **`BadgeVista`** è la schermata senza chiamate (persone, stato, vista cliente): la carta, la scelta della persona del nucleo (un badge per persona, titolare in cima; compare solo con più di una), i pulsanti del wallet, «Come si usa» in quattro punti e una riga su cosa c'è sul badge. **`Badge`** la riempie con `laMiaArea` e, finché la funzione non c'è, passa `stato="in_arrivo"`.
- **Tre stati** (`StatoBadge`): `in_arrivo` (oggi: pulsanti spenti e «In arrivo»), `da_aggiungere` e `aggiunto` («Nel tuo wallet», pulsanti secondari). **`onAggiungi(persona, wallet)` è il solo punto di aggancio** per la funzione: collegarla vuol dire passare lo stato vero e quella funzione, non riscrivere la schermata.
- **Il wallet è quello del telefono** (`walletDelTelefono`): Apple su iPhone e iPad, Google su Android; **su un computer tutti e due** con «Per aggiungerlo apri l'app dal telefono». **I pulsanti sono nostri, non quelli ufficiali**: al lancio vanno messi quelli di Apple e di Google, con le loro regole d'uso (da leggere: non verificate da qui).
- **In vista cliente niente** («Il badge lo aggiunge solo il socio»): aggiungerlo crea una credenziale che apre una porta.
- **Nessun ingresso dalla Home o dalla barra**: si raggiunge da `/badge`. La carta in Home (come `CartaInvita`) si aggiunge quando la funzione c'è e dice che è attiva.
- **Deciso da Maurizio il 22/10/2026 («Ok su tutto»)**: **un solo badge attivo per persona** (aggiungerlo su un altro telefono fa smettere di funzionare il vecchio: per questo la riga «Hai cambiato telefono? Aggiungilo di nuovo: quello vecchio smette di funzionare»), e **il badge si vede per tutte le persone del nucleo**, anche senza un abbonamento (un Guest Pass, un figlio): chi non ha i requisiti lo dice il tornello, con il suo motivo. **La funzione (`portale-lab-wallet`) deve farlo rispettare**: un solo identificativo attivo per persona e la revoca del precedente. I pulsanti dei wallet restano i nostri fino al lancio.
- **Provato**: `tsc --noEmit` pulito (il repository non ha ESLint configurato). Con il bundle web esportato e una pagina provvisoria poi tolta, in Chromium: 390 px chiaro e scuro, 1280 px, italiano e inglese, user agent di iPhone (solo Apple) e di Android (solo Google), una e tre persone, i tre stati, la vista cliente; nessuno scorrimento orizzontale e nessun errore in console. **Non provato**: un telefono vero, un wallet vero, la schermata dietro un login vero.

## Dalle tue visite al club: il «consigliato» onesto, gli orari riportati e «La fai già» (22/10/2026)

Richiesta di Maurizio: usare lo storico di Train per personalizzare consigli e piani, con il calcolo nel codice e senza dati in più verso i modelli. **Lo calcola il server** (`abitudine` nelle risposte di `elenco` di `portale-lab-schede` e di `consigli_stato`, `consigli`, `consigli_ultimi` di `portale-lab-percorso`), dal tornello e dalle presenze alle lezioni: fonti, soglie, privacy e cosa non è provato stanno nel `CLAUDE.md` di APP-ATHLON, «L'abitudine del socio». Qui sta cosa ne fa l'app. File: `src/api/lab.ts` (`AbitudineTrain`, `abitudineDa`), `src/api/percorso.ts` (`gia_fatta`), `schede/abitudine.ts` (regole **pure**), `schede/abitudineMemoria.ts`, `schede/profiloComune.ts`, `schede/questionario.ts`, `schede/PassiSala.tsx`, `schede/Schede.tsx`, `consigli/Consigli.tsx`.

- **Cosa arriva.** Un riassunto: giorni al club nelle ultime quattro settimane e a settimana, quando di solito viene (fasce e giorni), da quanti giorni non entra, se è `affidabile` (la prima attività è di almeno tre settimane fa) e `volte_sostenibili` (i giorni a settimana di oggi più uno, al massimo sei). **Senza i nomi delle lezioni** (stanno nei consigli, una per una). Con una funzione che non lo manda, o un socio senza storia, il campo manca e **l'app fa come prima**: niente rotto, niente scritto.
- **Dove sta in memoria** (`abitudineMemoria.ts`): **solo in memoria**, mai sul disco, e si butta con l'uscita dall'app (`dimenticaProfilo` in `profiloComune.ts`, dentro `esciDalLaboratorio`). Lo riempie la schermata Train (`Schede.tsx`, a ogni lettura dell'elenco), la schermata dei consigli (a ogni lettura) e, all'avvio a freddo, `PassiSala` (una lettura sola per apertura dell'elenco dei piani, saltata in vista cliente). Una risposta senza abitudine **non cancella** quella che c'è.
- **Piano di sala: il «consigliato» dei giorni a settimana non sale mai** (`giorniSalaConsigliati`, usato da `giorniConsigliati`): `max(2, min(base, volte_sostenibili))` quando l'abitudine è affidabile, altrimenti la regola di prima (3, 4 per un esperto, ±1 per durata e intensità, fra 2 e 5). Chi viene due volte a settimana vede «Consigliato» su 2, non su 3. **Non è un vincolo**: la persona sceglie il numero che vuole. Se sceglie **due o più giorni sopra** `volte_sostenibili` (`notaSalto`) compare sotto la griglia una riga morbida, senza cifre e senza bloccare: «Partire da N è un bel salto rispetto a quanto vieni oggi. Puoi farlo; se vuoi, sali un po’ alla volta.» Sopra la griglia, nel sottotitolo, la frase con le cifre vere (`testoAbitudine`: «Nelle ultime quattro settimane risultano N giorni al club (ingressi o lezioni), circa X a settimana.»; con zero giorni dice che non risultano).
- **Consigli: lo stesso «consigliato» sulle volte** (`volteConsigliate`): nella domanda «quante volte pensi di venire» la pillola di `volte_sostenibili` porta «· consigliato» e sotto stanno la frase con le cifre e, se serve, la nota del salto. **La funzione mette un tetto alle volte per lezione** (un giorno in più di quanti ne fa oggi, al massimo tre), quindi chi viene di rado non legge «tre volte a settimana» su una lezione sola.
- **Quando viene, riportato dalle visite, in fondo alla fila** (`profiloEffettivo`, `inConsigli`, `momentoDaVisiteAlPosto`): il profilo comune (sezione dei piani, «Il profilo comune con i Consigli») ha sempre la precedenza. **Solo dove la persona non ha detto niente** né in sala né nei Consigli, la fascia (`fasce`) e i giorni (`giorni`) dei Consigli e la fascia della sala si precompilano dalle visite, e la riga sopra la risposta dice **«Dalle tue visite al club»** (in sala sopra l'opzione; nei Consigli la riga arancio «Riportato dalle tue risposte precedenti» diventa «Dalle tue visite al club: cambialo se serve.»). **Una risposta della persona non si riscrive mai**; toccarla toglie il segno. Più fasce diverse nel profilo valgono «cambia da un giorno all'altro» come prima; il weekend, se le visite lo indicano, è una fascia dei Consigli; in sala non si riporta (la sala ha una fascia sola, e `momentoDaFasce` ignora il weekend: un socio che viene solo nel fine settimana non ha un momento dalle visite).
- **«La fai già» sulla carta della lezione** (`ConsiglioRisolto.gia_fatta`): «La fai già: N volte nelle ultime otto settimane, l’ultima mercoledì 21 ottobre.» **Le cifre le scrive il server dalle presenze** che la reception ha segnato (il modello non le vede). Non compare dove non ci sono presenze a quel tipo di lezione. La carta «Come leggere questi consigli» dice una cosa in più: «Abbiamo tenuto conto anche di quanto vieni al club. Nelle ultime quattro settimane risultano… Le volte a settimana che ti consigliamo per ogni lezione partono da lì, e le lezioni che fai già sono segnate.»
- **Consigli salvati.** `consigli_ultimi` li ricontrolla con l'abitudine di adesso: un consiglio salvato con tre volte può tornare con due. Se l'abitudine arriva dopo che la schermata si è aperta senza risposte salvate né date, `Consigli.tsx` rifà dal profilo le risposte riportate (`consigliDaProfilo`) senza toccare quelle della persona.
- **Parole.** Descrive, non giudica: nessun «sei poco costante», nessun confronto con altri soci, nessun obiettivo. «Un bel salto» e «consigliato» sono inviti a partire piano. Italiano e inglese con `t()`.
- **Vista cliente dello staff.** `consigli_*` restano chiusi; il piano di sala non si compone (`chiedi_ai` chiuso) e `PassiSala` **non** va a leggere l'abitudine in vista cliente. L'elenco dei piani (`elenco`) è una lettura anche lì e porta il riassunto del cliente guardato (le sue cifre, senza lezioni), che resta in memoria fino all'uscita.
- **Provato.** `npx tsc --noEmit` senza errori nuovi; le regole pure con `LC_ALL=it_IT.UTF-8 npx tsx` (12 gruppi: il «consigliato» dei giorni di sala che non sale mai e non scende sotto due; `giorniConsigliati` che legge l'abitudine dalla memoria; la riga con le cifre vere; la nota del salto solo da due giorni sopra e senza bloccare; il momento dalle visite; `profiloEffettivo` con la risposta data che vince; la sala con il momento dalle visite segnato e mai sopra una risposta; la fascia riportata che segue le visite finché non si tocca; i Consigli con fasce e giorni dalle visite solo dove non c'è una risposta; `consigliDaProfilo` che rifà le scelte riportate e lascia le altre; `senzaToccate` con i giorni; `dimenticaProfilo` che butta anche l'abitudine); **per mutazione**: 17 modifiche del codice, tutte rilevate. **In Chromium** (bundle web esportato, funzioni simulate con `page.route`; **390 px con touch e 360 px in inglese, tema chiaro**; 10 schermate in cinque blocchi): i Consigli con la frase delle cifre e «consigliato» sulle volte, le fasce e i giorni «Dalle tue visite al club», la richiesta che parte, la carta con «La fai già» e la spiegazione, una funzione di prima e un'abitudine non affidabile (schermate come prima), la sala con i giorni consigliati, le cifre, la nota del salto e la fascia dalle visite, e la versione inglese; nessuno scorrimento orizzontale, nessun errore in console. Dalle schermate sono usciti due difetti, corretti: «circa 1 giorni a settimana» (il plurale) e una nota del salto che ripeteva le cifre già scritte sopra; e una frase con i due punti seguita da una maiuscola nella carta «Come leggere questi consigli» (ora un punto).
- **Non provato.** Una sessione vera e le funzioni vere (**non sono pubblicate**: finché non lo sono, l'app non riceve `abitudine` e tutto resta com'era); un telefono; **lo schermo largo (1280 px) e il tema scuro**, mai guardati con queste modifiche; la vista cliente (la regola che salta la lettura in sala è scritta e non guardata); come si leggono le frasi con un socio vero che ha poche visite. Le soglie (consigliato = giorni di oggi + 1, la nota del salto a +2) sono nostre, da far rivedere dal Direttore Tecnico.
- **Da pubblicare**: prima `portale-lab-percorso` e `portale-lab-schede` (APP-ATHLON), poi questa app; con le funzioni vecchie l'app funziona come prima. **L'informativa privacy del club lo dice dal 23/10/2026** (SITO-ATHLON #349, punto h, versione 2.2): la base giuridica scelta («esecuzione del contratto») va confermata dal consulente prima di aprire oltre i tester.

## Il piano di nuoto si stampa, si salva in PDF e si condivide (23/10/2026)

Richiesta di Maurizio. Nella scheda di un piano di vasca (`Scheda.tsx`), sotto la spiegazione «si legge e non si registra», due pulsanti: **«Stampa o salva in PDF»** e **«Condividi il piano»**. Solo per i piani di vasca: in sala il piano si registra, e non c'è un documento da portare a bordo.

- **Il documento** lo compone `schede/documentoVasca.ts` (puro, si prova con `npx tsx`): tutte le sedute, ognuna coi suoi metri (un'addizione, mai minuti), la parte, «4 × 100 m», l'intensità come parola, il recupero, le note, e in fondo l'avvertenza (accorcia la seduta, con dolori chiedi al tecnico). **Dice le stesse cose della schermata e non ne aggiunge**: niente calorie, niente stime. Esce in due forme: una pagina HTML da stampare (bianco e nero, una seduta non si spezza fra due fogli) e un testo semplice.
- **Sul web** `stampaPiano` (`schede/esportaVasca.ts`) stampa la pagina da un riquadro nascosto: la finestra di stampa del browser stampa e, scegliendo «Salva come PDF», salva. Nessuna libreria, nessun file che passa da un server, niente si conserva. Il nome proposto per il PDF è `piano-nuoto-<titolo>` (per il tempo della stampa cambia il titolo della pagina). **«Condividi»** apre il foglio di condivisione del dispositivo col testo, o lo copia negli appunti.
- **Sull'app nativa non c'è un PDF**: servirebbe un modulo nuovo e quindi una build; «Stampa o salva in PDF» apre il foglio di condivisione del telefono col testo, da cui si salva (Note, File, email) o si stampa. Se si vuole un PDF vero anche lì, è `expo-print` e una build.
- **Nessuna modifica al server**: l'app non chiama niente di nuovo e funziona con le funzioni di oggi.

Provato: `tsc` senza errori nuovi sui tre file; il documento con una prova (metri, escape di `<` e `&` nel titolo, nome del file, nessuna parola di calorie o minuti) e **la pagina stampata in PDF con Chromium** (A4, colonne allineate fra le sedute). **Non provato**: la finestra di stampa vera su Safari e Firefox, `navigator.share` su un telefono, il foglio di condivisione dell'app nativa, e il pulsante renderizzato nella scheda (390 e 1280 px, chiaro e scuro).

## Iscrizione Junior: piano di pagamento senza testo prima, con prima lezione e fine del corso; i totali solo nel contratto (23/10/2026)

Richiesta di Maurizio. Nel passo 1 di `/iscrizione` sono spariti il riquadro «Da sapere» e la sezione «Quando parte»: resta «Il tuo piano di pagamento» (`RiepilogoCosti`), con in cima la **prima lezione** (`anteprima.inizi[0]`, solo se il server la manda) e la **fine del corso** (`FINE_STAGIONE` in `Iscrizione.tsx`, 20/06/2027, da riprendere ogni anno col sito; non per il Baby Nuoto). **Nessun totale** né nel passo 1, né sopra il contratto, né nella pagina del metodo di pagamento (`senzaTotale`; lì solo per i mensili `flex`): si vedono «Oggi paghi» e «Prossimi pagamenti». **I totali stanno solo nel contratto** (`_shared/contratto-junior.ts` di APP-ATHLON, «Riepilogo dei costi»): «Totale fino alla fine dell'impegno minimo» e, per i corsi (non il Baby), «Totale stimato fino alla fine del corso» (l'ultima quota è proporzionale ai giorni effettivi, come dice il contratto: è una stima). Il contratto ha anche la riga «Fine del corso» e dice che **la disdetta si fa dall'area riservata** (Junior › il corso › Disdici l'abbonamento), non per e-mail. **Gli articoli 4.x dell'Allegato A (catalogo del sito) citano ancora l'e-mail `disdetta@athlonroma.it`**: sono clausole contrattuali e non si toccano senza il club.

## Correzione dei dati: salvare non deve fallire per l'indirizzo o per l'email mancante (23/10/2026)

`CorreggiDati` manda l'indirizzo solo se la persona lo scrive: dichiarare «residente all'estero» o cambiare il Paese non riscrive quello che c'è su PerfectGym (prima Roma + Regno Unito dava `InvalidCityName`). Lato funzione (`portale-abbonamento`): se una persona non ha email (un minorenne), `UpdateMemberDetails` la vuole comunque nei dati personali e senza risponde `PersonalData.Email: Incorrect field format` (l'app lo mostrava come errore di codice fiscale): ci va l'email del genitore che è entrato. Una città rifiutata da PerfectGym non blocca più il resto del salvataggio.

## Junior: l'iscrizione appena firmata si vede subito, il pagamento si aggiorna da solo (23/10/2026)

Richiesta di Maurizio (iscrizione di prova di Emma: tornando sulla sezione Junior risultava ancora «da iscrivere»). Il contratto nasce su PerfectGym alla firma, ma `portale-lab-junior` e `portale-abbonamento` leggono il **mirror**, che arriva con qualche secondo (a volte minuti) di ritardo. Quindi: (1) **alla firma** `Iscrizione.tsx` registra l'iscrizione «in corso» (`junior/inCorso.ts`, solo in memoria, vale 20 minuti) e butta le letture di prima (`junior:gruppi`, `junior:corsi:*`, `abbonamenti:contratti`, `area`); (2) la sezione Junior tratta subito la persona da iscritta (`conInCorso` in `Junior.tsx`) e `CorsiPersona` mostra la carta **«Iscrizione in corso · Da pagare»** con «Completa il pagamento» (porta a `/abbonamento`); (3) **a ogni ritorno sulla schermata** (`useFocusEffect`: Junior, `CorsiPersona`, `PagamentiContratto`) si rilegge, e **ogni 6 secondi finché il mirror non vede l'iscrizione** (poi la carta provvisoria sparisce da sola e restano i dati veri); (4) quando la pagina dell'abbonamento vede il pagamento a posto (`EsitoContrattoVista`, stato `completato`) la carta passa a **«Pagato»** subito e le letture si rifanno. Per il **Baby Nuoto** non c'è la carta provvisoria (non ha un gruppo): solo la rilettura a ogni ritorno. Provato solo con `tsc`; **non guardato in un browser e non provato con un pagamento vero**.

## Le stelle alle lezioni: una carta in Home, un tocco, da 1 a 5 (24/10/2026)

Richiesta di Maurizio. `home/CartaValutaLezione.tsx`, sotto «Da fare»: «Com'è andata?» per la lezione più recente a cui la reception ha segnato la presenza negli ultimi 7 giorni e che il socio non ha ancora votato. **Un tocco su una stella salva** (niente «Invia») e la carta passa alla lezione dopo, se c'è (al massimo cinque in coda); «Non ora» la nasconde per questa apertura dell'app, senza segnare niente. **Solo le stelle, nessun testo libero.** Votare di nuovo la stessa lezione cambia il voto.

- **Lo decide la funzione**, non l'app: `portale-lab-calendario`, azioni `da_valutare` e `valuta` (APP-ATHLON, migrazione `20261024b_lezioni_valutazioni.sql`). Restano fuori Gym Floor e Nuoto Libero (turni, non lezioni). Solo il titolare. Con la funzione di prima o senza risposta la carta non compare.
- **In vista cliente non c'è e non si chiama niente**: chi guarda l'app di un socio non vota al suo posto (le due azioni non sono fra le `LETTURE`).
- **Cosa vede il club**: la vista `lezioni_valutazioni_riepilogo` (medie e conteggi per lezione e istruttore, solo con almeno 3 voti, ultimi 90 giorni). **Nel CRM non c'è ancora una pagina che la mostri**, e nessuno vede chi ha dato quale voto.
- **Da pubblicare in quest'ordine**: migrazione, `portale-lab-calendario`, app.
- **Provato** in Chromium (bundle web, funzione simulata; 390 e 1280 px, chiaro/scuro, italiano e inglese): la carta, il voto con la richiesta esatta (`class_id`, `stelle`), il grazie e la lezione dopo, «Non ora», errore del server con la carta che resta, nessuna lezione e funzione di prima senza carta, nessuno scorrimento orizzontale. **Non provato**: la funzione vera con una sessione vera, un telefono.

## Prenotazioni staccate sopra i giorni; Junior con quota scaduta; Direttore Tecnico: si vede, si sposta, si annulla (24/10/2026)

Richieste di Maurizio. In produzione dal 24/10/2026 (PORTALE-ATHLON #132 e #133, con le funzioni di APP-ATHLON #441). Lato server: `CLAUDE.md` di APP-ATHLON, stessa data.

- **Calendario, «Le tue prenotazioni»** (`Calendario.tsx`, `LezioniPrenotate`): un blocco sopra la striscia dei giorni con **tutte** le prenotazioni attive, a prescindere dal giorno scelto (`Giorno.prenotate`, `Prenotata` in `api/lab.ts`), ognuna con «Annulla». Dopo prenota o disdici si aggiorna dalla risposta. Con una funzione che non manda `prenotate` si ripiega sulle lezioni prenotate del giorno.
- **Junior, quota scaduta** (`junior/Corsi.tsx`, `inDebito` = `sospese > 0` o `sospese_dal`): niente «Disdici» sulle lezioni, un riquadro spiega che finché la quota non è pagata non si può disdire, e sparisce la riga «Puoi disdire fino a un'ora prima». La funzione rifiuta comunque con 409: l'app nasconde il comando per non offrirne uno che non risponde.
- **Direttore Tecnico, «Il tuo appuntamento / I tuoi appuntamenti»** (`junior/DirettoreTecnico.tsx`, `CartaAppuntamento`; `appuntamentiDirettoreTecnico`, `spostaDirettoreTecnico`, `annullaDirettoreTecnico` in `api/junior.ts`): appena prenotato l'appuntamento compare in elenco (dalla risposta, con l'`id` che la funzione ora manda, poi rilettura) con il giorno, l'ora, il motivo e **«Sposta»** (giorni e orari liberi, **compreso quello che si sta lasciando**; se qualcuno prende l'orario scelto si rilegge e lo si dice) e **«Annulla»** (con conferma). In vista cliente l'elenco si vede e i comandi no. Il pulsante per prenderne un altro dice «Fissa un'altra telefonata».
- **Il motivo è obbligatorio e si vede**: etichetta «(obbligatorio)», avviso finché è vuoto, pulsante spento. Il controllo vero sta nella funzione.
- **Da pubblicare in quest'ordine** (fatto così): CRM, funzioni, app. Un'app nuova con la funzione vecchia non ha `dt_mie` e mostra solo la conferma.
- **Provato**: `tsc` sui file toccati. **Non guardato in un browser né su un telefono**, e non provato con una sessione vera.

## Cambio orario Junior: modal di conferma, la richiesta non è automatica (25/10/2026)

Richiesta di Maurizio. Scegliendo un turno in «Cambio orario» (`junior/CambioOrario.tsx`) si apre il foglio di conferma, che dice: la richiesta **non è automatica**, la segreteria la controlla e la approva o la rifiuta; solo dopo l'approvazione il bambino cambia turno, **dalla prima lezione utile** dopo la data comunicata (fino ad allora resta nel turno di adesso); l'esito arriva per email; e si **raccomanda di chiedere il cambio solo se strettamente necessario**, per la continuità didattica. Pulsanti «Ho capito, manda la richiesta» e «Annulla». Anche l'introduzione e il messaggio «Richiesta inviata» dicono che l'esito arriva dopo. Lato server (tabella, avviso in Dashboard, email al desk e al genitore): `CLAUDE.md` di APP-ATHLON. `tsc` pulito; **non guardato in un browser**.

## Apple Salute come hub e allenamenti scritti a mano (28/10/2026)

Richiesta di Maurizio: invece di collegare ogni wearable, si legge da Apple Salute (dove scrivono Apple Watch, Oura, Garmin, Fitbit…) e si può scrivere a mano un allenamento («tre ore in bici»). Lato server (migrazione `20261028a`, `portale-lab-dispositivi`, informativa `2026-10-28`): `CLAUDE.md` di APP-ATHLON.

- **Lettura** (`dispositivi/appleSalute.ts`): passi, calorie attive, battito a riposo, HRV, sonno con fasi (periodi uniti fra app diverse, per non contare due volte un minuto), allenamenti con battito medio/massimo, e il nome dell'app o del dispositivo (`origine`). Chi aveva attivato Apple Salute con l'elenco di prima riceve la richiesta dei permessi nuovi una volta (segno `apple-salute-permessi-v2.txt`). Serve una build nativa nuova.
- **Punteggio e calorie** (`dispositivi/allenamentiDispositivo.ts`, puro): gli allenamenti dei dispositivi e quelli a mano contano come giorni attivi (`fonte: 'dispositivo'`) e nel contatore delle calorie, **solo se non si sovrappongono (oltre la metà) a una seduta o lezione già contata**, e fra loro si tiene quello con più dati. Calorie: misurate dal dispositivo → dal battito (Keytel 2005, sopra i 90 bpm) → MET per sport e intensità (valori ricordati, da far validare). La schermata dice quale. Servono i dati del corpo per le ultime due; senza, conta solo per il punteggio. Keytel tende a sovrastimare a battiti medi: è una stima.
- **Inserimento a mano** (`fit/AggiungiAllenamento.tsx`, in Train sotto «I tuoi dispositivi»): sport, giorno, ora, durata, intensità, battito facoltativo; le calorie le calcola l'app e la funzione le controlla; si può togliere. Serve il consenso ai dispositivi.
- Provato: `tsc` pulito e le regole pure con `npx tsx` (sport, i tre metodi, sovrapposizioni). **Non provato**: HealthKit vero (le letture di battito/HRV/fonti sono scritte secondo la documentazione della libreria), la schermata a video, un telefono.

## Athlon Health System: i dati del corpo da compilare (blocco morbido), e l'app Salute si invita subito e resta «da attivare»

Richiesta di Maurizio: aprendo la sezione si offre subito di collegare l'app Salute; se la persona salta, deve restare sempre in evidenza che è da attivare; e i dati (altezza, peso, sesso) devono essere in evidenza come **da compilare**. **All'inizio erano obbligatori** (la sezione restava chiusa finché mancavano); lo stesso giorno si è passati al **blocco morbido**: vedi sotto il perché. Collegare Apple Salute (o Google Salute, quando ci sarà) si esalta ma **non è obbligatorio**.

- **I dati da compilare sono tre: altezza, peso e sesso** (`fit/calcoloDatiCorpo.ts`, **puro**: `datiMancanti`, `statoDati`; si prova con `npx tsx`). **L'età non è fra questi**: viene dalla scheda del club e la persona non può scriverla da qui (le stime dicono da sole che manca). **Non chiudono la sezione.** Finché mancano, subito sotto il video c'è la carta **«Completa i tuoi dati» con «Da compilare»** (`fit/DatiDaCompilare.tsx`: bordo arancio, anello che pulsa, le tre voci con «Da inserire» / «Fatto», il pulsante per inserirli) e **calorie e Balance restano chiusi**: lo dicono loro, con il pulsante per inserire i dati (il Balance e le schermate delle calorie avevano già questo comportamento). Tutto il resto (punteggio, piani, Food, Recover, dispositivi) si usa come sempre. La vecchia carta «I tuoi dati» non si mostra finché c'è la nuova (non si invita due volte a fare la stessa cosa).
- **La carta non c'è**: in vista cliente dello staff, ai minorenni, mentre non si sa ancora (`attesa`: prima di mostrarla bisogna sapere che è un adulto) e se la lettura delle misure non riesce e non c'è niente in memoria (un guasto della rete non deve far comparire un invito a chi i dati li ha già).
- **Sparisce da sola appena i dati ci sono**: `useDatiCorpo` rilegge a ogni ritorno sulla schermata (`useFocusEffect`), perché «Il tuo corpo» si apre sopra e `Schede` resta montata sotto. In quel passaggio (e solo in quello) `Schede` rifà da zero il contenuto (`ContenutoHub` con una `key` nuova): `useFit` e le misure sarebbero quelli di prima dei dati. Il video sta sopra a tutto e non riparte.
- **Il sesso si sceglie anche da «Il tuo corpo»** (`dati/Misure.tsx`, `CartaSesso`): prima lo sceglieva solo chi apriva le calorie di una scheda, e senza non si poteva completare i dati. In evidenza con «Da compilare» finché manca, in fondo (cambiabile) dopo. `SceltaSesso` si è spostata da `schede/Calorie.tsx` a `dati/SceltaSesso.tsx` (si sarebbe creato un giro di import).
- **Perché il blocco morbido e non quello totale.** Le misure sono dati sulla salute e hanno un consenso esplicito proprio. La regola del club è «nessun livello, soglia o premio dipende dal consenso a Food, Relax o alle misure» (art. 7, par. 4 GDPR: un consenso che si dà per non perdere un vantaggio non è libero). Un blocco dell'intera sezione le avrebbe contraddette (chi non dà il consenso non usa Athlon Health System); chiudere solo ciò che usa davvero quei dati (le calorie) è difendibile. **La pagina del consenso (`dati/informativaCorpo.ts`) dice «senza, il resto dell'app funziona»: resta vero.** Una persona che non li inserisce non perde altro che le calorie. Resta da far vedere il testo al consulente. Chi ha già altezza e peso ma non ha mai scelto il sesso vede la carta con la sola voce «Sesso» da inserire.
- **L'invito all'apertura** (`fit/InvitoSalute.tsx`, `InvitoSaluteAllApertura`): una schermata intera (come quella con cui le altre app di allenamento chiedono l'accesso ai dati Salute): cosa si legge (passi, sonno, allenamenti), a cosa serve, «Scegli tu cosa condividere». **«Continua»** porta a `/allenamento/dispositivi?attiva=apple`: prima l'informativa dei dispositivi (il consenso, se manca; la schermata lo dice), e appena la carta di Apple Salute compare apre da sola il foglio di Apple (`chiediPermessoSalute`); il parametro si toglie subito. **«Non ora»** la chiude. **Compare una volta sola per dispositivo** (segno in `appleSalute.ts`: `invitoSaluteVisto` / `segnaInvitoSaluteVisto`, file nella cartella dell'app o `localStorage`; se non si riesce a scrivere vale comunque per l'esecuzione in corso). Solo dove c'è un'app Salute (`appSaluteDelTelefono()`: oggi `'apple'` su iPhone, **Google Salute/Health Connect si aggiungerà lì**), per i maggiorenni, se non è già attiva, mai in vista cliente. Se si vuole a ogni apertura e non una volta sola, basta non segnarlo.
- **La carta «Da attivare» resta in evidenza finché non si attiva** (`fit/CartaDispositivi.tsx`): dove c'è Apple Salute su questo telefono e non è attivo, la carta ha bordo arancio, anello che pulsa (`Richiamo finoAlFatto`), «Da attivare» accanto al titolo, il benefit («passi, sonno e allenamenti arrivano da soli, anche da Apple Watch, Oura e Garmin») e il pulsante «Attiva Apple Salute» (apre subito il foglio di Apple: `?attiva=apple`), con «Consigliato, non obbligatorio». Attivato, torna «I tuoi dispositivi» con «Collegato». Su web e Android la carta è quella di prima. Nella schermata dei dispositivi il suo stato non attivo ora dice «Da attivare».
- **Provato** (29/10/2026): `tsc` a 41 errori (la base, nessuno nuovo); `calcoloDatiCorpo.ts` con 19 prove e 7 mutazioni del codice, tutte rilevate (provato con il nome di prima, `calcoloDatiObbligatori.ts`). **In Chromium** (bundle web, backend finto con stato, 375 e 1280 px): blocco totale (prima versione) con consenso → sesso → altezza e peso → ritorno e sezione aperta da sola; **blocco morbido**: la sezione intera visibile con la carta «Da compilare» in cima e una sola carta di invito, e dopo l'inserimento la carta sparisce e il contenuto si rifà; minorenne senza carta né invito; a 1280 px due colonne. **L'invito e la carta «Da attivare» sono stati provati fingendo un iPhone sulla copia di prova** (`appSaluteDelTelefono`, `appleSaluteDisponibile` e `chiediPermessoSalute` forzati, solo lì): invito che si chiude con «Non ora» e lascia la carta in evidenza, «Continua» → consenso → richiesta dei permessi una sola volta e parametro tolto, «Attiva Apple Salute» dalla carta, ritorno con «Collegato». **Non provato**: un iPhone vero (il foglio di Apple, il segno su file con `expo-file-system`, la lettura vera da HealthKit), Android, il tema chiaro sotto i 900 px, l'inglese a schermo della carta dei dati.

## I dispositivi passano solo da Apple Salute e Health Connect; «Relax» si chiama Recover (29/10/2026)

Decisione di Maurizio: mantenere un collegamento diretto per ogni marchio è troppo per l'app di una palestra («non è un'app di allenamento specifica che va distribuita nel mondo»). **Oura e Polar con OAuth sono stati tolti** (l'app è in prova): i dispositivi arrivano solo da **Apple Salute** (iPhone) e, quando ci sarà, da **Health Connect** (Android). Il telefono raccoglie quello che orologi, anelli e app di fitness gli passano, e l'app lo legge da lì.

- **Il terzo pilastro si chiama «Recover»** (in italiano «recupero» nel testo corrente: il nome del pilastro, come Train e Food, resta inglese). **Cambiano solo le parole che si leggono**: l'indirizzo `?area=relax`, `AreaRelax`, `Relax.tsx`, `calcolaRelax`, le chiavi `relax` nei dati e le palette `RELAX` sono rimasti com'erano (i link già dati non si rompono, e il diff è piccolo). Nei paragrafi più sopra di questo file «Relax» vuol dire Recover. **Da rifare: il video di Athlon Health System** (`public/video/athlon-health-system.mp4`) dice ancora «Relax» ovunque, e **il testo del consenso ai dispositivi** (`dispositivi/informativa.ts`) nomina ancora Oura, Polar e il pulsante «Collega»: sono testi legali, e cambiarli vuol dire cambiare `VERSIONE_INFORMATIVA` qui e in `_shared` di APP-ATHLON (e far riaccettare tutti). **Non l'ho fatto**: l'informativa oggi descrive un collegamento che non esiste più. **La bozza del testo nuovo (IT e EN, da far vedere al consulente) è in `docs/informativa-dispositivi-bozza.md`**, con l'ordine di pubblicazione (prima il server, poi l'app) e un punto da non dimenticare: **i token cifrati di Oura e Polar dei tester sono ancora sul server**, e vanno cancellati insieme.
- **Cosa è sparito**: le carte di Oura e Polar, il ritorno `?code=…&state=…`, `collega` / `completaCollegamento` / `scollega` / `aggiornaDispositivi` in `api/dispositivi.ts`, `FORNITORI` e **il «recupero» in parole** (`recupero()`: era la prontezza di Oura e il Nightly Recharge di Polar, che da Apple Salute e Health Connect non arrivano). Il pilastro descrive il sonno e non dà un giudizio. **La funzione `portale-lab-dispositivi` e le tabelle non sono state toccate**: chi si era collegato in prova ha ancora i suoi dati, che si leggono come prima (compaiono con la fonte «Oura» / «Polar»), ma da qui non si può né scollegare né ricollegare; la revoca del consenso li cancella.
- **La carta «I tuoi dispositivi» ha quattro facce** (`fit/CartaDispositivi.tsx`), perché «collegato» non vuol dire «arrivano dati» (chi ha un Oura e collega Apple Salute senza attivare la condivisione dentro l'app Oura vedrebbe «Attivo» e non riceverebbe niente): **Da attivare** (in evidenza, vedi la sezione sopra), **Attivo, senza dati** (dice dove guardare e ha «Aggiorna ora»), **Collegato** con **«Ricevi da: Apple Watch, Garmin Connect»** (i nomi che HealthKit dà alla fonte, ripuliti da `nomeFonte` / `fontiRicevute` in `dispositivi/comune.ts`: «Apple Watch di Marco» → «Apple Watch») e **Si collega dall'app** (web e Android: dice come funziona, senza un comando che non risponde). La carta non è più un tocco unico: si agisce dai pulsanti (c'era un `<button>` dentro un `<button>` sul web).
- **La guida «Come collegare il tuo dispositivo»** (`dispositivi/GuidaCollegamento.tsx`, nella schermata dei dispositivi): iPhone o Android a scelta, i tre passi (apri l'app del dispositivo → attiva la condivisione con Apple Salute / Health Connect → torna e aggiorna), cosa si può condividere, e l'elenco dei marchi (`dispositivi/marchi.ts`) con il collegamento alle **istruzioni ufficiali del produttore** (non le riscriviamo: i menu cambiano). **L'elenco è verificato il 29/10/2026 su pagine ufficiali** (produttori, Apple, Google; la ricerca con tutti gli indirizzi, i dati condivisi e cosa non si è potuto verificare è in `docs/marchi-salute.md` e `.json`): 20 marchi, 16 confermati per Apple Salute e 14 per Health Connect, gli altri «da verificare» (solo fonti di terzi o pagina non trovata: Suunto, Huawei, Amazfit, Technogym e Ultrahuman su Android); Galaxy Watch e Pixel Watch con l'iPhone e Apple Watch con Android non funzionano e la guida lo dice. **Non ci sono MyFitnessPal e YAZIO** (scrivono alimentazione, che da qui non leggiamo). Condizioni scritte dai produttori e riportate come nota: Garmin su Health Connect solo da Android 14, Fitbit ora si chiama Google Health (dal 19/05/2026, serve un account Google), WHOOP non condivide l'HRV, **Withings chiede Withings+ per gli account creati dal 13/10/2026**. Da rivedere ogni tanto: i produttori cambiano nome e regole. **Non promette cosa arriverà da un dispositivo**: lo dice la carta «Ricevi da…». I marchi si citano **senza loghi** (hanno regole d'uso proprie, da leggere prima) e con la nota «marchi dei rispettivi proprietari, nessun rapporto con il club».
- **Health Connect nell'app non c'è**: la guida lo dice («in arrivo») e a chi ha Android non resta che scrivere il sonno a mano. Mancano una build nativa Android, il modulo di lettura e la dichiarazione sul Play Store (`docs/analisi-wearable-salute.md`). Il punto d'aggancio è `appSaluteDelTelefono()` in `dispositivi/appleSalute.ts`.
- **Provato**: `tsc` a 41 errori (la base); `nomeFonte` / `fontiRicevute` con 13 prove; in Chromium (375 px, backend finto, iPhone simulato sulla copia di prova) le facce Da attivare, Collegato («Ricevi da: Apple Watch») e Senza dati, la guida con i marchi su iPhone (18 righe, 2 «da verificare», avviso sui Galaxy Watch e Pixel Watch) e su Android (14 + 5, avviso su Apple Watch, «Health Connect: in arrivo»), «Recover» al posto di «Relax» nell'interruttore e nel punteggio. **Non provato**: un iPhone vero, i collegamenti ai produttori, l'inglese a schermo, Android.

## La classifica mensile dell'Athlon Health Score (29/10/2026)

Richiesta di Maurizio. **Lato app fatto e provato contro un backend finto. Il server è scritto, provato e PUBBLICATO la sera del 29/10/2026 (migrazione SQL eseguita sul database, funzione `portale-lab-classifica` v1 attiva; sorgenti in `docs/classifica-server/` e copiati in APP-ATHLON, lì non ancora committati; mai provato con un tester vero)**: le istruzioni, cosa è provato e cosa no sono in `docs/classifica-server/LEGGIMI.md`, e il paragrafo per il `CLAUDE.md` di APP-ATHLON in `CLAUDE-APP-ATHLON.md`. Il contratto, le mie scelte da confermare, le tabelle e il CRM sono in `docs/classifica-contratto.md`. **La pagina «Classifica» del CRM non è scritta** (gli SQL per lo staff sono in fondo alla migrazione). Finché la funzione `portale-lab-classifica` non risponde (404) **l'app non mostra niente** e il punteggio resta com'è: si può pubblicare l'app prima del server.

- **Cosa ha deciso Maurizio**: classifica **del mese** (dal primo all'ultimo giorno, a Roma; poi si riparte da zero), **si entra con un consenso a parte**, **conta tutto l'Athlon Health Score** (Train, Food e Recover), **si vedono le prime dieci posizioni più la propria con due sopra e due sotto** (niente elenco completo), e **appena si entra il sistema propone foto e motto** (una frase che motiva), facoltativi.
- **Dove sta**: una riga sotto il livello nella carta dell'Athlon Health Score (`classifica/RigaNellaCarta.tsx`): fuori dalla classifica «Classifica di ottobre · ENTRA · N soci»; dentro «37° su 240 · 62 punti · Mancano 3 giorni». Tocca per aprire `/allenamento/classifica` (`classifica/Classifica.tsx`). **La riga sta fuori dal tocco che apre il dettaglio del punteggio** (un comando dentro un altro, sul web, è un `<button>` dentro un `<button>`): per questo `CartaPunteggioVista` ora ha il fondo scuro nella cornice e il tocco solo sopra la riga.
- **Chi non è dentro vede**: cos'è, come si calcola, **«Così apparirai»** (nome e iniziale del cognome), e il consenso (`classifica/informativa.ts`: **bozza da far rileggere dal consulente**). **Non vede nessun nome degli altri**, solo quanti sono: la classifica la vedono solo i soci che sono dentro. **Chi è dentro** vede la sua posizione, le prime dieci e i vicini (con «⋯» dove la graduatoria salta, `conSalti`), il suo profilo, e **esce quando vuole: sparisce subito**.
- **Foto e motto** (`classifica/FoglioProfilo.tsx`): si propone appena si entra, si cambia da «Foto e motto». La foto è quella che il club ha già (la stessa del Profilo): qui si sceglie solo **se mostrarla agli altri soci** (di partenza spenta; una foto messa da qui si accende da sola). Il motto: 80 caratteri, niente link, mail o indirizzi (`validaMotto`, e il server ricontrolla e risponde 422 col motivo). **Il foglio della foto non si apre sopra questo** (su iPhone due fogli insieme non si presentano): questo si nasconde mentre l'altro è aperto. **Il testo del foglio della foto** («la vede solo il club, gli altri soci no») **non è più vero per chi è in classifica e mostra la foto**: per loro dice «la vede il club; gli altri soci solo se scegli di mostrarla in classifica» (`profilo/FotoProfilo.tsx`). Va cambiata anche l'informativa generale del club.
- **Segnalare**: ogni riga di un'altra persona con motto o foto ha «Segnala» (`segnalaRiga`): sono contenuti di utenti visti da altri utenti (App Store, linea guida 1.2: filtro, segnalazione, staff che agisce). Sul CRM serve la pagina per nascondere e togliere (nel contratto).
- **Non ci sono premi**, e l'informativa lo dice. Se arriveranno, il DPR 430/2001 e la regola «premi a soglia» vanno riguardati.
- **Cosa ho scelto io, da confermare** (dettaglio nel contratto): il punteggio del mese è **la media dell'Athlon Health Score nelle settimane del mese, da 0 a 100** (non la somma); **chi non usa Food o Recover è valutato sui pilastri che usa** (altrimenti la classifica premierebbe il consenso ai dati sulla salute); **Train solo da tornello e presenze segnate dalla reception** (non le sedute chiuse nell'app né i dispositivi: si gonfiano). **Food e Recover restano dichiarati dalla persona, quindi barabili**, ma pesano il 30%. **Avevo consigliato di escludere Food e Recover dalla classifica**; Maurizio ha scelto di tenerli.
- **Provato**: `tsc` a 41 errori (la base); `classifica/comune.ts` con 31 prove (in italiano; l'inglese di `t()` fuori da un browser non è affidabile). **In Chromium** (375 e 1280 px, backend finto): la riga nella carta (fuori, dentro e con la funzione assente: sparisce), la schermata prima di entrare, il consenso, il foglio di foto e motto che si apre da solo, un motto con un link rifiutato col suo messaggio, il motto salvato che compare nella propria riga, la segnalazione, l'uscita. **Non provato**: il server (non c'è), la foto di un'altra persona (il backend finto manda immagini finte), un telefono vero, l'inglese a schermo, il foglio della foto aperto da qui con la fotocamera.


## L'assistente del portale: il pulsante «Assistente virtuale» (dal 31/10/2026 «Richiedi assistenza»), una chat che dice dove trovare le cose e porta nel punto giusto (29/10/2026)

Richiesta di Maurizio. **Un pulsante flottante «Assistente virtuale»** (`assistente/PulsanteAssistente.tsx`, 30/10/2026) in alto a destra, **sempre visibile sopra ogni schermata**, apre il foglio con la chat (`assistente/FoglioAssistente.tsx`). Prima era una carta in Home («Cerchi qualcosa?», `home/CartaAssistente`, tolta): ora se l'assistente propone un
pulsante, la persona lo tocca, si apre la pagina giusta e **la chat si riprende dallo stesso posto**, in alto a destra, con la conversazione com'era. La persona scrive e l'assistente
**risponde con quello che l'app già mostra del suo account** (contratti, certificato, tesseramento, prenotazioni, prodotti, pagamenti, piani di allenamento), **dice dove si trova** e **dove agire**, e sotto la risposta
mette uno o due **pulsanti che portano nel punto giusto**: il Calendario sul giorno della lezione («tocca *Annulla*»), Pagamenti, il Certificato… **Non prenota, non annulla e non paga**: le conferme e le regole restano
nelle schermate. Funzione, controlli, cosa legge e cosa no, conversazioni salvate e come si pubblica: `CLAUDE.md` di APP-ATHLON, «L'assistente del portale».

- **La risposta arriva a pezzi** (`api/assistente.ts`, `assistente/sse.ts`): la funzione risponde `text/event-stream` (`inizio`, `testo`, `sostituisci`, `fine`, `errore`) e il testo si vede mentre il modello scrive; prima del
  primo pezzo la bolla dice «Sto cercando…». **Sul web è la `fetch` del browser, sul telefono quella di `expo/fetch`** (`fetchFlusso.ts` / `fetchFlusso.web.ts`: la `fetch` di React Native aspetta tutto il corpo). Se un ambiente
  non desse il corpo a pezzi, la risposta arriva intera lo stesso. **Se il testo mostrato non reggeva i controlli del server** arriva `sostituisci` e la bolla si riscrive intera col testo di riserva (e il suo pulsante).
  Una connessione caduta a metà lascia il testo arrivato, segnato «(la connessione si è interrotta)»; un limite (429), la funzione non pubblicata (404: «L'assistente non è ancora attivo») o un errore stanno sotto la chat.
- **I pulsanti sono chiavi, non indirizzi**: la funzione manda `{ destinazione, parametri, etichetta }` e `assistente/destinazioni.ts` li trasforma in indirizzo (`hrefAssistente`). **Le chiavi sono un elenco chiuso, uguale alla mappa della
  funzione** (`_shared/assistente/mappa.ts` di APP-ATHLON; la prova li confronta se i due repository stanno affiancati): una chiave sconosciuta non è un pulsante. I parametri si ricontrollano (una data `AAAA-MM-GG`, l'attività
  solo insieme al giorno come fa il Calendario, un id di piano senza barre, un anno). Le sezioni della Home sono `/?sezione=…` (`hrefSezione`); Per annullare una lezione il pulsante porta a `/calendario?giorno=…&attivita=…`, dove «Le tue prenotazioni»
  ha «Annulla». Toccando un pulsante: si segna il tocco (`pulsanteToccato`, senza aspettare e senza mai sollevare: è il solo segno che la risposta ha portato dove doveva), si chiude il foglio e si naviga.
- **Il pulsante** sta nel layout del portale (`(portale)/_layout.tsx`), accanto alla barra delle schede e prima dell'avvio animato (che lo copre), e **ha il posto che aveva la pillola «Feedback»**: stessa colonna di `Schermata` (640 sul telefono, 1180 sullo schermo largo, centrata), stesso gutter, area che si tocca alta 44 e pillola da 34.
  Dove la schermata ha gia' un comando in alto a destra (il carrello dello shop, il salvataggio dell'editor di un piano, l'anello del questionario a passi) **si sposta di un bottone a sinistra e resta la sola icona** (`feedback/posizione.ts`, il conteggio `useSegnaAzioneInAlto`: lo dice solo la schermata che si vede).
  **Con la scritta «Assistente virtuale» da 390 punti di larghezza in su, la sola icona sotto** (`LARGHEZZA_CON_SCRITTA` in `feedback/comune.ts`): con freccia indietro e marchio a sinistra, a 390 restano 8 punti fra il marchio e la pillola (misurato), a 375 non ci stanno. Il nome per lo screen reader c'e' sempre. L'icona e' `assistente` (le scintille).
  La conversazione e lo stato del foglio stanno nel layout, che resta montato: **cambiare schermata non li perde**.
- **L'assistente sa in quale schermata sei** (`schermataAssistente`): al tocco sul pulsante si manda la chiave della schermata (la Home con una sezione aperta, per esempio `home-pagamenti`) e «dove sono i pagamenti?» fatto da lì
  dice «sei già qui» senza proporre di aprirla. Una schermata che non è nella mappa (la Home senza sezione, il punteggio) non si manda.
- **La conversazione sta solo in memoria** (`assistente/store.ts`, mai sul disco): chiudere il foglio o seguire un pulsante non la perde; **uscendo dall'app si butta** (`esciDalLaboratorio`). «Ricomincia» (l'icona accanto alla X) la azzera. Una domanda
  alla volta; Invio manda (Maiusc+Invio va a capo, sul web: un campo su più righe va a capo con Invio per default); 500 caratteri. **Il server conserva comunque ogni domanda e risposta**, e le legge il CRM dalla scheda del cliente:
  lo dice la postilla sotto il campo, **che non va tolta** («Assistente automatico: può sbagliare e non fa niente al posto tuo. Le domande e le risposte vengono lette dal club per migliorarlo: non scrivere dati sulla salute»). L'informativa
  privacy del club va aggiornata (domande e risposte conservate e lette dal club, servizio esterno con riservatezza dei dati: Maurizio ha detto di sì).
- **Il campo si allarga e c'è il microfono** (30/10/2026, richiesta di Maurizio). **Il campo cresce con il testo** fino a 110 punti (poi scorre): sul telefono lo fa da solo, **sul web un campo su più righe resta alto una riga** (il `numberOfLines={1}` di prima, e comunque react-native-web non lo allarga), quindi `adattaAltezza` in `FoglioAssistente.tsx` ricalcola l'altezza del `textarea` a ogni cambio di testo e quando il foglio si apre con una bozza già scritta (lascia tornare a «auto» prima di leggere `scrollHeight`, o cancellando non si accorcerebbe). **Il microfono è una dettatura, non un messaggio vocale**: la persona parla, il testo compare nel campo (si aggiunge a quello già scritto, con uno spazio) e **lo rilegge e lo manda lei con «Invia»**; niente file audio, niente passa da noi o dal server dell'assistente, che riceve testo come sempre. File: `src/lib/dettatura.ts` (il riconoscimento vocale del browser, `SpeechRecognition` / `webkitSpeechRecognition`), `assistente/useDettatura.ts` (lo stato: ascolto, errore, base del testo), icona `microfono`. **Solo sul web, e solo dove il browser sa ascoltare** (Chrome, Edge, Safari; **Firefox no**): altrove il comando non compare. **Nell'app nativa non c'è** (serve un modulo di riconoscimento e quindi una build nuova, come per le schede e la fotocamera). Una frase alla volta (`continuous = false`: in continuo, su Android, le parole si ripetono): dopo una pausa il browser chiude e si tocca di nuovo. Mentre ascolta il microfono si fa arancio con l'anello che pulsa (`Richiamo`, niente con «riduci movimento») e il campo dice «Ti ascolto…»; inviando o chiudendo il foglio l'ascolto si butta (`annulla`: una trascrizione in ritardo non riempie il campo dopo l'invio). Gli errori (microfono bloccato, nessuna voce, rete) stanno sotto il campo con le loro parole. **Da sapere per la privacy**: la voce la trascrive il servizio del browser (Chrome la manda a Google, Safari ad Apple), non il club: la postilla lo dice. **L'informativa privacy del club va aggiornata di conseguenza**. `tsc` pulito; **non provato** su un telefono vero né in un browser con un microfono vero (in particolare **Safari da PWA su iPhone**, dove il riconoscimento vocale nelle app aggiunte alla Home è noto per non funzionare sempre: se lì dà errore il comando c'è lo stesso e dice «Non sono riuscito a usare il microfono»).
- **I suggerimenti all'apertura promuovono le tre cose che si fanno con un tocco** (30/10/2026, richiesta di Maurizio). Prima del primo messaggio il foglio mostra **«Posso fare per te»** con tre carte (icona arancio, frase e una riga che dice cosa succede): **«Aiutami a prenotare una lezione»**, **«Voglio pagare una rata scaduta»**, **«Voglio aggiungere il metodo di pagamento»**; sotto, «Oppure chiedimi» con due domande di sempre («Dove vedo i miei pagamenti?», «Come annullo una lezione?»). Toccarne una **manda quella frase come domanda**: non apre niente da sola, la risposta dell'assistente porta il pulsante giusto. Le frasi stanno in `FUNZIONI` di `FoglioAssistente.tsx`; **se si cambiano, si controlla che la funzione le riconosca** (router e regole 12-14 del prompt in APP-ATHLON: la prova `assistente-prenota.ts` e `assistente-paga.ts` hanno le stesse frasi).
- **Il pagamento di una quota scaduta si fa dalla chat** (30/10/2026, stessa richiesta; `assistente/pagaDaChat.ts` puro, `assistente/PagaDaChat.tsx`). Come la prenotazione, **non è una destinazione**: la funzione manda `{ destinazione: 'paga-quote', parametri: {}, etichetta: 'Paga la quota · 21,00 €' }` solo se ha letto quote scadute **in quella richiesta** (e per un adulto); l'etichetta e l'importo li scrive il codice. Il pulsante apre **la stessa carta «Da pagare» della sezione Pagamenti** (`DaPagare`, ora esportata da `pagamenti/Movimenti.tsx`, con `onApri` facoltativo: nella chat le righe non aprono il dettaglio), con le quote **rilette adesso** (`scorda(CHIAVE_MOVIMENTI)` e `useMovimenti`) e i suoi pulsanti: «Paga … con la carta •••• 1234» e «Usa un'altra carta». **L'importo scritto sul pulsante della proposta è solo un'etichetta**: l'addebito parte solo con un tocco sui pulsanti della carta, e `portale-lab-pagamenti` (`salda`) rilegge le quote da PerfectGym e non addebita niente se il totale non è quello mostrato. Verifica dell'esito, «Pagamento ricevuto» e rilettura dopo il pagamento sono quelle di `DaPagare`; la carta della chat tiene l'ultimo elenco visto per non perdere il «Pagamento ricevuto» se il mirror svuota la lista. **«Usa un'altra carta» porta fuori dall'app** (la pagina di Adyen) e ritorna sulla sezione Pagamenti della Home, che verifica com'è andata (`?saldo=1`): la chat non si ritrova. **Senza quote scadute** la carta dice «Non risultano quote scadute da pagare» (con «se hai appena pagato, può servire qualche minuto»). Il tocco si segna (`toccato` con `paga-quote`). **In vista cliente non c'è** (l'assistente è chiuso lì).
- **Il metodo di pagamento è un pulsante della mappa, nessun codice nuovo**: «Voglio aggiungere il metodo di pagamento» porta all'assistente a rispondere con il pulsante `metodo-pagamento` («Aggiungi il metodo di pagamento») che apre `/metodo-pagamento`. L'inserimento della carta o del conto resta nella pagina del metodo (Adyen / IBAN): **non si inseriscono dati di carta nella chat**.
- **Pubblicare prima la funzione** (`portale-lab-assistente`, APP-ATHLON), poi l'app. Con la funzione di prima le tre carte mandano comunque la domanda, ma la risposta non porta il pulsante di pagamento (il metodo di pagamento sì, è nella mappa) e «aiutami a prenotare» può rispondere come a una domanda su come si prenota. **Provato**: `tsc` pulito sui file toccati; `pagaDaAzione` con `node --experimental-strip-types`; vedi sotto per la prova a schermo. **Non provato**: un pagamento vero (PerfectGym e Adyen erano simulati), una risposta vera del modello con le regole 13 e 14, un telefono.
- **Sotto ogni risposta «Utile» / «Non utile»** (`votaRisposta`): un voto che il club legge insieme alla domanda; toccato di nuovo si toglie. Senza `messaggio_id` (il registro non si è scritto) i voti non compaiono.
- **Mai in vista cliente** (`vistaCorrente()`: il pulsante non si disegna e la funzione risponderebbe 403): chi guarda l'app di un socio non conversa a suo nome. **Solo tester**, come tutto il portale (la funzione ricontrolla).
- **Italiano e inglese** con `t()`; la funzione risponde nella lingua dell'app (`Accept-Language: en-x-athlon`), e le domande si salvano come sono scritte. Le quattro domande di esempio all'apertura sono in tutte e due le lingue.
- **Il pulsante flottante e la carta del feedback, provati (30/10/2026)**: `tsc` senza errori nuovi e, in Chromium (bundle web esportato con `EXPO_PUBLIC_SUPABASE_URL` locale, funzioni simulate con `page.route`, 390 e 360 px con touch, 1280 px senza), 26 controlli: la pillola con la scritta a 390 e 1280 e la sola icona a 360;
  nessuna pillola «Feedback» e nessuna carta «Cerchi qualcosa?»; la carta «Aiutaci a migliorare l'app» in Home che apre il foglio e manda il feedback una volta sola con `schermata: '/'`; la chat che si apre dalla pillola, la risposta con il pulsante «Apri il calendario» che porta a `/calendario`, la pillola ancora li', la chat riaperta con la
  stessa conversazione, e la domanda fatta dal Calendario che manda `schermata: 'calendario'` e lo stesso `conversazione_id`; il foglio si intitola «Assistente virtuale»; nessuno scorrimento orizzontale, nessun errore di pagina; la barra a 390 con la freccia indietro (`/invita`) senza sovrapposizioni. **Non provato**: un telefono vero, l'app nativa, il tema scuro, l'inglese a schermo,
  gli schermi fra 360 e 390 con una freccia e una scritta piu' larga (in inglese «Virtual assistant» e' piu' corto), e la pillola con il comando del carrello accanto (provata la logica, non guardata a schermo).
- **Provato**: `npx tsx scripts/prova-assistente.ts` (lettore dello streaming tagliato in ogni modo, ogni destinazione ha un indirizzo e **la sua rotta esiste in `src/app/(portale)`**, i parametri, le chiavi uguali alla funzione, il
  riconoscimento della schermata); `npx tsc --noEmit` senza errori nuovi (43 di base). **Nel browser** (Chromium, bundle web esportato, funzione simulata che manda uno streaming vero a pezzi, 390 px con touch e 1280 px senza,
  chiaro e scuro, italiano e inglese): il testo che si vede a pezzi prima di finire, i pulsanti e i voti a risposta finita, la richiesta che parte (`stream`, schermata, conversazione, lingua, sessione), la seconda domanda nella stessa conversazione,
  Invio che manda, il voto che si toglie, il pulsante che segna il tocco e porta a `/calendario?giorno=…`, il testo sostituito, il 429, il 404, la connessione caduta, «Ricomincia», nessuno scorrimento orizzontale, nessun errore in console.
  **Non provato**: **una risposta vera del modello** (la funzione non è pubblicata e non è stata chiamata una sola volta con la sessione di un tester); un telefono vero (`expo/fetch` che legge il corpo a pezzi su iOS e Android, la tastiera,
  `submitBehavior="submit"`, la Home vera con la carta e il tocco che porta in vista la sezione chiesta da fuori), l'app nativa, il tema scuro e l'inglese della carta in Home. Le schermate si guardano su un telefono prima di aprire oltre i tester.
- **Da pubblicare**: prima la funzione (APP-ATHLON: migrazione, chiave nel Vault, `portale-lab-assistente`), poi questa app. Con la funzione assente la carta si apre e la chat dice «non è ancora attivo».

## Gli orari del club in Home e in Club Life, e l'assistente che legge Club Life (30/10/2026)

Richiesta di Maurizio dopo la prima prova dell'assistente: **gli orari che il club osserva oggi sempre in evidenza, anche in Home**, e se c'è una news che dice che il club oggi chiude alle 17, **se ne deve tener conto**.
L'assistente ora legge anche Club Life: lato funzione e regole in `CLAUDE.md` di APP-ATHLON, «L'assistente sa cosa comunica il club». File dell'app: `src/api/club.ts` (puro), `clublife/OrariClub.tsx`,
`clublife/useOrariClub.ts`; prova `scripts/prova-orari-club.ts` e `scripts/prova-assistente.ts`.

- **In Home** (`CartaOrariClub`, subito sotto l'avviso del certificato e prima delle notifiche): una carta con **l'orario di oggi in grande** («6:00 – 22:00», «Chiuso» nei giorni festivi, con «orario ridotto» alle vigilie).
  **Se c'è un avviso in corso** (una chiusura, un cambio d'orario: una news di Club Life della categoria Struttura o Orari) **compare sopra, in evidenza** (bordo e velo ambra, «AVVISO DEL CLUB», il titolo della news) e
  l'orario sotto cambia etichetta in **«OGGI · ORARIO ORDINARIO»** con «vedi l'avviso qui sopra»: «aperti dalle 6» non si legge prima di «chiude alle 8:30». Il tocco sull'avviso apre la news; quello sulla carta apre Club Life.
  Più avvisi: in Home il primo e «E altri N avvisi in Club Life».
- **In Club Life** (`BloccoOrariClub`, in cima, sopra eventi e news): gli avvisi, l'orario di oggi e la settimana (lunedì–venerdì, sabato, domenica) con il giorno di oggi in neretto, e la nota che sono gli orari della sala
  pesi, che le lezioni e i turni sono nel Calendario e che il club è chiuso nei giorni festivi. **Non dipende dal feed delle news**: si vede anche se le news non si caricano.
- **L'app non ha una sua copia degli orari.** Li calcola la funzione (`portale-lab-assistente`, azione `club`) dalle stesse cose che il sito pubblica; l'app mostra quello che arriva e ricontrolla la forma (`orariClubDa`:
  una risposta strana, un giorno aperto senza orario, righe sporche, un avviso che non è una news: scartati senza sollevare). **Se la funzione non c'è ancora o non risponde non si disegna niente**: niente riquadro vuoto
  e niente errore per una cosa che nessuno ha chiesto.
- **Una lettura sola per tutta l'app** (`useOrariClub`: la carta e il blocco leggono la stessa copia). Vale dieci minuti e solo per il giorno in cui è stata letta (a mezzanotte si rilegge: una copia di ieri direbbe l'orario
  sbagliato); se una rilettura non riesce si tiene quella di oggi. **Solo in memoria**, e si butta con l'uscita dall'app (`azzeraOrariClub` in `esciDalLaboratorio`). Sono dati pubblici e **si leggono anche in vista cliente**.
- **L'avviso vale finché il giorno che cita non è passato** (euristica sul testo della news, lato funzione): la chiusura del 29 ottobre sparisce il 30. Se un avviso non sparisce o sparisce troppo presto, il motivo è lì: serve un campo
  «valida fino al» nelle news del sito.
- **L'assistente apre l'articolo**: nuova destinazione `club-life-voce` (`assistente/destinazioni.ts`: una news, un evento o una scheda dell'Help Desk, con l'id che la funzione ha messo al posto della sigla F1; un id di altra forma
  rimanda all'elenco di Club Life e non entra mai in un indirizzo). Le chiavi sono 31, uguali a quelle della funzione (la prova le confronta).
- **Provato.** `LC_ALL=it_IT.UTF-8 npx tsx scripts/prova-orari-club.ts` (4 gruppi) e `prova-assistente.ts` (5 gruppi, con l'articolo di Club Life e gli id sporchi); `tsc` senza errori nuovi (43 di base). **In Chromium**
  (bundle web esportato, funzione simulata, 390 px con touch, 1280 px, 320 e 360 punti, chiaro e scuro, italiano e inglese; 11 controlli): avviso di chiusura sopra l'orario ordinario, il tocco che apre la news giusta, la carta che
  porta a Club Life, senza avvisi (sabato 8:00 – 20:00), giorno festivo («Chiuso»), vigilia a orario ridotto, due avvisi, funzione assente o risposta strana (nessun riquadro e nessun errore), una sola lettura per due componenti,
  nessuno scorrimento orizzontale. **Non provato**: la Home vera dietro il login (la carta è stata guardata su una pagina provvisoria, poi tolta), un telefono, l'app nativa, e la funzione vera con una sessione vera.
- **Da pubblicare**: prima `portale-lab-assistente` (APP-ATHLON), poi questa app.

## Tre strumenti «wow» (30/10/2026): il tuo mese da condividere, il QR per il ritiro dello shop, l'assistente che propone una prenotazione

Richiesta di Maurizio («fai 6, 7 e 8» dall'elenco delle idee). **Tutto lato app, niente server toccato**: per due su tre il lato server (APP-ATHLON) resta da fare, e i contratti stanno in `docs/`.
`npx tsc --noEmit` pulito sui sorgenti (restano solo gli errori di `docs/classifica-server`, che non sono nostri).

### Il tuo mese in Athlon (`fit/Mese.tsx`, rotta `/allenamento/mese`)

Una scheda del mese di Train (giorni attivi, allenamenti, ore, giorni di fila, la lezione più fatta, il calendario con le palline accese) da guardare e da mandare. Si entra dalla carta «Il tuo ottobre in Athlon»
subito sotto il punteggio in Train (`CartaMese`, solo quando c'è qualcosa da mostrare e mai in vista cliente). Il mese di partenza è quello di oggi (se è ancora vuoto e il mese scorso no, quello scorso); due pillole
scelgono fra questo mese e il mese scorso.

- **Il calcolo è puro** (`fit/riepilogoMese.ts`, prova `LC_ALL=it_IT.UTF-8 npx tsx scripts/prova-riepilogo-mese.ts`: 10 gruppi, provati per mutazione): parte dalle stesse `Sessione` del punteggio (sedute chiuse, lezioni con la presenza,
  allenamenti dei dispositivi), un giorno è attivo da 20 minuti (`MINUTI_GIORNO_ATTIVO`), il giorno è quello di Roma. La «lezione più fatta» serve almeno due volte; la serie è di giorni di calendario di fila.
- **Solo Train, di proposito**: niente calorie, peso, diario o sonno (hanno un consenso a parte e non devono finire in una scheda da mandare a un amico). **Descrive e non confronta**: il mese prima è un numero in una riga, mai «meglio» o «peggio»,
  nessuna classifica. La stessa regola vale per le cifre mostrate e per l'immagine: dentro non c'è il nome della persona.
- **L'immagine è un PNG 1080×1350 disegnato con un canvas, solo sul web** (`fit/immagineMese.ts`: logo del club da `avvio/logo.ts`, i caratteri del club caricati con `document.fonts`). **La condivisione** (`fit/condividiMese.ts`): dove il browser sa condividere un file
  (`navigator.share` con `files`: telefoni, Safari) si apre il foglio di condivisione, altrimenti il PNG si scarica (`athlon-AAAA-MM.png`); «Scarica l'immagine» scarica sempre. **Sull'app nativa si condivide il testo** («Il mio ottobre da Athlon Roma: 9 giorni
  attivi, 9 allenamenti, 8 h.»): disegnare una vista in un file vuole `react-native-view-shot` e quindi una build nuova. Niente passa da un server.
- **Provato** (Chromium, bundle web esportato con `EXPO_PUBLIC_SUPABASE_URL` finto, funzioni simulate con `page.route`; 390 px chiaro e scuro, 1280 px): cifre giuste su dati noti (9 giorni, 9 allenamenti, 8 h, serie di 3, Pilates 5 volte), «Il mese prima» e il mese
  scorso, nessun «kcal», nessuno scorrimento orizzontale, il PNG scaricato (nome, 1080×1350, logo arancio presente, guardato a occhio), il mese vuoto senza comandi, la carta in Train (390 e 1280 px, assente senza dati) che porta alla schermata. **Non provato**: un telefono vero
  (`navigator.share` con file su Safari e Chrome Android, la qualità dell'immagine sullo schermo di una storia), l'app nativa (solo testo), l'inglese a schermo, la schermata con dati veri.

### Il QR per ritirare un ordine dello shop (`shop/CodiceRitiro.tsx`, `components/CodiceQr.tsx`, `lib/qr.ts`)

L'ordine **pagato e non ancora ritirato** mostra un QR e, sotto, un codice breve da dettare («Codice ordine 3F2A8C1E»): nella pagina dell'esito del pagamento e in «I miei ordini». Sparisce da solo quando la segreteria segna l'ordine consegnato (`consegnato_il`) e non compare per un ordine
non pagato o in errore (`daRitirare`, in `shop/ritiro.ts`, puro: `npx tsx scripts/prova-ritiro.ts`).

- **Cosa c'è nel QR**: `ATHLON-ORDINE:<ordine_id>`, e basta (niente nome, email o importo). **Non è una chiave**: chi lo legge trova l'ordine, e consegnare resta un gesto della segreteria. Il codice breve sono le prime otto lettere/cifre dell'id, in maiuscolo.
- **Nuova dipendenza: `qrcode`** (JavaScript puro) **e `@types/qrcode`**. Si importa **solo il nucleo** (`qrcode/lib/core/qrcode`, con un `@ts-expect-error` perché i tipi coprono solo l'ingresso principale): l'ingresso principale tira dentro `fs` e `pngjs` e non va in Metro. Il QR è sempre nero su bianco, anche nel tema scuro:
  un lettore non legge un QR chiaro su scuro. Un testo troppo lungo non solleva: il QR semplicemente non c'è.
- **Il CRM non è toccato**: finché la segreteria non può cercare un ordine con questo codice (lettore USB che scrive il testo e preme Invio, e ricerca per il codice breve), il QR è solo un modo di mostrare l'ordine. Cosa serve: `docs/ritiro-ordini-qr-crm.md`.
- **Provato**: il QR **decodificato con un lettore software (jsQR) dallo screenshot del browser** (testo identico all'originale) a 390 e 1280 px, tema chiaro e scuro, su esito e su «I miei ordini» (un QR solo, sul pagato da ritirare; nessuno sul ritirato e sul «in corso»). **Non provato**: un lettore da banco, la
  fotocamera di un telefono, una ricerca nel CRM.

### L'assistente propone una prenotazione, e prenota solo chi conferma (`assistente/PrenotaDaChat.tsx`, `assistente/prenotaDaChat.ts`)

Se la funzione manda nella risposta un'azione `prenota-lezione` (`{ class_id, giorno, member_id? }` + etichetta), nella chat compare un pulsante con la lezione proposta. Toccandolo si apre **una carta nella chat** che **rilegge la lezione dal calendario** (nome, orario e posti non vengono dal testo del modello) e
mostra gli stessi pulsanti del Calendario (`AzioniLezione` + `usePrenotazioneLezione`: prenota, lista d'attesa, disdici, acquista se non è compresa, i motivi per cui non si può: lezione cominciata, non ancora aperta, limite della categoria). **La prenotazione parte solo con «Prenota» sulla carta**;
aprire la carta non fa nessuna richiesta di scrittura. Dopo il clic la carta dice «Prenotata» / «In lista d'attesa» e la memoria del giorno del calendario si butta. Per un nucleo con più persone la carta dice «Per <nome>». Se il pagamento porta fuori dall'app il foglio si chiude.

- **Non è una destinazione**: `DESTINAZIONI_ASSISTENTE` (elenco chiuso, uguale alla mappa della funzione) **non è cambiato**, e `hrefAssistente('prenota-lezione')` torna null. Una proposta con `class_id` o `giorno` di forma sbagliata non è un pulsante (`prenotaDaAzione`).
- **La postilla sotto il campo resta vera** («non fa niente al posto tuo»): propone e la persona conferma.
- **LATO SERVER NON FATTO, quindi oggi non si vede mai**: `portale-lab-assistente` (APP-ATHLON) non manda ancora l'azione e il suo prompt non sa proporre. Contratto e regole che la funzione deve far rispettare (mai inventare un id, validazione in codice, etichetta scritta dal codice, una proposta per risposta): **`docs/assistente-prenota.md`**.
  Finché non c'è, l'app ignora ciò che non conosce e niente si rompe. **Non è stata cambiata la lista degli esempi** (una domanda di esempio «prenotami…» prometterebbe quello che la funzione non fa).
- **Provato** (Chromium, bundle web esportato, assistente simulato con un vero `text/event-stream` e calendario simulato; 390 px, 1280 px scuro): proposta → carta con 4 posti, **nessuna richiesta `prenota` finché non si tocca «Prenota»**, poi `prenota` con `class_id 555` e `member_id 100` una volta sola e «Prenotata» + «Disdici»; nucleo con «Per Giulia» e prenotazione col suo `member_id`;
  lezione non più in calendario (messaggio e «Apri il calendario del giorno»); completa («Lista d'attesa»), già cominciata, non ancora aperta, limite della categoria; lezione non compresa («Acquista e prenota», nessun addebito); rifiuto di PerfectGym (il motivo sulla carta); errore di lettura con «Riprova»; proposte
  di forma sbagliata (nessun pulsante, nessuna richiesta); la carta dentro i bordi dello schermo (un difetto trovato guardando lo screenshot e corretto: usciva dal foglio); nessuno scorrimento orizzontale. Le regole pure con `npx tsx scripts/prova-prenota-da-chat.ts` (4 gruppi, provati per mutazione).
  **Non provato**: **una risposta vera del modello**, un telefono, l'app nativa (la carta è la stessa, il pagamento passa dal Calendario), la vista cliente (la carta dell'assistente non c'è lì).


## «Gestisci abbonamento»: sospendere e disdire dall'app, e «Attiva abbonamento» sul Guest Pass (30/10/2026)

Richiesta di Maurizio. Funzione `portale-gestione-abbonamento` (APP-ATHLON, regole e prove nel suo `CLAUDE.md`, sezione «Gestisci abbonamento»); qui le schermate. File: `src/api/gestioneAbbonamento.ts`, `src/features/lab/abbonamento/Gestisci.tsx`, e il collegamento in `AbbonamentiMiei.tsx` (la sezione Abbonamenti della Home).

- **Cosa dice la funzione, cosa fa l'app.** `stato` dice per ogni contratto se si puo' gestire (`gestibile`), perche' no (`motivo`) e cosa e' possibile; l'app non ricalcola niente: date, termini (le 23:59 del giorno che sta 11 giorni prima del 1°), prezzi, rate rimaste, fine contratto e nuova scadenza arrivano dal server. Se la funzione non risponde (o non e' pubblicata) l'elenco e' quello di sempre, senza comandi.
- **Abbonamento a pagamento in vigore**: in fondo alla scheda «Gestisci abbonamento» apre un foglio (`FoglioGestisci`) con il riepilogo (quota, scadenza, rinnovo, metodo di pagamento), **Sospendi** e **Cambia abbonamento** affiancati e, discreto, «Disdici abbonamento». **Contratti a zero** (Employee, omaggi), aggiuntivi e Junior: nessun comando. **Cambia abbonamento e' spento** e dice «arriva a breve, per ora scrivi alla segreteria»: la funzione non lo ha ancora.
- **Sospendi, tre passi**: il mese (i mesi troppo vicini restano visibili ma spenti, col perche'; dove ci sono la gratuita, se c'e' ancora diritto, e quella a pagamento da 15 € si sceglie fra le due), cosa cambia (dal, fino al, costo, nuova scadenza **stimata**: la conferma il gestionale), e la conferma con **due consensi** se c'e' un addebito (uno se e' gratuita). Dopo la scrittura una sospensione futura si vede nel riepilogo con «Annulla la sospensione» fino al termine; annullando una a pagamento i 15 € restano come credito sul contratto (non rimborso), e lo dice.
- **Disdici, tre passi**: cosa succede (oggi, fino alla scadenza, la data di fine con l'**asterisco**: una sospensione inserita dopo la disdetta la sposta), rate ancora dovute, ultimo giorno per disdire, l'avviso che si perdono le condizioni e che un'iscrizione futura ha il listino di quel momento con la quota di iscrizione, e le due scorciatoie «Sospendi un mese»; poi il motivo (facoltativo: i sei di PerfectGym, e un commento che **non va a PerfectGym**, solo nel registro del server, con l'invito a non scrivere dati sulla salute) e la conferma in rosso con due consensi (le rate rimaste solo se ce ne sono). Oltre il termine di un annuale la schermata manda a disdetta@athlonroma.it (regola scritta nella funzione, la scelta e' di Maurizio).
- **Guest Pass in corso** (`CartaProva`, sezione «In prova» sopra «In vigore»): dal, fino al, «l'abbonamento puo' partire il <giorno dopo la fine>», il riquadro **«Approfitta della promozione»** con la quota di attivazione in omaggio (la cifra la legge da `statoAbbonamento().quota_attivazione`; senza, il testo non nomina l'importo) e un solo comando, **«Attiva abbonamento»**, che porta a `/abbonamento` (la procedura dalla prova, che ha gia' la data fissa). La freccia sopra rimbalza e il pulsante ha l'anello che pulsa (`Richiamo` senza fine, finche' la scheda c'e'); con «riduci movimento» non si muove niente.
- **Dopo una scrittura** si buttano le memorie `abbonamenti:contratti` e `area` e si rilegge: l'elenco dice «Sospeso» o «Termina il …» dalla funzione, non da quello che l'app crede.
- **In vista cliente** `stato` e le due anteprime sono letture; sospendere, annullare e disdire rispondono 403 e il foglio mostra l'errore.
- **Provato.** `tsc` senza errori nuovi (43 di base). **In Chromium** (bundle web esportato con `EXPO_PUBLIC_SUPABASE_URL` locale, funzioni simulate con `page.route`, 390 e 1280 px, tema chiaro), 32 controlli: pulsante e Guest Pass con promozione e quota, foglio con Sospendi e Cambia spento, novembre non disponibile col motivo, i due tipi di sospensione, conferma spenta senza consensi e riepilogo con la carta •••• 2365, la richiesta `sospendi` con mese, tipo e costo giusti, l'esito col credito, la sospensione programmata con «Annulla», la disdetta con data asteriscata, rate e ultimo giorno, la richiesta `disdici` con l'impronta del riepilogo e il motivo, nessuno scorrimento orizzontale, nessun errore di pagina. **Non provato**: una scrittura vera su PerfectGym (le funzioni erano simulate: nessuna scheda di prova ha un contratto a pagamento), un telefono vero, il tema scuro, l'inglese a schermo, «riduci movimento», la vista cliente, e l'annullo di una sospensione dalla schermata (provato solo che il comando compare).
- **Da pubblicare**: la funzione `portale-gestione-abbonamento` e' gia' in produzione (APP-ATHLON #483): prima la funzione, poi l'app.

- **Con quote scadute non si disdice, e non si scrive a nessuna casella** (30/10/2026, Maurizio): se l'anteprima porta `quote_scadute`, il primo passo della disdetta non mostra la procedura ma un riquadro («Prima va saldata la quota scaduta», quante e quanto) con **«Vai ai pagamenti»** (Home → Pagamenti, «Da pagare»). Il server rifiuta comunque la conferma (409). Un annuale oltre il termine dice che da qui non si disdice e che la disdetta vale per la scadenza successiva: **niente `disdetta@athlonroma.it`** (non esiste piu') da nessuna parte nell'app. `tsc` pulito; **non guardato renderizzato**, e non provato con un contratto con quote scadute vere. Pubblicare prima le funzioni (APP-ATHLON), poi l'app.

## «Scrivi al team»: l'assistente passa a una persona, e la persona decide (31/10/2026)

Richiesta di Maurizio: l'assistente fa una prima assistenza e, se non basta, apre un ticket per il team. Regole, funzione, tabella, compito in Agenda ed email al desk: `CLAUDE.md` di APP-ATHLON,
«L'assistente fa la prima assistenza e poi apre un ticket per il team». Qui cosa fa l'app (`assistente/teamDaChat.ts`, `ScriviAlTeam.tsx`, `scriviAlTeam` in `api/assistente.ts`, `FoglioAssistente.tsx`).

- **L'assistente propone, la persona decide.** La funzione manda il pulsante come `{ destinazione: 'scrivi-team', parametri: {}, etichetta: 'Scrivi al team' }`: **non e' una destinazione** (non sta in
  `DESTINAZIONI_ASSISTENTE`, l'elenco chiuso uguale a quello della funzione) ma apre una carta nella chat, come `prenota-lezione` e `paga-quote`. Compare quando la persona e' arrabbiata, insiste dopo un
  «non e' possibile» o ha un caso suo, e **una volta per conversazione**.
- **La carta dice cosa arriva al team** prima di mandarlo: la conversazione con l'assistente e, se la persona vuole, due righe sue (fino a 1000 caratteri), e che il team **risponde via email**. Dice anche di
  non scrivere dati sulla salute (li leggono persone del club). **Niente parte da solo**: la conversazione va al team solo con «Invia al team». Dopo l'invio: «Fatto: il team ha ricevuto la conversazione e ti
  risponde via email». Nessuna promessa sui tempi.
- **Chi e' lo sa la sessione**: nome ed email non si chiedono (a differenza dell'assistente del sito). La conversazione la rilegge il server dal suo registro: dall'app parte solo l'id. Con la funzione non ancora
  aggiornata («Azione sconosciuta.») la carta dice che il team non e' raggiungibile da qui e lascia riprovare. Tre al giorno: oltre, il messaggio della funzione.
- **In vista cliente non c'e'** (l'assistente non c'e' e la funzione non e' fra le letture).
- **Provato**: `npx tsx scripts/prova-assistente.ts` (5 gruppi, con la parte pura di `teamDaChat`) e `npx tsc --noEmit` (restano due errori che non sono di questa modifica, in `abbonamento.ts` e `Gestisci.tsx`,
  piu' quelli di `docs/classifica-server`). **Non guardata renderizzata** (390 e 1280 px, chiaro e scuro, italiano e inglese), **non provata su un telefono** e **non provata con la funzione vera**.
- **Da pubblicare dopo la funzione** (APP-ATHLON: migrazione `20261031a`, poi `portale-lab-assistente`): senza, il pulsante non compare mai.
- **L'allegato** (31/10/2026, Maurizio: «come nell'altra chat del sito»; serve per esempio per il certificato medico della sospensione per inabilita'). Sotto il campo di testo della carta, **«Allega una foto o un PDF»**: **un file solo**, JPG/PNG/WebP o PDF, fino a 5 MB, con le stesse funzioni degli allegati del feedback (`scegliAllegati`, `preparaAllegato`: sul web una foto grande si porta a 1800 px, l'app nativa manda il file com'e'). Il file scelto si vede con la sua miniatura e un cestino per toglierlo; **parte solo con «Invia al team»**, e la carta dice che arriva al team nella pagina del ticket e **non per email**, e che un certificato lo leggono persone del club. `scriviAlTeam(conversazioneId, messaggio, allegato?)` manda `allegato: { nome, base64 }`. **Serve la funzione aggiornata** (APP-ATHLON, migrazione `20261031c`): una funzione vecchia ignora il campo senza dirlo, quindi **si pubblica prima il server**. `tsc` pulito; **non guardato renderizzato** (390 e 1280 px, chiaro e scuro) e non provato con un file vero.


## Metodo di pagamento: se c'è già, si dice e si propone di pagare; il cambio è un comando a parte (30/10/2026)

Richiesta di Maurizio dopo il caso di un genitore (Francesca Capasso, figlio Andrea Leonardi): un abbonamento creato dal desk nasceva già con la carta del genitore, lei ha provato a «inserire il metodo» e ha letto errori. File: `features/metodo-pagamento/GestioneNucleo.tsx`, `RitornoCarta.tsx`, `Metodo.tsx`, `features/lab/metodo/MetodoPagamento.tsx`, `lib/metodoPagamento.ts`. Lato server: `CLAUDE.md` di APP-ATHLON, stessa data.

- **Se tutti gli abbonamenti hanno già un metodo valido** (nessuno senza metodo, in contanti o con la carta scaduta, e il link non nomina un contratto: `inOrdine`), la pagina **non apre la scelta**: dice «Questo abbonamento ha già un metodo di pagamento», elenca chi/piano/metodo, e c'è un solo comando, **«Cambia metodo di pagamento»**, che porta alla scelta di prima (IBAN o carta). Con un solo abbonamento questo è già selezionato. Dalla scelta, «Lascia com'è» torna al riepilogo. Dopo un salvataggio si riparte dal riepilogo se tutto è a posto.
- **Nell'app, sopra il riepilogo, le quote da pagare** (`DaPagare`, la stessa carta della sezione Pagamenti: «Paga X con la carta •••• 1234» e «Usa un'altra carta»), se `daSaldare` non è vuoto. Con un metodo da sistemare il riepilogo non c'è e si vede la scelta come prima.
- **Dalla pagina del link per email** (`/r/<token>`, `/richiesta/metodo-pagamento`) cambia solo il riepilogo: non c'è il blocco «Da pagare» (`sopra` è facoltativo).
- **Ritorno dalla carta: «Era già tutto a posto»** quando l'abbonamento aveva già quella carta (`invariato` in `EsitoContratto`; `ElencoEsiti` dice «Aveva già questa carta: non è cambiato niente»).
- **Provato**: `tsc` a 43 errori (la base), nessuno nei file toccati. **Non guardato in un browser né su un telefono, e non provato con una sessione vera.** Pubblicare prima le funzioni (APP-ATHLON), poi l'app: con la funzione di prima il riepilogo funziona ma il ritorno dalla carta già presente resta «Carta non salvata».

### Gli errori si vedono subito e senza gergo (30/10/2026)

- **L'errore di un pagamento sta subito sotto il titolo di «Da pagare»** (`DaPagare`), non in fondo sopra i pulsanti; il testo lo scrive il server in parole della persona (APP-ATHLON, «Gli errori di pagamento… con parole della persona»): l'app non mostra mai il testo di PerfectGym.
- **Il ritorno dalla carta**: se la verifica è riuscita ma la carta era una già salvata e non si sa quale, la schermata dice «La carta era già salvata» (`CartaNonSalvata`, `giaPresente`) invece di «La carta non risulta salvata». La verifica riuscita non lascia più un minuto di attesa: dopo 8 secondi senza una carta nuova si conclude.
- **Dopo un errore si può riprovare subito**, anche con un'altra carta (il server non blocca più il secondo tentativo entro 90 secondi).
- `tsc` a 43 errori (la base), nessuno nei file toccati. **Non guardato in un browser né su un telefono.**

### Scegliere fra le carte e i conti già salvati (30/10/2026)

- **Nella scelta «Cambia metodo di pagamento»** (`GestioneNucleo`), sopra «Conto corrente (IBAN)» e «Carta di credito o di debito», **«Usa un metodo già salvato»**: le carte e i conti validi del titolare (`ElencoMetodi`, ultime quattro cifre e scadenza), ognuno con «Usa questa carta» / «Usa questo conto». Si collega agli abbonamenti selezionati senza pagina di Adyen e senza riscrivere l'IBAN; i comandi sono spenti finché non c'è un abbonamento selezionato. Un metodo che è già quello di tutti gli abbonamenti scelti dice «È già quello che usano gli abbonamenti scelti» e non si offre. L'esito è la schermata di prima («Il metodo di pagamento è stato salvato così»); per un conto dice «il conto che finisce con…», per una carta no.
- **Al ritorno dalla carta con più carte valide** (`RitornoCarta`, stato `scegli`): «Quale carta vuoi usare?», con le carte; sceglie la persona e si collega ai contratti che aveva scelto prima di partire. «Non cambiare niente» torna indietro.
- **Le ultime quattro cifre ovunque** (`ultimeCifre` in `lib/metodoPagamento.ts`): PerfectGym scrive «**** **** **** 1587», e `MetodoAttualeBadge` mostrava «•••• ************1587». Ora «•••• 1587».
- `tsc` a 43 errori (la base), nessuno nei file toccati. **Non guardato in un browser né su un telefono.** Pubblicare prima le funzioni (APP-ATHLON, `perfectgym-metodo-pagamento` e `portale-link`), poi l'app: con la funzione di prima l'elenco non compare e la scelta è quella di sempre.

## «Richiedi assistenza»: il pulsante cambia nome, Club Life ha il suo bottone, e la chat propone la telefonata e la prova (31/10/2026)

Richiesta di Maurizio. Il lato server (i rami iscritto / in prova / può provare / non iscritto, le regole 28-30 del prompt) sta nel `CLAUDE.md` di APP-ATHLON, stessa data.

- **Il pulsante in alto a destra si chiama «Richiedi assistenza»** (`assistente/PulsanteAssistente.tsx`; prima «Assistente virtuale», in inglese «Get support»). Il resto è com'era: stessa posizione, sola icona sotto i 390 punti o dove un comando occupa già il posto, nome per lo screen reader. **Il foglio che apre si intitola ancora «Assistente virtuale»**: dice chi risponde.
- **In Club Life, subito dopo gli orari, c'è «Richiedi assistenza»** (`assistente/RichiediAssistenza.tsx`, montato in `clublife/ClubLife.tsx`): una carta con un pulsante che **apre sempre la chat**, la stessa del pulsante in alto. Per aprirla da fuori il foglio si registra in `assistente/store.ts` (`registraApertura` da `PulsanteAssistente`, `apriAssistente(schermata)` da chi vuole aprirla; passa la chiave della schermata, qui `club-life`). Il foglio sta nel layout, quindi la conversazione è la stessa. **Mai in vista cliente** (come il pulsante).
- **La telefonata col desk si fissa nella chat** (`assistente/ChiamataDaChat.tsx`, parte pura `chiamataDaChat.ts`): la funzione propone il pulsante `prenota-chiamata` («Prenota una chiamata») **solo a chi non è iscritto** (nessun abbonamento in vigore nel nucleo: chi lo è usa «Scrivi al team»), una volta per conversazione. Toccandolo si apre **nella conversazione il calendario del desk**: è lo stesso modulo di Club Life, `clublife/moduli/Appuntamento.tsx`, con la nuova prop `incorporato` (un `Guscio` al posto della schermata `Cornice`, e a prenotazione fatta la conferma sta nella chat, senza il comando «Torna a Club Life»). Giorno, orario, di cosa parlare e cellulare (precompilato dall'area) li sceglie e li conferma la persona: **niente parte da solo**. «Non ora» richiude. **Non è una destinazione** (come `prenota-lezione`, `paga-quote`, `scrivi-team`).
- **La prova è la destinazione numero 32** (`prova` → `/richiesta/guest-pass`, che con una sessione prosegue dentro l'app senza email, `ProvaDallApp`): la funzione la manda solo a chi può attivarla. L'elenco chiuso di `destinazioni.ts` e quello della mappa della funzione restano uguali (la prova li confronta se i due repository stanno affiancati).
- **Provato**: `npx tsx scripts/prova-assistente.ts` (6 gruppi, con il confronto delle chiavi con la funzione e la rotta di `prova`, che sta fuori da `(portale)`); `tsc` pulito (restano solo gli errori di `docs/classifica-server`).
  **In Chromium** (bundle web esportato con `EXPO_PUBLIC_SUPABASE_URL` locale, funzioni e CRM simulati con `page.route`, 390 px con touch, tema chiaro, 11 controlli): la pillola «Richiedi assistenza» e nessuna scritta «Assistente virtuale» in pagina, il bottone in Club Life dopo gli orari che apre la chat, la risposta con «Prenota una chiamata», il calendario del desk dentro la chat (giorni, orari, «Di cosa vuoi parlare», cellulare precompilato, «Fissa l'appuntamento», nessun «Torna a Club Life»), nessuno scorrimento orizzontale. **Non provato**: la prenotazione vera dell'appuntamento (la rotta del CRM era simulata), la prova (`/richiesta/guest-pass`) aperta dalla chat, 360 e 1280 px, il tema scuro, l'inglese, un telefono, e una risposta vera del modello.
- **Pubblicare prima la funzione** (APP-ATHLON, `portale-lab-assistente`), poi l'app: un'app di prima con la funzione nuova ignora le due proposte (nessun pulsante, il testo resta).
