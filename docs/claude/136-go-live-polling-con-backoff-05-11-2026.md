## Go-live: i polling dei pagamenti e delle notifiche rallentano da soli (05/11/2026)

Seguito delle sezioni 133 e 134. Due giri dell'app chiamavano il server a intervallo fisso senza mai fermarsi né rallentare.

- **`Pagamenti.tsx`**: finché un addebito è «in corso» rileggeva ogni 5 secondi, senza fine. Un addebito SEPA resta in corso
  per giorni, quindi una schermata lasciata aperta chiamava `portale-lab-pagamenti elenco` dodici volte al minuto per sempre.
  Ora ogni 5 s per tre giri, poi 10, 20, 30 s, e si ferma dopo dieci minuti (il webhook di Adyen per la carta arriva in pochi
  secondi; per il SEPA non arriva comunque nella stessa seduta).
- **`notifiche/store.ts`**: dopo un errore del server o della rete il giro insisteva al minuto dopo come se niente fosse. Ora
  aspetta un minuto, poi due, quattro, otto, fino a dieci (`rinvia`), e torna al ritmo normale alla prima risposta buona. Con
  migliaia di app aperte, un server in difficoltà riceveva ogni minuto le stesse richieste da tutti nello stesso momento.
  Il 401/403/404/409 ferma il giro come prima.
- **Provato**: `tsc` pulito sui file toccati. **Non provato** su un telefono.
