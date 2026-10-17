# Dati dei wearable nel portale: analisi di fattibilità

*Analisi del 17/10/2026. Solo lettura del codice e delle fonti ufficiali: non è stato modificato niente, né installato, migrato o pubblicato. **Decisione presa: strada A (build nativa Expo).** Il documento serve a riprendere il lavoro in seguito.*

## L'obiettivo

Far collegare al cliente Apple Salute (iPhone, HealthKit) e Health Connect (Android), per portare su Supabase i dati che le app dei produttori condividono con questi due aggregatori, senza integrazioni separate per ogni marchio. I dati devono essere consultabili nell'app cliente e, con permessi appropriati e il consenso del socio, nel gestionale.

Primo rilascio: passi giornalieri, allenamenti (tipo, durata, distanza, energia, quando ci sono), frequenza cardiaca e a riposo, sonno, peso e massa grassa. L'HRV viene dopo, perché le misure delle due piattaforme non sono equivalenti.

## Cosa dice il codice

La premessa «PWA React» è inesatta, e cambia la strategia.

- **Client** (`PORTALE-ATHLON`): Expo ~57, React Native 0.86.3, React 19.2.3, expo-router, react-native-web. Su Vercel va l'export web `output: "single"`.
- **Gestionale** (`APP-ATHLON`): Next 14.2 con `@supabase/ssr`, più 48 Edge Function e 319 migrazioni nello stesso progetto Supabase. Il sito pubblico (`SITO-ATHLON`) non è stato esaminato.
- **Già pronto per il nativo:**
  - `app.json` dichiara lo schema `athlon`, gli associated domains e gli intent filter Android per `app.athlonroma.it/r/*`.
  - `src/lib/localStorage.native.ts` tiene la sessione Supabase con `expo-sqlite` sul telefono.
  - `src/lib/supabase.ts` rinnova il token con `AppState`.
  - `README.md` e `docs/piano-fase-1.md` dicono che il portale è fatto per diventare l'app iOS e Android.
- **Cosa manca:** nessuna cartella `ios/` o `android/`, nessun `eas.json`, nessun `bundleIdentifier` né `package`. Nessuna build nativa è mai stata prodotta. Il dominio non serve ancora `/.well-known/apple-app-site-association` né `assetlinks.json` (`public/` non li ha).
- **Login:** codice via email (`portale-accesso` + `verifyOtp`), senza OAuth: funziona uguale sul telefono.
- **Backend:**
  - Le funzioni `portale-lab-*` verificano il JWT con il JWKS (`_shared/sessione-portale.ts`), controllano il tester (`portale_lab_tester`) e ricavano il socio dall'email, mai dal client.
  - Le chiamate native non portano `Origin`, quindi la lista CORS di `_shared/sito.ts` non le blocca.
- **Cose native incomplete già oggi:** Adyen e la firma del contratto hanno solo un avviso («apri il portale dal browser»): `src/features/lab/adyen.tsx`, `FirmaPad.tsx`. Valgono per l'app nativa a prescindere dai wearable.

## Strada scelta: A, build nativa Expo

Un solo progetto, un solo codice, compilato in due modi: web (Vercel, come oggi) e app iOS e Android. Non è «un'app gemella».

- Cosa vede l'utente, grafica, testi e impostazioni si scrivono una volta e arrivano in entrambe.
- Il codice che usa API del browser (`window`, `document`, `localStorage`: circa 21 file) ha già, dove serve, una versione per il web e una nativa (`*.web.tsx` e il suo gemello). Una funzione nuova che le tocca va scritta in due versioni.
- La parte salute esiste solo sul telefono, ed è disattivata sul web con `Platform.OS`.
- Si sviluppa e si prova sul web come adesso, e ogni tanto si controlla la stessa schermata su una dev build.
- **Pubblicazione:** il web va online al deploy; l'app dopo una versione approvata da Apple e Google. L'aggiornamento «in volo» di Expo (EAS Update) permetterebbe di cambiare solo grafica e testi senza passare dagli store, ma non è configurato né verificato qui.

