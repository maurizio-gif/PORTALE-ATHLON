import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { appleSaluteAttivo, appleSaluteDisponibile, appSaluteDelTelefono, invitoSaluteVisto, segnaInvitoSaluteVisto } from '../dispositivi/appleSalute'
import type { Dispositivi } from '../dispositivi/useDispositivi'
import { Icona, type NomeIcona } from '../ui/Icona'
import { Pulsante, Tag } from '../ui/kit'
import { F, FUOCO, NOTTE } from '../ui/tema'

// L'invito a collegare l'app Salute, appena si apre Athlon Health System (29/10/2026, richiesta di Maurizio: «dai subito la
// possibilita' di connettere l'app salute»). Una schermata intera, come quella con cui le altre app di allenamento chiedono
// l'accesso ai dati Salute: dice cosa si legge e a che serve, e poi **«Continua»** porta alla schermata dei dispositivi, che
// fa leggere l'informativa (il consenso) e subito dopo apre il foglio di Apple dove la persona sceglie cosa condividere
// (`/allenamento/dispositivi?attiva=apple`). **«Non ora»** la chiude: compare **una volta sola per dispositivo**, e da quel
// momento a ricordarlo e' la carta «Da attivare» in evidenza (`fit/CartaDispositivi.tsx`), che non sparisce finche' non si attiva.
//
// Collegare l'app Salute e' **consigliato, non obbligatorio** (i dati del corpo da compilare sono un'altra cosa: `fit/DatiDaCompilare.tsx`).
// Compare solo dove c'e' un'app Salute da cui leggere (oggi Apple Salute su iPhone: `appSaluteDelTelefono`), per i
// maggiorenni, se non e' gia' attiva e mai in vista cliente.

/** Cosa dice l'invito sull'app Salute del telefono: il nome cambia con la piattaforma (oggi solo Apple). */
const NOME_APP_SALUTE = () => t('Apple Salute', 'Apple Health')

function Voce({ icona, testo }: { icona: NomeIcona; testo: string }) {
  return (
    <View style={stili.voce}>
      <View style={stili.voceIcona}>
        <Icona nome={icona} size={18} colore="#fff" />
      </View>
      <Text style={stili.voceTesto}>{testo}</Text>
    </View>
  )
}

/** Il disegno: l'icona di Salute al centro e due riquadri che galleggiano, come le altre app (solo decorazione). */
function Scena() {
  return (
    <View style={stili.scena} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[stili.alone, { width: 210, height: 210, borderRadius: 105, backgroundColor: 'rgba(255,87,1,0.07)' }]} />
      <View style={[stili.alone, { width: 144, height: 144, borderRadius: 72, backgroundColor: 'rgba(255,87,1,0.12)' }]} />
      <View style={stili.icona}>
        <Icona nome="cuore" size={52} colore="#FF3B6B" />
      </View>
      <View style={[stili.riquadro, { left: 0, top: 10 }]}>
        <Icona nome="passi" size={18} colore="#fff" />
        <View>
          <Text style={stili.riquadroEtichetta}>{t('Passi', 'Steps')}</Text>
          <Text style={stili.riquadroValore}>8.420</Text>
        </View>
      </View>
      <View style={[stili.riquadro, { right: 0, bottom: 10 }]}>
        <Icona nome="peso" size={18} colore="#fff" />
        <View>
          <Text style={stili.riquadroEtichetta}>{t('Allenamento', 'Workout')}</Text>
          <Text style={stili.riquadroValore}>45 min</Text>
        </View>
      </View>
    </View>
  )
}

