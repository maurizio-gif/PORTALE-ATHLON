# La delega sui figli a un altro adulto: contratto per il lato server (31/10/2026)

Richiesta di Maurizio: in **Home › Famiglia** e in **Junior**, «Aggiungi un componente» offre due strade: **un figlio** (com'era, con il controllo di
duplicazione e il blocco con evidenza nel CRM) e **un altro adulto**, a cui il titolare dà la **delega a vedere e agire** sui figli. Funziona come il referral:
il titolare genera un link e lo manda (WhatsApp, SMS, email, copia); chi lo apre compila nome, cognome, email, cellulare e data di nascita, **conferma dalla sua email**,
e viene collegato come *spouse* al titolare e come *parent* ai bambini (creato su PerfectGym come Guest se nuovo; **se esiste già si usa la sua scheda e basta**).

**Aggiornamento (31/10/2026, seconda richiesta di Maurizio):** (1) se il genitore invitato **esiste già** al club, non si blocca niente: si conferma e si abbina; (2) il modulo **non abbina nessuno**,
manda un'email con un link per terminare la procedura. Le due cose si tengono: l'email verificata è ciò che rende sicuro abbinare una scheda esistente.

**Questo file è il contratto che l'app (PORTALE-ATHLON) già usa. Il lato server (APP-ATHLON) non è scritto.** Finché le due funzioni non rispondono, la
schermata `/delega` dice «non è ancora attiva» (404) e la pagina `/delega/<codice>` dice che il link non è valido: niente si rompe, ma nemmeno funziona.
**Pubblicare prima il server, poi l'app.**

## ⚠️ Da decidere prima di scrivere il server: PerfectGym non permette di scrivere le relazioni

Letto il file `docs/perfectgym_api_v2.2.json` di APP-ATHLON:

- Le relazioni fra persone (`MemberRelations`: `FriendAccess`, `FamilyChild`, `ContractPayer`, `LegalGuardian`, `Spouse`) si **leggono** (`GET /v2.2/odata/MemberRelations`)
  ma **non c'è nessun endpoint per crearle o toglierle** fra due schede che esistono già. L'unico modo documentato di creare un legame è `parentMemberId` in
  `AddGuestMember`, cioè **alla nascita di un figlio** (è quello che fa `aggiungi` di `portale-lab-junior`). Non si può dire «Laura è coniuge di Marco» né
  «Laura è genitore di Sara» via API.
- **Tutto il portale ricava il nucleo da quelle relazioni**: `public.metodo_nucleo_da_email(email)` (usata da 23 funzioni) prende i figli da `perfectgym.member_relations`
  con tipo `FamilyChild` o `LegalGuardian`, e **il coniuge è escluso di proposito** (migrazione `20261004d`: «Spouse è una relazione fra due adulti»). Anche
  `portale_la_mia_area` (la Home) passa da quella funzione; newsletter, promemoria e certificati leggono invece `member_relations` direttamente, e con la strada A
  **non vedrebbero la delega** (un delegato non riceverebbe le email del figlio: è giusto, ma va saputo). Quindi, anche se un giorno la relazione si potesse scrivere, **un legame «spouse» al
  titolare non darebbe nessun accesso ai figli**: serve il legame con ogni figlio.
- Il mirror (`perfectgym.*`) si sovrascrive a ogni sincronizzazione: una riga di relazione inserita a mano nel database **sparisce** al giro dopo.

### Le strade

| | Cosa fa il server | Pro | Contro |
|---|---|---|---|
| **A. Delega nel nostro database + compito alla segreteria** (**consigliata**) | Tabella `nucleo_deleghe` (titolare, delegato, figli, stato). `metodo_nucleo_da_email` (e le poche funzioni SQL che costruiscono il nucleo) la uniscono alle relazioni di PerfectGym. Il delegato viene creato su PerfectGym come Guest se nuovo (`AddGuestMember`, documentato). Per la relazione su PerfectGym parte **un compito in Agenda/Dashboard** per la segreteria («collega Laura come coniuge di Marco e genitore di Sara e Luca»), che la scrive a mano. | L'app funziona subito, anche senza PerfectGym. Una sola modifica alla funzione centrale. Revoca immediata. | La relazione su PerfectGym è manuale: finché non c'è, PerfectGym non sa della delega (non cambia nulla per le funzioni, che usano le credenziali del club). |
| **B. Chiedere a PerfectGym** | Se il supporto di PerfectGym ha un endpoint non documentato per creare `Spouse`/`FamilyChild`/`LegalGuardian`, il server lo chiama e il mirror lo rilegge. | Una sola fonte di verità (PerfectGym), nessun compito manuale. | Non esiste nella documentazione; tempi e esito incerti. Va fatto **prima** di scegliere. |
| **C. Solo segreteria** | L'app raccoglie i dati e manda un compito; la delega parte quando la segreteria ha scritto la relazione e il mirror l'ha letta. | Nessuna modifica al nucleo. | Non è «automatica»; il delegato aspetta; il titolare non può togliere l'accesso da solo. |

