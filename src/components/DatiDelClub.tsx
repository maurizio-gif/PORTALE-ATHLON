import { Linking, StyleSheet, Text, View } from 'react-native'

import { CLUB_LEGALE } from '@/lib/club-legale'
import { spazio, useColori } from '@/theme'

// Chi chiede il pagamento, per esteso, in fondo a ogni pagina che chiede un
// IBAN o una carta. Una pagina cosi', aperta da un link in un'email, e'
// esattamente quella che una persona prudente non compila se non sa di chi
// e': ragione sociale, partita IVA, sede e PEC devono essere qui.
export function DatiDelClub() {
  const c = useColori()
  const l = CLUB_LEGALE
  const link = { color: c.testoSecondario, textDecorationLine: 'underline' as const }
  return (
    <View style={stili.piede}>
      <Text style={[stili.ragione, { color: c.testo }]}>
        {l.ragione} · {l.marchio}
      </Text>
      <Text style={[stili.riga, { color: c.testoSecondario }]}>
        {l.indirizzo} · P.IVA {l.piva}
        {'\n'}Email{' '}
        <Text style={link} onPress={() => Linking.openURL(`mailto:${l.email}`)}>
          {l.email}
        </Text>{' '}
        · PEC{' '}
        <Text style={link} onPress={() => Linking.openURL(`mailto:${l.pec}`)}>
          {l.pec}
        </Text>
        {'\n'}
        <Text style={link} onPress={() => Linking.openURL(l.sito)}>
          athlonroma.it
        </Text>{' '}
        · Affiliazioni {l.affiliazioni}
      </Text>
    </View>
  )
}

const stili = StyleSheet.create({
  piede: { marginTop: spazio.cinque, gap: spazio.uno },
  ragione: { fontSize: 12.5, fontWeight: '600', textAlign: 'center' },
  riga: { fontSize: 12.5, lineHeight: 20, textAlign: 'center' },
})
