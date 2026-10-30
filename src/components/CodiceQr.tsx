import { useMemo } from 'react'
import { View } from 'react-native'
import Svg, { Path, Rect } from 'react-native-svg'

import { matriceQr } from '@/lib/qr'

// Un codice QR (nero su bianco, sempre: un lettore non legge un QR chiaro su scuro, anche col tema scuro) con il suo margine.
// Disegnato con un solo tracciato SVG. Se il testo non entra non disegna niente.

const MARGINE = 4

export function CodiceQr({ testo, size = 180, etichetta }: { testo: string; size?: number; etichetta: string }) {
  const matrice = useMemo(() => matriceQr(testo), [testo])
  if (!matrice) return null
  const n = matrice.length
  const lato = n + MARGINE * 2
  let d = ''
  matrice.forEach((riga, r) => {
    let c = 0
    while (c < n) {
      if (!riga[c]) {
        c++
        continue
      }
      let fine = c
      while (fine < n && riga[fine]) fine++
      d += `M${c + MARGINE} ${r + MARGINE}h${fine - c}v1h${c - fine}z`
      c = fine
    }
  })
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={etichetta} style={{ width: size, height: size, borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${lato} ${lato}`}>
        <Rect width={lato} height={lato} fill="#fff" />
        <Path d={d} fill="#000" />
      </Svg>
    </View>
  )
}
