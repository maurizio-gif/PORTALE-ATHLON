## Dopo «Prenota» il Calendario passa anche `drop_in` e `credito`: il Drop-in di Adyen e il credito scalato si vedono, per il Baby Nuoto e per l'ingresso degli adulti venduto da noi (13/11/2026)

Trovato lavorando all'ingresso singolo degli adulti venduto da noi (APP-ATHLON, sezione 286, migrazione `20261114b`). Il server risponde a `prenota` con `402 da_pagare` e, per gli acquisti nostri (Baby Nuoto dal 12/11/2026, ingresso degli adulti quando l'interruttore sara' acceso), anche `drop_in: true` e `credito`. `prenotaLezione` (`src/api/lab.ts`) li legge, ma il pulsante «Prenota» di `AzioniLezione` (`Calendario.tsx`) costruiva `daPagare` solo con `prodotto`, `url`, `acquisto_id` e `carta`.

**Effetto, fino a oggi:** dopo «Prenota» `conModulo` era sempre falso. La carta nuova si pagava col link Adyen anche per il Baby Nuoto (la sezione 211 diceva il contrario), e la riga «Abbiamo scalato X € dal tuo credito» non compariva mai (il prezzo mostrato era comunque gia' quello scalato). La carta salvata con un tocco funzionava.

**Correzione:** una riga, `setDaPagare({ ..., drop_in: r.drop_in, credito: r.credito })`. Niente altro cambia: `CassaLezione` lavora per `acquisto_id` ed e' gia' generica, `sessione_acquisto`, `esito_sessione`, `paga_con_carta` ed `esito_acquisto` lato server riconoscono anche gli ingressi degli adulti (`INGR-<numero>`). Gli acquisti di PerfectGym non mandano `drop_in` e restano col link.

**Provato:** `tsc` con gli stessi errori di `main` (nessuno nuovo). **Non provato** in un browser ne' su un telefono. Va in un OTA; non serve per vendere l'ingresso (senza, si paga col link e funziona).
