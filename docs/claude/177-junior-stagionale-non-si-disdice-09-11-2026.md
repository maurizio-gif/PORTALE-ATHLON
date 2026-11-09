## Junior: lo stagionale non si disdice e non è «al mese» (09/11/2026)

Decisione di Maurizio: gli abbonamenti **stagionali** dei corsi bambini hanno pagato tutta la stagione in anticipo e **non si disdicono**. La disdetta è solo per i mensili. Il canone è sempre la cifra che la famiglia paga, e 0 se non c'è nessuna quota. Lato server: `CLAUDE.md` di APP-ATHLON, sezione 190.

- **`ContrattoJunior`** (`src/api/junior.ts`) porta `stagionale` e `disdicibile`, che manda `junior_corsi_di`.
- **«Disdici l'abbonamento»** (`Corsi.tsx`) compare solo se `disdicibile !== false`. Con la funzione di prima, che non manda il campo, il comando resta com'era.
- **Rinnovo e finestra delle lezioni** (`rinnovoJunior`, `finestraLezioni` in `comune.ts`): per lo stagionale dicono «già pagato per tutta la stagione, fino al …, non si rinnova e non si disdice».
- **La regola «Rinnovo e disdetta»** delle attività in vasca (`attivita.ts`) nomina lo stagionale.
- **La riga della quota** era già nascosta con canone 0. Il canone 0 arriva agli stagionali e ai contratti senza quota. Per i mensili il canone è la quota vera, anche scontata (71 € invece di 89 €).
- **Provato**: `tsc --noEmit`, nessun errore nuovo in `src/`. **Non provato** su un telefono.
