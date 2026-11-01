## Lo shop: Articoli e Merchandising, si compra dall'app e si ritira in segreteria

Richiesta del club (18/10/2026). Cartella `src/features/lab/shop/`, API `src/api/shop.ts`, rotte `src/app/(portale)/shop/`. Un negozio
nell'app dei soci per le due categorie di PerfectGym **Articoli** e **Merchandising**: foto, prezzi, carrello, pagamento online con Adyen
attraverso PerfectGym (come le lezioni singole), **ritiro in segreteria**, nessuna spedizione. Funzione `portale-lab-shop`, tabelle, bucket
delle foto, i tre segnali di «pagato», il giro del cron e la sezione Shop del CRM: sezione «Lo shop» del `CLAUDE.md` di APP-ATHLON.

- **L'app non parla con PerfectGym e non manda mai un prezzo.** Alla funzione arrivano solo `product_id` e quantità (`src/api/shop.ts`); nome,
  foto e prezzo li rilegge la funzione, che prima di aprire il pagamento **ricontrolla da PerfectGym** prezzo e vendibilità di ogni riga. Il totale
  che si vede nel carrello è una somma per comodità (in centesimi, `Math.round(prezzo * 100) * quantità`); **dopo «Vai al pagamento» vale quello
  della funzione**. Se un prezzo è cambiato, un articolo è finito o non è più in vendita l'ordine non parte (409 con `codice`): l'app rilegge la
  vetrina (`carica(true)`), toglie dal carrello ciò che non c'è più (`allineaAllaVetrina`) e lo dice.
