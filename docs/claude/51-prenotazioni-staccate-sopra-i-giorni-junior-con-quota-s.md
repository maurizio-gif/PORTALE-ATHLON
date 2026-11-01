## Prenotazioni staccate sopra i giorni; Junior con quota scaduta; Direttore Tecnico: si vede, si sposta, si annulla (24/10/2026)

Richieste di Maurizio. In produzione dal 24/10/2026 (PORTALE-ATHLON #132 e #133, con le funzioni di APP-ATHLON #441). Lato server: `CLAUDE.md` di APP-ATHLON, stessa data.

- **Calendario, «Le tue prenotazioni»** (`Calendario.tsx`, `LezioniPrenotate`): un blocco sopra la striscia dei giorni con **tutte** le prenotazioni attive, a prescindere dal giorno scelto (`Giorno.prenotate`, `Prenotata` in `api/lab.ts`), ognuna con «Annulla». Dopo prenota o disdici si aggiorna dalla risposta. Con una funzione che non manda `prenotate` si ripiega sulle lezioni prenotate del giorno.
- **Junior, quota scaduta** (`junior/Corsi.tsx`, `inDebito` = `sospese > 0` o `sospese_dal`): niente «Disdici» sulle lezioni, un riquadro spiega che finché la quota non è pagata non si può disdire, e sparisce la riga «Puoi disdire fino a un'ora prima». La funzione rifiuta comunque con 409: l'app nasconde il comando per non offrirne uno che non risponde.
- **Direttore Tecnico, «Il tuo appuntamento / I tuoi appuntamenti»** (`junior/DirettoreTecnico.tsx`, `CartaAppuntamento`; `appuntamentiDirettoreTecnico`, `spostaDirettoreTecnico`, `annullaDirettoreTecnico` in `api/junior.ts`): appena prenotato l'appuntamento compare in elenco (dalla risposta, con l'`id` che la funzione ora manda, poi rilettura) con il giorno, l'ora, il motivo e **«Sposta»** (giorni e orari liberi, **compreso quello che si sta lasciando**; se qualcuno prende l'orario scelto si rilegge e lo si dice) e **«Annulla»** (con conferma). In vista cliente l'elenco si vede e i comandi no. Il pulsante per prenderne un altro dice «Fissa un'altra telefonata».
- **Il motivo è obbligatorio e si vede**: etichetta «(obbligatorio)», avviso finché è vuoto, pulsante spento. Il controllo vero sta nella funzione.
- **Da pubblicare in quest'ordine** (fatto così): CRM, funzioni, app. Un'app nuova con la funzione vecchia non ha `dt_mie` e mostra solo la conferma.
- **Provato**: `tsc` sui file toccati. **Non guardato in un browser né su un telefono**, e non provato con una sessione vera.

