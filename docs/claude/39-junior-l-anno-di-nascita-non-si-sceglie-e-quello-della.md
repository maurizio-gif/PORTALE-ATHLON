## Junior: l'anno di nascita non si sceglie, è quello della persona (22/10/2026)

Richiesta di Maurizio. Con una persona scelta in «La tua famiglia» (`Junior.tsx`, `annoFisso`) i gruppi sono **solo quelli del suo anno di nascita**: le tessere degli anni non compaiono, al loro posto una riga «Gruppi per <nome> · nato nel <anno>». Le tessere restano solo se non c'è una persona o se il suo anno non ha nessun gruppo. Il filtro per giorno e «solo con posti liberi» restano. `tsc` pulito; **non guardato renderizzato**.
- **Titolo e nota** (22/10/2026): con una persona scelta la riga sopra i gruppi dice «Le nostre attività per <nome> · nato nel <anno>», e sotto «La pallanuoto è solo maschile» (anche nella scheda dell'attività, «In breve»). **È una nota, non un filtro**: il sesso non è nel `nucleo` di `portale-lab-junior`, quindi le bambine vedono comunque i gruppi di Pallanuoto; per nasconderli serve il sesso da `junior_nucleo` (APP-ATHLON).

