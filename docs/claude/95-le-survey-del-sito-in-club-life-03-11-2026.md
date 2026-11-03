## Le survey del sito dentro Club Life: le stesse domande, e chi risponde è già noto (03/11/2026)

Richiesta di Maurizio: «nella sezione Club Life del portale metti le survey che abbiamo nel sito; essendo dentro l'area riservata
prendi in automatico l'utente che la compila». In Club Life, fra le news e l'Help Desk (come sul sito: dopo l'Help Desk si
leggerebbe come un passaggio del reclamo appena aperto), c'è una carta «Raccontaci come sta andando» (`clublife/survey/ElencoSurvey.tsx`,
`PortaSurvey`) che porta al menu degli argomenti (`/club-life/survey`) e da lì alla survey (`/club-life/survey/<tema>`, `survey/Survey.tsx`):
stelle per ogni domanda, l'NPS da 0 a 10 e la nota. **La carta è una sola e non otto righe**: le news erano state ridotte a righe proprio
perché spingevano l'Help Desk, la cosa per cui si apre Club Life, tre schermate più in basso.

- **Le domande non sono nell'app.** Le legge da `club-life.json`, campo `survey` (`surveyPerApp` in `data/surveys.ts` del sito: temi, domande,
  scala dell'NPS, soglia della recensione, le tre frasi della nota, il riquadro di Google). `surveyDa` (`api/clubLife.ts`) ne controlla la
  forma: senza il campo, o con la soglia o la scala sporche, **la sezione non compare** (un feed di prima non rompe Club Life); un tema senza
  domande o con lo slug storto si scarta da solo, gli altri restano. Un tema nuovo o una domanda ritoccata in `SURVEYS` arriva nell'app al deploy
  del sito. **La survey `iscrizione` non c'è**: è nascosta, la manda il CRM a una persona precisa con l'indirizzo nel link.
- **Chi risponde si prende dall'accesso e non si chiede.** L'email e il numero socio sono quelli di `useIdentita` (la scheda del titolare, la
  stessa degli altri moduli di Club Life) e la schermata dice «Rispondi come …». Vanno alla **stessa funzione del sito**
  (`sito-valutazioni/sondaggio`, `inviaSondaggio` in `api/moduli.ts`), quindi alla stessa tabella `sondaggi_risposte` e alla stessa pagina Survey del
  CRM: il trigger `utente_assegna` aggancia la riga all'anagrafica con email e numero, come per ogni form del sito. `pagina` è
  `/club-life/survey/<tema>` (quella del sito è `/surveys/<tema>/`), ed è come nel CRM si distingue una risposta dell'app. **Dall'app la risposta
  non è mai anonima** (sul sito l'email è facoltativa), e il menu lo dice in chiaro: «le risposte arrivano a tuo nome».
- **Le regole sono quelle del sito** (`survey/calcolo.ts`, puro, si prova con `tsx`): basta un giudizio (stelle o NPS) per inviare; la domanda
  aperta c'è sempre ma cambia frase con i voti (neutra, «cosa potevamo fare meglio» sotto soglia, «cosa ti piacerebbe trovare» sopra); solo chi è
  contento — NPS ≥ 9 **oppure** media ≥ 4,5 — riceve la richiesta di una recensione su Google, gli altri il rimando a «Scrivi al club». **La
  soglia arriva dal feed**: due copie di un numero rispondono in due modi al primo ritocco. Media e «positivo» li ricalcola la funzione.
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
- **I link restano nell'app.** `link.ts` apre `https://www.athlonroma.it/surveys/` sul menu e `/surveys/<slug>/` sulla survey se il feed ha quel
  tema (una news, una scheda, una notifica che citano una survey); `/surveys/iscrizione/` e un tema che il feed non ha si aprono sul sito. Senza il
  campo `survey` nel feed restano tutti sul sito.
- **Dettagli che hanno una ragione.** `Stella` è un componente solo (`ui/Stella.tsx`): la carta «Com'è andata?» della Home la disegna uguale.
  `Cornice` impara `indietro`, così la freccia di una survey riporta al menu e non a Club Life. L'NPS sta in una riga se gli undici bersagli da 44 ci
  stanno (`onLayout`), altrimenti in due (0–5 e 6–10): a 390 punti sono 47×48. Da schermo largo (`LARGO`) il testo della domanda e le stelle stanno sulla
  stessa riga, con la parola della stella a sinistra: in una carta da mille punti le stelle a sinistra lasciavano mezza carta vuota. Le stelle e
  l'NPS dichiarano `checked` oltre a `selected`, perché `Tocco` scrive `aria-checked` solo con quello. «Rispondi a un altro argomento» usa `dismissTo`,
  non `navigate`: `navigate` impilava una copia del menu a ogni giro. Le domande restano in italiano (sono quelle del sito, come news e schede); i
  testi dell'app sono in italiano e inglese.
- **Provato.** `npx tsx scripts/prova-survey.ts`: 12 prove (lettura difensiva del feed, media, soglia, forma della nota, user-agent, invio con un `fetch` finto:
  corpo esatto, 200 senza esito, 400/500, risposta non JSON, rete assente); **con `CLUB_LIFE_JSON=<dist>/club-life.json` una in più sul feed vero del sito**
  (8 temi, 52 domande). Provata per mutazione: cinque rotture a mano (soglia `>=`, esito non controllato, OR che diventa AND, user-agent anche sul web, voti
  in ordine inverso) rilevate tutte. `npx tsc --noEmit`: nessun errore fuori da `docs/`. **In Chromium** (bundle web esportato con `EXPO_PUBLIC_SUPABASE_URL`
  locale, backend finto con `page.route`, sessione simulata, feed vero del sito; 390, 360, 820, 1280 e 1440 px; italiano e inglese): la carta fra news e Help
  Desk, il menu con gli otto argomenti e senza `iscrizione`, la survey, l'invio senza giudizi (nessuna richiesta), un giudizio alto (corpo con email e
  numero socio dell'accesso, `pagina`, voti in ordine con `null` per le saltate, recensione), uno basso (niente recensione, «Scrivi al club»), il server che
  scarta / risponde 500 / non c'è (errore, niente perso, e poi l'invio riesce), un argomento tolto dal sito mentre la persona è sulla sua schermata, i link
  `/surveys/…` dentro una scheda, la vista cliente, nessuno scorrimento orizzontale e nessun errore in console. **Non provato**: un invio vero alla funzione
  pubblicata, l'app su un telefono (iOS e Android) — soprattutto lo user-agent su Android, verificato solo contro `isbot` e nel sorgente di React Native —,
  e il rimbalzo sulla Home quando si apre a freddo un indirizzo di Club Life nel banco di prova (accade anche per `/calendario` e `/pagamenti`, che qui non
  sono stati toccati: non è delle survey).
- **Da pubblicare**: prima il sito (il campo `survey` del feed: senza, la sezione non compare), poi l'app. Nessuna migrazione e nessuna funzione da
  pubblicare: la tabella e la funzione sono quelle del sito.
