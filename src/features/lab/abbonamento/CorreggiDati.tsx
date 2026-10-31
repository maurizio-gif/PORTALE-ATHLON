import { useState } from 'react'
import { Text, View } from 'react-native'

import { salvaDatiAbbonamento, type CambiDati, type PersonaDati } from '@/api/abbonamento'
import { CampoPaese } from '@/components/CampoPaese'
import { CasellaResidenteEstero } from '@/components/CasellaResidenteEstero'
import { problemaCodiceFiscale } from '@/lib/codiceFiscale'
import { t } from '@/lib/lingua'
import { capLiberoValido, ITALIA, pulisciCapLibero } from '@/lib/residenteEstero'
import { spazio } from '@/theme'

import { CampoTesto } from '../ui/Campi'
import { Carta, Messaggio, Pulsante } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { colpetto } from '../ui/Tocco'

// La correzione dei dati del contratto, senza uscire dall'acquisto (16/10/2026):
// codice fiscale, cellulare e indirizzo. Nome, cognome e data di nascita sono
// l'identita' e si cambiano dal club, quindi qui si leggono soltanto.
// Si mandano solo i campi che sono cambiati.
// Residente all'estero: niente codice fiscale, il Paese e' obbligatorio e il CAP
// e' libero (i CAP esteri non hanno cinque cifre). Chi toglie la spunta scrive il
// codice fiscale e l'indirizzo torna italiano.

