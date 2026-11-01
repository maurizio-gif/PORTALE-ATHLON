## L'avvio animato: il logo che si costruisce, una volta a ogni apertura

Quando si apre l'app (richiesta del club, 19/10/2026) il pittogramma di Athlon si costruisce da solo (`src/features/lab/avvio/`): le due forme del logo si
disegnano con una punta luminosa, arrivano da lati opposti e si incastrano con un piccolo rimbalzo, il riempimento di fuoco sale e allo scatto si accende
l'alone e parte un anello sottile; poi un riflesso lento attraversa il logo e il logo respira una volta. Dura 3,25 secondi, poi si dissolve nell'app;
**un tocco la salta** (via in un terzo di secondo). **Solo il logo: niente scritte** (né «Athlon Club 4.0» né il motto: erano nella prima versione e il
club le ha tolte) **e niente coriandoli** (scintille, polvere, punti in orbita, lampo bianco): il club vuole un movimento sobrio, e la costruzione del
logo è la parte che gli piace, quindi non si tocca. Un effetto nuovo si chiede al club prima di aggiungerlo.

- **Quando si vede** (`mostra.ts`): una volta per apertura. Sul web vuol dire una volta per scheda del browser (`sessionStorage`: ricaricare la pagina
  non la rifà, riaprire l'app dopo averla chiusa sì); sul telefono, finché il processo è vivo. Si vede anche prima del login (è l'apertura
  dell'app). **Non si vede** nelle pagine pubbliche (`/r/<token>`, `/richiesta`: non stanno nel layout del portale, dove è montata), in vista cliente
  (`?come=`: lo staff non aspetta) e quando l'indirizzo è un ritorno da un altro sito (`?code=`, `state`, `error`: il collegamento di un dispositivo, un
  pagamento). Decidere e segnare è un'operazione sola: un ricaricamento a metà non la rifà.
- **Il fondo scuro prima del codice** sta in `public/index.html` (`data-avvio` su `<html>`): senza, per mezzo secondo si vedrebbe il grigio chiaro della
  pagina prima che il codice giri. **Ripete le regole di `mostra.ts`**: se cambiano in uno, vanno cambiate nell'altro (se qui si sbaglia l'effetto è solo
  un fondo scuro per un istante, mai un avvio che non parte).
- **Tutto è una funzione pura del tempo** (`tempi.ts`): un solo orologio (`requestAnimationFrame`) scrive `t` e ogni elemento si calcola da lì, senza
  stato nascosto. Le forme SVG hanno semplici proprietà e **non sono animate da Reanimated** (sul web non è provato, come per il contatore delle calorie).
  La tabella delle tappe, in millisecondi, sta in testa a `Avvio.tsx`. Misurato in un browser vero (rendering software, quindi il peggio): 17 ms a
  fotogramma di media, 16,8 al 95°; il sipario compare appena il codice gira e se ne va da solo a 3,25 s.
- **Il logo è vettoriale** (`logo.ts`): due poligoni ricavati da `assets/images/pittogramma.png` seguendo il contorno dell'alfa a mezzo pixel e
  semplificandolo (21 e 18 punti, 98,9 % del disegno originale; gli spigoli appena arrotondati si rifanno con `strokeLinejoin="round"`). **Se il logo
  cambia, si rifanno da quel file**, non a mano.
- **«Riduci movimento»**: niente si muove, la scena finita entra e esce in dissolvenza in un secondo e mezzo, e il tocco non serve. Un colpetto
  (`colpetto('ok')`) allo scatto sul telefono, niente sul web. Etichetta per i lettori di schermo: «Athlon. Tocca per continuare.»
- **Non è provato su un telefono vero**, solo nel browser (schermi 360, 390, 430 e 1280 px, anche con «riduci movimento» e tutti i casi in cui non si
  vede). Sul telefono si passa dalla schermata nativa arancione (`expo-splash-screen`) al fondo scuro dell'avvio senza dissolvenza: da guardare, e se
  stona si fa partire l'avvio dallo stesso arancio.

