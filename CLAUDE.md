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
  prenotazioni e gli stessi limiti per categoria, ma a prenotare è l'operatore, a nome del cliente, e da lì non si incassa né si disdice. **Non condivide il codice con
  `portale-lab-calendario`** (la funzione dell'app non è stata toccata): se qui cambia la lettura del giorno, il filtro d'età, l'apertura o i limiti, va cambiato anche in
  `_shared/planning-crm.ts` di APP-ATHLON. Il Calendario resta quello che il socio vede: il Planning non cambia niente nell'app.

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
- **In vasca il piano si legge e non si registra** (20/10/2026): l'agente («Dove ti alleni» → «In vasca») scrive un piano di nuoto per il Nuoto Libero, con distanze e
  recuperi; stesso editor, stesse conferme, ma senza «Inizia». Sezione «Il piano di nuoto» in fondo.
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
- **Poi l'Athlon Health Score** (`fit/Punteggio.tsx`, sezione sotto): il punteggio da 0 a 100 sui tre pilastri, con l'anello a tre settori e il dettaglio in
  `/allenamento/punteggio`.
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
  a comportamenti scorretti, e una classifica espone nome e punteggio di una persona: se un giorno si vuole, è un consenso a parte (opt-in con un'anteprima di come si apparirà). Il DPR 430/2001 (concorsi a premio) va
  fatto confermare dal consulente.
- **Da fare, non fatto**: valutazione d'impatto (art. 35), accordi con i fornitori e trasferimenti extra-UE, conservazione del registro dei punti, esportazione dei dati (art. 20), proporzionalità del questionario di
  Food, e i minorenni per le misure (il consenso non controlla l'età).

Per verificare: `npx tsc --noEmit` senza errori nuovi (41 di base). **Provato nel browser con la funzione simulata**: la pagina del consenso (la casella accende il pulsante, il consenso manda la versione corrente e rilegge),
«Il tuo corpo» con i dati e in fondo consenso e revoca (la conferma, e dopo la revoca la pagina del consenso), la funzione vecchia senza il campo `consenso` (nessun blocco, nessun comando), la carta in Fit con l'invito, la
nuova informativa di Food (versione del 20/10/2026 e il punteggio nel testo) e il link all'informativa nell'accesso. **Non provato**: la riga «Informativa privacy» del Profilo (la Home non si simula), un telefono, e le funzioni
vere con una sessione vera.

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

## I consigli di Athlon: le lezioni che fanno per te, con le alternative; sala e nuoto se li vuoi

Richiesta del club (20/10/2026): il Percorso (sezione sotto) era troppo complesso e la prenotazione dentro la settimana troppo stretta. Nella schermata Train la carta che c'era
(`CartaConsigli` in `schede/Schede.tsx`) porta adesso ai **consigli** (`/allenamento/consigli`, cartella `src/features/lab/consigli/`): il socio dice cosa cerca e riceve **i tipi di lezione che
fanno per lui, con le alternative**, e se vuole anche come affiancarli alla sala pesi (Gym Floor) e al Nuoto Libero. Non è una settimana e non è un piano di allenamento: niente tappe,
niente editor, niente conferma, niente «Prenota la settimana». Funzione, controlli, quota e workflow: `CLAUDE.md` di APP-ATHLON (`portale-lab-percorso`, azioni `consigli_stato` e `consigli`).

- **Una schermata sola con tre momenti** (`Consigli.tsx`): le domande, l'attesa e i consigli. Obbligatori solo obiettivo e livello; poi quante volte a settimana (1-6, di partenza 3), «Vuoi anche la sala pesi?»,
  «E il nuoto?» (no · Nuoto Libero · Voglio imparare), e — facoltativi — che lezioni piacciono (i cinque gruppi del Percorso), quando si preferisce venire, in quali giorni si può, quali lezioni evitare (a parole,
  separate da una virgola), se includere le non comprese e le limitazioni. **Sala e nuoto li sceglie il socio**: senza averli chiesti non compaiono. L'attesa è di pochi secondi, a volte mezzo minuto.
- **I consigli sono carte per tipo di lezione** (`CartaConsiglio`): il nome, categoria, durata e quante volte a settimana conviene, «Spesso al completo» e «Da acquistare» dove servono, il perché (una riga, senza
  numeri: li scrive il codice), **le prossime lezioni** (le prime due, le altre con «Mostra altre») e **le alternative** in una riga che si apre («Se questa non va: 2 alternative»), ognuna con le sue lezioni.
  Poi i blocchi «E in sala» (`BloccoSala`: per giorno i turni con l'assistente di sala e quelli in allenamento libero, con le parole del sito: **l'assistente di sala supervisiona le attività in sala, non ti segue
  né ti controlla mentre lavori**) e «E in vasca» (`BloccoNuoto`), gli avvisi della funzione in fondo e «Come metterli insieme». Un tipo senza lezioni nei prossimi giorni lo dice e rimanda alle alternative.
- **Si prenota con i pulsanti del Calendario** (`RigaLezione` in `Lezioni.tsx`: `AzioniLezione` e `usePrenotazioneLezione`, gli stessi del Percorso): prenota, lista d'attesa, disdici, acquista se non è compresa, «Prenotabile da…»
  se non si è ancora aperta, il motivo del limite della categoria. **Nessuna regola in più**: se il Calendario dice «hai già una prenotazione di Group Reformer», lo dice anche qui. Dopo un clic la riga si aggiorna
  subito con quello che ha detto PerfectGym (`conPrenotazione`, in ogni posto dove compare quella lezione) e la memoria del giorno del calendario si butta (`dimenticaGiornoCalendario`).
- **La memoria è solo in memoria** (`consigli:ultimi`, `consigli:scelte`, `consigli:stato`, mai sul disco): l'ultima risposta e le scelte, **senza le limitazioni**, così dopo un pagamento o un «Dettagli» si
  ritrovano i consigli («Cambia le risposte» → «Torna ai consigli di prima»). Non è niente di sanitario. Le dieci richieste al giorno le conta il server (`stato.quota`).
- **Nella vista cliente dello staff non si apre**: la schermata dice che i consigli li chiede solo il socio e la funzione risponde 403. Solo maggiorenni. Una funzione che non conosce ancora l'azione («Azione sconosciuta.») per
  il socio è «non ancora attivi».
- **Il Percorso è in standby** (richiesta del club, 20/10/2026): non si vede e non si raggiunge. Il link in fondo ai consigli («Preferisci una settimana già a tappe?», `AltraStrada`) non compare, e le tre schermate (`/allenamento/percorso`, `percorso-nuovo`, `percorso-modifica`) rimandano ai consigli, così un vecchio link non apre una funzione che non si offre più. Non è stato tolto niente: la cartella `percorso/`, `src/api/percorso.ts`, la funzione e le tabelle restano. **Si riaccende con `PERCORSO_IN_STANDBY = false` in `percorso/standby.ts`**, ma prima si decide dove deve ricomparire (il link in fondo ai consigli o di nuovo la carta in Train) e lo si ricontrolla con i tester: dall'accensione non è mai stato provato con una sessione vera.
- **Parole**: «consigli», «lezioni», «sala», «vasca»; mai «percorso» né «piano» per questa cosa, e niente promesse di risultati. I posti cambiano in fretta: l'ultima parola è del Calendario, e la schermata lo dice.

Per verificare: `npx tsc --noEmit` pulito; `consigli/comune.ts` è puro (`conPrenotazione`, `evitateDa`, `questionarioDa`) e si prova con `npx tsx`. **La schermata si guarda renderizzata** (360, 390, 430 e 1280 px, anche con «riduci
movimento»): le domande, l'attesa, i consigli con una lezione prenotata, da acquistare, spesso al completo e senza date, le alternative aperte, la sala con i due tipi di turno, il nuoto, la quota finita (il pulsante
si spegne e lo dice) e la vista cliente. Si prova con il bundle esportato e le risposte della funzione intercettate; **con una sessione vera non è provata**, né su un telefono.

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

- **Due strade, un piano solo.** Dall'**agente dei piani** (`Agente.tsx`): la prima domanda è «Dove ti alleni» (in sala / in vasca · Nuoto Libero); in vasca si chiedono
  obiettivo (c'è anche «Tecnica»), livello, quante volte (1-4), quanto dura la seduta (30, 45 o 60 minuti), gli stili che sa nuotare e quanto nuota di fila, e le limitazioni;
  `chiediPianoNuoto` risponde con una **bozza** che passa dall'editor (`?da=bozza`). Dal **Percorso**: «Quante volte in vasca» (0-3), con gli stessi due campi
  (`CampiNuoto`), e il piano torna con la bozza del percorso. In tutti e due i casi lo si rivede, lo si modifica e lo si conferma: solo allora è un piano suo.
- **Il Nuoto Libero chiede stile libero e dorso.** Scelti gli stili senza uno dei due, `CampiNuoto` dice dove si comincia (`MESSAGGIO_SCUOLA_NUOTO`: la Scuola Nuoto Adulti, dove
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
