import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import type { Area } from '@/api/lab'
import { statoInvito, type StatoInvito } from '@/api/referral'
import { spazio } from '@/theme'
import { t } from '@/lib/lingua'

import { CHIAVE_INVITO } from '../invita/Invita'
import { inMemoria, prendi } from '../memoria'
import { Icona } from '../ui/Icona'
import { Carta, Entra } from '../ui/kit'
import { F, FUOCO, usePalette } from '../ui/tema'
import { vistaCorrente } from '../vista'
import { personeConAbbonamento } from './regolarita'

// L'ingresso a «Invita i tuoi amici» dalla Home (21/10/2026, richiesta di Maurizio). Sta subito sotto «Da fare», prima
// dello Shop, e **non gli somiglia**: lo Shop e' una carta chiara col bollino arancio, questa e' scura col regalo, cosi'
// le due non si confondono. Il titolo dice il vantaggio, non il nome del programma.
//
// Compare solo a chi puo' invitare: il titolare con un abbonamento in vigore, anche a quota zero (la stessa regola di
// `portale-lab-referral`, che la ricontrolla). Mai in vista cliente.
//
// **Il vantaggio e' la cifra, non la parola «voucher»** (04/11/2026, richiesta di Maurizio): «ricevi 50 €», con la cifra in
// grassetto. **Titolo e testo sono al plurale** («Invita i tuoi amici»), sempre: l'idea e' farlo condividere a piu' persone. La cifra la dice la funzione (`voucher`); finche' non ha risposto vale quella di sempre.

/** Il voucher di ripiego, finche' la funzione non ha risposto: lo stesso di `portale-lab-referral` (VOUCHER). */
const VOUCHER_DI_RIPIEGO = 50

export function CartaInvita({ area }: { area: Extract<Area, { trovato: true }> }) {
  const p = usePalette()
  const puo = !vistaCorrente() && personeConAbbonamento(area).has(area.titolare)
  const [stato, setStato] = useState<StatoInvito | undefined>(() => inMemoria<StatoInvito>(CHIAVE_INVITO))
  // Il link si prepara mentre la persona guarda la Home: aprendo la schermata c'e' gia'. Una richiesta sola, e solo se
  // in memoria non c'e' niente (come `precarica`): intanto la carta dice la cifra quando arriva.
  useEffect(() => {
    if (!puo) return
    const gia = inMemoria<StatoInvito>(CHIAVE_INVITO)
    if (gia) {
      setStato(gia)
      return
    }
    let vivo = true
    prendi(CHIAVE_INVITO, statoInvito)
      .then((s) => vivo && setStato(s))
      .catch(() => undefined)
    return () => {
      vivo = false
    }
  }, [puo])
  if (!puo) return null
  const voucher = stato && stato.ok && stato.idoneo ? stato.voucher : VOUCHER_DI_RIPIEGO
  return (
    <Entra indice={2}>
      <Carta onPress={() => router.navigate('/invita')} style={[stili.carta, { backgroundColor: p.carbone }]}>
        <View style={stili.riga} accessibilityRole="link" accessibilityLabel={t(`Invita i tuoi amici. Allenati con i tuoi amici: per loro una settimana di prova, per te ${voucher} € quando si iscrivono.`, `Invite your friends. Train with your friends: a trial week for them, €${voucher} for you when they join.`)}>
          <View style={[stili.bollino, { borderColor: FUOCO[0] }]}>
            <Icona nome="regalo" size={24} colore={FUOCO[0]} />
          </View>
          <View style={stili.testi}>
            <Text style={stili.titolo}>{t('Invita i tuoi amici', 'Invite your friends')}</Text>
            <Text style={stili.sotto}>
              {t('Manda il tuo invito ai tuoi amici: possono provare il club o iscriversi subito, e quando si iscrivono ricevi ', 'Send your invite to your friends: they can try the club or join right away, and when they join you get ')}
              <Text style={stili.importo}>{t(`${voucher}\u00A0€`, `€${voucher}`)}</Text>
              {'.'}
            </Text>
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
  // La cifra in grassetto e a piena luce: il resto del testo e' al 72 %, cosi' si legge per prima.
  importo: { fontFamily: F.extra, color: '#FFFFFF' },
})
