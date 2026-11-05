## «Entra» con la destinazione `assistenza`: la Home con l'assistente aperto, per l'iscritto che scrive nella chat del sito (05/11/2026)

Decisione di Maurizio: un iscritto che apre la chat del sito non chatta lì. Il sito gli manda il link che apre l'app già dentro (APP-ATHLON e SITO-ATHLON, `CLAUDE.md`, stessa data), e l'assistente dell'app, che conosce abbonamenti, pagamenti e prenotazioni, risponde da lì.

- **`entra/destinazioni.ts`**: la voce `assistenza` porta a `/` con `assistenza=1`. Ignora categoria, giorno, piano e bambino. I testi della schermata sono «La tua area riservata» e «Entra e scrivimi». La stessa chiave sta nella lista chiusa del server (`_shared/accesso-sito.ts`).
- **`AreaRiservata.tsx`** legge `assistenza` e apre l'assistente con `apriAssistente('home')`. Riprova per qualche secondo, perché la Home deve aver finito di disegnarsi, poi toglie il parametro dall'indirizzo: tornando indietro l'assistente non si riapre.
- **Provato**: `scripts/prova-entra.ts` (20 prove, una nuova) e `tsc` senza errori nuovi. **Non provato**: l'apertura vera dal link dell'email, su web e sulle app installate.
