import { StyleSheet, Text, View } from 'react-native'

import type { PersonaArea } from '@/api/lab'
import { locale, t } from '@/lib/lingua'

import { Icona } from './Icona'
import { F, usePalette, velo } from './tema'

// Un pagamento non andato (15/10/2026): il saldo negativo su PerfectGym di una
// persona del nucleo, ma non quando un addebito e' ancora in corso (un SEPA di
// GoCardless impiega giorni). Lo legge portale_la_mia_area (`debito`). In
// evidenza nel «Da fare» della Home, e un bollino accanto al nome.

function soldi(n: number): string {
  return n.toLocaleString(locale(), { style: 'currency', currency: 'EUR' })
}

/** Il bollino rosso accanto al nome. */
export function BollinoDebito({ debito }: { debito: PersonaArea['debito'] }) {
  const p = usePalette()
  if (!debito) return null
  return (
    <View style={[stili.bollino, { backgroundColor: velo(p, 'errore', 0.16) }]} accessibilityLabel={t(`Pagamento in sospeso: ${soldi(debito.importo)}`, `Outstanding payment: ${soldi(debito.importo)}`)}>
      <Icona nome="attenzione" size={12} colore={p.errore} />
      <Text style={[stili.bollinoTesto, { color: p.errore }]}>{t(`Da saldare ${soldi(debito.importo)}`, `To pay ${soldi(debito.importo)}`)}</Text>
    </View>
  )
}

const stili = StyleSheet.create({
  bollino: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  bollinoTesto: { fontFamily: F.extra, fontSize: 11.5 },
})
