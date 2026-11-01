## Il Percorso Athlon: la settimana a tappe, composta dal tutor dentro il palinsesto vero

Nella schermata Train (`/allenamento`), sotto il test e le calorie, c'è la carta **Percorso Athlon** («Il tutor tecnico della tua settimana:
sala, lezioni e acqua, insieme»; richiesta del club, 20/10/2026). Un agente, il **tutor**, profila il socio con domande più ricche di quelle del
piano di allenamento (che lezioni gli piacciono, quante volte in sala, in quali orari) e compone una **settimana tipo a tappe**: la sala (coi
piani di allenamento che il socio ha già), il cardio, le lezioni di gruppo e l'acqua. Ogni lezione si prenota dalla sua tappa, e il percorso
spiega **cosa fa la settimana**, non solo quante calorie costa. Cartella `src/features/lab/percorso/`; funzione, tabelle, quota e regole del
server sono nel `CLAUDE.md` di APP-ATHLON (`portale-lab-percorso`, migrazione `20261019e_percorso.sql`).
**Dal 20/10/2026 la carta in Train porta ai consigli** (sezione sopra), più semplici; il Percorso è **in standby** (vedi il punto «Il Percorso è in standby» nella sezione dei consigli): nell'app non si raggiunge, e il resto è com'era.

- **Non è un piano di allenamento**, e la schermata lo dice prima di tutto (`PianoOPercorso`): il piano (nel codice, la «scheda») sono gli
  esercizi di un allenamento in sala, serie, ripetizioni e carichi; il percorso è la settimana intera e usa i piani come tappe di sala. **Nei testi
  per il socio: «percorso» per questo, mai «piano» né «scheda»**, e «piano» solo per gli esercizi. Un piano non diventa un percorso né il contrario.
