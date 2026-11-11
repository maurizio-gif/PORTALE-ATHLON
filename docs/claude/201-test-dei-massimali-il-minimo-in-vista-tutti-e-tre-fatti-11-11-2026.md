## Il test dei massimali: il minimo si vede (3 esercizi, uno per gruppo), e «Tutti e tre fatti» quando c'è (11/11/2026)

Richiesta di Maurizio (11/11/2026): nel test ci sono 7 esercizi, e va detto **molto più chiaramente** qual è il numero minimo, anche con la grafica: fatto un esercizio per la parte superiore, uno per il core e uno per la parte inferiore, l'app dice «tutti e tre fatti»; gli altri restano consigliabili, perché i calcoli vengono più accurati. E la domanda: «con 3 ci rientriamo nei calcoli dei piani?». Il calcolo e i numeri di partenza stanno in APP-ATHLON, `docs/claude/105-…` («3 per calcolare, 5 per validare»); la schermata di prima in `115-…` di questo repository. **Il server non è cambiato**: il minimo era già 3 (`TEST_MINIMI`, `copertura.calcolabile`); a non dirlo bene era la schermata.

### Cosa non andava

- Il minimo era **una frase dentro un paragrafo** in cima («Per calcolare i tuoi chili bastano 3 esercizi… Per controllare che i conti tornino fanne 5…»), con due numeri nella stessa riga.
- **Ogni esercizio non fatto aveva la scritta arancione «Consigliato»**: su sette esercizi, sette «Consigliato» si leggono come «vanno fatti tutti».
- Nessun punto della schermata diceva «hai finito il minimo». La carta in Train diceva «7 esercizi, una quindicina di minuti».

### Cosa c'è adesso (`schede/Test.tsx`, `schede/minimoTest.ts`)

