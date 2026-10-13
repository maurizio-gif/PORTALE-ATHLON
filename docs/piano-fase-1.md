# Portale Athlon: piano della fase 1

*Bozza del 13/10/2026, scritta dopo l'[inventario delle funzioni cliente](inventario-funzioni-cliente.md).*

## Le decisioni prese

1. **Accesso in produzione.** Ogni procedura parte da una richiesta con l'email. Il cliente riceve un link e conclude la procedura dal link, senza password e senza account. È il modello che oggi usano il metodo di pagamento del nucleo e gli eventi.
2. **Frontend.** Si sceglie la tecnologia che servirà anche per l'app nativa: lo stesso codice gira come web app oggi e come app iOS/Android domani.
3. **Pagamenti, su due binari.**
   - *Produzione:* la scelta del metodo continua ad andare su PerfectGym (`perfectgym-metodo-pagamento`).
   - *Laboratorio:* il pagamento diretto con Adyen resta in prova (`lab-pagamenti`).
4. **Si tiene il piede in due staffe:**
   - **Binario A (produzione).** Il cliente comincia a fare da sé le operazioni, e tutto resta scritto su PerfectGym.
   - **Binario B (laboratorio).** Un'area di prova, fuori da PerfectGym, dove si sviluppano: login proprio, area riservata, calendario delle prenotazioni e pagamenti.

---

## Architettura

```
 app.athlonroma.it  (Expo: web oggi, iOS/Android domani, stesse rotte)
   │
   ├── Binario A: /richiesta/*  →  email  →  /r/<token>        (nessun login)
   │
   └── Binario B: /lab/*        →  login OTP (solo tester)      (Supabase Auth)
                      │
        Edge Function + RPC Supabase (unico progetto, già esistente)
        portale-richiesta · portale-link · portale-lab-*
        riusano: perfectgym-metodo-pagamento · perfectgym-eventi · lab-pagamenti · accoda_email
                      │
        Supabase (utenti, mirror perfectgym.*)  ←→  PerfectGym (fonte di verità)
```

**Il portale non contiene logica di dominio.** Chiama Edge Function e RPC, e le stesse chiamate le userà l'app nativa. Il CRM resta l'interfaccia per lo staff.

### Frontend: Expo con Expo Router (TypeScript)

- Il web si esporta e si pubblica su Vercel all'indirizzo `app.athlonroma.it`. Il manifest PWA permette di installarlo sulla schermata Home.
- **Le rotte coincidono con i deep link.** Un link `https://app.athlonroma.it/r/<token>` arrivato per email apre la pagina web oggi. Domani aprirà direttamente l'app tramite Universal Links (iOS) e App Links (Android). Per questo il dominio e la forma dei link vanno fissati adesso.
- Pagamenti:
  - pagina carta di PerfectGym: si apre in un browser in-app (`expo-web-browser`) e si torna nell'app con un deep link;
  - Adyen: Drop-in Web sul web, `@adyen/react-native` nell'app;
  - un abbonamento in palestra è un servizio fisico, quindi non servono gli acquisti in-app di Apple e Google.

### Dove vive il backend

Per ora schema ed Edge Function restano nel `supabase/` di **APP-ATHLON**, che possiede già il progetto e le migrazioni. PORTALE-ATHLON contiene il frontend e i tipi generati dal database (`supabase gen types`). Così le migrazioni restano in un solo posto e non c'è un secondo punto da cui si deploya. Quando il backend sarà abbastanza grande lo si sposta in un repo suo.

---

## Binario A: richieste via email (produzione, collegato a PerfectGym)

### Un solo meccanismo per tutte le richieste

Oggi ce ne sono tre, diversi fra loro:
- appuntamenti: token HMAC senza scadenza;
- metodo di pagamento: tabella con codice, valido 72 ore o 7 giorni;
- eventi: un'altra tabella con codice, valido 72 ore.

Il portale ne usa uno solo.

1. **La richiesta.** Il cliente sceglie cosa vuole fare e scrive l'email.
   - Il portale chiama `portale-richiesta`, che applica i limiti di frequenza (per email e per IP) e ricava il nucleo con `metodo_nucleo_da_email`.
   - Poi crea una riga in `portale_richieste` e accoda l'email.
   - La risposta è **sempre** `ok`, così non si rivela chi è socio.
