import { StyleSheet, Text, View } from 'react-native'

import { impostaTema, useSceltaTema, type SceltaTema } from '@/lib/schemaColori'
import { t } from '@/lib/lingua'

import { Icona, type NomeIcona } from './Icona'
import { F, FUOCO, usePalette } from './tema'
import { Tocco } from './Tocco'

// La scelta del tema (02/11/2026, richiesta di Maurizio): tre pillole, «Automatico», «Chiaro» e «Scuro». Automatico e' quello di sempre (sul computer chiaro, sul telefono quello
// del sistema); le altre due valgono ovunque. Sta nel Profilo (Account) e in fondo alla pagina d'accesso, come la lingua. Il resto e' in `lib/schemaColori.ts`.

const VOCI: { scelta: SceltaTema; nome: () => string; icona: NomeIcona }[] = [
  { scelta: 'automatico', nome: () => t('Automatico', 'Automatic'), icona: 'telefono' },
  { scelta: 'chiaro', nome: () => t('Chiaro', 'Light'), icona: 'sole' },
  { scelta: 'scuro', nome: () => t('Scuro', 'Dark'), icona: 'luna' },
]

export function SceltaTema({ centrata = false }: { centrata?: boolean }) {
  const p = usePalette()
  const attuale = useSceltaTema()
  return (
    <View style={[stili.fila, centrata && { alignSelf: 'center' }]} accessibilityRole="radiogroup" accessibilityLabel={t('Tema dell’app', 'App theme')}>
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
            style={[stili.pillola, { backgroundColor: sel ? FUOCO[1] : p.incavo, borderColor: sel ? FUOCO[1] : p.linea }]}
          >
            <Icona nome={v.icona} size={16} colore={sel ? '#fff' : p.testoSecondario} />
            <Text style={[stili.testo, { color: sel ? '#fff' : p.testo }]}>{v.nome()}</Text>
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
})