- **Il catalogo lo cura la segreteria dal CRM** (foto, descrizione, ordine, visibile, esaurito). **Un articolo può stare in vetrina senza foto**
  (19/10/2026, richiesta del club: i tester vedono subito tutto, le foto arrivano dopo): al posto dell'immagine c'è un segnaposto, un sacchetto su
  fondo neutro (`SegnapostoFoto`, senza testo), nella vetrina, nella scheda articolo, nelle miniature del carrello e degli ordini. Un prodotto
  nuovo del listino non compare finché qualcuno non lo accende. **Cosa
  vede il socio dipende dal suo abbonamento** (alcuni prodotti spettano a chi ha un contratto vivo, altri a chi non l'ha), e lo decide la
  funzione: l'app mostra quello che torna.
- **Le schermate.** `/shop` (`Vetrina.tsx`: schede in griglia, filtro per categoria, «Esaurito» sulla foto spenta; la lettura sta in
  memoria sotto `shop:vetrina`, `useVetrina`), `/shop/[id]` (`Articolo.tsx`: foto, descrizione, quantità, «Aggiungi al carrello»), `/shop/carrello`
  (`Carrello.tsx`), `/shop/ordine/[id]` (`EsitoOrdine.tsx`, il ritorno dal pagamento) e `/shop/ordini` (`Ordini.tsx`, «I miei ordini»). **Si chiama «Shop» e
  si entra da un posto solo: la carta «Shop» della Home** (`home/CartaShop.tsx`, fra «Da fare» e i riquadri, **fuori da ogni sezione**; 19/10/2026,
  richiesta del club: prima era una carta «Shop del club» dentro la sezione Prodotti, che quasi nessuno apre, e Prodotti torna a mostrare solo gli acquisti
  già fatti). **Non ha una voce nella barra delle schede**: l'ha avuta per qualche minuto (sesta, fra Athlon Health System e TV) e il club l'ha tolta, quindi
  non va rimessa senza chiederlo. Per questo la vetrina è una schermata di dettaglio come le altre dello shop: senza barra, con la freccia che torna alla
  Home (articolo, carrello, ordini ed esito tornano alla vetrina).
- **Il carrello** (`carrello.ts`, un solo store per app, `useCarrello` con `useSyncExternalStore`) tiene **solo identificativi e quantità**. Sul web sta
  nella scheda del browser (`sessionStorage`, chiave `athlon_shop_carrello`) perché il pagamento porta fuori dall'app, sulla pagina di Adyen, e al
  ritorno la pagina si ricarica da capo: un carrello solo in memoria sarebbe vuoto proprio quando serve. **Non nel `localStorage`**: un dispositivo
  condiviso non deve ritrovare il carrello di chi c'era prima. **All'uscita dal laboratorio si svuota** (`esciDalLaboratorio` in `memoria.ts`), e si
  svuota quando un ordine risulta pagato, non prima: tornando indietro senza pagare il carrello c'è ancora. Tetti: **cinque pezzi per articolo e
  dodici righe** (li dice la funzione nella vetrina, `quantita_max`; l'app non ne ricopia i numeri se non come ripiego).
- **Il pagamento ha due strade, come le lezioni.** Chi ha una **carta salvata** vede «Paga 25,00 € con la carta •••• 1234» e paga senza uscire; l'altra
  voce, «Usa un'altra carta», e la sola strada per chi la carta non ce l'ha, porta sulla pagina protetta di Adyen (`window.location.assign` sul
  web, `Linking.openURL` sul telefono), dove la carta si salva. «Vai al pagamento» **non addebita niente**: apre l'ordine. Con l'ordine aperto
  il carrello non si cambia più (niente quantità né cestino: l'ordine è quello), si può solo «Tornare al carrello», che lo riapre con un
  ordine nuovo.
- **Il ritorno dal pagamento** (`/shop/ordine/<id>`) chiede com'è andata ogni 4 secondi, per due minuti (30 giri), perché PerfectGym registra il
  pagamento qualche secondo dopo: «Verifichiamo il pagamento…», poi «Pagamento ricevuto» (da ritirare in segreteria) o «Pagamento non riuscito» o,
  dopo i due minuti, «Non vediamo ancora il pagamento». **Quest'ultimo non è un errore**: chi ha pagato e chiude la pagina lo ritrova in «I miei
  ordini», che compare appena PerfectGym lo registra; chi è tornato indietro senza pagare non ha addebiti. Il testo lo dice, e dice di non chiudere la
  pagina mentre aspetta.
- **Il ritiro** si legge ovunque come «Da ritirare in segreteria, negli orari di apertura del club», e passa a «Ritirato il …» quando la segreteria
  lo segna consegnato dal CRM. Non c'è nessuna notifica (l'app non ne ha) e **nessuna email di conferma**: la ricevuta è la schermata e «I miei
  ordini».
- **Solo i tester del portale**: chi non è in `portale_lab_tester` riceve 403 da `portale-lab-shop` e la schermata mostra il messaggio. **Nella vista
  cliente dello staff lo shop si guarda e basta** (`catalogo` e `ordini` sono letture; `ordina`, `paga_con_carta` ed `esito` rispondono 403): il
  pulsante «Vai al pagamento» è spento e un avviso lo dice, e il bottone del carrello nella testata dell'articolo non compare.
- **Le foto sono indirizzi interi e pubblici** (bucket `shop-prodotti`, merce e non persone): l'app le mostra con `expo-image`, `contentFit="cover"` in
  riquadri quadrati. A differenza di MoveKit e dei certificati non c'è niente da firmare.

**Cosa è provato.** `npx tsc --noEmit` pulito. In un browser vero (Chromium, 19 gruppi di prove contro la funzione simulata, nessun errore di
pagina né di console): vetrina con filtro per categoria e «Esaurito»; articolo con quantità, tetto di cinque pezzi, articolo esaurito, indirizzi
strani (`/shop/abc`, un prodotto che non c'è); carrello con totale in centesimi che sopravvive al ricaricamento; **prezzo cambiato** (l'ordine non
parte, messaggio, prezzo nuovo a schermo) e articolo finito che esce da solo; «Vai al pagamento» che manda **solo id e quantità** e mostra la carta
salvata; ritorno dal pagamento («Verifichiamo…» poi «Pagamento ricevuto») col carrello svuotato; «I miei ordini»; la carta «Shop» in Home;
vetrina vuota e in errore con «Riprova». Le schermate sono state **guardate** su telefono (390 px) e su desktop (1280 px, quattro colonne, nessun
overflow), in tema chiaro e scuro. **Cosa non lo è:**

- **Nessun pagamento vero**: la funzione era simulata. Il primo pagamento di produzione dello shop è anche il primo della strada PerfectGym → Adyen
  online (vedi APP-ATHLON).
- **La vista cliente dello staff** (pulsante spento, avviso, niente bottone del carrello) è scritta ma **non è stata provata nel browser**, né il
  pagamento con carta salvata fino in fondo né un ordine «non riuscito» (`EsitoOrdine` con `errore`): sono coperti dalla funzione, non dalla schermata.
- **Larghezza 430 px, «riduci movimento», nessuna prova su un telefono** (a 360 px sono provate solo vetrina e Home, non carrello, articolo ed esito) e **nessuna prova dell'apertura di Adyen dall'app nativa**
  (`Linking.openURL`): sul web si lascia l'app e si torna, come per i pagamenti del Calendario; il ritorno su nativo non è stato provato, e il carrello lì
  sta solo in memoria.
- **Nessuna foto vera**: le prove usano immagini finte. Come si vede una foto 4:3 o molto alta in un riquadro quadrato va guardato con le prime foto del club.
  Il segnaposto invece è provato nel browser (vetrina, scheda, carrello, ordine pagato, tema scuro, senza overflow su 390 px).

**Da sapere.** Nessuna giacenza (esaurito è un interruttore a mano), nessun avviso alla segreteria per un ordine nuovo (si guarda «Da consegnare»
nel CRM), nessuna spedizione e **nessuna fattura o ricevuta fiscale generata qui**: quello che emette PerfectGym per il pagamento è quello che il
socio ha.

Per verificare: `npx tsc --noEmit` pulito. **Le schermate si guardano renderizzate** (360, 390, 430 e 1280 px): vetrina senza articoli (messaggio, non
una griglia vuota), articolo esaurito (foto smorzata, pulsante spento), carrello con l'ordine aperto (stepper e cestino spariti, «Torna al carrello»),
ritorno dal pagamento che passa da «Verifichiamo…» a «Pagamento ricevuto», la Home con la carta «Shop» (e Prodotti senza), la vetrina senza barra e con la freccia alla Home (360, 390 e 1280 px), e la vista cliente.
Nel carrello: cinque pezzi di un articolo e nessuno di più; con un prezzo cambiato lato funzione l'ordine non parte e il carrello si allinea; a logout il
carrello è vuoto.