**Perché non Capacitor (strada B).** Avrebbe lo stesso codice, ma in una WebView:
- una seconda toolchain nativa;
- l'origine `capacitor://localhost` da aggiungere ai CORS;
- `Platform.OS === 'web'` sarebbe vero anche nell'app (44 usi);
- niente service worker;
- il plugin `@capgo/capacitor-health` non risulta avere sincronizzazione incrementale né cancellazioni.

Vantaggio di B: Adyen web e il canvas della firma funzionerebbero com'è. È il ripiego se quei due flussi dentro l'app diventano una priorità.

## Plugin

Versioni, licenze e peer dependency dal registro npm (sola lettura, 17/10/2026).

| Piattaforma | Pacchetto | Stato |
|---|---|---|
| iOS | `@kingstinct/react-native-healthkit` 16.2.0 | MIT, aggiornato il 12/10/2026. Peer: React ≥19, RN ≥0.79, `react-native-nitro-modules` ≥0.35 (ultima 0.37.1). Query ancorate documentate; plugin Expo per entitlement e stringhe d'uso. |
| Android | `react-native-health-connect` 4.1.3 | MIT, rilascio del 6/8/2026. Dalla v4 il plugin Expo è incluso (`expo-health-connect` è archiviato). Serve minSdk 26; non funziona in Expo Go, serve una dev build. |
| Capacitor (B) | `@capgo/capacitor-health` 8.11.12 | MPL-2.0, aggiornato il 15/10/2026, richiede Capacitor ≥8. API: lettura, workout, aggregati. |

**Non verificato:**
- compatibilità di Nitro con RN 0.86 ed Expo 57, con `reactCompiler: true`;
- background delivery nel plugin kingstinct (non risulta in documentazione);
- metodi `getChangesToken`/`getChanges` esposti da `react-native-health-connect`.

Si vede compilando una dev build.

## Cosa è documentato sulle due piattaforme

- **iOS:**
  - Le query ancorate (`HKAnchoredObjectQuery`) gestiscono nuovi campioni e cancellazioni.
  - Con il telefono bloccato i dati protetti non sono leggibili.
  - Il background delivery richiede l'entitlement `com.apple.developer.healthkit.background-delivery` e non ha orari garantiti. Un forum Apple riporta che si ferma dopo un force-quit.
  - Per i tipi in lettura iOS non dice se l'utente ha negato: «nessun dato» e «negato» sono indistinguibili.
- **Android:**
  - Il token delle modifiche vale 30 giorni; scaduto, si rilegge dall'ultimo timestamp o dagli ultimi 30 giorni e si deduplica per ID.
  - Senza `READ_HEALTH_DATA_HISTORY` si leggono solo i 30 giorni prima del primo permesso.
  - La lettura in background richiede `READ_HEALTH_DATA_IN_BACKGROUND`.
  - Le cancellazioni portano solo l'ID: vanno salvati gli ID originali.
  - Health Connect è un'app Play Store fino ad Android 13, nel sistema da Android 14. `SDK_UNAVAILABLE` (non supportato) si distingue da `SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED` (da installare o aggiornare), e si possono controllare i permessi concessi.
- **Dati:** passi, sonno, sessioni di esercizio, battito a riposo e grasso corporeo sono record Health Connect. La frequenza cardiaca di un allenamento si lega alla sessione solo per sovrapposizione di tempo. HRV e grasso non compaiono fra gli aggregati supportati.

**Da verificare su dispositivo:**
- deduplicazione dei passi fra più sorgenti;
- HRV;
- fuso orario nei campioni;
- tipi di attività dei produttori terzi;
- quali marchi scrivono davvero in Salute o in Health Connect.

## Impatto sul database esistente

