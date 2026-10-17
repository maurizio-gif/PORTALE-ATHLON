# Schede di allenamento

Decisioni dell'utente del 14/10/2026. Si parte dal laboratorio (`/lab`), come
per calendario e pagamenti; il sito e i clienti veri vengono dopo.

## I tre tipi di scheda

| Tipo | Chi la scrive | Dove | Chi la vede |
| --- | --- | --- | --- |
| **Standard** | il responsabile tecnico | CRM | tutti i soci |
| **Personalizzata** | un trainer | CRM | il socio a cui è assegnata |
| **AI** | l'agente AI, su richiesta del socio | app | il socio che l'ha chiesta, subito; nel CRM i trainer la vedono e possono correggerla o ritirarla |

Per ora un trainer può scrivere una scheda per qualsiasi socio. Poi si
restringe a chi ha acquistato un Personal Training (si legge da PerfectGym:
contratti e prenotazioni PT, già nel mirror).

## Il socio, nell'app

- Le sue schede: le standard, le personalizzate, le AI.
- Una scheda è fatta di giorni (A, B, C…), ogni giorno di esercizi con serie,
  ripetizioni, carico indicato, recupero, note; le superserie si raggruppano.
- **Registra l'allenamento**: per ogni serie ripetizioni e kg; poi lo storico
  e i progressi per esercizio.
- **Il timer del recupero** (14/10/2026): ogni scheda dice il recupero, fra
  una serie e l'altra e fra un esercizio e il successivo. Quando il socio
  segna una serie fatta, il timer parte da solo col recupero scritto nella
  scheda: un cerchio che si svuota col conto alla rovescia grande, +15 s / −15 s,
  «Salta». Alla fine vibra e suona, e dice cosa viene dopo (la serie
  successiva, o il prossimo esercizio col suo carico). Il tempo si calcola
  dall'ora di fine, non contando i secondi: se il telefono va in pausa o si
  cambia schermata, al ritorno è giusto. Nell'app (iOS e Android) anche una
  notifica locale quando il recupero finisce con lo schermo spento.
- Chiede una scheda all'agente AI con un questionario: obiettivo, livello,
  giorni a settimana, minuti a seduta, limitazioni o infortuni.

## La libreria degli esercizi

> **Dal 17/10/2026 la libreria è MoveKit** (sezione «La libreria MoveKit», in fondo). Il resto di questa
> sezione racconta la prima libreria, free-exercise-db, che MoveKit sostituisce.

