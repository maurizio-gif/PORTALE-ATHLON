## I recuperi della Scuola Nuoto Bambini: al completo niente lista d'attesa (04/11/2026)

Richiesta di Maurizio: nella sezione Junior, un recupero della Scuola Nuoto Bambini al completo **non offre «Lista d'attesa»**. Al posto del pulsante c'è un avviso: «Questo recupero è al completo, e per i recuperi non c'è la lista d'attesa: scegli un altro giorno o un altro orario.» Il blocco vero lo fa `portale-lab-calendario` (APP-ATHLON, `CLAUDE.md`, «I recuperi della Scuola Nuoto Bambini non hanno lista d'attesa»): rifiuta anche se la richiesta arrivasse, e annulla un'attesa nata perché il recupero si è riempito nel frattempo, con lo stesso messaggio.

- **`senzaListaAttesa(categoria)`** in `src/api/lab.ts`: vero per `Recuperi Scuola Nuoto Bambini`. È la copia della regola del server (`_shared/lezioni-prenotabili.ts` di APP-ATHLON): si cambiano insieme.
- **`AzioniLezione`** (`Calendario.tsx`, gli stessi pulsanti di Calendario, Consigli, Percorso e Junior): con la lezione piena e la categoria senza lista d'attesa mostra l'avviso invece del pulsante. Prima vengono, come sempre, «già prenotata» (Disdici), il limite della categoria e «Prenotabile da».
- **Le parole dei posti**: `postiDi(d, categoria)` dice solo «Completa» (non «Completa · lista d'attesa»), e `inAttesa()` non scrive «nessuno in lista d'attesa» su un recupero: farebbe sembrare la coda un'opzione.
- **Chi era già in lista d'attesa** su un recupero la vede ancora («In lista d'attesa», Disdici): non si toglie nessuno.
- **Le schede dell'Help Desk dell'app** (`articoli-app/snb/recuperi-lezioni` e `generali/prenotazioni` di SITO-ATHLON) dicono la stessa cosa, così l'assistente non la propone.
- **Provato**: `tsc` pulito su `src/`. **Non guardato in un browser né su un telefono**, e non provato con un recupero pieno vero.
