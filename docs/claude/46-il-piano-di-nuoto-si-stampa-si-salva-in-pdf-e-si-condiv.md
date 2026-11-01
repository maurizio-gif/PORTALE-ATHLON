## Il piano di nuoto si stampa, si salva in PDF e si condivide (23/10/2026)

Richiesta di Maurizio. Nella scheda di un piano di vasca (`Scheda.tsx`), sotto la spiegazione «si legge e non si registra», due pulsanti: **«Stampa o salva in PDF»** e **«Condividi il piano»**. Solo per i piani di vasca: in sala il piano si registra, e non c'è un documento da portare a bordo.

- **Il documento** lo compone `schede/documentoVasca.ts` (puro, si prova con `npx tsx`): tutte le sedute, ognuna coi suoi metri (un'addizione, mai minuti), la parte, «4 × 100 m», l'intensità come parola, il recupero, le note, e in fondo l'avvertenza (accorcia la seduta, con dolori chiedi al tecnico). **Dice le stesse cose della schermata e non ne aggiunge**: niente calorie, niente stime. Esce in due forme: una pagina HTML da stampare (bianco e nero, una seduta non si spezza fra due fogli) e un testo semplice.
- **Sul web** `stampaPiano` (`schede/esportaVasca.ts`) stampa la pagina da un riquadro nascosto: la finestra di stampa del browser stampa e, scegliendo «Salva come PDF», salva. Nessuna libreria, nessun file che passa da un server, niente si conserva. Il nome proposto per il PDF è `piano-nuoto-<titolo>` (per il tempo della stampa cambia il titolo della pagina). **«Condividi»** apre il foglio di condivisione del dispositivo col testo, o lo copia negli appunti.
- **Sull'app nativa non c'è un PDF**: servirebbe un modulo nuovo e quindi una build; «Stampa o salva in PDF» apre il foglio di condivisione del telefono col testo, da cui si salva (Note, File, email) o si stampa. Se si vuole un PDF vero anche lì, è `expo-print` e una build.
- **Nessuna modifica al server**: l'app non chiama niente di nuovo e funziona con le funzioni di oggi.

Provato: `tsc` senza errori nuovi sui tre file; il documento con una prova (metri, escape di `<` e `&` nel titolo, nome del file, nessuna parola di calorie o minuti) e **la pagina stampata in PDF con Chromium** (A4, colonne allineate fra le sedute). **Non provato**: la finestra di stampa vera su Safari e Firefox, `navigator.share` su un telefono, il foglio di condivisione dell'app nativa, e il pulsante renderizzato nella scheda (390 e 1280 px, chiaro e scuro).