2. **Il link.** È sempre della forma `https://app.athlonroma.it/r/<token>`, con un solo prefisso da registrare per i deep link. Il tipo di operazione è salvato nella riga, non nell'URL.
3. **La pagina.** `portale-link` legge la richiesta e restituisce il contesto (nucleo, contratti, posti liberi…) e le azioni ammesse per quel tipo. Le azioni chiamano i servizi che esistono già.

**La tabella `portale_richieste`** contiene: `tipo`, `email`, `membri bigint[]` (il nucleo bloccato al momento della richiesta, coniuge escluso, come oggi), `contesto jsonb`, `token_hash`, `scade_il`, `usata_il`, `origine` (`portale` | `desk` | `sito`), `ip_hash`.
- **Il token si salva come hash (sha256), non in chiaro.** Oggi `metodo_link_token` ed `eventi_richieste.token` sono in chiaro.
- Ogni tipo decide se il link si usa una volta sola o più volte fino alla scadenza.

### I tipi della fase 1

| Tipo | Cosa fa il cliente dal link | Backend riusato | Sostituisce |
|---|---|---|---|
| `metodo_pagamento` | sceglie IBAN o carta per uno o più contratti del nucleo | `perfectgym-metodo-pagamento`, azioni `nucleo-*` | `crm…/metodo-pagamento/nucleo/[codice]` |
| `prenota_evento` | sceglie il turno e i figli | `perfectgym-eventi` (`pagina` / `prenota`) | `crm…/eventi/[codice]` |
| `gestisci_appuntamento` | sposta o disdice la chiamata col desk o col DT | `agenda_voci`, `appuntamenti_nuoto` | `crm…/appuntamento[-nuoto]/[token]`; i link adesso scadono all'ora dell'appuntamento |
| `cambio_abbonamento` | vede il contratto attuale, sceglie il nuovo piano e riceve conferma | `sito-cambio-abbonamento`, più la verifica del nucleo | il form anonimo del wiki |

**Il desk** continua a mandare i link dal CRM, per esempio con «Invia email per metodo di pagamento»: cambia solo l'origine e il dominio del link.

**Le vecchie pagine del CRM** restano attive finché scadono i link già spediti (al massimo 30 giorni), poi rimandano al portale.

---

## Binario B: laboratorio (fuori da PerfectGym, solo tester)

### Accesso

- Supabase Auth con **codice OTP via email** (codice e link).
- Possono entrare solo gli indirizzi presenti in `portale_lab_tester`, cioè staff e clienti invitati. L'allowlist si fa rispettare con l'Auth Hook *before user created*, che blocca chi non è in elenco, e la si ricontrolla nelle funzioni.
- Le nuove righe in `auth.users` hanno `app_metadata.ruolo = 'cliente'`.
  - **Separazione dal CRM:** la dashboard ammette solo chi è in `staff_users` (`app/dashboard/layout.tsx:33-39`). Un account cliente non entra nel pannello.
  - Prima di accendere l'OTP va comunque fatta una verifica dedicata delle Server Action e di `/api/interno/*`.

### Collegamento con l'anagrafica

`portale_account (auth_user_id, utente_id, pgm_member_id, collegato_il)`.
- Il collegamento avviene quando l'email verificata con l'OTP coincide con quella di un socio PerfectGym.
- Il nucleo si ricava con le RPC che esistono già.

### Cosa si sviluppa

1. **Area riservata, in sola lettura:** profilo, famiglia, contratti, metodo di pagamento attuale, certificato medico. I dati vengono dal mirror tramite RPC `security definer` che partono da `auth.uid()`. Nessuna scrittura su PerfectGym.
2. **Calendario delle prenotazioni:** lezioni reali su PerfectGym: posti, prenota e disdici.
3. **Pagamenti diretti:**
   - si espone `lab-pagamenti` al JWT del tester;
   - `shopperReference` viene legato all'utente invece che a un valore casuale;
   - `returnUrl` deve ammettere `app.athlonroma.it`;
   - finché non arriva l'account di test Adyen (lo chiede il club) restano il **live con tetto di 5 €** e i piani `PIANI_LAB`.

---

## Cosa cambia nel CRM (APP-ATHLON)