- **Il flusso è quello dei piani**: `Questionario.tsx` → il tutor risponde con una **bozza** (`bozzaPercorso.ts`, in memoria, mai sul disco) →
  `EditorPercorso.tsx`, dove si guarda, si cambia e si conferma → solo allora è del socio. Il tutor non salva niente. La richiesta ci mette una
  decina di secondi, a volte un paio di minuti (la schermata d'attesa lo dice), e chi esce nel frattempo non si ritrova nell'editor (`qui`).
- **Il questionario non si conserva**: le limitazioni sono dati sulla salute. Vive nello stato della schermata e arriva al tutor, e basta. Del
  percorso confermato restano le `preferenze` che non lo sono (giorni, volte, gruppi, fasce, lezioni amate o evitate): servono a riaprire il
  questionario già compilato. Le tre richieste al tutor in trenta giorni le conta il server (`stato.quota`).
- **Il nuoto** (20/10/2026): nel questionario c'è «Quante volte in vasca» (0-3 turni di Nuoto Libero in più delle lezioni), con gli stili che il socio sa nuotare e quanto
  nuota di fila. Chi la sceglie riceve, con la bozza, **un piano di nuoto** che si conferma con il percorso, e ogni turno di Nuoto Libero apre il suo giorno. Cosa fa
  l'app e perché, nella sezione «Il piano di nuoto» in fondo.
- **Solo maggiorenni**, come Food. Nella **vista cliente** dello staff il percorso si guarda (`stato`, `leggi`, `settimana` sono letture) e basta:
  niente questionario, niente prenotazioni, niente comandi per cambiarlo; il server risponde 403 a tutto il resto.

### La settimana vera, e la prenotazione dalle tappe

- **Una tappa è un modello, la settimana è la sua realizzazione.** Il percorso dice «martedì alle 18:30, Pilates Matwork»; `settimana` (una
  lettura, `useSettimana`) lo trasforma, per una settimana precisa, nella lezione di quel martedì con i posti, la prenotazione del socio (letta
  da PerfectGym e non dal mirror: dopo un clic il mirror è indietro), quando si apre e se il limite delle prenotazioni la blocca. Si vedono questa
  settimana e la prossima: la prenotazione si apre tre giorni prima.
- **Quattro cose possono succedere a una lezione, e `TappaCarta` le dice tutte**: c'è e si prenota; **è al completo** (vedi sotto); **questa settimana non c'è** (il
  palinsesto cambia a inizio mese) e si propongono le tre più vicine, prima quelle con posti; c'è ma il limite della categoria è pieno **per colpa di
  un'altra lezione dello stesso percorso** («prenotabile dopo la lezione di martedì»: con una sola prenotazione attiva di Reformer alla volta è il
  caso normale, e non è un rifiuto, è l'ordine in cui si prenota).
- **Una lezione al completo ha le alternative** (20/10/2026). La tappa dice «Questa settimana è al completo», tiene il pulsante «Lista d'attesa» e sotto mostra **fino
  a tre lezioni con posti liberi** (`alternative` di `settimana`): prima lo stesso tipo di lezione in un altro orario, poi le **simili**, segnate «lezione simile»,
  ognuna con i suoi posti, il «Dettagli» e i pulsanti del Calendario. Se il socio ne prende una la tappa lo dice («Hai prenotato un'alternativa») e non gli offre più
  la lista d'attesa. Il perimetro, le regole e perché lo decide il server stanno nel `CLAUDE.md` di APP-ATHLON: **l'app non sceglie le alternative**. Se il limite
  della categoria blocca anche la lista d'attesa (conta come una prenotazione), il motivo è quello e viene prima; e una lezione che non si è ancora aperta non è
  «al completo»: i posti si sanno solo dopo l'apertura.
- **«Prenota la settimana» non mette in lista d'attesa da sola** (`dividi.ts`, che è pura e si prova senza schermata). Le lezioni con posti si prenotano; **quelle al
  completo hanno la loro sezione, «Al completo»**, dove per ognuna il socio sceglie: la lista d'attesa (**resta scelta se non tocca niente**, come prima), una
  delle alternative che si prenotano già adesso (non una non compresa, né una che aspetta l'apertura o il limite) o «Lascia stare». Una stessa alternativa non si
  sceglie per due lezioni. La conferma è sempre una sola, e alla fine dice «Al posto di Group Reformer di lun 19 ott, che è al completo». Una lezione piena che il
  socio ha già sostituito sta fra le «Già prenotate».
- **Nell'editor, «Spesso al completo»** (`affollamento.ts`): una lezione il cui slot ha chiuso al completo da metà delle volte in su (almeno tre osservate) porta un
  avviso — «nelle ultime quattro settimane questo orario ha chiuso con tutti i posti presi 4 volte su 4; i posti si prenotano da tre giorni prima» — e fino a
  due alternative con meno attesa, che si mettono con un tocco («Metti questa»). **Dice com'è andata, non come andrà**. Le alternative stanno nel catalogo che
  l'editor già legge: stesso tipo prima, poi le simili, mai una che si sovrappone o che è già nel percorso. **Il cardio agganciato alla lezione la segue** (si rifà
  l'orario come farà l'editor) e quindi un'alternativa di un altro giorno non si propone se la lezione ha il cardio, che resterebbe da solo. Cambiando solo l'orario la
  frase del tutor resta; cambiando tipo di lezione no. Nell'elenco delle lezioni del foglio «Aggiungi una tappa» lo slot dice «spesso al completo».
- **I pulsanti sono quelli del Calendario**: `AzioniLezione` (esportato da `Calendario.tsx`) e `usePrenotazioneLezione`, che è la catena
  prenota / lista d'attesa / disdici / acquista / paga con la carta **spostata** dal Calendario in un posto solo, senza cambiare comportamento. Il
  ritorno dal pagamento di PerfectGym è sempre `/calendario?acquisto=`: dal Percorso, comprare una lezione non compresa passa per il Calendario, e la
  settimana si rilegge da sé al ritorno. Dopo un clic la riga si aggiorna subito e la memoria dei giorni del calendario si butta
  (`dimenticaGiornoCalendario`); fra poco si rilegge la settimana, perché i limiti delle altre lezioni sono cambiati.
- **«Prenota la settimana»** è un riepilogo e **una conferma sola** (`PrenotaSettimana`), poi le lezioni si prenotano in ordine di tempo,
  una chiamata ciascuna: se una non riesce le altre vanno avanti e alla fine si dice com'è andata ognuna. **Niente parte da solo.** Entra solo
  quello che si può prenotare adesso (c'è, è compresa, la prenotazione è aperta, il limite non è pieno e non aspetta un'altra lezione del
  percorso). Restano fuori, ognuna col suo motivo: quelle che si aprono più avanti, quelle **non comprese** (si prenotano una per una pagando la
  lezione singola: non si addebita niente in blocco), quelle che questa settimana non ci sono, e la **sala**.
- **La sala ha due turni fra cui sceglie il socio.** La Gym Floor è un turno ogni mezz'ora, e ognuno è di un tipo solo («Con Assistenza» o
  «Allenamento Libero»): la tappa mostra i due più vicini all'ora scelta, uno per tipo, con l'orario vero. Le parole sono quelle del sito:
  **l'assistente di sala supervisiona le attività in sala**, non «ti segue» né «ti controlla mentre lavori» (quello è il personal training, che si
  paga a parte). L'orario di una fascia non si scrive mai a mano.
