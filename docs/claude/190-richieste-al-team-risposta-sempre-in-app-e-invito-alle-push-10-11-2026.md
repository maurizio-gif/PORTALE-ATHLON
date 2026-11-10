## «Scrivi al team»: la risposta arriva sempre nell'app, la carta non chiede più dove, e senza push compare l'invito ad attivarle (10/11/2026)

Richiesta di Maurizio: nelle richieste di assistenza dall'app **non si offre più l'email come canale** («specifichi che riceverà la risposta direttamente in app»), e **a chi manda una richiesta senza le notifiche push attive compare un messaggio per attivarle**, per essere avvisato. Al desk, intanto, non parte più l'email con il messaggio (lato server: `CLAUDE.md` di APP-ATHLON, sezione 209). **Sostituisce la scelta della sezione 168**; il resto della 168 (l'elenco «Le tue richieste», il filo, il pallino, chi riscrive) resta com'è.

- **La carta «Scrivi al team»** (`assistente/ScriviAlTeam.tsx`) non ha più «Dove vuoi la risposta?» con le due scelte (tolti `Scelta`, lo stato `canale`, l'email di accesso mostrata come destinazione). Al suo posto una riga con la campanella che dice: «Il team ti risponde qui, nell'app: ti avvisiamo con una notifica e leggi la risposta nella tua richiesta. Puoi anche rispondere.» (anche in inglese). `scriviAlTeam` non prende più il canale e chiede sempre `app` (`canale: 'app' satisfies CanaleTicket`): una funzione di prima rifiuta la richiesta senza canale.
- **Dopo l'invio si dice il canale che il server ha registrato, non quello chiesto** (invariato: `canaleRegistrato('app', r.canale)`). Con la funzione nuova è sempre `app`; con una di prima che ignora la richiesta e fa un ticket per email, la schermata continua a dire «ti risponde via email» invece di promettere l'app.
- **L'invito ad attivare le notifiche** (`assistenza/InvitoPush.tsx`, `InvitoPushRichiesta`). Compare in due punti: sotto «Fatto» appena inviata la richiesta, e in cima al filo di una richiesta ancora senza risposta (`FiloRichiesta`: canale `app`, stato `nuovo`, nessun messaggio del team). Titolo: «Attiva le notifiche per sapere quando risponde». **Quando e cosa lo decide `invitoPushRichiesta(stato, dispositivi)`** (`assistenza/richieste.ts`, puro):

  | situazione | invito |
  | --- | --- |
  | push spenta, nessun dispositivo della persona con le notifiche attive | `attiva`: testo e pulsante «Attiva le notifiche» (un tocco: il permesso va chiesto dentro il tocco) |
  | bloccata dal browser o dall'app | `sbloccare`: dice come (impostazioni del telefono o del browser), senza pulsante |
  | iPhone dal web senza l'app aggiunta alla schermata Home | `installare`: dice come, senza pulsante |
  | già attive, o un **altro dispositivo** della persona le ha attive (`dispositivi > 0`, è del nucleo e non di questo browser: l'avviso le arriva lì) | niente |
  | browser senza push, totem, club senza chiavi sul server, o ancora in verifica | niente |

  Attivate dal pulsante, per sei secondi dice «Notifiche attivate: ti avvisiamo appena il team risponde, anche con l'app chiusa» (`useAppenaAttivate`) e poi sparisce. Usa lo stesso `usePush` della carta in Home e del centro notifiche, quindi le altre carte si aggiornano. **Non c'è «Non ora»**: è un invito legato a questa richiesta, non una carta fissa; sparisce quando il team risponde o le notifiche sono attive. Niente per chi non ha le notifiche nell'app (`useNotifiche().attivo` falso).
- **I ticket già aperti con la risposta via email restano leggibili**: il filo dice «Risposta via email» e «se vuoi aggiungere qualcosa, rispondi all'email del team» come prima.
- **Provato**:
  - `npx tsx scripts/prova-assistente.ts` (16 gruppi; due nuovi: `invitoPushRichiesta` su tutti gli stati e il controllo dei sorgenti della carta, della chiamata e del filo). **Provata per mutazione**: 9 modifiche (invito senza il controllo dei dispositivi, soglia dei dispositivi, ogni stato che cambia invito, la chiamata che chiede `email`, la carta o il filo senza invito, il filo anche a ticket risposto), tutte rilevate;
  - `tsc --noEmit` senza errori nuovi (restano quelli di `docs/classifica-server` e di `scripts/prova-ordine-piani.ts`, preesistenti).
- **Non provato**: **le schermate non sono state guardate renderizzate** (390 e 1280 px, chiaro e scuro, italiano e inglese), né su un telefono; l'invito con un permesso vero del browser o di iOS/Android; la funzione vera.
- **Ordine di pubblicazione**: prima la funzione `portale-lab-assistente` (APP-ATHLON, 209), poi l'app. Con l'app nuova e la funzione vecchia la richiesta chiede `app` e funziona, ma al desk parte ancora l'email.