**Fatto nella tappa 0** (branch `claude/portale-domini-cors`):
- i link cliente nelle email (appuntamenti, metodo di pagamento, eventi) si compongono tutti da `lib/urlCrm.ts`, perché eventi e metodo di pagamento avevano il dominio scritto fisso;
- `app.athlonroma.it` è entrato nelle origini CORS (`lib/prenotazioni-server.ts`, `supabase/functions/_shared/sito.ts`). Per la parte Edge Function serve un nuovo deploy delle funzioni `sito-*`.

**Da fare quando serve:**
- tappa 1: gli URL di ritorno della carta verso il portale. Oggi `baseRitorno` in `lib/metodoPagamento-server.ts` ammette solo il CRM; la nuova `portale-link` comporrà i suoi;
- tappa 4: `returnUrl` di `lab-pagamenti`;
- nuove migrazioni (`portale_richieste`, `portale_lab_tester`, `portale_account`) e nuove Edge Function `portale-*`.

**Nessuna nuova funzione cliente nelle rotte Next del CRM.**

## Tappa 1: com'è stata fatta (13/10/2026)

Il metodo di pagamento del nucleo è il primo flusso che vive sul portale.

- **Edge Function `portale-link`** (APP-ATHLON, `supabase/functions/portale-link/`). È pubblica come le `sito-*` e riceve il token. Fa il lavoro della rotta del CRM `/api/metodo-pagamento/nucleo/[codice]`, con le stesse azioni (`apri`, `contratti`, `iban`, `carta`, `conferma`, `carta-fallita`), e chiama `perfectgym-metodo-pagamento` con la chiave di servizio.
  - In più c'è un tetto di 30 tentativi IBAN all'ora per richiesta.
  - Il ritorno della carta punta a `app.athlonroma.it/r/<token>/fatto`.
- **Portale:** `/r/[token]` (elenco, IBAN, esiti) e `/r/[token]/fatto` (ritorno dalla carta). Le pagine sono riprese da quelle del CRM, con gli stessi testi e le stesse regole.
- **CRM:** l'email del link (`lib/metodoPagamentoEmail.ts`) porta ora a `urlLinkPortale(token)`. Le pagine `/metodo-pagamento/nucleo/*` del CRM restano attive per i link già spediti, che scadono al più tardi dopo 7 giorni; dopo si possono togliere.

**Cosa cambia rispetto al piano.** La tabella unica `portale_richieste` non è stata creata. Il token si risolve in un solo posto, `portale-link`, sulla tabella che esiste già (`metodo_pagamento_richieste`), così il flusso del desk e la funzione PerfectGym non si toccano. Quando arriveranno altri tipi (eventi, appuntamenti), `portale-link` cercherà il token nelle loro tabelle. Si deciderà allora se unificarle e se salvare i token come hash.

**Ordine di rilascio**, perché i link non puntino a una pagina che non c'è:
1. funzione `portale-link` pubblicata (fatto);
2. merge del portale, cioè le pagine `/r/*` su app.athlonroma.it;
3. merge del CRM, cioè le email che puntano al portale.

## Tappa 2: com'è stata fatta (13/10/2026)

Login proprio per i tester e la loro area riservata, in sola lettura.

- **Chi entra:** gli indirizzi della tabella `portale_lab_tester`, una riga per tester. Il primo è `maurizio@athlonroma.it`. Per aggiungerne uno: `insert into public.portale_lab_tester (email, nota) values ('nome@esempio.it', 'perché');`.
- **Come si entra:** email, poi un codice di sei cifre. La funzione `portale-accesso` del CRM:
  - crea l'account su Supabase Auth al primo codice;
  - genera il codice con l'API di amministrazione, senza che Supabase spedisca email;
  - lo manda dalla coda delle email del club, nello standard.

  Le impostazioni e i modelli di Supabase Auth, che sono quelli dello staff, non si toccano. Il portale verifica il codice con `supabase.auth.verifyOtp`, e il metodo funziona uguale nell'app.
- **L'area:** `public.portale_la_mia_area()`, aperta solo ad `authenticated`, ricontrolla l'elenco dei tester e legge dal mirror di PerfectGym:
  - profilo;
  - famiglia, cioè il nucleo di `metodo_nucleo_da_email`, coniuge escluso;
  - abbonamenti vivi con il metodo di pagamento;
  - certificato medico.

  Non scrive niente.
