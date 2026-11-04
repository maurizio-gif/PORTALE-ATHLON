## Il link del sito apre Junior già sul bambino appena registrato (04/11/2026)

Dopo la registrazione dal sito (Scuola Nuoto Bambini e Baby Nuoto), il link dell'email porta anche `f=<id del bambino>`. `/entra` lo legge (`idValido`: solo cifre, al massimo dieci) e `arrivoDa` lo passa alla sezione Junior come `figlio`, accanto a `assistenza=1`. `Junior.tsx` seleziona quel bambino (`setPersonaScelta`) **solo se è nel nucleo** di chi ha fatto l'accesso: altrimenti resta la scelta di sempre. Lì il genitore vede i turni ancora disponibili per l'anno del bambino con i prezzi, o le lezioni del Baby Nuoto da prenotare.

- `f` vale solo per `d=junior`. Lato server: `CLAUDE.md` di APP-ATHLON, «Chi c'è già? letto dal database».
- **Provato**: `scripts/prova-entra.ts` (con e senza `f`, `f` non numerico ignorato), `tsc` pulito. **Non provato**: l'app aperta dal link vero.
