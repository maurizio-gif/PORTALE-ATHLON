## Il soggetto pagatore sulle ricevute dei figli: nel salvataggio del metodo di pagamento e «Cambia soggetto pagatore» in Documenti (05/11/2026)

Richiesta di Maurizio: per la detrazione servono nome, cognome e codice fiscale di chi ha pagato davvero, e il genitore deve poterlo dire da solo, **per le ricevute che verranno e per quelle dell'anno scorso**. Il lavoro vero (preferenza per bambino, copie delle ricevute vecchie, finestra dell'anno precedente, registro della dichiarazione) sta in APP-ATHLON, `CLAUDE.md`, stessa data: lì ci sono le decisioni. Qui ci sono le due schermate. **Stato: scritto, `tsc` pulito; non guardato in un browser né su un telefono; funzioni non ancora pubblicate.**

### Nel salvataggio del metodo di pagamento

`features/lab/pagatore/PagatoreMetodo.tsx`, usato da `lab/metodo/MetodoPagamento.tsx` e innestato in `GestioneNucleo` (nuova prop `pagatore`, solo nell'app: dal link dell'email non c'è una sessione).

- Una casella: «Voglio essere indicato come soggetto pagatore sulle ricevute di <figli>». Compare **solo se fra gli abbonamenti scelti c'è un figlio minorenne**; se per quei figli c'è già una scelta lo dice («Sulle ricevute di Sofia compare già…») e la casella diventa «Cambia chi risulta…».
- Spuntata, mostra nome, cognome e codice fiscale **già riempiti con chi è connesso** (il «mio nominativo»): si confermano, si completano se il codice fiscale manca, o si cambiano se ha pagato l'altro genitore. Sotto, la dichiarazione di responsabilità (il testo lo manda il server: quello in italiano è registrato).
- **`prima(selezionati)` si chiama prima di ogni salvataggio** (IBAN, carta, metodo già salvato): scrive la preferenza, e se qualcosa non torna (dati, dichiarazione, server) il metodo **non** si salva e l'errore si mostra. Dalla carta si esce dall'app: la preferenza è già scritta.
- Lo stato sta nella pagina che contiene `GestioneNucleo` (hook `usePagatoreMetodo`), perché la schermata cambia (elenco, IBAN, esito) e quello che la persona ha scritto deve restare.

### In Documenti

`features/lab/pagatore/FoglioPagatore.tsx`, aperto da una carta sotto le Ricevute («Per la detrazione, a chi intestiamo le ricevute dei tuoi figli?») che compare **solo se la famiglia ha più persone e almeno una ricevuta**.

- Si sceglie il figlio e l'anno (le pillole compaiono solo se ce n'è più d'uno; oggi il server offre solo l'anno solare precedente), e tutte le ricevute agganciate sono già spuntate: **«applica a tutte»** è il caso normale, perché in dichiarazione servono tutte insieme; se ne spunta una sola per cambiare una sola.
- **Una ricevuta vecchia di PerfectGym non si lega da sola a un pagamento quando quel giorno ce n'è più d'uno** (circa il 6%): compaiono le pillole con importo e ora, e la persona sceglie (l'importo lo vede sul PDF). Finché non sceglie, quella ricevuta non si conta.
- «Chi ha pagato» parte dai dati della scelta esistente o del titolare. Due caselle: **«anche per le ricevute future»** (spuntata di partenza) e la dichiarazione.
- Si manda **a gruppi di 25** (`MAX_PER_CHIAMATA`: ogni PDF si disegna e si deposita), col contatore «Rifaccio le ricevute… 12/30». Alla fine: quante rifatte, quante già con quel pagatore, e gli errori per numero di ricevuta. L'elenco dei Documenti si rilegge (`scorda(CHIAVE_DOCUMENTI)`): la copia compare accanto all'originale, con lo stesso numero e «Copia con soggetto pagatore».

### I pezzi

- `src/api/pagatore.ts`: le quattro chiamate a `portale-lab-pagatore` e il controllo dei dati (`codiceFiscaleValido` di `lib/codiceFiscale.ts`, la stessa regola del server).
- `Documento` (`api/documenti.ts`) non cambia: `numero` e `copia` arrivano dal server e l'app non ne ha bisogno per ora.

### Non provato

- **Niente in un browser**: layout del foglio, tastiera sul telefono, la casella dentro `GestioneNucleo` con più figli. Da guardare a 390 px e sul totem (la casella compare anche lì: dal totem il metodo passa già da QR o email, `passaggio.ts`; la preferenza non lo fa, perché richiede una sessione).
- **Le chiamate vere**: `portale-lab-pagatore` è scritta ma non pubblicata.
- **Il flusso con il codice fiscale del titolare mancante** e un figlio senza scheda.

### Ordine

Migrazione e funzioni di APP-ATHLON **prima**, poi l'app. Con l'app prima, la casella compare ma il server risponde 404 sull'azione: `stato` fallisce in silenzio e il blocco non si mostra (il metodo si salva come sempre); in Documenti la carta si apre e dice che non riesce a leggere.
