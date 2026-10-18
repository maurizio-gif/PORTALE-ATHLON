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
Train di Fit.

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

`/allenamento/alimentazione` (cartella `src/features/lab/alimentazione/`, area Food di Fit): il diario
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

## Fit: Balance in cima, Train e Food sotto

La scheda che era **Workout** si chiama **Fit** (richiesta del club, 19/10/2026): l'allenamento e l'alimentazione
dell'adulto in un posto solo. L'indirizzo resta `/allenamento` (è quello dei link già dati); l'area scelta sta in
`?area=food`, così tornando dal diario si ritrova Food. Nomi in inglese di proposito, il resto in italiano.

- **In cima l'introduzione** (`fit/Intro.tsx`): cosa c'è nelle tre parti e, in un pannello che si apre, come leggere i
  numeri (`ComeLeggere` in `fit/Balance.tsx`, lo stesso testo in fondo alla schermata di Balance).
- **Balance** (`fit/Balance.tsx`, conto in `fit/bilancio.ts`, schermata `/allenamento/balance`): le calorie consumate
  (le stime del contatore: riposo × 1,2 più l'attività contata) accanto a quelle del diario. **Un giorno senza niente nel
  diario non vale zero** ed esce dalle medie; **oggi non è finito** ed esce dalle medie. Sotto 150 kcal di differenza
  media al giorno le due cifre sono «pari»: tutte e due sbagliano del 10–20%. Descrive, non dà traguardi; il peso delle
  misure è la verifica. Senza consenso a Food, o nella vista cliente, mostra solo il consumo; con i numeri nascosti
  resta spento.
- **Train** è il Workout di prima, senza l'alimentazione. **Food** (`fit/Food.tsx`) è la porta del diario: prima del
  consenso racconta cosa c'è e porta all'informativa; dopo, oggi e i comandi «Il diario» e «Fotografa»
  (`/allenamento/alimentazione?foto=1` apre la foto sul pasto dell'ora).
- **I dati li legge `useFit`** con le chiavi di memoria del diario e del contatore (`alimentazione/chiavi.ts`), e li rilegge
  a ogni ritorno su Fit: un pasto scritto nel diario cambia il Balance appena si torna indietro.
