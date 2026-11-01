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

