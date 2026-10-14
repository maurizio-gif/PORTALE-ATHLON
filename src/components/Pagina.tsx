import { Image } from 'expo-image'
import { Link } from 'expo-router'
import type { ReactNode } from 'react'
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { IntestazioneLegale } from '@/components/IntestazioneLegale'
import { spazio, useColori } from '@/theme'

// La cornice di ogni schermata: logo, titolo, contenuto. Sul telefono la
// colonna e' lo schermo; su uno schermo largo si allarga: un po' per le pagine
// di testo e moduli, molto per quelle `larga` (calendario, area, pagamenti),
// che dispongono le schede su piu' colonne (Griglia).

/** Oltre questa larghezza si e' su un computer (o un tablet di traverso). */
export const LARGO = 900

export function Pagina({
  titolo,
  sottotitolo,
  indietro = true,
  larga = false,
  piede,
  legale = false,
  children,
}: {
  titolo: string
  sottotitolo?: string
  /** Il link «‹ Inizio» in alto; spento sulla home. */
  indietro?: boolean
  /** Su schermo largo usa tutta la larghezza utile, non solo una colonna da leggere. */
  larga?: boolean
  /** Sotto il contenuto, fuori dal flusso dei paragrafi: i dati del club. */
  piede?: ReactNode
  /** Sotto il marchio, chi vende per esteso: le pagine del Guest Pass. */
  legale?: boolean
  children: ReactNode
}) {
  const c = useColori()
  const { width } = useWindowDimensions()
  const maxWidth = width < LARGO ? 560 : larga ? 1180 : 720
  return (
    <SafeAreaView style={[stili.fondo, { backgroundColor: c.sfondo }]}>
      <ScrollView contentContainerStyle={stili.scorrimento} keyboardShouldPersistTaps="handled">
        <View style={[stili.colonna, { maxWidth }]}>
          <View style={stili.marchio}>
            <Image source={require('@/../assets/images/pittogramma.png')} style={stili.pittogramma} contentFit="contain" />
            <Text style={[stili.nomeClub, { color: c.testo }]}>Athlon Club</Text>
            {indietro ? (
              <Link href="/" style={[stili.indietro, { color: c.accento }]}>
                ‹ Inizio
              </Link>
            ) : null}
          </View>
          {legale ? <IntestazioneLegale /> : null}
          <Text style={[stili.titolo, { color: c.testo }]} accessibilityRole="header">
            {titolo}
          </Text>
          {sottotitolo ? <Text style={[stili.sottotitolo, { color: c.testoSecondario }]}>{sottotitolo}</Text> : null}
          <View style={stili.contenuto}>{children}</View>
          {piede}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const stili = StyleSheet.create({
  fondo: { flex: 1 },
  scorrimento: { flexGrow: 1, paddingHorizontal: spazio.tre, paddingVertical: spazio.quattro },
  colonna: { width: '100%', alignSelf: 'center' },
  marchio: { flexDirection: 'row', alignItems: 'center', gap: spazio.due, marginBottom: spazio.cinque },
  pittogramma: { width: 32, height: 26 },
  nomeClub: { fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },
  indietro: { marginLeft: 'auto', fontSize: 15, fontWeight: '600' },
  titolo: { fontSize: 26, fontWeight: '700', lineHeight: 32 },
  sottotitolo: { fontSize: 16, lineHeight: 23, marginTop: spazio.due },
  contenuto: { marginTop: spazio.quattro, gap: spazio.tre },
})
