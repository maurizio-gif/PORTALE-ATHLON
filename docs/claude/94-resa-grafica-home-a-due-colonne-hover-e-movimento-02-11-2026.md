## La resa grafica: la Home a due colonne da computer, l'hover, il bagliore che respira e «riduci movimento» (02/11/2026)

Richiesta di Maurizio: «ottimizzare la resa grafica del portale, introdurre qualche elemento dinamico, controllare le distanze e
ottimizzare tutte le visualizzazioni e tutti i formati». Guardato in un browser con una sessione e dati finti (telefono 390×844,
tablet 820×1180, computer 1440×900, totem 1080×1920) prima e dopo: nessuno scorrimento orizzontale in nessun formato, nessun
testo sotto i 10 punti (sul totem la pagina è ingrandita ×2, quindi 20 fisici), e i comandi sotto i 44 punti sono quelli sistemati
qui sotto.

- **La Home su schermo largo è a due colonne** (`Colonne` in `ui/kit.tsx`). Da `LARGO` (900) la colonna dell'app è 1180 punti e
  ogni carta della Home («Certificato scaduto», «Aiutaci a migliorare l'app», «Da fare», lo shop, Junior…) era una striscia di 1100
  punti con righe da cento caratteri. Ora le carte fra la testata e i riquadri stanno su due colonne; la testata, i riquadri e la
  sezione restano a tutta larghezza. Sul telefono e sul tablet non cambia niente (una sotto l'altra, stesso `gap` di `Schermata`).
  **Sul web le colonne sono quelle del browser** (`columnCount: 2` su un contenitore `display: block`): le carte riempiono la
  sinistra dall'alto e poi la destra, nell'ordine in cui stanno scritte, e una carta che non disegna niente (ce ne sono molte,
  compaiono a condizione) non occupa posto. La prima stesura alternava per indice (pari a sinistra, dispari a destra), e con le
  carte assenti una colonna restava quasi vuota. Ogni carta ha un involucro che non si spezza fra le colonne (`breakInside`) e
  porta sotto di sé lo spazio fra una carta e l'altra; l'involucro di una carta assente misura zero (`onLayout`) e lo spazio lo
  perde. **Sul nativo** (tablet di traverso) resta l'alternanza per indice: `columnCount` non esiste.
- **Il puntatore conta, sul computer**: ogni `Tocco` (cioè tutto quello che si preme) si solleva di un soffio col mouse sopra
  (`onHoverIn`, molla), e sotto il dito si abbassa come prima. Chi non lo vuole passa `sollevaInHover={false}`.
- **Il bagliore arancio della testata respira** (`Bagliore` in `ui/kit.tsx`): in una ventina di secondi si allarga, si sposta di
  qualche punto e torna. Era un cerchio fermo scritto a mano in `AreaRiservata`; ora è un componente, riusabile su ogni scheda scura.
- **L'icona della barra delle schede fa un saltino** quando la scheda diventa quella attiva (`Salto` in `ui/BarraSchede.tsx`), e
  **l'icona bianca del riquadro scelto** della Home entra con una molla (`ZoomIn.springify`, `home/Riquadri.tsx`).
- **«Riduci movimento» si rispetta** (`ui/movimento.ts`, `useRiduciMovimento`): legge `prefers-reduced-motion` sul web e
  `AccessibilityInfo` sul nativo, con `useSyncExternalStore`. Con la preferenza accesa bagliore, saltino, hover e molla del tocco
  stanno fermi. Le animazioni che portano un dato (barre, avvio) decidono da sole, come prima.
- **I bersagli piccoli**: i tre tondini della pillola delle bandiere e del tema sono di 30 punti; il tocco si allarga di 7 per lato
  con `hitSlop` (nuovo parametro di `Tocco`), senza allargare il disegno. «Aggiungi la tua foto» nella testata era un testo alto 16
  punti: ha 14 di padding sopra e sotto con margini negativi uguali, così arriva a 44 e la testata non cresce.
- **Due errori di tipo pregressi** che facevano fallire `npm run typecheck` (`accessoDalCrm.ts`, `delega/ConfermaDelega.tsx`): sistemati,
  senza cambiare il comportamento. `tsc` ora è pulito sul `src/`; restano gli errori in `docs/classifica-server/`, che non è codice
  dell'app (`tsconfig` include tutto il repository).
- **Come si guarda**: `npx expo export -p web`, un server statico sul `dist` che serve `index.html` per ogni percorso, Playwright con
  la sessione finta in `localStorage` (`sb-<ref>-auth-token`), `portale_la_mia_area` e `portale-lab-calendario` intercettati con dati
  finti, `portale-registrazione` che risponde `aperta: false`. **Si naviga toccando la barra delle schede**, non con l'indirizzo: aprendo
  `/calendario` direttamente la pila rimanda alla Home. Sul totem la sessione va anche in `sessionStorage` con `athlon_totem_ultimo`.
- **Non provato**: l'app nativa (iOS/Android), e `expo lint` non è configurato nel repository (lo script lo crea da zero e installa
  pacchetti: non va committato).
