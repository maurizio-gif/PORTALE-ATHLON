## Il certificato: fino a tre file, e prima si dice per chi lo carichi (10/11/2026)

Richiesta di Maurizio, dopo un caso arrivato per email («dall'app non me lo fa caricare, vi mando qui l'integrazione dell'ECG»). Due cose, nello stesso foglio. Il lato server, il visore del desk e la migrazione:
`CLAUDE.md` di APP-ATHLON, «Il certificato caricato dal cliente può avere più file».

### Più file: il certificato e l'ECG su un foglio a parte

- **Perché.** Il motivo di rifiuto più frequente è «nel certificato non risulta scritto l'ECG» (19 rifiuti su 28 nei sette giorni prima del 10/11).
  Molti hanno l'ECG su un foglio a parte e l'app prendeva **un file solo**: non c'era un posto dove metterlo, e il certificato da solo tornava rifiutato.
- **Fino a tre file, 8 MB in tutto.** Il limite di peso è quello di un file solo, così il corpo della richiesta non supera mai quello che la funzione
  già accettava. I conti stanno in `src/lib/elencoFileCertificato.ts`, che **non importa niente di React Native** (si prova con `tsx`,
  `scripts/prova-certificato-piu-file.ts`); `fileCertificato.ts` ne riesporta `MAX_BYTE`, `MAX_FILE` e `pesoLeggibile`, quindi chi importava da lì non cambia.
- **Ogni scelta aggiunge un file** (`useCarica`: `files`, `scegli`, `togli`, `ricomincia`). Un file che non va — troppo pesante, lo stesso file due
  volte (si guarda il peso e i byte, non il nome), un formato che non si legge — **dice perché e non toglie quelli già scelti**. Prima un errore
  azzerava la scelta.
- **Il foglio.** Con nessun file ci sono le tre strade di sempre (foto, galleria, documento). Dopo il primo c'è «Aggiungi un altro file (ad esempio
  l'ECG)», che le riapre; a tre file non c'è più. «Togli» è su ogni riga. Il pulsante dice «Invia i file» se sono più d'uno.
- **Il corpo della richiesta** (`corpoFile`): il primo file come ha sempre fatto l'app (`nome`, `base64`), gli altri in `altri: [{ nome, base64 }]`.
  Con **un file solo il corpo è identico a quello di prima**: un'app installata di prima, che non conosce `altri`, continua a funzionare, e un'app nuova
  con un file solo funziona anche con una funzione non ancora aggiornata.
- **La guardia.** Una funzione di prima ignora `altri` e salva il primo file **senza dirlo**: sarebbe l'ECG perso in silenzio. La funzione nuova risponde
  `caricamento.file` (quanti ne ha salvati); se l'app ha mandato più file e quel numero manca o è più basso (`incompleto`), l'esito dice «Non tutti i file sono arrivati»
  e manda a «Richiedi assistenza». Con un file solo non scatta mai.
- **Il testo.** `CERTIFICATO_ISTRUZIONI.ecg` dice «se l'ECG è su un foglio a parte, caricalo insieme al certificato: puoi mandare fino a 3 file», e la nota sotto i
  pulsanti lo ripete con i limiti. È lo stesso testo dell'email del CRM (`dettagliCertificato`, APP-ATHLON): **se cambia, cambia in tutti e due i posti**.
  Le schede dell'Help Desk del sito (`generali/certificato-medico`) dicono ancora «un file» e non sono state toccate.

### Per chi lo carichi: un passo di conferma prima dei file

- **Perché.** Un genitore ha caricato sul proprio profilo il certificato del figlio. La segreteria lo ha rifiutato (nome e data di nascita non tornavano) e la persona
  ha perso giorni.
- **Il primo passo** (`ConfermaPersona.tsx`, titolo del foglio «Per chi è il certificato?»): «Stai caricando il certificato di» **Nome Cognome** in grande,
  sotto «Il tuo profilo» per il titolare o la **data di nascita** per un familiare (è quella che la segreteria confronta col certificato), la nota «sul certificato devono
  esserci il nome e la data di nascita di questa persona», la spunta **«Confermo che il certificato è di Nome»** e «Continua», spento finché non si spunta.
  **La spunta da sola non cambia schermata**: lo fa «Continua» (sono due stati, `spunta` e `confermato`; con uno solo la spunta saltava subito al passo dopo).
- **«Non è di Nome? Scegli per chi è».** Sotto, un pulsante per ogni altra persona del nucleo («Per me» per il titolare). Sceglierne una cambia la persona, **toglie la spunta**
  e riparte dal primo passo: la spunta è di una persona sola. Con un nucleo di una persona sola non ci sono altre persone: la riga dice che il certificato di un figlio si carica
  dal suo profilo e che, se non lo si vede, lo si aggiunge da Famiglia con «Aggiungi un componente».
- **Il secondo passo** tiene sempre in vista di chi è («Stai caricando il certificato di Nome») con **«Cambia persona»**, che torna al primo passo. **I file già scelti restano**:
  chi si accorge dello sbaglio a metà ha quasi sempre il file giusto in mano, è la persona a essere sbagliata.
- **Ogni apertura riparte dal primo passo** (`useEffect` su `aperto`): il foglio è uno solo e si apre su righe diverse, e non deve ricordare la spunta della volta prima.
  Il foglio riceve **tutto il nucleo** (`persone={area.persone}`) da `SezioneCertificato` e da `AvvisoCertificato`; senza `persone` si comporta come con la sola persona toccata.
- **La pagina del link** (`/r/<token>`, `CaricaDaLink.tsx`) ha lo stesso primo passo, ma **la persona è fissa**: il link vale per una persona sola, il `member_id` viene dalla riga del
  token. Non c'è un'altra persona da scegliere: la pagina dice «questo link vale solo per Nome: per un'altra persona usa il link dell'email che la riguarda, oppure accedi all'app».
  Se il link non porta il nome (`persona` vuoto) non c'è niente da confermare e il passo salta.
- **Il server non può saperlo.** Non c'è nessun controllo lato funzione sul fatto che il certificato sia di quella persona: il `member_id` arriva dall'app. Il passo di conferma è
  l'unico argine, e la segreteria resta l'ultimo controllo (nome e data di nascita sul certificato).

### Da pubblicare

**Prima il database e le funzioni, poi il CRM, poi l'app**: migrazione `20261110a_certificati_piu_file.sql`, poi `portale-lab-certificati` e `portale-link` (importano `_shared/certificati.ts`),
poi il CRM, poi questo repository. Con l'app nuova e la funzione vecchia i file in più non arrivano: la guardia lo dice alla persona, ma l'ECG resta da mandare.

### Provato e non provato

- **Provato:** `tsc` pulito su `src/`; `scripts/prova-certificato-piu-file.ts` (limiti, doppioni, corpo con e senza `altri`, guardia) con 5 mutazioni del codice, tutte rilevate;
  nel browser (Chromium, build web con `expo export -p web`, rete e sessione finte: nessuna richiesta esce) **la pagina del link** e **il foglio dell'area riservata** (su una pagina di prova temporanea
  con tre persone del nucleo, poi tolta): primo passo, spunta e «Continua», scelta di un'altra persona con la spunta che riparte, «Cambia persona» a metà con i file che restano, invio per la persona
  giusta con l'ECG in `altri`, tre file e il tetto, «Togli», doppione, file troppo grande, totale oltre 8 MB, esito con la funzione nuova e con quella vecchia (l'avviso), riapertura su un'altra riga che riparte
  vuota, nucleo di una persona, nessuno scorrimento orizzontale a 360, 390 e 1080 px. Un difetto trovato così: dopo un errore le tre strade si richiudevano (ora solo se un file è stato aggiunto).
- **Non provato:** l'app nativa (iOS e Android) e un telefono vero; la fotocamera e la galleria con più file (il selettore nativo non è quello del browser); la funzione vera pubblicata; i font (nel sandbox
  non si caricano: gli screenshot sono in serif).
