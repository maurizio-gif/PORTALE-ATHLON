import { useId, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native'

import { spazio } from '@/theme'

import { Icona, type NomeIcona } from './Icona'
import { F, usePalette } from './tema'

// I campi del laboratorio: l'etichetta piccola in maiuscoletto, il campo
// grigio tondo con l'icona, il bordo arancio quando ci si scrive. E il codice
// di sei cifre in caselle.

export function CampoTesto({
  etichetta,
  icona,
  errore = false,
  style,
  ...props
}: TextInputProps & { etichetta: string; icona?: NomeIcona; errore?: boolean }) {
  const p = usePalette()
  const id = useId()
  const [fuoco, setFuoco] = useState(false)
  return (
    <View style={{ gap: spazio.due }}>
      <Text style={[stili.etichetta, { color: p.testoSecondario }]} nativeID={id}>
        {etichetta.toUpperCase()}
      </Text>
      <View style={[stili.campo, { backgroundColor: p.incavo, borderColor: errore ? p.errore : fuoco ? p.accento : 'transparent' }]}>
        {icona ? <Icona nome={icona} size={19} colore={fuoco ? p.accento : p.testoTerzo} /> : null}
        <TextInput
          accessibilityLabelledBy={id}
          accessibilityLabel={etichetta}
          placeholderTextColor={p.testoTerzo}
          {...props}
          onFocus={(e) => {
            setFuoco(true)
            props.onFocus?.(e)
          }}
          onBlur={(e) => {
            setFuoco(false)
            props.onBlur?.(e)
          }}
          style={[stili.input, { color: p.testo }, style]}
        />
      </View>
    </View>
  )
}

const CIFRE = 6

/** Il codice in sei caselle; sotto c'e' un campo vero, trasparente, che riceve le cifre (e l'autocompletamento). */
export function CampoCodice({ value, onChange, onInvio, errore }: { value: string; onChange: (v: string) => void; onInvio: () => void; errore: boolean }) {
  const p = usePalette()
  const campo = useRef<TextInput>(null)
  const [fuoco, setFuoco] = useState(true)
  const caselle = Math.max(CIFRE, value.length)
  return (
    <Pressable onPress={() => campo.current?.focus()} style={{ gap: spazio.due }} accessible={false}>
      <Text style={[stili.etichetta, { color: p.testoSecondario }]}>CODICE</Text>
      <View style={stili.caselle}>
        {Array.from({ length: caselle }, (_, i) => {
          const cifra = value[i] ?? ''
          const qui = fuoco && i === Math.min(value.length, caselle - 1)
          return (
            <View
              key={i}
              style={[
                stili.casella,
                {
                  backgroundColor: cifra ? p.carta : p.incavo,
                  borderColor: errore ? p.errore : qui ? p.accento : cifra ? p.linea : 'transparent',
                  boxShadow: qui ? '0 0 0 4px rgba(255,87,1,0.15)' : undefined,
                },
              ]}
            >
              <Text style={[stili.cifra, { color: p.testo }]}>{cifra}</Text>
            </View>
          )
        })}
        <TextInput
          ref={campo}
          autoFocus
          accessibilityLabel="Codice di sei cifre"
          value={value}
          onChangeText={(v) => onChange(v.replace(/\D/g, '').slice(0, 10))}
          onSubmitEditing={onInvio}
          onFocus={() => setFuoco(true)}
          onBlur={() => setFuoco(false)}
          inputMode="numeric"
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          maxLength={10}
          caretHidden
          style={stili.invisibile}
        />
      </View>
    </Pressable>
  )
}

const stili = StyleSheet.create({
  etichetta: { fontSize: 11, fontFamily: F.extra, letterSpacing: 1.3 },
  campo: { flexDirection: 'row', alignItems: 'center', gap: spazio.due + 2, minHeight: 58, borderRadius: 18, borderWidth: 1.5, paddingHorizontal: spazio.tre },
  input: { flex: 1, fontSize: 17, minHeight: 52, fontFamily: F.semi, outlineStyle: 'none', minWidth: 0 } as object,
  caselle: { flexDirection: 'row', gap: spazio.due, position: 'relative' },
  casella: { flex: 1, maxWidth: 58, aspectRatio: 0.82, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  cifra: { fontSize: 28, fontFamily: F.extra, fontVariant: ['tabular-nums'] },
  invisibile: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.011, color: 'transparent', fontSize: 1 },
})
