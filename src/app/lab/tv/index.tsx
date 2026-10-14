import { Redirect } from 'expo-router'

import { AthlonTv } from '@/features/lab/tv/AthlonTv'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// Athlon TV: gli showcase di Vimeo del club. Solo con la sessione.
export default function PaginaAthlonTv() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/lab" />
  return <AthlonTv />
}
