import { useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'

import { spazio, useColori } from '@/theme'

// «Adyen» nel testo della carta, con una (i) che apre due righe su chi e'.
// Chi sta per scrivere la carta su una pagina che non e' la nostra deve poter
// sapere di chi e' senza uscire a cercarlo. Una finestra e non un tooltip,
// perche' dal telefono il passaggio del mouse non esiste.
export function InfoAdyen() {
  const c = useColori()
  const [aperta, setAperta] = useState(false)
  return (
    <>
      <Text
        accessibilityRole="button"
        accessibilityHint="Apre due righe su chi è Adyen"
        onPress={() => setAperta(true)}
        style={[stili.nome, { color: c.testo }]}
      >
        Adyen ⓘ
      </Text>
      <Modal visible={aperta} transparent animationType="fade" onRequestClose={() => setAperta(false)}>
        <Pressable style={stili.velo} onPress={() => setAperta(false)} accessibilityLabel="Chiudi">
          <Pressable style={[stili.finestra, { backgroundColor: c.sfondo }]} onPress={() => {}} accessibilityViewIsModal>
            <View style={stili.testa}>
              <Text style={[stili.titolo, { color: c.testo }]} accessibilityRole="header">
                Chi è Adyen
              </Text>
              <Pressable onPress={() => setAperta(false)} accessibilityRole="button" accessibilityLabel="Chiudi" hitSlop={12}>
                <Text style={[stili.chiudi, { color: c.testo }]}>×</Text>
              </Pressable>
            </View>
            <Text style={[stili.paragrafo, { color: c.testo }]}>
              Adyen è la società che gestisce per il club i pagamenti con carta. È una piattaforma di pagamento europea, con sede nei
              Paesi Bassi, quotata in borsa e con licenza bancaria europea: la usano molte delle più grandi aziende del mondo per
              incassare con carta online e nei negozi.
            </Text>
            <Text style={[stili.paragrafo, { color: c.testo }]}>
              La carta la scrivi sulla pagina protetta di Adyen, che la custodisce secondo lo standard di sicurezza dei circuiti delle
              carte (PCI DSS, al livello più alto). Il club non vede mai il numero completo né il codice di sicurezza: riceve solo un
              riferimento per addebitare le quote.
            </Text>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

const stili = StyleSheet.create({
  nome: { fontWeight: '700', textDecorationLine: 'underline', textDecorationStyle: 'dotted' },
  velo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: spazio.tre },
  finestra: { width: '100%', maxWidth: 380, borderRadius: 14, padding: spazio.quattro - 4, gap: spazio.due + 2 },
  testa: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titolo: { fontSize: 17, fontWeight: '700' },
  chiudi: { fontSize: 24, lineHeight: 26 },
  paragrafo: { fontSize: 14, lineHeight: 21 },
})
