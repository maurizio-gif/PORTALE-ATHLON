import Svg, { Path } from 'react-native-svg'

// La stella delle valutazioni: la carta «Com'e' andata?» della Home (stelle alle lezioni) e le survey di Club Life la disegnano
// uguale. Piena e' arancio, vuota e' solo il contorno.

const STELLA = 'M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.5l-5.9 3.2 1.2-6.6L2.5 9.5l6.6-.9z'

export function Stella({ piena, size, colore, vuota }: { piena: boolean; size: number; colore: string; vuota: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={STELLA} fill={piena ? colore : 'none'} stroke={piena ? colore : vuota} strokeWidth={1.6} strokeLinejoin="round" />
    </Svg>
  )
}
