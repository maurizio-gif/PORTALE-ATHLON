// Il Percorso Athlon e' in standby (richiesta del club, 20/10/2026): non si vede piu' nell'app, e non e' stato tolto niente.
//
// Con `true`:
//   - il link «Apri il Percorso Athlon» in fondo alla schermata dei consigli non compare (`AltraStrada` in `consigli/Consigli.tsx`);
//   - le tre schermate (`/allenamento/percorso`, `percorso-nuovo`, `percorso-modifica`) rimandano ai consigli, cosi' un
//     vecchio link o un segnalibro non apre una funzione che non si offre piu'.
//
// Resta tutto il resto: questa cartella, `src/api/percorso.ts`, la funzione `portale-lab-percorso` con le sue azioni, le tabelle, la
// scheda del contatto del CRM. **Per riaccenderlo basta mettere `false` qui**, ma prima si decide dove deve ricomparire
// (il link in fondo ai consigli, o di nuovo la carta in Train) e si ricontrolla con i tester: non e' stato provato con una sessione vera.
export const PERCORSO_IN_STANDBY = true
