## «Completa il profilo» con i dati già scritti, e «Sei già dei nostri» al posto della segreteria (05/11/2026)

Dal test di Valerio Palermo: dopo il pannello del sito (email, nome, cognome, cellulare) e il link per email, l'app gli richiedeva tutto da capo, e alla fine diceva «passa in segreteria» perché era già socio con un altro indirizzo. Lato server: `CLAUDE.md` di APP-ATHLON, «L'iscrizione dal sito semplificata».

- **`statoIngresso()`** legge `precompila` (nome, cognome, cellulare che il club ha già per quell'email), `useIngresso` lo passa alla fase `completa` e **`CompletaProfilo`** parte con quei campi già scritti: la persona li conferma (restano modificabili) e scrive solo la data di nascita.
- **`completaProfilo()`** legge `somiglianza`: quando la persona è già del club con un altro indirizzo, `CompletaProfilo` mostra «Sei già dei nostri» col messaggio della funzione (colleghiamo noi questo indirizzo e ti scriviamo qui) e il pulsante «Entra con l'altro indirizzo» (esce). Il resto del ramo segreteria (solo schede di minorenni) non cambia.
- Quando la segreteria collega l'indirizzo dal CRM, alla riapertura `stato` trova la scheda con quell'email e la persona entra senza schermate.
- **Provato**: `tsc` pulito su `src/`. **Non provato** nell'app: una registrazione vera con i campi già scritti.
