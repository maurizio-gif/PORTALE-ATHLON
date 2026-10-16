import { useState } from 'react'
import { Text, View } from 'react-native'

import { salvaDatiAbbonamento, type CambiDati, type PersonaDati } from '@/api/abbonamento'
import { spazio } from '@/theme'

import { CampoTesto } from '../ui/Campi'
import { Carta, Messaggio, Pulsante } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { colpetto } from '../ui/Tocco'

// La correzione dei dati del contratto, senza uscire dall'acquisto (16/10/2026):
// codice fiscale, cellulare e indirizzo. Nome, cognome e data di nascita sono
// l'identita' e si cambiano dal club, quindi qui si leggono soltanto.
// Si mandano solo i campi che sono cambiati.

export function CorreggiDati({
  persona,
  titolo,
  apertoDa = false,
  mancanti,
  onSalvato,
}: {
  persona: PersonaDati
  titolo: string
  /** Si apre da solo: mancano dei dati e senza non si va avanti. */
  apertoDa?: boolean
  mancanti?: string[]
  onSalvato: () => void
}) {
  const p = usePalette()
  const [aperto, setAperto] = useState(apertoDa)
  const [cf, setCf] = useState(persona.codice_fiscale ?? '')
  const [telefono, setTelefono] = useState(persona.telefono ?? '')
  const [via, setVia] = useState(persona.indirizzo?.via ?? '')
  const [cap, setCap] = useState(persona.indirizzo?.cap ?? '')
  const [citta, setCitta] = useState(persona.indirizzo?.citta ?? '')
  const [errore, setErrore] = useState<string | null>(null)
  const [attesa, setAttesa] = useState(false)

  async function salva() {
    const cambi: CambiDati = {}
    const cfNuovo = cf.replace(/\s/g, '').toUpperCase()
    if (cfNuovo !== (persona.codice_fiscale ?? '').toUpperCase()) cambi.codice_fiscale = cfNuovo
    if (telefono.trim() !== (persona.telefono ?? '')) cambi.telefono = telefono.trim()
    if (via.trim() !== (persona.indirizzo?.via ?? '') || cap !== (persona.indirizzo?.cap ?? '') || citta.trim() !== (persona.indirizzo?.citta ?? '')) {
      cambi.indirizzo = { via: via.trim(), cap, citta: citta.trim() }
    }
    if (!Object.keys(cambi).length) {
      setErrore('Non hai cambiato niente.')
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
    return <Pulsante testo={`Correggi i dati${persona.ruolo === 'genitore' ? ' del genitore' : ''}`} variante="fantasma" piccolo pieno={false} onPress={() => setAperto(true)} />
  }

  return (
    <Carta piatta>
      <View style={{ gap: spazio.tre }}>
        <Text style={{ color: p.testo, fontFamily: F.extra, fontSize: 16 }}>{titolo}</Text>
        {mancanti?.length ? <Messaggio tono="attenzione">{`Per il contratto serve: ${mancanti.join(', ')}.`}</Messaggio> : null}
        <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 13, lineHeight: 19 }}>
          {`${persona.nome} ${persona.cognome}${persona.data_nascita ? `, nato/a il ${persona.data_nascita.split('-').reverse().join('/')}` : ''}. Nome e data di nascita si cambiano dal club.`}
        </Text>
        <CampoTesto etichetta="Codice fiscale" value={cf} onChangeText={(v) => setCf(v.toUpperCase())} autoCapitalize="characters" autoCorrect={false} maxLength={16} placeholder="RSSMRA80A01H501U" />
        <CampoTesto etichetta="Cellulare" icona="telefono" value={telefono} onChangeText={setTelefono} autoComplete="tel" textContentType="telephoneNumber" keyboardType="phone-pad" />
        <CampoTesto etichetta="Via e numero civico" icona="luogo" value={via} onChangeText={setVia} autoComplete="street-address" textContentType="fullStreetAddress" placeholder="Via Ugo Ojetti 134" />
        <View style={{ flexDirection: 'row', gap: spazio.due }}>
          <View style={{ flex: 1 }}>
            <CampoTesto etichetta="CAP" value={cap} onChangeText={(v) => setCap(v.replace(/\D/g, '').slice(0, 5))} autoComplete="postal-code" textContentType="postalCode" inputMode="numeric" keyboardType="number-pad" placeholder="00137" />
          </View>
          <View style={{ flex: 1.6 }}>
            <CampoTesto etichetta="Città" value={citta} onChangeText={setCitta} onSubmitEditing={salva} textContentType="addressCity" placeholder="Roma" />
          </View>
        </View>
        {errore ? <Messaggio>{errore}</Messaggio> : null}
        <Pulsante testo="Salva i dati" icona="spunta" onPress={salva} inCorso={attesa} />
        {!apertoDa ? <Pulsante testo="Annulla" variante="fantasma" piccolo pieno={false} onPress={() => setAperto(false)} /> : null}
      </View>
    </Carta>
  )
}
