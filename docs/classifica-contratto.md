# Classifica mensile dell'Athlon Health Score: contratto per il server (29/10/2026)

**Stato.** L'app (PORTALE-ATHLON) è scritta e provata contro un backend finto: riga nella carta del punteggio, schermata, consenso, foto e motto, segnalazione, uscita. **Il server è scritto e provato in `docs/classifica-server/` (migrazione, funzione, calcolo: vedi `LEGGIMI.md`), ma non è pubblicato e manca la pagina del CRM.** Finché la funzione non risponde (404) l'app non mostra niente della classifica e il punteggio resta com'è: si può pubblicare l'app prima del server senza rompere niente.

Questo documento è il compito per chi scrive il server: tabelle, funzione `portale-lab-classifica`, calcolo dei punti, moderazione e pagina del CRM. I tipi esatti sono in `src/api/classifica.ts`.

## Cosa ha deciso Maurizio

- **Classifica del mese**, dal primo all'ultimo giorno (Europa/Roma); poi si riparte da zero. Non è assoluta.
- **Si entra con un consenso a parte.** Chi non è dentro vede l'invito e quanti sono, **senza nomi**. Dentro, la classifica la vedono solo i soci che sono dentro.
- **Conta tutto l'Athlon Health Score** (Train, Food e Recover), non solo l'allenamento.
- **Si vedono le prime dieci posizioni e, se la persona è più in basso, lei con due sopra e due sotto.** Niente elenco completo.
- Appena si entra l'app propone **la foto e un motto** (una frase che motiva): tutti e due facoltativi.

## Cosa ho scelto io dove non c'era una decisione (da confermare)

