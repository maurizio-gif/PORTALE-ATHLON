# Inventario delle funzioni «cliente» oggi ospitate su APP-ATHLON (CRM)

*Stato al 13/10/2026. Fonte: lettura del codice di `APP-ATHLON` (Next.js 14, crm.athlonroma.it), delle sue Edge Function Supabase e dei punti di chiamata nel sito `athlon-roma`.*

Questo documento è il punto di partenza di **Portale Athlon** (app.athlonroma.it): il portale nasce per il web e poi andrà su iOS e Android. Il documento elenca le funzioni che oggi riguardano il cliente e che vivono nel CRM o nel suo progetto Supabase. Per ognuna dice come funziona oggi e dove dovrebbe andare.

I percorsi senza prefisso sono relativi a `APP-ATHLON/`; quelli con `SITO/` sono relativi ad `athlon-roma/`.

---

## 1. Tre fatti che condizionano tutto il resto

1. **Oggi il cliente non ha un login.**
   - Supabase Auth, `/login`, `/recupera-password`, `/imposta-password` e la PWA con le notifiche push sono solo per lo staff: c'è l'allowlist `staff_users` e il manifest si apre su `/dashboard`.
   - L'unica credenziale del socio è quella di PerfectGym (ClientPortal2 e app Athlon Club).
   - Il sito riconosce le persone soltanto dall'email che scrivono. Nessuno verifica che l'email sia davvero di chi la scrive.
2. **Tutte le funzioni cliente sono pubbliche.** Il middleware protegge solo `/dashboard/*` e `/api/interno/*`. Ogni rotta cliente si difende da sola, in uno di questi modi:
   - un **token nell'URL**: firmato HMAC per gli appuntamenti, casuale e salvato in tabella per il metodo di pagamento e per gli eventi;
   - una **lista CORS**, che però non blocca le chiamate fatte da un server;
   - un **segreto Bearer**, per i cron.
3. **Il CRM non incassa mai.**
   - IBAN e carte finiscono su PerfectGym, attraverso le sue API.
   - Il mandato SEPA lo gestisce GoCardless dietro PerfectGym; la carta passa dal gateway Adyen ospitato da PerfectGym.
   - Gli abbonamenti si comprano su PerfectGym Registration.
   - L'unico checkout Adyen diretto è il **Laboratorio pagamenti**: è solo per lo staff, usa soldi veri ed ha un tetto di 5 €.

---

## 2. Tabella riepilogativa

Legenda della colonna «Destinazione proposta»:
- **PORTALE**: la funzione passa ad app.athlonroma.it.
- **SITO**: resta sul sito pubblico, perché serve ad acquisire visitatori anonimi.
- **BACKEND**: diventa un servizio condiviso (Edge Function o RPC) usato dal portale e dalle app.
- **CRM**: resta allo staff.

### Prenotazioni e appuntamenti

