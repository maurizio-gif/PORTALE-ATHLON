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
