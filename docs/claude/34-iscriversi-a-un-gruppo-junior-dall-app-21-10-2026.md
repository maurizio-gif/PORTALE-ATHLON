## Iscriversi a un gruppo Junior dall'app (21/10/2026)

Dalla sezione Junior, toccando un gruppo con posti si sceglie chi del nucleo iscrivere (`chiPuoIscriversi` in `junior/comune.ts`: idoneo, anno di nascita nel gruppo, minorenne o titolare, non già dentro, gruppo non completo) e si apre `/iscrizione?group=&membro=` (`junior/Iscrizione.tsx`). Due passi: **Costi** (parte sempre subito, nessuna scelta della data; riepilogo col pro-rata di PerfectGym) e **Dati e firma** (dati, contratto, consensi, firma). Funzione: `portale-abbonamento`, azioni `junior_anteprima` e `junior_firma` (APP-ATHLON). Dopo la firma si torna a `/abbonamento`, che riprende dal pagamento (stesso percorso degli adulti).

- **Solo abbonamento mensile**: i piani «con Preiscrizione» e «Stagionale» sono fuori. Tutti i gruppi sono aperti (anche Agonistico e Pallanuoto: la prova di inserimento non viene chiesta da qui, scelta di Maurizio).
- **Consensi: 20, 29, 32, 23, 1** (il 29 con il testo degli adulti, non il 28; niente 37 e 36). Le voci arrivano dal catalogo del sito (`junior` in `/contratto-abbonamento.json`).
- **Vista cliente**: si vede, non si firma.
- **Minorenne**: indirizzo e cellulare sono quelli del genitore (la carta del bambino chiede solo il codice fiscale: `senzaRecapiti` di `CorreggiDati`), l'email non si chiede.
- **Non provato**: `EnrollMemberToGroup` vero, nomi dei parametri di `GetEnrollmentOptions`/`CalculateProrata`, primo addebito su PerfectGym. Il browser è stato provato con funzioni simulate (390 e 1280 px). **Pubblicare in ordine**: sito, `portale-abbonamento`, app.

