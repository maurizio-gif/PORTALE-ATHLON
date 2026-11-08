import { StyleSheet, Text } from 'react-native'

import { F, raggio, usePalette, velo } from '../../ui/tema'
import { Tocco } from '../../ui/Tocco'

// Le parti che le schermate della survey dell'app si dividono (08/11/2026).

/**
 * Una pastiglia da accendere e spegnere: i motivi per cui una funzione non convince, i capitoli da migliorare per primi. Alta almeno
 * 44 punti (il bersaglio di un dito) e con `checked`, perche' `Tocco` scrive `aria-checked` solo con quello.
 */
export function Chip({ testo, scelto, onPress, spento = false }: { testo: string; scelto: boolean; onPress: () => void; spento?: boolean }) {
  const p = usePalette()
  return (
    <Tocco
      onPress={onPress}
      ruolo="checkbox"
      etichetta={testo}
      stato={{ checked: scelto, selected: scelto, disabled: spento }}
      spento={spento}
      vibra="scelta"
      scala={0.96}
      style={[stili.chip, { borderColor: scelto ? p.accento : p.linea, backgroundColor: scelto ? velo(p, 'accento', 0.14) : p.carta, opacity: spento ? 0.45 : 1 }]}
    >
      <Text style={{ color: scelto ? p.accento : p.testo, fontFamily: scelto ? F.extra : F.semi, fontSize: 14, lineHeight: 19 }}>{testo}</Text>
    </Tocco>
  )
}

const stili = StyleSheet.create({
  chip: { minHeight: 44, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1.5, borderRadius: raggio.piccolo, justifyContent: 'center' },
})
