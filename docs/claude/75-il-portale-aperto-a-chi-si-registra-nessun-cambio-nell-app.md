## Il portale aperto a chi si registra: nessun cambio nell'app (02/11/2026)

Richiesta di Maurizio (02/11/2026): registrazione e login liberi. **L'app non cambia**: l'interruttore `portale_registrazione` è acceso e il gate nel layout (`useIngresso`) fa passare tutti da `portale-registrazione`. Regole, tabella `portale_iscritti` e freno di emergenza: `CLAUDE.md` di APP-ATHLON, stessa data.

- **Chi non è fra i tester ora entra**: email → codice → (se serve) «Completa il profilo» → dentro. Gli iscritti **non sono tester**: non compaiono nella pagina Tester app del CRM e non ricevono le notifiche e la newsletter «solo ai tester».
- **Testi che parlano ancora ai tester** (da rivedere se non vanno bene per tutti): la carta del feedback in Home dice «Sei un tester? …» (`home/CartaFeedback.tsx`) ed è visibile a chiunque entri; il messaggio di rifiuto di `lab.ts` cita i tester solo per chi non è ammesso.
- **Non guardato in un browser né su un telefono** con un utente non tester.
