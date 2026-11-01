# PORTALE-ATHLON: istruzioni di progetto

**Questo file è corto di proposito.** Il vecchio `CLAUDE.md` pesava 361 KB (circa 92.000 token) ed era caricato per intero a ogni sessione: riempiva il contesto prima di cominciare e le sessioni finivano in «Prompt is too long». **Il suo contenuto è intatto** in `docs/claude/`, una sezione per file (rimettendo insieme i file nell'ordine dell'indice si riottiene l'originale, byte per byte).

## Come si lavora con queste note

- **Non leggere `docs/claude/` per intero e non aprire più sezioni insieme.** Cerca (`grep -rl 'parola' docs/claude/`, poi `grep -n` nel file trovato) e leggi solo la sezione che serve, con `sed -n` o `Read` con `offset` e `limit`. Una sezione può pesare decine di KB.
- **Una sezione nuova si scrive in un file nuovo di `docs/claude/` (`NN-titolo.md`) e si aggiunge una riga all'indice qui sotto.** Non si appende a questo file: tornerebbe a pesare.
- **I rimandi «`CLAUDE.md` di APP-ATHLON / PORTALE-ATHLON, sezione «X»»**, nelle sezioni e nei commenti del codice, vanno cercati in `docs/claude/` del repository indicato (`grep -rl 'X' docs/claude/`). I nomi delle sezioni non sono cambiati.
- **Il nucleo qui sotto** (come si leggono i dati) vale sempre; il resto si apre quando si lavora sulla cosa che descrive.

## I dati dell'app arrivano da Supabase, non da PerfectGym

**L'app non parla mai con PerfectGym.** Chiama le Edge Function `portale-*` di Supabase (`src/api/lab.ts`
e gli altri file di `src/api/`), che leggono dal mirror: PerfectGym si sincronizza nello schema `perfectgym`
del database e le funzioni leggono da lì. Una schermata che mostra un dato nuovo ha quindi bisogno di una
**azione nuova in una funzione esistente** (o di una funzione SQL nuova che la funzione legge), mai di una
chiamata diretta al gestionale. Esempio: la sezione Prodotti usa l'azione `prodotti` di
`portale-lab-pagamenti`, che chiama `prodotti_di` sul database.

- **La stessa funzione serve il CRM e l'app.** I conti di una persona (abbonamenti, prodotti, prenotazioni,
  pagamenti) li calcola una funzione SQL sola, e il CRM e l'app la leggono entrambi: se divergono, è un
  difetto. Le funzioni e la regola completa stanno nel `CLAUDE.md` di APP-ATHLON.
- **Scrivere è un'altra cosa.** Prenotare, disdire, pagare passano da una Edge Function che chiama PerfectGym:
  è l'unico caso in cui il portale lo tocca, e dopo la scrittura la funzione rilegge da PerfectGym per
  confermare, perché il mirror arriva con qualche secondo di ritardo.
- **Dopo una scrittura la schermata si aggiorna dalla risposta della funzione** o con una nuova lettura
  dopo qualche secondo, non si aspetta che il mirror sia già allineato.
- **Quello che PerfectGym non dice** (da quale dispositivo si è prenotato, per esempio) lo registra la
  nostra funzione nel suo log; la schermata non lo deduce.
