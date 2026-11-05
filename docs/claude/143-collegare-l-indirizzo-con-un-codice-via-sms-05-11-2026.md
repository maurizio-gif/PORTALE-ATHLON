## «Sei già dei nostri»: collegare questo indirizzo con un codice via SMS (05/11/2026)

Quando la registrazione trova che la persona è già del club con un altro indirizzo, la schermata «Sei già dei nostri» (`CompletaProfilo.tsx`) può offrire il collegamento da sé. Succede solo se la funzione lo propone (`sms.finale` nella risposta di `completa`).

1. «Mandami il codice al ••65» (`inviaCodiceSms`, azione `sms_invia`). Il numero è quello della scheda del club, e se ne vedono solo le ultime due cifre.
2. Il campo del codice, sei cifre, con l'autocompletamento dagli SMS (`oneTimeCode`, `sms-otp`), e «Collega ed entra» (`verificaCodiceSms`, azione `sms_verifica`). Se il codice è giusto, l'indirizzo è collegato alla scheda e si entra (`onFatto`), senza aspettare la segreteria.
3. «Mandamelo di nuovo» e «Il numero non è più mio». Il secondo torna al messaggio di sempre, con «Entra con l'altro indirizzo»: resta la segreteria.

Senza `sms` nella risposta, quindi con l'interruttore `portale_collega_sms` spento, la schermata è quella di prima. Il lato server è nel `CLAUDE.md` di APP-ATHLON, «Collegare un indirizzo nuovo alla propria scheda con un codice via SMS».

- **Provato**: `tsc`, senza errori nuovi in `src/`.
- **Non provato**: la schermata in un browser o su un telefono, e un codice vero.
