import { Children, isValidElement, type ReactNode } from 'react'
import { useWindowDimensions, View } from 'react-native'

import { spazio } from '@/theme'

import { LARGO } from './Pagina'

// Le schede una sotto l'altra sul telefono, su due o tre colonne su uno schermo
// largo (dentro una Pagina `larga`).
export function Griglia({ children, minima = 340 }: { children: ReactNode; /** La larghezza sotto cui una scheda non scende. */ minima?: number }) {
  const { width } = useWindowDimensions()
  const utile = Math.min(width - spazio.tre * 2, 1180)
  const colonne = width < LARGO ? 1 : Math.max(1, Math.min(3, Math.floor((utile + spazio.tre) / (minima + spazio.tre))))
  if (colonne === 1) return <View style={{ gap: spazio.due }}>{children}</View>
  const meta = spazio.tre / 2
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -meta, marginVertical: -meta }}>
      {Children.toArray(children).map((figlio, i) => (
        <View key={isValidElement(figlio) && figlio.key != null ? figlio.key : i} style={{ width: `${100 / colonne}%`, padding: meta }}>
          {figlio}
        </View>
      ))}
    </View>
  )
}
