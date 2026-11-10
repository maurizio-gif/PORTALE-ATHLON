## In lista d'attesa senza le notifiche: l'invito ad attivarle, con il pulsante (10/11/2026)

Richiesta di Maurizio, dopo aver spento l'SMS del subentro (`CLAUDE.md` di APP-ATHLON, sezione 217): «quando l'utente si mette in lista d'attesa, devi verificare che abbia le
notifiche push attive, se non le ha consiglia di attivarle per essere avvisato e metti direttamente il pulsante per attivarle». Senza l'SMS, chi aspetta un posto lo sa
dall'email e dalla notifica in app, e la notifica arriva fuori dall'app solo con la push (`push_subentro`, APP-ATHLON 207). **Solo app, nessun cambio lato server.**

- **Dove compare** (`notifiche/InvitoPushAttesa.tsx`, agganciato in `Calendario.tsx`):
  1. **sotto i pulsanti di una lezione in cui si è in lista d'attesa**, dentro `AzioniLezione` (`!l.iniziata && b?.attesa && !conferma`). `AzioniLezione` è la stessa card per il
     Calendario, i Consigli, il Percorso, Junior e la chat dell'assistente (`PrenotaDaChat`): l'invito c'è ovunque ci si possa mettere in lista. Compare **subito dopo il tocco su
     «Lista d'attesa»** (la lezione prende la prenotazione `attesa` e si ridisegna) e **resta finché si è in lista** e le notifiche non sono attive, anche alla riapertura della pagina;
     non si mostra a lezione iniziata né mentre si sta confermando la disdetta;
  2. **sotto «Pagamento ricevuto: sei in lista d'attesa»**, quando si è pagato e i posti sono finiti nel frattempo (`ritorno.stato === 'attesa'`).
- **Quando e cosa lo decide `invitoPushRichiesta(stato, dispositivi)`** (`assistenza/richieste.ts`, puro): **la stessa regola dell'invito di «Scrivi al team»** (sezione 190), non una copia: se
  cambia là, cambia qui (`scripts/prova-invito-push-attesa.ts` controlla che il componente la chiami e non la rifaccia).

  | situazione | cosa si vede |
  | --- | --- |
  | push spenta e nessun dispositivo del nucleo con le notifiche attive | titolo «Attiva le notifiche per sapere se si libera un posto», testo e **pulsante «Attiva le notifiche»** (un tocco: il permesso va chiesto dentro il tocco) |
  | bloccata dal browser o dall'app | il testo dice come sbloccarle (impostazioni del telefono o del browser), **senza pulsante**: da qui non si può |
  | iPhone dal web senza l'app sulla schermata Home | il testo dice come aggiungerla, **senza pulsante** |
  | già attive su questo dispositivo, o **su un altro del nucleo** (`dispositivi > 0`: la push segue il nucleo, quindi l'avviso le arriva lì) | niente |
  | browser senza push, totem, club senza chiavi sul server, o ancora in verifica | niente |

  In più, **niente per chi non ha le notifiche nell'app** (`useNotifiche().attivo` falso) e **niente in vista cliente dal CRM** (`vistaCorrente()`): attivarle registrerebbe il browser
  dell'operatore sul cliente. (L'invito di «Scrivi al team» questa guardia non l'ha: non cambiato qui.)
- **Dopo il tocco**: usa lo stesso `usePush` della carta in Home, quindi le altre carte si aggiornano; per sei secondi la carta diventa verde, «Notifiche attivate · Ti avvisiamo appena si
  libera un posto, anche con l'app chiusa» (`useAppenaAttivate`), e poi sparisce. Se il permesso viene negato o il browser non riesce, resta l'invito con il messaggio d'errore di `usePush`.
  **Non c'è «Non ora»**: è un invito legato a una lezione in cui si è in lista, non una carta fissa.
- **Il testo non promette l'SMS**: dice «se si libera un posto subentri tu» (è il comportamento di PerfectGym: il subentro è automatico) e «ti avvisiamo con le notifiche». L'email del subentro
  parte comunque, e il messaggio dopo il pagamento continua a dirlo («ti avvisiamo via email»).
- **Provato**:
  - `npx tsx scripts/prova-invito-push-attesa.ts` (6 gruppi: la regola su 11 casi, il componente che la usa e non la copia, il pulsante solo per «attiva» e solo uno, le guardie, i due punti in cui
    compare, e `AzioniLezione` usata da Consigli, Percorso, Junior e chat). **Provata per mutazione**: 8 modifiche del codice (invito a chi è solo prenotato, a lezione iniziata, senza invito dopo
    il pagamento, anche in vista cliente, a chi non ha le notifiche, pulsante anche dove non si può attivare, regola copiata, senza il «fatto»), tutte rilevate;
  - `npx tsc --noEmit`: nessun errore nuovo (restano quelli di `docs/classifica-server` e di `scripts/prova-ordine-piani.ts`, già presenti);
  - **nel browser**: bundle web esportato (`expo export -p web`) e Chromium con sessione, funzioni e servizio push simulati (`page.route` e un finto `serviceWorker`, nessuna richiesta esce), pagina
    `/calendario` con una lezione in lista d'attesa. Push spenta: invito e pulsante visibili, **un tocco chiama `push_iscrivi`**, compare «Notifiche attivate» e **dopo sei secondi sparisce**, a
    390 px in italiano, in inglese, in tema scuro e a 360 px, nessuno scorrimento orizzontale. Notifiche già attive e notifiche attive su un altro dispositivo: **nessun invito**. Bloccate:
    il testo senza pulsante. **Il momento della richiesta**: una lezione piena non prenotata, prima del tocco nessun invito, dopo il tocco su «Lista d'attesa» (`prenota` risponde `attesa`)
    l'invito compare subito.
- **Non provato**: **su un telefono vero** (permesso vero del browser o di iOS/Android, app nativa, l'iPhone dal web con il testo «Aggiungi alla schermata Home»); la card dentro il Percorso, i Consigli, Junior e la
  chat dell'assistente (usano `AzioniLezione`, ma nessuna è stata guardata); il caso dopo il pagamento (`ritorno.stato === 'attesa'`); la vista cliente; una push del subentro vera.
- **Pubblicazione**: il **web** esce con la fusione. **L'app nativa ha bisogno di un aggiornamento OTA** (`eas update`, canale `production`, un gruppo per runtime: sezione 191), non fatto qui.
