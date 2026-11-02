import { StyleSheet, Text, View } from 'react-native'
import { useWindowDimensions } from '@/lib/finestra'

import { impostaLingua, t, type Lingua } from '@/lib/lingua'
import { useLingua } from '@/lib/lingua-react'
import { impostaTema, useSchemaColori } from '@/lib/schemaColori'

import { Icona } from './Icona'
import { Tocco } from './Tocco'

// Il selettore della lingua nella testata della Home (27/10/2026, richiesta di Maurizio): due bandiere, una sola scelta.
// Sta fra la data e il campanello, sullo scuro della testata. Cambiare lingua ricarica l'app (`impostaLingua`).
// E' lo stesso comando della pagina d'accesso e del Profilo (`SceltaLingua`), in forma compatta.
//
// **Dentro la stessa pillola c'e' anche il tema** (02/11/2026, richiesta di Maurizio: «il chiaroscuro nella scheda iniziale, in maniera non troppo invadente»): un solo
// tondino, la luna col tema chiaro e il sole con quello scuro (l'icona dice dove si va), che porta all'altro. E' una scelta esplicita (`impostaTema`: vale ovunque, anche sul
// computer); **tornare ad «Automatico» si fa dal Profilo** (`SceltaTema`). Non toglie spazio al resto: la pillola cresce di una trentina di punti.

const VOCI: { lingua: Lingua; bandiera: string; nome: string }[] = [
  { lingua: 'it', bandiera: '🇮🇹', nome: 'Italiano' },
  { lingua: 'en', bandiera: '🇬🇧', nome: 'English' },
]

export function SelettoreBandiere({ conTema: permesso = true }: { conTema?: boolean }) {
  const attuale = useLingua()
  const scuro = useSchemaColori() === 'dark'
  // Sotto i 340 punti (i telefoni piu' piccoli), o se chi lo usa lo chiede (`permesso` falso), non c'e' un posto in piu': li' il tema si sceglie dal Profilo.
  const largo = useWindowDimensions().width >= 340
  const conTema = permesso && largo
  return (
    <View style={stili.fila}>
      <View style={stili.bandiere} accessibilityRole="radiogroup" accessibilityLabel={t('Lingua dell’app', 'App language')}>
      {VOCI.map((v) => {
        const scelta = v.lingua === attuale
        return (
          <Tocco
            key={v.lingua}
            ruolo="radio"
            etichetta={v.nome}
            stato={{ selected: scelta }}
            vibra={scelta ? null : 'scelta'}
            onPress={() => {
              if (!scelta) impostaLingua(v.lingua)
            }}
            style={[stili.bandiera, scelta && stili.scelta]}
          >
            <Text style={[stili.emoji, !scelta && { opacity: 0.45 }]}>{v.bandiera}</Text>
          </Tocco>
        )
      })}
      </View>
      {conTema ? <View style={stili.separatore} /> : null}
      {conTema ? <Tocco
        etichetta={scuro ? t('Passa al tema chiaro', 'Switch to the light theme') : t('Passa al tema scuro', 'Switch to the dark theme')}
        vibra="scelta"
        onPress={() => impostaTema(scuro ? 'chiaro' : 'scuro')}
        style={stili.bandiera}
      >
        <Icona nome={scuro ? 'sole' : 'luna'} size={16} colore="rgba(255,255,255,0.9)" />
      </Tocco> : null}
    </View>
  )
}

const stili = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 2, padding: 3, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  bandiere: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  bandiera: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  scelta: { backgroundColor: 'rgba(255,255,255,0.22)' },
  emoji: { fontSize: 17, lineHeight: 22 },
  separatore: { width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 2 },
})
