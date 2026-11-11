import { StyleSheet, Text, View } from 'react-native'

import type { Ordine } from '@/api/shop'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { F, usePalette } from '../ui/tema'
import { codiceRitiro, daRitirare } from './ritiro'

// Il codice per il ritiro (11/11/2026): il **numero dell'ordine**, grande, da dire o da mostrare in segreteria. Prima c'era un QR (30/10/2026) pensato per un lettore da
// banco che il club non ha, e inquadrato con il telefono non dava niente (il testo non e' un indirizzo). La segreteria trova l'ordine nella scheda della persona
// («Da consegnare») o cercando il numero in Shop → «Cerca un ordine». Compare solo per un ordine pagato e con la merce pronta (`daRitirare`); a ritiro fatto sparisce da
// solo, perche' `consegnato_il` arriva dal CRM.

export function CodiceRitiro({ ordine }: { ordine: Ordine }) {
  const p = usePalette()
  if (!daRitirare(ordine)) return null
  const codice = codiceRitiro(ordine)
  if (!codice) return null
  return (
    <View style={[stili.scatola, { backgroundColor: p.incavo }]}>
      <Text style={[stili.etichetta, { color: p.testoSecondario }]}>{t('Codice ordine', 'Order code')}</Text>
      <Text
        style={[stili.codice, { color: p.testo }]}
        selectable
        accessibilityLabel={`${t('Codice ordine', 'Order code')} ${codice.split('').join(' ')}`}
      >
        {codice}
      </Text>
      <Text style={[stili.titolo, { color: p.testo }]}>{t('Dillo o mostralo in segreteria', 'Say it or show it at reception')}</Text>
    </View>
  )
}

const stili = StyleSheet.create({
  scatola: { alignItems: 'center', gap: spazio.uno, paddingVertical: spazio.quattro, paddingHorizontal: spazio.tre, borderRadius: 20 },
  etichetta: { fontFamily: F.semi, fontSize: 13.5 },
  codice: { fontFamily: F.extra, fontSize: 48, lineHeight: 56, letterSpacing: 1.5 },
  titolo: { fontFamily: F.bold, fontSize: 15, textAlign: 'center' },
})
