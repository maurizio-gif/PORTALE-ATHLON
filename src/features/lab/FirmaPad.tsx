import { StyleSheet, Text, View } from 'react-native'

import { t } from '@/lib/lingua'

import { usePalette, F } from './ui/tema'

// Il campo firma sul telefono nativo non c'e' ancora: il portale e' una PWA e
// la firma si fa dal browser (FirmaPad.web.tsx). Qui si dice dove.
export function FirmaPad({ onCambia: _ }: { onCambia: (png: string | null) => void }) {
  const p = usePalette()
  return (
    <View style={[stili.avviso, { borderColor: p.linea, backgroundColor: p.incavo }]}>
      <Text style={{ color: p.testo, fontFamily: F.semi, fontSize: 14, lineHeight: 20 }}>
        {t('Per firmare il contratto apri il portale dal browser: app.athlonroma.it.', 'To sign the contract, open the portal in your browser: app.athlonroma.it.')}
      </Text>
    </View>
  )
}

const stili = StyleSheet.create({ avviso: { borderWidth: 1, borderRadius: 16, padding: 16 } })
