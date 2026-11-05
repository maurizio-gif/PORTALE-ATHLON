## I Termini di Novembre 2026: la sezione 9 del PT ricopiata, nessun altro cambio nell'app (05/11/2026)

Richiesta di Maurizio. I Termini e Condizioni del sito (SITO-ATHLON, `src/data/termini.json`, versione «Novembre 2026») sono stati riscritti perché ogni procedura sia quella dell'app:

- disdetta e sospensione da «Gestisci abbonamento»;
- disdetta dei corsi dei bambini da Junior;
- inabilità, badge smarrito, infortunio e tesseramento da «Richiedi assistenza › Scrivi al team»;
- recesso fuori dalla disdetta ordinaria via PEC;
- 2.2.3 «Eliminazione dell'account»;
- sezione 12, «Guest Pass e Invita i tuoi amici».

**La casella `disdetta@athlonroma.it` non esiste più.**

- **Qui è cambiata solo la copia della sezione 9** (`src/features/lab/personal/termini.ts`, l'estratto nel foglio del PT): la 9.3 ora dice che la disdetta si chiede «con una richiesta dall’app Athlon Club (Richiedi assistenza › Scrivi al team)», perché «Gestisci abbonamento» esclude gli abbonamenti aggiuntivi. Versione «Novembre 2026». Il controllo fatto: ogni clausola della 9 è uguale, alla lettera, a quella del sito.
- **Se un giorno il PT si potrà disdire da «Gestisci abbonamento»**, si cambia la 9.3 sul sito e la si ricopia qui.
- **I contratti in PDF** prendono le clausole dal sito; la scheda di sintesi sta in APP-ATHLON (sezione 144 del suo `CLAUDE.md`).
- `tsc` non girato: il cambio è solo una stringa e una costante.
