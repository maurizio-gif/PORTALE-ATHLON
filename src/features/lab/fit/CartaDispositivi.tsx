import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { appleSaluteAttivo, appleSaluteDisponibile, appSaluteDelTelefono, sincronizzaSalute } from '../dispositivi/appleSalute'
import { datiAppleSalute, fontiRicevute, giornoBreve, notaAppleSaluteDalWeb, riepilogoAppleSalute } from '../dispositivi/comune'
import type { Dispositivi } from '../dispositivi/useDispositivi'
import { Richiamo } from '../profilo/Richiamo'
import { Icona } from '../ui/Icona'
import { Tocco } from '../ui/Tocco'
import { Bollino, Carta, Etichetta, Messaggio, Pulsante } from '../ui/kit'
import { F, usePalette } from '../ui/tema'

// «Collega i tuoi dispositivi» / «I tuoi dispositivi» (28/10/2026, richiesta di Maurizio: Apple Salute era troppo nascosto,
// dentro Relax). Una carta sua, accanto a «Il tuo corpo». **Dal 29/10/2026 i dispositivi si collegano solo tramite Apple Salute e,
// quando ci sara', Health Connect** (non ci sono piu' Oura e Polar diretti): il telefono raccoglie quello che orologi, anelli e app
// di fitness gli passano, e l'app lo legge da li'. La carta ha quattro facce, che dicono a che punto e' la persona:
//   - **Da attivare** (c'e' Apple Salute su questo telefono e non e' attivo): in evidenza finche' non lo si attiva: bordo arancio,
//     anello che pulsa, «Da attivare», il benefit e il pulsante che apre subito il foglio di Apple (`?attiva=apple`).
//   - **Attivo, senza dati**: attivo ma non e' arrivato niente. Una cosa e' attivare, un'altra e' ricevere: di solito l'app del
//     dispositivo (Garmin, Oura...) non condivide ancora con Apple Salute, o un permesso e' stato negato. Dice dove guardare.
//   - **Collegato**: «Ricevi da: Apple Watch, Garmin Connect» (i nomi li da' il telefono, `fontiRicevute`) e l'elenco dei dati.
//   - **Si collega dall'app**: sul web e su Android (dove Health Connect non c'e' ancora): dice come funziona, senza un comando che non risponde.
// In tutte c'e' la strada alla guida per marchio (`dispositivi/GuidaCollegamento.tsx`, nella schermata dei dispositivi).
// Non compare nella vista cliente dello staff ne' ai minorenni. **La carta non e' piu' un tocco unico** (conteneva dei pulsanti:
// era un `<button>` dentro un `<button>` sul web): si agisce dai pulsanti.

const apri = () => router.push('/allenamento/dispositivi')
const apriEAttiva = () => router.push({ pathname: '/allenamento/dispositivi', params: { attiva: 'apple' } })

type Faccia = 'da-attivare' | 'senza-dati' | 'collegato' | 'dall-app'

