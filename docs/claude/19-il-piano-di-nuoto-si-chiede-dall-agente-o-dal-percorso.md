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