- **Nessun dato salute o wearable esiste oggi.**
- **`misure_corporee`** (`20261016d`) tiene peso e massa grassa, una riga per giorno per `member_id`, scritte da socio e trainer. I dati dei wearable **non** vanno scritti lì: sovrascriverebbero un dato manuale. La schermata `src/features/lab/dati/Misure.tsx` li mostrerà insieme, con la fonte.
- **`allenamenti`** sono i registri di forza dell'app: gli allenamenti dei wearable vanno in una tabella propria, senza fusione automatica.
- **Identità:** i dati sono legati a `member_id` PerfectGym, ricavato dall'email con `metodo_nucleo_da_email` (`20261004d`), che sceglie un solo titolare. Una stessa email può corrispondere a genitore e figli: i dati del telefono vanno legati solo a chi ha fatto login, non al nucleo. I minorenni restano fuori dal primo rilascio.
- **Sicurezza:** nessuna migrazione contiene `create policy`. Le tabelle hanno RLS attiva e nessuna policy: si accede solo dalle Edge Function o dal CRM con la service key. Convenzione da mantenere. Lo stato RLS sul database vivo non è stato verificato.
- **Multi-centro:** non è multi-tenant (`clubId: 1` fisso in `portale-lab-calendario` e `portale-lab-personal`, nessun `centro_id`). La domanda su una persona in più centri oggi non si pone.
- **Staff:** i permessi sono a sezioni (`staff_users.sezioni_consentite`, `lib/auth/sezioni.ts`), non per socio né per centro, e oggi nessuno staff vede peso o allenamenti dei soci. Per i dati salute servono una sezione dedicata, un consenso separato del socio alla visibilità allo staff, e il registro degli accessi (`lib/audit.ts`, `AZIONI_LOG`).
- **Vista cliente:** esclusa per la salute (`sessione-portale.ts` ammette in vista solo le letture in lista, quindi per default sarebbe chiusa).

## Architettura proposta

Tutte le tabelle con RLS attiva e nessuna policy.

- **`salute_collegamenti`:** `member_id`, `auth_user_id`, piattaforma, categorie concesse, stato, ultima sincronizzazione, `consenso_staff` con data e versione dell'informativa, revoca.
- **`salute_campioni`:** tipo, inizio, fine, fuso, valore, unità, sorgente e dispositivo, ID originale, piattaforma, soft-delete. Unico su `(member_id, piattaforma, id_origine)`.
- **`salute_sessioni`:** allenamenti e sonno (durata, distanza, energia, frequenza media e massima).
- **`salute_giornaliero`:** passi, battito a riposo e minuti di sonno, calcolati con gli aggregati di piattaforma (che deduplicano le sorgenti: da validare su dispositivo).
- **Battito:** min/media/max giornalieri; una serie solo per gli allenamenti, se servirà. I campioni grezzi del battito non si tengono.
- **Edge Function `portale-lab-salute`:** `collega`, `stato`, `sync` (a lotti, con validazione e upsert), `scollega`, `elimina_dati`, `leggi`. Il `member_id` si ricava sul server, come in `portale-lab-misure`; nessuna chiave privilegiata nell'app.
- **Idempotenza e doppioni:** upsert sull'ID originale. Lo stesso allenamento da due sorgenti si segnala per sovrapposizione senza fonderlo.
- **Correzioni e cancellazioni:** anchor su iOS, token delle modifiche su Android; le cancellazioni sono soft-delete.
- **Prima sincronizzazione:** finestra di 90 giorni.
- **Disconnessione:** ferma la sincronizzazione e lascia i dati finché la persona non chiede di cancellarli. La revoca fatta dal sistema si riconosce solo su Android.

## Esperienza utente

1. Collega Apple Salute o Health Connect.
2. Spiegazione delle categorie richieste e di come si usano.
3. Permessi di sistema.
4. Prima sincronizzazione.
5. Stato della connessione e ultima sincronizzazione.
6. Disconnessione.

