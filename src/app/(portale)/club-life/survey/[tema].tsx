import { Redirect, useLocalSearchParams } from 'expo-router'

import { Survey } from '@/features/lab/clublife/survey/Survey'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// Una survey del club. Solo con la sessione: e' l'accesso a dire chi risponde (l'email e il numero socio non si chiedono).
export default function PaginaSurveyTema() {
  const sessione = useSessione()
  const { tema } = useLocalSearchParams<{ tema: string }>()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <Survey slug={String(tema ?? '')} emailAccesso={sessione.user.email} />
}
