## «Aggiungi un componente» chiede nome, cognome e data di nascita: niente codice fiscale (05/11/2026)

Richiesta di Maurizio: il codice fiscale del bambino non si chiede quando lo si aggiunge al nucleo, ma quando lo si iscrive a un corso. Quindi `FoglioComponente.tsx` (lo usano Junior e Famiglia) non ha più il campo, né il suo controllo (`problemaCodiceFiscale`). Il pulsante «Aggiungi» si accende con nome, cognome, data di nascita, la dichiarazione di genitore o tutore e, dai tre anni in su, le tre domande sul nuoto. Il sottotitolo dice «Nome e cognome per intero, come sul documento». `aggiungiComponente` (`src/api/junior.ts`) ha `codice_fiscale` facoltativo, e il modulo non lo manda.

- **Il codice fiscale arriva all'iscrizione**, e lì c'era già: se manca, `junior_anteprima` e `baby_anteprima` rispondono con i dati mancanti, e «Correggi i dati» si apre da solo sul bambino (`Iscrizione.tsx`, `IscrizioneFigli.tsx`). Non serve toccarli.
- Lato server (la funzione `portale-lab-junior` che accetta il figlio senza codice): `CLAUDE.md` di APP-ATHLON, «Aggiungi un componente senza codice fiscale».
- **Provato**: `tsc` senza errori nuovi in `src/`. **Non provato**: il foglio aperto su un telefono, un'aggiunta vera, e l'iscrizione dopo.