Gli stati distinguibili:
- **iOS:** solo «dispositivo senza Salute» (`isHealthDataAvailable`); «nessun dato» e «accesso negato» sono indistinguibili.
- **Android:** non supportato, da installare o aggiornare, permessi non concessi, nessun dato.

## Requisiti di pubblicazione

- **Apple** (linea guida 5.1.3): niente pubblicità o marketing sui dati di HealthKit, niente iCloud, niente cessione a terzi senza permesso; stringhe d'uso, informativa privacy.
- **Google Play:** dichiarazione per le app salute in Play Console; l'informativa deve coincidere con quella mostrata in Health Connect; si chiedono solo i tipi di dato che servono, e se cambiano la dichiarazione si rifà.
- **Staff:** il permesso tecnico sul telefono non autorizza la visibilità allo staff. Serve un consenso esplicito e distinto, perché sono dati sanitari. L'informativa la scrive il club.

## MVP e test

**MVP:** collega, spiegazione, permessi, prima sincronizzazione, stato con ultima sincronizzazione, «Sincronizza ora», scollega. La sincronizzazione parte all'apertura dell'app. Il background resta una funzione separata, con i limiti di iOS e Android sopra.

**Test su dispositivi reali** (decidono la riuscita della strada A):
- iPhone con Watch e Android recente, più un Android 13;
- passi senza doppioni con due sorgenti;
- cancellazione e correzione alla fonte;
- token scaduto su Android;
- permessi negati e ritirati;
- sincronizzazione dopo offline;
- app chiusa a telefono bloccato;
- sorgenti terze (Garmin, Fitbit, Polar).

## Stima

Giorni di lavoro di una persona, con molta incertezza fino al prototipo.

| Voce | Giorni |
|---|---|
| Backend: tabelle, funzione, test | 4–6 |
| Client: modulo salute, schermate, stati | 6–9 |
| Configurazione nativa: identificativi app, EAS, entitlement, firma, dev build | 3–5 |
| Vista staff nel CRM, consenso e audit | 3–4 |
| Test su dispositivi reali | 4–6 |
| Pubblicazione (tempo di calendario, in gran parte attesa delle revisioni) | 5–10 |

Ordine di grandezza: 4–6 settimane per uno sviluppatore. Restano fuori Adyen e firma sulla build nativa.

## Da decidere o da sapere prima di cominciare

- Se l'app nativa affiancherà la PWA o la sostituirà.
- Account Apple Developer e Google Play del club, e disponibilità di un Mac con Xcode (un commento in `metro.config.js` parla di macOS, ma non è una conferma).
- Chi dello staff dovrà vedere i dati, e la valutazione legale (dati sanitari, consenso, minorenni).
- Lo stato reale delle policy RLS sul database vivo.
- Quali dispositivi usano davvero i soci.
- La compatibilità effettiva di Nitro e dei plugin con RN 0.86, che si vede solo compilando.
- Se configurare EAS Update.

## Fonti

- [Health Connect: sincronizzazione e token](https://developer.android.com/health-and-fitness/health-connect/sync-data)
- [Health Connect: disponibilità](https://developer.android.com/health-and-fitness/guides/health-connect/plan/availability)
- [Health Connect: tipi di dato](https://developer.android.com/health-and-fitness/health-connect/data-types)
- [Pubblicare un'app salute su Google Play](https://developer.android.com/health-and-fitness/health-connect/publish)
- [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [HKHealthStore.authorizationStatus](https://developer.apple.com/documentation/healthkit/hkhealthstore/authorizationstatus(for:))
- [Apple: HealthKit con dispositivo bloccato](https://developer.apple.com/forums/thread/824819)
- [WWDC16: query ancorate](https://developer.apple.com/videos/play/wwdc2016/209/)
- [react-native-healthkit](https://github.com/kingstinct/react-native-healthkit)
- [react-native-health-connect](https://www.npmjs.com/package/react-native-health-connect)
- [@capgo/capacitor-health](https://capgo.app/docs/plugins/health/)
