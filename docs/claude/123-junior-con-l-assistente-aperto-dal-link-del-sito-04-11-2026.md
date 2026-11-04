## Il link del sito apre Junior con l'assistente: la registrazione di un figlio continua nell'app (04/11/2026)

Richiesta di Maurizio. Il genitore che registra il figlio dal sito (la chat per la Scuola Nuoto Bambini, «Contattaci» per il Baby Nuoto e la Scuola Nuoto) riceve un'email con il link `https://app.athlonroma.it/entra?d=junior#th=…` al posto delle istruzioni per il portale di PerfectGym. Lato server: `CLAUDE.md` di APP-ATHLON, «Registrazione Junior dal sito».

- **`junior` è la quinta destinazione** di `features/entra/destinazioni.ts`: porta a `/junior?assistenza=1`, «Iscrivi tuo figlio» / «Apri la sezione Junior». Come le altre, ignora categoria e giorno (`scripts/prova-entra.ts`).
- **`?assistenza=1` apre da sola la chat dell'assistente** (`junior/Junior.tsx`, `apriAssistente('junior')`), una volta, quando la sezione ha letto il nucleo: è la chat che prende il posto di quella del sito. Poi il parametro si toglie (`router.setParams`), così tornando o ricaricando non si riapre. Il pulsante dell'assistente sta nel layout e può registrarsi un attimo dopo: dieci tentativi a 300 ms, poi resta «Richiedi assistenza» in alto. Mai in vista cliente.
- **Il figlio c'è già** quando il genitore entra: la funzione che lo crea lo rilegge nel mirror prima di mandare il link. Chi è nuovo passa prima da «Completa il profilo», e il layout lascia la pagina chiesta (`/junior?assistenza=1`) dov'è.
- **Provato**: `tsc` senza errori nuovi in `src/`, `scripts/prova-entra.ts` (17 prove). **Non provato**: in un browser o su un telefono, con l'email vera.
