import { Linking, StyleSheet, Text, View } from 'react-native'

import { CLUB_LEGALE } from '@/lib/club-legale'
import { spazio, useColori } from '@/theme'
import { t } from '@/lib/lingua'

// Chi siamo, per esteso, in fondo a ogni pagina dell'app (14/10/2026, scelta
// del club). La mette `Pagina`, quindi non c'e' da ricordarsene: le pagine che
// chiedono dati, una firma, una carta o un IBAN, aperte da un link in
// un'email, sono quelle che una persona prudente non compila se non sa di chi
// sono. Prima erano due componenti (questo e `DatiDelClub`), su meta' pagine.
export function IntestazioneLegale() {
  const c = useColori()
  const l = CLUB_LEGALE
  const link = { color: c.testoSecondario, textDecorationLine: 'underline' as const }
  return (
    <View style={[stili.riquadro, { borderColor: c.bordo, backgroundColor: c.superficie }]} accessibilityLabel={t(`${l.ragione}, ${l.indirizzo}, partita IVA ${l.piva}`, `${l.ragione}, ${l.indirizzo}, VAT number ${l.piva}`)}>
      <Text style={[stili.ragione, { color: c.testo }]}>{l.ragione}</Text>
      <Text style={[stili.riga, { color: c.testoSecondario }]}>
        {l.marchio} · {l.indirizzo} · {t('P.IVA', 'VAT no.')} {l.piva}
        {'\n'}PEC{' '}
        <Text style={link} onPress={() => Linking.openURL(`mailto:${l.pec}`)}>
          {l.pec}
        </Text>{' '}
        · Email{' '}
        <Text style={link} onPress={() => Linking.openURL(`mailto:${l.email}`)}>
          {l.email}
        </Text>
        {'\n'}
        <Text style={link} onPress={() => Linking.openURL(l.sito)}>
          athlonroma.it
        </Text>{' '}
        · {t('Affiliazioni', 'Affiliations')} {l.affiliazioni}
      </Text>
    </View>
  )
}

const stili = StyleSheet.create({
  riquadro: { borderWidth: 1, borderRadius: 10, paddingVertical: spazio.due, paddingHorizontal: spazio.tre, marginTop: spazio.cinque, gap: 2 },
  ragione: { fontSize: 12.5, fontWeight: '700' },
  riga: { fontSize: 12, lineHeight: 18 },
})
