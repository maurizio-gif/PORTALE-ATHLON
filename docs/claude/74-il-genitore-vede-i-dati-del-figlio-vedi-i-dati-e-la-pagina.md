## Il genitore vede i dati del figlio: «Vedi i dati» e la pagina `/dati-figlio/<id>` (02/11/2026)

Richiesta di Maurizio (02/11/2026): «fai vedere i dati al genitore». Funzione `portale-lab-consensi-minori`, azione `dati`: `CLAUDE.md` di APP-ATHLON, stessa data (da pubblicare prima dell'app: e' gia' pubblicata, v2).

- **Dove**: nella pagina dei consensi (`ConsensiMinori.tsx`), su ogni figlio con almeno un consenso attivo, il pulsante **«Vedi i dati»** porta a `/dati-figlio/<member_id>` (`DatiFiglio.tsx`, rotta `dati-figlio/[figlio].tsx`, in `_layout.tsx` come le altre). API: `datiFiglio` in `src/api/consensiMinori.ts`.
- **Cosa si vede**: una sezione per area (Food, Recover, il corpo, i piani con l'AI). Con il consenso attivo i dati dell'area (diario degli ultimi 30 giorni raggruppato per giorno con le kcal, sonno e recupero con gli allenamenti, le misure, i piani con titolo e obiettivo); senza consenso una riga dice «Consenso non dato» o «Da rinnovare» e basta. **Solo lettura**: nessun pulsante scrive o cancella (togliere un consenso resta nella pagina dei consensi).
- **Chi decide**: la funzione ricontrolla tutto a ogni lettura (il figlio e' del titolare, l'eta', il consenso). L'app non si fida del suo stato. In vista cliente la pagina dice che i dati li vede solo il genitore e non chiama la funzione.
- **Provato**: `npx tsc --noEmit` senza errori nuovi (46 di base). **Non guardata renderizzata** (390 e 1280 px, chiaro e scuro), ne' in inglese, ne' con dati veri di un figlio.
