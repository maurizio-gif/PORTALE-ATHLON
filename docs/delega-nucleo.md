# La delega sui figli a un altro adulto: contratto per il lato server (31/10/2026)

Richiesta di Maurizio: in **Home › Famiglia** e in **Junior**, «Aggiungi un componente» offre due strade: **un figlio** (com'era, con il controllo di
duplicazione e il blocco con evidenza nel CRM) e **un altro adulto**, a cui il titolare dà la **delega a vedere e agire** sui figli. Funziona come il referral:
il titolare genera un link e lo manda (WhatsApp, SMS, email, copia); chi lo apre si registra con nome, cognome, email, cellulare e data di nascita, e viene
collegato come *spouse* al titolare e come *parent* ai bambini (creato su PerfectGym come Guest se nuovo).

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
       aperto: null | { id, link, scade_il, oggetto, messaggio } }

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

```
POST { azione: 'leggi', codice }
  <- { ok, valido: true, nome: 'Marco', figli: 2 } | { ok, valido: false }     // solo il primo nome di chi invita e quanti figli: MAI i nomi dei bambini

POST { azione: 'accetta', codice, nome, cognome, email, telefono: '+39…', nascita: 'AAAA-MM-GG', privacy: true }
  <- { ok: true, nome }
   | { ok: false, errore, scaduto?: true }                                      // `scaduto`: link usato o scaduto, riprovare non serve
```

**Controlli** (come `aggiungi` di `portale-lab-junior`, con le stesse parole di blocco):

1. **Il link** esiste, non è scaduto né usato né revocato. Si **consuma nella stessa transazione** (due richieste insieme: una sola vince).
2. **Maggiorenne** (`anniAl(nascita, oggi) >= 18`); email valida; telefono; `privacy` vera (consenso 23 di PerfectGym).
3. **Duplicazione**, con il blocco per email contro la corsa (`conBlocco`, `chiavePersona`, migrazione `20261031k`):
   - email **già di una persona al club**: se nome, cognome e data di nascita **coincidono**, la si usa (nessuna scheda nuova); **se non coincidono** si blocca con
     «C'è già una scheda con questa email: passa in segreteria» e la riga `delega_rifiutata` (motivo `email_gia_al_club`) **compare nella Dashboard del CRM** come per i figli (`componente_rifiutato`);
   - stessa persona per nome, cognome e data di nascita ma con un'altra email: stesso blocco (motivo `gia_al_club`);
   - **mai** dire di chi è la scheda trovata.
   - Se PerfectGym non risponde non si crea niente.
4. **Anti-abuso**: pochi tentativi al giorno per IP e per link (un link sbagliato non deve poter essere indovinato: 8 caratteri su 31 simboli bastano, ma si limita comunque).
5. **Il delegato non è il titolare** né un figlio del nucleo.

**Poi, in ordine**: crea il Guest su PerfectGym se nuovo (`creaGuest`, `marketing: false`, niente `parentMemberId`); aggiunge la delega (`nucleo_deleghe`: titolare, delegato, figli **di quel momento**); aggiunge l'email ai
tester; rilegge nel mirror (`rileggiNelMirror`); scrive `delega_accettata`; **manda un'email al titolare** («Laura R. ha accettato: ora vede i tuoi figli. Se non la conosci, togli l'accesso
dall'app»); e crea il **compito per la segreteria** (Dashboard/Agenda) con titolare, delegato, figli e cosa scrivere su PerfectGym.

**Figli aggiunti dopo.** La delega vale per i figli del titolare **al momento dell'accettazione e per quelli aggiunti dopo** (decisione da confermare: l'alternativa è chiedere di nuovo).

## CRM (APP-ATHLON, `app/`)

- La **Dashboard** mostra i rifiuti di duplicazione (`delega_rifiutata`) accanto a quelli dei figli, con il motivo e senza dati sensibili.
- Il **compito della segreteria** per la relazione su PerfectGym, con il link alla scheda del titolare e a quella del delegato.
- Nella **scheda del titolare** (e in quella dei figli) l'elenco dei delegati attivi, con data e un comando per toglierli.

## Cosa fa l'app (questo repository)

- `src/api/delega.ts`: il client delle due funzioni.
- `src/features/lab/famiglia/AggiungiComponente.tsx`: il pulsante e la scelta «Un figlio» / «Un altro adulto», usato da **Home › Famiglia** (`SezioneFamiglia`) e da **Junior**. Mai in vista cliente.
- `src/features/lab/delega/Delega.tsx`, rotta `/delega`: link, WhatsApp / email / SMS / copia (`invita/condividi.ts`, lo stesso del referral), chi ha accesso con «Togli», conferme.
- `src/features/delega/AccettaDelega.tsx`, rotta pubblica `/delega/<codice>`: il modulo (nome, cognome, email, cellulare, data di nascita, privacy). **Niente codice fiscale né password.**
- Con la funzione assente l'app non mostra errori strani: 404 → «non è ancora attiva», link non valido → «Questo link non è più valido».

## Provato / non provato

Provato (Chromium, bundle web esportato, funzioni simulate con `page.route`): modulo pubblico (minorenne bloccato, pulsante acceso a modulo pieno, il corpo che parte, pagina finale, link non valido,
errore del server, 390 e 1280 px); schermata del titolare (crea, link, annullo, delega attiva e «Togli», massimo raggiunto, non idoneo). `tsc` pulito. **Non provato**: le funzioni vere
(non esistono), PerfectGym, il foglio di scelta dentro Home › Famiglia e Junior (non guardato a schermo), un telefono, WhatsApp / SMS da iOS e Android, l'app nativa, tema scuro e inglese a schermo.
