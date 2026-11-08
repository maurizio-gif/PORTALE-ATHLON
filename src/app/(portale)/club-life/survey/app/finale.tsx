import { Redirect } from 'expo-router'

import { FinaleApp } from '@/features/lab/clublife/survey/AppFinale'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// Il giudizio finale sull'app: la riga `app-generale`. Solo con la sessione.
export default function PaginaSurveyAppFinale() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <FinaleApp emailAccesso={sessione.user.email} />
}
