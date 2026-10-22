import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { spazio } from '@/theme'

import { Icona } from '../ui/Icona'
import { F, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'

// I pezzi del questionario a passi (`PassiSala.tsx`): la carta di una risposta, con il cerchio a destra (vuoto, o con la spunta), e la
// griglia a due colonne per le risposte corte (i tre test). Una risposta unica ha `ruolo="radio"`, una multipla `checkbox`.

export function OpzioneCarta({
  testo,
  nota,
  etichetta,
  attivo,
  multipla = false,
  onPress,
  compatta = false,
}: {
  testo: string
  nota?: string
  /** Una riga piccola in arancio sopra al testo («Consigliato», «Stimato dalle tue risposte»). */
  etichetta?: string
  attivo: boolean
  multipla?: boolean
  onPress: () => void
  /** Per la griglia: il testo al centro, senza il cerchio. */
  compatta?: boolean
}) {
  const p = usePalette()
  return (
    <Tocco
      vibra="scelta"
      ruolo={multipla ? 'checkbox' : 'radio'}
      stato={{ selected: attivo, checked: attivo }}
      onPress={onPress}
      etichetta={etichetta ? `${testo}, ${etichetta}` : testo}
      style={[stili.carta, compatta && stili.compatta, { backgroundColor: p.carta, borderColor: attivo ? p.accento : p.linea, borderWidth: attivo ? 2 : StyleSheet.hairlineWidth }]}
    >
      <View style={[stili.riga, compatta && { justifyContent: 'center' }]}>
        <View style={compatta ? undefined : { flex: 1, gap: 2 }}>
          {etichetta ? <Text style={[stili.etichetta, { color: p.accento }, compatta && { textAlign: 'center' }]}>{etichetta.toUpperCase()}</Text> : null}
          <Text style={[stili.testo, { color: p.testo }, compatta && { textAlign: 'center' }]}>{testo}</Text>
          {nota ? <Text style={[stili.nota, { color: p.testoSecondario }]}>{nota}</Text> : null}
        </View>
        {compatta ? null : (
          <View style={[stili.cerchio, attivo ? { backgroundColor: p.accento, borderColor: p.accento } : { borderColor: p.testoTerzo }, !multipla && { borderRadius: 13 }]}>
            {attivo ? <Icona nome="spunta" size={14} colore="#fff" /> : null}
          </View>
        )}
      </View>
    </Tocco>
  )
}

/** Le risposte corte, a due colonne. */
export function Griglia({ children }: { children: ReactNode }) {
  return <View style={stili.griglia}>{children}</View>
}

const stili = StyleSheet.create({
  carta: { borderRadius: 20, paddingVertical: spazio.tre, paddingHorizontal: spazio.tre + 2, minHeight: 64, justifyContent: 'center' },
  compatta: { flexBasis: '47%', flexGrow: 1, minHeight: 86, alignItems: 'center' },
  riga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  etichetta: { fontFamily: F.extra, fontSize: 11, letterSpacing: 0.6 },
  testo: { fontFamily: F.extra, fontSize: 16, letterSpacing: -0.2 },
  nota: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 18 },
  cerchio: { width: 26, height: 26, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  griglia: { flexDirection: 'row', flexWrap: 'wrap', gap: spazio.due + 2 },
})
