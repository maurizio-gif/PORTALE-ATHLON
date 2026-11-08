## `/entra` e la conferma della delega funzionano anche nell'app nativa: il token si legge dal link che l'ha aperta (08/11/2026)

Richiesta di Maurizio: i link delle email devono aprire l'app, non Safari, per chi ha l'app installata. **Questo è il passo 1 di due**: l'app nativa impara a
leggere il token di accesso del link che l'ha aperta. **Il passo 2** — servire `/.well-known/apple-app-site-association` perché iOS dia i link all'app — **non
è fatto**, e non si fa prima di aver provato il passo 1 su un iPhone vero. Finché il file non c'è, nessun link universale arriva all'app e questo codice
non cambia niente per nessuno (arrivano solo gli indirizzi `athlon://…`, che oggi non manda nessuno).

- **Il problema.** I link delle email portano l'accesso monouso **nel frammento**: `/entra?d=…#th=<token>` (i link dal sito: prenota, gare, certificato, Junior,
  iscrizione) e `/delega/conferma/<codice>#th=<token>`. Il frammento non parte verso nessun server, e sul web lo legge `leggiEToglieToken` da
  `window.location.hash`. **Nell'app nativa non c'è nessuna `window`**, e `leggiEToglieToken` usciva subito se non era il web: aprendo `/entra` nell'app, la pagina non
  avrebbe trovato il token e avrebbe detto «Questo link non è più valido». Per questo `/entra` era rimasto fuori dall'app di proposito (commento in `app/entra.tsx`).
- **Dove sta il token nell'app.** Il sistema consegna l'indirizzo intero a `Linking` (`getInitialURL` se l'app era chiusa, l'evento `url` se era aperta). Il
  router, per i link `https://` (universali), lascia il frammento fra i parametri della rotta con il nome `'#'` (`th=<token>`); **per i link con lo schema dell'app
  (`athlon://entra?…#th=…`) lo perde** (`fromDeepLink` in `expo-router` non copia l'hash). Per questo le strade sono due, e la pagina le prova tutte e due.
- **Come è fatto.**
  - `src/lib/linkToken.ts` — la parte pura, senza React né moduli nativi: `tokenDaUrl`, `tokenDaFrammento`, `percorsoDi`, `corrisponde` e `memoriaLink`, che
    tiene l'ultimo token visto, **per quel percorso**, **per 15 minuti** e **una volta sola**. Provato con `node --experimental-strip-types scripts/prova-link-token.ts`
    (14 prove).
  - `src/lib/urlApertura.ts` — il lato nativo: ascolta `Linking` dall'avvio (`void ascoltaIndirizzi()` in `app/_layout.tsx`, dentro un `try`: un guasto lì non ferma l'app)
    e dà il token a chi lo chiede (`tokenDelLinkAperto`). Sul web non fa niente.
  - `accessoDalCrm.ts` → `leggiTokenDelLink(percorso, frammento)`: sul web è `leggiEToglieToken` (la lettura è subito, perché il frammento si toglie in quel momento),
    nell'app è la strada di sopra; **un token già provato non si riprende** (`usati`). Lo usano `EntraDalSito` (`/entra`) e `ConfermaDelega` (`/delega/conferma`).
  - Il percorso conta: un token visto da `/delega/…` non serve a `/entra`.
- **La pagina nell'app è la stessa**, con il suo tocco: «Entra nell'app» / «Conferma». Il tocco non serve contro i controlli automatici delle email (nell'app il link lo apre una
  persona), ma toglie un rischio: un token che si brucia a un'apertura per sbaglio. Si può togliere in seguito se il passo in più dà fastidio.
- **Come provarlo senza il file di Apple**, su un iPhone con l'app: chiedere un link dal sito (per esempio dalla scheda «Certificato medico» del wiki), tenere premuto il link
  nell'email, copiarlo e incollarlo in Safari **cambiando `https://app.athlonroma.it/` in `athlon://`** (`athlon://entra?d=certificato#th=…`). iOS chiede «Aprire in Athlon
  Club?», e l'app mostra la pagina con il pulsante. Provare **a freddo** (app chiusa) e **a caldo** (app aperta in un'altra schermata), e anche **un secondo tocco** sullo stesso
  link (deve dire «link non valido», non entrare di nuovo).
- **Provato**: le 14 prove della parte pura; `tsc` senza errori in `src/`; il web (`/entra` con e senza token, pagina inglese) su un export, con Supabase intercettato.
  **Non provato**: tutto il lato nativo (`Linking`, il router nativo, il parametro `'#'`): non c'è un telefono né un simulatore qui. È il motivo del passo 1 separato.
- **Ordine**: questo aggiornamento via aria (`eas update`, solo JavaScript, runtime 3.0.0) prima; il file di Apple dopo la prova. Il passo 2 deve includere nei percorsi
  `/entra`, `/delega/` e `/r/` e tenere fuori ciò che l'app non sa fare come il web; vedi la nota sui link universali in `118-pubblicazione-app-store`.
