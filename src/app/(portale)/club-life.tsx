import { Redirect } from 'expo-router'

import { ClubLife } from '@/features/lab/clublife/ClubLife'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// Club Life: la pagina del sito (news, eventi, servizi, Help Desk) dentro l'app.
// Solo con la sessione, come le altre quattro voci della barra.
export default function PaginaClubLife() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <ClubLife emailAccesso={sessione.user.email} />
}
