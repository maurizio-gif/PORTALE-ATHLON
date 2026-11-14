## La sospensione in corso o programmata nella scheda dell'abbonamento, e il pagamento della sospensione chiamato col suo nome (14/11/2026)

Richiesta di Maurizio (14/11/2026), su una cliente che aveva appena pagato i 15 € della sospensione di dicembre: la scheda dell'abbonamento non diceva niente della sospensione, e il pagamento compariva come «Corso ! Premium - Annuale (Soluzione Unica) | Rinnovo Automatico».

- **Nella scheda dell'abbonamento** (`AbbonamentiMiei.tsx`, componente `Sospensioni`): sotto le etichette, un riquadro per ogni sospensione attiva che finisce da oggi in poi. «Sospensione programmata · Abbonamento sospeso dicembre 2026 (sospensione a pagamento). Riprende il 1 gen 2027.», oppure «Sospensione in corso · Abbonamento sospeso fino al …». Durante la sospensione l'etichetta in alto dice «Sospeso». Il mese intero si scrive come mese, se no «dal … al …». Le chiusure del club non ci sono.
- I dati vengono da `sospensioni` dell'azione `contratti` di `portale-abbonamento` (APP-ATHLON, sezione 298): `{ dal, al, tipo, in_corso }`. Con la funzione di prima il campo non c'è e la scheda resta com'era.
- **Il pagamento**: il titolo «Sospensione dell'abbonamento Premium - Annuale (Soluzione Unica) · dicembre 2026» lo scrive il server (vista `pagamenti_nativi_corsi`, migrazione `20261114u` di APP-ATHLON); l'app non cambia. Stessa migrazione: la ricevuta in PDF scrive il mese sospeso.
- `tsc` pulito su `src/`; **non guardato in un browser né su un telefono**.
