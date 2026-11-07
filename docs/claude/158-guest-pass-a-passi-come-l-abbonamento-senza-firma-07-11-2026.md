## Il Guest Pass dal link a passi, come l'abbonamento ma senza firma (07/11/2026)

**BOZZA**, richiesta di Maurizio: «la procedura del link del Guest Pass e quella di attivazione che si fa anche dall'app: fammi una bozza, cerca di farla uguale a quella dell'attivazione dell'abbonamento, soltanto senza firma del contratto, quindi un po' più snella sulla parte della firma; a livello grafico cerca di allinearla». Solo l'app (PORTALE-ATHLON): **nessuna funzione e nessuna migrazione nuova**. Pagina: `src/features/guest-pass/AttivaGuestPass.tsx`; stessa pagina per il link dell'email (`/r/<codice>`) e per «Attiva la prova» da dentro l'app (`ProvaDallApp`, che porta a `/r/<codice>`). Sezioni di partenza: 27 (il Guest Pass per sé o per un figlio), 29 (la prova in vetrina), 30 («Attiva la prova» dall'app).

**Com'era.** Una pagina lunga, con quattro riquadri numerati (dati, giorno, come paghi, riepilogo e condizioni) e un solo «Conferma e attiva» in fondo, in uno stile suo (`Blocco`, `Scelta`, `Campo`, `Bottone`) diverso da quello dell'abbonamento.

**Com'è adesso.** La stessa procedura dell'abbonamento dal link (`AbbonamentoDaProposta`): **«Passo N di 4», una cosa per volta**, con lo stesso `Indicatore`, le stesse schede (`SchedaScelta` col pallino, `Carta` piatta, `Sezione`), gli stessi pulsanti (`Pulsante` con l'arancio sfumato, «Indietro» in testo) e gli stessi campi (`CampoTesto`, a etichetta piccola in maiuscoletto).

| Passo | Cosa c'è | Al posto di (abbonamento) |
|---|---|---|
| 1 · **Dati** | la prova in vetrina (`PrezzoProva`, `AttivitaComprese`), per chi è (`PerChi`), i tuoi dati, «I miei dati sono corretti», la password se l'account è nuovo | Verifica |
| 2 · **Giorno** | «La tua scelta» (Guest Pass · 1 settimana · prezzo · per chi) e i giorni d'inizio, in una griglia (tutti i 15 in vista, non una fila da scorrere) | Giorno |
| 3 · **Pagamento** | il metodo come tre schede a scelta: un metodo già salvato (carta o conto), una carta nuova, un conto nuovo (il modulo IBAN si apre sotto) | Pagamento |
| 4 · **Conferma** | il riepilogo, «Le condizioni in breve», «Regole di prenotazione», un riquadro «Niente da firmare», **un solo flag** e «Conferma e paga / attiva» | **Contratto e firma** (qui sparisce) |

**Cosa NON è cambiato.** Ogni regola, ogni controllo e ogni chiamata al server: `salva`, `conferma`, `scegli`, `iban`, `carta_esito`, `pagamento_esito`, `ripaga`, `anche_per`; i consensi (36 e 20) con il solo flag; il pronto-per-confermare (`pronto`: dati, per chi, password, consensi, giorno, metodo, e nessuna verifica della segreteria in corso); le correzioni dei dati che vanno su PerfectGym alla spunta; la password solo a chi crea l'account; l'invito (`non_nuovo`); il giorno d'inizio per un figlio (prima dei 18 anni); la vetrina dei 30/10. I passi sono **solo presentazione**: lo stato resta quello di prima, sul server.

**Da dove si riparte** (`passoIniziale` in `src/lib/guestPassPassi.ts`). Chi riapre il link a metà, o torna dalla pagina della carta (`?carta=1`), non ricomincia dai dati ma dal primo passo che manca: dati completi e confermati → giorno → metodo → conferma. Si torna al passo 1 se mancano i dati, se non si è scelto per chi, se i dati sono diventati incompleti, o se chi crea l'account deve ancora scrivere la password (non si salva fra un passo e l'altro). Dal ritorno della carta si va alla conferma.

**La pagina «Manca il pagamento»** (Guest Pass registrato, quota da pagare) ha lo stesso vestito: `Sezione`, `Pulsante`, `Carta`, `CampoTesto`. La pagina finale **«Il tuo Guest Pass è attivo»** (`GuestPassAttivo`) **non è stata toccata**: è la lettera di conferma (sezione 27), e nell'abbonamento non ha un equivalente.

**Scelte da guardare** (sono la parte «bozza»):
- **La firma diventa un riquadro e un flag.** Il quarto passo dice «Niente da firmare» (`Messaggio` attenzione, come «Adesso il contratto» dell'abbonamento) e c'è una sola spunta per i consensi. Il testo del riquadro è mio: si cambia in un attimo.
- **I giorni in griglia, non in fila.** L'abbonamento li mette in una fila che scorre; qui sono quindici e tutti in vista (quattro per riga sul telefono, sette sul computer). Se li vuoi identici all'abbonamento si rimette la fila.
- **La vetrina resta solo al passo 1**, sopra i dati (come il listino nel primo passo dell'abbonamento). Nei passi dopo non c'è: c'è «La tua scelta».
- **L'«Indietro» a ogni passo** e un «Continua» che resta spento finché il passo non è completo, con sotto cosa manca.

**Altri file toccati.** `PerChi.tsx` (le persone sono `SchedaScelta`, non più riquadri pieni arancio); `SchedaScelta` in `lab/abbonamento/Passi.tsx` ha ora `spenta` (una persona non idonea si vede ma non si sceglie); `CampoData` e `CampoTelefono` hanno `variante="lab"` (come `CampoPaese`; di default restano quelli di prima, e gli altri usi non cambiano). `src/lib/guestPassPassi.ts` è la parte pura (dati, metodo di partenza, passo), provata a parte.

- **Provato**: `LC_ALL=it_IT.UTF-8 npx tsx scripts/prova-guest-pass-passi.ts` (20 prove: dati completi, codice fiscale che manca / scritto male / di un'altra persona, residente all'estero con e senza Paese, metodo di partenza, e da dove si riparte in ogni caso; quattro mutazioni del codice, tutte individuate); `tsc` senza errori nuovi (45, quelli di base); il giro intero (per chi → dati → giorno → pagamento → conferma) nel browser (Chromium, bundle web, funzione `portale-link` finta) a 390 e a 1280 pixel, chiaro e scuro; un figlio con la dichiarazione del tutore; il conto nuovo con il modulo IBAN; la ripartenza dal passo 2, 3 e 4; «Manca il pagamento»; password e verifica della segreteria.
- **Non provato**: su un telefono vero; l'attivazione e il pagamento veri con Adyen o GoCardless (nel browser la funzione era finta: si è visto come appare, non che il server attivi); il ritorno dalla pagina della carta con un `?carta=1` vero; la lingua inglese; un figlio **nuovo** (che il club non conosce) dal modulo `PerChi`; la pagina «Il tuo Guest Pass è attivo».
- **Ordine di pubblicazione**: solo questa app. Nessuna funzione cambia: con il server di oggi funziona, e un link già mandato si apre nella versione nuova.
