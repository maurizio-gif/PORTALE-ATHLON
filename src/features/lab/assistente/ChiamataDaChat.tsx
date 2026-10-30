import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { pulsanteToccato } from '@/api/assistente'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { Appuntamento } from '../clublife/moduli/Appuntamento'
import { Icona } from '../ui/Icona'
import { F, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { AZIONE_CHIAMATA, type ProponeChiamata } from './chiamataDaChat'

// La telefonata col desk nella chat (31/10/2026): un pulsante con la proposta dell'assistente e, toccandolo, **il calendario del desk dentro la conversazione** (lo stesso modulo di Club Life,
// `Appuntamento`, senza la schermata intera). La persona sceglie giorno e orario, scrive di cosa vuole parlare, controlla il cellulare e preme «Fissa l'appuntamento»: **niente parte da solo**.
// Le regole (orari liberi, posti, un orario preso da un altro) sono quelle del modulo: qui non ce n'e' una in piu'. Si puo' richiudere senza fissare niente.

export function ChiamataDaChat({ proposta, messaggioId }: { proposta: ProponeChiamata; messaggioId: string | null }) {
  const p = usePalette()
  const [aperta, setAperta] = useState(false)

  if (!aperta) {
    return (
      <Tocco
        etichetta={proposta.etichetta}
        onPress={() => {
          if (messaggioId) pulsanteToccato(messaggioId, AZIONE_CHIAMATA)
          setAperta(true)
        }}
        style={[stili.proposta, { backgroundColor: p.accento }]}
      >
        <Icona nome="telefono" size={15} colore="#fff" />
        <Text style={stili.propostaTesto} numberOfLines={2}>
          {proposta.etichetta}
        </Text>
      </Tocco>
    )
  }

  return (
    <View style={[stili.carta, { backgroundColor: p.carta, borderColor: p.linea }]}>
      <Appuntamento calendario="desk" incorporato />
      <Tocco etichetta={t('Chiudi il calendario', 'Close the calendar')} onPress={() => setAperta(false)} style={stili.chiudi}>
        <Text style={[stili.chiudiTesto, { color: p.testoSecondario }]}>{t('Non ora', 'Not now')}</Text>
      </Tocco>
    </View>
  )
}

const stili = StyleSheet.create({
  proposta: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, alignSelf: 'flex-start', maxWidth: '100%' },
  propostaTesto: { fontFamily: F.semi, fontSize: 14, color: '#fff', flexShrink: 1 },
  carta: { width: '100%', minWidth: 0, gap: spazio.tre, padding: 14, borderRadius: 16, borderWidth: 1 },
  chiudi: { alignSelf: 'flex-start', minHeight: 36, justifyContent: 'center', paddingVertical: 4 },
  chiudiTesto: { fontFamily: F.semi, fontSize: 13.5 },
})
