import { router } from 'expo-router'
import { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { gruppiJunior } from '@/api/junior'
import type { Area } from '@/api/lab'
import { spazio } from '@/theme'

import { CHIAVE_GRUPPI_JUNIOR } from '../junior/Junior'
import { precarica } from '../memoria'
import { Icona } from '../ui/Icona'
import { Carta, Entra } from '../ui/kit'
import { F, usePalette, velo } from '../ui/tema'

// L'ingresso alla sezione Junior dalla Home (21/10/2026, richiesta di Maurizio): i gruppi dei corsi per bambini e
// ragazzi con i posti liberi, per anno di nascita. Dopo lo Shop, per tutti: e' un elenco del club, non un dato di chi lo
// guarda. Se nel nucleo c'e' un figlio fra i 3 e i 17 anni, la schermata si apre gia' sul suo anno e la carta lo nomina.

/** Il figlio piu' giovane del nucleo in eta' da corsi junior (dai 3 ai 17 anni, contati sull'anno di nascita). */
function figlioJunior(area: Extract<Area, { trovato: true }>): { nome: string | null; anno: number } | null {
  const oggi = new Date().getFullYear()
  const figli = area.persone
    .filter((p) => !p.titolare && p.data_nascita)
    .map((p) => ({ nome: p.nome, anno: Number(p.data_nascita!.slice(0, 4)) }))
    .filter((f) => Number.isInteger(f.anno) && oggi - f.anno >= 3 && oggi - f.anno <= 17)
    .sort((a, b) => b.anno - a.anno)
  return figli[0] ?? null
}

export function CartaJunior({ area }: { area: Extract<Area, { trovato: true }> }) {
  const p = usePalette()
  const figlio = figlioJunior(area)
  useEffect(() => {
    precarica(CHIAVE_GRUPPI_JUNIOR, gruppiJunior)
  }, [])
  const nome = figlio?.nome ? figlio.nome.charAt(0).toUpperCase() + figlio.nome.slice(1).toLowerCase() : null
  const sotto = figlio
    ? `I gruppi dei corsi junior con i posti liberi: si apre sui nati nel ${figlio.anno}${nome ? `, come ${nome}` : ''}.`
    : 'I gruppi dei corsi per bambini e ragazzi, per anno di nascita, con i posti ancora liberi.'
  return (
    <Entra indice={2}>
      <Carta onPress={() => router.navigate(figlio ? { pathname: '/junior', params: { anno: String(figlio.anno) } } : '/junior')}>
        <View style={stili.riga} accessibilityRole="link" accessibilityLabel={`Junior. ${sotto}`}>
          <View style={[stili.bollino, { backgroundColor: velo(p, 'blu', p.scuro ? 0.22 : 0.14) }]}>
            <Icona nome="goccia" size={24} colore={p.blu} />
          </View>
          <View style={stili.testi}>
            <Text style={[stili.titolo, { color: p.testo }]}>Junior</Text>
            <Text style={[stili.sotto, { color: p.testoSecondario }]}>{sotto}</Text>
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