/** La schermata, senza logica: si apre da `InvitoSaluteAllApertura`. */
export function FoglioInvitoSalute({ onContinua, onNonOra }: { onContinua: () => void; onNonOra: () => void }) {
  const ins = useSafeAreaInsets()
  const nome = NOME_APP_SALUTE()
  return (
    <Modal visible animationType="slide" onRequestClose={onNonOra} statusBarTranslucent>
      <LinearGradient colors={NOTTE} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[stili.scorri, { paddingTop: ins.top + spazio.quattro }]} showsVerticalScrollIndicator={false}>
          <Scena />
          <View style={stili.testa}>
            <Tag testo={t('Consigliato', 'Recommended')} colore={FUOCO[0]} />
            <Text style={stili.titolo} accessibilityRole="header">
              {t(`Collega ${nome}`, `Connect ${nome}`)}
            </Text>
            <Text style={stili.testo}>
              {t(
                'Consentici di leggere i tuoi dati Salute: li usiamo per il tuo Athlon Health Score e per stimare le calorie con dati veri.',
                'Let us read your Health data: we use it for your Athlon Health Score and to estimate calories from real data.',
              )}
            </Text>
          </View>
          <View style={{ gap: spazio.tre }}>
            <Voce icona="passi" testo={t('Passi e movimento di ogni giorno', 'Your steps and daily movement')} />
            <Voce icona="luna" testo={t('Sonno e recupero, anche da anelli e orologi', 'Sleep and recovery, also from rings and watches')} />
            <Voce icona="peso" testo={t('Allenamenti, anche fuori dal club', 'Workouts, also outside the club')} />
          </View>
          <Text style={stili.piccola}>
            {t(
              'Scegli tu cosa condividere e puoi toglierlo quando vuoi. L’app legge solo quando la apri, e li vedi solo tu.',
              'You choose what to share and you can turn it off whenever you like. The app only reads when you open it, and only you see it.',
            )}
          </Text>
        </ScrollView>
        <View style={[stili.azioni, { paddingBottom: ins.bottom + spazio.tre }]}>
          <Pulsante testo={t('Continua', 'Continue')} icona="avanti" onPress={onContinua} />
          <Pulsante testo={t('Non ora', 'Not now')} variante="fantasma" piccolo onPress={onNonOra} />
          <Text style={[stili.piccola, { textAlign: 'center' }]}>
            {t(
              'Se non lo attivi adesso, lo ritrovi sempre in Athlon Health System, in evidenza: è da attivare.',
              'If you don’t turn it on now, you’ll always find it in Athlon Health System, highlighted: it’s waiting to be turned on.',
            )}
          </Text>
        </View>
      </LinearGradient>
    </Modal>
  )
}

/**
 * L'invito, quando serve: lo monta Athlon Health System (sia aperto che con i dati da inserire). Senza niente da fare resta invisibile.
 * «Continua» e «Non ora» lo segnano come visto: non compare piu' sullo stesso dispositivo.
 */
export function InvitoSaluteAllApertura({ disp }: { disp: Dispositivi }) {
  const [disponibile, setDisponibile] = useState(false)
  const [visto, setVisto] = useState(() => invitoSaluteVisto())
  const app = appSaluteDelTelefono()
  useEffect(() => {
    if (app) appleSaluteDisponibile().then(setDisponibile)
  }, [app])

  const noto = disp.stato?.ok ? disp.stato : null
  // Si aspetta di sapere se e' maggiorenne (lo stato dei dispositivi): un invito a un minorenne non deve comparire nemmeno per un attimo.
  const aperto = !!app && disponibile && !visto && !appleSaluteAttivo() && !disp.vista && !!noto && noto.maggiorenne
  if (!aperto) return null

  const chiudi = () => {
    segnaInvitoSaluteVisto()
    setVisto(true)
  }
  return (
    <FoglioInvitoSalute
      onNonOra={chiudi}
      onContinua={() => {
        chiudi()
        router.push({ pathname: '/allenamento/dispositivi', params: { attiva: 'apple' } })
      }}
    />
  )
}

const stili = StyleSheet.create({
  scorri: { flexGrow: 1, paddingHorizontal: spazio.cinque, paddingBottom: spazio.quattro, gap: spazio.quattro, maxWidth: 520, width: '100%', alignSelf: 'center' },
  scena: { height: 212, width: '100%', maxWidth: 320, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  alone: { position: 'absolute' },
  icona: { width: 104, height: 104, borderRadius: 29, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  riquadro: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.22)' },
  riquadroEtichetta: { color: 'rgba(255,255,255,0.75)', fontFamily: F.semi, fontSize: 12 },
  riquadroValore: { color: '#fff', fontFamily: F.extra, fontSize: 19, letterSpacing: -0.4 },
  testa: { alignItems: 'center', gap: spazio.due + 2 },
  titolo: { color: '#fff', fontFamily: F.extra, fontSize: 28, lineHeight: 32, letterSpacing: -0.9, textAlign: 'center' },
  testo: { color: 'rgba(255,255,255,0.78)', fontFamily: F.medio, fontSize: 15.5, lineHeight: 23, textAlign: 'center' },
  voce: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, minHeight: 36 },
  voceIcona: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  voceTesto: { flex: 1, color: '#fff', fontFamily: F.semi, fontSize: 15, lineHeight: 21 },
  piccola: { color: 'rgba(255,255,255,0.6)', fontFamily: F.medio, fontSize: 12.5, lineHeight: 18 },
  azioni: { gap: spazio.due, paddingHorizontal: spazio.cinque, paddingTop: spazio.tre, maxWidth: 520, width: '100%', alignSelf: 'center' },
})
