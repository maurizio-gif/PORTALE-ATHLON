import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { appleSaluteAttivo, appleSaluteDisponibile, appSaluteDelTelefono, chiediPermessoSalute, impostaAppleSalute, sincronizzaSalute, ultimoErroreSalute } from './appleSalute'
import { scollegaSalute, revocaConsensoDispositivi } from '@/api/dispositivi'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { Bollino, Carta, Etichetta, Messaggio, Pulsante, SchedeInArrivo, Sezione } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { datiAppleSalute, fontiRicevute, notaAppleSaluteDalWeb } from './comune'
import { GuidaCollegamento } from './GuidaCollegamento'
import { FoglioInformativa, Vetrina } from './Vetrina'
import { useDispositivi, type Dispositivi as DatiDispositivi } from './useDispositivi'

// La schermata dei dispositivi (/allenamento/dispositivi, 19/10/2026): il consenso, l'attivazione di Apple Salute e la guida a
// collegare il proprio dispositivo. **Dal 29/10/2026 i dispositivi arrivano solo da Apple Salute e, quando ci sara', da Health
// Connect** (richiesta di Maurizio: un collegamento diretto per ogni marchio e' troppo per l'app di una palestra; Oura e Polar con
// OAuth sono stati tolti, e con loro il ritorno `?code=…&state=…`). In quest'ordine, e ogni passo chiude quelli dopo:
//   1. la vetrina col consenso all'informativa (Vetrina.tsx): senza, niente;
//   2. Apple Salute: attivarlo, aggiornare, vedere da chi arrivano i dati (`CartaAppleSalute`);
//   3. la guida «come collegare il tuo dispositivo», con la procedura e i marchi (`GuidaCollegamento.tsx`);
//   4. in fondo, la revoca del consenso, che cancella i dati.
// Nella vista cliente dello staff la schermata non si apre: sono dati sulla salute.
// **`?attiva=apple`** (29/10/2026): e' dove porta «Continua» dell'invito di Athlon Health System e il pulsante «Attiva Apple
// Salute» della carta in evidenza. Prima viene l'informativa (la vetrina, se il consenso non c'e'), e appena la carta di Apple
// Salute compare apre da sola il foglio di Apple dove la persona sceglie cosa condividere; il parametro si toglie subito.

const primo = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export function Dispositivi() {
  const d = useDispositivi()
  const params = useLocalSearchParams<{ attiva?: string }>()

  const testata = { sopratitolo: 'Recover', titolo: t('I tuoi dispositivi', 'Your devices'), indietro: '/allenamento' as const, barra: false as const }
  const stato = d.stato

  if (d.vista) {
    return (
      <Schermata {...testata}>
        <Messaggio tono="attenzione" titolo={t('Non visibile nella vista cliente', 'Not visible in client view')}>
          {t('I dispositivi contengono dati sulla salute: li vede solo il socio, dalla sua app.', 'Devices contain health data: only the member can see it, from their own app.')}
        </Messaggio>
      </Schermata>
    )
  }
  if (!stato) {
    return (
      <Schermata {...testata}>
        <SchedeInArrivo quante={2} />
      </Schermata>
    )
  }
  if (!stato.ok) {
    return (
      <Schermata {...testata}>
        <Messaggio>{stato.errore}</Messaggio>
        <Pulsante testo={t('Riprova', 'Try again')} variante="secondario" onPress={d.rileggi} />
      </Schermata>
    )
  }
  if (!stato.maggiorenne) {
    return <Minorenni testata={testata} />
  }
  if (!stato.consenso) {
    return (
      <Schermata {...testata}>
        {/* Arrivati dall'invito ad Apple Salute: si dice perche' si passa da qui, e cosa succede subito dopo il consenso. */}
        {primo(params.attiva) === 'apple' ? (
          <Messaggio tono="attenzione" icona="cuore" titolo={t('Prima il tuo consenso', 'Your consent first')}>
            {t(
              'Per collegare Apple Salute serve il consenso ai dati sulla salute: lo dai qui sotto, e subito dopo si apre il foglio di Apple dove scegli cosa condividere.',
              'To connect Apple Health we need your consent to health data: you give it below, and right after that Apple’s sheet opens where you choose what to share.',
            )}
          </Messaggio>
        ) : null}
        <Vetrina onConsenso={d.rileggi} />
      </Schermata>
    )
  }
  return (
    <Schermata {...testata}>
      <Gestione d={d} attivaSubito={primo(params.attiva) === 'apple'} />
    </Schermata>
  )
}

