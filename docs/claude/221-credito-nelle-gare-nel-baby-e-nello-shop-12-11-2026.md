## Il credito in euro nelle gare, nella lezione Baby e nello shop: l'app dice quanto si paga davvero (12/11/2026)

Seguito della sezione 220. Il lato server è nel `CLAUDE.md` di APP-ATHLON, sezione 252 («Il credito in euro anche sullo shop…»), ed è pubblicato.

- **Gare (`junior/Gare.tsx`, `api/gare.ts`)**:
  - ogni bambino ha le sue `anteprime` (omaggio, sconto o credito per gara). Il pulsante dice «Iscrivi Gabriele» se non c'è niente da pagare, altrimenti «Iscrivi e paga 3,00 €». Sopra c'è una riga verde che spiega perché: «La quota è in omaggio», «La quota è coperta dal tuo credito», «Con lo sconto la quota è di …», «Scaliamo … dal tuo credito»;
  - **un'iscrizione che nasce confermata (omaggio o credito) non apre più la cassa**: si rilegge e basta;
  - «Paga …», la cassa e il testo del SEPA usano `quota_cent` dell'iscrizione, cioè quello che resta. Con una funzione di prima vale la quota di listino, come prima;
  - un'iscrizione confermata col credito o in omaggio aggiunge «non c'è niente da pagare» al messaggio di conferma; una in attesa con una parte di credito dice «Abbiamo già scalato …».
- **Lezione singola Baby (`Calendario.tsx`, `api/lab.ts`)**: se il credito ne copre una parte, sopra il pagamento compare «Abbiamo scalato X € dal tuo credito: paghi solo la differenza». Il prezzo dei pulsanti è già la differenza, perché lo manda il server.
- **Shop (`shop/Carrello.tsx`, `shop/Ordini.tsx`, `api/shop.ts`)**:
  - se il credito copre tutto l'ordine si va diretti alla pagina dell'ordine, che lo trova pagato e svuota il carrello;
  - se ne copre una parte, sotto «Totale da pagare» compare «Abbiamo scalato X € dal tuo credito (il totale era Y)»;
  - negli ordini c'è «Pagato con il tuo credito», oppure «X pagati con il tuo credito, il resto con la carta».
- **Non provato** in un browser né sul telefono: oggi nessuno ha un credito in euro. `tsc` è pulito sui file toccati, a parte gli errori che c'erano già per i nomi che differiscono solo per le maiuscole (`carrello.ts`/`Carrello.tsx`, `abitudini.ts`/`Abitudini`).
- **Sul web è pubblicato** con il merge su `main`. **Nell'app installata serve un'OTA**, non ancora fatta.
