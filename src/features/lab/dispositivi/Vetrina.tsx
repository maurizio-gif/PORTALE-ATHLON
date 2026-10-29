import { LinearGradient } from 'expo-linear-gradient'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { daiConsensoDispositivi } from '@/api/dispositivi'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { Icona, type NomeIcona } from '../ui/Icona'
import { Carta, Entra, Messaggio, Pulsante } from '../ui/kit'
import { Foglio } from '../ui/Foglio'
import { F, RELAX, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { CONSENSO, INFORMATIVA, VERSIONE_INFORMATIVA } from './informativa'

// La vetrina dei dispositivi (19/10/2026): quello che si ottiene scrivendo il sonno o collegando
// un orologio, un anello o un'app di fitness tramite Apple Salute o Health Connect (20/10/2026: il sonno scritto a mano e' per tutti; 29/10/2026: Oura e Polar diretti non ci sono piu'), e sotto il consenso. **Senza il consenso niente si collega** (richiesta
// del club): il pulsante si accende solo con la casella spuntata, e la funzione rifiuta ogni
// azione finche' il consenso non e' registrato. L'informativa completa si apre in un foglio.

const COSE: { icona: NomeIcona; colori: readonly [string, string]; titolo: string; testo: string }[] = [
  { icona: 'foglia', colori: ['#5EEAD4', '#0F766E'], titolo: t('Il tuo sonno', 'Your sleep'), testo: t('Scrivi ogni mattina quanto hai dormito, in dieci secondi: conta nel tuo Athlon Health Score. Con un anello o un orologio arriva da solo.', 'Log how long you slept each morning, in ten seconds: it counts toward your Athlon Health Score. With a ring or a watch it comes in by itself.') },
  { icona: 'cronometro', colori: ['#FF8A2B', '#E84300'], titolo: t('I tuoi allenamenti', 'Your workouts'), testo: t('Quelli registrati dal dispositivo, accanto a quelli che fai nel club.', 'The ones recorded by your device, next to the ones you do at the club.') },
  { icona: 'fiamma', colori: ['#5C8DFF', '#1F4FD8'], titolo: t('Il battito di notte', 'Your heart rate at night'), testo: t('Il valore più basso e la sua variabilità: un modo per vedere come recuperi.', 'The lowest value and its variability: a way to see how you’re recovering.') },
]

const GARANZIE: { icona: NomeIcona; testo: string }[] = [
  { icona: 'lucchetto', testo: t('Li vedi solo tu: nemmeno lo staff o i trainer.', 'Only you see them: not even staff or trainers.') },
  { icona: 'scudo', testo: t('Non vediamo la tua password e non leggiamo posizione né percorsi.', 'We never see your password and we don’t read your location or routes.') },
  { icona: 'cestino', testo: t('Scolleghi o revochi quando vuoi, e cancelliamo tutto subito.', 'Disconnect or withdraw whenever you like, and we delete everything straight away.') },
]

export function Vetrina({ onConsenso }: { onConsenso: () => void }) {
  const p = usePalette()
  const [spunta, setSpunta] = useState(false)
  const [aperta, setAperta] = useState(false)
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  async function attiva() {
    setInCorso(true)
    setErrore(null)
    const r = await daiConsensoDispositivi(VERSIONE_INFORMATIVA)
    setInCorso(false)
    if (r.ok) onConsenso()
    else setErrore(r.errore)
  }

  return (
    <>
      <Entra indice={0}>
        <LinearGradient colors={RELAX} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.eroe}>
          <View style={stili.novita}>
            <Text style={stili.novitaTesto}>{t('NOVITÀ', 'NEW')}</Text>
          </View>
          <Text style={stili.eroeTitolo}>{t('Il recupero fa parte dell’allenamento', 'Recovery is part of training')}</Text>
          <Text style={stili.eroeTesto}>{t('Scrivi quanto dormi, o collega il tuo orologio, il tuo anello o la tua app di fitness da Apple Salute o Health Connect: nell’app vedi il sonno accanto a quello che fai nel club.', 'Log how much you sleep, or connect your watch, ring or fitness app through Apple Health or Health Connect: in the app you see your sleep next to what you do at the club.')}</Text>
        </LinearGradient>
      </Entra>

      <View style={{ gap: spazio.tre }}>
        {COSE.map((c, i) => (
          <Entra key={c.titolo} indice={i + 1}>
            <Carta style={stili.cosa}>
              <LinearGradient colors={c.colori} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.cosaIcona}>
                <Icona nome={c.icona} size={22} colore="#fff" />
              </LinearGradient>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[stili.cosaTitolo, { color: p.testo }]}>{c.titolo}</Text>
                <Text style={[stili.cosaTesto, { color: p.testoSecondario }]}>{c.testo}</Text>
              </View>
            </Carta>
          </Entra>
        ))}
      </View>

      <Entra indice={4}>
        <Carta style={{ gap: spazio.tre }}>
          <Text style={[stili.titoletto, { color: p.testo }]}>{t('I tuoi dati restano tuoi', 'Your data stays yours')}</Text>
          <Text style={[stili.cosaTesto, { color: p.testoSecondario }]}>
            {t(
              'Il sonno e il battito sono dati sulla salute: per scriverlo o collegare un dispositivo ci serve il tuo consenso, che puoi ritirare quando vuoi.',
              'Sleep and heart rate are health data: to log it or connect a device we need your consent, which you can withdraw whenever you like.',
            )}
          </Text>
          <View style={{ gap: spazio.due }}>
            {GARANZIE.map((g) => (
              <View key={g.testo} style={stili.garanzia}>
                <Icona nome={g.icona} size={18} colore={RELAX[2]} />
                <Text style={[stili.cosaTesto, { color: p.testo, flex: 1 }]}>{g.testo}</Text>
              </View>
            ))}
          </View>
          <Tocco onPress={() => setAperta(true)} etichetta={t('Leggi l’informativa completa', 'Read the full privacy notice')} ruolo="link" style={{ alignSelf: 'flex-start' }}>
            <Text style={[stili.link, { color: p.accento }]}>{t('Leggi l’informativa completa', 'Read the full privacy notice')}</Text>
          </Tocco>
          <Tocco onPress={() => setSpunta((v) => !v)} vibra="scelta" ruolo="checkbox" stato={{ selected: spunta }} etichetta={CONSENSO} scala={0.99}>
            <View style={[stili.spunta, { backgroundColor: p.incavo }]}>
              <View style={[stili.casella, { borderColor: spunta ? RELAX[2] : p.testoTerzo, backgroundColor: spunta ? RELAX[2] : 'transparent' }]}>
                {spunta ? <Icona nome="spunta" size={15} colore="#fff" /> : null}
              </View>
              <Text style={[stili.cosaTesto, { color: p.testo, flex: 1 }]}>{CONSENSO}</Text>
            </View>
          </Tocco>
          {errore ? <Messaggio>{errore}</Messaggio> : null}
          <Pulsante testo={t('Attiva Recover', 'Turn on Recover')} icona="avanti" onPress={attiva} disabilitato={!spunta} inCorso={inCorso} />
        </Carta>
      </Entra>

      <FoglioInformativa aperto={aperta} onChiudi={() => setAperta(false)} />
    </>
  )
}

