## «Capire il cibo»: sei letture di cultura alimentare nell'area Food (01/11/2026)

Idea di Maurizio, da un'app di allenamento vista per caso (sezione «Nutrizione»: sei voci con definizioni, più che consigli).
**I testi sono nostri**, riscritti: nessuna riga copiata. Cartella `src/features/lab/cultura/`, route `/allenamento/cultura?tema=<id>`.

- **Dove**: in `fit/Food.tsx`, sotto la porta del diario, **in tutti e tre gli stati da maggiorenne** (prima del consenso, senza
  questionario, diario aperto). Sono contenuti generali, **senza dati personali**: non passano dall'informativa di Food, non toccano
  il diario e non chiamano nessuna funzione. Nella vista cliente e per i minorenni non compaiono (come tutta l'area Food).
- **Sei tessere tutte in vista** (`CulturaCibo.tsx`, 2 colonne, 3 sopra i 760 px), niente fila da scorrere: lo stesso motivo dei
  filtri del Calendario. Temi: macros, proteine, bilancio calorico, prima e dopo l'allenamento, idratazione, qualità degli alimenti.
- **Una lettura** (`Cultura.tsx`): apertura a colori con «In una riga», poi i blocchi di `temi.ts` (testo, punti, un disegno, «Mito o
  realtà?» da toccare), il riquadro «Cultura, non un piano» con le fonti, e la lettura dopo. **Per aggiungere un tema o un blocco si
  scrive solo in `temi.ts`** (testi in italiano e inglese con `t()`).
- **I disegni** (`Visual.tsx`, viste e barre, niente immagini): kcal per grammo, fasce dei LARN (riusa `LARN` di `conti.ts`), proteine per
  100 g, l'altalena del bilancio (si tocca), dove va l'energia, linea del tempo prima/dopo, test del colore delle urine (si tocca),
  gruppi NOVA. Colori dei macros uguali a quelli del diario (`COLORE_MACRO`).
- **Illustrazioni** (`Emoji.tsx`, richiesta di Maurizio: «icone o foto, molto figa»): emoji a colori, non foto. Hanno il disegno del
  sistema su ogni telefono e sul web, non pesano e non hanno diritti da pagare. Tre per tema (`emoji` in `temi.ts`) in un grappolo
  nell'angolo di tessera e apertura (`Grappolo`), su cerchi chiari (`Cerchi`); più bolle colorate negli elenchi (`Bolla`), emoji nelle
  barre, nell'altalena, nella linea del tempo, nelle fonti di proteine e nei gruppi NOVA. Se un giorno ci sono foto del club o del
  ristorante convenzionato, si mettono al posto del grappolo. Le emoji più nuove possono non comparire su telefoni vecchi: usate solo
  quelle comuni.
- **Disclaimer semplice in fondo a ogni lettura** (richiesta di Maurizio, al posto del riquadro «Cultura, non un piano»): «Questi sono
  consigli di base e non sostituiscono il piano di un nutrizionista», con le fonti in piccolo. Resta la regola di fondo, che vale qui come
  nel diario (`09-l-alimentazione-…`): **niente cifre «da raggiungere»** e nessuna frase che dica a una persona quanto deve mangiare.
  Surplus e deficit sono spiegati senza kcal; i numeri (LARN, ACSM) sono riferimenti con la fonte.
- **Da ricontrollare alla fonte prima di aprire a tutti**: i numeri sono ricordati, non riletti. In particolare le proteine per 100 g
  (`FONTI_PROTEINE`, valori medi arrotondati: meglio rileggerli dal catalogo `alimenti` o dalle tabelle CREA), il 2% di perdita di
  liquidi (ACSM 2007), i 2 / 2,5 litri di acqua totale (EFSA 2010), i 20–40 g di proteine per pasto (ISSN 2017) e la scala NOVA
  (Monteiro 2019). Coerenza con i consigli di `consigli.ts` (acqua, proteine): stessi riferimenti.
- **Verifica**: `tsc` pulito sui file nuovi; guardato nel browser a 390 px, tema chiaro e scuro, con i tocchi (altalena, mito, colori);
  **non guardato su un telefono vero**.