- **Sicurezza verificata prima di accendere gli account cliente:**
  - nello schema `public` nessuna policy RLS, nessuna vista che salta i permessi, nessuna funzione privilegiata aperta ad `authenticated`;
  - la timbratura del CRM ora chiede la sezione dello staff, come la sua pagina.

## Tappa 3: com'è stata fatta (13/10/2026)

Le ultime pagine cliente del CRM passano sul portale. Il CRM non ha più pagine per i clienti.

- **Eventi (Open Day):** `/r/<codice>`. `portale-link` cerca il token anche in `eventi_richieste` e chiama `perfectgym-eventi` (`pagina`, `prenota`), con lo stesso audit di prima. Sostituisce `/api/eventi/link/[codice]` del CRM.
- **Appuntamenti col desk e col Direttore Tecnico:** `/r/<uuid>.<firma>`. Il token è firmato dal CRM, e il portale usa le rotte del CRM `/api/prenotazioni/[token]` e `/api/appuntamenti-nuoto/[token]`. Il link non dice quale dei due calendari: si prova il desk, poi il nuoto. Spostando un appuntamento col desk ora si riarma il promemoria, come già succedeva col Direttore Tecnico.
- **I link già spediti** con l'indirizzo del CRM (`/appuntamento/…`, `/appuntamento-nuoto/…`, `/eventi/…`, `/metodo-pagamento/nucleo/…` e il suo `/fatto`) si rimandano al portale con lo stesso token (`next.config.mjs`). Le vecchie pagine e le due rotte che servivano solo a loro sono state tolte. Resta solo il vecchio link per singolo contratto (`/metodo-pagamento/[token]`), che non si emette più.

**Ordine di rilascio:** `portale-link` pubblicata (fatto), poi merge del portale, poi merge del CRM.

## Tappa 4a: il calendario del laboratorio (13/10/2026)

- **`/lab/calendario`:** le lezioni di gruppo di oggi e dei tre giorni dopo, dal mirror, senza i corsi a iscrizione e senza quelle già cominciate. Si prenota e si disdice per sé o per un figlio del nucleo; si entra in lista d'attesa quando la lezione è completa.
- **Edge Function `portale-lab-calendario`:**
  - verifica la sessione del laboratorio con Supabase Auth e l'elenco dei tester;
  - legge le prenotazioni della persona dal vivo su PerfectGym;
  - prenota con `BookClass` e disdice con `CancelSingleBooking`, senza saltare le regole della disdetta in ritardo, come l'app del club;
  - traduce i rifiuti di PerfectGym e registra ogni azione in `audit_log` (`portale_lab.*`).
- `_shared/sito.ts` ammette l'intestazione `Authorization` per le funzioni del laboratorio.

## Le tappe

| # | Binario | Cosa | Perché in quest'ordine |
|---|---|---|---|
| 0 | — | Repo Expo, progetto Vercel su `app.athlonroma.it`, CORS e domini configurabili nel CRM | è la base per tutto |
| 1 | A | `portale_richieste` + tipo `metodo_pagamento` | il backend c'è già ed è live: cambiano solo l'interfaccia e il link |
| 2 | B | Login OTP per i tester + area riservata in sola lettura | collaudo dell'identità senza scrivere niente |
| 3 | A | `prenota_evento` e `gestisci_appuntamento` | si spengono le pagine cliente rimaste sul CRM |
| 4 | B | Calendario delle prenotazioni + pagamenti del laboratorio | sono le parti più rischiose, e girano solo tra i tester |
| 5 | A | `cambio_abbonamento` | è la prima funzione nuova, che oggi non esiste |

## Decisioni sulle domande aperte (13/10/2026)

1. **Calendario del laboratorio: lezioni reali su PerfectGym.** I tester prenotano davvero con `BookClass`; si può usare un tipo di lezione dedicato per non toccare le lezioni normali. L'annullamento passa da `CancelSingleBooking`, che esiste già in `perfectgym-eventi` ma oggi nessuno lo espone.
2. **Account di test Adyen: lo chiede il club.** Finché non arriva si resta in live con il tetto di 5 €. Quando arriva, `lab-pagamenti` va portato su due ambienti: oggi `environment: 'live'` e l'URL `-checkout-live` sono scritti nel codice (`supabase/functions/lab-pagamenti/index.ts:52,152,320`).