| # | Funzione | Dove vive oggi | Chi la usa e come | Autenticazione | Integrazioni | Destinazione proposta |
|---|---|---|---|---|---|---|
| P1 | Slot e prenotazione chiamata col desk | `app/api/prenotazioni/{slot,route}.ts` | form del sito, via CORS | nessuna; massimo 3 al giorno per email | `agenda_voci`, coda email | **BACKEND** + UI nel PORTALE (il form anonimo resta anche sul SITO) |
| P2 | Gestione appuntamento desk: vedi, sposta, disdici | `app/appuntamento/[token]`, `app/api/prenotazioni/[token]` | link nell'email | token HMAC **senza scadenza** | `agenda_voci` | **PORTALE** |
| P3 | Promemoria appuntamento desk e DT | `app/api/prenotazioni/promemoria` | cron Vercel ogni 5 minuti | `CRON_SECRET` | coda email | **BACKEND** (link verso il portale) |
| P4 | Slot e prenotazione chiamata col Direttore Tecnico nuoto | `app/api/appuntamenti-nuoto/{slot,route}.ts` | schede Help Desk del sito | nessuna; massimo 2 al giorno per email; verifica famiglia sul mirror | `appuntamenti_nuoto`, RPC `verifica_famiglia`, coda email | **BACKEND** + PORTALE |
| P5 | Gestione appuntamento DT | `app/appuntamento-nuoto/[token]`, `app/api/appuntamenti-nuoto/[token]` | link nell'email | token HMAC senza scadenza | `appuntamenti_nuoto` | **PORTALE** |
| P6 | Prova di inserimento nuoto: posti e prenotazione | `app/api/prove-nuoto/{slot,route}.ts` + Edge `sito-prova-nuoto` | form del sito | nessuna; `memberId` preso dal client | `prove_nuoto`, PerfectGym `Members`, coda email | **BACKEND** + PORTALE (per i soci); SITO (per i nuovi) |
| P7 | Eventi prenotabili (es. Open Day): richiesta del link e prenotazione dei figli | `app/api/eventi/richiesta`, `app/eventi/[codice]`, `app/api/eventi/link/[codice]`, Edge `perfectgym-eventi` | sito, poi email, poi pagina CRM | codice casuale, 72 ore; **nessun limite** sulla rotta di prenotazione | PerfectGym `Classes`, `ClassBookings`, `BookClass`, `CancelSingleBooking` | **PORTALE** (diventa la prenotazione autenticata delle lezioni) |
| P8 | Tour al totem | `app/api/tour` | totem in sede | nessuna | `agenda_voci` + task di richiamo | **SITO/totem** (non è del portale) |
| P9 | Calendly: webhook e recupero | `app/api/calendly/*` | Calendly, n8n, cron | HMAC / Bearer | `agenda_voci` | **CRM** (residuo: il sito non usa più Calendly) |

### Pagamenti

| # | Funzione | Dove vive oggi | Chi la usa e come | Autenticazione | Integrazioni | Destinazione proposta |
|---|---|---|---|---|---|---|
| M1 | Metodo di pagamento «nucleo»: IBAN o carta su N contratti del titolare e dei figli | `app/metodo-pagamento/nucleo/[codice]/**`, `app/api/metodo-pagamento/{richiesta,nucleo/[codice]}`, Edge `perfectgym-metodo-pagamento` | sito, poi email; oppure il desk dal CRM (Nuovi contratti, Scheda, Insoluti) | codice casuale: 72 ore se lo chiede il cliente, 7 giorni se lo manda il desk; nucleo congelato alla richiesta | PerfectGym `AddDirectDebitPaymentMethod`, `InitExternalCreditCardRegistration`, `AssignPaymentSource` | **PORTALE** («I miei pagamenti»); il bottone del desk resta nel CRM e linka al portale |
| M2 | Metodo di pagamento per singolo contratto (legacy) | `app/metodo-pagamento/[token]/**` | vecchi link via n8n; **non se ne emettono più** | token di 30 giorni, monouso | come M1 | **da dismettere**: non va migrato |
| M3 | Laboratorio pagamenti: checkout Adyen diretto, rate ricorrenti | `app/dashboard/laboratorio-pagamenti/**`, Edge `lab-pagamenti`, `adyen-webhook` | solo staff, soldi veri, massimo 5 € | sessione staff | Adyen Sessions, Drop-in 6.46.0, ContAuth, webhook HMAC | **prototipo** da cui partire per l'acquisto nel PORTALE. Non è pronto: non ha legame con PerfectGym né identità cliente |
| M4 | Adyen e GoCardless: webhook e mirror | Edge `adyen-webhook`, `adyen-link-prova`, `adyen-rimborso-prova`, `gocardless-*` | provider | HMAC / Basic | `adyen_eventi`, `gocardless_*` | **BACKEND** (nessuna UI cliente) |
| M5 | Email di sollecito degli insoluti | `app/dashboard/insoluti/actions.ts`, `lib/insolutiEmail.ts` | il desk le manda | — | coda email | **CRM**; oggi per pagare rimandano all'area riservata di PerfectGym, domani al PORTALE |

