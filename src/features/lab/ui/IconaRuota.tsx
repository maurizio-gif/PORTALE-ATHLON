import Svg, { Path } from 'react-native-svg'

import { SPICCHI } from '../fit/Ruota'

// L'icona di Athlon Health System nella barra delle schede (20/10/2026, richiesta del club): la ruota
// di Train, Food e Relax, tre frecce che si rincorrono in cerchio, in piccolo. Stessa geometria della
// ruota grande (fit/Ruota.tsx) su una griglia di 24. **Scheda attiva: nei tre colori** (arancio, verde,
// verde acqua); **non attiva: in un colore solo**, quello delle altre icone della barra, perche' la
// barra resti calma. Ferma: a questa grandezza girare non si leggerebbe, e la barra e' sempre in vista.

const LATO = 24
const C = LATO / 2
const R = 8
const SPESSORE = 3.1
/** Lo spazio fra una freccia e la successiva, in gradi. */
const VUOTO = 22
/** Quanti gradi occupa la punta. */
const TESTA = 17

const rad = (g: number) => ((g - 90) * Math.PI) / 180
const punto = (g: number, r = R) => [C + r * Math.cos(rad(g)), C + r * Math.sin(rad(g))] as const

function freccia(da: number, a: number): { arco: string; punta: string } {
  const fine = a - TESTA
  const [x0, y0] = punto(da)
  const [x1, y1] = punto(fine)
  const [ex, ey] = punto(fine, R + SPESSORE * 0.95)
  const [ix, iy] = punto(fine, R - SPESSORE * 0.95)
  const [px, py] = punto(a)
  return { arco: `M ${x0} ${y0} A ${R} ${R} 0 0 1 ${x1} ${y1}`, punta: `M ${ex} ${ey} L ${px} ${py} L ${ix} ${iy} Z` }
}

const FRECCE = SPICCHI.map((s, i) => ({ ...s, ...freccia(i * 120 + VUOTO / 2, (i + 1) * 120 - VUOTO / 2) }))

export function IconaRuota({ size = 24, attiva = false, colore }: { size?: number; attiva?: boolean; colore: string }) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${LATO} ${LATO}`}>
      {FRECCE.map((f) => (
        <Path key={`a${f.nome}`} d={f.arco} stroke={attiva ? f.colore : colore} strokeWidth={SPESSORE} fill="none" strokeLinecap="round" />
      ))}
      {FRECCE.map((f) => (
        <Path key={`p${f.nome}`} d={f.punta} fill={attiva ? f.colore : colore} stroke={attiva ? f.colore : colore} strokeWidth={0.8} strokeLinejoin="round" />
      ))}
    </Svg>
  )
}