function Minorenni({ testata }: { testata: { sopratitolo: string; titolo: string; indietro: '/allenamento'; barra: false } }) {
  const p = usePalette()
  return (
    <Schermata {...testata}>
      <Carta style={{ gap: spazio.due }}>
        <Text style={[stili.titoletto, { color: p.testo }]}>{t('Una sezione per i maggiorenni', 'A section for adults')}</Text>
        <Text style={[stili.nota, { color: p.testoSecondario }]}>{t('I dispositivi sono pensati per gli adulti. Se nella tua scheda del club manca la data di nascita, non è possibile attivarli.', 'Devices are designed for adults. If your date of birth is missing from your club profile, they can’t be turned on.')}</Text>
      </Carta>
    </Schermata>
  )
}

function Gestione({ d, attivaSubito }: { d: DatiDispositivi; attivaSubito: boolean }) {
  const p = usePalette()
  const [errore, setErrore] = useState<string | null>(null)
  const [informativa, setInformativa] = useState(false)
  const [revoca, setRevoca] = useState<'no' | 'chiedi' | 'in-corso'>('no')

  async function revocaTutto() {
    setRevoca('in-corso')
    const r = await revocaConsensoDispositivi()
    if (!r.ok) {
      setRevoca('chiedi')
      setErrore(r.errore)
      return
    }
    // Il «collegato» di prima non ha piu' senso: la sezione si richiude.
    impostaAppleSalute(false)
    d.rileggi()
  }

  return (
    <>
      <Text style={[stili.nota, { color: p.testoSecondario, paddingHorizontal: 2 }]}>
        {t(
          'Orologio, anello o app di fitness: li colleghi al tuo telefono, e il telefono ci passa quello che scegli di condividere. I dati compaiono in Recover e in Train, e li leggiamo quando apri l’app. Senza un dispositivo il sonno lo scrivi tu, da Recover.',
          'Watch, ring or fitness app: you connect them to your phone, and your phone passes us what you choose to share. The data shows up in Recover and in Train, and we read it when you open the app. Without a device you log your sleep yourself, from Recover.',
        )}
      </Text>
      {errore ? <Messaggio>{errore}</Messaggio> : null}
      <CartaAppleSalute d={d} onErrore={setErrore} attivaSubito={attivaSubito} />
      <GuidaCollegamento />

      <Sezione titolo={t('I tuoi dati', 'Your data')}>
        <Carta style={{ gap: spazio.tre }}>
          <Text style={[stili.nota, { color: p.testoSecondario }]}>
            {t(
              'Li vedi solo tu, nemmeno lo staff. Teniamo gli ultimi 90 giorni; se disattivi Apple Salute cancelliamo subito i suoi dati. Il sonno che scrivi tu si cancella con la revoca.',
              'Only you see it, not even staff. We keep the last 90 days; if you turn off Apple Health we delete its data straight away. The sleep you log yourself is deleted when you withdraw consent.',
            )}
          </Text>
          <Tocco onPress={() => setInformativa(true)} etichetta={t('Leggi l’informativa', 'Read the privacy notice')} ruolo="link" style={{ alignSelf: 'flex-start' }}>
            <Text style={[stili.link, { color: p.accento }]}>{t('Leggi l’informativa', 'Read the privacy notice')}</Text>
          </Tocco>
          {revoca === 'no' ? (
            <Pulsante testo={t('Revoca il consenso e cancella i dati', 'Withdraw consent and delete data')} variante="pericolo" onPress={() => setRevoca('chiedi')} />
          ) : (
            <View style={{ gap: spazio.due }}>
              <Text style={[stili.nota, { color: p.testo }]}>
                {t(
                  'Cancelliamo subito i dati dei dispositivi e quelli che hai scritto tu, e la sezione si richiude. Resta solo la registrazione del consenso e della revoca.',
                  'We delete your device data and the data you logged yourself straight away, and the section closes again. Only the record of your consent and its withdrawal is kept.',
                )}
              </Text>
              <View style={stili.azioni}>
                <View style={{ flex: 1 }}>
                  <Pulsante testo={t('Annulla', 'Cancel')} variante="secondario" piccolo onPress={() => setRevoca('no')} />
                </View>
                <View style={{ flex: 1 }}>
                  <Pulsante testo={t('Revoca e cancella', 'Withdraw and delete')} variante="pericolo" piccolo inCorso={revoca === 'in-corso'} onPress={revocaTutto} />
                </View>
              </View>
            </View>
          )}
        </Carta>
      </Sezione>
      <FoglioInformativa aperto={informativa} onChiudi={() => setInformativa(false)} />
    </>
  )
}

