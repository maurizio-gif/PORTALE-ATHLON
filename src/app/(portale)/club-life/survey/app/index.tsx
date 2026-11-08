import { Redirect } from 'expo-router'

import { HubApp } from '@/features/lab/clublife/survey/AppHub'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// I capitoli della survey dell'app «funzione per funzione». Solo con la sessione, come le altre survey.
export default function PaginaSurveyApp() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <HubApp />
}
