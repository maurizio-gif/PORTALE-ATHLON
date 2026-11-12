## «Scegli l'abbonamento» all'iscrizione a un gruppo Junior, quando il gruppo si vende con più di uno (12/11/2026)

Maurizio (12/11/2026): un gruppo si vende con uno o più abbonamenti, scelti nell'Editor Gruppi del CRM, e il genitore sceglie fra questi; chi è già iscritto tiene il suo. Il lato server è nella sezione 246 del `CLAUDE.md` di APP-ATHLON.

- `junior/Iscrizione.tsx`: se l'anteprima porta `piani_disponibili` con più di un abbonamento, sopra «Il tuo piano di pagamento» compare **«Scegli l'abbonamento»**: una carta per abbonamento (nome, quota al mese, attivazione, quanto si paga oggi), quella scelta col bordo arancio. Toccarne un'altra rifà l'anteprima con `piano_id` (costi, documento e impronta cambiano), e la firma manda lo stesso `piano_id`. Il piano scelto sta in uno stato e in un ref, così `carica` non cambia.
- `api/abbonamento.ts`: `piano_id` in `SceltaIscrizione`, `piani_disponibili` in `AnteprimaIscrizione` (tipo `PianoDisponibile`).
- **Con un abbonamento solo (oggi) non cambia niente**: il server non manda la lista e la schermata è quella di prima. Con la funzione vecchia la lista non arriva.
- **L'istruttore dei corsi bambini non arriva più all'app** (nemmeno nella risposta dei recuperi, dove c'era «Scuola Nuoto Federale» ma nessuna schermata lo mostrava): lo toglie il database, nessun cambio qui.

`tsc` pulito su `src/`. **Non provato** su un telefono né in un browser. Serve un'OTA, dopo la funzione `portale-abbonamento`.
