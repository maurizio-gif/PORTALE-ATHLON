## Le video guide nelle schede dell'Help Desk: si guardano al tocco, e sul telefono in verticale (05/11/2026)

Richiesta di Maurizio: le video guide fatte con Bragg vanno nelle schede del wiki, nell'app e sul sito. Sono sei: la Home (abbonamento, pagamenti, documenti, famiglia, profilo), le Prenotazioni, l'Athlon Health System, il certificato medico, «Invita i tuoi amici» e la sezione Junior. La Home, le Prenotazioni e la Junior hanno anche il taglio verticale.

**I file e il testo stanno nel sito** (athlon-roma, sezione «Le video guide nelle schede del wiki» del suo `AGENTS.md`): `public/wp-content/uploads/2026/11/guida-*.mp4` con la copertina `.jpg`, e nelle schede una `<figure class="ci-video">`. Il sito la traduce in un blocco nuovo di `/club-life.json`:

```ts
{ t: 'video'; titolo: string; largo: Clip; alto: Clip | null }
// Clip = { src, poster, larghezza, altezza }, indirizzi assoluti su www.athlonroma.it
```

| Scheda (`area/slug`) | Video |
| --- | --- |
| `generali/app-area-riservata` («Dove trovo cosa nell'app») | Home e Athlon Health System, nella sezione «Le video guide», con i link alle altre |
| `generali/prenotazioni` | Prenotazioni |
| `generali/certificato-medico` | Certificato medico |
| `generali/referral-guest-pass` | Invita i tuoi amici |
| `snb/gestione-account` | La sezione Junior |

**Nell'app** il blocco lo disegna `Guida` in `clublife/Blocchi.tsx`:

- **Copertina e tasto play, il video solo al tocco.** Il lettore (`expo-video`, con i comandi del sistema) si crea solo dopo il tocco: una guida pesa 7–17 MB, e chi apre la scheda per leggere una regola non la scarica.
- **Sul telefono il taglio verticale**, se c'è (sempre sull'app nativa, sul web sotto i 700 px). È largo al massimo 420 px, al centro, così su uno schermo largo non diventa una colonna altissima.
- **Si ferma se si passa a un'altra schermata.** Tornando indietro la scheda si chiude, e il lettore se ne va con lei.
- Sul web il `play()` dato alla creazione arriva prima del `<video>` e si perde: si riparte al primo `readyToPlay`, una volta sola. Larghezza e altezza al 100% vanno scritte: con il solo `absoluteFill` il `<video>` prende la sua misura vera ed esce dalla cornice.
- **Un'app installata senza questo aggiornamento** non conosce il blocco: `UnBlocco` lo salta (`default: null`), e la didascalia non compare da sola, perché il sito la mette dentro il blocco. Si vede la scheda di prima, senza il video.

Le schede del sito e la loro versione per l'app (`articoli-app`) portano tutte e due il video, nello stesso punto.

- **Provato**: `tsc`, senza errori nuovi in `src/`. Sull'app web in Chromium, con una pagina di prova temporanea (poi cancellata) che leggeva il `/club-life.json` del sito in locale: copertina, avvio al tocco, comandi, misura nella cornice; a 375 px il taglio verticale della Junior, nessuno scorrimento di lato.
- **Non provato**: l'app nativa (iOS e Android), che con le schede vere arriva con il prossimo aggiornamento EAS; le schede nell'app con l'accesso vero.
