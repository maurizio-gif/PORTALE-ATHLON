import { Redirect } from 'expo-router'

import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'
import { VideoLab } from '@/features/lab/Video'

// I video del club (gli showcase di Vimeo). Solo con la sessione.
export default function PaginaVideo() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/lab" />
  return <VideoLab />
}
