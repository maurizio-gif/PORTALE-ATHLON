## «Realizzata da Ready 2 Digital»: il credito in fondo all'accesso e al Profilo (04/11/2026)

Richiesta di Maurizio: l'app deve dire chi l'ha fatta, su tutte le versioni (iOS, Android e il portale web). Lo Store non lo permette (il
venditore è l'account Apple, POINT 2000 SRL), quindi lo dice l'app.

- **`ui/Realizzata.tsx`**: «Realizzata da **Ready 2 Digital**» (in inglese «Made by»), piccolo e centrato come la riga della privacy, con
  il link a `https://www.ready2digital.it`. Sta **in fondo alla pagina d'accesso** (sotto il tema) e **in fondo al Profilo** (sotto «Elimina
  account»): si vede anche prima di entrare, e non sta in mezzo a niente.
- **Sul totem il nome resta e il link no**: un tocco aprirebbe un sito estraneo sul pannello del club, e chi è davanti non saprebbe come
  tornare. Il testo diventa grigio come il resto della riga.
- **Arriva con un aggiornamento OTA** (canale `production`): è solo codice JS, nessun modulo nativo.
- Nella scheda dello Store, il credito sta in fondo alla descrizione («App progettata e sviluppata da Ready 2 Digital»), **mai nelle parole
  chiave**: Apple respinge i nomi di altri marchi lì.

**Provato**: `tsc`. **Non provato**: l'aspetto sul telefono e sul totem.
