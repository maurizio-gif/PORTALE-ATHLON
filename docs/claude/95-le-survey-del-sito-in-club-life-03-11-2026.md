## Le survey dentro Club Life: scritte nell'app, e chi risponde è già noto (03/11/2026)

Richiesta di Maurizio: «nella sezione Club Life del portale metti le survey che abbiamo nel sito; essendo dentro l'area riservata prendi in
automatico l'utente che la compila» e, alla prima stesura: «le survey vanno ricostruite sul portale, non linkate dal sito». In Club Life, fra le news
e l'Help Desk (come sul sito: dopo l'Help Desk si leggerebbe come un passaggio del reclamo appena aperto), c'è una carta «Raccontaci come sta
andando» (`clublife/survey/ElencoSurvey.tsx`, `PortaSurvey`) che porta al menu degli argomenti (`/club-life/survey`) e da lì alla survey
(`/club-life/survey/<tema>`, `survey/Survey.tsx`): stelle per ogni domanda, NPS da 0 a 10 e nota. **La carta è una sola e non otto righe**: le news
erano state ridotte a righe proprio perché spingevano l'Help Desk, la cosa per cui si apre Club Life, tre schermate più in basso.

- **Le survey sono scritte nell'app** (`survey/dati.ts`) e non dipendono dal sito: niente feed, niente `club-life.json`, nessun link al sito. Ci
  sono anche se il sito non risponde (la porta compare pure con il feed delle news in errore). La prima stesura le leggeva dal feed del sito (campo
  `survey` di `club-life.json`) e **è stata scartata**: la PR del sito che lo pubblicava (SITO-ATHLON #368) è chiusa. Sono gli otto temi del menu di
  `/surveys/`; `iscrizione` non c'è, perché la manda il CRM a una persona precisa con l'indirizzo nel link. **Domande in italiano e in inglese**, come ogni
  testo dell'app (`docs/glossario-inglese.md`), e composte a ogni chiamata (`survey()`), non al caricamento del modulo: cambiando lingua sul nativo la
  schermata si ridisegna e deve trovare i testi della lingua nuova.
- **La conseguenza è una doppia copia, e va tenuta in pari a mano.** Quello che deve restare uguale al sito sono gli **`slug` dei temi e gli `id` delle
  domande** — il nome con cui la risposta finisce su `sondaggi_risposte` e nella pagina Survey del CRM: la stessa domanda posta sul sito e nell'app deve
  finire nella stessa colonna, o la serie storica si spezza in due senza che niente dia errore — e **le parole italiane** (due formulazioni della stessa
  domanda non sono confrontabili). Chi ritocca una domanda la ritocca nei due posti, oppure ne scrive una nuova con un `id` nuovo. Un tema nuovo sul sito
  **non** compare più da solo nell'app. `SITO_SURVEYS_TS=<SITO-ATHLON>/src/data/surveys.ts npx tsx scripts/prova-survey.ts` confronta temi, id, parole,
  scala dell'NPS, soglia e recensione con il file del sito (8 temi, 52 domande oggi uguali).
- **Chi risponde si prende dall'accesso e non si chiede, e non si dice in pagina.** L'email e il numero socio sono quelli di `useIdentita` (la
  scheda del titolare, la stessa degli altri moduli di Club Life). Una riga «rispondi come …» era scontata e non va sottolineata (richiesta di Maurizio):
  non c'è, né nel menu né nella survey. Vanno alla **stessa funzione del sito** (`sito-valutazioni/sondaggio`, `inviaSondaggio` in `api/moduli.ts`), quindi alla
  stessa tabella e alla stessa pagina Survey del CRM: il trigger `utente_assegna` aggancia la riga all'anagrafica con email e numero, come per ogni form
  del sito. `pagina` è `/club-life/survey/<tema>` (quella del sito è `/surveys/<tema>/`), ed è come nel CRM si distingue una risposta dell'app. Dall'app
  la risposta è sempre agganciata a chi è dentro (sul sito l'email è facoltativa).
- **Le regole sono quelle del sito** (`survey/calcolo.ts`, puro, si prova con `tsx`): basta un giudizio (stelle o NPS) per inviare; la domanda aperta c'è
  sempre ma cambia frase con i voti (neutra, «cosa potevamo fare meglio» sotto soglia, «cosa ti piacerebbe trovare» sopra); solo chi è contento — NPS ≥ 9
  **oppure** media ≥ 4,5 — riceve la richiesta di una recensione su Google, gli altri il rimando a «Scrivi al club». Media e «positivo» li ricalcola la
  funzione. Non c'è il rimando «cosa avevamo dichiarato» alla pagina del sito che il sito mette in fondo alla survey.
- **Solo `esito: 'ricevuto'` vuol dire «salvata», e su Android serve uno user-agent.** `sito-valutazioni` scarta in silenzio — `200 {ok:true}`,
  senza `esito` — le richieste il cui user-agent sembra uno script (`isbot`). Su Android React Native non ne manda uno (`NetworkingModule` ha
  `defaultUserAgent` nullo) e OkHttp mette `okhttp/x.y.z`, che `isbot` scarta: senza rimedio la persona vedrebbe «grazie» e la risposta non
  sarebbe mai arrivata. Dal telefono l'app manda `AthlonClub-App/1.0 (android|ios)` (`agenteApp`): `isbot` scarta le stringhe «prodotto/versione» senza il
  commento della piattaforma e lascia passare quelle col formato di un client vero (provato il 03/11/2026 con isbot 5.2.2: `AthlonClub-App/1.0 (android)`
  e `(ios)` passano, `AthlonClub-App/1.0` e `AthlonClub/1.0 (android)` no). **Sul web niente**: il browser ha il suo, e un'intestazione in più
  obbligherebbe il CORS a dichiararla. **È un riparo e non una cura**: la funzione importa `npm:isbot@5` senza versione fissa, quindi un giorno può
  cambiare — e allora l'app mostra un errore («Non siamo riusciti a inviare la risposta»), mai un «grazie» falso. La cura è sul server: far accettare
  a `sito-valutazioni` la sessione del portale (`utentePortale`, come `portale-lab-feedback`), saltare il filtro per chi ha un token vero e ricavare
  l'identità dal token invece che dal corpo (oggi email e numero sono quelli che il client dichiara, come per tutti i `sito-*`). Non è stato fatto:
  vuol dire pubblicare una funzione in produzione.
- **In vista cliente non si invia** (`inVista()`: avviso di `Cornice` e pulsante spento): chi guarda l'app di un socio non risponde al suo posto.
- **I link restano nell'app.** `link.ts` apre `https://www.athlonroma.it/surveys/` sul menu e `/surveys/<slug>/` sulla survey per gli slug di `SLUG_SURVEY`
  (una news, una scheda, una notifica che citano una survey); `/surveys/iscrizione/` e uno slug sconosciuto si aprono sul sito. Non dipende dal feed.
- **Dettagli che hanno una ragione.** `Stella` è un componente solo (`ui/Stella.tsx`): la carta «Com'è andata?» della Home la disegna uguale.
  `Cornice` impara `indietro`, così la freccia di una survey riporta al menu e non a Club Life. L'NPS sta in una riga se gli undici bersagli da 44 ci
  stanno (`onLayout`), altrimenti in due (0–5 e 6–10): a 390 punti sono 47×48. Da schermo largo (`LARGO`) il testo della domanda e le stelle stanno sulla
  stessa riga, con la parola della stella a sinistra: in una carta da mille punti le stelle a sinistra lasciavano mezza carta vuota. Le stelle e
  l'NPS dichiarano `checked` oltre a `selected`, perché `Tocco` scrive `aria-checked` solo con quello. «Rispondi a un altro argomento» usa `dismissTo`,
  non `navigate`: `navigate` impilava una copia del menu a ogni giro.
- **Provato.** `npx tsx scripts/prova-survey.ts`: 11 prove (dati scritti nell'app: slug e id da colonna, da cinque a sette domande per tema, nessuna
  `iscrizione`, **ogni testo con la sua traduzione**; media, soglia, forma della nota, user-agent; invio con un `fetch` finto: corpo esatto, 200 senza
  esito, 400/500, risposta non JSON, rete assente) + 1 con `SITO_SURVEYS_TS`. Provata per mutazione: cinque rotture del calcolo (soglia `>=`, esito non
  controllato, OR che diventa AND, user-agent anche sul web, voti in ordine inverso) e tre dei dati (un `id` rinominato, una traduzione dimenticata, una
  parola italiana diversa dal sito) rilevate tutte. `npx tsc --noEmit`: nessun errore fuori da `docs/`. **In Chromium** (bundle web esportato con
  `EXPO_PUBLIC_SUPABASE_URL` locale, backend finto con `page.route`, sessione simulata, **feed delle news senza il campo `survey`, cioè com'è oggi in
  produzione**; 360, 390, 820, 1280 e 1440 px; italiano e inglese): la carta fra news e Help Desk, il menu con gli otto argomenti e senza `iscrizione`,
  nessuna dicitura «rispondi come», la survey, l'invio senza giudizi (nessuna richiesta), un giudizio alto (corpo con email e numero socio dell'accesso,
  `pagina`, voti in ordine con `null` per le saltate, recensione) e uno basso (niente recensione, «Scrivi al club»), il server che scarta / risponde 500 / non
  c'è (errore, niente perso, e poi l'invio riesce), **il feed del sito in errore: le survey si aprono e si inviano lo stesso**, i link `/surveys/…` dentro
  una scheda, la vista cliente, le domande in inglese, nessuno scorrimento orizzontale e nessun errore in console. **Non provato**: un invio vero alla funzione
  pubblicata; l'app su un telefono (iOS e Android) — soprattutto lo user-agent su Android, verificato solo contro `isbot` e nel sorgente di React Native; la
  schermata «argomento non disponibile» (si raggiunge solo con un indirizzo vecchio da una notifica); e l'apertura a freddo di un indirizzo di Club Life nel banco
  di prova, che rimbalza sulla Home (anche per `/calendario` e `/pagamenti`: non è delle survey).
- **Da pubblicare**: solo il portale. Nessuna modifica al sito, nessuna migrazione e nessuna funzione: la tabella e la funzione sono quelle del sito.