/** Perche' Apple Salute non ha dato niente, in parole: il motivo vero se c'e', e dove guardare. */
function motivoSalute(): string {
  const base = t(
    'Non abbiamo letto niente da Apple Salute. Controlla in Impostazioni › Salute › Accesso ai dati e dispositivi › Athlon Club che passi, sonno e allenamenti siano attivi.',
    'We read nothing from Apple Health. Check in Settings › Health › Data Access & Devices › Athlon Club that steps, sleep and workouts are turned on.',
  )
  return ultimoErroreSalute ? `${base} (${ultimoErroreSalute})` : base
}

function CartaAppleSalute({ d, onErrore, attivaSubito }: { d: DatiDispositivi; onErrore: (e: string | null) => void; attivaSubito: boolean }) {
  const p = usePalette()
  const [disponibile, setDisponibile] = useState(false)
  const [attivo, setAttivo] = useState(appleSaluteAttivo())
  const [fase, setFase] = useState<'no' | 'attiva' | 'aggiorna' | 'scollega'>('no')
  useEffect(() => {
    appleSaluteDisponibile().then(setDisponibile)
  }, [])
  // Arrivati dall'invito o dalla carta «Da attivare»: si apre il foglio di Apple senza un altro tocco (una volta sola).
  const partita = useRef(false)
  useEffect(() => {
    if (!attivaSubito || partita.current || !disponibile) return
    partita.current = true
    router.setParams({ attiva: undefined })
    if (!attivo) attiva()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attivaSubito, disponibile])
  const apple = datiAppleSalute(d.dati)
  const fonti = fontiRicevute(d.dati)
  if (appSaluteDelTelefono() !== 'apple') {
    // Dal web, da Android (dove Health Connect non c'e' ancora) o da un telefono senza HealthKit Apple Salute si vede soltanto: lo attiva e lo aggiorna l'app iPhone.
    if (!apple.ha) return null
    return (
      <Carta style={{ gap: spazio.tre }}>
        <View style={stili.testa}>
          <Bollino icona="cuore" tono="ok" size={46} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[stili.nome, { color: p.testo }]}>{t('Apple Salute', 'Apple Health')}</Text>
            <Text style={[stili.nota, { color: p.testoSecondario }]}>{fonti.length ? t(`Dati dal tuo iPhone: ${fonti.join(', ')}`, `Data from your iPhone: ${fonti.join(', ')}`) : t('Dati dal tuo iPhone', 'Data from your iPhone')}</Text>
          </View>
          <Etichetta testo={t('Dall’app', 'From the app')} tono="ok" icona="ok" />
        </View>
        <Text style={[stili.nota, { color: p.testoSecondario }]}>{notaAppleSaluteDalWeb(apple.ultimo)}</Text>
        <Text style={[stili.nota, { color: p.testoSecondario }]}>{t('Per attivarlo o disattivarlo apri l’app sull’iPhone.', 'To turn it on or off, open the app on your iPhone.')}</Text>
      </Carta>
    )
  }
  if (!disponibile) return null

  async function attiva() {
    onErrore(null)
    setFase('attiva')
    const ok = await chiediPermessoSalute()
    if (!ok) {
      setFase('no')
      onErrore(t('Non siamo riusciti ad aprire Apple Salute. Riprova.', 'We couldn’t open Apple Health. Try again.'))
      return
    }
    impostaAppleSalute(true)
    setAttivo(true)
    const r = await sincronizzaSalute(true)
    setFase('no')
    if (r) d.imposta(r)
    else onErrore(motivoSalute())
  }
  async function aggiorna() {
    onErrore(null)
    setFase('aggiorna')
    const r = await sincronizzaSalute(true)
    setFase('no')
    if (r) d.imposta(r)
    else onErrore(motivoSalute())
  }
  async function scollegaOra() {
    onErrore(null)
    setFase('scollega')
    const r = await scollegaSalute()
    setFase('no')
    if (r.ok) {
      impostaAppleSalute(false)
      setAttivo(false)
      d.imposta(r)
    } else onErrore(r.errore)
  }

  const senzaDati = attivo && !!d.dati && !apple.ha
  return (
    <Carta style={{ gap: spazio.tre }}>
      <View style={stili.testa}>
        <Bollino icona="cuore" tono={attivo ? (senzaDati ? 'attenzione' : 'ok') : 'neutro'} size={46} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[stili.nome, { color: p.testo }]}>{t('Apple Salute', 'Apple Health')}</Text>
          <Text style={[stili.nota, { color: p.testoSecondario }]}>{attivo && fonti.length ? t(`Ricevi da: ${fonti.join(', ')}`, `Receiving from: ${fonti.join(', ')}`) : t('Dal tuo iPhone e dai dispositivi collegati', 'From your iPhone and your connected devices')}</Text>
        </View>
        {attivo ? senzaDati ? <Etichetta testo={t('Senza dati', 'No data')} tono="attenzione" /> : <Etichetta testo={t('Attivo', 'On')} tono="ok" icona="ok" /> : <Etichetta testo={t('Da attivare', 'To turn on')} tono="attenzione" />}
      </View>
      <Text style={[stili.nota, { color: p.testoSecondario }]}>
        {t(
          'Scegli tu cosa condividere: l’app legge solo passi, sonno, battito e allenamenti, e solo quando la apri. Il sonno compare in Recover, gli allenamenti e i passi in Train.',
          'You choose what to share: the app only reads steps, sleep, heart rate and workouts, and only when you open it. Sleep shows up in Recover, workouts and steps in Train.',
        )}
      </Text>
      {senzaDati ? (
        <Messaggio tono="attenzione">
          {t(
            'È attivo, ma non è arrivato niente. Qui sotto trovi cosa controllare: di solito manca la condivisione nell’app del tuo dispositivo.',
            'It’s on, but nothing has come in. Below you’ll find what to check: usually the sharing is off in your device’s app.',
          )}
        </Messaggio>
      ) : null}
      {!attivo ? (
        <>
          <Pulsante testo={t('Attiva Apple Salute', 'Turn on Apple Health')} icona="avanti" inCorso={fase === 'attiva'} onPress={attiva} />
          <Text style={[stili.piccola, { color: p.testoTerzo }]}>{t('Consigliato, non obbligatorio.', 'Recommended, not required.')}</Text>
        </>
      ) : (
        <View style={stili.azioni}>
          <View style={{ flex: 1 }}>
            <Pulsante testo={t('Aggiorna ora', 'Refresh now')} icona="aggiorna" variante="secondario" piccolo inCorso={fase === 'aggiorna'} onPress={aggiorna} />
          </View>
          <View style={{ flex: 1 }}>
            <Pulsante testo={t('Disattiva', 'Turn off')} variante="contorno" piccolo inCorso={fase === 'scollega'} onPress={scollegaOra} />
          </View>
        </View>
      )}
    </Carta>
  )
}

const stili = StyleSheet.create({
  testa: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  nome: { fontFamily: F.extra, fontSize: 18 },
  titoletto: { fontFamily: F.extra, fontSize: 18 },
  nota: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  piccola: { fontFamily: F.medio, fontSize: 12, lineHeight: 17 },
  link: { fontFamily: F.bold, fontSize: 14, paddingVertical: 6 },
  azioni: { flexDirection: 'row', gap: spazio.due },
})
