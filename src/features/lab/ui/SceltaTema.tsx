import { StyleSheet, Text, View } from 'react-native'

import { impostaTema, useSceltaTema, type SceltaTema } from '@/lib/schemaColori'
import { t } from '@/lib/lingua'

import { Icona, type NomeIcona } from './Icona'
import { F, FUOCO, usePalette, velo } from './tema'
import { Tocco } from './Tocco'

// La scelta del tema (02/11/2026, richiesta di Maurizio): tre pillole, «Automatico», «Chiaro» e «Scuro». Automatico e' quello di sempre (sul computer chiaro, sul telefono quello
// del sistema); le altre due valgono ovunque. Sta nel Profilo (Account) e in fondo alla pagina d'accesso, come la lingua. Il resto e' in `lib/schemaColori.ts`.

const VOCI: { scelta: SceltaTema; nome: () => string; icona: NomeIcona }[] = [
  { scelta: 'automatico', nome: () => t('Automatico', 'Automatic'), icona: 'telefono' },
  { scelta: 'chiaro', nome: () => t('Chiaro', 'Light'), icona: 'sole' },
  { scelta: 'scuro', nome: () => t('Scuro', 'Dark'), icona: 'luna' },
]

// `compatta` (02/11/2026, richiesta di Maurizio: sulla pagina d'accesso era «troppo impattante e crea confusione»): pillole piccole e discrete, senza il pieno arancio.
// Quella scelta si riconosce dal contorno e dal testo arancio. Serve in fondo alla pagina d'accesso; nel Profilo restano le pillole di sempre.
export function SceltaTema({ centrata = false, compatta = false }: { centrata?: boolean; compatta?: boolean }) {
  const p = usePalette()
  const attuale = useSceltaTema()
  return (
    <View style={[stili.fila, compatta && { gap: 6 }, centrata && { alignSelf: 'center' }]} accessibilityRole="radiogroup" accessibilityLabel={t('Tema dell’app', 'App theme')}>
      {VOCI.map((v) => {
        const sel = v.scelta === attuale
        return (
          <Tocco
            key={v.scelta}
            ruolo="radio"
            etichetta={v.nome()}
            stato={{ selected: sel }}
            vibra={sel ? null : 'scelta'}
            onPress={() => {
              if (!sel) impostaTema(v.scelta)
            }}
            style={
              compatta
                ? [stili.pillolaPiccola, { backgroundColor: sel ? velo(p, 'accento', 0.12) : 'transparent', borderColor: sel ? velo(p, 'accento', 0.5) : p.linea }]
                : [stili.pillola, { backgroundColor: sel ? FUOCO[1] : p.incavo, borderColor: sel ? FUOCO[1] : p.linea }]
            }
          >
            <Icona nome={v.icona} size={compatta ? 14 : 16} colore={compatta ? (sel ? p.accento : p.testoTerzo) : sel ? '#fff' : p.testoSecondario} />
            <Text style={[compatta ? stili.testoPiccolo : stili.testo, { color: compatta ? (sel ? p.accento : p.testoSecondario) : sel ? '#fff' : p.testo }]}>{v.nome()}</Text>
          </Tocco>
        )
      })}
    </View>
  )
}

const stili = StyleSheet.create({
  fila: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pillola: { minHeight: 44, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' },
  testo: { fontSize: 14, fontFamily: F.bold },
  pillolaPiccola: { minHeight: 34, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center' },
  testoPiccolo: { fontSize: 12.5, fontFamily: F.semi },
})