- **Il Calendario ha un gemello nel CRM: il Planning** (20/10/2026, funzione `crm-planning` di APP-ATHLON): le stesse lezioni, lo stesso filtro per età, la stessa apertura delle
  prenotazioni e gli stessi limiti per categoria, ma a prenotare (e a disdire, con `CancelSingleBooking` e le regole di PerfectGym per la disdetta in ritardo) è l'operatore, a nome del cliente, e da lì non si incassa. **Non condivide il codice con
  `portale-lab-calendario`** (la funzione dell'app non è stata toccata): se qui cambia la lettura del giorno, il filtro d'età, l'apertura o i limiti, va cambiato anche in
  `_shared/planning-crm.ts` di APP-ATHLON. Il Calendario resta quello che il socio vede: il Planning non cambia niente nell'app.
- **I filtri per attività sono tessere** (20/10/2026, richiesta dei tester: «non si vedono»; proposta B scelta da Maurizio): sotto «Cosa vuoi fare?» ogni attività del giorno ha la sua tessera con icona, nome e numero di lezioni, tutte in vista (niente fila da scorrere). Quella scelta diventa arancione, e toccarla di nuovo toglie il filtro; «Tutte» lo toglie sempre. Icona e colore vengono da `segnoAttivita` in `Calendario.tsx` (dal nome: acqua e nuoto in blu, sala e corsi in arancio, il resto neutro): un'attività nuova del listino prende l'icona del calendario finché non si sceglie. Cambia solo il filtro: lezioni, Gym Floor e Nuoto Libero a griglia, regole sono quelli di prima. `tsc` pulito; **non guardato in un browser né su un telefono**.

## Indice delle sezioni (`docs/claude/`, nell'ordine dell'originale)

- [I dati dell'app arrivano da Supabase, non da PerfectGym](docs/claude/01-i-dati-dell-app-arrivano-da-supabase-non-da-perfectgym.md) · 2 KB
- [Il tema: sul computer sempre chiaro, sul telefono quello del sistema](docs/claude/02-il-tema-sul-computer-sempre-chiaro-sul-telefono-quello.md) · 1 KB
- [La foto del profilo si mostra nel Profilo e nella testata della Home; dal Profilo e dalla Home si cambia](docs/claude/03-la-foto-del-profilo-si-mostra-nel-profilo-e-nella-testa.md) · 9 KB
- [I video e i poster degli esercizi arrivano da un bucket privato, già firmati](docs/claude/04-i-video-e-i-poster-degli-esercizi-arrivano-da-un-bucket.md) · 1 KB
- [Il certificato medico si carica dall'app, e resta «in verifica» finché la segreteria non lo guarda](docs/claude/05-il-certificato-medico-si-carica-dall-app-e-resta-in-ver.md) · 2 KB
- [L'avviso del certificato, subito sotto la testata, e gli abbonamenti a quota zero che contano](docs/claude/06-l-avviso-del-certificato-subito-sotto-la-testata-e-gli.md) · 5 KB
- [Le calorie di una lezione: il tipo dà la forbice, non c'è un MET per lezione (prova)](docs/claude/07-le-calorie-di-una-lezione-il-tipo-da-la-forbice-non-c-e.md) · 2 KB
- [Il contatore delle calorie conta solo quello che si sa](docs/claude/08-il-contatore-delle-calorie-conta-solo-quello-che-si-sa.md) · 1 KB
- [L'alimentazione è educazione alimentare, e si apre solo col consenso](docs/claude/09-l-alimentazione-e-educazione-alimentare-e-si-apre-solo.md) · 2 KB
- [I piani di allenamento: si compone insieme o si importa, si modifica e si conferma, e restano suoi](docs/claude/10-i-piani-di-allenamento-si-compone-insieme-o-si-importa.md) · 28 KB
- [Athlon Health System: la ruota, il Balance, Train e Food](docs/claude/11-athlon-health-system-la-ruota-il-balance-train-e-food.md) · 20 KB
- [I dispositivi: Oura e Polar si collegano da Relax, e i dati restano del socio](docs/claude/12-i-dispositivi-oura-e-polar-si-collegano-da-relax-e-i-da.md) · 3 KB
- [L'Athlon Health Score: un punteggio da 0 a 100 sui tre pilastri, regolarità e non volume](docs/claude/13-l-athlon-health-score-un-punteggio-da-0-a-100-sui-tre-p.md) · 11 KB
- [La privacy dell'Athlon Health System: tre consensi, un'informativa generale, e niente premi legati ai dati sul…](docs/claude/14-la-privacy-dell-athlon-health-system-tre-consensi-un-in.md) · 5 KB
- [Il feedback dei tester: una carta in Home, e il foglio per scrivere](docs/claude/15-il-feedback-dei-tester-una-carta-in-home-e-il-foglio-pe.md) · 6 KB
- [L'avvio animato: il logo che si costruisce, una volta a ogni apertura](docs/claude/16-l-avvio-animato-il-logo-che-si-costruisce-una-volta-a-o.md) · 3 KB
- [I consigli di Athlon: le lezioni che potrebbero interessarti, e quando le trovi; sala e vasca portano al piano](docs/claude/17-i-consigli-di-athlon-le-lezioni-che-potrebbero-interess.md) · 11 KB
- [Il Percorso Athlon: la settimana a tappe, composta dal tutor dentro il palinsesto vero](docs/claude/18-il-percorso-athlon-la-settimana-a-tappe-composta-dal-tu.md) · 15 KB
- [Il piano di nuoto: si chiede dall'agente o dal Percorso, si legge a bordo vasca e non si registra](docs/claude/19-il-piano-di-nuoto-si-chiede-dall-agente-o-dal-percorso.md) · 6 KB
- [Il messaggio di benvenuto: sotto la testata della Home, scritto a ogni ritorno nell'app](docs/claude/20-il-messaggio-di-benvenuto-sotto-la-testata-della-home-s.md) · 5 KB
- [Lo shop: Articoli e Merchandising, si compra dall'app e si ritira in segreteria](docs/claude/21-lo-shop-articoli-e-merchandising-si-compra-dall-app-e-s.md) · 9 KB
- [I pagamenti dell'app mostrano solo i pagamenti veri; i crediti non si vedono](docs/claude/22-i-pagamenti-dell-app-mostrano-solo-i-pagamenti-veri-i-c.md) · 1 KB
- [Le notifiche del club: una finestra appena arriva, il centro notifiche, e la push se la si attiva](docs/claude/23-le-notifiche-del-club-una-finestra-appena-arriva-il-cen.md) · 17 KB
- [L'Abbonamento PT: le regole del mese nel foglio, e la sezione 9 dei Termini](docs/claude/24-l-abbonamento-pt-le-regole-del-mese-nel-foglio-e-la-sez.md) · 1 KB
- [Gli eventi di Club Life: si prenota dal calendario e si condividono con un amico](docs/claude/25-gli-eventi-di-club-life-si-prenota-dal-calendario-e-si.md) · 1 KB
- [«Invita un amico»: il link personale del socio, e l'amico fa la procedura del Guest Pass](docs/claude/26-invita-un-amico-il-link-personale-del-socio-e-l-amico-f.md) · 4 KB
- [Il Guest Pass per sé o per un figlio (21/10/2026)](docs/claude/27-il-guest-pass-per-se-o-per-un-figlio-21-10-2026.md) · 3 KB
- [Il Guest Pass non chiede l'indirizzo (29/10/2026)](docs/claude/28-il-guest-pass-non-chiede-l-indirizzo-29-10-2026.md) · 1 KB
- [La pagina del Guest Pass racconta la prova: prezzo in vetrina e attività a fisarmonica (30/10/2026)](docs/claude/29-la-pagina-del-guest-pass-racconta-la-prova-prezzo-in-ve.md) · 4 KB
- [«Attiva la prova» da dentro l'app: niente email, la procedura continua qui (29/10/2026)](docs/claude/30-attiva-la-prova-da-dentro-l-app-niente-email-la-procedu.md) · 3 KB
- [Il messaggio di benvenuto su misura e l'iscrizione dalla prova (29/10/2026)](docs/claude/31-il-messaggio-di-benvenuto-su-misura-e-l-iscrizione-dall.md) · 3 KB
- [La sezione Junior: i gruppi dei corsi per bambini e ragazzi, per anno di nascita, con i posti liberi (21/10/20…](docs/claude/32-la-sezione-junior-i-gruppi-dei-corsi-per-bambini-e-raga.md) · 4 KB
- [L'app in due lingue: italiano e inglese, con le parole di PerfectGym (21/10/2026)](docs/claude/33-l-app-in-due-lingue-italiano-e-inglese-con-le-parole-di.md) · 3 KB
- [Iscriversi a un gruppo Junior dall'app (21/10/2026)](docs/claude/34-iscriversi-a-un-gruppo-junior-dall-app-21-10-2026.md) · 1 KB
- [Junior: i corsi della persona scelta (22/10/2026)](docs/claude/35-junior-i-corsi-della-persona-scelta-22-10-2026.md) · 2 KB
- [Junior: il livello del bambino e la sua storia (22/10/2026)](docs/claude/36-junior-il-livello-del-bambino-e-la-sua-storia-22-10-202.md) · 1 KB
- [Junior: la sezione come area a sé e i giorni dei gruppi agonistici (22/10/2026)](docs/claude/37-junior-la-sezione-come-area-a-se-e-i-giorni-dei-gruppi.md) · 3 KB
- [Junior: il Direttore Tecnico, dalla scheda di un bambino iscritto (22/10/2026)](docs/claude/38-junior-il-direttore-tecnico-dalla-scheda-di-un-bambino.md) · 1 KB
- [Junior: l'anno di nascita non si sceglie, è quello della persona (22/10/2026)](docs/claude/39-junior-l-anno-di-nascita-non-si-sceglie-e-quello-della.md) · 1 KB
- [Junior: un bambino iscritto cambia orario, vede il contratto e i pagamenti, e le lezioni sono quelle pagate (2…](docs/claude/40-junior-un-bambino-iscritto-cambia-orario-vede-il-contra.md) · 2 KB
- [Junior: solo i posti disponibili, e un pulsante per iscriversi su ogni gruppo (22/10/2026)](docs/claude/41-junior-solo-i-posti-disponibili-e-un-pulsante-per-iscri.md) · 1 KB
- [La sezione Pagamenti: il metodo da una parte, i pagamenti dall'altra, e le quote scadute si pagano da qui (22/…](docs/claude/42-la-sezione-pagamenti-il-metodo-da-una-parte-i-pagamenti.md) · 3 KB
- [Junior: rinnovo mensile, contratto scaricabile e Disdici (22/10/2026)](docs/claude/43-junior-rinnovo-mensile-contratto-scaricabile-e-disdici.md) · 1 KB
- [Il badge di accesso al club: la carta per il wallet, parte grafica (22/10/2026)](docs/claude/44-il-badge-di-accesso-al-club-la-carta-per-il-wallet-part.md) · 3 KB
- [Dalle tue visite al club: il «consigliato» onesto, gli orari riportati e «La fai già» (22/10/2026)](docs/claude/45-dalle-tue-visite-al-club-il-consigliato-onesto-gli-orar.md) · 8 KB
- [Il piano di nuoto si stampa, si salva in PDF e si condivide (23/10/2026)](docs/claude/46-il-piano-di-nuoto-si-stampa-si-salva-in-pdf-e-si-condiv.md) · 2 KB
- [Iscrizione Junior: piano di pagamento senza testo prima, con prima lezione e fine del corso; i totali solo nel…](docs/claude/47-iscrizione-junior-piano-di-pagamento-senza-testo-prima.md) · 1 KB
- [Correzione dei dati: salvare non deve fallire per l'indirizzo o per l'email mancante (23/10/2026)](docs/claude/48-correzione-dei-dati-salvare-non-deve-fallire-per-l-indi.md) · 1 KB
- [Junior: l'iscrizione appena firmata si vede subito, il pagamento si aggiorna da solo (23/10/2026)](docs/claude/49-junior-l-iscrizione-appena-firmata-si-vede-subito-il-pa.md) · 1 KB
- [Le stelle alle lezioni: una carta in Home, un tocco, da 1 a 5 (24/10/2026)](docs/claude/50-le-stelle-alle-lezioni-una-carta-in-home-un-tocco-da-1.md) · 1 KB
- [Prenotazioni staccate sopra i giorni; Junior con quota scaduta; Direttore Tecnico: si vede, si sposta, si annu…](docs/claude/51-prenotazioni-staccate-sopra-i-giorni-junior-con-quota-s.md) · 2 KB
- [Cambio orario Junior: modal di conferma, la richiesta non è automatica (25/10/2026)](docs/claude/52-cambio-orario-junior-modal-di-conferma-la-richiesta-non.md) · 1 KB
- [Apple Salute come hub e allenamenti scritti a mano (28/10/2026)](docs/claude/53-apple-salute-come-hub-e-allenamenti-scritti-a-mano-28-1.md) · 1 KB
- [Athlon Health System: i dati del corpo da compilare (blocco morbido), e l'app Salute si invita subito e resta …](docs/claude/54-athlon-health-system-i-dati-del-corpo-da-compilare-bloc.md) · 6 KB
- [I dispositivi passano solo da Apple Salute e Health Connect; «Relax» si chiama Recover (29/10/2026)](docs/claude/55-i-dispositivi-passano-solo-da-apple-salute-e-health-con.md) · 5 KB
- [La classifica mensile dell'Athlon Health Score (29/10/2026)](docs/claude/56-la-classifica-mensile-dell-athlon-health-score-29-10-20.md) · 4 KB
- [L'assistente del portale: il pulsante «Assistente virtuale» (dal 31/10/2026 «Richiedi assistenza»), una chat c…](docs/claude/57-l-assistente-del-portale-il-pulsante-assistente-virtual.md) · 14 KB
- [Gli orari del club in Home e in Club Life, e l'assistente che legge Club Life (30/10/2026)](docs/claude/58-gli-orari-del-club-in-home-e-in-club-life-e-l-assistent.md) · 4 KB
- [Tre strumenti «wow» (30/10/2026): il tuo mese da condividere, il QR per il ritiro dello shop, l'assistente che…](docs/claude/59-tre-strumenti-wow-30-10-2026-il-tuo-mese-da-condividere.md) · 8 KB
- [La tua settimana in Athlon: il riepilogo condivisibile, per un post o per una storia (31/10/2026)](docs/claude/60-la-tua-settimana-in-athlon-il-riepilogo-condivisibile-p.md) · 4 KB
- [«Gestisci abbonamento»: sospendere e disdire dall'app, e «Attiva abbonamento» sul Guest Pass (30/10/2026)](docs/claude/61-gestisci-abbonamento-sospendere-e-disdire-dall-app-e-at.md) · 5 KB
- [«Scrivi al team»: l'assistente passa a una persona, e la persona decide (31/10/2026)](docs/claude/62-scrivi-al-team-l-assistente-passa-a-una-persona-e-la-pe.md) · 3 KB
- [Metodo di pagamento: se c'è già, si dice e si propone di pagare; il cambio è un comando a parte (30/10/2026)](docs/claude/63-metodo-di-pagamento-se-c-e-gia-si-dice-e-si-propone-di.md) · 4 KB
- [«Richiedi assistenza»: il pulsante cambia nome, Club Life ha il suo bottone, e la chat propone la telefonata e…](docs/claude/64-richiedi-assistenza-il-pulsante-cambia-nome-club-life-h.md) · 3 KB
- [Le abitudini che si spuntano da sole, e Google Salute (Health Connect) accanto ad Apple Salute (31/10/2026)](docs/claude/65-le-abitudini-che-si-spuntano-da-sole-e-google-salute-he.md) · 6 KB
- [Le abitudini si scelgono, la sfida di 30 giorni e i nuovi dati di Apple e Google (31/10/2026)](docs/claude/66-le-abitudini-si-scelgono-la-sfida-di-30-giorni-e-i-nuov.md) · 8 KB
- [Acqua e mobilità fra le abitudini, sessioni di mobilità a richiesta, e la progressione a cicli dei piani (31/1…](docs/claude/67-acqua-e-mobilita-fra-le-abitudini-sessioni-di-mobilita.md) · 11 KB
- [La vista cliente dal CRM entra già loggata (31/10/2026)](docs/claude/68-la-vista-cliente-dal-crm-entra-gia-loggata-31-10-2026.md) · 1 KB
- [«Cambia abbonamento»: nessun modulo, solo la procedura (31/10/2026)](docs/claude/69-cambia-abbonamento-nessun-modulo-solo-la-procedura-31-1.md) · 1 KB
- [«Aggiungi un componente» in Famiglia e in Junior, e la delega sui figli a un altro adulto (31/10/2026)](docs/claude/70-aggiungi-un-componente-in-famiglia-e-in-junior-e-la-del.md) · 8 KB
- [Il chiarimento nella chat dell'assistente: «intendevi questo?», con un pulsante per opzione (01/11/2026)](docs/claude/71-il-chiarimento-nella-chat-dell-assistente-intendevi-que.md) · 2 KB
- [La registrazione: email → codice → «Completa il profilo» → dentro (01/11/2026)](docs/claude/72-la-registrazione-email-codice-completa-il-profilo-dentr.md) · 3 KB
- [I consensi del genitore per un figlio da 13 a 17 anni: una pagina sola, consensi disgiunti (01/11/2026)](docs/claude/73-i-consensi-del-genitore-per-un-figlio-da-13-a-17-anni-u.md) · 2 KB
- [Il genitore vede i dati del figlio: «Vedi i dati» e la pagina `/dati-figlio/<id>` (02/11/2026)](docs/claude/74-il-genitore-vede-i-dati-del-figlio-vedi-i-dati-e-la-pagina.md) · 1 KB
- [Il portale aperto a chi si registra: nessun cambio nell'app (02/11/2026)](docs/claude/75-il-portale-aperto-a-chi-si-registra-nessun-cambio-nell-app.md) · 1 KB
- [«Elimina account» nel Profilo: anonimizzazione, contratti e pagamenti restano (02/11/2026)](docs/claude/76-elimina-account-nel-profilo-anonimizzazione-contratti-e-paga.md) · 2 KB
- [L'invito a registrarsi in vista nella pagina d'accesso (02/11/2026)](docs/claude/77-l-invito-a-registrarsi-in-vista-nella-pagina-d-accesso.md) · 2 KB
- [«Incolla il codice» nell'app installata: il campo al posto del tasto (02/11/2026)](docs/claude/78-incolla-il-codice-nell-app-installata-il-campo-al-posto-del-tasto.md) · 2 KB
- [«Pagamento non trovato»: dopo l'accesso si va alla Home, non su un pagamento di un altro accesso (02/11/2026)](docs/claude/79-pagamento-non-trovato-niente-vicolo-cieco-02-11-2026.md) · 2 KB
- [«Capire il cibo»: sei letture di cultura alimentare nell'area Food (01/11/2026)](docs/claude/80-capire-il-cibo-cultura-alimentare-nell-area-food-01-11-2026.md) · 3 KB
- [«Foam roller»: la sessione di rilascio in Recover, con i video ancora da girare (01/11/2026)](docs/claude/81-foam-roller-rilascio-miofasciale-in-recover-01-11-2026.md) · 4 KB
- [Recover: il sonno in una carta chiusa, con dentro inserimento, ultima notte e ultimi sette giorni (01/11/2026)](docs/claude/82-recover-il-sonno-in-una-carta-chiusa-01-11-2026.md) · 2 KB
