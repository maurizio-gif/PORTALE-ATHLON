import { useEffect, useId, useMemo, useState } from 'react'
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { dividiTelefono, PREFISSO, unisciTelefono, VOCI_PREFISSO } from '@/lib/prefissi'
import { spazio, useColori } from '@/theme'
import { t } from '@/lib/lingua'

// Il cellulare in due pezzi (richiesta di Maurizio, 21/10/2026): a sinistra la tendina del
// prefisso internazionale, gia' su +39, e a destra il numero. Il valore che esce e' uno solo,
// «+39 3401234567» senza spazi, come lo legge `telefonoDa` delle funzioni. La tendina e' un
// foglio con la ricerca, come `CampoPaese`: i prefissi sono piu' di duecento.

const minuscolo = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

export function CampoTelefono({
  value,
  onChange,
  etichetta = t('Cellulare', 'Mobile'),
  errore = false,
  sfondo,
}: {
  value: string
  onChange: (telefono: string) => void
  etichetta?: string
  errore?: boolean
  /** Lo sfondo dei due riquadri (il Guest Pass da' quello della pagina). */
  sfondo?: string
}) {
  const c = useColori()
  const ins = useSafeAreaInsets()
  const id = useId()
  const iniziale = dividiTelefono(value)
  const [paese, setPaese] = useState(iniziale.paese)
  const [numero, setNumero] = useState(iniziale.numero)
  const [aperto, setAperto] = useState(false)
  const [cerca, setCerca] = useState('')

  // Un valore che arriva da fuori (la pagina che si ricarica) rimette i due pezzi.
  useEffect(() => {
    if (value !== unisciTelefono(paese, numero)) {
      const d = dividiTelefono(value)
      setPaese(d.paese)
      setNumero(d.numero)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const trovati = useMemo(() => {
    const q = minuscolo(cerca.trim()).replace(/^\+/, '')
    if (!q) return VOCI_PREFISSO
    return VOCI_PREFISSO.filter(([, nome, pref]) => minuscolo(nome).includes(q) || pref.startsWith(q))
  }, [cerca])

  function chiudi() {
    setAperto(false)
    setCerca('')
  }

  return (
    <View style={stili.campo}>
      <Text nativeID={id} style={[stili.etichetta, { color: c.testo }]}>
        {etichetta}
      </Text>
      <View style={stili.riga}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('Prefisso', 'Country code')}: +${PREFISSO[paese] ?? '39'}`}
          accessibilityState={{ expanded: aperto }}
          onPress={() => setAperto(true)}
          style={[stili.riquadro, stili.prefisso, { borderColor: errore ? c.errore : c.bordo, backgroundColor: sfondo ?? c.superficie }]}
        >
          <Text style={{ color: c.testo, fontSize: 16, fontWeight: '600' }}>+{PREFISSO[paese] ?? '39'}</Text>
          <Text style={{ color: c.testoSecondario, fontSize: 14 }}>▾</Text>
        </Pressable>
        <TextInput
          accessibilityLabelledBy={id}
          accessibilityLabel={etichetta}
          value={numero}
          onChangeText={(v) => {
            // Chi incolla «+44 …» o «0039 …» nel numero: il prefisso va nella tendina.
            if (/^\s*(\+|00)/.test(v)) {
              const d = dividiTelefono(v)
              setPaese(d.paese)
              setNumero(d.numero)
              onChange(unisciTelefono(d.paese, d.numero))
              return
            }
            const n = v.replace(/[^0-9 ]/g, '')
            setNumero(n)
            onChange(unisciTelefono(paese, n))
          }}
          keyboardType="phone-pad"
          autoComplete="tel-national"
          placeholder={paese === 'IT' ? '340 123 4567' : t('Numero', 'Number')}
          placeholderTextColor={c.testoSecondario}
          style={[stili.riquadro, stili.numero, { color: c.testo, borderColor: errore ? c.errore : c.bordo, backgroundColor: sfondo ?? c.superficie }]}
        />
      </View>

      <Modal visible={aperto} transparent animationType="slide" onRequestClose={chiudi}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={stili.velo}>
          <Pressable style={StyleSheet.absoluteFill} onPress={chiudi} accessibilityLabel={t('Chiudi', 'Close')} />
          <View style={[stili.foglio, { backgroundColor: c.sfondo, paddingBottom: ins.bottom + spazio.tre }]} accessibilityViewIsModal>
            <View style={[stili.maniglia, { backgroundColor: c.bordo }]} />
            <View style={stili.testa}>
              <Text style={[stili.titolo, { color: c.testo }]} accessibilityRole="header">
                {t('Prefisso', 'Country code')}
              </Text>
              <Pressable accessibilityRole="button" accessibilityLabel={t('Chiudi', 'Close')} onPress={chiudi} hitSlop={8} style={[stili.chiudi, { backgroundColor: c.superficie }]}>
                <Text style={{ color: c.testo, fontSize: 16, fontWeight: '700' }}>✕</Text>
              </Pressable>
            </View>
            <TextInput
              accessibilityLabel={t('Cerca il Paese o il prefisso', 'Search for the country or code')}
              placeholder={t('Cerca il Paese o il prefisso', 'Search for the country or code')}
              placeholderTextColor={c.testoSecondario}
              value={cerca}
              onChangeText={setCerca}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              style={[stili.cerca, { color: c.testo, borderColor: c.bordo, backgroundColor: c.superficie }]}
            />
            <FlatList
              data={trovati}
              keyExtractor={([codice]) => codice}
              keyboardShouldPersistTaps="handled"
              style={stili.elenco}
              initialNumToRender={20}
              ListEmptyComponent={<Text style={{ color: c.testoSecondario, fontSize: 15, padding: spazio.tre }}>{t('Nessun prefisso trovato.', 'No country code found.')}</Text>}
              renderItem={({ item: [codice, nome, pref] }) => {
                const scelto = codice === paese
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: scelto }}
                    accessibilityLabel={`${nome}, +${pref}`}
                    onPress={() => {
                      setPaese(codice)
                      onChange(unisciTelefono(codice, numero))
                      chiudi()
                    }}
                    style={({ pressed }) => [stili.voce, { borderBottomColor: c.bordo, backgroundColor: pressed ? c.superficie : 'transparent' }]}
                  >
                    <Text style={{ color: scelto ? c.accento : c.testo, fontSize: 16, fontWeight: scelto ? '700' : '500', flex: 1 }}>{nome}</Text>
                    <Text style={{ color: scelto ? c.accento : c.testoSecondario, fontSize: 16, fontWeight: '600' }}>+{pref}</Text>
                    {scelto ? <Text style={{ color: c.accento, fontWeight: '800' }}>✓</Text> : null}
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
  campo: { gap: spazio.due, flex: 1 },
  etichetta: { fontSize: 15, fontWeight: '600' },
  riga: { flexDirection: 'row', gap: spazio.due },
  riquadro: { minHeight: 50, borderWidth: 1, borderRadius: 10, paddingHorizontal: spazio.tre },
  prefisso: { flexDirection: 'row', alignItems: 'center', gap: spazio.uno, flexShrink: 0 },
  numero: { flex: 1, minWidth: 0, fontSize: 16 },
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
