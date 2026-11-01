## Metodo di pagamento: se c'è già, si dice e si propone di pagare; il cambio è un comando a parte (30/10/2026)

Richiesta di Maurizio dopo il caso di un genitore (Francesca Capasso, figlio Andrea Leonardi): un abbonamento creato dal desk nasceva già con la carta del genitore, lei ha provato a «inserire il metodo» e ha letto errori. File: `features/metodo-pagamento/GestioneNucleo.tsx`, `RitornoCarta.tsx`, `Metodo.tsx`, `features/lab/metodo/MetodoPagamento.tsx`, `lib/metodoPagamento.ts`. Lato server: `CLAUDE.md` di APP-ATHLON, stessa data.

- **Se tutti gli abbonamenti hanno già un metodo valido** (nessuno senza metodo, in contanti o con la carta scaduta, e il link non nomina un contratto: `inOrdine`), la pagina **non apre la scelta**: dice «Questo abbonamento ha già un metodo di pagamento», elenca chi/piano/metodo, e c'è un solo comando, **«Cambia metodo di pagamento»**, che porta alla scelta di prima (IBAN o carta). Con un solo abbonamento questo è già selezionato. Dalla scelta, «Lascia com'è» torna al riepilogo. Dopo un salvataggio si riparte dal riepilogo se tutto è a posto.
- **Nell'app, sopra il riepilogo, le quote da pagare** (`DaPagare`, la stessa carta della sezione Pagamenti: «Paga X con la carta •••• 1234» e «Usa un'altra carta»), se `daSaldare` non è vuoto. Con un metodo da sistemare il riepilogo non c'è e si vede la scelta come prima.
- **Dalla pagina del link per email** (`/r/<token>`, `/richiesta/metodo-pagamento`) cambia solo il riepilogo: non c'è il blocco «Da pagare» (`sopra` è facoltativo).
- **Ritorno dalla carta: «Era già tutto a posto»** quando l'abbonamento aveva già quella carta (`invariato` in `EsitoContratto`; `ElencoEsiti` dice «Aveva già questa carta: non è cambiato niente»).
- **Provato**: `tsc` a 43 errori (la base), nessuno nei file toccati. **Non guardato in un browser né su un telefono, e non provato con una sessione vera.** Pubblicare prima le funzioni (APP-ATHLON), poi l'app: con la funzione di prima il riepilogo funziona ma il ritorno dalla carta già presente resta «Carta non salvata».

### Gli errori si vedono subito e senza gergo (30/10/2026)

- **L'errore di un pagamento sta subito sotto il titolo di «Da pagare»** (`DaPagare`), non in fondo sopra i pulsanti; il testo lo scrive il server in parole della persona (APP-ATHLON, «Gli errori di pagamento… con parole della persona»): l'app non mostra mai il testo di PerfectGym.
- **Il ritorno dalla carta**: se la verifica è riuscita ma la carta era una già salvata e non si sa quale, la schermata dice «La carta era già salvata» (`CartaNonSalvata`, `giaPresente`) invece di «La carta non risulta salvata». La verifica riuscita non lascia più un minuto di attesa: dopo 8 secondi senza una carta nuova si conclude.
- **Dopo un errore si può riprovare subito**, anche con un'altra carta (il server non blocca più il secondo tentativo entro 90 secondi).
- `tsc` a 43 errori (la base), nessuno nei file toccati. **Non guardato in un browser né su un telefono.**

### Scegliere fra le carte e i conti già salvati (30/10/2026)

- **Nella scelta «Cambia metodo di pagamento»** (`GestioneNucleo`), sopra «Conto corrente (IBAN)» e «Carta di credito o di debito», **«Usa un metodo già salvato»**: le carte e i conti validi del titolare (`ElencoMetodi`, ultime quattro cifre e scadenza), ognuno con «Usa questa carta» / «Usa questo conto». Si collega agli abbonamenti selezionati senza pagina di Adyen e senza riscrivere l'IBAN; i comandi sono spenti finché non c'è un abbonamento selezionato. Un metodo che è già quello di tutti gli abbonamenti scelti dice «È già quello che usano gli abbonamenti scelti» e non si offre. L'esito è la schermata di prima («Il metodo di pagamento è stato salvato così»); per un conto dice «il conto che finisce con…», per una carta no.
- **Al ritorno dalla carta con più carte valide** (`RitornoCarta`, stato `scegli`): «Quale carta vuoi usare?», con le carte; sceglie la persona e si collega ai contratti che aveva scelto prima di partire. «Non cambiare niente» torna indietro.
- **Le ultime quattro cifre ovunque** (`ultimeCifre` in `lib/metodoPagamento.ts`): PerfectGym scrive «**** **** **** 1587», e `MetodoAttualeBadge` mostrava «•••• ************1587». Ora «•••• 1587».
- `tsc` a 43 errori (la base), nessuno nei file toccati. **Non guardato in un browser né su un telefono.** Pubblicare prima le funzioni (APP-ATHLON, `perfectgym-metodo-pagamento` e `portale-link`), poi l'app: con la funzione di prima l'elenco non compare e la scelta è quella di sempre.

