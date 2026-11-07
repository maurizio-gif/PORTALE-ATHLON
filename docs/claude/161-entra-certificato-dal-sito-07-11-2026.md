## «Entra» dal sito: la destinazione `certificato` apre la sezione Certificato (07/11/2026)

Richiesta di Maurizio: sulla scheda «Certificato Medico» dell'Help Desk del sito la persona scrive l'email e riceve il link per caricare il
certificato direttamente. Lato server (la destinazione, l'email, i freni): `CLAUDE.md` di APP-ATHLON, «Carica il certificato dalla scheda del
sito», stessa data. Lato sito (il modulo nella scheda): SITO-ATHLON. Qui c'è una riga sola: il motore di `/entra` (sezione «Entra dal sito») ha
una destinazione in più.

- **`d=certificato`** porta alla Home sulla sezione Certificato: `{ pathname: '/', params: { sezione: 'certificato' } }`, cioè `/?sezione=certificato`,
  che `AreaRiservata.tsx` già leggeva (la usano le notifiche, `DaFare` e l'avviso in cima alla Home). La sezione è **sempre visibile**: a differenza
  del Tesseramento non dipende da niente, quindi il link non ricade mai sulla sezione iniziale. «Per chi» lo si carica si sceglie dentro la
  sezione, se nel nucleo c'è più di una persona: il link non porta nessun bambino.
- **La schermata `/entra`** dice «Carica il certificato medico» e «Ti apriamo direttamente la sezione Certificato, senza password: scegli per chi
  lo carichi e invia una foto o un PDF», con il pulsante «Apri il certificato» (inglese incluso). Il tocco prima di entrare c'è come per le altre.
- **Una lista chiusa, come sempre**: `certificato` ignora categoria, giorno, piano, bambino e turno (provato con tutti i parametri insieme), e la
  chiave `sezione` è fissa nel codice: non viene dall'indirizzo. Chi arriva senza essere registrato passa prima da «Completa il profilo» e poi
  alla sezione.
- **Provato**: `scripts/prova-entra.ts` (22 prove, la nuova controlla anche che `certificato` sia una sezione vera di `home/sezioni.ts`: se la
  rinominano, il link porterebbe alla sezione iniziale in silenzio). Si esegue con `npx tsx` e, **senza `node_modules`**, serve un tsconfig con la
  sola mappatura `@/*` (`--tsconfig`): quello del progetto estende Expo e senza le dipendenze `tsx` non risolve `@/lib/...`. `tsc` **non** è stato
  eseguito (nessuna dipendenza installata): la riga è nello stesso formato di `assistenza`.
- **Non provato**: l'apertura nell'app vera, né dal link dell'email né dal browser.
- **Ordine di pubblicazione**: prima la funzione `sito-accesso-link` (APP-ATHLON), poi questa app, poi il sito. Con la funzione pubblicata e l'app
  vecchia, il link arriva e `arrivoDa` non riconosce `certificato`: la persona finisce sulla Home.
