## Le stelle alle lezioni: una carta in Home, un tocco, da 1 a 5 (24/10/2026)

Richiesta di Maurizio. `home/CartaValutaLezione.tsx`, sotto «Da fare»: «Com'è andata?» per la lezione più recente a cui la reception ha segnato la presenza negli ultimi 7 giorni e che il socio non ha ancora votato. **Un tocco su una stella salva** (niente «Invia») e la carta passa alla lezione dopo, se c'è (al massimo cinque in coda); «Non ora» la nasconde per questa apertura dell'app, senza segnare niente. **Solo le stelle, nessun testo libero.** Votare di nuovo la stessa lezione cambia il voto.

- **Lo decide la funzione**, non l'app: `portale-lab-calendario`, azioni `da_valutare` e `valuta` (APP-ATHLON, migrazione `20261024b_lezioni_valutazioni.sql`). Restano fuori Gym Floor e Nuoto Libero (turni, non lezioni). Solo il titolare. Con la funzione di prima o senza risposta la carta non compare.
- **In vista cliente non c'è e non si chiama niente**: chi guarda l'app di un socio non vota al suo posto (le due azioni non sono fra le `LETTURE`).
- **Cosa vede il club**: la vista `lezioni_valutazioni_riepilogo` (medie e conteggi per lezione e istruttore, solo con almeno 3 voti, ultimi 90 giorni). **Nel CRM non c'è ancora una pagina che la mostri**, e nessuno vede chi ha dato quale voto.
- **Da pubblicare in quest'ordine**: migrazione, `portale-lab-calendario`, app.
- **Provato** in Chromium (bundle web, funzione simulata; 390 e 1280 px, chiaro/scuro, italiano e inglese): la carta, il voto con la richiesta esatta (`class_id`, `stelle`), il grazie e la lezione dopo, «Non ora», errore del server con la carta che resta, nessuna lezione e funzione di prima senza carta, nessuno scorrimento orizzontale. **Non provato**: la funzione vera con una sessione vera, un telefono.

