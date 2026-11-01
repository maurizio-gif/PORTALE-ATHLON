import { useState } from 'react'
import { Linking, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInRight } from 'react-native-reanimated'

import { esci } from '@/api/lab'
import { completaProfilo, type CampoIngresso } from '@/api/registrazione'
import { Casella } from '@/components/Casella'
import { CampoData } from '@/components/CampoData'
import { CampoTelefono } from '@/components/CampoTelefono'
import { maggiorenne } from '@/features/delega/regole'
import { PRIVACY_URL } from '@/lib/guestPass'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { Testata } from '../Accesso'
import { CampoTesto } from '../ui/Campi'
import { Carta, Messaggio, Pulsante } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, usePalette } from '../ui/tema'
import { colpetto, Tocco } from '../ui/Tocco'

// «Completa il profilo» (01/11/2026): dopo l'email e il codice, a chi e' nuovo o ha la scheda senza data di nascita si chiede quello che manca, e poi
// e' dentro. Lo stesso percorso sul web e nelle app degli store (niente link per email).
//
// **La data di nascita sempre, e per prima**: un minorenne non lascia nessun altro dato, e `portale-registrazione` non salva niente di lui. I 13-17
// anni entrano dall'account del genitore (Famiglia), non da qui. Se la scheda ha gia' la data non si chiede: restano solo i campi che mancano.
// **Il consenso privacy** (presa visione dell'informativa) si chiede solo dove si crea la scheda, nella stessa schermata dei dati.

