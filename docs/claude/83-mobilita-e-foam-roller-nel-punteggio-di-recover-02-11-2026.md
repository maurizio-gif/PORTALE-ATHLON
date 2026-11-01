## Mobilità e foam roller nel punteggio di Recover: una quota piccola, che non spinge (02/11/2026)

Richiesta di Maurizio: «metterei anche il foam roller (senza spingere a utilizzarlo troppo)». Le sessioni di mobilità (`fit/SessioneMobilita.tsx`) e di foam roller (`rilascio/`) entrano
nel pilastro Recover dell'Athlon Health Score e dei livelli. **I minuti li registra il server** (APP-ATHLON, sezione 89 del suo `docs/claude/`), il calcolo lo fa l'app.

- **La regola** (`calcoloPunteggio.ts`, `quotaRecover`): quota della settimana = `min(1, sonno/5 + 0,2 × min(1, giorniCura/3))`. Un **giorno di cura vale con almeno 10 minuti** di sessioni
  (mobilità e rullo insieme: due sessioni lo stesso giorno valgono una volta), **3 giorni su 7 bastano**. Costanti: `CURA_MINUTI_GIORNO`, `CURA_GIORNI`, `CURA_QUOTA`.
- **Non spinge, e non toglie**: il massimo della cura è il 20% di Recover (**3 punti su 15**); **non cambia nulla a chi dorme come serve** (il sonno da solo arriva a 15); più minuti o più giorni
  del necessario **non danno niente**; i punti **non scendono mai** per la cura. Per chi non ha dati sul sonno è una strada, piccola. Provato in `scripts/prova-recover-cura.ts` (15 gruppi, due
  mutazioni scoperte: tolto il tetto dei 3 giorni, e cura sottratta invece che sommata): `LC_ALL=it_IT.UTF-8 npx tsx scripts/prova-recover-cura.ts`.
- **Chi comincia dalla cura** non è penalizzato dalle settimane prima: la storia parte dal primo giorno con sonno **o** cura (`calcolaRelax`, `primo`).
- **I livelli** usano la stessa regola per settimana (`puntiSettimana`, nuovo parametro `recupero`): i punti già registrati non tornano indietro, quindi niente si perde.
- **Dove arrivano i minuti**: `DatiDispositivi.recupero` (`api/dispositivi.ts`: `[{ data, mobilita, rilascio }]`, un giorno per riga, gli stessi 30 giorni del sonno), letto da `usePunteggio` e `useLivelli`.
  Una funzione di prima non lo manda: la cura vale zero e il punteggio è quello di sempre. `dei()` lo deve copiare (prima ignorava i campi che non conosceva).
- **A fine sessione** (`fit/RegistraRecupero.tsx`, usato dalle schermate di fine di mobilità e foam roller): `aggiungiRecupero(tipo, minuti)`, **una volta per sessione**, solo con il consenso a Recover e fuori
  dalla vista cliente. **Indipendente dall'abitudine «Mobilità»** (non serve seguirla). Se non riesce: un messaggio dolce e «Riprova a registrarla» (con la funzione di prima: «La registrazione delle sessioni
  non è ancora attiva»); la sessione è fatta lo stesso. Dopo: «Sessione registrata in Recover.», **senza dire quanti punti dà**.
- **Testi**: le regole del punteggio (`RegoleSpiegate` in `Punteggio.tsx`) dicono la cura in due righe, il pilastro si legge «sonno e cura del corpo», la frase di Recover aggiunge «N giorni di mobilità o foam roller».
- **Minuti dichiarati, non verificati** (come il sonno scritto a mano): per questo la quota è piccola. **Le soglie (10 minuti, 3 giorni, 20%) sono nostre e vanno fatte validare dal Direttore Tecnico.**
- **Da far rileggere al consulente privacy**: le sessioni sono dati sulla salute sotto il consenso di Recover (le cancellano la revoca e l'eliminazione dell'account), ma **l'informativa dei dispositivi non le nomina**
  (nemmeno i minuti di mobilità delle abitudini). Non ho cambiato `VERSIONE_INFORMATIVA` (lo farebbe riaccettare a tutti): è una scelta del club.
- **Pubblicare nell'ordine**: la migrazione `20261102d` e `portale-lab-dispositivi` di APP-ATHLON **prima**, poi l'app. L'app non si rompe se la funzione è ancora quella di prima.
- **Non provato**: con una sessione vera e con la funzione pubblicata (la scrittura e la lettura del campo `recupero` sono provate solo come codice e con prove pure); le due schermate di fine nel browser con dati veri.