export function CorreggiDati({
  persona,
  titolo,
  apertoDa = false,
  mancanti,
  senzaRecapiti = false,
  onSalvato,
}: {
  persona: PersonaDati
  titolo: string
  /** Si apre da solo: mancano dei dati e senza non si va avanti. */
  apertoDa?: boolean
  mancanti?: string[]
  /** Indirizzo e cellulare non si chiedono: sono di un'altra persona (il genitore, per un minorenne). */
  senzaRecapiti?: boolean
  onSalvato: () => void
}) {
  const p = usePalette()
  const [aperto, setAperto] = useState(apertoDa)
  const [cf, setCf] = useState(persona.codice_fiscale ?? '')
  const [estero, setEstero] = useState(!!persona.senza_codice_fiscale)
  const [paese, setPaese] = useState(persona.senza_codice_fiscale && persona.paese && persona.paese !== ITALIA ? persona.paese : '')
  const [telefono, setTelefono] = useState(persona.telefono ?? '')
  const [via, setVia] = useState(persona.indirizzo?.via ?? '')
  const [cap, setCap] = useState(persona.indirizzo?.cap ?? '')
  const [citta, setCitta] = useState(persona.indirizzo?.citta ?? '')
  const [errore, setErrore] = useState<string | null>(null)
  const [attesa, setAttesa] = useState(false)

  // La casella cambia il tipo di CAP: tolta la spunta, un CAP che non ha cinque cifre non vale piu'.
  function cambiaEstero() {
    if (estero) setCap((c) => (/^\d{5}$/.test(c) ? c : ''))
    setErrore(null)
    setEstero(!estero)
  }

  async function salva() {
    const cambi: CambiDati = {}
    const cfNuovo = cf.replace(/\s/g, '').toUpperCase()
    if (estero) {
      // Residente all'estero: nessun codice da controllare. Su PerfectGym il campo resta vuoto.
      if (!paese) {
        setErrore(t('Scegli il Paese in cui risiedi.', 'Choose the country you live in.'))
        return
      }
      if (!persona.senza_codice_fiscale || paese !== persona.paese) {
        cambi.senza_codice_fiscale = true
        cambi.paese = paese
      }
    } else if (cfNuovo !== (persona.codice_fiscale ?? '').toUpperCase() || persona.senza_codice_fiscale) {
      if (!cfNuovo) {
        setErrore(t('Scrivi il codice fiscale, oppure spunta che sei residente all’estero.', 'Enter your Italian tax code, or tick that you live abroad.'))
        return
      }
      // Il codice fiscale si controlla qui, prima di toccare il contratto (30/10/2026): sedici caratteri, il carattere
      // di controllo e la coerenza con nome, cognome e data di nascita. Quello che non regge non parte.
      if (cfNuovo.length !== 16) {
        setErrore(t('Il codice fiscale ha 16 caratteri: controllalo.', 'The tax code has 16 characters: please check it.'))
        return
      }
      const problemaCf = problemaCodiceFiscale({ codice_fiscale: cfNuovo, nome: persona.nome ?? '', cognome: persona.cognome ?? '', nascita: persona.data_nascita ?? '' })
      if (problemaCf) {
        setErrore(problemaCf)
        return
      }
      cambi.codice_fiscale = cfNuovo
    }
    if (!senzaRecapiti && telefono.trim() !== (persona.telefono ?? '')) cambi.telefono = telefono.trim()
    // Il Paese dell'indirizzo: quello della residenza all'estero, altrimenti l'Italia.
    const paeseIndirizzo = estero ? paese : ITALIA
    if (!senzaRecapiti && (via.trim() !== (persona.indirizzo?.via ?? '') || cap !== (persona.indirizzo?.cap ?? '') || citta.trim() !== (persona.indirizzo?.citta ?? ''))) {
      // L'indirizzo parte solo se l'hai scritto tu: dichiarare un Paese non riscrive quello che c'e'.
      if (!via.trim() || !citta.trim()) {
        setErrore(t('Scrivi via e numero civico, CAP e città.', 'Enter street and number, postal code and city.'))
        return
      }
      if (estero ? !capLiberoValido(cap) : !/^\d{5}$/.test(cap)) {
        setErrore(estero ? t('Il CAP non è valido: da 2 a 12 caratteri fra lettere, cifre, spazio e trattino.', 'The postal code isn’t valid: 2 to 12 characters among letters, digits, spaces and hyphens.') : t('Il CAP ha cinque cifre.', 'The postal code has five digits.'))
        return
      }
      cambi.indirizzo = { via: via.trim(), cap: cap.trim(), citta: citta.trim(), paese: paeseIndirizzo }
    }
    if (!Object.keys(cambi).length) {
      setErrore(t('Non hai cambiato niente.', 'You haven’t changed anything.'))
      return
    }
    setErrore(null)
    setAttesa(true)
    const r = await salvaDatiAbbonamento(persona.member_id, cambi)
    setAttesa(false)
    if (!r.ok) {
      colpetto('errore')
      return setErrore(r.errore)
    }
    colpetto('ok')
    setAperto(false)
    onSalvato()
  }

  if (!aperto) {
    return <Pulsante testo={persona.ruolo === 'genitore' ? t('Correggi i dati del genitore', 'Edit the parent’s details') : t('Correggi i dati', 'Edit details')} variante="fantasma" piccolo pieno={false} onPress={() => setAperto(true)} />
  }

  return (
    <Carta piatta>
      <View style={{ gap: spazio.tre }}>
        <Text style={{ color: p.testo, fontFamily: F.extra, fontSize: 16 }}>{titolo}</Text>
        {mancanti?.length ? <Messaggio tono="attenzione">{t(`Per il contratto serve: ${mancanti.join(', ')}.`, `The contract needs: ${mancanti.join(', ')}.`)}</Messaggio> : null}
        <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 13, lineHeight: 19 }}>
          {`${persona.nome} ${persona.cognome}${persona.data_nascita ? t(`, nato/a il ${persona.data_nascita.split('-').reverse().join('/')}`, `, born ${persona.data_nascita.split('-').reverse().join('/')}`) : ''}. ${t('Nome e data di nascita si cambiano dal club.', 'Name and date of birth can only be changed by the club.')}`}
        </Text>
        {estero ? null : (
          <CampoTesto etichetta={t('Codice fiscale', 'Italian tax code')} value={cf} onChangeText={(v) => setCf(v.toUpperCase())} autoCapitalize="characters" autoCorrect={false} maxLength={16} placeholder="RSSMRA80A01H501U" />
        )}
        <CasellaResidenteEstero spuntata={estero} onCambia={cambiaEstero} lab />
        {estero ? <CampoPaese variante="lab" value={paese} onChange={(v) => { setPaese(v); setErrore(null) }} errore={!!errore && !paese} /> : null}
        {senzaRecapiti ? null : (<>
        <CampoTesto etichetta={t('Cellulare', 'Mobile number')} icona="telefono" value={telefono} onChangeText={setTelefono} autoComplete="tel" textContentType="telephoneNumber" keyboardType="phone-pad" />
        <CampoTesto etichetta={t('Via e numero civico', 'Street and number')} icona="luogo" value={via} onChangeText={setVia} autoComplete="street-address" textContentType="fullStreetAddress" placeholder="Via Ugo Ojetti 134" />
        <View style={{ flexDirection: 'row', gap: spazio.due }}>
          <View style={{ flex: 1 }}>
            {estero ? (
              <CampoTesto etichetta={t('CAP', 'Postal code')} value={cap} onChangeText={(v) => setCap(pulisciCapLibero(v))} autoComplete="postal-code" textContentType="postalCode" autoCapitalize="characters" autoCorrect={false} maxLength={12} placeholder="SW1A 1AA" />
            ) : (
              <CampoTesto etichetta={t('CAP', 'Postal code')} value={cap} onChangeText={(v) => setCap(v.replace(/\D/g, '').slice(0, 5))} autoComplete="postal-code" textContentType="postalCode" inputMode="numeric" keyboardType="number-pad" placeholder="00137" />
            )}
          </View>
          <View style={{ flex: 1.6 }}>
            <CampoTesto etichetta={t('Città', 'City')} value={citta} onChangeText={setCitta} onSubmitEditing={salva} textContentType="addressCity" placeholder="Roma" />
          </View>
        </View>
        </>)}
        {errore ? <Messaggio>{errore}</Messaggio> : null}
        <Pulsante testo={t('Salva i dati', 'Save details')} icona="spunta" onPress={salva} inCorso={attesa} />
        {!apertoDa ? <Pulsante testo={t('Annulla', 'Cancel')} variante="fantasma" piccolo pieno={false} onPress={() => setAperto(false)} /> : null}
      </View>
    </Carta>
  )
}
