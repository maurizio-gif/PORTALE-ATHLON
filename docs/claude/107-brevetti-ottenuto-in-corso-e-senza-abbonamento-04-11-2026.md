## Brevetti: ottenuto e in corso, e il libretto anche senza un abbonamento (04/11/2026)

Richiesta di Maurizio (03/11/2026), due cose:

1. **PerfectGym ci dà il livello che il bambino sta facendo, non quello che ha ottenuto.** Il database sposta i dati importati indietro di un livello (`CLAUDE.md` di APP-ATHLON, sezione «Brevetti: il livello è quello ottenuto…», migrazione `20261104c`): `livello` è l'**ottenuto**, `prossimo` è il brevetto **in corso**, e si ottiene con tutte le prove spuntate. Nell'app il viaggio già funzionava così («Il tuo brevetto di adesso» = ottenuto, quello dopo = prossimo): cambia l'etichetta del successivo, **«In corso»** (era «Il prossimo traguardo»), e il caso di chi non ha ancora ottenuto niente.
2. **Anche chi non è iscritto, ma ha dei livelli segnati, deve poterli vedere**: scaricare il libretto, condividere il diploma e il resto. **I brevetti non dipendono dall'abbonamento**: il registro è per persona (`junior_brevetti`, chiave l'id PerfectGym). Il 03/11/2026 i bambini con un livello registrato sono 2.205: **1.475 minorenni e 33 adulti senza nessuna iscrizione attiva**.

### Cosa cambia nell'app

- **`PersonaJunior.in_corso`** (nuovo campo di `junior_nucleo`) accanto a `livello` (ottenuto). `haBrevetti(persona)` (`comune.ts`) = ha un ottenuto o è nel registro e sta facendo il primo.
- **Senza abbonamento**: sotto «Non iscritto» compare la sezione **«Brevetti»** (la stessa `Brevetti`: carta, viaggio, PDF, diploma, foto) per chi ha un brevetto ottenuto, e sotto ci sono le attività da scegliere (solo se la persona è in età per i corsi). Con l'abbonamento la voce «Brevetti» del menu c'è anche per chi sta facendo il primo.
- **Chi non ha ancora ottenuto niente** (era in A1): niente viaggio né diploma (non c'è un brevetto da mostrare), ma una carta «Brevetto in corso» con Stella Marina 1 e le prove spuntate, e la frase che il brevetto si ottiene con tutte le prove.
- **Si sceglie chi ha dei brevetti anche se non è in età per i corsi** (`personeDaMostrare`, `scegliibili`): un adulto non iscritto con dei livelli rivede il suo libretto. Prima la persona si sceglieva solo fra gli idonei.
- **«Nessun gruppo attivo» non nasconde più i brevetti**: senza gruppi aperti la pagina si ferma solo se non c'è neanche un libretto da mostrare.
- Mentre si legge lo storico non si scrive più «non ha ancora un brevetto»: c'è lo scheletro.

### Rilascio

**Compatibile con i dati di prima e di dopo la migrazione** (senza `in_corso` si comporta come prima), quindi **va per primo**: web subito, app nativa con le store. Poi la migrazione, poi il CRM.

### Provato, e non provato

`tsc` pulito sul `src/` (restano i due errori di `scripts/` che ci sono già su `main`). **Non guardato in un browser né su un telefono**: la sezione per i non iscritti, la carta «in corso», la scelta di un adulto, il caso senza gruppi aperti.
