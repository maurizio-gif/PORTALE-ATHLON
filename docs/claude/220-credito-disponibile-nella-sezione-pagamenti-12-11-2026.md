## «Credito disponibile da scalare» nella sezione Pagamenti, solo se c'è (12/11/2026)

Richiesta di Maurizio: il credito in euro che il club carica dal CRM (sezione «Agevolazioni» di APP-ATHLON, ramo `claude/blissful-lamport-31afhs`) si vede nella sezione **Pagamenti** dell'app, **solo se è maggiore di zero**, con **un totale e il dettaglio sotto**. Il lato server c'era già, pubblicato: la funzione `portale-lab-credito` (v1, azione `elenco`), descritta nel `CLAUDE.md` di APP-ATHLON, sezione «Il credito in euro nella schermata Pagamenti dell'app».

- **`src/api/credito.ts`** (`leggiCredito`) legge la funzione. **Non restituisce mai un errore**: con la rete giù, un 403 (un ragazzo da 13 a 17 anni non vede i soldi del genitore) o una funzione assente, il credito è vuoto. Un credito che non si legge non deve bloccare i pagamenti, né comparire come «0,00 €».
- **`src/features/lab/pagamenti/Credito.tsx`** (`CreditoDisponibile`) è il riquadro, in `RiepilogoPagamenti` subito sotto «Da pagare» e sopra i pagamenti in corso. Contiene il totale in grande e una riga per lotto con il residuo, per cosa vale («Abbonamenti», «Lezioni, eventi e gare», «Shop») e «Scade il …» se ha una scadenza. Con più persone del nucleo, le righe stanno sotto il nome di ognuna. Sotto il riquadro c'è una frase: «Si scala da solo quando prenoti o ti iscrivi, e torna se disdici.»
- **Il motivo non si mostra**: è una nota interna dell'operatore e il server non lo manda.
- **La memoria** (`pagamenti:credito`) dura un minuto. Dopo una prenotazione che ha scalato credito, il riquadro si aggiorna alla riapertura successiva.
- **Non c'è nella Home** (il riquadro della sezione Pagamenti) né nello storico completo, ma solo nella sezione.

**Non provato a schermo**: oggi nessuno ha un credito in euro (le prove del CRM erano tutte a rollback), quindi il riquadro non compare a nessuno. `tsc` è pulito sui file toccati. Per vederlo serve un credito vero caricato dal CRM, che però non è ancora pubblicato.

Ancora da fare, lato app: nella schermata di una gara, «Iscrivi · 8,00 €» prima del tocco al posto di «omaggio». Per correggerlo serve che `iscrivi` (o la lettura delle gare) di `portale-lab-gare` riporti `credito_cent`, e oggi non lo fa.
