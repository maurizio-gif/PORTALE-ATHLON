## «Gare»: il pagamento a passi, come l'abbonamento e il Guest Pass, ma più snello (07/11/2026)

Richiesta di Maurizio: «sistema anche con la stessa logica grafica la prenotazione della gara da link: ovviamente è un prodotto e deve essere più snella». **Interpretazione mia, da confermare**: «la gara da link» è l'iscrizione al Trofeo Athlon (sezione 110, 122) a cui il genitore arriva dal link del sito (`/entra`, destinazione `gare`, sezione «Entra» dal sito: apre `/junior?voce=gare`). Non sono eventi di PerfectGym (le gare stanno in `gare*` sul database, e `eventi_prenotabili` non ne ha); la pagina «Prenota evento» dei link per email (`PrenotaEvento`, `/r/<token>`) è un'altra cosa e **non è stata toccata**. Se per «gara da link» intendevi un'altra cosa, o un link vero da mandare al genitore (come il Guest Pass e l'abbonamento dal CRM), serve una decisione tua prima di costruirlo. **Solo l'app**: nessuna funzione, nessuna migrazione.

**Com'era.** L'iscrizione e il pagamento stavano dentro la carta della gara: il modulo si apriva e si chiudeva sotto la prova, e le carte salvate erano righe a bordo colorato, diverse dalle schede a scelta dell'abbonamento e del Guest Pass.

**Com'è adesso** (`src/features/lab/junior/Gare.tsx`):
- **Due soli passi**, perché è un prodotto da 8 €: niente dati da confermare, niente contratto. **Il primo passo è la carta della gara** (la gara, a che ora, la prova, «Iscrivi Sara e paga 8 €»), com'era; **il secondo è il pagamento, in una vista sua** (`PagaGara`): «Passo 2 di 2 · Pagamento» con lo stesso `Indicatore` dell'abbonamento.
- Sopra il pagamento si rivede **cosa si compra**: la gara, «8 € una tantum · per Sara» e il riquadro scuro del turno (convocazione e inizio gara, la cosa che il genitore deve ricordare).
- **Come paghi** con le schede a scelta col pallino (`SchedaScelta`): ogni carta salvata («Visa •••• 2365, scade 09/28 · addebito con un tocco, senza codici»), il conto salvato (se c'è, con la spunta dell'autorizzazione e l'importo), e **«Un'altra carta»** (il modulo sicuro di Adyen, che la salva). Con una carta o un conto salvati la scelta resta in vista anche scegliendo «Un'altra carta», e si può tornare indietro. Senza niente di salvato si va dritti al modulo.
- **Il sesso da scegliere** (solo se il codice fiscale non lo dice: 69 bambini su 1.135) sono due schede, ognuna con la sua ora a destra, al posto delle due tessere affiancate.
- Dopo il pagamento compare **«Torna alle gare»** (prima il modulo restava aperto nella carta). Il banner «Stiamo confermando il pagamento…» e il passaggio a «Iscritto» sono quelli di prima.

**Cosa NON è cambiato.** Ogni regola e ogni chiamata a `portale-lab-gare` (`iscrivi`, `carte`, `conto`, `paga_carta`, `paga_conto`, `sessione`, `esito`, `paga`), il Drop-in di Adyen e il ritorno dalla 3D Secure, il link nel browser integrato dell'app nativa (senza Drop-in), la conferma che resta del webhook, la quota non rimborsabile, la vista cliente (i comandi restano chiusi). `CassaGara` ha la stessa macchina a stati (`carico`, `carte`, `nuova`): è cambiato solo come si disegna. Anche «Manca il pagamento» (iscritto ma non pagato) e «L'addebito sul conto non è riuscito» aprono la stessa vista.

**Scelte da guardare** (sono la parte «bozza»):
- **Il passo 1 non ha un indicatore suo**: è la carta della gara, in mezzo alla lista delle tre gare; «Passo 2 di 2» compare quando si paga. Se vuoi «Passo 1 di 2» anche in cima alla carta, o una vista sola per tutto, si cambia.
- **Un tocco in più non c'è**: «Iscrivi Sara e paga 8 €» crea l'iscrizione e apre subito il pagamento, come prima.
- L'indicatore ha scritto «Gara» e «Pagamento».

- **Provato**: `tsc` senza errori nuovi (45, quelli di base); nel browser (Chromium, bundle web, funzione `portale-lab-gare` finta, pagina di prova temporanea tolta dal commit) a 390 pixel, chiaro e scuro: la carta della gara con il codice fiscale che dice il sesso, il pagamento con carta salvata, conto salvato e «Un'altra carta», il pagamento riuscito con «Torna alle gare», la scelta del sesso a schede, e nessuna carta salvata (il modulo di Adyen non si è caricato, perché nella prova lo script di Adyen era bloccato: si è visto solo l'errore e «Riprova»).
- **Non provato**: il pagamento vero (carta salvata con un tocco, conto SEPA, il modulo di Adyen che si scrive, la 3D Secure e il ritorno); l'app nativa; un telefono vero; la lingua inglese; il computer largo; «Manca il pagamento» e «L'addebito non è riuscito» (stessa vista, non guardati a parte).
- **Ordine di pubblicazione**: solo questa app, nessuna funzione da pubblicare.
