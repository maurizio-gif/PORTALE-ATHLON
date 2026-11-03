## L'abbonamento dal nucleo: per i familiari solo da 13 a 17 anni, mai per un altro adulto (04/11/2026)

Richiesta di Maurizio: dal mio account posso fare l'abbonamento per **me** e per i familiari **da 13 a 17 anni**. Non per un altro adulto, anche se è associato al mio account, e la possibilità **non deve nemmeno comparire**. Corregge le sezioni 98 e 100, che invitavano chiunque avesse 13 anni o più.

- **La regola è una sola**, `acquistabileDaQuestoAccount(titolare, anni)` in `lib/eta.ts`: il titolare sempre; un familiare solo da 13 a 17 anni compiuti (`ETA_MINIMA_ABBONAMENTO` ≤ età < `ETA_ADULTO` = 18); età sconosciuta = no (nel dubbio non si invita).
- **Dove si applica**: `senzaAbbonamento` (`home/regolarita.ts`), da cui vengono la carta d'invito nella sezione Abbonamenti e il «Scegli l'abbonamento» sulla riga di Famiglia; e la scelta «Per chi» di `Abbonamento.tsx`, dove un altro adulto (o un bambino sotto i 13) **non compare più** nemmeno come «Non disponibile», e un `?membro=` che non è fra le scelte si ignora. Nel **cambio abbonamento** l'elenco resta com'è: la persona è quella del contratto che si cambia.
- **Il server diceva già no** (`idoneita` in `portale-abbonamento`: «Un adulto compra il suo abbonamento dal suo account»): non è cambiato niente lì. L'app mostrava l'invito e poi una schermata «Non è possibile acquistare».
- **Provato**: la regola con `node --experimental-strip-types` (8 casi: io stesso, 12, 13, 17, 18, 40 anni, età ignota); `tsc` senza errori nuovi (45 di base). **Non guardato in un browser né su un telefono, non provato con un nucleo vero.**
