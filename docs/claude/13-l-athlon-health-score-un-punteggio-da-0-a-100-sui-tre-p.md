## L'Athlon Health Score: un punteggio da 0 a 100 sui tre pilastri, regolarità e non volume

Richiesta del club (20/10/2026): in Athlon Health System un punteggio che dica **come stai andando**, come fa Move di Technogym (non si chiama
così: è un marchio). Cartella `src/features/lab/fit/`: `calcoloPunteggio.ts` (il calcolo, **puro**), `usePunteggio.ts`, `Punteggio.tsx` (la carta in
cima a Fit, l'anello a tre settori e la schermata `/allenamento/punteggio`), `CheckInSonno.tsx`. Il lato server (il sonno scritto a mano) è nel
`CLAUDE.md` di APP-ATHLON, «I dispositivi dei soci». **Non si salva niente**: si ricalcola a ogni apertura da quello che Fit e Relax già leggono.

- **Tre pilastri, 70 + 15 + 15.** Train fino a 70 punti, Food fino a 15, Relax fino a 15: **il 100 serve tutti e tre**. Un pilastro non attivato non
  toglie niente, semplicemente non aggiunge, e il suo posto resta visibile («Con Food e Relax puoi arrivare fino a 100»).
- **Le ultime quattro settimane, mobili** (non da lunedì a domenica: il lunedì non riparte da zero e una settimana storta non azzera): ogni pilastro è la
  media pesata di quattro blocchi di 7 giorni, 40% il più recente, poi 30, 20 e 10. **I blocchi prima della prima attività registrata non contano**
  (chi comincia adesso non parte penalizzato) e la schermata dice su quante settimane è calcolato.
- **Train conta i giorni attivi, non le sedute**: un giorno è attivo con almeno 20 minuti fra le sedute dei piani chiuse nell'app e le lezioni con la
  presenza segnata dalla reception (le stesse fonti del contatore, ma **senza peso, altezza e sesso**: il punteggio non stima calorie; per questo
  `useFit` espone `sessioni`). Due lezioni lo stesso giorno valgono una volta, ed è anche per questo che un domani gli allenamenti di un orologio si
  potranno unire per giorno senza contarli due volte. **La curva premia il ritmo costante**: 2-4 giorni su 7 è il massimo, con 1 si prende il 40%,
  oltre i quattro scende di un decimo al giorno (con 7 su 7, il 70%), mai sotto. «Più lezioni ti penalizza leggermente, non ti dà punti»: è così.
  **Limite noto**: chi si allena in sala senza chiudere la seduta nell'app non compare (gli ingressi in palestra sarebbero la terza fonte: non
  verificato se il database li ha); se la reception non segna una presenza, quella lezione non c'è.
- **Food guarda i pasti, non le calorie**: un giorno vale se nel diario ci sono colazione, pranzo e cena (chi ha risposto «quasi mai» a «Fai colazione?»
  basta pranzo e cena), 5 giorni su 7 danno il massimo, e **oggi non conta** (non è finito). Niente macro, niente soglie: il club non ha un
  nutrizionista. **Chi ha nascosto i numeri in Food (o ha detto che contare lo mette a disagio) esce dal conto**: il punteggio si rapporta ai pilastri
  che restano e non c'è nessun invito a tornarci.
- **Relax guarda le notti**: ogni notte (scritta a mano o letta dal dispositivo) vale in base alle ore (7 o più = 1; 6 = 0,7; 5 = 0,4; meno = 0,2; una
  notte più lunga non costa punti) e 5 notti su 7 danno il massimo. Per la stessa notte vale il dispositivo, non quella scritta a mano. **Il pilastro
  si chiama ancora Relax** (la ruota, l'introduzione e l'indirizzo lo usano): il sonno è il suo primo strumento, non il suo nome.
- **Il check-in del sonno** (`CheckInSonno.tsx`, in cima a Relax): «a che ora sei andato a dormire e a che ora ti sei svegliato?», due tasti a un quarto
  d'ora che **tenuti premuti scorrono** (e passano la mezzanotte), la notte fra le ultime sette, di partenza le ore dell'ultima notte scritta (o 23:00 e
  07:00): **niente si salva da solo**, conta quando si preme «Salva». **La durata si ricava dalle due ore** (la ricalcola anche la funzione; da 2 a 16
  ore). Sta nella stessa tabella dei dispositivi con `fornitore = 'manuale'`; stesso consenso, stessa revoca.
