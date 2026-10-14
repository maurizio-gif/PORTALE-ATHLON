import type { Vetrina, VideoClub } from '@/api/lab'

// Quello che le tre schermate di Athlon TV si passano: gli showcase e i video
// gia' letti restano in memoria, cosi' tornando indietro non si ricaricano e
// il lettore sa quali sono «i prossimi».

export const memoria: { vetrine: Vetrina[] | null; video: Map<string, VideoClub[]> } = { vetrine: null, video: new Map() }

/** «12:05», «1:02:30». */
export function durata(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(Math.floor(s % 60)).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

/** «31 video», «1 video». */
export const quanti = (n: number) => `${n} video`
