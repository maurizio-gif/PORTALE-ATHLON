import { StyleSheet, Text, View } from 'react-native'

import { impostaLingua, t, type Lingua } from '@/lib/lingua'
import { useLingua } from '@/lib/lingua-react'

import { F, FUOCO } from '../ui/tema'
import { Tocco } from '../ui/Tocco'

// La scelta della lingua nell'apertura dell'accesso (07/11/2026): la stessa di `ui/SceltaLingua.tsx` (due pillole, ognuna scritta nella sua
// lingua), ma chiara su scuro, perche' sta sopra la foto e sopra lo sfondo arancio, dove i colori della tavolozza non si leggono.
// **Serve qui e non solo nella pagina con l'email**: la lingua di partenza e' sempre l'italiano (`lib/lingua.ts`), quindi chi vuole l'inglese
// la deve poter cambiare gia' dalla prima schermata, senza toccare «Continua» per scoprirlo.

const VOCI: { lingua: Lingua; nome: string }[] = [
  { lingua: 'it', nome: 'Italiano' },
  { lingua: 'en', nome: 'English' },
]

/** `prima` parte un attimo prima del cambio: sul web la pagina si ricarica, e chi era gia' sulle bolle deve ritrovarcisi. */
export function SceltaLinguaApertura({ prima }: { prima?: () => void }) {
  const attuale = useLingua()
  return (
    <View style={stili.fila} accessibilityRole="radiogroup" accessibilityLabel={t('Lingua dell’app', 'App language')}>
      {VOCI.map((v) => {
        const scelta = v.lingua === attuale
        return (
          <Tocco
            key={v.lingua}
            ruolo="radio"
            etichetta={v.nome}
            stato={{ selected: scelta }}
            vibra={scelta ? null : 'scelta'}
            hitSlop={6}
            onPress={() => {
              if (scelta) return
              prima?.()
              impostaLingua(v.lingua)
            }}
            style={[stili.pillola, scelta ? stili.scelta : stili.altra]}
          >
            <Text style={[stili.testo, { color: scelta ? FUOCO[2] : '#FFFFFF' }]}>{v.nome}</Text>
          </Tocco>
        )
      })}
    </View>
  )
}

const stili = StyleSheet.create({
  fila: { flexDirection: 'row', gap: 6 },
  pillola: { minHeight: 34, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  scelta: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  altra: { backgroundColor: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.35)' },
  testo: { fontSize: 12.5, fontFamily: F.semi },
})
