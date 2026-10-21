import { router } from 'expo-router'
import { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import type { Area } from '@/api/lab'
import { statoInvito } from '@/api/referral'
import { spazio } from '@/theme'
import { t } from '@/lib/lingua'

import { CHIAVE_INVITO } from '../invita/Invita'
import { precarica } from '../memoria'
import { Icona } from '../ui/Icona'
import { Carta, Entra } from '../ui/kit'
import { F, FUOCO, usePalette } from '../ui/tema'
import { vistaCorrente } from '../vista'
import { personeConAbbonamento } from './regolarita'

// L'ingresso a «Invita un amico» dalla Home (21/10/2026, richiesta di Maurizio). Sta subito sotto «Da fare», prima
// dello Shop, e **non gli somiglia**: lo Shop e' una carta chiara col bollino arancio, questa e' scura col regalo, cosi'
// le due non si confondono. Il titolo dice il vantaggio, non il nome del programma.
//
// Compare solo a chi puo' invitare: il titolare con un abbonamento in vigore, anche a quota zero (la stessa regola di
// `portale-lab-referral`, che la ricontrolla). Mai in vista cliente.

export function CartaInvita({ area }: { area: Extract<Area, { trovato: true }> }) {
  const p = usePalette()
  const puo = !vistaCorrente() && personeConAbbonamento(area).has(area.titolare)
  // Il link si prepara mentre la persona guarda la Home: aprendo la schermata c'e' gia'.
  useEffect(() => {
    if (puo) precarica(CHIAVE_INVITO, statoInvito)
  }, [puo])
  if (!puo) return null
  return (
    <Entra indice={2}>
      <Carta onPress={() => router.navigate('/invita')} style={[stili.carta, { backgroundColor: p.carbone }]}>
        <View style={stili.riga} accessibilityRole="link" accessibilityLabel={t('Invita un amico. Allenati con un amico: per lui una settimana di prova, per te un voucher se si iscrive.', 'Invite a friend. Train with a friend: a trial week for them, a voucher for you if they join.')}>
          <View style={[stili.bollino, { borderColor: FUOCO[0] }]}>
            <Icona nome="regalo" size={24} colore={FUOCO[0]} />
          </View>
          <View style={stili.testi}>
            <Text style={stili.titolo}>{t('Allenati con un amico', 'Train with a friend')}</Text>
            <Text style={stili.sotto}>{t('Mandagli il tuo invito: può provare il club o iscriversi subito, e se si iscrive ricevi un voucher.', 'Send them your invite: they can try the club or join right away, and if they join you get a voucher.')}</Text>
          </View>
          <Icona nome="avanti" size={18} colore="rgba(255,255,255,0.55)" />
        </View>
      </Carta>
    </Entra>
  )
}

const stili = StyleSheet.create({
  carta: { borderColor: 'rgba(255,255,255,0.08)' },
  riga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  bollino: { width: 52, height: 52, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,87,1,0.12)' },
  testi: { flex: 1, gap: 3 },
  titolo: { fontFamily: F.extra, fontSize: 20, lineHeight: 24, letterSpacing: -0.5, color: '#FFFFFF' },
  sotto: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19, color: 'rgba(255,255,255,0.72)' },
})