- **Le parole sono morbide** (`Banda`: «Si comincia», «Sulla strada», «Buon ritmo», «Ottimo ritmo», e «In equilibrio» quando tutti i pilastri in gioco
  sono almeno al 60%), mai un allarme, mai un confronto con altri soci, nessuna classifica (con l'alimentazione sarebbe pericolosa), nessun premio.
- **Dove un pilastro non esiste** (vista cliente dello staff, minorenni) resta il solo allenamento, in settantesimi («70 su 70»), senza inviti.
- **Le soglie sono nostre** (20 minuti, 2-4 giorni, 5 giorni di diario, 7 ore, i pesi delle settimane) e vanno fatte validare dal Direttore Tecnico;
  le 7 ore per gli adulti sono la posizione comune delle società scientifiche, ricordata e non riletta alla fonte. **Dare punti per il consenso a dati
  sulla salute** (Food e Relax) è una scelta del club da far rileggere al consulente privacy: il punteggio senza di loro resta sensato (fino a 70).
- **Da fare, non fatto**: **il calcolo dei punti nel server** (se il club vuole premi: oggi li calcola l'app, vedi i livelli); gli ingressi in sala come terza fonte di Train; gli allenamenti di Oura e Polar (si uniscono per giorno); Apple Salute e Health
  Connect (build nativa, vedi `docs/analisi-wearable-salute.md`); un grafico storico (oggi si ricalcola dalle fonti: se il club vuole l'andamento nel
  tempo o le classifiche serve salvare uno snapshot, e allora è un lavoro del server); la regolarità dell'ora in cui si va a dormire (le due ore ci sono).

### Il Train in profondità: «Il tuo allenamento» (20/10/2026)

Dal pilastro Train del dettaglio («L'analisi del tuo allenamento») si apre `/allenamento/training` (`fit/Training.tsx`, calcolo **puro** in `fit/analisiTraining.ts`): le
stesse quattro settimane del punteggio viste da vicino. Quanti giorni e quante sessioni (e a settimana), le ore, **di che tipo** (sala o lezioni; le lezioni per categoria e
per nome), **quando** (che giorno della settimana e che parte della giornata, a Roma), **la sala** (serie, chili sollevati, esercizi, e il confronto fra gli ultimi 7 giorni e la media
delle tre settimane prima), **il riposo** (giorni senza allenamento, pausa più lunga, da quanto non ci si allena) e **le calorie** dell'allenamento (settimana per settimana e per
tipo, dalle voci del contatore: servono peso, altezza, età e sesso, altrimenti la schermata lo dice e porta a «Aggiungi i tuoi dati»; rimanda al contatore e al Balance, che restano
com'erano). Le «frasi» in cima («In breve») sono scritte dal codice: **descrivono, non danno consigli** (una prova controlla che non ci siano «dovresti», «devi», «prova a»). La sola soglia
è quella del punteggio: 2-4 giorni su 7. Per questo `Sessione` (da `sessioniDa`) porta nome, categoria, orario, serie, chili ed esercizi, e il resto del punteggio usa solo `SessioneBase`.

### I livelli: punti che si accumulano, e un equilibrio che li tiene attivi (20/10/2026)

Richiesta del club: oltre al punteggio (come stai andando adesso) un percorso a livelli, **Legno, Bronzo, Argento, Oro, Platino, Diamante**, che dia sempre qualcosa: ogni allenamento fa salire i
punti, e il livello si mantiene finché c'è l'equilibrio. Calcolo puro in `fit/calcoloLivelli.ts`, interfaccia in `fit/Livelli.tsx` (la medaglia, l'**anello di sei segmenti**, una per livello, che si
riempie, la riga della carta di Fit e il dettaglio), registro in `fit/useLivelli.ts` e `src/api/livelli.ts`. Lato server (`portale-lab-livelli`, tabella `athlon_punti_settimane`): `CLAUDE.md` di APP-ATHLON.

- **I punti si accumulano e non tornano indietro.** Una settimana finita (lunedì-domenica) dà i punti dei tre pilastri, con le regole del punteggio ma su quella settimana sola: Train fino a 70 (la stessa curva: **un solo
  allenamento fa comunque 28**, con 2-4 giorni 70), Food fino a 15, Relax fino a 15. In più due premi che si leggono dal registro: la **costanza** (+5 per ogni settimana di fila nel ritmo giusto dopo la prima, al
  massimo +20) e l'**equilibrio** (+10 se tutti i pilastri che si usano sono almeno al 60%). Una settimana vale al massimo 130.
- **Le soglie**: Legno 0, Bronzo 150, Argento 500, Oro 1200, Platino 2400, Diamante 4200. Per un socio sempre nel ritmo giusto, con il solo Train: Oro in circa 14 settimane, Platino in 27, Diamante in 47; con i tre pilastri: 10, 19 e 33.
  **Nomi, soglie e premi sono miei da far validare al club**: stanno in `LIVELLI`, `BONUS_COSTANZA` e `BONUS_EQUILIBRIO`.
- **Il registro sta nel server perché i dati vecchi escono dalle finestre di lettura** (le presenze arrivano a 12 settimane, il diario a 31 giorni, il sonno a 30) e i punti non devono sparire. L'app, aprendo il
  punteggio, calcola le **ultime 4 settimane finite** (le stesse del punteggio: è «il punto di partenza», la prima volta; poi ogni apertura aggiunge le nuove) e manda quelle in cui i punti sono di più di quelli
  registrati; il server non li fa mai scendere. **I punti li calcola l'app**: un socio potrebbe gonfiare i propri. Finché i livelli sono un gioco va bene; **se il club ci attacca dei premi, il calcolo va spostato nel server**.
  Chi apre l'app meno di una volta ogni quattro settimane perde le settimane in mezzo.
- **Per mantenere il livello serve l'equilibrio**: il livello si raggiunge coi punti e **non si perde mai**, ma è «attivo» solo se il punteggio di adesso è almeno al 50% di quello possibile (`SOGLIA_MANTENIMENTO`);
  sotto è **«in pausa»** (la medaglia si spegne un po', c'è scritto «IN PAUSA» e cosa lo riattiva) e torna attivo da solo. Mai una retrocessione, mai un allarme: i punti restano tuoi.
- **Food e Relax sono dati sulla salute**: i loro punti nel registro esistono solo con un consenso vivo **alla versione corrente dell'informativa** (la funzione li tiene a zero senza), e **la revoca di Food o dei dispositivi li azzera** (`portale-lab-alimentazione` e
  `portale-lab-dispositivi`). I punti di Train non dipendono da nessun consenso. In vista cliente i livelli non si vedono e la funzione non si chiama.
- **Dove la funzione non c'è ancora (404) i livelli non compaiono**: il punteggio resta com'era. L'app può uscire prima della funzione senza rompere niente.
- **Descrive e incoraggia, non confronta**: nessuna classifica, nessun confronto con altri soci, nessun premio (con l'alimentazione sarebbe pericoloso).

Per verificare: `npx tsc --noEmit` ha **32 errori di base** che non sono nostri (nella cartella `schede` ci sono `ContatoreCalorie.tsx` e
`contatoreCalorie.ts`, che il compilatore su macOS confonde: ogni import di `useProgresso`, `useVisibile` ecc. «dal maiuscolo» ne fa tre in più, anche in
`Punteggio.tsx`, `Livelli.tsx` e `Training.tsx`: nove in tutto); **non vanno aggiunti altri**. **Due file non possono chiamarsi uguale a meno delle maiuscole** (`punteggio.ts` e `Punteggio.tsx`: per questo i
calcoli si chiamano `calcoloPunteggio.ts` e `calcoloLivelli.ts`). `calcoloPunteggio.ts`, `calcoloLivelli.ts` e `analisiTraining.ts` si provano con `npx tsx` (curva, finestre, esclusioni, e su 200 casi a caso che i
punti dei pilastri sommano al totale; soglie dei livelli, costanza e serie interrotte, equilibrio, quali settimane registrare; ora e giorno a Roma, sala, riposo, calorie, e che le frasi non diano consigli). **La schermata si guarda renderizzata** (390 e 800 px, chiaro e scuro): con la funzione simulata (un piccolo
server che risponde alle `portale-lab-*`, sessione di prova nel `localStorage` e `.env.local` con `EXPO_PUBLIC_SUPABASE_URL` locale) si sono provati: tutto
al massimo (100, «In equilibrio»), senza consenso a Food e Relax (70 con l'invito), Food nascosto (rapportato, nessun invito), minorenne (70 su 70), il check-in
(salvataggio, «Cambia», «Togli», scorrimento a tasto premuto oltre la mezzanotte) e il dettaglio. **Non provato**: una sessione vera, un telefono, la
funzione vera (migrazioni e funzioni sono in produzione dal 20/10/2026, ma nessuna è stata provata con una sessione vera).

