import { StyleSheet, Text, View } from 'react-native'

import { t } from '@/lib/lingua'

import { Icona } from '../ui/Icona'
import { F, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'

// Quanti pezzi: meno, il numero, piu'. Il massimo lo decide la funzione (`quantita_max` della vetrina): qui si
// ferma il dito, ma il tetto vero e' sul server.
export function Quantita({ valore, minimo = 1, massimo, onCambia, nome }: { valore: number; minimo?: number; massimo: number; onCambia: (nuova: number) => void; nome: string }) {
  const p = usePalette()
  return (
    <View style={stili.riga} accessibilityRole="adjustable" accessibilityLabel={t(`Quantità di ${nome}`, `Quantity of ${nome}`)} accessibilityValue={{ now: valore, min: minimo, max: massimo }}>
      <Tocco onPress={() => onCambia(valore - 1)} spento={valore <= minimo} etichetta={t('Un pezzo in meno', 'One less')} vibra="scelta" style={[stili.tasto, { backgroundColor: p.incavo, opacity: valore <= minimo ? 0.4 : 1 }]}>
        <Icona nome="meno" size={16} colore={p.testo} />
      </Tocco>
      <Text style={[stili.numero, { color: p.testo }]}>{valore}</Text>
      <Tocco onPress={() => onCambia(valore + 1)} spento={valore >= massimo} etichetta={t('Un pezzo in più', 'One more')} vibra="scelta" style={[stili.tasto, { backgroundColor: p.incavo, opacity: valore >= massimo ? 0.4 : 1 }]}>
        <Icona nome="piu" size={16} colore={p.testo} />
      </Tocco>
    </View>
  )
}

const stili = StyleSheet.create({
  riga: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tasto: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  numero: { minWidth: 28, textAlign: 'center', fontFamily: F.extra, fontSize: 17 },
})
