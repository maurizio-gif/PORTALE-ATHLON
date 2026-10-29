# Il server della classifica mensile: come metterlo su (29/10/2026)

**Stato (29/10/2026, sera): PUBBLICATO.** La migrazione è stata eseguita sul database `app-athlon` (5 tabelle, vista, 4 funzioni, job `athlon-classifica-giro` alle 02:30 UTC) e la funzione `portale-lab-classifica` è attiva in produzione (versione 1, `verify_jwt: false`; senza sessione risponde 401). I file sono anche in APP-ATHLON (non ancora committati lì). **Non provato con un tester vero**: la prima persona che entra è il primo vero collaudo. L'app (già su `main` e nell'aggiornamento `test` di EAS) mostra la riga «Classifica di ottobre · ENTRA» nella carta dell'Athlon Health Score ai tester. Le istruzioni qui sotto restano valide per rifare l'operazione.

## Cosa c'è

| File | A cosa serve |
|---|---|
| `supabase/migrations/20261029a_athlon_classifica.sql` | **Il file SQL da incollare in Supabase.** Tabelle, il calcolo del punteggio del mese, il ricalcolo, il giro di notte (pg_cron). In fondo, commentati: come tornare indietro e gli SQL per lo staff (nascondere motto o foto, togliere una persona, vedere le segnalazioni). |
| `supabase/functions/portale-lab-classifica/index.ts` | La funzione che l'app chiama (6 azioni: `stato`, `consenso`, `profilo`, `revoca`, `mese`, `segnala`). |
| `supabase/functions/_shared/classifica/*.ts` | Le parti pure: punteggio (copia in TypeScript del calcolo SQL, serve alle prove), motto, posizioni e righe da mostrare, mese, versione dell'informativa. |
| `supabase/functions/_prove/classifica.ts` | Le prove a mano (23 gruppi), nello stile delle altre. |
| `supabase/config.toml.aggiunta` | Le due righe da aggiungere a `supabase/config.toml` di APP-ATHLON. |
| `prove-pglite/` | Le prove su un Postgres vero (PGlite): la migrazione, 400 scenari casuali SQL contro TypeScript, e la funzione intera. Scritte per questo Mac (percorsi in `/private/tmp`). |

## Come si pubblica (in questo ordine)

**1. Copia i file in APP-ATHLON** (dal Terminale):

```bash
cd "/Volumes/MTARUGGI/Github NEW/PORTALE-ATHLON/docs/classifica-server" && cp supabase/migrations/20261029a_athlon_classifica.sql "/Volumes/MTARUGGI/Github NEW/APP-ATHLON/supabase/migrations/" && cp -R supabase/functions/portale-lab-classifica "/Volumes/MTARUGGI/Github NEW/APP-ATHLON/supabase/functions/" && cp -R supabase/functions/_shared/classifica "/Volumes/MTARUGGI/Github NEW/APP-ATHLON/supabase/functions/_shared/" && cp supabase/functions/_prove/classifica.ts "/Volumes/MTARUGGI/Github NEW/APP-ATHLON/supabase/functions/_prove/" && (echo; cat supabase/config.toml.aggiunta) >> "/Volumes/MTARUGGI/Github NEW/APP-ATHLON/supabase/config.toml" && find "/Volumes/MTARUGGI/Github NEW/APP-ATHLON/supabase" -name '._*' -delete
```

**2. La migrazione (SQL).** Apri Supabase → progetto **app-athlon** (`kdbcwwpdazvtmjolybdm`) → SQL Editor → incolla tutto il contenuto di `20261029a_athlon_classifica.sql` → Run. È rieseguibile (se la lanci due volte non succede niente di male) e non tocca nessuna tabella che esiste già. Poi controlla, con un'altra query:

```sql
select jobname, schedule from cron.job where jobname = 'athlon-classifica-giro';
select count(*) from public.athlon_classifica_consensi;
```

Deve risponderti una riga con `30 2 * * *` e il numero `0`. (Attenzione: è il progetto **app-athlon**, non l'altro progetto Supabase che compare nell'account.)

**3. La funzione.** Dalla cartella APP-ATHLON, su un ramo che ha il `config.toml` aggiornato:

```bash
npx supabase login
```

```bash
npx supabase functions deploy portale-lab-classifica --project-ref kdbcwwpdazvtmjolybdm --use-api
```

(Il primo comando serve solo se la CLI non ti riconosce: apre il browser. **Mai `--no-verify-jwt`**: vale quello che dice `config.toml`.) In alternativa posso pubblicarla io con lo strumento Supabase, su tuo via libera. Il controllo che sia partita, senza sessione, deve rispondere 401 «Sessione scaduta» (un errore di sintassi darebbe 5xx):

```bash
curl -s -X POST https://kdbcwwpdazvtmjolybdm.supabase.co/functions/v1/portale-lab-classifica -H 'Content-Type: application/json' -d '{"azione":"stato"}'
```

**4. L'app.** Niente da pubblicare: è già nell'aggiornamento `test` e su Vercel. Dal telefono di un tester: chiudi e riapri l'app, vai in Athlon Health System → la carta del punteggio ha la riga «Classifica di ottobre». Oggi la funzione risponde solo ai tester del portale.

**Cosa guardare la prima notte** (30/10, dopo le 03:30): in Supabase, `select * from cron.job_run_details where command like '%athlon_classifica%' order by start_time desc limit 3;` deve dire `succeeded`. Il calcolo costa circa 6 millisecondi a persona, quindi anche con mille persone dentro dura pochi secondi.

