## «Iscriviti» dal sito apre «Attiva un abbonamento» con il piano già scelto (04/11/2026)

Richiesta di Maurizio: sul sito «Iscriviti» del listino e la scheda d'iscrizione della chat non portano più alla registrazione di PerfectGym. Mandano il link di `sito-accesso-link`, destinazione `abbonamento` (APP-ATHLON, «L'iscrizione a un abbonamento dal sito»), che arriva qui come `entra?d=abbonamento&p=<id>#th=…`.

- **`destinazioni.ts`**: il `case 'abbonamento'` porta a `/abbonamento?piano=<id>`. `p` passa da `pianoValido` (solo cifre, da una a sei), e senza un piano valido porta a `/abbonamento` e basta. `entra.tsx` legge `p` e lo passa a `EntraDalSito` come `piano`. `arrivoDa` lo prende come quinto argomento, dopo `oggi`, così le chiamate che c'erano non cambiano.
- **`lab/Abbonamento.tsx`**: il parametro `piano` sceglie il piano **una volta sola**, quando lo stato è arrivato, **solo se** quel `piano_id` è nel listino e **mai nel cambio** (lì l'elenco esclude quello che si ha già, e il link del sito non porta a un cambio). Un id sconosciuto lascia la scelta alla persona. La persona resta quella di sempre (il titolare, o il primo che può comprare).
- **Chi è nuovo** passa prima da «Completa il profilo»: il layout del portale tiene l'indirizzo, e dopo si arriva al listino con il piano scelto.
- **Provato**: `scripts/prova-entra.ts` (18 prove, compresa `abbonamento`: piano valido, mancante, non numerico, troppo lungo; categoria e giorno ignorati) e `tsc` senza errori in `src`. **Non provato**: in un browser con un link vero.
