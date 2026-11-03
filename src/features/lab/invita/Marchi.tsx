import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg'

// I segni dei social per i comandi di «Invita i tuoi amici» (04/11/2026). L'app non ha una libreria di icone con i loghi,
// quindi sono disegnati qui, in un quadrato di 40 con gli angoli tondi e i colori di ogni marchio. **Sono segni semplificati
// e non i file ufficiali**: se il club vuole quelli veri basta sostituire il contenuto di ogni funzione.

const LATO = 40
const ANGOLO = 12

function Fondo({ fill }: { fill: string }) {
  return <Rect width={LATO} height={LATO} rx={ANGOLO} fill={fill} />
}

export function MarchioFacebook({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${LATO} ${LATO}`}>
      <Fondo fill="#1877F2" />
      <Path
        transform="translate(8 7)"
        fill="#FFFFFF"
        d="M13.5 21v-7.2h2.4l.4-2.8h-2.8V9.2c0-.8.2-1.4 1.4-1.4h1.5V5.3c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8V11H8v2.8h2.5V21h3z"
      />
    </Svg>
  )
}

export function MarchioInstagram({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${LATO} ${LATO}`}>
      <Defs>
        <LinearGradient id="ig" x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0" stopColor="#FEDA75" />
          <Stop offset="0.28" stopColor="#FA7E1E" />
          <Stop offset="0.55" stopColor="#D62976" />
          <Stop offset="0.8" stopColor="#962FBF" />
          <Stop offset="1" stopColor="#4F5BD5" />
        </LinearGradient>
      </Defs>
      <Rect width={LATO} height={LATO} rx={ANGOLO} fill="url(#ig)" />
      <Rect x={11} y={11} width={18} height={18} rx={5.5} fill="none" stroke="#FFFFFF" strokeWidth={2} />
      <Circle cx={20} cy={20} r={4.3} fill="none" stroke="#FFFFFF" strokeWidth={2} />
      <Circle cx={25.3} cy={14.7} r={1.2} fill="#FFFFFF" />
    </Svg>
  )
}

/** La nota di TikTok: tre copie sfalsate (azzurra, rossa, bianca) di un'asta con la coda e la testa. */
export function MarchioTikTok({ size = 40 }: { size?: number }) {
  const nota = (colore: string, dx: number, dy: number) => (
    <>
      <Path d="M22.5 11 V25.4 M22.5 11 C22.8 14.6 25 16.7 28.6 17" fill="none" stroke={colore} strokeWidth={3.2} strokeLinecap="round" transform={`translate(${dx} ${dy})`} />
      <Circle cx={18.1} cy={25.6} r={4.4} fill={colore} transform={`translate(${dx} ${dy})`} />
    </>
  )
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${LATO} ${LATO}`}>
      <Fondo fill="#010101" />
      {nota('#25F4EE', -1.1, -1.1)}
      {nota('#FE2C55', 1.1, 1.1)}
      {nota('#FFFFFF', 0, 0)}
    </Svg>
  )
}

export function MarchioTelegram({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${LATO} ${LATO}`}>
      <Fondo fill="#229ED9" />
      <Path
        fill="#FFFFFF"
        d="M10 19.6 L29.4 12 C30 11.8 30.5 12.3 30.3 12.9 L26.4 28.4 C26.2 29.1 25.4 29.3 24.8 28.9 L19.6 25 L16.8 27.8 C16.3 28.3 15.5 28 15.5 27.3 V22.6 L10.2 20.8 C9.5 20.5 9.5 19.8 10 19.6 Z"
      />
      <Path d="M15.5 22.6 L26 15.4" fill="none" stroke="#229ED9" strokeWidth={1.3} strokeLinecap="round" />
    </Svg>
  )
}
