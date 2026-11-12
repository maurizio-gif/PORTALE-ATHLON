## Il link del metodo per gli abbonamenti del nostro sistema: «Conto corrente» apre GoCardless al posto del modulo IBAN (12/11/2026)

Richiesta di Maurizio (12/11/2026): il link per salvare o cambiare il metodo di pagamento (email, SMS, e la sezione Pagamenti → Metodo di pagamento dell'app) deve valere anche per i contratti passati al nostro sistema (oggi i corsi bambini e il mensile del Baby Nuoto, poi gli adulti). Il lato server è nella sezione 256 del `CLAUDE.md` di APP-ATHLON (`perfectgym-metodo-pagamento`, `portale-link`, migrazione `20261112r`).

**Stato: scritto, `tsc` senza errori nei file toccati. NON pubblicato, non guardato in un browser né su un telefono.**

### Cosa cambia

- **`ContrattoNucleo.nostro`** (`lib/metodoPagamento.ts`): lo dice il server per gli abbonamenti del nostro sistema. Nell'elenco compaiono insieme agli altri, con il metodo che hanno adesso (prima non c'erano).
- **«Conto corrente»** (`GestioneNucleo.tsx`): se **tutti** gli abbonamenti scelti sono `nostro`, il pulsante si chiama «Conto corrente (su GoCardless)», con sotto la spiegazione («Il conto lo scrivi sulla pagina sicura di GoCardless… Adesso non viene addebitato niente»), e al tocco:
  1. azione `conto` di `portale-link` → l'indirizzo della pagina di GoCardless e l'id del flusso;
  2. `apriPaginaMandato` (di sempre, sezione 215): il riquadro di GoCardless sul web, il browser integrato nell'app installata; sul totem le tre strade;
  3. al ritorno, `conto_conferma` fino a dieci volte ogni 2,5 secondi: il mandato firmato diventa il metodo degli abbonamenti scelti e si arriva alla schermata dell'esito di sempre («Il conto che finisce con … è salvato su questi abbonamenti»). Se il mandato non arriva: «Non hai completato l'autorizzazione del conto su GoCardless: non è cambiato niente».
  - Sul web senza il riquadro la pagina cambia, e GoCardless riporta a `/r/<token>?conto=1` (dal link) o a `/metodo-pagamento?conto=1` (dall'app): `ritornoConto` fa partire subito la conferma.
- **Per gli abbonamenti di PerfectGym niente cambia**: il modulo IBAN di sempre. Una scelta mista la rifiuta il server, dicendo quale abbonamento togliere.
- **«Usa un metodo già salvato» e «Carta»** passano dalle azioni di sempre: decide il server. Per un abbonamento nostro una carta nuova oggi risponde «si salva pagando una quota… qui puoi scegliere una carta già salvata o il conto corrente» (la verifica della carta senza pagare è spenta finché non è provata con Adyen: APP-ATHLON 256).

### Provato, non provato, da pubblicare

- **Provato**: `npx tsc --noEmit`: nessun errore nei file toccati (restano quelli di `docs/`, `scripts/` e l'omonimia `ContatoreCalorie`/`contatoreCalorie` di questo disco, che c'erano già).
- **Non provato**: la pagina in un browser o su un telefono, il riquadro di GoCardless con un flusso vero, un mandato firmato.
- **Da pubblicare dopo le funzioni di APP-ATHLON** (`perfectgym-metodo-pagamento`, `portale-link`, `gocardless-webhook`) e la migrazione `20261112r`: sul web con l'unione su `main`, nell'app installata con un'OTA (solo JavaScript, nessun modulo nativo nuovo). Con le funzioni vecchie `nostro` non arriva e tutto resta com'è. Con le funzioni nuove e l'app vecchia, «Conto corrente» su un abbonamento nostro risponde «ricarica la pagina (o aggiorna l'app)».
