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
- [«Foam roller»: la sessione di rilascio in Recover, con i video del club (01/11/2026; i video dal 10/11/2026)](docs/claude/81-foam-roller-rilascio-miofasciale-in-recover-01-11-2026.md) · 4 KB
- [Recover: il sonno in una carta chiusa, con dentro inserimento, ultima notte e ultimi sette giorni (01/11/2026)](docs/claude/82-recover-il-sonno-in-una-carta-chiusa-01-11-2026.md) · 2 KB
- [Mobilità e foam roller nel punteggio di Recover: una quota piccola, che non spinge (02/11/2026)](docs/claude/83-mobilita-e-foam-roller-nel-punteggio-di-recover-02-11-2026.md) · 4 KB
- [Il respiro guidato: una pausa di 1–5 minuti in Recover, solo animazione (01/11/2026)](docs/claude/84-il-respiro-guidato-una-pausa-in-recover-01-11-2026.md) · 3 KB
- [Junior: senza figli solo «Aggiungi un componente»; i turni solo per l'anno del figlio (02/11/2026)](docs/claude/85-junior-senza-figli-solo-aggiungi-un-componente-e-turni-solo-per-l-anno-del-figlio-02-11-2026.md) · 2 KB
- [La pagina di stato del pagamento, aperta da sola, porta alla Home senza mostrarsi (02/11/2026)](docs/claude/86-pagamento-aperto-da-solo-niente-pagina-ne-richiesta-02-11-2026.md) · 1 KB
- [Junior riordinata: scelta del bambino, attività a fisarmonica con foto e video, menu per chi è iscritto, Direttore Tecnico con il numero (02/11/2026)](docs/claude/87-junior-riordinata-scelta-del-bambino-attivita-e-menu-02-11-2026.md) · 5 KB
- [«Cambia abbonamento»: la data si sceglie in un calendario, entro 30 giorni (02/11/2026)](docs/claude/88-cambio-abbonamento-la-data-si-sceglie-in-un-calendario-02-11-2026.md) · 3 KB
- [Junior: la voce «Brevetti» (storico, prove) e il diplomino da condividere sui social (02/11/2026)](docs/claude/89-junior-brevetti-storico-prove-e-diplomino-da-condividere-02-11-2026.md) · 5 KB
- [La proposta di abbonamento dal link: QR o email, senza account, dalla verifica al pagamento (02/11/2026)](docs/claude/90-la-proposta-di-abbonamento-dal-link-qr-o-email-02-11-2026.md) · 5 KB
- [La modalità totem: l'app sul pannello del club, con «Esci» e l'uscita da sola (02/11/2026)](docs/claude/91-la-modalita-totem-l-app-sul-pannello-del-club-02-11-2026.md) · 13 KB
- [Totem: «Continua sul telefono» dopo la data: QR, email o assistita (02/11/2026)](docs/claude/92-totem-continua-sul-telefono-qr-email-assistita-02-11-2026.md) · 3 KB
- [Pagina d'accesso più snella: il tema in fondo, la lingua discreta (02/11/2026)](docs/claude/93-accesso-snellito-il-tema-in-fondo-02-11-2026.md) · 3 KB
- [La resa grafica: la Home a due colonne da computer, l'hover, il bagliore che respira e «riduci movimento» (02/11/2026)](docs/claude/94-resa-grafica-home-a-due-colonne-hover-e-movimento-02-11-2026.md) · 4 KB
- [Le survey dentro Club Life: scritte nell'app, e chi risponde è già noto (03/11/2026)](docs/claude/95-le-survey-del-sito-in-club-life-03-11-2026.md) · 9 KB
- [«Brevetti»: il viaggio animato al posto del libretto da sfogliare, e la data dell'ultimo brevetto (03/11/2026)](docs/claude/96-brevetti-il-viaggio-animato-03-11-2026.md) · 9 KB
- [«Brevetti»: le prove spuntate si vedono nell'app, senza «Il percorso»; il diplomino con le prove e la storia senza vuoti (03/11/2026)](docs/claude/97-brevetti-le-prove-spuntate-si-vedono-nell-app-03-11-2026.md) · 6 KB
- [L'invito a fare l'abbonamento per chi, nel nucleo, non ce l'ha: dai 13 anni, anche se il genitore è già iscritto (03/11/2026)](docs/claude/98-invito-abbonamento-per-chi-nel-nucleo-non-ce-l-ha-03-11-2026.md) · 2 KB
- [La Home a due colonne: lo stacco fra le carte e i riquadri (03/11/2026)](docs/claude/99-home-a-due-colonne-stacco-dai-riquadri-03-11-2026.md) · 2 KB
- [Junior: l'invito ad attivare l'abbonamento adulti per un figlio da 13 a 17 anni (03/11/2026)](docs/claude/100-junior-invito-abbonamento-adulti-per-il-figlio-13-17-03-11-2026.md) · 3 KB
- [Il listino degli abbonamenti: Premium prima, come la pagina del sito, e Athlon Health System fra le attività (03/11/2026)](docs/claude/101-listino-abbonamenti-premium-prima-e-athlon-health-system-03-11-2026.md) · 3 KB
- [L'abbonamento dal nucleo: per i familiari solo da 13 a 17 anni, mai per un altro adulto (04/11/2026)](docs/claude/102-abbonamento-dal-nucleo-solo-13-17-anni-04-11-2026.md) · 2 KB
- [La chat «Richiedi assistenza» su Android installata: la tastiera non si richiude più (04/11/2026)](docs/claude/103-chat-assistenza-android-pwa-tastiera-04-11-2026.md) · 2 KB
- [Totem: ogni pagamento passa da QR, email o operatore (04/11/2026)](docs/claude/104-totem-ogni-pagamento-qr-email-operatore-04-11-2026.md) · 4 KB
- [La Home scrive «Guest» a un Guest, non «Socio» (04/11/2026)](docs/claude/105-home-guest-al-posto-di-socio-04-11-2026.md) · 1 KB
- [Il controllo dei dati all'accesso: «Aggiungi il tuo cellulare» in «Da fare» (04/11/2026)](docs/claude/106-controllo-dati-all-accesso-04-11-2026.md) · 1 KB
- [Brevetti: ottenuto e in corso, e il libretto anche senza un abbonamento (04/11/2026)](docs/claude/107-brevetti-ottenuto-in-corso-e-senza-abbonamento-04-11-2026.md) · 3 KB
- [Un pagamento in corso si vede e le quote non si pagano due volte: la schermata «Da pagare» e il riquadro in Home (03/11/2026)](docs/claude/108-pagamento-in-corso-nell-app-03-11-2026.md) · 2 KB
- [Brevetti: le prove di ogni livello sono le abilità di PerfectGym (04/11/2026)](docs/claude/109-brevetti-prove-da-perfectgym-04-11-2026.md) · 2 KB
- [La voce «Gare» di Junior: il Trofeo Athlon, iscrizione e pagamento dall'app (04/11/2026)](docs/claude/110-gare-trofeo-athlon-04-11-2026.md) · 3 KB
- [«Entra» dal sito: il link dell'email apre l'app già dentro sulla pagina giusta, e un indirizzo aperto a freddo non si perde più (04/11/2026)](docs/claude/111-entra-dal-sito-04-11-2026.md) · 6 KB
- [Brevetti per chi non è iscritto: una carta chiusa, in fondo, sotto le attività (04/11/2026)](docs/claude/112-brevetti-chiusi-in-fondo-per-chi-non-e-iscritto-04-11-2026.md) · 3 KB
- [La carta Junior in Home è blu, come la testata della sezione (04/11/2026)](docs/claude/113-home-carta-junior-blu-come-la-sezione-04-11-2026.md) · 2 KB
- [«Invita i tuoi amici»: «ricevi 50 €», la pagina con foto, il plurale, i social, nessun limite di amici e «dal 2021» applicato dal server (04/11/2026)](docs/claude/114-invita-un-amico-50-euro-pagina-e-dal-2021-04-11-2026.md) · 10 KB
- [Il test dei massimali: sette esercizi, il plank a tempo, e «quanti ne servono» (04/11/2026)](docs/claude/115-massimali-sette-esercizi-plank-a-tempo-e-numero-minimo-04-11-2026.md) · 3 KB
- [«Brevetti»: niente pillola sul brevetto di adesso, e «Cosa sta imparando in questo momento» è il livello successivo (04/11/2026)](docs/claude/116-brevetti-cosa-sta-imparando-e-niente-pillola-04-11-2026.md) · 2 KB
- [Athlon TV: le copertine delle raccolte sono le foto dei corsi, o del corso più simile (04/11/2026)](docs/claude/117-athlon-tv-copertine-delle-raccolte-sono-le-foto-dei-corsi-04-11-2026.md) · 4 KB
- [La pubblicazione ufficiale sull'App Store: la 3.0.0 sostituisce la 2.2 di Netpulse (04/11/2026)](docs/claude/118-pubblicazione-app-store-04-11-2026.md) · 4 KB
- [«Realizzata da Ready 2 Digital»: il credito in fondo all'accesso e al Profilo (04/11/2026)](docs/claude/119-realizzata-da-ready-2-digital-04-11-2026.md) · 1 KB
- [L'icona dell'app: il logo arancio su fondo nero, senza scritte (04/11/2026)](docs/claude/120-icona-dell-app-logo-arancio-su-nero-04-11-2026.md) · 1 KB
- [I recuperi della Scuola Nuoto Bambini: al completo niente lista d'attesa (04/11/2026)](docs/claude/121-recuperi-scuola-nuoto-senza-lista-d-attesa-04-11-2026.md) · 2 KB
- [Le gare si pagano anche con il conto già salvato (SEPA), e il mandato copre i servizi del club (04/11/2026)](docs/claude/122-gare-addebito-sul-conto-salvato-04-11-2026.md) · 3 KB
- [Il link del sito apre Junior con l'assistente: la registrazione di un figlio continua nell'app (04/11/2026)](docs/claude/123-junior-con-l-assistente-aperto-dal-link-del-sito-04-11-2026.md) · 2 KB
- [«Iscriviti» dal sito apre «Attiva un abbonamento» con il piano già scelto (04/11/2026)](docs/claude/124-iscrizione-abbonamento-dal-link-del-sito-04-11-2026.md) · 2 KB
- [Il link del sito apre Junior già sul bambino appena registrato (04/11/2026)](docs/claude/125-junior-aperta-sul-bambino-dal-link-del-sito-04-11-2026.md) · 1 KB
- [La chat nella sezione Junior comincia dal corso del bambino (04/11/2026)](docs/claude/126-benvenuto-junior-nella-chat-04-11-2026.md) · 2 KB
- [Junior: cambio orario e recuperi nella fascia del turno, e «Passa al bisettimanale» (04/11/2026)](docs/claude/127-junior-fascia-del-turno-e-passa-al-bisettimanale-04-11-2026.md) · 2 KB
- [Il totale dell'impegno sotto «Vedi tutte le quote», e sul totem l'operatore entra da «staff» (04/11/2026)](docs/claude/128-totale-sotto-le-quote-e-staff-sul-totem-04-11-2026.md) · 2 KB
- [La locandina di un evento per la storia di Instagram (04/11/2026)](docs/claude/129-locandina-evento-storia-instagram-04-11-2026.md) · 3 KB
- [Più figli: i turni vicini in Junior, «Iscrivi …» una dopo l'altra, e «Hai un altro figlio?» (04/11/2026)](docs/claude/130-piu-figli-turni-vicini-04-11-2026.md) · 3 KB
- [Junior: lezioni e recuperi in una voce sola, «Recuperi» (04/11/2026)](docs/claude/131-junior-lezioni-e-recuperi-in-una-voce-04-11-2026.md) · 2 KB
- [L'assistente porta dritto nella voce giusta della sezione Junior (04/11/2026)](docs/claude/132-assistente-junior-dritto-al-punto-04-11-2026.md) · 2 KB
- [Go-live: il giro delle notifiche ogni minuto, non ogni venti secondi (05/11/2026)](docs/claude/133-go-live-il-giro-delle-notifiche-ogni-minuto-05-11-2026.md) · 2 KB
- [Go-live: la Home non pre-carica le vetrine di Athlon TV, e i gruppi Junior solo a chi ha un figlio (05/11/2026)](docs/claude/134-go-live-home-piu-leggera-05-11-2026.md) · 2 KB
- [Il questionario di livello in «Aggiungi un componente» (05/11/2026)](docs/claude/135-questionario-di-livello-in-aggiungi-un-componente-05-11-2026.md) · 1 KB
- [Go-live: i polling dei pagamenti e delle notifiche rallentano da soli (05/11/2026)](docs/claude/136-go-live-polling-con-backoff-05-11-2026.md) · 2 KB
- [Il soggetto pagatore sulle ricevute dei figli: nel salvataggio del metodo di pagamento e «Cambia soggetto pagatore» in Documenti (05/11/2026)](docs/claude/137-soggetto-pagatore-sulle-ricevute-05-11-2026.md) · 5 KB
- [Go-live: la memoria del laboratorio ha una freschezza, e le sezioni della Home non rileggono a ogni apertura (05/11/2026)](docs/claude/138-go-live-memoria-con-freschezza-05-11-2026.md) · 2 KB
- [«Completa il profilo» con i dati già scritti, e «Sei già dei nostri» al posto della segreteria (05/11/2026)](docs/claude/139-completa-il-profilo-gia-scritto-e-gia-dei-nostri-05-11-2026.md) · 1 KB
- [«Entra» con la destinazione `assistenza`: la Home con l'assistente aperto, per l'iscritto che scrive nella chat del sito (05/11/2026)](docs/claude/140-entra-assistenza-home-con-l-assistente-05-11-2026.md) · 1 KB
- [L'assistente dell'app apre con tre suggerimenti, scelti secondo chi apre la chat (05/11/2026)](docs/claude/141-assistente-tre-suggerimenti-secondo-chi-apre-05-11-2026.md) · 2 KB
- [«Aggiungi un componente» chiede nome, cognome e data di nascita: niente codice fiscale (05/11/2026)](docs/claude/142-aggiungi-un-componente-senza-codice-fiscale-05-11-2026.md) · 1 KB
- [«Sei già dei nostri»: collegare questo indirizzo con un codice via SMS (05/11/2026)](docs/claude/143-collegare-l-indirizzo-con-un-codice-via-sms-05-11-2026.md) · 1 KB
- [Le video guide nelle schede dell'Help Desk: si guardano al tocco, e sul telefono in verticale (05/11/2026)](docs/claude/144-video-guide-nell-help-desk-05-11-2026.md) · 3 KB
- [I Termini di Novembre 2026: la sezione 9 del PT ricopiata, nessun altro cambio nell'app (05/11/2026)](docs/claude/145-termini-novembre-2026-sezione-9-ricopiata-05-11-2026.md) · 1 KB
- [Athlon Health System e Athlon TV riservati a chi ha un abbonamento attivo: anteprima e modal (05/11/2026)](docs/claude/146-sezioni-riservate-anteprima-e-modal-05-11-2026.md) · 5 KB
- [I Consigli a passi, da modificare o rigenerare, e le quote al mese dell'AI (05/11/2026)](docs/claude/147-consigli-a-passi-modifica-e-quote-al-mese-05-11-2026.md) · 6 KB
- [Un addebito SEPA in corso si vede nella sezione Pagamenti e nel riquadro della Home, col giorno dell'addebito (05/11/2026)](docs/claude/148-pagamenti-in-corso-nella-sezione-pagamenti-05-11-2026.md) · 5 KB
- [La sezione Famiglia mostra i dati dei figli: codice fiscale, e email e cellulare se diversi (06/11/2026)](docs/claude/149-famiglia-dati-dei-figli-06-11-2026.md) · 3 KB
- [Baby Nuoto: prenotare e attivare il mensile c'è già, e la vista cliente ora dice perché non lo mostra (06/11/2026)](docs/claude/150-baby-nuoto-in-vista-cliente-si-spiega-06-11-2026.md) · 3 KB
- [La vista cliente mostra Junior fino alla firma e al pagamento (06/11/2026)](docs/claude/151-vista-cliente-mostra-junior-fino-alla-firma-06-11-2026.md) · 3 KB
- [Junior: i turni esauriti non si mostrano mai, e «Solo con posti liberi» non c'è più (06/11/2026)](docs/claude/152-junior-turni-esauriti-non-si-mostrano-mai-06-11-2026.md) · 3 KB
- [«Aggiorna la tua email»: la pagina del link dell'SMS per chi ha la casella piena (06/11/2026)](docs/claude/153-aggiorna-email-dal-link-sms-06-11-2026.md) · 3 KB
- [Il listino con due formule in vetrina e «Vuoi risparmiare?» per l'annuale in unica soluzione (06/11/2026)](docs/claude/154-listino-due-formule-e-vuoi-risparmiare-06-11-2026.md) · 3 KB
- [«Accedi o registrati»: un solo pulsante «Continua», e i vantaggi sotto (07/11/2026)](docs/claude/155-accedi-o-registrati-un-solo-pulsante-07-11-2026.md) · 4 KB
- [L'accesso a bolle (07/11/2026): provata e tolta lo stesso giorno, «troppi step»; la nota dice com'era fatta e come riaverla](docs/claude/156-accesso-a-bolle-con-foto-del-club-07-11-2026.md) · 11 KB
- [`/entra`: l'iscrizione di un figlio preparata dal CRM, per email o SMS (07/11/2026)](docs/claude/157-entra-iscrizione-preparata-dal-crm-07-11-2026.md) · 3 KB
- [Il Guest Pass dal link a passi, come l'abbonamento ma senza firma (07/11/2026)](docs/claude/158-guest-pass-a-passi-come-l-abbonamento-senza-firma-07-11-2026.md) · 6 KB
- [Il codice di accesso con Pacman: mangia le caselle mentre si verifica, poi la spunta (07/11/2026)](docs/claude/159-codice-di-accesso-con-pacman-07-11-2026.md) · 6 KB
- [«Gare»: il pagamento a passi, come l'abbonamento e il Guest Pass, ma più snello (07/11/2026)](docs/claude/160-gare-pagamento-a-passi-come-l-abbonamento-07-11-2026.md) · 5 KB
- [«Entra» dal sito: la destinazione `certificato` apre la sezione Certificato (07/11/2026)](docs/claude/161-entra-certificato-dal-sito-07-11-2026.md) · 2 KB
- [Guide con video: una finestra alla prima apertura di una sezione, che porta alla scheda dell'Help Desk (08/11/2026)](docs/claude/162-guide-con-video-alla-prima-apertura-di-una-sezione-08-11-2026.md) · 4 KB
- [Da iPhone e iPad, dal web, si propone l'app dell'App Store (08/11/2026)](docs/claude/163-installa-app-store-su-iphone-08-11-2026.md) · 4 KB
- [`/entra` e la conferma della delega funzionano anche nell'app nativa: il token si legge dal link che l'ha aperta (08/11/2026)](docs/claude/164-entra-nell-app-nativa-token-dal-link-08-11-2026.md) · 5 KB
- [I link delle email aprono l'app su iPhone: il file `apple-app-site-association` (08/11/2026, **pubblicato solo per `/`**)](docs/claude/165-link-universali-ios-apple-app-site-association-08-11-2026.md) · 4 KB
- [Il piano segue quello che la persona solleva: il timer dice i chili veri, e il massimale sale (08/11/2026)](docs/claude/166-il-piano-segue-quello-che-la-persona-solleva-08-11-2026.md) · 4 KB
- [La survey dell'app, funzione per funzione: otto capitoli, e «cosa usi» sta nella presenza della voce (08/11/2026)](docs/claude/167-survey-dell-app-funzione-per-funzione-08-11-2026.md) · 9 KB
- [Le richieste al team nell'app: si sceglie dove vuoi la risposta, e si legge (e si riscrive) in «Le tue richieste» (08/11/2026)](docs/claude/168-richieste-al-team-risposta-in-app-o-via-email-08-11-2026.md) · 5 KB
- [Si firma il contratto anche dall'app nativa (iPhone e Android): lo spazio di firma a schermo intero (08/11/2026)](docs/claude/169-firma-del-contratto-dall-app-nativa-08-11-2026.md) · 8 KB
- [«La tua scelta · Continua» resta ferma in basso anche sull'app nativa (08/11/2026)](docs/claude/170-barra-la-tua-scelta-ferma-in-basso-sull-app-nativa-08-11-2026.md) · 4 KB
- [Il diplomino si genera anche dall'app nativa, e «Carica il certificato» apre il foglio senza scorrere (09/11/2026)](docs/claude/171-diploma-nativo-e-avviso-certificato-sull-app-09-11-2026.md) · 7 KB
- [La storia di Instagram di un evento si genera anche dall'app nativa: la scena SVG è in comune con il diplomino (09/11/2026)](docs/claude/172-storia-instagram-di-un-evento-nativa-09-11-2026.md) · 4 KB
- [Lo shop nativo nell'app: il questionario, il carrello a righe, la cassa come le gare, il preordine (06/11/2026)](docs/claude/173-shop-nativo-questionario-preordine-e-cassa-06-11-2026.md) · 11 KB
- [I ragazzi da 13 a 17 anni entrano con il loro indirizzo: la sessione è limitata dal server, l'interfaccia non ancora (09/11/2026)](docs/claude/174-ragazzi-13-17-sessione-limitata-09-11-2026.md) · 3 KB
- [Il testo di sistema molto grande: la coda di una riga scende sotto il titolo, e l'orario non si taglia (09/11/2026)](docs/claude/175-testo-di-sistema-grande-righe-e-orari-09-11-2026.md) · 3 KB
- [Il Calendario dice in che sala si fa la lezione: Sala A, B, C, sia per prenotare sia sulla lezione prenotata (09/11/2026)](docs/claude/176-calendario-la-sala-della-lezione-09-11-2026.md) · 3 KB
- [Il cambio abbonamento: dopo la firma si paga, niente più «se ne occupa la segreteria» (09/11/2026)](docs/claude/177-cambio-abbonamento-si-paga-dopo-la-firma-09-11-2026.md) · 1 KB
- [I link delle email aprono l'app su Android: il file `assetlinks.json` (09/11/2026)](docs/claude/178-link-android-assetlinks-09-11-2026.md) · 2 KB
- [Dal web: Google Play su Android, App Store su iPhone, e dal computer nessun invito (09/11/2026)](docs/claude/179-installa-google-play-su-android-e-niente-dal-computer-09-11-2026.md) · 2 KB
- [Junior: lo stagionale non si disdice e non è «al mese» (09/11/2026)](docs/claude/180-junior-stagionale-non-si-disdice-09-11-2026.md) · 1 KB
- [Junior: «Disdici l'abbonamento» invia una richiesta alla segreteria (09/11/2026)](docs/claude/181-junior-disdetta-richiesta-alla-segreteria-09-11-2026.md) · 2 KB
- [La chat «Richiedi assistenza» sull'app Android nativa: la tastiera non copre più il campo (10/11/2026)](docs/claude/182-chat-assistenza-android-nativo-tastiera-10-11-2026.md) · 4 KB
- [Il credito sul conto si scala dall'iscrizione, e la schermata del pagamento dice quello che si paga adesso (10/11/2026)](docs/claude/183-credito-sul-conto-all-iscrizione-10-11-2026.md) · 3 KB
- [«Sei già dei nostri»: l'indirizzo che ci risulta, in parte nascosto, e «Non lo riconosco» per chi ha davvero cambiato email (10/11/2026)](docs/claude/184-sei-gia-dei-nostri-indirizzo-che-ci-risulta-10-11-2026.md) · 2 KB
- [Il questionario di livello prima dei turni, anche per chi è già registrato: al posto dei turni compare «Compila il questionario» (10/11/2026)](docs/claude/185-questionario-di-livello-prima-dei-turni-10-11-2026.md) · 4 KB
- [Il questionario di livello è a cascata: «no» a una domanda è «no» anche alle successive, e il livello provvisorio non si vede mai nell'app (10/11/2026)](docs/claude/186-questionario-di-livello-risposte-a-cascata-10-11-2026.md) · 3 KB
- [«Prenotazioni» nella Home: lo storico degli ultimi 30 giorni, con il flag se c'eri (09/11/2026)](docs/claude/187-le-mie-prenotazioni-storico-con-presenza-09-11-2026.md) · 12 KB
- [Il questionario di livello si propone solo a chi non ha un livello reale, e si rifà dopo sei mesi (10/11/2026)](docs/claude/188-questionario-di-livello-quando-si-propone-10-11-2026.md) · 4 KB
- [La carta si paga dentro l'app: il Drop-in nativo di Adyen, senza il link nel browser (10/11/2026)](docs/claude/189-pagamento-nativo-adyen-10-11-2026.md) · 8 KB
- [«Scrivi al team»: la risposta arriva sempre nell'app, la carta non chiede più dove, e senza push compare l'invito ad attivarle (10/11/2026)](docs/claude/190-richieste-al-team-risposta-sempre-in-app-e-invito-alle-push-10-11-2026.md) · 5 KB
- [«Le tue prenotazioni»: a chi è in lista d'attesa si dice la posizione (10/11/2026)](docs/claude/191-posizione-in-lista-d-attesa-10-11-2026.md) · 7 KB
- [In lista d'attesa senza le notifiche: l'invito ad attivarle, con il pulsante, sotto la lezione e dopo il pagamento (10/11/2026)](docs/claude/192-invito-push-in-lista-d-attesa-10-11-2026.md) · 5 KB
- [La foto della Scuola Nuoto Adulti: nel Guest Pass e come copertina delle lezioni del Calendario (10/11/2026)](docs/claude/193-foto-scuola-nuoto-adulti-guest-pass-e-calendario-10-11-2026.md) · 4 KB
- [L'OTA completa del 10/11/2026: foam roller coi video, invito alle notifiche in lista d'attesa e foto della Scuola Nuoto Adulti, e il 3.0.0 ora ha anche «Scrivi al team» (10/11/2026)](docs/claude/194-ota-completa-10-11-2026.md) · 4 KB
- [«Aiutami a prenotare una lezione»: il suggerimento porta alla pagina Prenotazioni, e la riga sotto la carta lo dice (11/11/2026)](docs/claude/195-aiutami-a-prenotare-il-suggerimento-porta-a-prenotazioni-11-11-2026.md) · 3 KB
