## Le calorie di una lezione: il tipo dà la forbice, non c'è un MET per lezione (prova)

Nel calendario, una lezione di gruppo porta una stima delle calorie (`schede/CalorieLezione.tsx`, il calcolo in
`schede/stimaCorso.ts`): una riga sotto i posti, sotto il turno scelto del Nuoto Libero e un riquadro nella scheda della
lezione (`FoglioLezione`, prop `extra`). Il conto è quello delle schede (`stimaCalorie.ts`: BMR / 1440 × MET × minuti, i
minuti veri della lezione, `fine − inizio`); cambia come si sceglie il MET.

- **Si capisce che tipo di lezione è**, e il tipo dà una forbice di MET: dal nome del tipo su PerfectGym, poi dal testo
  della scheda del sito, poi dalle sole barre. Dentro il tipo scorre l'intensità delle barre (65% cardiovascolare, 35%
  muscolare). Una lezione nuova entra da sola; se non si capisce niente si tace.
- **Scuola Nuoto Adulti**: il livello è nel nome del tipo (`Nuoto Adulti - Base/Intermedio/Avanzato`) e il consumo cresce
  con lui. **Nuoto Libero**: un consumo *indicativo*, con la forbice più larga. Le schede di nuoto (per calcolare anche
  quelle) non ci sono ancora.
- **Non si stima**: la Gym Floor (ha la stima della sua scheda), l'Aqua Gestanti, i corsi e gli eventi dei bambini.
- **Solo al titolare e solo se maggiorenne**: peso, altezza ed età sono i suoi, e dal calendario si sceglie anche un altro del
  nucleo (`titolare` arriva da `persone`).
- **Servono tutti e quattro i dati**: peso, altezza, età e sesso. Senza il sesso non si stima (nelle schede vale il valore di
  mezzo, qui no): nella scheda della lezione si dice cosa manca, nella riga niente.
- **Le fonti dei MET** sono il Compendium of Physical Activities (Ainsworth 2011; aggiornamento 2024, pacompendium.com), e le
  forbici sono tarate sui suoi valori (elencati in `stimaCorso.ts`). Non verificati alla fonte: boxing (da pagine che
  riportano il Compendium), e senza voce nel Compendium la danza di gruppo, la bicicletta in acqua e i MET per livello del
  corso di nuoto, che sono stime nostre da far validare col Direttore Tecnico. Il Compendium non era raggiungibile
  dall'ambiente in cui è stato scritto: i valori vengono dalle pagine che lo riportano.
- **Scuola Nuoto Adulti, i Master Class (`… (M)`, `Workshop Hatha Yoga`) e l'Aqua Gestanti non hanno scheda sul sito**: niente
  finestra della lezione, quindi la stima sta solo nella riga. Un alias nel sito e in `chiaveScheda` darebbe loro anche foto e
  finestra; non è stato fatto.
- **Una spiegazione che mescola testo e un elemento si scrive in JSX, mai in un template**: `${<Text/>}` diventa
  «[object Object]» e `tsc` non lo vede. Si è visto solo rendendo la schermata.

