import { StyleSheet, Text, View } from 'react-native'

import type { Ordine } from '@/api/shop'
import { CodiceQr } from '@/components/CodiceQr'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { F, usePalette } from '../ui/tema'
import { codiceBreve, daRitirare, testoRitiro } from './ritiro'

// Il codice per il ritiro: un QR da mostrare in segreteria e, sotto, le otto lettere da dettare se il lettore non lo legge. Compare solo per un ordine
// pagato e non ancora ritirato (`daRitirare`); a ritiro fatto sparisce da solo, perche' `consegnato_il` arriva dal CRM.

export function CodiceRitiro({ ordine, size = 168 }: { ordine: Ordine; size?: number }) {
  const p = usePalette()
  if (!daRitirare(ordine)) return null
  const breve = codiceBreve(ordine.ordine_id)
  return (
    <View style={[stili.scatola, { backgroundColor: p.incavo }]}>
      <CodiceQr testo={testoRitiro(ordine.ordine_id)} size={size} etichetta={t('Codice QR per il ritiro in segreteria', 'QR code for pick-up at reception')} />
      <View style={{ alignItems: 'center', gap: 2 }}>
        <Text style={[stili.titolo, { color: p.testo }]}>{t('Mostralo in segreteria', 'Show it at reception')}</Text>
        {breve ? (
          <Text style={[stili.breve, { color: p.testoSecondario }]} selectable accessibilityLabel={`${t('Codice ordine', 'Order code')} ${breve.split('').join(' ')}`}>
            {t('Codice ordine', 'Order code')} <Text style={{ color: p.testo, fontFamily: F.extra, letterSpacing: 1.5 }}>{breve}</Text>
          </Text>
        ) : null}
      </View>
    </View>
  )
}

const stili = StyleSheet.create({
  scatola: { alignItems: 'center', gap: spazio.tre, paddingVertical: spazio.quattro, borderRadius: 20 },
  titolo: { fontFamily: F.bold, fontSize: 15 },
  breve: { fontFamily: F.semi, fontSize: 13.5 },
})
