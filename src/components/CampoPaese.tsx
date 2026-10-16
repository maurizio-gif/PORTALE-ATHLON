import { useMemo, useState } from 'react'
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { F, usePalette } from '@/features/lab/ui/tema'
import { nomePaese, PAESI_CON_ITALIA } from '@/lib/residenteEstero'
import { PAESI } from '@/lib/paesi'
import { spazio } from '@/theme'

// La tendina del Paese, per chi e' residente all'estero (e per l'indirizzo del
// profilo). Una tendina vera, non l'elenco nativo del browser: i Paesi sono
// duecentocinquanta e dal telefono si cerca scrivendo, non scorrendo. Il campo
// si tocca, si apre un foglio con la ricerca in alto e l'elenco sotto.
// `variante` sceglie il vestito: «base» come `Campo` (modulo del Guest Pass),
// «lab» come `CampoTesto` (laboratorio).

const minuscolo = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

export function CampoPaese({
  value,
  onChange,
  etichetta = 'Paese',
  conItalia = false,
  errore = false,
  variante = 'base',
  style,
}: {
  /** Il codice ISO del Paese scelto, o '' se non ne e' stato scelto nessuno. */
  value: string
  onChange: (codice: string) => void
  etichetta?: string
  /** L'Italia in cima all'elenco: per un indirizzo si', per «residente all'estero» no. */
  conItalia?: boolean
  errore?: boolean
  variante?: 'base' | 'lab'
  /** Come per `Campo`: sovrascrive il riquadro (il Guest Pass gli da' lo sfondo della pagina). */
  style?: StyleProp<ViewStyle>
}) {
  const p = usePalette()
  const ins = useSafeAreaInsets()
  const lab = variante === 'lab'
  const [aperto, setAperto] = useState(false)
  const [cerca, setCerca] = useState('')
  const elenco = conItalia ? PAESI_CON_ITALIA : PAESI
  const trovati = useMemo(() => {
    const q = minuscolo(cerca.trim())
    return q ? elenco.filter(([, nome]) => minuscolo(nome).includes(q)) : elenco
  }, [cerca, elenco])
  const nome = nomePaese(value)

  function chiudi() {
    setAperto(false)
    setCerca('')
  }

  return (
    <View style={stili.campo}>
      <Text style={lab ? [stili.etichettaLab, { color: p.testoSecondario }] : [stili.etichetta, { color: p.testo }]}>
        {lab ? etichetta.toUpperCase() : etichetta}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${etichetta}: ${nome ?? 'nessuno scelto'}`}
        accessibilityState={{ expanded: aperto }}
        onPress={() => setAperto(true)}
        style={[
          lab
            ? [stili.riquadroLab, { backgroundColor: p.incavo, borderColor: errore ? p.errore : 'transparent' }]
            : [stili.riquadro, { borderColor: errore ? p.errore : p.bordo, backgroundColor: p.superficie }],
          style,
        ]}
      >
        <Text numberOfLines={1} style={[lab ? stili.valoreLab : stili.valore, { color: nome ? p.testo : lab ? p.testoTerzo : p.testoSecondario }]}>
          {nome ?? 'Scegli il Paese'}
        </Text>
        <Text style={{ color: p.testoSecondario, fontSize: 14 }}>▾</Text>
      </Pressable>

      <Modal visible={aperto} transparent animationType="slide" onRequestClose={chiudi}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={stili.velo}>
          <Pressable style={StyleSheet.absoluteFill} onPress={chiudi} accessibilityLabel="Chiudi" />
          <View style={[stili.foglio, { backgroundColor: lab ? p.carta : p.sfondo, paddingBottom: ins.bottom + spazio.tre }]} accessibilityViewIsModal>
            <View style={[stili.maniglia, { backgroundColor: lab ? p.incavo : p.bordo }]} />
            <View style={stili.testa}>
              <Text style={[stili.titolo, { color: p.testo, fontFamily: lab ? F.extra : undefined }]} accessibilityRole="header">
                {etichetta}
              </Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Chiudi" onPress={chiudi} hitSlop={8} style={[stili.chiudi, { backgroundColor: lab ? p.incavo : p.superficie }]}>
                <Text style={{ color: p.testo, fontSize: 16, fontWeight: '700' }}>✕</Text>
              </Pressable>
            </View>
            <TextInput
              accessibilityLabel="Cerca il Paese"
              placeholder="Cerca il Paese"
              placeholderTextColor={p.testoSecondario}
              value={cerca}
              onChangeText={setCerca}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              style={[stili.cerca, { color: p.testo, borderColor: p.bordo, backgroundColor: lab ? p.incavo : p.superficie }]}
            />
            <FlatList
              data={trovati}
              keyExtractor={([codice]) => codice}
              keyboardShouldPersistTaps="handled"
              style={stili.elenco}
              initialNumToRender={20}
              ListEmptyComponent={<Text style={{ color: p.testoSecondario, fontSize: 15, padding: spazio.tre }}>Nessun Paese trovato.</Text>}
              renderItem={({ item: [codice, nomeVoce] }) => {
                const scelto = codice === value
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: scelto }}
                    accessibilityLabel={nomeVoce}
                    onPress={() => {
                      onChange(codice)
                      chiudi()
                    }}
                    style={({ pressed }) => [stili.voce, { borderBottomColor: p.bordo, backgroundColor: pressed ? p.superficie : 'transparent' }]}
                  >
                    <Text style={{ color: scelto ? p.accento : p.testo, fontSize: 16, fontWeight: scelto ? '700' : '500', flex: 1 }}>{nomeVoce}</Text>
                    {scelto ? <Text style={{ color: p.accento, fontWeight: '800' }}>✓</Text> : null}
                  </Pressable>
                )
              }}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const stili = StyleSheet.create({
  campo: { gap: spazio.due },
  etichetta: { fontSize: 15, fontWeight: '600' },
  etichettaLab: { fontSize: 11, fontFamily: F.extra, letterSpacing: 1.3 },
  riquadro: { minHeight: 50, borderWidth: 1, borderRadius: 10, paddingHorizontal: spazio.tre, flexDirection: 'row', alignItems: 'center', gap: spazio.due },
  riquadroLab: { minHeight: 58, borderWidth: 1.5, borderRadius: 18, paddingHorizontal: spazio.tre, flexDirection: 'row', alignItems: 'center', gap: spazio.due },
  valore: { flex: 1, fontSize: 16 },
  valoreLab: { flex: 1, fontSize: 17, fontFamily: F.semi },
  velo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end', alignItems: 'center' },
  foglio: { width: '100%', maxWidth: 560, height: '82%', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: spazio.tre },
  maniglia: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginTop: 10, marginBottom: 6 },
  testa: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spazio.due },
  titolo: { fontSize: 22, fontWeight: '800' },
  chiudi: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cerca: { minHeight: 50, borderWidth: 1, borderRadius: 14, paddingHorizontal: spazio.tre, fontSize: 16, marginBottom: spazio.due },
  elenco: { flex: 1 },
  voce: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spazio.due, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: spazio.uno },
})