## Come funziona il punteggio (da confermare: sono scelte mie, vedi `docs/classifica-contratto.md`)

- 0-100, **la media delle settimane del mese**, ognuna pesata per i giorni che ha nel mese (lunedì-domenica, a Roma). Si contano i giorni fino a **ieri**; la settimana in corso si guarda sugli ultimi 7 giorni.
- Pilastri e curva **uguali all'Athlon Health Score dell'app**: Train 70 (2-4 giorni a settimana = massimo, 5 giorni 0,9, 7 giorni 0,7), Food 15 (5 giorni con i pasti principali), Recover 15 (5 notti, 7 ore = 1).
- **Train solo da fonti che la persona non scrive**: ingressi al tornello e presenze segnate dalla reception, un giorno vale una volta. Non le sedute chiuse nell'app né gli allenamenti dei dispositivi.
- **Food e Recover solo con consenso vivo alla versione corrente** (e Food non con i numeri nascosti); il punteggio si rapporta ai pilastri che la persona usa. Così chi non li usa arriva a 100 e **la classifica non premia il consenso ai dati sulla salute**.
- Parimerito = stessa posizione (1, 2, 2, 4). In graduatoria da 1 punto in su. Solo maggiorenni, solo il titolare. Si vedono le prime dieci posizioni e, se la persona è più in basso, lei con due sopra e due sotto.
- **Differenza voluta dall'app**: l'app arrotonda i punti di ogni pilastro e li somma; qui si arrotonda il totale. Possono differire di 1 punto.
- **Cosa succede all'inizio del mese** (da decidere): una settimana a cavallo pesa solo per i giorni che ha nel mese, ma si valuta sul suo ritmo intero. Quindi il 2 novembre chi era in ritmo a fine ottobre parte già alto, anche con zero ingressi in novembre. Se non lo vuoi, si conta solo ciò che è dentro il mese (più semplice da spiegare, ma i primi giorni sono quasi tutti a zero).

## Cosa è provato

- **Il calcolo SQL sui dati veri** (29/10/2026, sola lettura, 5 soci e 8 casi: mese in corso, mese chiuso, bordo del mese, un mese appena cominciato, soci con e senza i consensi): identico al calcolo TypeScript. I dati veri **non sono nel repository** (sono dati personali): la prova su dati inventati, più sotto, copre lo stesso confronto.
- **La migrazione su un Postgres vero** (PGlite), eseguita due volte di fila senza errori; i diritti (solo `service_role`), la RLS su tutte le tabelle, i vincoli.
- **400 scenari casuali, SQL contro TypeScript**: ingressi vicino alla mezzanotte (la data a Roma cambia), prenotazioni annullate, in attesa o senza presenza, consensi vecchi o revocati, numeri nascosti, notti scritte a mano e da dispositivo, minuti di sonno sulle soglie. Sempre uguali. Con le mutazioni: 10 modifiche del codice SQL, tutte rilevate.
- **La funzione intera** (`index.ts` vera, impacchettata) su Postgres con sessione e foto finte: consenso, profilo, revoca, classifica con le righe giuste, nessun dato interno nelle risposte, foto solo di chi le mostra, moderazione dello staff, segnalazioni (e il limite di 20 al giorno), vista cliente chiusa.
- **Le parti pure** (`_prove/classifica.ts`, 23 gruppi) e 22 mutazioni del codice, tutte rilevate.

## Cosa NON è provato

- **Deno e il database vero con la funzione**: la funzione è provata con un Postgres vero ma fuori da Deno (la sessione, la CORS e le foto firmate sono finte). Il primo vero tentativo è il 401 qui sopra, poi un tester che entra.
- **La foto firmata di un altro socio** con il bucket vero (`foto-soci`): il link è finto nelle prove.
- **Un telefono**, e la classifica vista da più persone insieme.
- **Il giro di notte con pg_cron vero** (le prove lo chiamano a mano).
- **Il confronto con il punteggio dell'app**: i due calcoli non sono uguali (4 settimane mobili contro settimane del mese, vedi sopra).

## Cosa resta da fare o da decidere

1. **Confermare le scelte del contratto** (punteggio come media del mese, pilastri in uso, Train solo da fonti verificate, parimerito, solo maggiorenni, aggiornamento di notte) e quella sull'inizio del mese qui sopra.
2. **La pagina «Classifica» del CRM** (vedere chi c'è, nascondere motto o foto, togliere una persona, segnalazioni): **non scritta**. Nel frattempo gli SQL per lo staff sono in fondo alla migrazione. Per le regole dell'App Store (1.2: contenuti di utenti visti da altri) lo staff deve poterli togliere: serve prima di aprire a tutti.
3. **L'informativa del club e il consulente privacy**: il testo del consenso è una bozza (`informativa.ts` nell'app), il punteggio deriva anche da dati sulla salute (Food, Recover), e la promessa «la foto la vede solo il club» non è più vera per chi sceglie di mostrarla.
4. **L'elenco delle parole non ammesse** nei motti è un punto di partenza (`motto.ts`): lo staff lo estende.
5. **Quando cambia la versione di un'informativa** (Food, dispositivi o classifica) va ripubblicata anche `portale-lab-classifica`: ne ha una copia delle costanti nel suo bundle e le riscrive nel database a ogni avvio.
6. **Nessun premio** (il DPR 430/2001 e la regola «premi a soglia» vanno riguardati prima).
