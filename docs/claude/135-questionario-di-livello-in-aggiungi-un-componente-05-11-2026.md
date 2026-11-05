## Il questionario di livello in «Aggiungi un componente» (05/11/2026)

Richiesta di Maurizio: le tre domande sul nuoto del modulo del sito, obbligatorie, anche quando il genitore registra un figlio
dall'app (`lab/junior/FoglioComponente.tsx`, in Junior e in Home › Famiglia).

- **Le domande**: «Ha mai frequentato un corso di nuoto?», «Sa nuotare senza ausili (braccioli, ciambella)?», «Sa eseguire
  correttamente lo stile libero completo?», con Sì / No (`Scelte`). Le stesse parole del sito (`DOMANDE_LIVELLO` in
  `data/contatto.ts` di SITO-ATHLON).
- **Compaiono da tre anni di calendario in su** (`chiedeLivello`: nato almeno tre anni solari fa), cioè fuori dalle annate del
  Baby Nuoto, dove il bambino entra in acqua col genitore e le domande non hanno senso. Compaiono quando la data di nascita è
  scritta, e **«Aggiungi al nucleo» resta spento finché non ci sono tutte e tre le risposte**.
- **Le risposte vanno a `portale-lab-junior`** (`ha_frequentato`, `sa_nuotare`, `stile_libero` in `aggiungiComponente`), che le
  salva in `junior_livello_iniziale`; il CRM le mostra nella scheda del bambino (Contatti e Scuola Nuoto). Il lato server:
  `CLAUDE.md` di APP-ATHLON, «Il livello in acqua anche per un figlio aggiunto dall'app».
- **Pubblicare prima la funzione**: con quella di prima le risposte si ignorano (il figlio si aggiunge lo stesso).
- **Provato**: `tsc` pulito. **Non guardato a schermo** né provato con la funzione vera.
