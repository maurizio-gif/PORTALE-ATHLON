## L'area Train è verticale sul piano di allenamento: tre modi per averlo, il test dei massimali a valle del questionario, e «Altro in Train» (11/11/2026)

Richiesta di Maurizio (11/11/2026): «la sezione Train non ci piace, c'è troppa roba disordinata… dobbiamo essere più verticali sulla parte del piano di allenamento». Prima, sotto la scelta Train / Food / Recover, c'erano in fila e con lo stesso peso: test dei massimali, calorie, allenamento a mano, movimento dai dispositivi, Consigli Athlon, e solo dopo «Crea il tuo piano», il personal trainer, i piani e gli ultimi allenamenti. I mock-up sono stati approvati lo stesso giorno, con i testi corretti da Maurizio.

**La parte alta della schermata non è cambiata** (decisione di Maurizio): Athlon Health Score, la tua settimana e il tuo mese, il tuo corpo, i dispositivi e le abitudini restano dove sono, in `Schede.tsx`. Cambia solo quello che sta sotto «Train».

### Cosa si vede

L'area ha tre momenti, decisi da `statoTrain.ts`:

- **Nessun piano** (`vuoto`). Titolo «Il tuo piano di allenamento», sotto «I 3 modi per avere il tuo piano di allenamento.». Poi:
  1. **Allenamento assistito**, in evidenza (carta scura): «Costruiamo insieme il tuo piano», i quattro passi (questionario, piano, test dei massimali, allenamento), «Inizia dal questionario» (`/allenamento/agente`), la riga della quota del mese e la nota sull'intelligenza artificiale;
  2. **Carichi il tuo piano**: «Carica il tuo piano · Da una foto o un PDF» (`/allenamento/importa`) e «Scrivilo tu» (`/allenamento/nuova`);
  3. **Lo chiedi a un personal trainer**: «Prenota una seduta» (`/personal`).
- **Dopo il questionario** (`percorso`): «Il tuo piano è pronto. Manca un passo.», con i passi fatti (questionario, piano confermato) e **il test dei massimali come passo dopo**: «Fai il test» e «Lo faccio dopo: inizia senza i chili». Sotto, il piano.
- **A regime** (`regime`): **il piano in cima** («Il tuo piano», titolo, pillole, ultimo allenamento, «Inizia l'allenamento» che apre il piano), poi lo stato dei massimali in una riga, gli ultimi allenamenti, gli altri piani.

In fondo, sempre, **«Altro in Train»**, in quest'ordine: **Consigli sulle lezioni** (la carta in evidenza, con la spiegazione «Le lezioni e gli allenamenti da seguire, in base alle tue preferenze e ai tuoi obiettivi.»; prima si chiamava «Consigli Athlon»), **Le tue calorie**, **Aggiungi i tuoi allenamenti all'esterno** (prima «Aggiungi un allenamento esterno») e il **movimento dai dispositivi** (c'è solo se ci sono dati, come prima).

### Il test dei massimali non si offre più a tutti

Era il primo blocco di Train, prima ancora che ci fosse un piano a cui serve. Adesso:

- compare **a valle del questionario**, come terzo passo del percorso assistito;
- a regime è **una riga di stato** («Massimali: fatti», «È ora di rifare il test», «Continua il test», «Fai il test»), **solo per chi ha un piano che lo usa**: un piano dell'allenamento assistito o **scritto dal trainer** (`usaIMassimali`), e non di nuoto;
- chi ha solo piani caricati o scritti da sé **non lo vede**, e al suo posto ha l'invito «Vuoi un piano fatto su di te, con i chili calcolati?». Se però un test l'ha già fatto, la riga resta: un dato che c'è non si nasconde;
- la schermata del test (`/allenamento/test`) è quella di prima, e ci si arriva ancora dal piano.

**I piani del trainer sono dentro per una scelta mia, proposta a Maurizio e non contestata**: lui aveva chiesto il test «solo a chi ha già intrapreso il percorso della scheda con l'AI», ma nel CRM le righe dei piani del trainer hanno la percentuale del massimale, e senza test restano percentuali (l'11/11/2026 erano 11 soci, nessuno col test). Per tornare alla richiesta alla lettera basta togliere `eDelTrainer` da `usaIMassimali`.

### Come è fatto

- **`schede/statoTrain.ts`** (puro, `scripts/prova-stato-train.ts`): `statoTrain(schede, test, rimandato)` dà la fase, il piano in cima, gli altri, lo stato del test e se invitare all'assistito. Il piano in cima è quello con l'allenamento più recente; se nessuno è stato iniziato, il primo che usa i massimali, o il primo. Nel percorso è il piano assistito appena confermato.
- **Il percorso** c'è quando esiste un piano assistito di sala **mai iniziato**, il test è da fare o a metà, e la persona non ha scelto «Lo faccio dopo». Chi ha già registrato un allenamento su quel piano passa a regime, con la riga «Fai il test».
- **«Lo faccio dopo» si ricorda sul dispositivo** (`localStorage`, chiave `athlon_train_test_dopo`): su un altro telefono il percorso ricompare finché non si fa il test o non si inizia il piano.
- **«In corso» e «fatto» si decidono dal numero di esercizi** (`test.fatti` contro `test.minimo`), perché l'elenco dei piani porta solo quello: tre esercizi dello stesso gruppo qui risultano «fatti», e la schermata del test (che ha i gruppi) dice quale manca. Per averlo esatto la funzione `portale-lab-schede` dovrebbe mandare la `copertura` anche nell'elenco: non è stato fatto, per non ripubblicarla.
- **`schede/AreaTrain.tsx`** è la schermata; `Schede.tsx` ha perso `CartaTest`, `CartaComponi`, `CartaImporta`, `CartaPersonal`, `CartaConsigli`, `CartaCalorie`, `SchedaCarta` e `Train` (e i loro stili), e monta `<AreaTrain>`.
- **Nessuna funzione da ripubblicare e nessuna migrazione**: i dati sono quelli dell'azione `elenco` di prima.

### Cosa non c'è, rispetto ai mock-up

- **«Oggi tocca a: giorno B» e «Questa settimana: 2 allenamenti su 3»**: l'elenco dei piani non porta i giorni del piano né le sedute per settimana. La carta dice l'ultimo allenamento, e «Inizia l'allenamento» apre il piano, dove si sceglie il giorno.
- I piani in «Gli altri tuoi piani» sono righe, non più le carte colorate grandi.

### Provato e non provato

- **Provato**: `npx tsx scripts/prova-stato-train.ts` (19 prove; 12 modifiche della logica provate, tutte rilevate); `tsc` senza errori nel codice dell'app; **in Chromium** sulla build web (`expo export -p web`), con sessione e funzioni finte, in dodici situazioni (nessun piano, dopo il questionario, test a metà, a regime con più piani, solo un piano caricato, piano del trainer, quota del mese finita, tema scuro a 320 px, 1280 px, inglese): 96 controlli sui testi e sui tocchi (questionario, carica, scrivi, personal trainer, consigli, test, piano; «Lo faccio dopo» porta a regime e resta dopo aver ricaricato), nessuno scorrimento orizzontale, nessun errore JavaScript sulla schermata.
- **Non provato**: un telefono vero e l'app nativa (serve un aggiornamento OTA); la schermata coi dati veri di un socio; il formato totem.
- **Da allineare altrove, non fatto**: le schede dell'Help Desk e le risposte dell'assistente che dicono dove sta il test dei massimali o «Consigli Athlon» (SITO-ATHLON, `articoli-app`; APP-ATHLON, l'assistente), e la video guida di Athlon Health System, che mostra la schermata di prima.