/** Il testo dell'informativa in un foglio, per chi ha gia' accettato e vuole rileggerla. */
export function FoglioInformativa({ aperto, onChiudi }: { aperto: boolean; onChiudi: () => void }) {
  const p = usePalette()
  return (
    <Foglio aperto={aperto} titolo={t('Informativa: Dispositivi', 'Privacy notice: Devices')} sottotitolo={t(`Versione del ${VERSIONE_INFORMATIVA.split('-').reverse().join('/')}`, `Version of ${VERSIONE_INFORMATIVA.split('-').reverse().join('/')}`)} onChiudi={onChiudi}>
      {INFORMATIVA.map((s) => (
        <View key={s.titolo} style={{ gap: 4 }}>
          <Text style={[stili.cosaTitolo, { color: p.testo }]}>{s.titolo}</Text>
          <Text style={[stili.cosaTesto, { color: p.testoSecondario }]}>{s.testo}</Text>
        </View>
      ))}
      <Pulsante testo={t('Ho letto', 'Got it')} variante="secondario" onPress={onChiudi} />
    </Foglio>
  )
}

const stili = StyleSheet.create({
  eroe: { borderRadius: 28, padding: spazio.tre + 4, gap: spazio.tre, overflow: 'hidden' },
  eroeTitolo: { color: '#fff', fontFamily: F.extra, fontSize: 26, lineHeight: 30 },
  eroeTesto: { color: 'rgba(255,255,255,0.92)', fontFamily: F.medio, fontSize: 15, lineHeight: 21 },
  novita: { alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  novitaTesto: { color: '#fff', fontFamily: F.extra, fontSize: 11, letterSpacing: 1 },
  cosa: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  cosaIcona: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cosaTitolo: { fontFamily: F.extra, fontSize: 16 },
  cosaTesto: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  titoletto: { fontFamily: F.extra, fontSize: 18 },
  garanzia: { flexDirection: 'row', alignItems: 'flex-start', gap: spazio.due },
  link: { fontFamily: F.bold, fontSize: 14, paddingVertical: 6 },
  spunta: { flexDirection: 'row', alignItems: 'flex-start', gap: spazio.tre, borderRadius: 16, padding: spazio.tre },
  casella: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
})
