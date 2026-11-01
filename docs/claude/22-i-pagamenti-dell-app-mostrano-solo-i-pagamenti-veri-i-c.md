## I pagamenti dell'app mostrano solo i pagamenti veri; i crediti non si vedono

Richiesta del club (19/10/2026): nella sezione Pagamenti (`pagamenti/Movimenti.tsx`, `src/api/lab.ts`) il socio vede **solo i pagamenti**. I **pagamenti non fiscali** di
PerfectGym — voucher, crediti referral, gift card, rettifiche, crediti di chiusura abbonamento: nel CRM sono i «crediti» — **per ora non si mostrano**. L'app non fa niente
di nuovo: li toglie la funzione (`portale-lab-pagamenti`, azione `movimenti`, che non restituisce le righe con `fonte = 'credito'`), e la regola che li riconosce sta nel database
(`perfectgym.pagamenti_non_fiscali`), la stessa del CRM. Dettagli e perché: `CLAUDE.md` di APP-ATHLON, «I pagamenti: reali e crediti, e la prima nota».

- **Il rimborso di un pagamento vero resta** («Rimborso», in blu, col «+»), anche se al desk lo registrano come una riga a parte: è un movimento vero. L'importo arriva già
  positivo dalla funzione (nel mirror è negativo: prima usciva «+-690,00 €»).
- **Il totale «Pagato» di un abbonamento** (`AbbonamentiMiei.tsx`, da `portale-abbonamento`) **include ancora i crediti**: è il conto del contratto (addebitato − pagato = da pagare). Se si
  vogliono fuori anche da lì, i tre numeri della riga non quadrano più per chi ha avuto un credito: va deciso col club prima.
- **Se un giorno i crediti si mostrano**, è una scelta del club: la funzione li ha già (`fonte = 'credito'`) e basta non escluderli; l'app dovrebbe dare loro un nome e un'icona
  suoi (non «Pagato») e dire che non sono soldi spesi.

Per verificare: nessun codice di questo repository è cambiato per questa richiesta (solo questa nota). Con una sessione di un socio che ha un voucher o un credito referral: la
sezione Pagamenti non lo elenca e lo storico non cambia per chi non ne ha.

