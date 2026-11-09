## La survey dell'app, funzione per funzione: otto capitoli, e «cosa usi» sta nella presenza della voce (08/11/2026)

Richiesta di Maurizio: «una survey sull'app bella completa su tutte le sue funzionalità, chiedendo cosa utilizzano e il giudizio; deve essere bella profonda; poi
la aggiungi alla sezione survey sull'app». È in Club Life → «Raccontaci come sta andando» → **«L'app, funzione per funzione»**, la voce in evidenza in cima al menu
delle survey, prima degli otto argomenti del club. Non è un nono argomento: è un'altra forma, e sta in file suoi accanto a quelli delle survey del club
(`clublife/survey/`, sezione 95).

**Com'è fatta.** Otto capitoli, uno per ogni parte dell'app, **70 funzioni** in tutto (nomi come li vede la persona: Da fare, Gym Floor, Gestisci abbonamento, Train,
Recover, Brevetti…): La Home e il tuo account · Prenotazioni · Abbonamento e pagamenti · Allenarsi: i piani · Mangiare e recuperare · Punteggio, abitudini e dispositivi ·
Famiglia e corsi dei bambini · Club Life, Shop e assistenza. Si scelgono quali fare, in qualunque ordine; ognuno si invia da solo, quindi chi si ferma a metà ha lasciato
quello che aveva finito. Dentro un capitolo i passi sono due:

1. **«Quali di queste usi?»** — le funzioni del capitolo da accendere, ognuna con una riga che dice cos'è; oppure «Non uso niente di questo capitolo».
2. **«Come ti trovi con quelle che usi?»** — a stelle, **solo** per le funzioni accese, con **una scala sola per tutte** (Male · Così così · Abbastanza bene · Bene · Benissimo), così
   le medie fra funzioni si confrontano. Da tre stelle in giù compare «Cosa non ti convince?» (cinque motivi: difficile da trovare, confusa, lenta, manca qualcosa, non mi serve), poi
   una nota sul capitolo.

In fondo c'è il **giudizio finale** (`app-generale`): quattro domande a stelle sull'app nel suo insieme (facile da usare, veloce e affidabile, meno segreteria, giusta e aggiornata),
l'NPS «consiglieresti l'app», «se potessimo migliorare una parte sola, quale?» (fino a due capitoli) e una nota. Come per ogni survey del club, solo chi è contento (NPS ≥ 9
oppure media ≥ 4,5) riceve dopo la richiesta di una recensione su Google. Regole che restano quelle di sempre: basta **un** voto per inviare, in vista cliente non si invia, lo
user-agent dell'app sul telefono (`agenteApp`), e solo `esito: 'ricevuto'` vale «salvata».

**Perché a capitoli: il server prende al massimo dodici voci per invio.** `sito-valutazioni/sondaggio` fa `risposte.slice(0, 12)` e conserva solo `{ id, voto }` (voto 1–5 o `null`),
una `nota` fino a 1000 caratteri e l'NPS. Con settanta funzioni una riga sola non è possibile, e **non è stata toccata nessuna funzione né nessuna migrazione**: ogni capitolo è una riga
a sé di `sondaggi_risposte`, con slug `app-home`, `app-prenotazioni`, `app-abbonamento`, `app-train`, `app-food-recover`, `app-punteggio`, `app-famiglia-junior`, `app-club`, più
`app-generale`. Il CRM, che raggruppa per slug, mostra già «come va, tema per tema»: qui, capitolo per capitolo.

**Come si legge «cosa usi» — la regola da non rompere.** Il server non ha un campo per l'uso; il significato sta nella *presenza* della voce:

- nella riga di un capitolo, una funzione c'è **se la persona dice di usarla**, col voto o con `null` se non ha voluto darlo; se non la usa, la voce non c'è;
- nella riga finale, `non-usa-<capitolo>` c'è **se la persona ha detto di non usare niente di quel capitolo**. Per quei capitoli non parte nessuna riga (il server ne rifiuta una senza giudizi);
- la nota di un capitolo comincia con una riga per ogni funzione votata fino a tre con un motivo scelto, **sempre in italiano** (la legge il club): `Prenotare una lezione 2/5: confusa, lenta o si blocca.`;
  poi le parole della persona, **mai tagliate** — se manca spazio (1000 caratteri) cadono le righe strutturate, non il testo scritto;
- la nota finale comincia con `Da migliorare per primo: …`.

**Il tetto di dodici vale anche per le righe nostre**: un capitolo ha al massimo 12 funzioni (oggi 10), la riga finale ha 4 domande + un marcatore per capitolo = 12. **Un nono capitolo fa sforare**, e il
server taglia in silenzio dalla coda, cioè proprio i marcatori. `scripts/prova-survey-app.ts` lo controlla e si ferma.

