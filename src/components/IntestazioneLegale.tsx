import { Linking, StyleSheet, Text, View } from 'react-native'

import { CLUB_LEGALE } from '@/lib/club-legale'
import { spazio, useColori } from '@/theme'

// Chi vende, per esteso, in cima a ogni pagina del Guest Pass (14/10/2026,
// scelta del club). `DatiDelClub` dice le stesse cose in fondo alle pagine del
// metodo di pagamento; qui stanno in testa perche' la procedura chiede dati,
// una firma e un pagamento fin dalla prima schermata, e chi la apre da
// un'email deve sapere subito con chi sta firmando.
export function IntestazioneLegale() {
  const c = useColori()
  const l = CLUB_LEGALE
  const link = { color: c.testoSecondario, textDecorationLine: 'underline' as const }
  return (
    <View style={[stili.riquadro, { borderColor: c.bordo, backgroundColor: c.superficie }]} accessibilityLabel={`${l.ragione}, ${l.indirizzo}, partita IVA ${l.piva}`}>
      <Text style={[stili.ragione, { color: c.testo }]}>{l.ragione}</Text>
      <Text style={[stili.riga, { color: c.testoSecondario }]}>
        {l.marchio} · {l.indirizzo} · P.IVA {l.piva}
        {'\n'}PEC{' '}
        <Text style={link} onPress={() => Linking.openURL(`mailto:${l.pec}`)}>
          {l.pec}
        </Text>{' '}
        · Email{' '}
        <Text style={link} onPress={() => Linking.openURL(`mailto:${l.email}`)}>
          {l.email}
        </Text>
        {'\n'}Affiliazioni {l.affiliazioni}
      </Text>
    </View>
  )
}

const stili = StyleSheet.create({
  riquadro: { borderWidth: 1, borderRadius: 10, paddingVertical: spazio.due, paddingHorizontal: spazio.tre, marginBottom: spazio.quattro, gap: 2 },
  ragione: { fontSize: 12.5, fontWeight: '700' },
  riga: { fontSize: 12, lineHeight: 18 },
})
