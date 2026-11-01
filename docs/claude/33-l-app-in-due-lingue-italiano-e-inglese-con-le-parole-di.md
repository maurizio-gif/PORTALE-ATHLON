## L'app in due lingue: italiano e inglese, con le parole di PerfectGym (21/10/2026)

Richiesta di Maurizio. Il socio sceglie la lingua nel **Profilo** (Account → Lingua) o in fondo alla **pagina d'accesso**; la prima volta vale
quella del dispositivo (italiano se il dispositivo è in italiano, altrimenti inglese). La scelta si ricorda sul dispositivo (`localStorage`,
`athlon_lingua`). Il lato server: `CLAUDE.md` di APP-ATHLON, «Le lingue del portale».

- **Il link `?lingua=en` (o `?lingua=it`) apre l'app in quella lingua** (22/10/2026, per l'invito ai tester in inglese dal CRM, APP-ATHLON «I tester dell'app»):
  `dallIndirizzo()` in `lingua.ts` lo legge alla prima domanda, **vale come una scelta del socio** (si ricorda sul dispositivo, sopra a quella di prima) e toglie il
  parametro dall'indirizzo con `history.replaceState`. Solo sul web. **Su iPhone l'app aggiunta alla schermata Home ha una memoria sua**: si apre nella lingua del
  dispositivo, e l'email lo dice (Profilo → Lingua). Un valore diverso da `it` e `en` non conta.
- **I testi stanno accanto all'originale**: `t('Prenota', 'Book')` (`src/lib/lingua.ts`), non una chiave in un dizionario. Un testo nuovo si
  scrive sempre con i due argomenti; `tv(it, en)` per elenchi ed elementi, `locale()` per date e numeri (`it-IT` / `en-GB`), mai `'it-IT'` scritto.
  `lingua.ts` è un modulo puro (lo importano anche i calcoli provati con `npx tsx`); il gancio per i componenti è `useLingua` in `lingua-react.ts`.
- **Cambiare lingua ricarica l'app sul web**: costanti di modulo, formattatori e risposte già in memoria si rifanno nella lingua nuova, quindi
  un `t()` a livello di modulo va bene. Sull'app nativa il layout radice ha `key={lingua}` e ridisegna le schermate; le costanti di modulo si
  aggiornano alla prossima apertura.
- **Le parole inglesi sono quelle di PerfectGym** (`docs/glossario-inglese.md`, ricavato dal manuale inglese di PerfectGym e dallo swagger):
  membership, payment plan, freeze, booking, waiting list, joining fee, payment method, front desk… Ortografia americana come PerfectGym, date
  all'europea. **I nomi propri del club** (attività, abbonamenti, prodotti) e i marchi dell'app (Athlon Health System, Train, Food, Relax,
  Club Life, Gym Floor, Guest Pass…) non si traducono nel codice: i nomi inglesi delle attività, dei piani e dei prodotti li scrive il club su
  PerfectGym e arrivano dal mirror. **Il glossario va riletto dal club** accanto al Client Portal in inglese.
- **Le funzioni rispondono nella lingua dell'app**: `intestazioneLingua()` manda `Accept-Language: en-x-athlon` (o `it-x-athlon`) da
  `funzione()` di `api/lab.ts` e dalle altre chiamate alle funzioni (`link`, `guestPass`, `referral`). È un'intestazione che non passa dal
  CORS, quindi un'app nuova con funzioni vecchie non si rompe (riceve l'italiano), e il segno `x-athlon` fa sì che un browser in inglese con
  un'app di prima riceva ancora l'italiano.
- **Cosa resta in italiano**: i contenuti del sito (news, eventi, schede dell'Help Desk, le schede delle lezioni), le notifiche scritte dallo
  staff, il testo dei contratti e dei Termini e Condizioni (in inglese c'è una riga che lo dice: fa fede l'italiano), e i nomi da PerfectGym
  che il club non ha tradotto. Le **informative privacy** sono tradotte con «Courtesy translation: the Italian text is the binding version»;
  le versioni dei consensi non sono cambiate (stesso testo, due lingue): **la traduzione va fatta rileggere al consulente privacy**.