- Base: [free-exercise-db](https://github.com/yuhonas/free-exercise-db),
  pubblico dominio (Unlicense): 876 esercizi con immagini, muscoli, attrezzo,
  livello, istruzioni. Si importa una volta, si traduce in italiano, le
  immagini si copiano nello storage del progetto (non si linka GitHub).
- Dal CRM il responsabile tecnico aggiunge gli esercizi del club (coi video) e
  spegne quelli che non servono.
- L'agente AI sceglie **solo** fra gli esercizi accesi della libreria: non ne
  inventa.
- [Skulpt](https://github.com/skulptapp/skulpt) è GPL-3.0: solo ispirazione
  (tipi di serie, superserie, timer), nessun codice copiato.

## Il modello dei dati (progetto Supabase unico, repo APP-ATHLON)

- `esercizi`: nome e istruzioni in italiano (e l'originale inglese), muscoli
  primari e secondari, attrezzo, livello, categoria, immagini, video, `fonte`
  (`free-exercise-db` | `club`), `attivo`.
- `schede`: `tipo` (`standard` | `personalizzata` | `ai`), titolo,
  descrizione, obiettivo, livello, giorni a settimana, `member_id` (vuoto per
  le standard), autore (email dello staff, o `ai`), stato (`bozza` |
  `pubblicata` | `ritirata`), il questionario che l'ha generata (per le AI).
- `scheda_giorni` → `scheda_esercizi`: ordine, serie, ripetizioni (testo:
  «8-10», «30 s»), carico indicato, **recupero fra le serie** e **recupero
  dopo l'esercizio** in secondi (obbligatori, con un valore proposto),
  gruppo di superserie (nella superserie il recupero si fa alla fine del
  giro, non fra un esercizio e l'altro), note. Anche l'agente AI deve dare
  il recupero per ogni esercizio.
- `allenamenti` (una seduta: socio, scheda, giorno, inizio, fine) →
  `allenamento_serie` (esercizio, numero, ripetizioni, kg, fatta).
- RLS senza policy, come il resto: il portale passa da RPC `security
  definer` e da funzioni `portale-lab-*` che partono dalla sessione del tester.

## Le tappe

1. **Libreria**: tabelle, import di free-exercise-db con la traduzione e le
   immagini.
2. **CRM**: sezione «Schede di allenamento» (libreria; schede standard per il
   responsabile tecnico; schede personalizzate per i trainer, con la ricerca
   del socio; le schede AI dei soci, da rivedere).
3. **Portale** `/lab/allenamento`: le mie schede, la scheda per giorni, la
   seduta con registro e timer, lo storico e i progressi.
4. **Agente AI**: il questionario, la funzione che chiede la scheda a Claude
   con risposta strutturata sugli esercizi della libreria, il limite di
   richieste, l'avvertenza.

## Da decidere più avanti

- La verifica del Personal Training per le schede dei trainer.
- Se un certificato medico scaduto blocca la scheda AI o la registrazione.
- Quante schede AI al mese per socio, e il costo.

## Stato (16/10/2026, la notte)

Fatte tutte e quattro le tappe, per il laboratorio:

1. **Libreria**: le tabelle e il bucket pubblico `esercizi` (APP-ATHLON,
   migrazioni 20261016a/b); i 876 esercizi di free-exercise-db tradotti in
   italiano (nomi da palestra: lat machine, stacco rumeno, multipower) con le
   1.746 foto nel bucket (`scripts/importa-esercizi.mjs`). Al posto dei video,
   finché non arrivano quelli del club, le due foto (partenza e arrivo) si
   alternano in dissolvenza.
2. **CRM**, Attività → Schede di allenamento: le schede standard, quelle per
   un socio, quelle dell'agente AI da rivedere (con «Segna come rivista»);
   l'editor coi giorni e gli esercizi (serie, ripetizioni, carico, i due
   recuperi, la lettera della superserie); la libreria da accendere e
   spegnere, gli esercizi del club, e il video MP4 di ogni esercizio caricato
   dal browser (al posto delle foto, nell'app, in loop e senza audio).
3. **Portale**, `/lab/allenamento` (la scheda «Allenati» del menu): le schede,
   la scheda per giorni con l'ultima volta di ogni esercizio, la seduta col
   registro (ripetizioni e kg già proposti) e il timer del recupero che parte
   da solo (cerchio, ±15 s, Salta, vibrazione e suono, il «dopo», le
   superserie col recupero a fine giro), lo storico e i progressi per
   esercizio.
4. **Agente AI**: il questionario (obiettivo, livello, giorni, minuti,
   attrezzatura, limitazioni), il workflow n8n `athlon-scheda-ai` coi modelli
   gratuiti di OpenRouter (prima Nemotron 3 Super, poi Gemma 4 31B, poi
   `openrouter/free`), la scheda controllata sulla libreria accesa e salvata
   pubblicata; tre schede AI in trenta giorni.

Restano da fare: la notifica locale di fine recupero nell'app nativa (serve
expo-notifications e la build), i video del club, e le decisioni qui sopra.

## Massimali e schede del club (16/10/2026)

- **Il test dei massimali** (`/lab/allenamento/test`): chest press e
  piegamenti (parte superiore), sit-up (core), leg extension, leg curl, squat a
  corpo libero e squat con bilanciere (parte inferiore). A carico il socio
  scrive peso e ripetizioni (fra 4 e 10 consigliate, al massimo 12) e il
  massimale si stima con la media di Epley e Brzycki; a corpo libero le
  ripetizioni massime. Si rifà ogni 6 settimane (4 per i principianti): lo
  ricordano l'elenco e la scheda. Tabella `massimali` (migrazione 20261016c).
- **I carichi in percentuale**: `scheda_esercizi.percentuale` (20-100). Nell'app
  diventa chili col massimale del socio, arrotondati per difetto
  all'incremento dell'attrezzo (`esercizi.incremento_kg`, minimo
  `peso_minimo_kg`); a corpo libero diventa ripetizioni. Finché il massimale
  manca l'app mostra la percentuale e spiega cosa fare; sugli esercizi fuori
  dal test il massimale si ricava dalla prima seduta (fonte `seduta`). La
  seduta propone già i chili calcolati.
- **Le schede del club**: dieci proposte del responsabile tecnico, pubblicate.
  Nel CRM sono in cima («Schede del club», «Nuova scheda del club»,
  «Duplica» per partire da una che c'è), con la colonna «% mass.»
  nell'editor; nella libreria si impostano incremento, peso minimo e test di
  ogni esercizio. Nell'app un elenco compatto filtrabile per obiettivo.

## Le schede della vecchia app e i dati del corpo (15/10/2026)

- **Le schede del club** ora sono quelle della vecchia app (dagli screenshot):
  Tonificazione 8.1, 8.2, 8.3, Ipertrofia 8.1, 8.2, Dimagrimento 8.1, 8.2,
  8.3, una seduta ciascuna, al posto delle dieci proposte. Esercizi abbinati
  alla libreria, piu' tre del club (hip thrust e rematore alla macchina,
  piegamenti sulle ginocchia); i carichi in percentuale dalle ripetizioni
  (6 → 80%, 10 → 70%, 12 → 65%, 15 → 60%). Script:
  APP-ATHLON `scripts/importa-schede-vecchia-app.mjs`. Mancano gli «Start Up».
- **I tuoi dati** (Workout → I tuoi dati, `/lab/allenamento/misure`):
  altezza, peso e BMI, circonferenze, massa grassa e magra, col grafico
  dell'andamento. Tabella `misure_corporee`, funzione `portale-lab-misure`.
- La sezione si chiama **Workout** (prima «Allenati»).
- **Il metodo di pagamento** nell'app (`/lab/metodo-pagamento`, da Pagamenti
  e dalla card dell'abbonamento in Home): la stessa procedura del link per
  email, con la richiesta aperta da `portale-lab-pagamenti` (origine 'app').

## La libreria MoveKit (17/10/2026)

Il club ha comprato la libreria **MoveKit** (movekit.com): 582 esercizi, ognuno con un video 3D di pochi
secondi e un poster, per sostituire free-exercise-db. I file originali (2,8 GB di video, 2,4 GB di poster PNG)
stanno in `public/esercizi-new`, **fuori da git** (`.gitignore`).

**La licenza (v1.0, 4/8/2026) in quello che conta qui:**

- Mostrare i contenuti agli utenti dell'app è permesso; **esporre pubblicamente gli indirizzi dei file no** (§3).
  Per questo i file stanno nel bucket **privato** `esercizi-movekit` (come `foto-soci`) e le funzioni li danno come
  link firmati di quattro ore (`_shared/esercizi-media.ts` nelle funzioni, `lib/schede-server.ts` nel CRM). Il
  bucket pubblico `esercizi` resta per i video che il club carica da sé.
- Modificare i video è permesso (§2: «modifying and editing clips»): per questo si ricomprimono. Non si tolgono
  watermark né metadati di provenienza (§5): i file controllati non ne hanno (nessun testo nei PNG, nessun tag nei
  video, nessun watermark nei fotogrammi) e la ricompressione mantiene i metadati del contenitore.
- Vietato (§5): rivendere o ridistribuire i file, darli ai modelli di AI o generare animazioni da loro. L'agente AI
  vede solo nomi e muscoli degli esercizi, mai i file.
- Non detto dalla licenza (da chiedere a hello@movekit.com se serve): se un link firmato per un socio loggato conta
  come «esposto», se si possono convertire i poster, se si possono tradurre i testi, se un repo privato va bene.
- La licenza è valida per un'entità (il club e le sue controllate); un prodotto con un altro marchio, o una vendita
  ad altri club, ne vuole una sua. Gli aggiornamenti della libreria sono inclusi per 12 mesi.

**Cosa c'è nell'app.** Per ogni esercizio: nome, una frase che lo descrive, le istruzioni passo per passo, gli
errori da evitare («Da evitare»), il video in loop (muto, senza comandi) col poster sotto. Si traducono questi
campi; la descrizione lunga, i benefit e gli use case di MoveKit sono scritti per chi costruisce cataloghi e non si
importano (restano in `public/esercizi-new`). Tabella `esercizi`: `descrizione`, `errori_comuni` e gli originali in
inglese (`*_originali`), fonte `movekit`.

**I file.** Video 960 px H.264 senza audio (CRF 26, 40–760 kB, in media 250 kB invece di 4 MB), poster JPEG 960 px
(45 kB invece di 3 MB): 170 MB in tutto invece di 5 GB. La ricetta è `scripts/comprimi-esercizi-movekit.sh` in
APP-ATHLON e riproduce byte per byte i file caricati. Non si ritaglia niente: le figure orizzontali occupano l'85%
del fotogramma, e per questo i frame grandi dell'app sono 16:9.

**I muscoli e gli attrezzi.** MoveKit ha 16 muscoli (core, schiena e tibiale sono nuovi: non distingue dorsali e
schiena centrale) e 21 attrezzi; gli attrezzi si riportano alle chiavi che l'agente AI già conosce
(`corpo_libero`, `manubri`, `kettlebell`, `elastici`, `fitball`, `foam_roller`…) e il resto è `altro`, così non
finisce nelle schede «a corpo libero». Il nuoto è `altro`: vuole una piscina. Nuova categoria `mobilita`, che
l'agente AI vede come le altre.

**Il passaggio dalla vecchia libreria** (`20261018x_libreria_movekit_passaggio.sql`, una transazione che si ferma
da sola se qualcosa non torna): salva i vecchi esercizi e tutti i collegamenti in `backup_*_20261018`; riporta
al loro equivalente le righe delle schede (131), le serie registrate (3) e i massimali (13), con il carico curato
(incremento, peso minimo, coefficienti di stima, test dei massimali); accende i 582 esercizi e toglie quelli di
free-exercise-db. Gli abbinamenti sono 67, **9 approssimati** (stesso movimento ma presa, lato o attrezzo diversi:
Shoulder_Circles, Single-Leg_Leg_Extension, Split_Squat_with_Dumbbells, Recumbent_Bike, Standing_Hip_Flexors,
Standing_Dumbbell_Calf_Raise, Cable_Rear_Delt_Fly, Standing_One-Arm_Cable_Curl, Underhand_Cable_Pulldowns): il club
li cambia dal CRM. **Due esercizi non hanno una controparte** e restano del club, senza video, da caricare dal
CRM: la posizione del bambino e «Rotazione e flessione della colonna».

**Stato (17/10/2026).** Fatto tutto in produzione: import dei 582 esercizi tradotti, 1164 file nel bucket privato,
`portale-lab-schede` che firma i link (versione 5) e **il passaggio applicato** (migrazione `libreria_movekit_passaggio`):
876 vecchi esercizi tolti, 582 di MoveKit accesi, 131 righe di scheda, 3 serie e 13 massimali ricollegati (nessun
riferimento orfano; il backup è in `backup_esercizi_20261018` e `backup_collegamenti_esercizi_20261018`). Controllate
tutte e 12 le schede pubblicate: 254 link firmati (poster e video) si aprono, e le uniche 4 righe senza video sono i due
esercizi del club. L'agente AI non ha bisogno di modifiche: il suo workflow n8n usa solo il catalogo che gli passa la
funzione.

Da fare: **le due PR** (CRM e app). Senza quella del CRM le miniature di MoveKit nel pannello non si vedono (lo vede solo
lo staff); l'app già in produzione legge i link firmati, ma mostra i muscoli nuovi in minuscolo e senza descrizione né
«Da evitare» finché non esce la sua. Poi: cancellare le foto di free-exercise-db dal bucket `esercizi` (cartella `fedb/`,
94 MB: non le usa più nessuno e si ricaricano da GitHub con `scripts/importa-esercizi.mjs`) e togliere
`public/anteprima-esercizi` (le prove delle animazioni, 95 MB).