- **Quali lezioni spettano al socio è una stima.** Il database non ha una mappa piano → lezioni: la funzione la ricava da una tabella curata
  (`piani_categorie`, partita dalle prenotazioni reali) e dove non c'è una regola **non filtra** e lo dice (`idoneita.incerta`). Le lezioni non
  comprese sono escluse di default e si includono con un interruttore: compaiono segnate «Da acquistare». La prenotazione vera resta il controllo.

### Gli effetti: `effetti.ts` è puro, e non inventa

`Effetti.tsx` mostra cosa fa la settimana, e tutto quello che dice lo calcola `effetti.ts` — una funzione pura delle tappe e delle schede delle
lezioni, che si **ricalcola mentre il socio cambia una tappa**. **Il tutor non scrive mai un numero** (il «perché» di una tappa è una riga senza
cifre: la funzione toglie le frasi che ne hanno). Sette riquadri: la settimana in minuti giorno per giorno; il **profilo delle lezioni** (radar a
quattro assi: muscolare, cardio, coordinazione, flessibilità); il lavoro in sala; i **riferimenti dell'OMS**; carico e recupero; cosa copre
l'obiettivo; il confronto con le ultime quattro settimane e, per ultime, le calorie.

- **La sala non entra nel radar, le lezioni non entrano nella mappa dei muscoli.** La sala non ha barre di intensità e non se ne inventano; le
  barre di una lezione dicono quanto è intensa, non quali muscoli lavora. La sala si misura coi muscoli primari degli esercizi dei piani (e dice
  quali gruppi principali **in sala** non si lavorano mai).
- **Dove manca un dato lo si dice**: un asse senza barre è «dato non disponibile», mai zero, e il radar dice su che quota dei minuti è calcolato.
  Le barre mancano per il Nuoto Libero, la Scuola Nuoto e la flessibilità delle lezioni in acqua (il sito non le ha): le lezioni senza barre sono
  nominate. Si completano dal sito (`planning-lessons.json`), non qui.
- **Riferimenti, non traguardi**, come Food coi LARN: 150–300 minuti a intensità moderata (o la metà se intensa, che conta il doppio) e almeno due
  giorni di rinforzo muscolare (OMS 2020). **Sono numeri ricordati, non riletti alla fonte: vanno ricontrollati.** I minuti si classificano coi MET di
  `stimaCorso.ts` (moderato da 3, intenso da 6); la sala conta come rinforzo e non come attività aerobica; **il cardio si conta come moderato**
  perché la tappa non dice se è una camminata o una corsa.
- **«Cosa copre l'obiettivo» sono regole fisse scritte in `righeObiettivo`**, non un giudizio del tutor, e dicono se la settimana ha gli
  ingredienti che le linee guida indicano per quel lavoro (ogni gruppo principale due volte per l'ipertrofia, tre giorni aerobici per la
  resistenza…), **non se il risultato arriverà**. Nessun chilo, nessuna promessa estetica. Le soglie (due volte per gruppo, tre giorni, la barra di
  flessibilità da 50 in su) sono nostre e vanno fatte validare dal Direttore Tecnico. I testi «cosa aspettarsi» per obiettivo **non ci sono**: si
  aggiungono quando il club li ha validati.
