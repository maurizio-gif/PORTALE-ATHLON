# Glossario italiano → inglese dell'app

L'app si usa in italiano o in inglese (`src/lib/lingua.ts`). Le parole inglesi sono **quelle di PerfectGym**: chi
passa dalla nostra app al Client Portal, alle email del club o alla reception deve trovare gli stessi nomi. Sono
ricavate dal manuale inglese di PerfectGym (`APP-ATHLON/docs/perfectgym_kb_completa.json`, 1.146 articoli) e dallo
swagger (`APP-ATHLON/docs/perfectgym_api_v2.2.json`), contando quale parola usa davvero (accanto, quante volte compare
nel manuale). **Va riletto dal club** e confrontato con il Client Portal aperto in inglese: dove le due cose
divergono, vince quello che il socio vede su PerfectGym.

**Ortografia americana** (`enrollment`, `canceled`), come PerfectGym. Le date invece sono all'europea
(`en-GB`: «Tuesday 20 October»), perché il club è a Roma. Si dà del *you*, con lo stesso tono amichevole
dell'italiano; niente formule da ufficio.

## I nomi propri non si traducono

I nomi delle attività, degli abbonamenti e dei prodotti del club (Scuola Nuoto Bambini, Nuoto Libero Assistito,
Premium Mensile Flex, Group Reformer) sono **nomi propri** scritti dal club su PerfectGym. Nei testi dell'app restano
come sono, in italiano, finché il club non scrive la traduzione su PerfectGym (le tabelle `…Translation`: vedi
«I nomi da PerfectGym» in fondo): un nome inventato qui sarebbe un nome che alla reception nessuno riconosce.
Restano uguali anche i marchi dell'app: Athlon Health System, Train, Food, Relax, Athlon TV, Club Life, Help Desk,
Gym Floor, Guest Pass, Athlon Health Score.

## Abbonamenti e contratti

| italiano | inglese | note |
| --- | --- | --- |
| abbonamento | membership | il prodotto (1.119) |
| contratto | contract | il documento su PerfectGym (5.090): «Contract details» |
| formula, piano di pagamento | payment plan | (2.246) |
| quota mensile, canone | monthly fee | |
| quota di attivazione | joining fee | (101) |
| rinnovo automatico | auto-renewal | |
| in corso / non ancora iniziato / finito | current / not started / ended | gli stati di PerfectGym |
| sospensione, sospendere | freeze | (1.382; «suspension» 8) |
| sospeso | frozen | |
| disdetta (dell'abbonamento) | cancellation / termination | «termination» per il contratto |
| pro-rata | pro rata | |
| durata minima | minimum term | |
| omaggio | complimentary | |
| socio, iscritto | member | (8.293) |
| ospite, prova | guest | (570) |
| contatto non ancora socio | lead | |
| Guest Pass | Guest Pass | nome proprio |

## Lezioni e prenotazioni

| italiano | inglese | note |
| --- | --- | --- |
| lezione | class | (2.432) |
| corso a iscrizione (Scuola Nuoto) | course | (718) |
| turno, gruppo a iscrizione | group | |
| iscrizione | enrollment | (223) |
| prenotazione / prenotare | booking / book | (2.781) |
| disdire una prenotazione | cancel booking | |
| lista d'attesa | waiting list | |
| disdetta in ritardo | late cancellation | (69) |
| mancata presenza | no-show | |
| presenza | attendance | |
| ingresso | visit / entry | |
| palinsesto, planning | timetable | (188) |
| istruttore | instructor | |
| posti liberi | spots available | |
| al completo | full | |
| recupero (lezione persa) | make-up class | |
| prenotazioni (la scheda dell'app) | bookings | |

## Personal training

| italiano | inglese |
| --- | --- |
| personal training | personal training |
| personal trainer, trainer | personal trainer, trainer |
| seduta | session |
| abbonamento PT | PT membership |

## Pagamenti

| italiano | inglese | note |
| --- | --- | --- |
| pagamenti | payments | |
| addebito | charge | (534) |
| scadenze (da pagare) | due payments | |
| pagamento in sospeso, insoluto | outstanding payment | |
| debito | debt | |
| metodo di pagamento | payment method | su PerfectGym «payment source» (262), al socio «payment method» |
| carta di credito | credit card | |
| addebito SEPA (IBAN) | direct debit | (393) |
| rimborso | refund | |
| ricevuta | receipt | |
| credito, voucher | voucher / credit | |
| prodotti | products | |
| carrello, ordine | cart, order | |
| ritiro in segreteria | pick up at reception | |

## Persone e documenti

| italiano | inglese |
| --- | --- |
| famiglia, nucleo familiare | family, family members |
| genitore, tutore | parent, guardian |
| figlio, figlia | child |
| certificato medico | medical certificate |
| consenso | consent |
| informativa privacy | privacy notice |
| termini e condizioni | terms and conditions |
| segreteria, reception | front desk, reception |
| area riservata | member area |
| badge | access card |
| profilo | profile |
| notifiche | notifications |

## Allenamento

| italiano | inglese |
| --- | --- |
| piano di allenamento | workout plan |
| esercizio | exercise |
| serie / ripetizioni | sets / reps |
| recupero (fra le serie) | rest |
| massimale | one-rep max (1RM) |
| carico | load |
| seduta, allenamento | workout, session |
| piano di nuoto | swim plan |
| sala pesi | gym floor |

## I nomi da PerfectGym

PerfectGym tiene le traduzioni per lingua di tipi di lezione (`ClassTypeTranslations`), abbonamenti
(`PaymentPlanTranslations`) e prodotti (`ProductTranslations`). Il mirror le copia (APP-ATHLON, «Le lingue
dell'app»), e le funzioni del portale danno il nome inglese quando c'è: il club le compila su PerfectGym, e
l'app le mostra senza un rilascio.
