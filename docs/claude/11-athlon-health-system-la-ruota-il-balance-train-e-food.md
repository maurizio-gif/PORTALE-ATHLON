## Athlon Health System: la ruota, il Balance, Train e Food

La scheda che era **Workout** (poi «Fit») si chiama **Athlon Health System** (richiesta del club, 19/10/2026):
l'allenamento, l'alimentazione e il recupero dell'adulto in un posto solo. Nel codice la cartella resta `fit/`. L'indirizzo resta `/allenamento` (è quello dei link già dati); l'area scelta sta in
`?area=food`, così tornando dal diario si ritrova Food. Nomi in inglese di proposito, il resto in italiano.

- **Il video e la ruota in cima NON ci sono più** (31/10/2026, richiesta di Maurizio: «rimuovi proprio il video e quello spazio lì, sposta tutto in alto»). `schede/Schede.tsx` non monta più `VideoIntro`: la schermata comincia dal titolo e poi, se mancano i dati, dalla carta «Completa i tuoi dati», poi dal punteggio. **Non c'è più nemmeno la ruota**, che era il ripiego del video (inglese, file non caricato). Non è stato cancellato niente: `fit/VideoIntro.tsx`, `fit/Ruota.tsx`, `public/video/athlon-health-system.mp4` e la copertina restano nel repository (il file pesa 2,9 MB e finisce nel build web: se il club non lo rivuole, si tolgono). Per rimetterlo basta rimontare `<VideoIntro lingua={lingua} />` in cima a `Schede`. **Il resto di questo paragrafo e quello sulla ruota descrivono com'era.** Il video e la ruota nominavano ancora «Relax» e raccontavano il punteggio: ora nessuna schermata li mostra.
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
- **L'introduzione («Il benessere è un equilibrio») NON c'è più** (01/11/2026, richiesta di Maurizio: «ripete quello che dice l'Athlon Health Score, e ora c'è tanta roba nell'app»). Era la seconda carta di Fit
  (`fit/Intro.tsx`, 24/10/2026: Train, Food e Recover, l'Athlon Health Score, il Balance e il pannello «Come leggere i numeri»); **il file è stato tolto**. **La sua sostanza sta nella schermata dell'Athlon Health Score**
  (`fit/Punteggio.tsx`, sezione «I tre pilastri»): la frase «Il benessere è un equilibrio: viene da tre cose insieme, e nessuna basta da sola» e, in ogni carta di pilastro, cosa c'è dentro
  (`DI_COSA_SI_TRATTA`: Train i piani, il registro dei pesi, il test dei massimali e le calorie che consumi; Food il diario, la foto del piatto e i consigli, dopo l'informativa; Recover il sonno, i giorni di riposo, la mobilità
  e il foam roller). **Il Balance non si nomina più** nell'introduzione, nel punteggio e nel dettaglio dell'allenamento (`fit/Training.tsx`: tolto il tasto «Il Balance», resta «Il contatore») né nella carta «Da compilare»
  (ora dice solo «le calorie restano chiuse»): sta nell'area Food (`fit/Food.tsx`) e nella sua schermata `/allenamento/balance`, che ha ancora «Come leggere i numeri» (`ComeLeggere` in `fit/Balance.tsx`).
  Resta il Balance solo nell'informativa dei dati del corpo (`dati/informativaCorpo.ts`), perché usa quei dati: è un testo legale, non l'ho toccato.
  **L'ordine su Fit** (`schede/Schede.tsx`) è: ruota, punteggio, «Il tuo mese» e «La tua settimana» (quando ci sono), «Il tuo corpo», «I tuoi dispositivi», **«Le tue abitudini» (spostata sotto i dispositivi il 01/11/2026)**; poi le aree.
  Su schermo largo (da 900 px): a sinistra corpo e dispositivi, a destra le abitudini.
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
- **Balance** (`fit/Balance.tsx`, conto in `fit/bilancio.ts`, schermata `/allenamento/balance`; **dal 01/11/2026 la carta sta nell'area Food, in ogni suo stato**: anche senza consenso, per i minorenni e nella vista cliente, dove mostra solo il consumo; dentro Food non c'è il tasto «Vai a Food»): **nella carta si presenta chiuso** (20/10/2026, richiesta del club:
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

