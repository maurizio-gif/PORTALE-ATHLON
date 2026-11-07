## `/entra`: l'iscrizione di un figlio preparata dal CRM (07/11/2026)

Richiesta di Maurizio. Lato server e CRM: `CLAUDE.md` di APP-ATHLON, «Scarica contratto e iscrizione per conto del cliente».

Dalla scheda del cliente, l'operatore del desk prepara l'iscrizione di un figlio (Scuola Nuoto Bambini col turno, o Baby Nuoto) e **manda al genitore un link, per email o per SMS**: firma e pagamento li fa il genitore dall'app. Il link è quello di accesso dal sito (`/entra`, già dentro senza password, un'ora, uso singolo) con **una destinazione nuova, `iscrizione`**:

- `https://app.athlonroma.it/entra?d=iscrizione&f=<bambino>&t=<turno>#th=<token>` apre **`/iscrizione?group=<turno>&membro=<bambino>`**, la schermata che il genitore trova dalla sezione Junior (anteprima del contratto, dati, dichiarazioni, firma; il pagamento è quello degli abbonamenti).
- `…&f=<bambino>&b=1#th=…` apre **`/iscrizione?baby=1&membro=<bambino>`** (il mensile del Baby Nuoto).
- Senza il bambino, o senza turno e senza `b=1`, il link apre la sezione Junior (`/junior`), dove il genitore sceglie. `f` e `t` sono solo cifre (`idValido`), `b` vale solo se è `1`; nient'altro viaggia nel link.
- **Non è una scorciatoia che salta i controlli**: la schermata e il server (`portale-abbonamento`, `junior_anteprima` e `junior_firma`) verificano che il bambino sia nel nucleo di chi è entrato e che il turno abbia posti e sia per il suo anno di nascita. Un indirizzo scritto a mano con un bambino di un altro non apre niente.
- File: `src/features/entra/destinazioni.ts` (`arrivoDa` prende `turno` e `baby` in più, dopo `f`), `EntraDalSito.tsx` e `src/app/entra.tsx` (leggono `t` e `b`). Nessuna schermata nuova.
- **Provato**: `LC_ALL=it_IT.UTF-8 npx tsx scripts/prova-entra.ts` (21 prove, 7 nuove: turno, Baby Nuoto, il Baby Nuoto vince sul turno, senza bambino o senza turno si va a Junior, id non numerici, `b` diverso da `1`, turno e Baby Nuoto valgono solo per l'iscrizione); `tsc` senza errori nuovi (45, quelli di base). **Non provato**: il link aperto da un telefono con un login vero.
- **Ordine di pubblicazione**: prima le funzioni di APP-ATHLON (`crm-iscrizione`), poi questa app. Con l'app vecchia `iscrizione` non è una destinazione e il link porta alla Home.
