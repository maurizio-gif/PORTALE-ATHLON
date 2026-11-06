import { useLocalSearchParams } from 'expo-router'

import { AggiornaEmail } from '@/features/emailAggiorna/AggiornaEmail'

// Il link dell'SMS per aggiornare l'email (06/11/2026): `https://app.athlonroma.it/email/<token>`. Senza accesso e senza la cornice dell'app, come
// /delega/<codice> e /invito/<codice>: chi ha la casella piena non puo' entrare, e la pagina esiste proprio per questo. Il token e' nel percorso
// e non nel frammento: la pagina lo legge e non consuma niente (si consuma solo confermando il codice), quindi un'anteprima del link non lo brucia.
export default function PaginaAggiornaEmail() {
  const { token } = useLocalSearchParams<{ token: string }>()
  return <AggiornaEmail token={String(token ?? '').trim().toLowerCase()} />
}
