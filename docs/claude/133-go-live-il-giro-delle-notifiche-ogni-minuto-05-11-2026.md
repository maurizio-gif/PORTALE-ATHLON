## Go-live: il giro delle notifiche ogni minuto, non ogni venti secondi (05/11/2026)

Analisi pre go-live di Maurizio. `Notifiche.tsx` chiedeva `portale-lab-notifiche nuove` **ogni venti secondi** per ogni
app in primo piano: era già la funzione del portale più chiamata con settanta utenti attivi (1.300 chiamate al giorno),
e con duemila soci in primo piano sarebbero state cento richieste al secondo, continue, ognuna con la lettura del nucleo
e la RPC `app_notifiche_nuove` sul database. **`OGNI_MS` passa a 60 secondi.** Il resto del giro non cambia: la
chiamata appena l'app si apre, quella a ogni ritorno in primo piano, e quella **immediata** quando il service worker dice
che è arrivata una push (`notifica-arrivata`): chi ha la push attiva vede la finestra subito come prima; chi non ce l'ha
la vede entro un minuto invece che entro venti secondi. Il 403 ferma il giro come prima.

- **La RPC non è stata toccata**: fa un `update … set ricevuta_il` a ogni chiamata, ma con l'indice
  `app_notifiche_invii_member (member_id, creato_il)` a zero righe costa quanto una lettura. Il peso era il numero di
  chiamate, non la scrittura.
- **Dall'altra parte** (APP-ATHLON, sezione «Go-live: le funzioni del portale passano dal pooler»): la funzione ha preso
  `idle_timeout: 10` (teneva la connessione per tutta la vita dell'istanza) e, col segreto `DB_URL_POOL`, passa dal pooler.
- **Non toccati, dalla stessa analisi**: le 16 funzioni che la Home apre a freddo (vetrine Vimeo, gruppi Junior anche
  senza figli, `da_valutare`, `controllo`, prodotti, documenti, tesseramenti), la cache solo in memoria senza scadenza,
  il messaggio di benvenuto chiesto a ogni apertura, i polling a intervallo fisso senza backoff dopo i pagamenti
  (`Pagamenti.tsx`, `Junior.tsx`, `Corsi.tsx`) e i sedici `useFocusEffect` che rileggono tutto a ogni cambio di scheda.
- **Provato**: `tsc` pulito. **Non provato** su un telefono.
