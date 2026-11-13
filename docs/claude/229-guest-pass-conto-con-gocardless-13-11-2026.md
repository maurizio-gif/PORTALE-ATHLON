## Guest Pass: il conto corrente si autorizza su GoCardless, senza modulo IBAN (13/11/2026)

Corregge la nota 228 dello stesso giorno: Maurizio ha chiesto «anche GoCardless, come per gli abbonamenti» (APP-ATHLON, nota 278). `solo_carta` non esiste più: la risposta `pagina` porta `conto_gocardless` quando il pass nasce sul nostro motore.

In `AttivaGuestPass.tsx`, con `conto_gocardless`:
- la scheda «Conto corrente (addebito SEPA)» resta, ma al posto del modulo dell'IBAN c'è una nota: alla conferma si apre la pagina protetta di GoCardless (l'indirizzo arriva in `url`, come per la carta);
- al ritorno (`?pagato=1`) `pagamento_esito` può rispondere `addebito: true`: «Conto autorizzato: i … € saranno addebitati sul tuo conto. Il tuo Guest Pass è attivo.»;
- nella schermata «da pagare» la sezione «Oppure: addebito su conto» è un pulsante («Paga … € con il conto corrente», `ripaga({ conto: true })`) e non il modulo.
Con l'interruttore spento la pagina è quella di sempre, modulo dell'IBAN compreso.

Il campo della password non compare più per nessuno: il server manda `password.obbligatoria` falso (decisione «toglila»); la schermata non è cambiata per questo.

`tsc` pulito sui file del pass; **non guardato in un browser né su un telefono**, e il ritorno da GoCardless nell'app nativa non è provato.