- **Le calorie sono una riga fra le altre** e una stima: la formula di schede e calendario (BMR / 1440 × MET × minuti), la sala come nella stima
  del piano. Servono i quattro dati del corpo (`useStatoCorpo`); senza, il pannello dice cosa manca e non stima. Il confronto con le ultime
  quattro settimane usa le stesse attività del contatore (sedute chiuse nell'app e lezioni con la presenza segnata) e **lascia fuori il cardio**,
  che non si registra.
- **Le animazioni** (radar, barre) seguono `useProgresso` e partono quando il riquadro entra nello schermo (`useVisibile`), come il contatore
  delle calorie; con «riduci movimento» vanno subito al valore finale.

### L'editor, e perché `controllo.ts` esiste

- **Aggiungere, cambiare o togliere una tappa** (`FoglioTappa`): una lezione fra quelle che ricorrono quel giorno, la sala (un giorno di uno dei
  piani, a un'ora e per un tempo) o il cardio (una macchina, per un tempo, prima o dopo un'altra tappa o a un'ora precisa). Una tappa cambiata
  perde il «perché» del tutor se cambia cosa si fa, lo tiene se cambia solo giorno o ora.
- **`controllo.ts` è lo specchio di `validaRisposta`** (funzione, `_shared/percorso/validazione.ts`): niente si sovrappone, sala e cardio stanno
  nell'orario della sala (lun–ven 6–22, sab 8–20, dom 9–18: da `gymFloor.hours` del sito), al massimo quattro tappe e tre ore al giorno, diciotto
  tappe a settimana, sei giorni, un giorno di solo cardio non è un giorno. Il server **non tronca in silenzio** un percorso del socio: se una tappa
  non regge risponde 422 e dice quale. Per questo l'editor dice le stesse cose prima, sulla tappa giusta, e «Conferma» non si accende finché ci
  sono problemi. **Il server resta l'autorità**; se le due copie divergono vince lui. Chi cambia una regola la cambia nei due posti.
- **Una lezione non compresa è una scelta del socio**: se il percorso ne contiene una, alla conferma `includi_non_comprese` si accende da solo, o
  la funzione la rifiuterebbe come «slot che non esiste».
- **Confermare sostituisce il percorso attivo** (uno solo per socio) e lo dice sopra l'editor; le lezioni già prenotate restano prenotate. Togliere
  il percorso non tocca i piani di allenamento.

### Cosa manca, e cosa serve per accenderlo

- **È acceso, per i tester del portale** (20/10/2026): il workflow n8n del tutor (`athlon-percorso-ai`) è pubblicato, la chiave è nel Vault (`percorso_n8n_chiave`) e la funzione
  `portale-lab-percorso` è in produzione; chi non è fra i tester non apre la funzione. **Il tutor usa modelli a pagamento con la riservatezza dei dati** (prima i gratuiti, con cui `genera` non dava un percorso a nessun tentativo): risponde in una decina di secondi, e in prova ha composto la settimana chiesta nove volte su dieci circa. Se un modello non regge la funzione risponde 502 («Il tutor non è riuscito a
  comporre il percorso adesso. Riprova fra qualche minuto»), che l'app mostra; non conta nella quota. Quando la settimana non ha tutte le tappe chieste la funzione lo dice negli avvisi e il socio corregge nell'editor. Non è stato provato con una sessione vera, quindi il primo percorso generato da un tester è la prima prova di tutta la schermata. Dettagli e cosa è stato verificato: `CLAUDE.md` di APP-ATHLON.
- **Non ci sono promemoria**: l'app non ha notifiche. Se il club li vuole, si decide come (email?).
- **Da fare col club**: le barre del Nuoto Libero e della Scuola Nuoto Adulti e la flessibilità delle lezioni in acqua; la revisione della tabella
  `piani_categorie` (anche se i piani Short e Open hanno limiti d'orario); i testi «cosa aspettarsi» per obiettivo, validati dal Direttore Tecnico;
  l'informativa privacy (il questionario va a un servizio esterno, come per l'agente dei piani).

Per verificare: `npx tsc --noEmit` pulito. `effetti.ts` e `controllo.ts` sono funzioni pure e si provano con `npx tsx` (nel repo non c'è un test
runner): la prova di `controllo.ts` confronta l'editor con `validaRisposta` su qualche migliaia di percorsi a caso, e **ogni percorso che l'editor
accetta la funzione lo accetta** (il contrario no: l'editor è più severo sui minuti, che il server riporta nei limiti). **Le schermate si guardano
renderizzate** (360, 390, 430 e 1280 px, anche con «riduci movimento»): `tsc` non vede gli errori di resa, come `${<Text/>}` che diventa «[object
Object]». Nel questionario, sala + lezioni almeno una; giorni liberi o nessuno o almeno i giorni di allenamento; a «Componi» le tre richieste al
mese si fermano alla quarta; nella vista cliente nessun comando compare.

