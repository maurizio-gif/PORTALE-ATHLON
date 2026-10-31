import { StyleSheet, Text, View } from 'react-native'

import { locale, t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { oggiRoma } from '../alimentazione/conti'
import { giornoBreve, nomeFonte, nomeSport, piuRecenti, quando, durata, ultimoMovimento } from '../dispositivi/comune'
import type { Dispositivi } from '../dispositivi/useDispositivi'
import { spostaGiorno } from '../schede/contatoreCalorie'
import { Bollino, Carta, Sezione } from '../ui/kit'
import { F, usePalette } from '../ui/tema'

// Il movimento che arriva dai dispositivi (28/10/2026, richiesta di Maurizio: i passi non stanno nell'area sonno). In Train:
// passi e calorie di movimento dell'ultimo giorno che li ha, e gli ultimi allenamenti registrati dall'orologio o da Apple Salute.
// Compare solo se c'e' qualcosa; mai in vista cliente (dati sulla salute: `disp.dati` li' non c'e').

export function CartaMovimento({ disp }: { disp: Dispositivi }) {
  const p = usePalette()
  const dati = disp.dati
  if (disp.vista || !dati) return null
  const mov = ultimoMovimento(dati.giorni)
  const allenamenti = piuRecenti(dati.allenamenti, 5)
  if (!mov && !allenamenti.length) return null
  const oggi = oggiRoma()
  const ieri = spostaGiorno(oggi, -1)
  return (
    <Sezione titolo={t('Dai tuoi dispositivi', 'From your devices')}>
      <Carta style={{ gap: spazio.tre }}>
        {mov ? (
          <View style={{ gap: spazio.due }}>
            <Text style={[stili.sottoTitolo, { color: p.testo }]}>{mov.data === oggi ? t('Oggi', 'Today') : mov.data === ieri ? t('Ieri', 'Yesterday') : giornoBreve(mov.data)}</Text>
            <View style={stili.azioni}>
              {mov.passi !== null ? <Cifra valore={mov.passi.toLocaleString(locale())} etichetta={t('passi', 'steps')} /> : null}
              {mov.calorie !== null ? <Cifra valore={mov.calorie.toLocaleString(locale())} etichetta={t('kcal di movimento', 'active kcal')} /> : null}
            </View>
          </View>
        ) : null}
        {allenamenti.map((a, i) => {
          const pezzi = [durata(a.durata_minuti), a.calorie !== null ? `${a.calorie} kcal` : null, a.fc_media !== null ? t(`battito medio ${a.fc_media}`, `average heart rate ${a.fc_media}`) : null].filter(Boolean)
          return (
            <View key={a.id} style={[stili.allenamento, (i > 0 || mov) && { borderTopColor: p.linea, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spazio.tre }]}>
              <Bollino icona="cronometro" tono="accento" size={40} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[stili.nome, { color: p.testo }]}>{nomeSport(a.sport)}</Text>
                <Text style={[stili.piccola, { color: p.testoSecondario }]}>{`${quando(a.inizio, oggi, ieri)} · ${pezzi.join(' · ')}`}</Text>
              </View>
              <Text style={[stili.piccola, { color: p.testoTerzo }]}>{nomeFonte(a.origine) ?? (a.fornitore === 'manuale' ? t('Scritto da te', 'Logged by you') : a.fornitore === 'apple_salute' ? t('Apple Salute', 'Apple Health') : a.fornitore === 'google_salute' ? 'Health Connect' : a.fornitore === 'oura' ? 'Oura' : 'Polar')}</Text>
            </View>
          )
        })}
      </Carta>
    </Sezione>
  )
}

function Cifra({ valore, etichetta }: { valore: string; etichetta: string }) {
  const p = usePalette()
  return (
    <View style={[stili.cifra, { backgroundColor: p.incavo }]}>
      <Text style={[stili.cifraValore, { color: p.testo }]}>{valore}</Text>
      <Text style={[stili.piccola, { color: p.testoSecondario }]}>{etichetta}</Text>
    </View>
  )
}

const stili = StyleSheet.create({
  sottoTitolo: { fontFamily: F.extra, fontSize: 16 },
  nome: { fontFamily: F.bold, fontSize: 15 },
  piccola: { fontFamily: F.medio, fontSize: 12, lineHeight: 17 },
  azioni: { flexDirection: 'row', gap: spazio.due },
  cifra: { flex: 1, borderRadius: 16, padding: spazio.tre, gap: 2 },
  cifraValore: { fontFamily: F.extra, fontSize: 22 },
  allenamento: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
})
