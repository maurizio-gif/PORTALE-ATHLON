## Guide con video: una finestra alla prima apertura di una sezione, che porta alla scheda dell'Help Desk (08/11/2026)

Richiesta di Maurizio: «una notifica, pop up, finestra o altro che poi manda al relativo articolo dell'help desk sull'app con il video». Le guide e i
video stanno nell'Help Desk (SITO-ATHLON, PR #418, `CLAUDE.md` del sito: aree «L'app Athlon Club» e «Athlon Health System»); qui c'è solo la
finestra che le propone. **Solo JavaScript**: nessuna modifica a `app.json`, `package.json` o plugin, quindi parte con un aggiornamento via aria
(`eas update`), senza una build nuova.

- **Quando compare.** La prima volta che si apre una sezione: Home, Prenotazioni (`/calendario`), Junior (`/junior`), Certificato
  (`/?sezione=certificato`), Invita un amico (`/invita`) e Athlon Health System (`/allenamento`). Solo la schermata principale: dentro un piano, un
  pagamento o `/allenamento/punteggio` non c'è guida. Una sezione della Home diversa dal Certificato (Pagamenti, Documenti…) conta come Home.
- **Cosa dice.** «Guarda la guida» apre la scheda con `percorsoScheda(id)` (`clublife/link.ts`); «Non ora», la X, un tocco fuori e Esc la chiudono.
  I testi sono in `guide/testi.ts`, **in una funzione e non in costanti di modulo** (`t()` legge la lingua, e sul nativo il `localStorage` lo installa
  expo-sqlite dopo il caricamento dei moduli). In inglese la frase dice che video e articolo sono in italiano.
- **Una volta sola, per persona e per dispositivo**: `athlon:guida:<id utente>:<guida>` in `localStorage`. **Si segna quando la persona risponde**
  (Guarda o Non ora), non quando compare: se l'app si chiude con la finestra aperta, o se arriva una notifica e la finestra si ritira, la guida torna
  alla prossima apertura della sezione. **«Non ora» vale come vista**: non c'è un rimando dopo qualche giorno (a differenza dell'invito alle push). La
  guida si rivede sempre dall'Help Desk. Se serve un rimando, si cambia `segnaVista` in `GuidaPrimaVolta.rispondi`.
- **Solo nell'app, non sul web né nella PWA** (richiesta di Maurizio, stesso giorno): `guidaSuPiattaforma(Platform.OS)` in `guide.ts`, vera solo per
  `ios` e `android`. Chi apre `app.athlonroma.it` da un browser non la vede mai, anche dopo che la PR è unita e il web si ripubblica da `main`.
- **Una protezione intorno.** `GuidaPrimaVolta` è dentro un `Component` con `getDerivedStateFromError`: un errore mentre la finestra si disegna
  la fa sparire (un avviso in console) e il portale va avanti. La finestra è un invito, e sta nel layout globale: un suo guasto non deve mai
  portarsi dietro il resto. Non copre gli errori dentro i timer o le promesse, che comunque non smontano l'albero.
- **Dove si monta.** Una sola volta nel layout del portale (`app/(portale)/_layout.tsx`), accanto alle notifiche, con `sessione.user.id`. Non si
  monta sul totem né in vista cliente: li' nessuno impara l'app, e lo staff non deve segnare come viste le guide di un socio.
- **Cosa la tiene lontana.** L'avvio animato (3,7 s dall'apertura, come `Notifiche`), un istante (0,9 s) dopo l'arrivo nella sezione, una
  finestra del club da leggere (`useNotifiche().finestre`: le notifiche hanno la precedenza, e su iOS due modal insieme non stanno), e una scheda che
  non è nel feed di Club Life: **finché la PR del sito non è pubblicata la finestra non compare mai**, ed è voluto (una finestra che porta a una
  pagina che non c'è è peggio di nessuna).
- **Il feed (240 kB) si chiede solo se c'è una guida da proporre.** `GuidaPrimaVolta` decide con il solo `localStorage` e monta `Proposta` (che
  chiama `useClubLife`) soltanto allora: chi le ha viste tutte, o sta in una schermata senza guida, non scarica niente. La prima versione chiamava
  `useClubLife` sempre, cioè un feed da 240 kB a ogni apertura di ogni app.
- **Le guide sono sei, e le schede** `app/home`, `app/prenotazioni`, `app/junior`, `app/certificato`, `app/invita-un-amico`, `ahs/cos-e`
  (`guide.ts`, `SCHEDA_DI_GUIDA`). Rinominare una scheda sul sito vuol dire cambiarla qui: la prova `scripts/prova-guide.ts` controlla che siano
  sei, diverse e nelle due aree nuove.
- **Il primo avvio non la vede.** L'aggiornamento via aria si applica dal secondo avvio, quindi chi installa la 3.0.0 apre l'app la prima volta con il
  codice della build, senza finestra. Per averla anche lì servirebbe una build nuova.
- **Provato**: `scripts/prova-guide.ts` (8 prove: la guida di ogni schermata, la sezione Certificato, nessuna guida dentro le sezioni, il «già visto»
  per persona, la memoria che solleva, la scheda assente dal feed); `tsc` senza errori in `src/` (i 45 errori che restano sono in `docs/` e
  `scripts/`, come prima); `FinestraGuida` su una pagina di prova temporanea (poi cancellata) in Chromium dall'esportazione web: 390×844 in chiaro e
  scuro, in italiano e in inglese, e 320×568 (nessuno scorrimento orizzontale, nessun errore in console); Guarda, Non ora, X, tocco fuori ed Esc
  rispondono come devono. Nella pagina di prova il carattere era quello di sistema perché stava fuori dal layout che carica Plus Jakarta Sans.
- **Non provato**: la finestra dentro il portale vero, con una sessione (il rilevamento della sezione da `usePathname` e `useGlobalSearchParams`, l'attesa
  dopo l'avvio, il passaggio con una finestra del club aperta); l'app nativa su un iPhone; il feed con le guide vere, perché la PR del sito non è unita.
  Nessuna misura di chi guarda la guida: non è stata chiesta.
