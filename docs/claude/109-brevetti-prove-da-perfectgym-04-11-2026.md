## Brevetti: le prove di ogni livello sono le abilità di PerfectGym (04/11/2026)

Richiesta di Maurizio (03/11/2026): dopo i primi test del direttore tecnico («le prove inserite nei livelli non sono corrette», «le hai mischiate») ha mandato la **stampa della schermata «Livelli e abilità» di PerfectGym** e ha detto di prendere le prove da lì («il PDF del libretto era un po' incasinato»). Il lato database e il perché stanno nel `CLAUDE.md` di APP-ATHLON, sezione «Le prove di ogni livello sono le abilità di PerfectGym…».

**Cosa cambia nell'app**: in `junior/datiBrevetti.ts` le **prove** (`prove:`) dei dodici livelli sono le 57 abilità di PerfectGym, **con lo stesso testo e nello stesso ordine** (A1 4, A2 5, A3 6, M1 6, M2 5, M3 5, B1 5, B2 4, B3 5, B4 4, B5 5, B6 3; prima erano 54). L'inglese è una traduzione. **Il programma** («Cosa si impara») **non cambia**: resta quello del libretto. Tutto il resto segue da solo: il viaggio, la carta «Brevetto in corso», il diploma («Prove superate») e il PDF del libretto leggono `l.prove()`, e il numero di prove spuntate viene dal database (`prossimo.totale`).

**Le due liste devono combaciare**: le spunte stanno nel database per (livello, ordine) e il testo lo prende ciascuno dalla sua parte (il CRM dal database, qui dal file). La migrazione `20261104d` cambia il database con la stessa lista e **sposta le spunte già fatte sulla prova giusta**. Se il club cambia le abilità in PerfectGym si cambia qui e lì insieme.

**Rilascio**: prima questo (web subito), poi la migrazione, poi il CRM, come per l'ordine dei brevetti. **Una versione nativa vecchia dell'app** (non aggiornata dalle store) mostrerebbe le spunte di un bambino sulle prove sbagliate: finché non ci sono spunte non cambia niente.

**Provato**: `tsc` pulito sul `src/`; le liste del file sono confrontate in automatico con il catalogo ricavato dalla stampa (57 su 57, italiano e inglese). **Non guardato in un browser né su un telefono**: la pagina del viaggio con A3 a sei prove, il diploma con sei prove.
