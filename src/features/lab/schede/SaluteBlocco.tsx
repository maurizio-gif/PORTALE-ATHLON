import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'

import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { Icona } from '../ui/Icona'
import { Carta, Pulsante, Sezione } from '../ui/kit'
import { F, NOTTE, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { CONDIZIONI_SALUTE, NOTA_SALUTE, testoSalute, type CondizioneSalute } from './questionario'

// Cosa si vede quando l'obiettivo e' «Salute» (20/10/2026, richiesta del club): di cosa si tratta e il riquadro che porta alla prenotazione
// del personal trainer. L'agente non scrive questo piano e non parte nessuna richiesta. Lo usano il questionario a passi della sala
// (`PassiSala.tsx`) e il modulo della vasca (`FormVasca.tsx`).

export function SaluteBlocco({ condizione, onCondizione }: { condizione: CondizioneSalute | null; onCondizione: (c: CondizioneSalute) => void }) {
  const p = usePalette()
  return (
    <>
      <Sezione titolo={t('Di cosa si tratta', 'What it’s about')}>
        <View style={{ gap: spazio.due }}>
          {CONDIZIONI_SALUTE.map((c) => {
            const attivo = c.valore === condizione
            return (
              <Tocco
                key={c.valore}
                vibra="scelta"
                stato={{ selected: attivo }}
                onPress={() => onCondizione(c.valore)}
                etichetta={c.dettaglio ? `${c.testo} (${c.dettaglio})` : c.testo}
                style={[stili.livello, { backgroundColor: attivo ? p.accento : p.carta, borderColor: attivo ? p.accento : p.linea }]}
              >
                <Text style={{ color: attivo ? '#fff' : p.testo, fontFamily: F.extra, fontSize: 15.5 }}>{c.testo}</Text>
                {c.dettaglio ? <Text style={{ color: attivo ? 'rgba(255,255,255,0.85)' : p.testoSecondario, fontFamily: F.medio, fontSize: 13 }}>{c.dettaglio}</Text> : null}
              </Tocco>
            )
          })}
        </View>
      </Sezione>

      <Carta style={{ gap: spazio.tre }}>
        <View style={stili.riga}>
          <LinearGradient colors={NOTTE} style={stili.icona}>
            <Icona nome="persona" size={26} colore="#fff" />
          </LinearGradient>
          <Text style={[stili.titoletto, { color: p.testo, flex: 1 }]}>{t('Per questo ti serve un personal trainer', 'For this you need a personal trainer')}</Text>
        </View>
        <Text style={[stili.nota, { color: p.testoSecondario }]}>{testoSalute(condizione)}</Text>
        <Pulsante testo={t('Prenota un personal trainer', 'Book a personal trainer')} icona="calendario" onPress={() => router.push('/personal')} />
        <Text style={[stili.nota, { color: p.testoTerzo }]}>{NOTA_SALUTE}</Text>
      </Carta>
    </>
  )
}

const stili = StyleSheet.create({
  nota: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
  livello: { borderRadius: 20, padding: spazio.tre + 2, borderWidth: StyleSheet.hairlineWidth, gap: 2 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  icona: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  titoletto: { fontFamily: F.extra, fontSize: 16.5, letterSpacing: -0.3 },
})
