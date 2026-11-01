## I dati dell'app arrivano da Supabase, non da PerfectGym

**L'app non parla mai con PerfectGym.** Chiama le Edge Function `portale-*` di Supabase (`src/api/lab.ts`
e gli altri file di `src/api/`), che leggono dal mirror: PerfectGym si sincronizza nello schema `perfectgym`
del database e le funzioni leggono da lì. Una schermata che mostra un dato nuovo ha quindi bisogno di una
**azione nuova in una funzione esistente** (o di una funzione SQL nuova che la funzione legge), mai di una
chiamata diretta al gestionale. Esempio: la sezione Prodotti usa l'azione `prodotti` di
`portale-lab-pagamenti`, che chiama `prodotti_di` sul database.

- **La stessa funzione serve il CRM e l'app.** I conti di una persona (abbonamenti, prodotti, prenotazioni,
  pagamenti) li calcola una funzione SQL sola, e il CRM e l'app la leggono entrambi: se divergono, è un
  difetto. Le funzioni e la regola completa stanno nel `CLAUDE.md` di APP-ATHLON.
- **Scrivere è un'altra cosa.** Prenotare, disdire, pagare passano da una Edge Function che chiama PerfectGym:
  è l'unico caso in cui il portale lo tocca, e dopo la scrittura la funzione rilegge da PerfectGym per
  confermare, perché il mirror arriva con qualche secondo di ritardo.
- **Dopo una scrittura la schermata si aggiorna dalla risposta della funzione** o con una nuova lettura
  dopo qualche secondo, non si aspetta che il mirror sia già allineato.
- **Quello che PerfectGym non dice** (da quale dispositivo si è prenotato, per esempio) lo registra la
  nostra funzione nel suo log; la schermata non lo deduce.
- **Il Calendario ha un gemello nel CRM: il Planning** (20/10/2026, funzione `crm-planning` di APP-ATHLON): le stesse lezioni, lo stesso filtro per età, la stessa apertura delle
  prenotazioni e gli stessi limiti per categoria, ma a prenotare (e a disdire, con `CancelSingleBooking` e le regole di PerfectGym per la disdetta in ritardo) è l'operatore, a nome del cliente, e da lì non si incassa. **Non condivide il codice con
  `portale-lab-calendario`** (la funzione dell'app non è stata toccata): se qui cambia la lettura del giorno, il filtro d'età, l'apertura o i limiti, va cambiato anche in
  `_shared/planning-crm.ts` di APP-ATHLON. Il Calendario resta quello che il socio vede: il Planning non cambia niente nell'app.
- **I filtri per attività sono tessere** (20/10/2026, richiesta dei tester: «non si vedono»; proposta B scelta da Maurizio): sotto «Cosa vuoi fare?» ogni attività del giorno ha la sua tessera con icona, nome e numero di lezioni, tutte in vista (niente fila da scorrere). Quella scelta diventa arancione, e toccarla di nuovo toglie il filtro; «Tutte» lo toglie sempre. Icona e colore vengono da `segnoAttivita` in `Calendario.tsx` (dal nome: acqua e nuoto in blu, sala e corsi in arancio, il resto neutro): un'attività nuova del listino prende l'icona del calendario finché non si sceglie. Cambia solo il filtro: lezioni, Gym Floor e Nuoto Libero a griglia, regole sono quelli di prima. `tsc` pulito; **non guardato in un browser né su un telefono**.

