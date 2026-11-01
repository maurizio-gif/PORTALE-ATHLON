## L'Abbonamento PT: le regole del mese nel foglio, e la sezione 9 dei Termini

Il foglio d'acquisto dell'abbonamento PT (`FoglioCompra` in `src/features/lab/Personal.tsx`, 21/10/2026, richiesta di Maurizio) dice prima di pagare che **le sedute si caricano il
giorno 1 e vanno usate entro la fine del mese solare**, e che **a mese iniziato la quota si paga per intero e le sedute si caricano tutte subito**, da usare entro la fine del mese in corso
(la data la calcola `fineMeseRoma`). Sotto la casella dei consensi c'è l'**estratto espandibile della sezione 9 dei Termini e Condizioni** (`EstrattoTermini`), chiuso di partenza.
**Non c'è il pro-rata: l'importo è fisso, qualunque sia il giorno di partenza** (Maurizio, 21/10/2026), e il foglio non dice più che «l'importo esatto lo calcola PerfectGym». Il file dei Termini allegato su PerfectGym **non si apre più da qui** (richiesta di Maurizio, 21/10/2026): resta solo l'estratto. Il testo è **copiato alla lettera** in `src/features/lab/personal/termini.ts` da `src/data/termini.json` del sito (SITO-ATHLON, versione Aprile 2026): è testo di contratto, non si
riscrive; se il sito cambia la sezione 9, si ricopia da lì. Non si legge dal sito a ogni apertura perché il catalogo pubblico (`/contratto-abbonamento.json`) ha solo le sezioni 1, 2, 3 e 7.

