## Baby Nuoto: «Gestisci abbonamento» sotto l'abbonamento in Junior (sospendi e, piccolo, disdici), e il foglio dice com'è andato l'addebito dei 15 € (12/11/2026)

Richieste di Maurizio (12/11/2026), mentre il mensile del Baby Nuoto esce da PerfectGym (APP-ATHLON, sezione 253: migrazione `20261112m` e le funzioni `portale-abbonamento` e `portale-gestione-abbonamento`): «fai dire all'app come è andato l'addebito» e «Gestisci sul mensile bambino devi metterlo sotto l'abbonamento in sezione Junior, con le due opzioni, sospendi e piccolo disdici». Alla conferma si addebitano solo i 15 € (le quote restano alla billing run).

### «Gestisci abbonamento» in Junior

Prima versione, lo stesso giorno: due comandi nella carta («Sospendi un mese» e, piccolo, «Disdici l'abbonamento»). Maurizio: «metti un pulsante unico Gestisci e poi da lì si sceglie».

- **Dove**: nella carta dell'abbonamento mensile di `SezioneBaby` (`junior/Corsi.tsx`), sotto «Rinnovo»: il pulsante **«Gestisci abbonamento»** (`GestisciBaby`).
- **Cosa apre**: il foglio di «Gestisci abbonamento» (`FoglioGestisci`) sul riepilogo, con la proprietà nuova `senzaCambio`: restano «Sospendi» e, piccolo e sottolineato, «Disdici abbonamento»; il pulsante «Upgrade» o «Cambia abbonamento» e la loro nota non ci sono (il mensile del Baby non ha un cambio). Alla fine della sospensione il pulsante dice «Chiudi» (da Abbonamenti resta «Torna agli abbonamenti»).
- **Quando compare**: solo se `statoGestione` (azione `stato` di `portale-gestione-abbonamento`) dà quel contratto come gestibile. Finché non risponde, o se non lo trova, non c'è niente.
- **Chi esegue**: oggi PerfectGym, come da Abbonamenti (il contratto del bambino è già gestibile lì); dopo il passaggio del mensile, il nostro motore. L'app non distingue: le risposte hanno la stessa forma.
- **In Home**: in Abbonamenti «Gestisci abbonamento» c'era già e non è cambiato (lì il foglio ha ancora «Upgrade», spento).

### L'esito dell'addebito

`sospendi` (`api/gestioneAbbonamento.ts`) legge `pagamento` dalla risposta: `pagato`, `in_corso`, `da_pagare`, o niente (gli abbonamenti che addebita PerfectGym: il foglio resta com'era). Nell'esito della sospensione:

- `pagato`: «15,00 € addebitati su Carta •••• 4242» (o sul metodo del contratto, se non lo si sa);
- `in_corso`: «L'addebito è partito: lo trovi in Pagamenti appena è confermato» (un addebito sul conto ci mette qualche giorno);
- `da_pagare`: «15,00 € ancora da pagare», la sospensione è registrata ma l'importo non si è potuto addebitare, con il pulsante «Vai ai pagamenti».

### Provato

`tsc`: nessun errore nei tre file toccati; in `src/` restano 49 errori, gli stessi con e senza la modifica (su questo Mac il disco non distingue maiuscole e minuscole, e coppie come `ContatoreCalorie.tsx` e `contatoreCalorie.ts` si confondono: non dipendono da questo lavoro). **Non guardato in un browser né su un telefono**: serve un accesso vero di un genitore con il mensile Baby, e le conferme scrivono (oggi su PerfectGym). Le funzioni del server con `pagamento` non sono ancora pubblicate: fino ad allora l'esito dell'addebito non compare.

### Dopo averla vista nel pannello (12/11/2026, lo stesso giorno)

Maurizio l'ha guardata in vista cliente su un genitore con il mensile Baby, e ha chiesto:

- **Niente cambio abbonamento per il Baby**, nemmeno dentro la disdetta. `FoglioGestisci` riconosce il mensile del Baby (`baby`: il server dice `cambia.motivo = 'non_previsto'`, o il piano si chiama «Baby Nuoto») e, da dovunque lo si apra (Junior o Abbonamenti in Home), non mostra «Upgrade» né «Cambia abbonamento» nel riepilogo, né il riquadro «Vuoi cambiare abbonamento invece di disdire?» nel primo passo della disdetta.
- **La sospensione del Baby è solo a pagamento**: le opzioni gratuite che il server manda si tolgono (`caricaSospensioni`), quindi il passo «Che tipo di sospensione?» non compare; un mese che aveva solo la gratuita resta spento. Il server fa lo stesso (APP-ATHLON, sezione 253), ma l'app non lo aspetta.
- **Home, Abbonamenti: la prossima rata** (`AbbonamentiMiei.tsx`). Un mensile senza fine mostrava le quote fino alla fine della finestra, cioè del mese in corso: a metà mese la carta diceva «Nessuna rata in sospeso». Ora mostra sempre almeno la prima quota che deve ancora scadere, con data e importo («1 dicembre 2026 · 89 €»), più le eventuali scadute. Vale per tutti i mensili senza fine, anche il Flex degli adulti.
- **Tolta la frase** «I posti cambiano in fretta: l'ultima parola è del Calendario.» sotto il calendario del Baby in Junior (quella dei Consigli, più lunga, è rimasta).
- **Una prenotazione al giorno** per il Baby Nuoto: è una regola del server (APP-ATHLON, migrazione `20261112n`); l'app mostra il messaggio che il server manda.

**Visto nel pannello** (app locale, vista cliente, sola lettura): la carta in Junior con «Gestisci abbonamento» e senza la frase; il foglio con «Sospendi» e «Disdici abbonamento», senza «Upgrade»; il passo dei mesi senza la scelta del tipo; in Home «Prossima rata · 1 dicembre 2026 · 89 €». **Non visto**: il primo passo della disdetta, e nessuna conferma (la vista cliente non scrive).