1. **Il punteggio del mese è un numero da 0 a 100**: la media dell'Athlon Health Score nelle settimane che cadono nel mese (le settimane a cavallo di due mesi pesano per i giorni che hanno nel mese). Non è la somma dei punti: così una settimana a metà non crea ingiustizie e il numero resta quello che la persona già conosce.
2. **Chi non usa Food o Recover è valutato sui pilastri che usa** (come fa già l'Athlon Health Score quando un pilastro è escluso: «calcolato sui pilastri che usi»). Senza questo, chi non dà il consenso ai dati sulla salute partirebbe da 70 su 100 invece che da 100, e la classifica premierebbe il consenso: contro la regola del club (art. 7, par. 4 GDPR, «nessun vantaggio dipende dal consenso a Food, Recover o alle misure»).
3. **Train solo da fonti che la persona non scrive**: gli ingressi (tornello) e le presenze alle lezioni segnate dalla reception. **Non** le sedute chiuse nell'app né gli allenamenti dei dispositivi: si gonfiano con un tocco, e una classifica invoglia a farlo. Il server ha già queste fonti (le usa per «La tua abitudine», 22/10/2026: vedi il `CLAUDE.md` di APP-ATHLON). Food e Recover restano dichiarati dalla persona (diario e sonno): **sono la parte barabile, ma pesano il 30%** (Train 70, Food 15, Recover 15), quindi non decidono la classifica da sole.
4. **Parità**: stessa posizione (1, 2, 2, 4). **Si è in graduatoria da 1 punto in su**; chi è dentro ma ha 0 punti vede «Ancora nessun punto questo mese».
5. **Solo maggiorenni, solo il titolare** (mai i membri del nucleo). Il nome pubblico è **nome e iniziale del cognome** («Marco R.»): lo costruisce il server, l'app lo mostra.
6. **Aggiornamento**: una volta al giorno, di notte (cron), con i dati di ieri. `aggiornata_il` lo dice.
7. **Nessun premio.** Se un giorno ce ne sono: il DPR 430/2001 (concorsi a premio) e la regola «premi a soglia, nessuna gara su cibo e sonno» del `CLAUDE.md` di PORTALE-ATHLON vanno riguardati prima.

## Funzione `portale-lab-classifica`

Stesse regole delle altre `portale-lab-*`: POST `{azione, …}`, sessione del socio, risposta `{ok: true, …}`; senza consenso alla classifica le azioni diverse da `stato`, `consenso` e `revoca` rispondono **403 con `consenso: false`**. In vista cliente dello staff (`X-Athlon-Come`) **tutto è chiuso** (non è fra le letture): lo staff non vota né entra al posto di un socio.

| Azione | Corpo | Risposta |
|---|---|---|
| `stato` | — | `StatoClassifica` (sotto). Anche per chi non è dentro: `consenso: null`, `me: null`, `profilo: null`. |
| `consenso` | `{versione, motto?, mostra_foto?}` | `StatoClassifica`. **400** se `versione` non è quella corrente (`VERSIONE_INFORMATIVA_CLASSIFICA`). Registra consenso, versione, data. |
| `profilo` | `{motto: string\|null, mostra_foto: boolean}` | `StatoClassifica`. **422** con `errore` leggibile se il motto non passa i controlli. |
| `revoca` | — | `StatoClassifica` (con `consenso: null`). Esce **subito**: cancella `motto` e `mostra_foto`, toglie la riga dalla classifica. Resta la registrazione di consenso e revoca. |
| `mese` | — | `ClassificaMese`: `righe` (prime 10 + la persona con due sopra e due sotto, ordinate), `su`, `aggiornata_il`. |
| `segnala` | `{riga: string}` | `{ok: true}`. `riga` è l'`id` opaco della riga (**mai** il `member_id`: va risolto dal server nel mese corrente). |

`StatoClassifica`: `mese {id 'AAAA-MM', inizio, fine, giorni_rimasti (oggi compreso)}`, `versione`, `maggiorenne`, `consenso {versione, accettato_il} | null`, `nome_pubblico`, `partecipanti` (quanti sono in classifica, **senza nomi**), `profilo {motto, mostra_foto} | null`, `me {posizione | null, su, punti} | null`.

`RigaClassifica`: `id` (opaco, cambia ogni mese), `posizione`, `nome`, `punti`, `motto | null`, `foto | null`, `tu`.

- **La foto** è il link firmato (un'ora) di quella che il club ha già (`foto-soci`, la stessa di `portale-lab-anagrafica`), **solo** per chi ha `mostra_foto` vero **e** un consenso vivo. Senza una di queste due, `foto: null`. La foto non si carica da qui: si cambia dal Profilo (`portale-lab-anagrafica`, azione `foto`).
- **Il motto**: al massimo 80 caratteri (conta i caratteri, non i byte), ripulito agli spazi; **niente indirizzi, link, mail o `@`**; elenco di parole non ammesse (italiano e inglese). Il server è l'autorità: l'app controlla solo l'ovvio.
- **Non esporre mai** un `member_id`, un'email, il cognome intero, né i punti dei singoli pilastri: la classifica mostra solo il totale.

## Tabelle (proposta)

- `athlon_classifica_consensi`: `member_id` (pk), `versione`, `accettato_il`, `revocato_il`, `mostra_foto bool`, `motto text`, `motto_nascosto bool` (lo mette lo staff: il motto sparisce ma la persona resta dentro), `foto_nascosta bool`, `rimossa_dallo_staff bool`.
- `athlon_classifica_punti_giorni`: `member_id`, `giorno`, `train`, `food`, `recover`, e quali pilastri erano in uso quel giorno: serve alla media del mese. **Si calcola solo per chi ha il consenso alla classifica**, e si cancella con la revoca.
- `athlon_classifica_mese` (vista o tabella ricalcolata di notte): `mese`, `member_id`, `punteggio`, `posizione`.
- `athlon_classifica_segnalazioni`: `id`, `mese`, `riga_member_id` (interno), `segnalata_da` (interno), `creata_il`, `esito`.
- **Registro dei consensi**: come per le altre funzioni, resta la prova di quando si è dato e tolto il consenso (`app_consensi…`).

## Il CRM (pagina «Classifica» per lo staff)

Serve, e non è un di più: **sono contenuti scritti da persone e visti da altre persone** (App Store, linea guida 1.2: filtro, modo di segnalare, e staff che agisce). Lo staff deve poter: vedere chi è in classifica e da quando; **nascondere un motto o una foto** (senza togliere la persona); **togliere una persona** dalla classifica; vedere le segnalazioni e chiuderle. Ogni azione si registra. Lo staff non vede i dati dei pilastri.

## Privacy: cose da far vedere al consulente

- **Il testo del consenso e l'informativa** sono in `src/features/lab/classifica/informativa.ts` (bozza, versione `2026-10-29`); la versione va uguale nel server (`_shared/classifica/versione.ts` o simile). Cambiando il testo si cambia in tutti e due i posti.
- Il punteggio **deriva anche da dati sulla salute** (Food, Recover). Nella classifica si vede solo il totale, ma il consenso è scritto come esplicito (art. 9, par. 2, lett. a) e dice che il punteggio ne tiene conto. Alternativa più prudente: escludere Food e Recover dalla classifica (è la raccomandazione che avevo dato; Maurizio ha scelto di tenerli).
- **La foto**: la foto che il club ha su PerfectGym oggi è dichiarata «vista solo dal club, non dagli altri soci» (testo nel foglio della foto). **Con la classifica non è più vero per chi sceglie di mostrarla**: l'app ha già cambiato quel testo per chi è dentro (`FotoProfilo.tsx`), e va cambiata anche l'informativa generale del club.
- **Solo adulti.** Nessun minorenne compare, nemmeno col consenso dei genitori.
- **Revoca = sparizione immediata**, anche dalle cache: il link firmato di una foto vale un'ora, quindi una foto già mostrata può restare visibile al massimo per quel tempo.

## Come si pubblica

1. **Migrazione** (tabelle, vista, cron) e **funzione** `portale-lab-classifica`, con `supabase/config.toml` (mai `--no-verify-jwt` alla cieca).
2. **CRM** (pagina Classifica) e **informativa del club** aggiornata.
3. **App**: già pronta e tollerante al 404, si può pubblicare prima o dopo. Con la funzione accesa, la riga compare nella carta dell'Athlon Health Score.

## Prove da fare sul server

- Un mese a cavallo: settimana del 28 ottobre al 3 novembre, il 31 a mezzanotte e il 1° alle 00:01 (Roma): la classifica si azzera, e i punti di ottobre restano nel passato.
- Chi non usa Food né Recover può arrivare a 100.
- Revoca: la riga sparisce al giro dopo, `profilo` torna `null`, motto e foto non escono più.
- Un minorenne e un membro del nucleo non compaiono né possono entrare.
- Un motto con link, mail, `@` o parole non ammesse risponde 422.
- La foto di un'altra persona non esce mai senza `mostra_foto` e consenso.
- Vista cliente: nessuna azione funziona.

## Compito da incollare in una sessione su APP-ATHLON

> Scrivi il lato server della classifica mensile dell'Athlon Health Score, come descritto in `/Volumes/MTARUGGI/Github NEW/PORTALE-ATHLON/docs/classifica-contratto.md` (leggilo per intero: contiene le decisioni di Maurizio, le mie scelte da confermare, le azioni della funzione, le tabelle, il CRM, i punti di privacy e le prove). L'app (PORTALE-ATHLON, branch `claude/classifica-mensile`) è già pronta e i tipi sono in `src/api/classifica.ts`. Fai: migrazione con tabelle, vista/cron notturno del punteggio del mese (Train da tornello e presenze, Food e Recover da diario e sonno solo con consenso, normalizzato sui pilastri usati), funzione `portale-lab-classifica` con le sei azioni, e la pagina «Classifica» del CRM (vedere, nascondere motto/foto, togliere una persona, segnalazioni). Non pubblicare niente in produzione senza il mio via libera; porta le prove del file come test.