### Account e self-service

| # | Funzione | Dove vive oggi | Chi la usa e come | Autenticazione | Integrazioni | Destinazione proposta |
|---|---|---|---|---|---|---|
| A1 | Verifica dell'iscritto (email → stato, nucleo, nome, telefono) | Edge `sito-verifica-iscritto` | tutti i form del sito e la chat | **nessuna**: espone dati personali partendo dall'email | PerfectGym OData `Members` e `contracts`, dal vivo | **BACKEND**: va ridotta (nessun dato personale) per il sito; sostituita dal login nel PORTALE |
| A2 | Reset della password PerfectGym | Edge `sito-reset-password` | sito, chat | nessuna | PerfectGym `MemberAuth/SendResetPasswordLink` | **PORTALE**, se il login è quello di PerfectGym; altrimenti resta sul SITO |
| A3 | Richiesta di cambio abbonamento | Edge `sito-cambio-abbonamento` | form nel wiki | nessuna; il cliente non riceve conferma | `richieste_cambio_abbonamento`, email al desk | **PORTALE** (self-service autenticato, con conferma) |
| A4 | Invita un amico | Edge `sito-referral` | sito, `/club-life` | nessuna: chiunque può invitare «a nome» di un socio | `richieste_referral`, PerfectGym, coda email, Spoki | **PORTALE** (l'invitante è chi ha fatto il login) |
| A5 | Disiscrizione dalla newsletter | `app/newsletter/disiscrivi/[token]`, `app/api/newsletter/disiscrivi` | link e `List-Unsubscribe` | token UUID | `newsletter_*`, Edge `perfectgym-consensi` | **BACKEND** + pagina nel PORTALE (preferenze di comunicazione) |

### Comunicazioni automatiche al cliente

Sono tutte già nel backend; il portale ne eredita i link.

| # | Funzione | Dove vive oggi | Chi la usa e come | Autenticazione | Integrazioni | Destinazione proposta |
|---|---|---|---|---|---|---|
| N1 | Promemoria del certificato medico | `app/api/certificati/promemoria` | cron Vercel alle 08:00 | `CRON_SECRET` | vista `promemoria_certificati_oggi` | BACKEND; il caricamento del certificato dal PORTALE c'è dal 17/10/2026 (`CLAUDE.md`) |
| N2 | Promemoria di rinnovo annuale o aumento | `app/api/rinnovi/promemoria` | cron Vercel alle 08:00, attivo dal 30/11/2026 | `CRON_SECRET` | RPC `rinnovi_*_da_avvisare` | BACKEND |
| N3 | Avvisi automatici di mancata disdetta (Strikes, 1° e 2° avviso) | `app/api/mancate-disdette/avvisi` | cron Vercel ogni 10 minuti | `CRON_SECRET` | `mancate_disdette_*` | BACKEND; lo storico degli avvisi si può mostrare nel PORTALE |
| N4 | Coda email, invio e tracciamento | Edge `email-invio`, `email-eventi`, RPC `accoda_email` | tutti | servizio | SendGrid EU | BACKEND; il portale aggiunge le **notifiche push dell'app** come nuovo canale |

### Funzioni che restano sul sito

Servono ad acquisire visitatori anonimi, quindi restano sul sito, ma possono rimandare al portale.

| Funzione | Dove vive oggi | Cosa fa |
|---|---|---|
| `sito-prova` | Edge Function | Guest Pass |
| `sito-contatto` | Edge Function | Contattaci e richiamo |
| `sito-info-abbonamenti` | Edge Function | filtro email prima del listino |
| `sito-help-desk` | Edge Function | form «Scrivici» |
| `sito-chat-dati`, `sito-chat-ticket` | Edge Function, con il modello su n8n | chat del sito |
| `sito-valutazioni` | Edge Function | voto alla chat e sondaggi |
| `sito-traccia` | Edge Function | visite |
| `sito-suggerisci-prova` | Edge Function | banner «provalo» |
| `sito-candidatura` | Edge Function | Lavora con noi |

Due candidate da riprendere nel portale, in versione autenticata:
- **Help Desk e ticket**: con il login il cliente vedrebbe lo storico delle sue richieste.
- **Sondaggi**.

---

## 3. Schede di dettaglio delle funzioni da portare nel portale

### P2 / P5: gestione dell'appuntamento (desk e Direttore Tecnico)

- **Cosa vede il cliente.** Il riepilogo dell'appuntamento e due possibilità: spostarlo tra gli slot liberi oppure disdirlo. Il componente `GestioneAppuntamento.tsx` è condiviso fra le due pagine.
- **Token.** È `<uuid>.<HMAC>`, firmato con `APPUNTAMENTO_SEGRETO` (`lib/appuntamento-token.ts`).
  - Non ha scadenza.
  - Non si può revocare il singolo link: ruotando il segreto si invalidano tutti i link già spediti.
- **Differenze fra desk e DT.**
  - Spostando un appuntamento DT il promemoria si riarma; spostando un appuntamento desk no. È un bug da non portarsi dietro.
  - Spostare o disdire non manda nessuna email al cliente.
- **Calendario del desk.** È ricavato da **tutte** le voci con orario di `agenda_voci`: tour, Calendly e voci inserite a mano dal desk. È quindi fortemente legato al CRM. Il portale deve leggere lo stesso calendario, non averne uno suo.
- **Regole degli slot.**
  - Desk: slot da 15 minuti, 7 giorni prenotabili, fasce orarie in `lib/prenotazioni.ts:35-43`.
  - DT: slot da 15 minuti, 14 giorni prenotabili, fasce in `lib/appuntamentiNuoto.ts:91-97`.

### P7: eventi e prenotazione delle lezioni PerfectGym

- **Flusso di oggi.**
  1. Il cliente inserisce la sua email.
  2. Il sistema trova il titolare (prima sul mirror, poi su PerfectGym).
  3. Viene creato un codice valido 72 ore e mandato per email.
  4. Dalla pagina del codice il cliente sceglie il turno e i figli da prenotare.
- **Cosa c'è già nella Edge Function `perfectgym-eventi`.** La logica che serve al portale per la prenotazione delle lezioni:
  - lettura dei turni e dei posti dal vivo;
  - nucleo familiare letto da `MemberRelations`;
  - filtro sulla fascia d'età;
  - `BookClass`;
  - traduzione dei codici di errore PerfectGym.
  - **L'annullamento (`CancelSingleBooking`) esiste ma nessuna rotta lo espone.**
- **Cosa resta da fare.** Generalizzare dagli «eventi» (`eventi_prenotabili`) a tutte le lezioni di gruppo, e sostituire il codice via email con l'utente autenticato.

### M1: metodo di pagamento del nucleo

- **È di fatto un login via magic link.** L'email porta a un codice; il codice dà accesso al nucleo del titolare e dei figli (il coniuge è escluso) e ai suoi contratti attivi.
- **Il cliente può:**
  - inserire un IBAN su uno o più contratti: il conto viene creato sul titolare, con ripiego sulla scheda del figlio se PerfectGym nega l'associazione;
  - inserire una carta, sulla pagina Adyen di PerfectGym, con ritorno su `/fatto` e controllo ripetuto (20 tentativi ogni 3 secondi).
- **La Edge Function `perfectgym-metodo-pagamento` si può riusare così com'è.**
  - Oggi è indicizzata per `richiesta_id`.
  - Per il portale serve una delle due strade: azioni indicizzate per `member_id` autenticato, oppure una nuova `origine` nel CHECK di `metodo_pagamento_richieste` (oggi ammette solo `'modulo','desk'`).
- **Chi chiede il link.** Il desk lo manda da Nuovi contratti, dalla Scheda contatto e dagli Insoluti, con l'azione `mandaAvvisoMetodoPagamento` in `app/dashboard/contratti/actions.ts`. Questo bottone resta nel CRM ma dovrà linkare al portale.
- **Ambiente.** È live su PerfectGym di produzione e non esiste un ambiente di test.

### M3: Laboratorio pagamenti, base per «acquista l'abbonamento nel portale»

- **Pronti e riusabili:**
  - Adyen Sessions e Drop-in;
  - 3D Secure con redirect e `submitDetails`;
  - token ricorrente (`storedPaymentMethodId`) e addebiti ContAuth con tentativi ripetuti;
  - il webhook come unica fonte di verità, con idempotenza;
  - le pagine di riepilogo e di stato.
- **Mancanti:**
  - identità del cliente: oggi `shopperReference` è casuale;
  - creazione del contratto su PerfectGym, uso dei PaymentPlan reali e registrazione del pagamento sul gestionale. Oggi il laboratorio è un sistema parallelo sullo stesso merchant di PerfectGym;
  - email al cliente: ricevuta, rata fallita, carta in scadenza;
  - aggiornamento della carta e rimborsi;
  - aspetti fiscali;
  - **un ambiente di test Adyen**: oggi `environment: 'live'` è scritto nel codice;
  - il `returnUrl` per app.athlonroma.it: oggi sono ammessi solo il CRM e localhost.
- **Decisione da prendere prima di scrivere codice.** Stabilire se l'acquisto nel portale passa **da PerfectGym**, tramite le sue API di vendita e il suo gateway, oppure da **Adyen diretto** con riconciliazione verso PerfectGym. Il laboratorio ha esplorato solo la seconda strada.

### A3 / A4: cambio abbonamento e Invita un amico

- **Oggi.** Sono form anonimi che si fidano di un'email dichiarata. Il cambio abbonamento non dà conferma al cliente; il referral permette di mandare email «a nome» di un socio qualsiasi.
- **Nel portale.** Il socio autenticato vede il suo contratto attuale, sceglie il nuovo piano e riceve una conferma; il desk continua a lavorare la richiesta nel CRM. Per il referral, l'invitante è l'utente che ha fatto il login.

---

## 4. Vincoli tecnici da risolvere per la migrazione

1. **Domini scritti fissi nel codice.** Vanno resi configurabili o puntati al portale:

   | Dove | Cosa contiene |
   |---|---|
   | `lib/emailEventoLink.ts:7` | link degli eventi |
   | `lib/metodoPagamentoEmail.ts:18` | link del metodo di pagamento |
   | `lib/appuntamento-token.ts:69,118` | dominio predefinito di `NEXT_PUBLIC_CRM_URL` |
   | `lib/metodoPagamento-server.ts:33-55` | URL di ritorno ammessi dopo la carta |
   | `supabase/functions/lab-pagamenti/index.ts:106,208` | `returnUrl` del laboratorio |
   | `SITO/src/data/appuntamento.ts:26` | `CRM = 'https://crm.athlonroma.it'` |
   | `SITO/src/data/metodoPagamento.ts:19` | indirizzo della richiesta del metodo di pagamento |

2. **CORS.** Gli elenchi sono due, e nessuno dei due contiene `app.athlonroma.it`:
   - `lib/prenotazioni-server.ts:33-48`
   - `supabase/functions/_shared/sito.ts:10-17`

   Per le app native il CORS non conta: serve un'autenticazione vera.
3. **Identità del cliente.** È la decisione numero uno. Le strade sono due:
   - **(a)** login con le credenziali PerfectGym (`MemberAuth`);
   - **(b)** Supabase Auth per i clienti (OTP o magic link via email), collegato a `utenti.pgm_member_id`.

   Il modello «codice via email → nucleo» è già usato da metodo di pagamento ed eventi, quindi la (b) è la continuazione naturale. La (a) evita una seconda password. In entrambi i casi il nucleo si ricava con le RPC `metodo_nucleo_da_email` e `metodo_nucleo_da_membro` (coniuge escluso).
4. **Sicurezza da sistemare comunque, anche prima del portale:**
   - `sito-verifica-iscritto` restituisce nome, cognome e telefono partendo dalla sola email;
   - le POST del metodo di pagamento (M1, M2) e `/api/eventi/link/[codice]` non hanno limiti di frequenza;
   - `/api/tour` e `/api/prove-nuoto` accettano un `memberId` mandato dal client e lo usano per agganciare la scheda;
   - `sito-referral` permette di inviare email a nome di un socio;
   - `email-invio` aggiunge `?email=<destinatario>` a tutti i link del sito.
5. **Dove mettere la logica.** Oggi parte della logica cliente sta in rotte Next del CRM (prenotazioni, nuoto, prove, eventi, metodo di pagamento) e parte in Edge Function. Visto che arriveranno iOS e Android, conviene portare la logica cliente in **Edge Function o RPC sotto un'unica autenticazione cliente**, consumate dal portale web e dalle app. Copiarla dentro un'altra app Next creerebbe un secondo duplicato.
6. **Un solo progetto Supabase** (`kdbcwwpdazvtmjolybdm`), condiviso da CRM, sito e (domani) portale.
   - Le tabelle cliente hanno RLS attiva **senza policy** e oggi si leggono solo con la service role.
   - Un client autenticato del portale richiederà policy RLS per il cliente, oppure l'accesso solo tramite funzioni.
7. **Documentazione non allineata al codice.** Diverse sezioni del README del CRM descrivono ancora n8n dove il codice è passato alla coda email o alle Edge Function. Riferimenti: righe 1375, 2083-2087, 3990, 5376, 5470-5486, 6347 e `SITO/CLAUDE.md:5783-5793`. Per le funzioni cliente la fonte affidabile è il codice, non il README.

---

## 5. Cosa non è una funzione cliente

Queste parti restano nel CRM:
- login, recupero e impostazione password, callback di autenticazione;
- PWA e notifiche push: oggi sono solo per lo staff;
- `perfectgym-tessera-asi`, `perfectgym-sync`, `perfectgym-webhook` e il resto del mirror;
- Calendly;
- tutta la dashboard.

---

## 6. Ordine di migrazione suggerito

1. **Fondamenta.**
   - Decidere il modello di identità (§4.3).
   - Aggiungere `app.athlonroma.it` alle origini e agli URL di ritorno.
   - Rendere configurabili i domini dei link nelle email.
2. **Pagine con token, da spostare così come sono.**
   - Gestione appuntamento desk e DT (P2, P5).
   - Metodo di pagamento del nucleo (M1).
   - Eventi (P7).

   Il backend non cambia; cambiano il dominio e la UI.
3. **Area personale autenticata.** È la stessa logica di M1 e P7, ma partendo dall'utente che ha fatto il login invece che da un codice. Contiene:
   - i miei abbonamenti;
   - i miei metodi di pagamento;
   - la mia famiglia;
   - i miei appuntamenti.
4. **Self-service.**
   - Cambio abbonamento (A3).
   - Invita un amico (A4).
   - Preferenze di comunicazione (A5).
   - Prenotazione e annullamento delle lezioni (generalizzazione di P7).
5. **Acquisto dell'abbonamento nel portale.** Va fatto dopo la decisione PerfectGym oppure Adyen diretto, partendo dal Laboratorio (M3).
6. **App iOS e Android** sopra lo stesso backend, con le notifiche push come nuovo canale accanto alle email.
