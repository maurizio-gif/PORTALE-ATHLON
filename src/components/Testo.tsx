import type { ReactNode } from 'react'
import { Text, type TextStyle } from 'react-native'

import { useColori } from '@/theme'

// I paragrafi delle pagine: normale, attenuato, piccolo, sottotitolo.
type Variante = 'normale' | 'attenuato' | 'piccolo' | 'sottotitolo'

const STILI: Record<Variante, TextStyle> = {
  normale: { fontSize: 15, lineHeight: 22 },
  attenuato: { fontSize: 15, lineHeight: 22 },
  piccolo: { fontSize: 13, lineHeight: 19 },
  sottotitolo: { fontSize: 19, lineHeight: 25, fontWeight: '700' },
}

export function Testo({ variante = 'normale', children, style }: { variante?: Variante; children: ReactNode; style?: TextStyle }) {
  const c = useColori()
  const colore = variante === 'attenuato' || variante === 'piccolo' ? c.testoSecondario : c.testo
  return <Text style={[STILI[variante], { color: colore }, style]}>{children}</Text>
}

export function Forte({ children }: { children: ReactNode }) {
  return <Text style={{ fontWeight: '700' }}>{children}</Text>
}
