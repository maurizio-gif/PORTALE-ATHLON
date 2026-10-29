import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'

import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { Icona } from '../ui/Icona'
import { F, FUOCO } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { giorniRimasti, ordinale, puntiTesto, soloMese } from './comune'
import type { Classifica } from './useClassifica'

// La classifica nella carta dell'Athlon Health Score (29/10/2026): subito sotto il livello. **Senza essere dentro** invita a entrare e dice quanti
// sono (senza nomi); **dentro** dice dove si e' («12° su 240»), i punti del mese e quanti giorni restano. Si tocca per aprire la classifica
// (`/allenamento/classifica`). Non c'e' dove la funzione non c'e' ancora, in vista cliente e per i minorenni (`visibile` falso).
// Sta sul fondo scuro della carta: testo bianco, come la riga del livello.

export function RigaClassificaNellaCarta({ c }: { c: Classifica }) {
  const s = c.stato
  if (!c.visibile || !s) return null
  const mese = soloMese(s.mese.id)
  const dentro = !!s.consenso
  const posizione = dentro && s.me?.posizione != null ? s.me : null
  const sotto = dentro
    ? posizione
      ? `${puntiTesto(posizione.punti)} · ${giorniRimasti(s.mese.giorni_rimasti)}`
      : t('Ancora nessun punto questo mese', 'No points yet this month')
    : s.partecipanti > 0
      ? t(`Entra e scopri la tua posizione · ${s.partecipanti} ${s.partecipanti === 1 ? 'socio' : 'soci'} in classifica`, `Join and see where you stand · ${s.partecipanti} ${s.partecipanti === 1 ? 'member' : 'members'} on the leaderboard`)
      : t('Entra e scopri la tua posizione: si riparte il 1° di ogni mese', 'Join and see where you stand: it starts over on the 1st of every month')
  const etichetta = dentro
    ? posizione
      ? t(`Classifica di ${mese}: ${ordinale(posizione.posizione!)} su ${posizione.su}, ${puntiTesto(posizione.punti)}. ${giorniRimasti(s.mese.giorni_rimasti)}.`, `${mese} leaderboard: ${ordinale(posizione.posizione!)} out of ${posizione.su}, ${puntiTesto(posizione.punti)}. ${giorniRimasti(s.mese.giorni_rimasti)}.`)
      : t(`Classifica di ${mese}: ancora nessun punto`, `${mese} leaderboard: no points yet`)
    : t(`Classifica di ${mese}: entra`, `${mese} leaderboard: join`)
  return (
    <Tocco onPress={() => router.push('/allenamento/classifica')} etichetta={etichetta} scala={0.985}>
      <View style={stili.riga}>
        <LinearGradient colors={FUOCO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.medaglia}>
          <Icona nome="trofeo" size={21} colore="#fff" />
        </LinearGradient>
        <View style={{ flex: 1, gap: 3 }}>
          <View style={stili.testa}>
            <Text style={stili.titolo} numberOfLines={1}>
              {t(`Classifica di ${mese}`, `${mese} leaderboard`)}
            </Text>
            {posizione ? (
              <Text style={stili.posizione}>
                {ordinale(posizione.posizione!)}
                <Text style={stili.su}>{` ${t('su', 'of')} ${posizione.su}`}</Text>
              </Text>
            ) : !dentro ? (
              <View style={stili.entra}>
                <Text style={stili.entraTesto}>{t('ENTRA', 'JOIN')}</Text>
              </View>
            ) : null}
          </View>
          <Text style={stili.sotto} numberOfLines={2}>
            {sotto}
          </Text>
        </View>
        <Icona nome="avanti" size={16} colore="rgba(255,255,255,0.6)" />
      </View>
    </Tocco>
  )
}

const stili = StyleSheet.create({
  riga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  medaglia: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  testa: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spazio.due },
  titolo: { color: '#fff', fontFamily: F.extra, fontSize: 15.5, letterSpacing: -0.2, flexShrink: 1 },
  posizione: { color: '#fff', fontFamily: F.extra, fontSize: 18, letterSpacing: -0.4 },
  su: { color: 'rgba(255,255,255,0.7)', fontFamily: F.semi, fontSize: 12.5 },
  sotto: { color: 'rgba(255,255,255,0.78)', fontFamily: F.medio, fontSize: 12.5, lineHeight: 17 },
  entra: { backgroundColor: FUOCO[1], borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  entraTesto: { color: '#fff', fontFamily: F.extra, fontSize: 11, letterSpacing: 0.8 },
})
