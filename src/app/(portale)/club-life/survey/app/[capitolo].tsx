import { Redirect, useLocalSearchParams } from 'expo-router'

import { CapitoloApp } from '@/features/lab/clublife/survey/AppCapitolo'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// Un capitolo della survey dell'app. Solo con la sessione: e' l'accesso a dire chi risponde (l'email e il numero socio non si chiedono).
export default function PaginaSurveyAppCapitolo() {
  const sessione = useSessione()
  const { capitolo } = useLocalSearchParams<{ capitolo: string }>()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <CapitoloApp id={String(capitolo ?? '')} emailAccesso={sessione.user.email} />
}
