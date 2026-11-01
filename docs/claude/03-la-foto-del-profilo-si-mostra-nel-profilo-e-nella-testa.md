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

