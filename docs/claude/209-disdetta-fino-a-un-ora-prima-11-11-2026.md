## Si disdice una lezione fino a un'ora prima: al posto di «Disdici» la spiegazione, solo adulti e Baby Nuoto (11/11/2026)

**Richiesta di Maurizio.** La regola la applica `portale-lab-calendario` (vedi `CLAUDE.md` di APP-ATHLON, sezione «Si disdice una lezione fino a un'ora prima dell'inizio»). L'app non offre un pulsante che verrebbe rifiutato:

- **`AzioniLezione`** (Calendario, Junior, Consigli, Percorso, la proposta dalla chat): con una prenotazione a meno di 60 minuti dall'inizio, al posto di «Disdici» compare il messaggio «Si può disdire fino a 60 minuti prima dell'inizio: questa lezione non si può più disdire.».
- **«Le tue prenotazioni»** sopra i giorni: al posto di «Annulla» c'è la scritta «Non più disdicibile».
- **Solo attività adulti e Baby Nuoto** (`conLimiteDisdetta`, stesso confine di `eJunior` del server): Scuola Nuoto Bambini, recuperi e le altre attività junior mostrano «Disdici» come prima.
- **La lista d'attesa resta libera**: «Annulla» c'è fino all'inizio.
- `DISDETTA_MINUTI` e `fuoriTempoDisdetta` stanno in `Calendario.tsx`; il numero è lo stesso del server. Il calcolo si fa quando la schermata si disegna: un elenco aperto da prima dello scoccare dell'ora mostra il pulsante finché non si aggiorna, e in quel caso il server risponde con lo stesso messaggio.
- `tsc` pulito su `src/`; **non guardato in un browser né su un telefono**.
