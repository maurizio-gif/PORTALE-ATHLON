## L'assistente dell'app apre con tre suggerimenti, scelti secondo chi apre la chat (05/11/2026)

Richiesta di Maurizio. All'apertura della chat «Assistente virtuale» c'erano cinque suggerimenti, uguali per tutti: «Aiutami a prenotare una lezione», «Voglio pagare una rata scaduta», «Voglio aggiungere il metodo di pagamento», più le due domande d'esempio «Dove vedo i miei pagamenti?» e «Come annullo una lezione?». **Ora sono tre**, e si mescolano secondo chi apre la chat: uno sulle attività degli adulti, uno sul figlio se nel nucleo c'è un minorenne, uno sull'account o sull'iscrizione (`suggerimenti()` in `FoglioAssistente.tsx`). Le due domande d'esempio non ci sono più.

| chi apre la chat | adulti | figlio | account |
| --- | --- | --- | --- |
| il titolare ha un abbonamento | Aiutami a prenotare una lezione | — | Voglio pagare una rata scaduta |
| il titolare non ha un abbonamento | Quale abbonamento fa per me? | — | — |
| nel nucleo c'è un minorenne iscritto | | Come recupera una lezione mio figlio? | |
| nel nucleo c'è un minorenne non iscritto | | Voglio iscrivere mio figlio a un corso | |
| qualcuno nel nucleo ha un abbonamento | | | rata scaduta, poi metodo di pagamento |
| nessuno ha un abbonamento | | | Posso provare il club prima di iscrivermi? |

Si prende il primo suggerimento di ogni colonna, nell'ordine adulti, figlio, account, e ci si ferma a tre. Esempi:

- un iscritto senza figli vede «prenota», «rata scaduta» e «metodo di pagamento»;
- un iscritto con un figlio iscritto vede «prenota», «recupero del figlio» e «rata scaduta»;
- un genitore che ha iscritto solo il figlio vede «quale abbonamento», «recupero del figlio» e «rata scaduta»;
- chi non è iscritto e non ha figli vede «quale abbonamento» e «posso provare»: due e non tre, perché non ci sono altri suggerimenti che lo riguardano.

**Da dove si sa**: `useProfilo` (`clublife/moduli/profilo.ts`) legge l'area che la Home ha già caricato, quindi non fa nessuna chiamata in più. Al profilo si sono aggiunti due campi:

- `figli`: nel nucleo c'è un minorenne, iscritto o no;
- `titolareIscritto`: il titolare stesso ha un abbonamento vivo. `iscritto` conta anche l'abbonamento di un figlio, e un genitore che ha iscritto solo il bambino non ha lezioni da prenotare per sé.

I Guest Pass non contano come iscrizione, come per i moduli di Club Life. **Finché l'area non si legge** (prima apertura, errore di rete) restano i primi tre di prima, che sono quelli che l'assistente sa fare con un tocco. Nella sezione Junior, con il tema del bambino, la chat comincia sempre da `BenvenutoJunior`: lì non cambia niente.

Toccare un suggerimento manda la frase come domanda, come prima. Le frasi nuove passano dall'assistente e dalle sue regole sui rami (iscritto, in prova, può provare, non iscritto): non c'è una risposta scritta qui.

**Provato**: `tsc`, con gli stessi 45 errori di prima, nessuno in `src/`. **Non provato**: la chat aperta nell'app con i diversi profili.
