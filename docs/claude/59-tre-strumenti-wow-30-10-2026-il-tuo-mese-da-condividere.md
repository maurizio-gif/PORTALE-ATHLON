## Tre strumenti «wow» (30/10/2026): il tuo mese da condividere, il QR per il ritiro dello shop, l'assistente che propone una prenotazione

Richiesta di Maurizio («fai 6, 7 e 8» dall'elenco delle idee). **Tutto lato app, niente server toccato**: per due su tre il lato server (APP-ATHLON) resta da fare, e i contratti stanno in `docs/`.
`npx tsc --noEmit` pulito sui sorgenti (restano solo gli errori di `docs/classifica-server`, che non sono nostri).

### Il tuo mese in Athlon (`fit/Mese.tsx`, rotta `/allenamento/mese`)

Una scheda del mese di Train (giorni attivi, allenamenti, ore, giorni di fila, la lezione più fatta, il calendario con le palline accese) da guardare e da mandare. Si entra dalla carta «Il tuo ottobre in Athlon»
subito sotto il punteggio in Train (`CartaMese`, solo quando c'è qualcosa da mostrare e mai in vista cliente). Il mese di partenza è quello di oggi (se è ancora vuoto e il mese scorso no, quello scorso); due pillole
scelgono fra questo mese e il mese scorso.

- **Il calcolo è puro** (`fit/riepilogoMese.ts`, prova `LC_ALL=it_IT.UTF-8 npx tsx scripts/prova-riepilogo-mese.ts`: 10 gruppi, provati per mutazione): parte dalle stesse `Sessione` del punteggio (sedute chiuse, lezioni con la presenza,
  allenamenti dei dispositivi), un giorno è attivo da 20 minuti (`MINUTI_GIORNO_ATTIVO`), il giorno è quello di Roma. La «lezione più fatta» serve almeno due volte; la serie è di giorni di calendario di fila.
- **Solo Train, di proposito**: niente calorie, peso, diario o sonno (hanno un consenso a parte e non devono finire in una scheda da mandare a un amico). **Descrive e non confronta**: il mese prima è un numero in una riga, mai «meglio» o «peggio»,
  nessuna classifica. La stessa regola vale per le cifre mostrate e per l'immagine: dentro non c'è il nome della persona.
- **L'immagine è un PNG 1080×1350 disegnato con un canvas, solo sul web** (`fit/immagineMese.ts`: logo del club da `avvio/logo.ts`, i caratteri del club caricati con `document.fonts`). **La condivisione** (`fit/condividiMese.ts`): dove il browser sa condividere un file
  (`navigator.share` con `files`: telefoni, Safari) si apre il foglio di condivisione, altrimenti il PNG si scarica (`athlon-AAAA-MM.png`); «Scarica l'immagine» scarica sempre. **Sull'app nativa si condivide il testo** («Il mio ottobre da Athlon Roma: 9 giorni
  attivi, 9 allenamenti, 8 h.»): disegnare una vista in un file vuole `react-native-view-shot` e quindi una build nuova. Niente passa da un server.
- **Provato** (Chromium, bundle web esportato con `EXPO_PUBLIC_SUPABASE_URL` finto, funzioni simulate con `page.route`; 390 px chiaro e scuro, 1280 px): cifre giuste su dati noti (9 giorni, 9 allenamenti, 8 h, serie di 3, Pilates 5 volte), «Il mese prima» e il mese
  scorso, nessun «kcal», nessuno scorrimento orizzontale, il PNG scaricato (nome, 1080×1350, logo arancio presente, guardato a occhio), il mese vuoto senza comandi, la carta in Train (390 e 1280 px, assente senza dati) che porta alla schermata. **Non provato**: un telefono vero
  (`navigator.share` con file su Safari e Chrome Android, la qualità dell'immagine sullo schermo di una storia), l'app nativa (solo testo), l'inglese a schermo, la schermata con dati veri.

### Il QR per ritirare un ordine dello shop (`shop/CodiceRitiro.tsx`, `components/CodiceQr.tsx`, `lib/qr.ts`)

L'ordine **pagato e non ancora ritirato** mostra un QR e, sotto, un codice breve da dettare («Codice ordine 3F2A8C1E»): nella pagina dell'esito del pagamento e in «I miei ordini». Sparisce da solo quando la segreteria segna l'ordine consegnato (`consegnato_il`) e non compare per un ordine
non pagato o in errore (`daRitirare`, in `shop/ritiro.ts`, puro: `npx tsx scripts/prova-ritiro.ts`).

- **Cosa c'è nel QR**: `ATHLON-ORDINE:<ordine_id>`, e basta (niente nome, email o importo). **Non è una chiave**: chi lo legge trova l'ordine, e consegnare resta un gesto della segreteria. Il codice breve sono le prime otto lettere/cifre dell'id, in maiuscolo.
- **Nuova dipendenza: `qrcode`** (JavaScript puro) **e `@types/qrcode`**. Si importa **solo il nucleo** (`qrcode/lib/core/qrcode`, con un `@ts-expect-error` perché i tipi coprono solo l'ingresso principale): l'ingresso principale tira dentro `fs` e `pngjs` e non va in Metro. Il QR è sempre nero su bianco, anche nel tema scuro:
  un lettore non legge un QR chiaro su scuro. Un testo troppo lungo non solleva: il QR semplicemente non c'è.
- **Il CRM non è toccato**: finché la segreteria non può cercare un ordine con questo codice (lettore USB che scrive il testo e preme Invio, e ricerca per il codice breve), il QR è solo un modo di mostrare l'ordine. Cosa serve: `docs/ritiro-ordini-qr-crm.md`.
- **Provato**: il QR **decodificato con un lettore software (jsQR) dallo screenshot del browser** (testo identico all'originale) a 390 e 1280 px, tema chiaro e scuro, su esito e su «I miei ordini» (un QR solo, sul pagato da ritirare; nessuno sul ritirato e sul «in corso»). **Non provato**: un lettore da banco, la
  fotocamera di un telefono, una ricerca nel CRM.

### L'assistente propone una prenotazione, e prenota solo chi conferma (`assistente/PrenotaDaChat.tsx`, `assistente/prenotaDaChat.ts`)

Se la funzione manda nella risposta un'azione `prenota-lezione` (`{ class_id, giorno, member_id? }` + etichetta), nella chat compare un pulsante con la lezione proposta. Toccandolo si apre **una carta nella chat** che **rilegge la lezione dal calendario** (nome, orario e posti non vengono dal testo del modello) e
mostra gli stessi pulsanti del Calendario (`AzioniLezione` + `usePrenotazioneLezione`: prenota, lista d'attesa, disdici, acquista se non è compresa, i motivi per cui non si può: lezione cominciata, non ancora aperta, limite della categoria). **La prenotazione parte solo con «Prenota» sulla carta**;
aprire la carta non fa nessuna richiesta di scrittura. Dopo il clic la carta dice «Prenotata» / «In lista d'attesa» e la memoria del giorno del calendario si butta. Per un nucleo con più persone la carta dice «Per <nome>». Se il pagamento porta fuori dall'app il foglio si chiude.

- **Non è una destinazione**: `DESTINAZIONI_ASSISTENTE` (elenco chiuso, uguale alla mappa della funzione) **non è cambiato**, e `hrefAssistente('prenota-lezione')` torna null. Una proposta con `class_id` o `giorno` di forma sbagliata non è un pulsante (`prenotaDaAzione`).
- **La postilla sotto il campo resta vera** («non fa niente al posto tuo»): propone e la persona conferma.
- **LATO SERVER NON FATTO, quindi oggi non si vede mai**: `portale-lab-assistente` (APP-ATHLON) non manda ancora l'azione e il suo prompt non sa proporre. Contratto e regole che la funzione deve far rispettare (mai inventare un id, validazione in codice, etichetta scritta dal codice, una proposta per risposta): **`docs/assistente-prenota.md`**.
  Finché non c'è, l'app ignora ciò che non conosce e niente si rompe. **Non è stata cambiata la lista degli esempi** (una domanda di esempio «prenotami…» prometterebbe quello che la funzione non fa).
- **Provato** (Chromium, bundle web esportato, assistente simulato con un vero `text/event-stream` e calendario simulato; 390 px, 1280 px scuro): proposta → carta con 4 posti, **nessuna richiesta `prenota` finché non si tocca «Prenota»**, poi `prenota` con `class_id 555` e `member_id 100` una volta sola e «Prenotata» + «Disdici»; nucleo con «Per Giulia» e prenotazione col suo `member_id`;
  lezione non più in calendario (messaggio e «Apri il calendario del giorno»); completa («Lista d'attesa»), già cominciata, non ancora aperta, limite della categoria; lezione non compresa («Acquista e prenota», nessun addebito); rifiuto di PerfectGym (il motivo sulla carta); errore di lettura con «Riprova»; proposte
  di forma sbagliata (nessun pulsante, nessuna richiesta); la carta dentro i bordi dello schermo (un difetto trovato guardando lo screenshot e corretto: usciva dal foglio); nessuno scorrimento orizzontale. Le regole pure con `npx tsx scripts/prova-prenota-da-chat.ts` (4 gruppi, provati per mutazione).
  **Non provato**: **una risposta vera del modello**, un telefono, l'app nativa (la carta è la stessa, il pagamento passa dal Calendario), la vista cliente (la carta dell'assistente non c'è lì).


