import { router } from 'expo-router'
import { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { gruppiJunior } from '@/api/junior'
import type { Area } from '@/api/lab'
import { spazio } from '@/theme'
import { t } from '@/lib/lingua'

import { CHIAVE_GRUPPI_JUNIOR } from '../junior/Junior'
import { precarica } from '../memoria'
import { Icona } from '../ui/Icona'
import { Carta, Entra } from '../ui/kit'
import { F, MARE } from '../ui/tema'

// L'ingresso alla sezione Junior dalla Home (21/10/2026, richiesta di Maurizio): i gruppi dei corsi per bambini e
// ragazzi con i posti liberi, per anno di nascita. Dopo lo Shop, per tutti: e' un elenco del club, non un dato di chi lo
// guarda. Se nel nucleo c'e' un figlio fra i 3 e i 17 anni, la schermata si apre gia' sul suo anno e la carta lo nomina.
// **Blu come la testata della sezione** (04/11/2026, richiesta di Maurizio: «la sezione junior nella home colorata di blu come dentro la sezione»):
// stesso blu acqua (`MARE`), le stesse due onde, testo e freccia bianchi, come il riquadro Abbonamenti e' arancio. Il blu e' lo stesso nei due temi,
// come nella testata (`junior/Presentazione.tsx`).

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
  const figlio = figlioJunior(area)
  useEffect(() => {
    precarica(CHIAVE_GRUPPI_JUNIOR, gruppiJunior)
  }, [])
  const nome = figlio?.nome ? figlio.nome.charAt(0).toUpperCase() + figlio.nome.slice(1).toLowerCase() : null
  const sotto = figlio
    ? t(
        `I gruppi dei corsi junior con i posti liberi: si apre sui nati nel ${figlio.anno}${nome ? `, come ${nome}` : ''}.`,
        `Junior course groups with spots available: it opens on children born in ${figlio.anno}${nome ? `, like ${nome}` : ''}.`,
      )
    : t('I gruppi dei corsi per bambini e ragazzi, per anno di nascita, con i posti ancora liberi.', 'Course groups for children and teens, by year of birth, with the spots still available.')
  return (
    <Entra indice={2}>
      <Carta
        style={[stili.carta, { backgroundColor: MARE[1], borderColor: MARE[1] }]}
        onPress={() => router.navigate(figlio ? { pathname: '/junior', params: { anno: String(figlio.anno) } } : '/junior')}
      >
        {/* Le due onde della testata della sezione, cerchi del blu piu' scuro e piu' chiaro: la sola decorazione. */}
        <View style={[stili.onda, stili.ondaGrande, { backgroundColor: MARE[2] }]} pointerEvents="none" />
        <View style={[stili.onda, stili.ondaPiccola, { backgroundColor: MARE[0] }]} pointerEvents="none" />
        <View style={stili.riga} accessibilityRole="link" accessibilityLabel={`Junior. ${sotto}`}>
          <View style={stili.bollino}>
            <Icona nome="goccia" size={24} colore="#fff" />
          </View>
          <View style={stili.testi}>
            <Text style={stili.titolo}>Junior</Text>
            <Text style={stili.sotto}>{sotto}</Text>
          </View>
          <Icona nome="avanti" size={18} colore="#fff" />
        </View>
      </Carta>
    </Entra>
  )
}

const stili = StyleSheet.create({
  carta: { overflow: 'hidden' },
  onda: { position: 'absolute', borderRadius: 999, opacity: 0.55 },
  ondaGrande: { width: 220, height: 220, right: -70, top: -90 },
  ondaPiccola: { width: 120, height: 120, right: 30, bottom: -70, opacity: 0.35 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  bollino: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.22)' },
  testi: { flex: 1, gap: 3 },
  titolo: { color: '#fff', fontFamily: F.extra, fontSize: 20, lineHeight: 24, letterSpacing: -0.5 },
  sotto: { color: 'rgba(255,255,255,0.9)', fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
})
