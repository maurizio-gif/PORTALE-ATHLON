import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native'

import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { Icona } from '../ui/Icona'
import { Cerchi, Grappolo } from './Emoji'
import { Entra, Sezione } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { TEMI, type Tema } from './temi'

// «Capire il cibo» nell'area Food (01/11/2026): le sei letture come tessere, TUTTE in vista (niente fila da
// scorrere: i filtri del Calendario in fila non si vedevano, i tester l'hanno detto). Sono cultura alimentare
// generale, senza dati personali: si vedono anche prima del consenso all'informativa di Food.

const apri = (tema: Tema) => router.push({ pathname: '/allenamento/cultura', params: { tema: tema.id } })

export function CulturaCibo({ indiceBase = 0 }: { indiceBase?: number }) {
  const p = usePalette()
  const { width } = useWindowDimensions()
  const larghezza: `${number}%` = width >= 760 ? '32%' : '48.5%'
  return (
    <Sezione titolo={t('Capire il cibo', 'Understand food')}>
      <Text style={[stili.nota, { color: p.testoSecondario, paddingHorizontal: 2 }]}>
        {t('Sei letture brevi su come funziona l’alimentazione: cultura, non diete.', 'Six short readings on how nutrition works: culture, not diets.')}
      </Text>
      <View style={stili.griglia}>
        {TEMI.map((x, i) => (
          <Entra key={x.id} indice={indiceBase + i} style={{ width: larghezza }}>
            <Tessera tema={x} />
          </Entra>
        ))}
      </View>
    </Sezione>
  )
}

function Tessera({ tema }: { tema: Tema }) {
  return (
    <Tocco onPress={() => apri(tema)} etichetta={t(`${tema.titolo}, ${tema.minuti} minuti di lettura`, `${tema.titolo}, ${tema.minuti} minute read`)} scala={0.97}>
      <LinearGradient colors={tema.colori} start={{ x: 0, y: 0 }} end={{ x: 0.55, y: 1 }} style={[stili.tessera, { boxShadow: '0 10px 22px rgba(0,0,0,0.16)' }]}>
        <Cerchi />
        <View pointerEvents="none" style={stili.grappolo}>
          <Grappolo emoji={tema.emoji} scala={0.62} />
        </View>
        <View style={stili.bollo}>
          <Icona nome={tema.icona} size={19} colore="#fff" />
        </View>
        <View style={{ gap: 3 }}>
          <Text style={stili.titolo} numberOfLines={3}>
            {tema.titolo}
          </Text>
          <Text style={stili.minuti}>{t(`${tema.minuti} min`, `${tema.minuti} min`)}</Text>
        </View>
      </LinearGradient>
    </Tocco>
  )
}

const stili = StyleSheet.create({
  nota: { fontFamily: F.medio, fontSize: 14, lineHeight: 20, marginTop: -6 },
  griglia: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spazio.tre - 4 },
  tessera: { minHeight: 156, borderRadius: 26, padding: spazio.tre - 2, justifyContent: 'space-between', overflow: 'hidden' },
  grappolo: { position: 'absolute', right: 8, top: 8 },
  bollo: { width: 36, height: 36, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  titolo: { color: '#fff', fontFamily: F.extra, fontSize: 16.5, lineHeight: 20, letterSpacing: -0.4 },
  minuti: { color: 'rgba(255,255,255,0.85)', fontFamily: F.bold, fontSize: 12 },
})
