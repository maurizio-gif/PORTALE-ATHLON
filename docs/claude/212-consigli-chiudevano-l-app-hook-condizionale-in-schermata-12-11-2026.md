## I Consigli chiudevano l'app: un hook condizionale in `Schermata` (12/11/2026)

Ticket di un socio (12/11/2026, «Scrivi al team» dalla schermata `allenamento`): finito il questionario dei Consigli l'app si chiudeva, e
da allora si chiudeva a ogni apertura dei Consigli, anche dopo averla reinstallata.

- **La causa** non erano i dati (i consigli salvati, `consigli_salvati`, erano in ordine; la funzione rispondeva). In `ui/Schermata.tsx`
  dal 08/11/2026 (b7e3757, la barra «La tua scelta» ferma in basso) c'era `const conBarra = barra && schedaAttiva(usePathname()) >= 0`:
  **`usePathname` si chiamava solo con `barra` vero**. I Consigli mostrano prima una `Schermata` con `barra={false}` (lo scheletro mentre si
  leggono, o l'attesa dopo «Dammi i consigli») e poi, nella stessa posizione, quella della risposta con la barra: lo stesso componente passa
  a un hook in piu', React lancia un errore («Cannot read properties of undefined (reading 'length')» in `areHookInputsEqual`), e
  nell'app installata un errore di disegno senza un ErrorBoundary chiude l'app. Reinstallare non cambiava niente perche' i consigli sono
  salvati dalla funzione e si rileggono a ogni apertura. Vale per **chiunque** abbia dei consigli salvati, non solo per chi ha scritto.
- **La correzione**: `usePathname()` si chiama sempre, prima della condizione. Copre ogni schermata che cambia `barra` sulla stessa
  `Schermata`, non solo i Consigli.
- **Come si e' trovato**: bundle web non minificato, una pagina di prova con `<Consigli />` e Playwright con le risposte della funzione
  finte (costruite dai dati veri del socio). Prima della correzione la pagina cade con l'errore sopra; dopo, la risposta si vede intera.
  La pagina di prova non e' nel ramo.
- **Da fare**: arriva al telefono con un'OTA (questo e' solo JavaScript). Finche' non esce, i Consigli salvati si aprono solo dal web.
- `tsc`: 45 errori come su `main`, nessuno in `Schermata.tsx`. **Non provato su un telefono.**