export function CartaDispositivi({ disp }: { disp: Dispositivi }) {
  const p = usePalette()
  const [aperto, setAperto] = useState(false)
  const [disponibile, setDisponibile] = useState(false)
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const apple = appSaluteDelTelefono() === 'apple'
  useEffect(() => {
    if (apple) appleSaluteDisponibile().then(setDisponibile)
  }, [apple])

  const noto = disp.stato?.ok ? disp.stato : null
  if (disp.vista || (noto && !noto.maggiorenne)) return null

  const dal = datiAppleSalute(disp.dati)
  const attivo = apple && appleSaluteAttivo()
  // Finche' i dati non sono arrivati non si dice «senza dati»: sarebbe un falso allarme.
  const faccia: Faccia = apple && disponibile && !attivo ? 'da-attivare' : attivo && disp.dati && !dal.ha ? 'senza-dati' : attivo || dal.ha ? 'collegato' : 'dall-app'
  const fonti = fontiRicevute(disp.dati)

  async function aggiorna() {
    setInCorso(true)
    setErrore(null)
    const r = await sincronizzaSalute(true)
    setInCorso(false)
    if (r) disp.imposta(r)
    else setErrore(t('Non abbiamo letto niente da Apple Salute. Controlla che la condivisione sia attiva per sonno, passi e allenamenti.', 'We read nothing from Apple Health. Check that sharing is on for sleep, steps and workouts.'))
  }

  const evidenza = faccia === 'da-attivare'
  const voci = faccia === 'collegato' ? riepilogoAppleSalute(disp.dati) : []

  return (
    <Carta style={evidenza ? { gap: spazio.tre, borderColor: p.accento, borderWidth: 2 } : { gap: spazio.tre }}>
      {evidenza ? <Richiamo raggio={28} colore={p.accento} ingrandimento={1.03} spessore={2} finoAlFatto /> : null}
      <View style={stili.testa}>
        <Bollino icona={evidenza ? 'cuore' : faccia === 'senza-dati' ? 'attenzione' : faccia === 'collegato' ? 'cuore' : 'orologio'} tono={faccia === 'senza-dati' ? 'attenzione' : faccia === 'collegato' ? 'ok' : 'accento'} pieno={evidenza} size={46} />
        <View style={{ flex: 1, gap: 2 }}>
          <View style={stili.titoloRiga}>
            <Text style={[stili.titolo, { color: p.testo }]}>
              {faccia === 'da-attivare'
                ? t('Collega Apple Salute', 'Connect Apple Health')
                : faccia === 'senza-dati'
                  ? t('Apple Salute: non arriva niente', 'Apple Health: nothing coming in')
                  : faccia === 'collegato'
                    ? t('I tuoi dispositivi', 'Your devices')
                    : t('Collega i tuoi dispositivi', 'Connect your devices')}
            </Text>
            {faccia === 'da-attivare' ? <Etichetta testo={t('Da attivare', 'To turn on')} tono="attenzione" /> : null}
            {faccia === 'senza-dati' ? <Etichetta testo={t('Attivo, senza dati', 'On, no data')} tono="attenzione" /> : null}
            {faccia === 'collegato' ? <Etichetta testo={t('Collegato', 'Connected')} tono="ok" icona="ok" /> : null}
          </View>
          <Text style={[stili.nota, { color: p.testoSecondario }]}>
            {faccia === 'da-attivare'
              ? t(
                  'Passi, sonno e allenamenti arrivano da soli, anche da Apple Watch, Garmin, Oura o Fitbit: il tuo punteggio e le tue calorie si calcolano su dati veri.',
                  'Steps, sleep and workouts come in by themselves, also from Apple Watch, Garmin, Oura or Fitbit: your score and your calories are worked out from real data.',
                )
              : faccia === 'senza-dati'
                ? t(
                    'È attivo, ma non è arrivato ancora niente. Di solito manca la condivisione nell’app del tuo dispositivo, o un permesso è stato tolto: la guida spiega dove guardare.',
                    'It’s on, but nothing has come in yet. Usually the sharing is off in your device’s app, or a permission was removed: the guide shows where to look.',
                  )
                : faccia === 'collegato'
                  ? fonti.length
                    ? t(`Ricevi da: ${fonti.join(', ')}.`, `You’re receiving from: ${fonti.join(', ')}.`)
                    : t('Sonno, passi e allenamenti che arrivano dal telefono.', 'Sleep, steps and workouts coming from your phone.')
                  : t(
                      'Orologio, anello o app di fitness: si collegano dall’app, su iPhone tramite Apple Salute e su Android tramite Health Connect (in arrivo). Sonno, passi e allenamenti arrivano da soli.',
                      'Watch, ring or fitness app: you connect them from the app, through Apple Health on iPhone and Health Connect on Android (coming soon). Sleep, steps and workouts come in by themselves.',
                    )}
          </Text>
        </View>
      </View>

      {faccia === 'collegato' ? (
        <View style={{ gap: spazio.due }}>
          {dal.ha && !apple ? <Text style={[stili.piccola, { color: p.testoSecondario }]}>{notaAppleSaluteDalWeb(dal.ultimo)}</Text> : null}
          {dal.ha ? (
            <Tocco onPress={() => setAperto((v) => !v)} ruolo="button" etichetta={aperto ? t('Nascondi i dati', 'Hide data') : t('Vedi i dati che arrivano da qui', 'See the data coming from here')} scala={1}>
              <View style={stili.riga}>
                <Text style={[stili.piccola, { color: p.testoSecondario, flex: 1 }]}>{aperto ? t('Nascondi i dati', 'Hide data') : t('Vedi i dati che arrivano da qui', 'See the data coming from here')}</Text>
                <Icona nome={aperto ? 'su' : 'giu'} size={18} colore={p.testoTerzo} />
              </View>
            </Tocco>
          ) : null}
          {aperto ? (
            <View style={[stili.voci, { backgroundColor: p.incavo }]}>
              {voci.map((v) => (
                <View key={v.id} style={stili.voce}>
                  <Text style={[stili.piccola, { color: p.testoSecondario, flex: 1 }]}>{v.etichetta}</Text>
                  <Text style={[stili.piccola, { color: p.testo, fontFamily: F.bold }]}>{v.valore ? `${v.valore}${v.giorno ? ` · ${giornoBreve(v.giorno)}` : ''}` : t('non ancora ricevuto', 'not received yet')}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {errore ? <Messaggio>{errore}</Messaggio> : null}

      {faccia === 'da-attivare' ? (
        <>
          <Pulsante testo={t('Attiva Apple Salute', 'Turn on Apple Health')} icona="cuore" onPress={apriEAttiva} />
          <Text style={[stili.piccola, { color: p.testoTerzo }]}>{t('Consigliato, non obbligatorio. Scegli tu cosa condividere e puoi toglierlo quando vuoi.', 'Recommended, not required. You choose what to share and you can turn it off whenever you like.')}</Text>
          <Pulsante testo={t('Come collegare il tuo dispositivo', 'How to connect your device')} variante="fantasma" piccolo onPress={apri} />
        </>
      ) : faccia === 'senza-dati' ? (
        <View style={stili.azioni}>
          <View style={{ flex: 1 }}>
            <Pulsante testo={t('Aggiorna ora', 'Refresh now')} icona="aggiorna" variante="secondario" piccolo inCorso={inCorso} onPress={aggiorna} />
          </View>
          <View style={{ flex: 1 }}>
            <Pulsante testo={t('Come si fa', 'How to')} variante="contorno" piccolo onPress={apri} />
          </View>
        </View>
      ) : faccia === 'collegato' ? (
        <View style={stili.azioni}>
          <View style={{ flex: 1 }}>
            <Pulsante testo={t('Hai un altro dispositivo?', 'Another device?')} variante="contorno" piccolo onPress={apri} />
          </View>
          <View style={{ flex: 1 }}>
            <Pulsante testo={t('Gestisci', 'Manage')} icona="orologio" variante="secondario" piccolo onPress={apri} />
          </View>
        </View>
      ) : (
        <Pulsante testo={t('Come funziona', 'How it works')} icona="avanti" variante="secondario" onPress={apri} />
      )}
    </Carta>
  )
}

const stili = StyleSheet.create({
  testa: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  titoloRiga: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: spazio.due, rowGap: 4 },
  titolo: { fontFamily: F.extra, fontSize: 18 },
  nota: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  piccola: { fontFamily: F.medio, fontSize: 12, lineHeight: 17 },
  voci: { borderRadius: 14, padding: spazio.tre, gap: 6 },
  voce: { flexDirection: 'row', justifyContent: 'space-between', gap: spazio.due },
  riga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  azioni: { flexDirection: 'row', gap: spazio.due },
})
