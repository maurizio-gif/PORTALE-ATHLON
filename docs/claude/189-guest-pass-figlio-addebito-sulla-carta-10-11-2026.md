## Il Guest Pass di un figlio: la carta si salva sul genitore, e se l'addebito lo fa PerfectGym la pagina dice «sulla carta» (10/11/2026)

Lato server (la decisione, il flusso a due passi, cosa è provato e cosa no, e come provarlo con Test Testing): `CLAUDE.md` di APP-ATHLON, sezione 206. **Da pubblicare dopo `guest-pass`**; con l'app di prima e la funzione nuova funziona tutto tranne il testo del ripiego.

Per un figlio con carta nuova il server risponde alla conferma con `pagamento: 'da_pagare'` e l'indirizzo della **pagina di registrazione della carta sul genitore**: l'app la apre come ogni pagamento, e al ritorno `?carta=1` fa quello che già faceva (`carta_esito`, e `ripaga` se il Guest Pass è già attivato). Quindi **nel percorso principale l'app non cambia**. Cambia solo quando PerfectGym non lascia lanciare l'addebito a nome del figlio e lo fa lui (`pagamento: 'addebito'`, `addebito_su: 'carta'`):

- `lib/guestPass.ts`: `addebito_su?: 'conto' | 'carta' | null` nella risposta di `pagina`; manca con una funzione di prima, e allora il testo è quello di sempre («sul conto»).
- `AttivaGuestPass.tsx`: **`conferma`** dice «addebitati sulla carta» o «sul conto» secondo `addebito_su`; **`ripaga`** gestisce `addebito` (prima, per un `pagamento` che non conosceva, mostrava «Non riusciamo ad aprire il pagamento»); **il ritorno `?carta=1`** distingue tre casi dopo `ripaga`: `addebito` («Carta salvata. Il Guest Pass è attivo e l'importo sarà addebitato sulla carta»), un **errore** (ora si mostra quello del server: prima diventava «Carta salvata. Ora puoi pagare», cioè un'informazione falsa) e il resto com'era.
- `GuestPassAttivo.tsx`: la nota «saranno addebitati sul conto che hai indicato» diventa «sulla carta che hai salvato» con `addebitoSu === 'carta'`.

**Provato**: `tsc --noEmit` con 0 errori in `src/` prima e dopo (45 errori fuori da `src/`, `docs/` e `scripts/`, identici), e verificato che `tsc` vede un errore iniettato in un file toccato. **Non provato**: l'app su un telefono o sul web con il server nuovo; nessuna delle tre schermate nuove è stata vista.
