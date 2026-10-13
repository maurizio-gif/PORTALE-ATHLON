import { useId } from 'react'
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native'

import { spazio, useColori } from '@/theme'

// Un campo con la sua etichetta sopra, collegata per gli screen reader.
export function Campo({ etichetta, errore = false, style, ...props }: TextInputProps & { etichetta: string; errore?: boolean }) {
  const c = useColori()
  const id = useId()
  return (
    <View style={stili.campo}>
      <Text nativeID={id} style={[stili.etichetta, { color: c.testo }]}>
        {etichetta}
      </Text>
      <TextInput
        accessibilityLabelledBy={id}
        accessibilityLabel={etichetta}
        placeholderTextColor={c.testoSecondario}
        style={[stili.input, { color: c.testo, borderColor: errore ? c.errore : c.bordo, backgroundColor: c.superficie }, style]}
        {...props}
      />
    </View>
  )
}

const stili = StyleSheet.create({
  campo: { gap: spazio.due, flex: 1 },
  etichetta: { fontSize: 15, fontWeight: '600' },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 10, paddingHorizontal: spazio.tre, fontSize: 16 },
})
