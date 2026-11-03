## Il controllo dei dati all'accesso: «Aggiungi il tuo cellulare» in «Da fare» (04/11/2026)

Richiesta di Maurizio. Lato server (`portale-lab-anagrafica`, azione `controllo`): `CLAUDE.md` di APP-ATHLON, sezione «Il controllo dei dati all'accesso».

- **Quando**: una volta per persona a ogni apertura dell'app, quando la Home mostra «Da fare» (`useControlloDati` in `home/DaFare.tsx`, `controlloDati()` in `api/lab.ts`). Non in vista cliente e non sul totem (`vistaCorrente()`, `inModalitaTotem()`).
- **Cosa si vede**: solo il cellulare. Manca → «Aggiungi il tuo cellulare»; c'e' ma non e' un cellulare (un fisso, un numero troncato) → «Controlla il tuo cellulare». La riga porta al Profilo, dove il numero si cambia. Urgenza 2: sta sotto pagamenti, metodo di pagamento e certificato.
- **Cosa non si vede**: la data di nascita mancante e la scheda doppia. La persona non li sistema da sola (la data non si cambia dall'app, il doppione non e' una sua colpa): la funzione apre un compito in Agenda per la segreteria e all'app non dice niente.
- **Non solleva mai**: se la funzione non risponde (non ancora pubblicata, rete) `controlloDati()` torna vuoto e la Home e' quella di prima. `tsc` pulito; **non guardato in un browser né su un telefono**.