**Cosa si vede nel CRM, e cosa no.** Gli id si ripuliscono («prenotare-una-lezione» → «Prenotare una lezione», «non-usa-food-recover» → «Non usa food recover»), quindi gli id delle funzioni sono scritti
come frasi e **non si rinominano mai** (spezzano la serie storica, come per le survey del club). Le etichette dei temi (`ETICHETTE` in `lib/sondaggi.ts` di APP-ATHLON) non sono state toccate: gli slug `app-*` compaiono come «App prenotazioni», «App train»…
(abbellimento, non necessario). Tre cose da sapere leggendo:

- una funzione usata ma non votata compare come «non risposta» (voto `null`);
- **`positivo` e «Recensione Google: proposta a fine survey» sulle righe di un capitolo non vanno lette alla lettera**: il server la calcola da sola (media ≥ 4,5), ma la recensione si propone una volta sola, dopo `app-generale`;
- le righe di una persona sono agganciate alla sua anagrafica con email e numero socio, come per ogni survey (scheda del contatto → Survey).

Per misurare cosa si usa e come va (scritta, **non eseguita**: da provare sul database):

```sql
select r->>'id' as funzione, count(*) as persone_che_la_usano,
       count(*) filter (where r->>'voto' is not null) as con_voto,
       round(avg((r->>'voto')::numeric), 2) as media
  from public.sondaggi_risposte s, jsonb_array_elements(s.risposte) r
 where s.sondaggio like 'app-%' and s.sondaggio <> 'app-generale'
 group by 1 order by 2 desc;
-- i capitoli dichiarati inutilizzati
select substr(r->>'id', 10) as capitolo, count(*) from public.sondaggi_risposte s, jsonb_array_elements(s.risposte) r
 where s.sondaggio = 'app-generale' and r->>'id' like 'non-usa-%' group by 1;
```

**Dove sta.** `survey/dati-app.ts` (capitoli e funzioni in italiano e inglese come coppie `{ it, en }`; la nota al CRM usa sempre `.it`), `survey/calcolo-app.ts` (puro: cosa parte, la nota, i limiti), `survey/statoApp.ts`
(bozze **in memoria e basta**, buttate all'uscita dal laboratorio — `esciDalLaboratorio` in `memoria.ts` — e dopo il giudizio finale), `AppHub.tsx`, `AppCapitolo.tsx`, `AppFinale.tsx`, `AppPezzi.tsx` (la pastiglia),
le rotte `club-life/survey/app/` (`index`, `[capitolo]`, `finale`) e la voce in `ElencoSurvey.tsx`. Di `Survey.tsx` sono stati **esportati** `DomandaStelle`, `DomandaNps` e `Grazie`: `DomandaStelle` ora riceve le sue parole
(`parole`), una riga di spiegazione (`sotto`) e dei figli; senza non cambia niente per le survey del club (`prova-survey.ts` passa: 11 prove).

**Non è nel sito, e non è un confronto col sito.** I temi del sito sono otto e restano gli stessi (`SLUG_SURVEY`, `prova-survey.ts` con `SITO_SURVEYS_TS`): la survey dell'app non ha una pagina `/surveys/…`, non si apre da un link del sito e non ha una copia da tenere in pari.
**Una funzione nuova nell'app** è una voce nel capitolo giusto (id nuovo, nome e descrizione in italiano e inglese): il test controlla ogni lingua.

**Provato.** `npx tsx scripts/prova-survey-app.ts`: 13 prove (dati: id, slug, limiti del server, due lingue; cosa parte per un capitolo e per la riga finale; la nota e il tetto dei 1000 caratteri; lo stato; l'invio con un `fetch` finto, corpo esatto) e
**provata per mutazione**: otto rotture (funzioni non usate che partono, marcatori davanti alle generali, motivi anche con cinque stelle, testo libero tagliato, tetto del server sbagliato, descrizione non tradotta, id duplicato, un capitolo
inviato che resta «non uso») rilevate tutte. `npx tsc --noEmit`: nessun errore nuovo (restano i due di `scripts/prova-ordine-piani.ts`, che c'erano). **In Chromium** (bundle web esportato con `EXPO_PUBLIC_SUPABASE_URL` locale, backend e sessione finti; 390×844,
820×1180 e 1280×800; italiano e, a 390, inglese): Club Life → porta → menu con la voce in evidenza → menu dei capitoli → un capitolo (scelta di quattro funzioni, stelle, motivi che compaiono sotto le tre stelle, nota) → corpo esatto verso `sito-valutazioni` → «Capitolo inviato» → capitolo
successivo → «Non uso niente» (nessuna richiesta) → un capitolo con il server che risponde 500 (errore, e poi l'invio riesce) → senza voto (si ferma prima della rete) → giudizio finale (due capitoli scelti, il terzo si spegne; marcatore `non-usa-abbonamento` nel corpo) →
ringraziamento con la recensione. Nessuno scorrimento orizzontale e nessun errore in console (a parte quelli del banco).
**Non provato**: un invio vero alla funzione pubblicata; l'app su un telefono (iOS e Android); la lettura dei capitoli nel CRM con dati veri; un giro intero con tutte e 70 le funzioni (tempo reale di compilazione).
**Da pubblicare**: solo il portale. Nessuna modifica al sito, nessuna migrazione, nessuna funzione.
