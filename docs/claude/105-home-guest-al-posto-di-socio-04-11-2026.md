## La Home scrive «Guest» a un Guest, non «Socio» (04/11/2026)

Dal test sul totem del 03/11/2026: una persona con una scheda Guest (appena registrata) vedeva nella Home la pillola «Socio». Quella pillola era **fissa per chiunque** (`AreaRiservata.tsx`), non leggeva il tipo di scheda.

- `portale_area_per_email` (APP-ATHLON, migrazione `20261104a`, già applicata) porta ora `tipo` per ogni persona; `PersonaArea.tipo` (`api/lab.ts`) è facoltativo, così con una funzione di prima resta «Socio».
- La seconda pillola, quando non c'è una famiglia, scrive **«Guest»** per un Guest, **«Registrato»** (in inglese «Registered») per un Lead e «Socio» per un Member. Con una famiglia resta «Famiglia di N».
- **Provato**: `tsc` senza errori nuovi (45 di base); la funzione SQL risponde `Guest` per la scheda del test. **Non guardato in un browser.**
