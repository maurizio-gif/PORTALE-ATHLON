## La privacy dell'Athlon Health System: tre consensi, un'informativa generale, e niente premi legati ai dati sulla salute

Analisi del 20/10/2026, scritta anche come documento per il consulente privacy del club («Athlon Health Score: analisi privacy», Claude Docs di Maurizio). Il lato server (tabella dei consensi, funzioni, versioni da far
combaciare, ordine di pubblicazione) è nel `CLAUDE.md` di APP-ATHLON, «I consensi dell'Athlon Health System».

- **Cosa chiede consenso e cosa no.** Train (sedute chiuse, presenze, punti e livelli) non chiede un consenso speciale: contratto e informativa generale. **Food** (diario, questionario, foto), **Relax** (sonno e dispositivi) e
  **le misure del corpo** sono dati sulla salute (art. 9 GDPR) e hanno **un consenso esplicito ciascuno**, chiesto la prima volta che si usa la funzione (non all'accesso: mescolerebbe scopi diversi), con una versione e una
  revoca che cancella.
- **All'accesso solo un link, non un consenso.** `Accesso.tsx` e la riga «Informativa privacy» del Profilo aprono l'informativa del club (`PRIVACY_URL` di `lib/guestPass.ts`, athlonroma.it/privacy: titolare Società
  Sportiva Dilettantistica Point 2000 SSD). Nessuna casella: all'accesso si dà solo l'email, per farti entrare. **L'informativa del club non cita ancora il benvenuto con l'AI né Food, Relax e le misure**: va aggiornata dal
  consulente.
- **Le misure del corpo hanno il loro consenso** (`dati/informativaCorpo.ts` per il testo e la versione, `dati/ConsensoCorpo.tsx` per la pagina e per l'informativa e la revoca in fondo). Senza consenso la funzione non restituisce
  le misure (`consenso: null`): **«Il tuo corpo» mostra la pagina del consenso al posto dei dati**, la carta in cima a Fit invita a darlo (`CartaCorpo`, `senzaConsenso`), e le stime che dipendono da peso e altezza dicono
  «mancano dati» e portano a «Il tuo corpo», dove c'è il consenso. **Con una funzione che non lo conosce ancora il campo `consenso` non c'è** (`undefined`): nessun blocco e nessun comando di revoca, così l'app può uscire
  prima della funzione. Dopo il consenso o la revoca si butta la memoria del laboratorio (`dimentica`). La revoca cancella le misure e il sesso che il socio ha scritto; quelle della segreteria restano.
- **Food, informativa 2026-10-20**: dice che il diario alimenta il punteggio e i livelli (i giorni in cui sono scritti i pasti principali, non cosa si è mangiato), e che i punti si conservano. **Prima il punteggio usava il
  diario senza che il testo lo dicesse**: chi aveva accettato la versione del 19/10 riaccetta. Cambiando il testo si cambia `VERSIONE_INFORMATIVA` qui e in `_shared/alimentazione/versione.ts`.
- **Regola: nessun livello, soglia o premio dipende dal consenso a Food, Relax o alle misure.** Un consenso che si dà per non perdere un vantaggio non è libero (art. 7, par. 4; considerando 42-43). Oggi i livelli si
  raggiungono anche con il solo Train, più lentamente (Oro in circa 14 settimane invece di 10, Platino 27 invece di 19, Diamante 47 invece di 33): va mantenuto. **I punti di Food e Relax si contano solo con il consenso alla
  versione corrente** e si azzerano alla revoca.
- **Classifica e premi: decisione del club, nulla costruito.** Un piccolo gioco interno che incentiva lo stile di vita: **premi a soglia** (chi raggiunge un traguardo), **nessuna classifica pubblica, nessuna estrazione**.
  Prima di qualunque premio: il calcolo dei punti **nel server** da fonti che il socio non scrive (sedute chiuse, presenze della reception) — oggi li calcola l'app e sonno e diario sono dichiarati dal socio —, una misura
  sola (i punti di allenamento), l'Athlon Health Score che resta privato del socio, lo staff che vede solo «traguardo raggiunto», un regolamento di una pagina, solo adulti. Una gara su cibo e sonno può spingere chi è fragile
  a comportamenti scorretti, e una classifica espone nome e punteggio di una persona: se un giorno si vuole, è un consenso a parte (opt-in con un'anteprima di come si apparirà). **Dal 29/10/2026 la classifica mensile esiste (lato app) e segue questo disegno**: consenso a parte, anteprima di come si appare, nessun premio; vedi la sezione «La classifica mensile» in fondo. Il DPR 430/2001 (concorsi a premio) va
  fatto confermare dal consulente.
- **Da fare, non fatto**: valutazione d'impatto (art. 35), accordi con i fornitori e trasferimenti extra-UE, conservazione del registro dei punti, esportazione dei dati (art. 20), proporzionalità del questionario di
  Food, e i minorenni per le misure (il consenso non controlla l'età).

Per verificare: `npx tsc --noEmit` senza errori nuovi (41 di base). **Provato nel browser con la funzione simulata**: la pagina del consenso (la casella accende il pulsante, il consenso manda la versione corrente e rilegge),
«Il tuo corpo» con i dati e in fondo consenso e revoca (la conferma, e dopo la revoca la pagina del consenso), la funzione vecchia senza il campo `consenso` (nessun blocco, nessun comando), la carta in Fit con l'invito, la
nuova informativa di Food (versione del 20/10/2026 e il punteggio nel testo) e il link all'informativa nell'accesso. **Non provato**: la riga «Informativa privacy» del Profilo (la Home non si simula), un telefono, e le funzioni
vere con una sessione vera.