export function CompletaProfilo({ campi: iniziali, segreteria: daSegreteria = false, onFatto }: { campi: CampoIngresso[]; /** Con questa email ci sono solo schede di minorenni: non si completa da qui. */ segreteria?: boolean; onFatto: () => void }) {
  const p = usePalette()
  const [campi, setCampi] = useState<CampoIngresso[]>(iniziali)
  const [passo, setPasso] = useState<'nascita' | 'resto'>(iniziali.includes('nascita') ? 'nascita' : 'resto')
  const [d, setD] = useState({ nascita: '', nome: '', cognome: '', telefono: '' })
  const [privacy, setPrivacy] = useState(false)
  const [attesa, setAttesa] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [minorenne, setMinorenne] = useState(false)
  const [segreteria, setSegreteria] = useState(daSegreteria)

  const oggi = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' })
  const resto = campi.filter((c) => c !== 'nascita')
  const serveConsenso = campi.includes('nome')
  const cambia = (k: keyof typeof d) => (v: string) => setD((x) => ({ ...x, [k]: v }))

  async function invia() {
    setErrore(null)
    if (campi.includes('nome') && !d.nome.trim()) return setErrore(t('Scrivi il nome.', 'Enter your first name.'))
    if (campi.includes('cognome') && !d.cognome.trim()) return setErrore(t('Scrivi il cognome.', 'Enter your last name.'))
    if (campi.includes('telefono') && d.telefono.replace(/\D/g, '').length < 8) return setErrore(t('Controlla il numero di cellulare.', 'Check your mobile number.'))
    if (serveConsenso && !privacy) return setErrore(t('Per continuare serve la presa visione dell’informativa privacy.', 'To continue you need to acknowledge the privacy notice.'))
    setAttesa(true)
    // Solo i dati chiesti: gli altri non servono e non si mandano.
    const dati: Parameters<typeof completaProfilo>[0] = { privacy }
    for (const k of campi) dati[k] = k === 'nome' || k === 'cognome' ? d[k].trim() : d[k]
    const r = await completaProfilo(dati)
    setAttesa(false)
    if (r.ok) {
      colpetto('ok')
      return onFatto()
    }
    colpetto('errore')
    if (r.minorenne) return setMinorenne(true)
    if (r.verifica) return setSegreteria(true)
    if (r.serve) {
      // La funzione dice che ora servono altri dati (la scheda e' cambiata nel frattempo): si ricomincia da quelli.
      setCampi(r.serve)
      setPasso(r.serve.includes('nascita') ? 'nascita' : 'resto')
    }
    setErrore(r.errore)
  }

  function continuaDaNascita() {
    setErrore(null)
    if (!d.nascita) return setErrore(t('Scrivi la data di nascita.', 'Enter your date of birth.'))
    // Un minorenne si ferma qui, prima di chiedere nome e cellulare: niente viene inviato.
    if (!maggiorenne(d.nascita, oggi)) return setMinorenne(true)
    if (resto.length) return setPasso('resto')
    invia()
  }

  if (minorenne || segreteria) {
    return (
      <Schermata titolo={t('Profilo', 'Profile')} nascondiTitolo barra={false} sopra={
          <Testata
            fase="profilo"
            titolo={minorenne ? t('Serve un\ngenitore', 'A parent\nis needed') : t('Ti aiutiamo\nnoi', 'We’ll\nhelp you')}
            sotto={minorenne ? t('I ragazzi si iscrivono dall’account di un genitore.', 'Teens sign up from a parent’s account.') : t('Questo indirizzo va guardato da una persona del club.', 'This address needs a look from someone at the club.')}
          />
        }
      >
        <Carta style={stili.modulo}>
          <Messaggio tono="attenzione" titolo={minorenne ? t('Serve un genitore', 'A parent is needed') : t('Ti aiutiamo in segreteria', 'We’ll help you at the front desk')}>
            {minorenne
              ? t('Per registrarti serve un genitore: chiedigli di aggiungerti dalla sua app, nella sezione Famiglia. Non abbiamo salvato nessun dato.', 'To sign up you need a parent: ask them to add you from their app, in the Family section. We haven’t saved any details.')
              : t('Con questo indirizzo non riusciamo a completare da qui. Passa in segreteria o scrivici, e ti aiutiamo.', 'We can’t complete this here with this address. Stop by the front desk or write to us and we’ll help.')}
          </Messaggio>
          <Pulsante testo={t('Usa un’altra email', 'Use another email')} variante="secondario" onPress={esci} />
        </Carta>
      </Schermata>
    )
  }

  return (
    <Schermata titolo={t('Profilo', 'Profile')} nascondiTitolo barra={false} sopra={<Testata fase="profilo" />}>
      <Carta style={stili.modulo}>
        <Animated.View key={passo} entering={FadeInRight.duration(320)} style={{ gap: spazio.tre + 4 }}>
          {passo === 'nascita' ? (
            <>
              <Text style={[stili.nota, { color: p.testoSecondario }]}>
                {t('Per entrare ci serve la tua ', 'To sign in we need your ')}
                <Text style={{ fontFamily: F.bold, color: p.testo }}>{t('data di nascita', 'date of birth')}</Text>.
              </Text>
              {/* `CampoData` ha `flex: 1` (nasce dentro una riga): in una colonna senza altezza si schiaccia, quindi sta dentro una View. */}
              <View>
                <CampoData etichetta={t('Data di nascita', 'Date of birth')} value={d.nascita} onChange={cambia('nascita')} max={oggi} annoIniziale={new Date().getFullYear() - 30} errore={!!errore} sfondo={p.incavo} />
              </View>
              {errore ? <Messaggio>{errore}</Messaggio> : null}
              <Pulsante testo={resto.length ? t('Continua', 'Continue') : t('Entra', 'Continue')} icona="avanti" onPress={continuaDaNascita} inCorso={attesa} />
            </>
          ) : (
            <>
              {campi.includes('nome') ? <CampoTesto etichetta={t('Nome', 'First name')} value={d.nome} onChangeText={cambia('nome')} autoCapitalize="words" autoComplete="given-name" errore={!!errore && !d.nome.trim()} /> : null}
              {campi.includes('cognome') ? <CampoTesto etichetta={t('Cognome', 'Last name')} value={d.cognome} onChangeText={cambia('cognome')} autoCapitalize="words" autoComplete="family-name" errore={!!errore && !d.cognome.trim()} /> : null}
              {campi.includes('telefono') ? (
                <View>
                  <CampoTelefono etichetta={t('Cellulare', 'Mobile')} value={d.telefono} onChange={cambia('telefono')} sfondo={p.incavo} />
                </View>
              ) : null}
              {serveConsenso ? (
                <Casella spuntata={privacy} onCambia={() => setPrivacy((x) => !x)} etichetta={t('Presa visione dell’informativa privacy', 'Privacy notice acknowledgement')}>
                  <Text style={[stili.nota, { color: p.testoSecondario }]}>
                    {t('Ho letto l’', 'I’ve read the ')}
                    <Text onPress={() => Linking.openURL(PRIVACY_URL)} style={{ fontFamily: F.bold, color: p.accento, textDecorationLine: 'underline' }}>
                      {t('informativa privacy', 'privacy notice')}
                    </Text>
                    {t(' del club.', ' of the club.')}
                  </Text>
                </Casella>
              ) : null}
              {errore ? <Messaggio>{errore}</Messaggio> : null}
              <Pulsante testo={t('Entra', 'Continue')} icona="avanti" onPress={invia} inCorso={attesa} />
            </>
          )}
        </Animated.View>
        <Tocco onPress={esci} ruolo="link" etichetta={t('Non sei tu? Esci', 'Not you? Sign out')} vibra={null} scala={0.99} style={{ alignSelf: 'center' }}>
          <Text style={[stili.nota, { color: p.testoTerzo, textAlign: 'center', fontSize: 12.5 }]}>{t('Non sei tu? Esci', 'Not you? Sign out')}</Text>
        </Tocco>
      </Carta>
    </Schermata>
  )
}

const stili = StyleSheet.create({
  modulo: { marginTop: -64, padding: spazio.quattro - 2, gap: spazio.tre + 4 },
  nota: { fontSize: 14.5, lineHeight: 21, fontFamily: F.medio },
})
