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

