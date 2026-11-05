## Go-live: la memoria del laboratorio ha una freschezza, e le sezioni della Home non rileggono a ogni apertura (05/11/2026)

Quarto giro di preparazione al lancio (dopo le sezioni 133, 134 e 136). La memoria del laboratorio (`src/features/lab/memoria.ts`)
tiene l'ultimo valore buono di ogni lettura, ma `prendi` lo **richiedeva sempre**: le sezioni della Home che si rimontano a ogni
apertura (Documenti, Prodotti, Tesseramento, i contratti, la mia area, l'anagrafica nel Profilo, i movimenti) chiamavano la loro
funzione anche se l'avevano letta dieci secondi prima. Con tremila persone che aprono l'app il primo giorno sono invocazioni e
connessioni al database per dati che non cambiano in un minuto.

- **`FRESCHEZZA`** in `memoria.ts`: per chiave, quanti millisecondi un valore vale senza richiederlo. `area` e `abbonamenti:contratti`
  2 minuti, `pagamenti:movimenti` 2, `documenti:elenco`, `prodotti:elenco` e `tesseramenti:elenco` 5, `anagrafica` 30 (il link della foto
  e' firmato e dura un'ora: mezz'ora lo tiene sempre valido). Una chiave assente dalla tabella si richiede sempre, com'era prima;
  `prendi(chiave, carica, { freschezzaMs })` vince sulla tabella (`0` = richiedi sempre).
- **Il valore scritto da `ricorda` conta come fresco**, un `ricorda(chiave, undefined)` (il modo di invalidare del Percorso e del
  Personal) no. `scorda` toglie anche l'orario.
- **Chi scrive invalida gia'** (`scorda('area')`, `scorda(CHIAVE_CONTRATTI)`… dopo un pagamento, un abbonamento, un figlio aggiunto),
  quindi dopo una scrittura si rilegge comunque. Tre buchi chiusi perche' la freschezza li avrebbe scoperti: il certificato caricato
  (`CaricaCertificato.tsx`) scorda `area` prima di far rileggere la Home; l'ordine dello shop pagato (`EsitoOrdine.tsx`) scorda
  `prodotti:elenco`; la firma di un abbonamento (`Abbonamento.tsx`) scorda `documenti:elenco`, perche' il contratto e' un documento nuovo.
- **Resta solo in memoria**, mai sul disco: la scelta del 14/10/2026 (dati personali, spariscono all'uscita) non cambia. La freschezza
  risparmia le riletture dentro la stessa sessione, non il primo caricamento.

Per verificare: `npx tsc --noEmit` pulito (restano solo gli errori preesistenti di `docs/` e `scripts/`). **Non provato** in un
browser o su un telefono: aprire Home → Documenti due volte di fila deve chiamare `portale-lab-documenti` una volta sola.
