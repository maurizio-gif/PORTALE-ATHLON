## La pagina di stato del pagamento, aperta da sola, porta alla Home senza mostrarsi (02/11/2026)

Seconda segnalazione di Maurizio (02/11/2026): dopo il login «mi si apre un attimo una pagina di pagamento e poi torno indietro». È quello che resta della sezione «Pagamento non trovato»: la correzione di allora (404 → Home) toglieva l'errore, ma la pagina si apriva e chiamava ancora la funzione prima di andarsene. File: `features/lab/StatoPagamento.tsx`.

- **Cosa cambia**: se `/pagamenti/<riferimento>` si apre **senza** `sessionId`/`sessionResult`/`redirectResult` e **senza una schermata da cui tornare** (`router.canGoBack()` falso, valutato una sola volta alla prima apertura), la pagina non disegna niente, non chiede niente al server e fa `router.replace('/')`. Il 404 → Home resta come seconda rete.
- **Non cambia**: il tocco su un pagamento dall'elenco (c'è la schermata di prima: si può tornare) e il ritorno da Adyen/3D Secure (hanno i parametri).
- **Cosa non so ancora**: **perché** l'app si apre su quell'indirizzo; nel codice niente ci porta dopo l'accesso. Questa correzione toglie l'effetto, non la causa.
- **Provato**: nell'anteprima web, `/pagamenti/LAB-PROVA` aperto a freddo finisce su `/`. **Non provato**: su iPhone, il tocco da elenco, il ritorno da Adyen.
