## La sezione Famiglia mostra i dati dei figli: codice fiscale, e email e cellulare se diversi (06/11/2026)

Richiesta di Maurizio: sotto ogni figlio nella sezione Famiglia della Home, il codice fiscale, l'email e il cellulare («se diversi»). Lato server:
`CLAUDE.md` di APP-ATHLON, stessa data (migrazione `20261106b_area_dati_figli.sql`, **applicata il 06/11/2026**: la funzione risponde già con `dati`).

- **Cosa si vede**: sotto «Familiare · nato/a il …», fino a tre righe `Codice fiscale · …`, `Email · …`, `Cellulare · …` (in inglese `Tax code`,
  `Email`, `Mobile`), selezionabili per copiarle. Il codice fiscale c'è sempre, se c'è; **email e cellulare solo se diversi da quelli del titolare**:
  un bambino scritto con i contatti del genitore (il caso normale) non li ripete. Il confronto sta in `datiFigli.ts`: email senza maiuscole e spazi,
  cellulare sugli ultimi 9 numeri (`+39`, `0039` e spazi non contano).
- **Chi decide chi li ha è il server**: `PersonaArea.dati` c'è solo per i figli del genitore, non per il titolare e non per i bambini che si vedono
  con una delega. L'app non ricontrolla: senza `dati` non c'è nessuna riga, ed è anche quello che vede con la funzione di prima.
- **Un codice fiscale mancante non ha una riga**: «non presente» su un bambino piccolo si legge come un errore del genitore. Il segnaposto
  «ESTERO…» dei residenti all'estero non arriva dal server. Un codice fiscale scritto male (per esempio un nome nel campo) si vede com'è: la
  schermata non lo giudica.
- **In vista cliente** è la stessa schermata del cliente, con gli stessi dati (`portale_area_di` passa dalla stessa funzione).
- **Provato**: `scripts/prova-dati-figli.ts` (`npx tsx`, 9 prove: titolare, delega, contatti uguali e diversi, prefissi, vuoti); `npx tsc --noEmit`
  con gli stessi 45 errori di base di prima, nessuno nuovo.
- **Non provato**: la schermata renderizzata (390 e 1280 px, chiaro e scuro, inglese), né con dati veri.
