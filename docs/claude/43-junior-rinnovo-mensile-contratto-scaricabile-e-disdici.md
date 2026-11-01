## Junior: rinnovo mensile, contratto scaricabile e Disdici (22/10/2026)

Richiesta di Maurizio. File: `junior/Corsi.tsx` (`DisdiciAbbonamento`), `junior/PagamentiContratto.tsx`, `junior/comune.ts` (`disdettaVera`, `rinnovoJunior`, `fineDisdettaMensile`), `api/junior.ts`
(`disdiciCorso`), `api/documenti.ts` (`apriFilePgm`). Lato server: `CLAUDE.md` di APP-ATHLON, stessa data.

- **Rinnovo**: «Abbonamento mensile: si rinnova automaticamente ogni mese, salvo disdetta». Via «Disdetto il … finisce il 20 giugno» e «Pagato fino al»: era la «disdetta» che PerfectGym mette su ogni
  iscrizione a un corso, con la fine del corso. Una disdetta vera finisce l'ultimo giorno di un mese (`disdettaVera`), e allora la riga dice «Disdetto: finisce il …».
- **Il contratto si scarica**: quello firmato dall'app (`firmato`) o quello firmato al desk che PerfectGym conserva fra i file (`documento_pgm`). Se PerfectGym non l'ha ancora creato **non c'è nessuna
  scritta** (non più «chiedilo alla segreteria»): il pulsante compare quando il file c'è.
- **«Disdici l'abbonamento»** sotto il contratto (mai in vista cliente): un foglio dice quando finisce con la regola dei 10 giorni (il 22/10: il 30 novembre), che fino ad allora le lezioni restano e le quote
  sono dovute, e che dopo il posto si libera e i recuperi non usati si perdono. Poi `disdici_corso` su PerfectGym; la data la decide la funzione.
- Provato: `tsc` pulito; in Chromium (bundle web, funzioni simulate, 390 px chiaro e 1280 px scuro): rinnovo mensile, nessun «Disdetto il» né «Pagato fino al», il PDF che apre il file del desk, il foglio
  col 30 novembre, la richiesta con member e contratto giusti, «Disdetta registrata» e la riga «Disdetto: finisce il 30 novembre», niente Disdici in vista cliente, nessuno scorrimento orizzontale.
  **Non provato**: le funzioni vere e PerfectGym.


