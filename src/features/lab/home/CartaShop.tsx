import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'

import { spazio } from '@/theme'
import { t } from '@/lib/lingua'

import { Icona } from '../ui/Icona'
import { Carta, Entra } from '../ui/kit'
import { F, FUOCO, usePalette } from '../ui/tema'

// L'ingresso allo Shop dalla Home (19/10/2026, richiesta del club: lo shop era una carta dentro la sezione Prodotti, che
// quasi nessuno apre). Sta fra «Da fare» e i riquadri, fuori da ogni sezione, ed e' **l'unico ingresso**: una voce nella
// barra delle schede c'e' stata per qualche minuto e il club l'ha tolta. Non dice niente che dipenda dai dati (nessun
// conteggio di articoli): se la vetrina e' vuota lo dice la vetrina.

export function CartaShop() {
  const p = usePalette()
  return (
    <Entra indice={2}>
      <Carta onPress={() => router.navigate('/shop')}>
        <View style={stili.riga} accessibilityRole="link" accessibilityLabel={t('Shop. Articoli e merchandising del club: paghi online, ritiri in segreteria.', 'Shop. Club items and merchandise: pay online, pick up at the front desk.')}>
          <LinearGradient colors={FUOCO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.bollino}>
            <Icona nome="sacchetto" size={24} colore="#fff" />
          </LinearGradient>
          <View style={stili.testi}>
            <Text style={[stili.titolo, { color: p.testo }]}>Shop</Text>
            <Text style={[stili.sotto, { color: p.testoSecondario }]}>{t('Articoli e merchandising del club. Paghi online, ritiri in segreteria.', 'Club items and merchandise. Pay online, pick up at the front desk.')}</Text>
          </View>
          <Icona nome="avanti" size={18} colore={p.testoTerzo} />
        </View>
      </Carta>
    </Entra>
  )
}

const stili = StyleSheet.create({
  riga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  bollino: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  testi: { flex: 1, gap: 3 },
  titolo: { fontFamily: F.extra, fontSize: 20, lineHeight: 24, letterSpacing: -0.5 },
  sotto: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
})
