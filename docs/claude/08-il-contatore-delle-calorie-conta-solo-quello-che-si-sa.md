## Il contatore delle calorie conta solo quello che si sa

`/allenamento/calorie` (`schede/ContatoreCalorie.tsx`, il conto in `schede/contatoreCalorie.ts`) somma le calorie del
titolare giorno per giorno: due anelli in cima (la settimana rispetto alla settimana migliore, oggi rispetto a un giorno
medio), i sette giorni, le ultime 12 settimane, il confronto e da dove vengono. Si entra dalla carta «Le tue calorie» nell'area
Train dell'Athlon Health System.

- **Due fonti, e nessun'altra.** Le sedute delle schede chiuse nell'app (durata vera fra 10 minuti e 3 ore, il consumo
  della scheda al MET di mezzo col dopo-allenamento) e le lezioni a cui la reception ha segnato la presenza (azione
  `presenze` di `portale-lab-calendario`, che legge `prenotazioni_di`: la stessa presenza della scheda del CRM). Una
  lezione si stima come nel calendario (`stimaLezione`, con la sua scheda), quindi il numero è quello che il socio ha visto.
- **La Gym Floor non conta come presenza**: in sala vale la seduta della scheda, e contarle tutte e due conterebbe due
  volte la stessa ora. Chi si allena in sala senza chiudere la seduta nell'app lì non compare.
- **Il giorno è quello di Roma e la settimana parte dal lunedì.** Il confronto con la settimana scorsa è alla pari: fino
  allo stesso giorno della settimana.
- **Servono gli stessi quattro dati delle lezioni** (`useStatoCorpo` di `CalorieLezione.tsx`); senza, la schermata dice
  cosa manca. Se la lettura delle presenze non riesce si contano le schede, e lo si dice.
- **Le animazioni che arrivano a un valore** (anelli, numeri, barre, linea, ciambella) seguono `useProgresso`, con
  requestAnimationFrame e semplici props dell'SVG, per non dipendere dalle proprietà animate di Reanimated sull'SVG, che sul
  web non sono state provate; **partono quando la sezione entra nello schermo** (`useVisibile`), o sotto la piega sarebbero già finite.
  Con «riduci movimento» vanno subito al valore finale e niente gira in loop.

