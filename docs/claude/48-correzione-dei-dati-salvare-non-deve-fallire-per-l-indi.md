## Correzione dei dati: salvare non deve fallire per l'indirizzo o per l'email mancante (23/10/2026)

`CorreggiDati` manda l'indirizzo solo se la persona lo scrive: dichiarare «residente all'estero» o cambiare il Paese non riscrive quello che c'è su PerfectGym (prima Roma + Regno Unito dava `InvalidCityName`). Lato funzione (`portale-abbonamento`): se una persona non ha email (un minorenne), `UpdateMemberDetails` la vuole comunque nei dati personali e senza risponde `PersonalData.Email: Incorrect field format` (l'app lo mostrava come errore di codice fiscale): ci va l'email del genitore che è entrato. Una città rifiutata da PerfectGym non blocca più il resto del salvataggio.