- **Il riquadro «Il minimo: 3 esercizi»**, primo elemento della schermata: tre riquadri affiancati (Parte superiore, Core, Parte inferiore), ognuno con un cerchio numerato che diventa **una spunta verde** quando almeno un esercizio del gruppo è fatto, e in alto a destra «2 di 3». Sotto: «Uno per gruppo, quello che preferisci: su 7 esercizi ne bastano 3 per avere i tuoi chili nei piani», e a metà strada «Ti manca: la parte inferiore».
- **Raggiunto il minimo** il riquadro prende il bordo verde e il titolo diventa **«Tutti e tre fatti»**, con «3 di 3». Dice: «Hai fatto il minimo: nei tuoi piani le percentuali sono diventate i tuoi chili», e sotto, in grigio: «Vuoi chili più precisi? Fai anche gli altri 4: non è obbligatorio, ma con più test i calcoli sono più accurati». Con tutti e sette fatti: «Hai fatto anche tutti gli altri…».
- **Sotto il titolo di ogni gruppo una pillola**: «Da fare: scegline uno» (arancione; per il core «Da fare») finché il gruppo non ha il suo esercizio, poi «✓ Minimo fatto» (verde), «✓ Minimo fatto e controllato» quando due test tornano fra loro, «Da ricontrollare» quando non tornano (il testo di prima). La riga accanto dice a cosa serve il secondo esercizio: «Facoltativo: con un altro esercizio di questo gruppo controlliamo che i chili tornino».
- **Gli esercizi non dicono più «Consigliato»**: quelli di un gruppo ancora da fare non hanno etichetta (la scelta è libera, lo dice la pillola); quelli in più di un gruppo già fatto dicono «Facoltativo: chili più precisi», in grigio. «✓ Fatto» resta.
- **Dopo il salvataggio, nel foglio dell'esercizio**: se con quel test il minimo è appena stato raggiunto, un riquadro verde «Tutti e tre fatti»; se manca ancora qualcosa, «Minimo: 2 di 3. Ti manca: la parte inferiore». Chi il minimo l'aveva già non vede niente in più (`minimoGiaFatto`).
- **La carta del test in Train** (`Schede.tsx`, per chi non l'ha mai fatto): «Bastano 3 esercizi su 7: uno per la parte superiore, uno per il core, uno per la parte inferiore. Dopo, nei piani le percentuali diventano i tuoi chili». Il 3 viene da `test.minimo` del server (ripiego 3).
- **Via dalla cima** la frase sui «5 per controllare che i conti tornino»: la verifica resta, ma è detta sotto il gruppo, come una cosa in più. In cima c'è un numero solo.

### Come è fatto

- **`minimoTest.ts`** è puro: `statoMinimo(esercizi)` conta, per ogni gruppo che ha esercizi nel test, se ce n'è almeno uno fatto (`ultimo` non nullo), e dà `passi`, `fatti`, `totale`, `raggiunto`, `mancano`, `altri`. Si ricava **dall'elenco degli esercizi**, non da `copertura`, che può mancare (un server di prima): è la stessa cosa di `copertura.calcolabile`. `daCopertura()` fa lo stesso conto sulla `copertura` che torna da `salva_test`, per il messaggio nel foglio (lì l'elenco non è ancora ricaricato).
- **Il minimo per gruppo è 1, scritto qui** (`statoMinimo`): se il server un giorno chiede due esercizi per un gruppo, `daCopertura` lo segue e `statoMinimo` no. Va cambiato insieme a `TEST_MINIMI` di APP-ATHLON.
- **«Tutti e tre fatti» si scrive solo con tre gruppi** (`titoloRaggiunto`): con un numero diverso di gruppi dice «Minimo fatto».
- I nomi nel riquadro sono corti («Parte superiore», non «Parte superiore del corpo») perché stanno in tre colonne; il nome ha due righe riservate, così «Fatto» sta alla stessa altezza nei tre anche quando uno va a capo.
- Tutti i testi sono in italiano e in inglese (`t()`).

### «Con 3 ci rientriamo nei calcoli?» Sì, con un punto debole: le gambe

Guardato sul codice (`_shared/schede/massimali.ts`) e sul database vero, in sola lettura, l'11/11/2026.

- **Il motore è costruito su un test per distretto.** L'indice del distretto è il test diviso per il suo coefficiente; ogni altro esercizio è indice × coefficiente × prudenza (−10%, −20% coi pesi liberi). Con un test c'è l'indice, quindi ci sono i chili.
- **Quanto copre nei piani veri**: delle 725 righe in percentuale delle schede salvate, **413 dipendono dalla parte superiore (57%) e 253 dall'inferiore (35%)**: un test e un test danno i chili al 92% delle righe. **37 (5%) sono core con carico**, che non si calcola dal plank ma **dal peso corporeo**, e solo con il consenso alle misure del corpo: il plank «apre» il core, il numero viene dal peso. Senza il peso quelle righe restano in percentuale anche con «Tutti e tre fatti». 22 righe (3%) non hanno stima e prendono i chili alla prima seduta.
- **Parte superiore: un test basta.** Nei due soci che ne hanno fatti quattro, gli indici tornano fra loro (78, 81, 81, 96; 49, 57, 59, 71): qualunque esercizio scelga, il risultato sta entro un ±20% dalla media, cioè dentro la prudenza.
- **Parte inferiore: un test solo è debole.** Leg extension (0,60) e leg curl (0,45) danno indici diversi in **tre soci su quattro** che li hanno fatti entrambi: 199 e 132, 118 e 63, 22 e 118 (il quarto: 96 e 113). Con un test solo i chili delle gambe dipendono da **quale** dei due si è scelto, anche del 50%, e niente lo segnala. È quello che `105-…` aveva già visto con tre soci: **i due coefficienti vanno rivisti col Direttore Tecnico**. I soci con un test sono ancora 5.
- **Le reti che ci sono già**: la prudenza; la **taratura alla prima seduta** (il massimale stimato vale finché la persona non fa quell'esercizio una volta: poi conta quello che ha sollevato); il massimale che **sale con la persona**, +10% a seduta (APP-ATHLON `176-…`). Una stima sbagliata pesa sulla prima seduta di ogni esercizio, non per sempre.
- **Quindi**: 3 come minimo regge e resta. La cosa più utile oltre il minimo non sono «gli altri 4» alla pari: è **il secondo esercizio delle gambe**, che è l'unico controllo su quell'indice. La schermata oggi li presenta tutti come «Facoltativo» allo stesso modo: se Maurizio vuole, la riga del gruppo inferiore può dirlo più forte («Consigliato: fai anche l'altro»). Non fatto, perché è una scelta sua.

### Provato e non provato

- **Provato**: `npx tsx scripts/prova-minimo-test.ts` (13 prove; **13 modifiche del codice provate, tutte rilevate**); `tsc --noEmit` pulito sui file toccati (restano gli errori di `docs/classifica-server/` e di `scripts/prova-ordine-piani.ts`, di prima); **guardato in Chromium** sulla build web (`expo export -p web`), con la sessione e le funzioni finte (nessuna richiesta è uscita verso la produzione): nessun test, 2 su 3, tutti e tre (chiaro e scuro), tutti e sette con le gambe discordanti, a 320, 390 e 1280 px, e il salvataggio che porta a «Tutti e tre fatti» e a «Minimo: 2 di 3». Nessuno scorrimento orizzontale, nessun errore JavaScript.
- **Non provato**: su un telefono vero e nell'app nativa (iOS, Android); con il testo di sistema molto grande; con la funzione vera (le risposte erano simulate, nella forma di `portale-lab-schede`); la carta in Train, cambiata nel testo e non guardata.
- **Da sapere**: dopo sei settimane il test è «da rifare», ma gli esercizi tengono il loro ultimo risultato: il riquadro dice ancora «Tutti e tre fatti» mentre la carta in Train dice «È ora di rifare il test». Era già così con i «✓ Fatto» delle righe; non toccato.
- **Per pubblicarlo** serve un aggiornamento dell'app (OTA sui runtime in uso) e il deploy del web: è solo JavaScript, nessun modulo nativo e nessuna funzione da ripubblicare.

**Dallo stesso giorno il secondo esercizio delle gambe non è più «Facoltativo» ma «Consigliato»**: vedi `203-…`. Il minimo e il resto di questa nota non cambiano.

**La carta «Fai il test dei massimali» in cima a Train non c'è più** (stesso giorno): il test si propone a valle del questionario e come riga di stato, solo a chi ha un piano che lo usa. Vedi `204-…`. La schermata del test descritta qui non cambia.
