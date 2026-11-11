## Il test dei massimali: il secondo esercizio delle gambe è «Consigliato», non «Facoltativo» (11/11/2026)

Decisione di Maurizio (11/11/2026), dopo il riquadro del minimo (`201-…`). Il minimo resta **tre esercizi, uno per gruppo**, e «Tutti e tre fatti» non cambia. Cambia solo come si chiama l'esercizio in più della **parte inferiore**: fatto uno dei due (leg extension o leg curl), l'altro non è più «Facoltativo: chili più precisi» ma **«Consigliato: controlla i chili delle gambe»**.

**Perché solo le gambe.** I due test delle gambe sono quelli che più spesso non tornano fra loro (in tre soci su quattro di quelli che li avevano fatti tutti e due, vedi `201-…`), e con un test solo non c'è modo di accorgersene: i chili delle gambe sono i meno sicuri. I test della parte superiore invece tornano fra loro, e lì gli esercizi in più restano «Facoltativo». Rimettere «Consigliato» su tutti rifarebbe il difetto di prima (sembravano obbligatori tutti e sette).

### Cosa si vede

- **Nel riquadro del minimo**, raggiunto il minimo con una gamba sola: sotto «Hai fatto il minimo…» una riga **«Consigliato:** fai anche l'altro esercizio delle gambe. Con uno solo i chili delle gambe sono i meno sicuri, con due li controlliamo.», e poi «Gli altri 3 sono facoltativi: con più test i calcoli sono più accurati.» (prima: «Vuoi chili più precisi? Fai anche gli altri 4»). Con tutte e due le gambe fatte torna la frase di prima.
- **Sotto «Parte inferiore del corpo»**: con nessuna gamba fatta, «Per il minimo ne basta uno, quello che preferisci. Ti consigliamo di fare poi anche l'altro.»; con una, «Consigliato: fai anche l'altro esercizio…».
- **Sulla riga dell'esercizio non fatto**, in arancione: «Consigliato: controlla i chili delle gambe».
- **Nel foglio, dopo il salvataggio che completa il minimo**, se le gambe hanno un test solo: «Ti consigliamo di fare anche l'altro esercizio delle gambe: con due controlliamo che i chili tornino. Gli altri sono facoltativi.»
- Il consiglio c'è anche **prima** del minimo (una gamba fatta, il resto no): la riga dell'altra gamba è già «Consigliato».
- Se i due test delle gambe ci sono e non tornano, resta «Da ricontrollare» (`201-…`): lì non c'è niente da consigliare, c'è da rifarne uno.

### Come è fatto

- **La regola è una funzione pura**, `secondoConsigliato(gruppo, fatti, totale)` in `schede/minimoTest.ts`: vero se il gruppo è in `GRUPPI_CON_SECONDO_CONSIGLIATO` (oggi `['inferiore']`), ha più di un esercizio nel test e ne è stato fatto **uno solo**. `statoMinimo` porta due campi in più: `consigliati` (quanti esercizi non fatti sono consigliati) e `gruppiConsigliati`.
- **La stessa regola sta nel CRM** (`lib/massimaliTest.ts` di APP-ATHLON, pagina del test scritto dal trainer): i due repository non si importano, quindi **si cambia in tutti e due**. Il server non c'entra: `copertura` e il calcolo dei chili sono quelli di prima.
- Nessuna funzione da ripubblicare e nessuna migrazione.

### Provato e non provato

- **Provato**: `npx tsx scripts/prova-minimo-test.ts` (20 prove, 7 nuove; 5 modifiche della regola provate, tutte rilevate); `tsc` senza errori nel codice dell'app; **in Chromium** sulla build web (`expo export -p web`) con sessione e funzione finte, in nove situazioni: nessun test, la prima gamba salvata (il messaggio del foglio), una gamba sola (chiaro, scuro, 320 px, inglese), due gambe (nessun «Consigliato»), solo una gamba prima del minimo. Nessuno scorrimento orizzontale.
- **Non provato**: un telefono vero e l'app nativa (serve un aggiornamento OTA perché arrivi a chi usa l'app dagli store).
