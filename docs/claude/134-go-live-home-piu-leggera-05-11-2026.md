## Go-live: la Home non pre-carica le vetrine di Athlon TV, e i gruppi Junior solo a chi ha un figlio (05/11/2026)

Seguito dell'analisi pre go-live (sezione 133): la Home a freddo apriva 16 funzioni e 2 RPC, e due di quelle funzioni non
servivano a nessuno sulla Home.

- **`portale-lab-video vetrine`** (le raccolte Vimeo di Athlon TV) non si pre-carica più da `AreaRiservata.tsx`: era una
  chiamata in più a ogni apertura, per una schermata che si apre di rado, e Athlon TV (`tv/AthlonTv.tsx`) le legge da sé
  quando si apre. Sul server quella funzione fa fino a dieci chiamate a Vimeo per istanza fredda: nel burst del lancio era
  il modo di prendere un 429 da Vimeo per niente.
- **`portale-lab-junior gruppi`** si pre-carica dalla carta Junior (`home/CartaJunior.tsx`) solo se nel nucleo c'è un figlio
  in età junior (`figlioJunior`): per tutti gli altri era una funzione in più a ogni apertura, e la sezione Junior li legge
  da sé quando si apre.
- **Restano sulla Home**, dalla stessa analisi, e sono il passo dopo se serve: `calendario da_valutare`, `anagrafica
  controllo`, `referral stato`, `pagamenti prodotti`, `documenti elenco` e la RPC dei tesseramenti, che partono a ogni
  apertura anche se la loro sezione non è quella visibile; la cache solo in memoria senza scadenza; i polling a intervallo
  fisso senza backoff dopo i pagamenti.
- **Provato**: `tsc` pulito sui file toccati. **Non provato** su un telefono.
