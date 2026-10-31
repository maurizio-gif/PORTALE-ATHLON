import { useEffect, useState } from 'react'

import { videoCapacita, type VideoCapacita } from '@/api/lab'

// Il video che spiega il movimento di un test (squat, piegamenti, plank): chi non sa cosa
// sono lo vede prima di rispondere. Una lettura sola per apertura dell'app, in memoria; se
// non arriva (funzione non aggiornata, rete) non si vede niente e il passo e' quello di prima.
let videoInMemoria: Promise<VideoCapacita> | null = null
export function useVideoCapacita(): VideoCapacita | null {
  const [v, setV] = useState<VideoCapacita | null>(null)
  useEffect(() => {
    let vivo = true
    if (!videoInMemoria) videoInMemoria = videoCapacita().then((x) => (Object.keys(x).length ? x : ((videoInMemoria = null), x)))
    void videoInMemoria.then((x) => vivo && setV(x))
    return () => {
      vivo = false
    }
  }, [])
  return v
}