Consiglio: **A**, e intanto **B** come domanda a PerfectGym (se risponde sì, il compito manuale si sostituisce con la chiamata, senza toccare l'app).

### Conseguenze di A da confermare

1. **Cosa può fare il delegato.** Con il nucleo unito, il delegato (adulto con la sua email) può fare per i figli **tutto quello che fa un genitore** nell'app: prenotare e
   disdire, pagare le quote scadute, **cambiare il metodo di pagamento** e **disdire l'abbonamento** dei figli, caricare il certificato, iscriverli a un gruppo Junior,
   **aggiungere altri figli** al nucleo. È «vedere ed agire» come richiesto, ma disdetta e cambio carta sono azioni pesanti: se si vuole un livello «solo prenotazioni»
   si limita nella funzione, non nell'app.
2. **Il delegato non è un titolare con gli stessi dati**: non vede l'abbonamento, i pagamenti né i dati del titolare (il coniuge resta escluso dal nucleo, com'è oggi).
   Vede i figli, e il suo nucleo è lui + i figli.
3. **Il portale oggi è aperto solo ai tester** (`ammessoAlPortale`): chi accetta una delega va **aggiunto ai tester** nello stesso passo, o riceverà 403 al primo accesso.
4. **«Spouse» a chi non è il coniuge.** La richiesta è di legarlo come *spouse*; per una nonna o un amico di famiglia è il tipo meno sbagliato fra quelli di PerfectGym
   (`LegalGuardian` sarebbe un'attribuzione legale). Nel compito per la segreteria va scritto **chi è** («delegato dal titolare»), non «coniuge», per non fare confusione nella scheda.

## `portale-lab-delega` (con la sessione del titolare)

Stesso schema di `portale-lab-referral`: `cancello`, `utentePortale`, `ammessoAlPortale`, `vietataInVista` (nessuna azione in `LETTURE`: **in vista cliente è tutto chiuso**).
Il titolare viene da `metodo_nucleo_da_email(email della sessione)`, **mai dal corpo**.

```
POST { azione: 'stato' }
  <- { ok, idoneo: false, motivo }
   | { ok, idoneo: true,
       figli: ['Sara', 'Luca'],             // solo i nomi, dei minorenni del nucleo
       massimo: 2,                          // deleghe attive insieme (scelta nostra, da confermare)
       giorni: 7,                           // validità del link
       attive: [{ id, nome: 'Laura R.', dal: 'AAAA-MM-GG' }],
       aperto: null | { id, link, in_attesa, scade_il, oggetto, messaggio } }   // `in_attesa`: qualcuno ha compilato il modulo e non ha ancora confermato

POST { azione: 'crea' }
  <- { ok, id, link, scade_il, oggetto, messaggio }      // un link nuovo; se ce n'era uno aperto lo revoca: ne esiste uno solo
POST { azione: 'revoca', id, cosa: 'link' | 'delega' }
  <- { ok }
```

- **Chi può dare una delega**: un **maggiorenne titolare** del nucleo (`metodo_nucleo_da_email`), con **almeno un figlio minorenne**. Un delegato **non** può delegare a sua volta.
  Altrimenti `idoneo: false` con il `motivo` (l'app lo mostra com'è).
- **Il link** è `https://app.athlonroma.it/delega/<codice>`, codice a 8+ caratteri dall'alfabeto del referral (`abcdefghjkmnpqrstuvwxyz23456789`), **per una persona sola**, **scade**
  (`giorni`, consigliati 7), e si rifà con `crea`. **Diverso dal referral**, dove il codice è fisso: questo dà accesso a dei bambini, quindi se qualcuno lo gira a un altro non deve valere due volte.
- **`messaggio`** lo scrive la funzione (si ritocca senza app nuova), es. «Ciao! Ti do accesso ai miei figli su Athlon, così puoi gestire anche tu lezioni e prenotazioni: <link>». Non nomina i figli.
- **Revoca** (`cosa: 'delega'`): la delega smette di valere **subito** (il nucleo del delegato torna a lui solo) e parte un compito per la segreteria («togli la relazione su PerfectGym»), se era stata scritta.
- **Registro** (`audit_log`, come `portale_lab.componente_aggiunto`): `portale_lab.delega_creata`, `delega_accettata`, `delega_revocata`, `delega_rifiutata`, senza dati della persona (id e titolare).

## `delega-invito` (pubblica, senza sessione)

Due tempi: **il modulo** (che manda l'email) e **la conferma** (che abbina).

```
POST { azione: 'leggi', codice }
  <- { ok, valido: true, nome: 'Marco', figli: 2 } | { ok, valido: false }     // solo il primo nome di chi invita e quanti figli: MAI i nomi dei bambini

POST { azione: 'accetta', codice, nome, cognome, email, telefono: '+39…', nascita: 'AAAA-MM-GG', privacy: true }
  <- { ok: true }                                                              // SEMPRE la stessa risposta: l'email e' partita (o no), senza dire se la persona e' gia' al club
   | { ok: false, errore, scaduto?: true }                                      // `scaduto`: link della delega usato, scaduto o revocato

POST { azione: 'conferma_leggi', token }                                       // la pagina del link nell'email: non conferma niente
  <- { ok, valido: true, nome: 'Marco', delegato: 'Laura' } | { ok, valido: false }

POST { azione: 'conferma', token }                                             // il tocco su «Conferma»: QUI si abbina
  <- { ok: true, nome: 'Laura' } | { ok: false, errore }
```

### Il modulo (`accetta`)

1. **Il link** esiste, non è scaduto né usato né revocato. **Non si consuma qui**: un errore di battitura nell'email si corregge rifacendo il modulo (la richiesta in sospeso si **sostituisce**).
2. **Maggiorenne** (`anniAl(nascita, oggi) >= 18`), email valida, telefono, `privacy` vera. L'app lo controlla prima; il server **ricontrolla**.
3. Salva i dati in `delega_richieste` (vedi sotto) con un **token** nuovo (valido **24 ore**, uso unico) e **manda l'email** a quell'indirizzo con il link
   `https://app.athlonroma.it/delega/conferma/<token>`. L'invio come per il Guest Pass (vista in `*_da_mandare` + workflow n8n, o direttamente con SendGrid): da scegliere in APP-ATHLON.
4. **Risposta sempre uguale**, esista o no la scheda: la pagina non deve diventare il modo di sapere chi è iscritto al club. Niente PerfectGym in questo passo: **non si crea e non si cerca niente**.
5. **Anti-abuso**: pochi moduli al giorno per link e per IP, e un solo invio di email ogni minuto per indirizzo (qualcuno non deve poter riempire una casella altrui).

### La conferma (`conferma`)

Il token è valido, non usato, non scaduto, e il link della delega è ancora valido. **Poi, nell'ordine**, dentro il blocco per email (`conBlocco`, `chiavePersona`, migrazione `20261031k`):

1. **Cerca la persona** su PerfectGym **per email** (dal vivo, non dal mirror, che può essere indietro; se PerfectGym non risponde non si fa niente e si può riprovare).
   - **Esiste → si abbina e basta**, con la sua scheda **così com'è**: **mai riscrivere** nome, cognome, data o cellulare con quello che ha scritto nel modulo. Se i dati del modulo
     sono diversi da quelli della scheda (nome o data di nascita) si abbina lo stesso e si **segnala nel compito per la segreteria** («scheda esistente: PerfectGym dice X, il modulo Y»).
   - **Non esiste → si crea** su PerfectGym come Guest (`creaGuest`, `marketing: false`, niente `parentMemberId`), con i dati del modulo. **Si cerca solo per email**: il modulo non ha il codice fiscale, e un'omonimia con un'altra
     email non si rileva (la verifica della casella è la garanzia). Il rischio è una seconda scheda per la stessa persona con un'altra email: la segreteria la vede nel compito.
2. **Pochi casi in cui non si abbina**, con un messaggio che non dice di chi è la scheda e la riga `delega_rifiutata` (motivo, id) nella Dashboard del CRM come per i figli:
   - la scheda trovata **è minorenne** (nella scheda, non nel modulo);
   - è **il titolare stesso** o **uno dei suoi figli**;
   - è **già delegato** di quel titolare (non è un errore: si risponde ok senza ripetere niente).
3. **Abbina**: scrive la delega (`nucleo_deleghe`: titolare, delegato, figli **di quel momento**, stato attivo), aggiunge l'email ai tester, rilegge nel mirror (`rileggiNelMirror`), **consuma il link della delega**
   e il token, scrive `delega_accettata`, **manda un'email al titolare** («Laura R. ha accettato: ora vede i tuoi figli. Se non la conosci, togli l'accesso dall'app») e crea il **compito per la segreteria**
   (relazione da scrivere a mano su PerfectGym: vedi sopra).
4. La conferma è **idempotente**: un secondo tocco sullo stesso token dà un messaggio di link già usato, ma non duplica né la delega né la scheda.

**Perché la conferma è un tocco e non l'apertura del link**: i programmi che controllano i link delle email (antivirus, anteprime) li aprono. La pagina non fa nessuna scrittura al caricamento: `conferma_leggi` legge, `conferma` parte solo dal pulsante.

**Perché l'email verificata basta a rendere sicuro abbinare una scheda esistente**: l'accesso al portale è con l'email (codice monouso). Chi riceve il link nella casella è chi può entrare con quella email: abbinare quella scheda ai figli
non dà accesso a nessun altro. Senza la verifica, un indirizzo scritto a caso collegherebbe ai bambini una persona che non ha mai dato il consenso.

**Figli aggiunti dopo.** La delega vale per i figli del titolare **al momento della conferma e per quelli aggiunti dopo** (decisione da confermare: l'alternativa è chiedere di nuovo).

### Tabella `delega_richieste`

`id`, `delega_id` (il link del titolare), `token_hash` (**solo l'hash**, come i link di `portale-link`), `nome`, `cognome`, `email`, `telefono`, `nascita`, `privacy_il`, `creata_il`, `scade_il` (+24 h),
`email_il`, `confermata_il`, `ip_hash`. Solo `service_role`, nessuna policy. Si cancellano i dati personali alla conferma o alla scadenza (restano id e date nel registro).

## CRM (APP-ATHLON, `app/`)

- La **Dashboard** mostra i rifiuti di duplicazione (`delega_rifiutata`) accanto a quelli dei figli, con il motivo e senza dati sensibili.
- Il **compito della segreteria** per la relazione su PerfectGym, con il link alla scheda del titolare e a quella del delegato.
- Nella **scheda del titolare** (e in quella dei figli) l'elenco dei delegati attivi, con data e un comando per toglierli.

## Cosa fa l'app (questo repository)

- `src/api/delega.ts`: il client delle due funzioni.
- `src/features/lab/famiglia/AggiungiComponente.tsx`: il pulsante e la scelta «Un figlio» / «Un altro adulto», usato da **Home › Famiglia** (`SezioneFamiglia`) e da **Junior**. Mai in vista cliente.
- `src/features/lab/delega/Delega.tsx`, rotta `/delega`: link, WhatsApp / email / SMS / copia (`invita/condividi.ts`, lo stesso del referral), chi ha accesso con «Togli», conferme.
- `src/features/delega/AccettaDelega.tsx`, rotta pubblica `/delega/<codice>`: il modulo (nome, cognome, email, cellulare, data di nascita, privacy). **Niente codice fiscale né password.** Finisce con «Controlla la tua email» (nessuno è abbinato).
- `src/features/delega/ConfermaDelega.tsx`, rotta pubblica `/delega/conferma/<token>` (il link nell'email): dice chi dà la delega e chiede un tocco su «Conferma»; **la pagina non conferma da sola**.
- Con la funzione assente l'app non mostra errori strani: 404 → «non è ancora attiva», link non valido → «Questo link non è più valido».

## Provato / non provato

Provato (Chromium, bundle web esportato, funzioni simulate con `page.route`): modulo pubblico (minorenne bloccato, pulsante acceso a modulo pieno, il corpo che parte, pagina finale, link non valido,
errore del server, 390 e 1280 px); schermata del titolare (crea, link, annullo, delega attiva e «Togli», massimo raggiunto, non idoneo). `tsc` pulito. **Non provato**: le funzioni vere
(non esistono), PerfectGym, il foglio di scelta dentro Home › Famiglia e Junior (non guardato a schermo), un telefono, WhatsApp / SMS da iOS e Android, l'app nativa, tema scuro e inglese a schermo.
