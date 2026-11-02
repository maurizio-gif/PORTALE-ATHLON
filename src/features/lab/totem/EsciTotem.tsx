import { useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { LARGO } from '@/components/Pagina'
import { useWindowDimensions } from '@/lib/finestra'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { useAzioneInAltoPresente } from '../feedback/posizione'
import { SPOSTA_SE_OCCUPATO } from '../feedback/comune'
import { DENTRO_TESTATA } from '../assistente/PulsanteAssistente'
import { Icona } from '../ui/Icona'
import { LARGHEZZA_APP } from '../ui/Schermata'
import { F, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { uscitaTotem } from './uscita'

// Il pulsante «Esci» del totem (02/11/2026, richiesta di Maurizio): **al posto di «Richiedi assistenza»**, che sul pannello del club non ha piu' senso
// (chi sta li' ha davanti il desk), in alto a destra e sempre visibile. Chi finisce deve poter uscire con un tocco, senza aspettare i cinque minuti
// dell'uscita da sola (`GuardiaTotem`): e' l'operatore, o la persona stessa, a farlo. **Pieno e arancio, con la scritta**: e' la cosa piu' importante
// da vedere su uno schermo di tutti.
//
// Nessuna conferma: un tocco e si esce (`uscitaTotem`). Sta nella stessa posizione e con la stessa regola di spostamento del pulsante che sostituisce
// (`PulsanteAssistente`): dove la schermata ha un comando in alto a destra (il carrello dello shop), si sposta di un bottone a sinistra.
export function EsciTotem() {
  const p = usePalette()
  const ins = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const occupato = useAzioneInAltoPresente()
  const [inCorso, setInCorso] = useState(false)
  const colonna = width < LARGO ? 640 : LARGHEZZA_APP
  const destra = Math.max(0, (width - colonna) / 2) + spazio.tre + 2 + (occupato ? SPOSTA_SE_OCCUPATO : 0)

  return (
    <Tocco
      onPress={() => {
        setInCorso(true)
        uscitaTotem()
      }}
      etichetta={t('Esci', 'Log out')}
      scala={0.95}
      style={[stili.area, { top: ins.top + DENTRO_TESTATA, right: destra }]}
    >
      <View style={[stili.pillola, { backgroundColor: p.accento }]}>
        {inCorso ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Icona nome="esci" size={16} colore="#FFFFFF" />}
        <Text style={stili.testo}>{t('Esci', 'Log out')}</Text>
      </View>
    </Tocco>
  )
}

const stili = StyleSheet.create({
  area: { position: 'absolute', zIndex: 30, height: 44, justifyContent: 'center' },
  pillola: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 36, paddingHorizontal: 16, borderRadius: 999, boxShadow: '0 4px 14px rgba(18, 19, 22, 0.16)' },
  testo: { fontFamily: F.extra, fontSize: 15, letterSpacing: -0.1, color: '#FFFFFF' },
})
