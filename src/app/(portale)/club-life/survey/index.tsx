import { Redirect } from 'expo-router'

import { MenuSurvey } from '@/features/lab/clublife/survey/ElencoSurvey'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// Il menu delle survey del club: gli stessi argomenti di `/surveys/` del sito, scritti nell'app (survey/dati.ts). Solo con la sessione.
export default function PaginaSurvey() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <MenuSurvey />
}
