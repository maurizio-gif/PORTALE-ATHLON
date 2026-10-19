import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import {
  chiediCambioEmail,
  confermaCambioEmail,
  laMiaArea,
  leggiAnagrafica,
  salvaIndirizzo,
  salvaTelefono,
  type Anagrafica,
} from '@/api/lab'
import { emailValida } from '@/api/richieste'
import { CampoPaese } from '@/components/CampoPaese'
import { controllaResidenza, controllaTelefono, indirizzoInRiga } from '@/lib/anagrafica'
import { dataBreve } from '@/lib/metodoPagamento'
import { CODICE_FISCALE_NON_ATTRIBUITO, ITALIA, pulisciCapLibero } from '@/lib/residenteEstero'
import { spazio } from '@/theme'

import { inMemoria, prendi, ricorda } from './memoria'
import { FoglioFoto, FotoProfilo } from './profilo/FotoProfilo'
import { conFotoLocale, ricordaFotoLocale } from './profilo/fotoLocale'
import { CampoCodice, CampoTesto } from './ui/Campi'
import { Foglio } from './ui/Foglio'
import { Icona, type NomeIcona } from './ui/Icona'
import { Carta, Entra, Messaggio, Pulsante, Riga, SchedeInArrivo, Sezione } from './ui/kit'
import { PulsanteEsci } from './ui/Uscita'
import { F, usePalette } from './ui/tema'
import { colpetto } from './ui/Tocco'

// La sezione Profilo della Home: l'anagrafica del titolare com'e' sulla scheda del club, e i
// contatti che si possono cambiare da qui: email, telefono, indirizzo. Il
// resto (nome, nascita, codice fiscale) non si tocca dall'app.
//
// Se `portale-lab-anagrafica` non c'e' ancora, si vede tutto in sola lettura
// con quello che da' la mia area (portale_la_mia_area).
//
// **La foto del profilo** (17/10/2026) sta in cima, se il club ne ha una su PerfectGym: e' la sua foto. Nell'app si
// mostra qui e, dal 19/10/2026, nell'avatar della testata della Home (`profilo/AvatarFoto.tsx`) - non in Famiglia,
// non nel Calendario.
//
// **Si cambia da qui** (20/10/2026, `profilo/FotoProfilo.tsx`): chi non ha una foto trova al suo posto un invito con
// un anello che pulsa piano, chi ce l'ha un comando per cambiarla; scattare o scegliere, anteprima, conferma. L'invito
// c'e' anche sull'avatar della testata della Home, che apre lo stesso foglio senza passare da qui.
// Senza la funzione aggiornata, o in vista cliente, `foto_modificabile` non c'e' e la sezione e' quella di prima.

type Modifica = 'email' | 'telefono' | 'indirizzo' | 'foto' | null

// ---------------------------------------------------------------------------

function FoglioTelefono({ attuale, onChiudi, onSalvato }: { attuale: string | null; onChiudi: () => void; onSalvato: (a: Anagrafica) => void }) {
  const [telefono, setTelefono] = useState(attuale ?? '')
  const [attesa, setAttesa] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  async function salva() {
    setErrore(null)
    const c = controllaTelefono(telefono)
    if (!c.ok) return setErrore(c.errore)
    setAttesa(true)
    const r = await salvaTelefono(c.valore)
    setAttesa(false)
    if (!r.ok) return setErrore(r.errore)
    onSalvato(r.anagrafica)
  }
  return (
    <Foglio aperto titolo="Telefono" sottotitolo="Il numero su cui il club ti cerca per le lezioni e gli avvisi." onChiudi={onChiudi}>
      <CampoTesto
        etichetta="Cellulare"
        icona="telefono"
        value={telefono}
        onChangeText={setTelefono}
        onSubmitEditing={salva}
        autoFocus
        autoComplete="tel"
        textContentType="telephoneNumber"
        inputMode="tel"
        keyboardType="phone-pad"
        placeholder="333 1234567"
        errore={!!errore}
      />
      {errore ? <Messaggio>{errore}</Messaggio> : null}
      <Pulsante testo="Salva il telefono" icona="spunta" onPress={salva} inCorso={attesa} />
    </Foglio>
  )
}

function FoglioIndirizzo({ attuale, onChiudi, onSalvato }: { attuale: Anagrafica['indirizzo']; onChiudi: () => void; onSalvato: (a: Anagrafica) => void }) {
  const [via, setVia] = useState(attuale?.via ?? '')
  const [cap, setCap] = useState(attuale?.cap ?? '')
  const [citta, setCitta] = useState(attuale?.citta ?? '')
  // L'Italia e' il Paese di partenza; fuori dall'Italia il CAP e' libero.
  const [paese, setPaese] = useState(attuale?.paese || ITALIA)
  const [attesa, setAttesa] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  async function salva() {
    setErrore(null)
    const c = controllaResidenza({ via, cap, citta, paese })
    if (!c.ok) return setErrore(c.errore)
    setAttesa(true)
    const r = await salvaIndirizzo(c.valori)
    setAttesa(false)
    if (!r.ok) return setErrore(r.errore)
    onSalvato(r.anagrafica)
  }
  return (
    <Foglio aperto titolo="Indirizzo" sottotitolo="Dove abiti: è quello che il club usa per le ricevute e i documenti." onChiudi={onChiudi}>
      <CampoTesto etichetta="Via e numero civico" icona="luogo" value={via} onChangeText={setVia} autoComplete="street-address" textContentType="fullStreetAddress" placeholder="Via Ugo Ojetti 134" autoFocus />
      <CampoPaese variante="lab" conItalia value={paese} onChange={setPaese} />
      <View style={{ flexDirection: 'row', gap: spazio.due }}>
        <View style={{ flex: 1 }}>
          {paese === ITALIA ? (
            <CampoTesto etichetta="CAP" value={cap} onChangeText={(v) => setCap(v.replace(/\D/g, '').slice(0, 5))} autoComplete="postal-code" textContentType="postalCode" inputMode="numeric" keyboardType="number-pad" placeholder="00137" />
          ) : (
            <CampoTesto etichetta="CAP" value={cap} onChangeText={(v) => setCap(pulisciCapLibero(v))} autoComplete="postal-code" textContentType="postalCode" autoCapitalize="characters" autoCorrect={false} maxLength={12} placeholder="SW1A 1AA" />
          )}
        </View>
        <View style={{ flex: 1.6 }}>
          <CampoTesto etichetta="Città" value={citta} onChangeText={setCitta} onSubmitEditing={salva} textContentType="addressCity" placeholder="Roma" />
        </View>
      </View>
      {errore ? <Messaggio>{errore}</Messaggio> : null}
      <Pulsante testo="Salva l’indirizzo" icona="spunta" onPress={salva} inCorso={attesa} />
    </Foglio>
  )
}

/** L'email in due passi: il nuovo indirizzo, poi il codice che gli arriva. */
function FoglioEmail({ attuale, onChiudi, onSalvato }: { attuale: string | null; onChiudi: () => void; onSalvato: (a: Anagrafica) => void }) {
  const p = usePalette()
  const [email, setEmail] = useState('')
  const [codice, setCodice] = useState('')
  const [fase, setFase] = useState<'nuova' | 'codice'>('nuova')
  const [attesa, setAttesa] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const nuova = email.trim().toLowerCase()

  async function manda() {
    setErrore(null)
    if (!emailValida(nuova)) return setErrore('Scrivi un indirizzo email valido.')
    if (nuova === (attuale ?? '').toLowerCase()) return setErrore('È già la tua email.')
    setAttesa(true)
    const r = await chiediCambioEmail(nuova)
    setAttesa(false)
    if (!r.ok) return setErrore(r.errore)
    setCodice('')
    setFase('codice')
  }

  async function conferma() {
    setErrore(null)
    if (codice.length < 6) return setErrore('Il codice ha sei cifre.')
    setAttesa(true)
    const r = await confermaCambioEmail(nuova, codice)
    setAttesa(false)
    if (!r.ok) return setErrore(r.errore)
    onSalvato(r.anagrafica)
  }

  return (
    <Foglio
      aperto
      titolo={fase === 'nuova' ? 'Email' : 'Conferma la nuova email'}
      sottotitolo={fase === 'nuova' ? 'È l’email con cui entri e ricevi le comunicazioni del club.' : `Ti abbiamo mandato un codice di sei cifre a ${nuova}.`}
      onChiudi={onChiudi}
    >
      {fase === 'nuova' ? (
        <>
          {attuale ? (
            <View style={[stili.attuale, { backgroundColor: p.incavo }]}>
              <Text style={{ color: p.testoSecondario, fontFamily: F.semi, fontSize: 12.5 }}>Adesso</Text>
              <Text style={{ color: p.testo, fontFamily: F.bold, fontSize: 15 }}>{attuale}</Text>
            </View>
          ) : null}
          <CampoTesto
            etichetta="Nuova email"
            icona="email"
            value={email}
            onChangeText={setEmail}
            onSubmitEditing={manda}
            autoFocus
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            inputMode="email"
            keyboardType="email-address"
            placeholder="nome@esempio.it"
            errore={!!errore}
          />
          <Text style={[stili.nota, { color: p.testoSecondario }]}>
            Cambia davvero solo quando confermi il codice che arriva al nuovo indirizzo: fino ad allora resta quella di adesso.
          </Text>
          {errore ? <Messaggio>{errore}</Messaggio> : null}
          <Pulsante testo="Mandami il codice" icona="invia" onPress={manda} inCorso={attesa} />
        </>
      ) : (
        <>
          <CampoCodice value={codice} onChange={setCodice} onInvio={conferma} errore={!!errore} cifre={6} />
          {errore ? <Messaggio>{errore}</Messaggio> : null}
          <Pulsante testo="Conferma e cambia email" icona="spunta" onPress={conferma} inCorso={attesa} />
          <Pulsante testo="Usa un altro indirizzo" variante="fantasma" piccolo onPress={() => setFase('nuova')} disabilitato={attesa} />
        </>
      )}
    </Foglio>
  )
}

// ---------------------------------------------------------------------------

function ModificaPillola() {
  const p = usePalette()
  return (
    <View style={[stili.modifica, { backgroundColor: p.incavo }]} accessibilityLabel="Modifica">
      <Icona nome="modifica" size={16} colore={p.accento} />
    </View>
  )
}

/**
 * Il corpo della sezione Profilo della Home (17/10/2026): i contatti da
 * cambiare, i dati anagrafici, l'account. Il nucleo sta in Famiglia, e l'avviso
 * di un pagamento in sospeso nel «Da fare» della Home.
 */
export function ProfiloContenuto({ onAnagrafica }: { /** La Home lo usa per la testata: la foto, o l'invito a metterla. */ onAnagrafica?: (a: Anagrafica) => void }) {
  const p = usePalette()
  const giaLetta = inMemoria<{ ok: true; anagrafica: Anagrafica }>('anagrafica')
  const [dati, setDati] = useState<Anagrafica | null>(giaLetta ? conFotoLocale(giaLetta.anagrafica) : null)
  const [modificabile, setModificabile] = useState(!!giaLetta)
  const [errore, setErrore] = useState<string | null>(null)
  const [modifica, setModifica] = useState<Modifica>(null)
  const [fatto, setFatto] = useState<string | null>(null)

  const carica = useCallback(async () => {
    setErrore(null)
    const [r, area] = await Promise.all([prendi('anagrafica', leggiAnagrafica), prendi('area', laMiaArea)])
    const trovata = area.ok && area.area.trovato ? area.area : null
    if (r.ok) {
      setDati(conFotoLocale(r.anagrafica))
      setModificabile(true)
      return
    }
    // Senza la funzione dell'anagrafica: i dati della mia area, in sola lettura.
    const t = trovata?.persone.find((x) => x.member_id === trovata.titolare)
    if (r.nonAttiva && t) {
      setDati({ ...t, sesso: null, luogo_nascita: null, codice_fiscale: null, indirizzo: null })
      setModificabile(false)
      return
    }
    setErrore(r.errore)
  }, [])

  useEffect(() => {
    carica()
  }, [carica])

  // L'avviso di «salvato» resta qualche secondo, poi se ne va.
  useEffect(() => {
    if (!fatto) return
    const t = setTimeout(() => setFatto(null), 4000)
    return () => clearTimeout(t)
  }, [fatto])

  function salvato(cosa: string) {
    return (a: Anagrafica) => {
      colpetto('ok')
      const conFoto = conFotoLocale(a)
      ricorda('anagrafica', { ok: true, anagrafica: conFoto })
      setDati(conFoto)
      setModifica(null)
      setFatto(cosa)
    }
  }

  // La foto: se le misure non sono ancora pronte su PerfectGym (`inArrivo`) si tiene quella appena scelta, per un po',
  // al posto del link che non c'e' ancora; altrimenti la funzione ha gia' risposto col link nuovo.
  function fotoSalvata(a: Anagrafica, esito: { anteprima: string; inArrivo: boolean }) {
    ricordaFotoLocale(esito.inArrivo ? esito.anteprima : null)
    salvato(esito.inArrivo ? 'Foto salvata. Per la segreteria sarà pronta fra qualche minuto.' : 'Foto aggiornata.')(a)
  }

  // La Home sa cosi' se la foto c'e', e smette di invitare appena si mette.
  useEffect(() => {
    if (dati) onAnagrafica?.(dati)
  }, [dati, onAnagrafica])

  if (errore && !dati) {
    return (
      <View style={{ gap: spazio.tre }}>
        <Messaggio>{errore}</Messaggio>
        <Pulsante testo="Riprova" icona="aggiorna" onPress={carica} />
      </View>
    )
  }
  if (!dati) return <SchedeInArrivo quante={2} />

  const contatti: { chiave: Exclude<Modifica, null | 'foto'>; icona: NomeIcona; titolo: string; valore: string | null; vuoto: string }[] = [
    { chiave: 'email', icona: 'email', titolo: 'Email', valore: dati.email, vuoto: 'Nessuna email' },
    { chiave: 'telefono', icona: 'telefono', titolo: 'Telefono', valore: dati.telefono, vuoto: 'Nessun numero' },
    { chiave: 'indirizzo', icona: 'luogo', titolo: 'Indirizzo', valore: indirizzoInRiga(dati.indirizzo), vuoto: modificabile ? 'Aggiungi il tuo indirizzo' : 'Non disponibile' },
  ]
  const tutti: { icona: NomeIcona; titolo: string; valore: string | null }[] = [
    { icona: 'persona', titolo: 'Nome e cognome', valore: [dati.nome, dati.cognome].filter(Boolean).join(' ') || null },
    { icona: 'torta', titolo: 'Data di nascita', valore: dataBreve(dati.data_nascita) },
    { icona: 'luogo', titolo: 'Luogo di nascita', valore: dati.luogo_nascita },
    { icona: 'impronta', titolo: 'Codice fiscale', valore: dati.residente_estero ? CODICE_FISCALE_NON_ATTRIBUITO : dati.codice_fiscale },
    { icona: 'tessera', titolo: 'Numero Utente', valore: dati.numero },
  ]
  const anagrafici = tutti.filter((x) => x.valore)
  // Chi puo' cambiare la foto ha sempre il suo posto in cima (la foto, o l'invito); chi no, solo se la foto c'e'.
  const puoCambiare = modificabile && dati.foto_modificabile === true
  const mostraFoto = !!dati.foto || puoCambiare
  // Con la foto in cima le sezioni entrano una dopo l'altra, partendo dal suo posto.
  const da = mostraFoto ? 1 : 0

  return (
    <View style={{ gap: spazio.quattro + 4 }}>
      {fatto ? <Messaggio tono="ok">{fatto}</Messaggio> : null}

      {mostraFoto ? <FotoProfilo url={dati.foto ?? null} puoCambiare={puoCambiare} indice={0} onCambia={() => setModifica('foto')} /> : null}

      <Entra indice={da}>
        <Sezione titolo="Contatti" destra={modificabile ? <Text style={{ color: p.testoTerzo, fontFamily: F.semi, fontSize: 12.5 }}>tocca per cambiare</Text> : undefined}>
          {!modificabile ? <Messaggio tono="attenzione" icona="lucchetto">Al momento i contatti non si possono modificare da qui: li vedi come risultano sulla tua scheda.</Messaggio> : null}
          <Carta style={{ paddingVertical: spazio.due }}>
            {contatti.map((c, i) => (
              <Riga
                key={c.chiave}
                prima={i === 0}
                icona={c.icona}
                tono={c.chiave === 'email' ? 'accento' : c.chiave === 'telefono' ? 'blu' : 'ok'}
                titolo={c.titolo}
                sotto={
                  <Text style={{ color: c.valore ? p.testo : p.testoTerzo, fontFamily: c.valore ? F.semi : F.medio, fontSize: 14, lineHeight: 19 }}>{c.valore ?? c.vuoto}</Text>
                }
                stileTitolo={{ fontSize: 12, fontFamily: F.bold, color: p.testoSecondario }}
                coda={modificabile ? <ModificaPillola /> : undefined}
                onPress={modificabile ? () => setModifica(c.chiave) : undefined}
              />
            ))}
          </Carta>
        </Sezione>
      </Entra>

      <Entra indice={da + 1}>
        <Sezione titolo="Dati anagrafici" destra={<Icona nome="lucchetto" size={16} colore={p.testoTerzo} />}>
          <Carta style={{ paddingVertical: spazio.due }}>
            {anagrafici.map((x, i) => (
              <Riga
                key={x.titolo}
                prima={i === 0}
                icona={x.icona}
                tono="neutro"
                titolo={x.titolo}
                sotto={<Text style={{ color: p.testo, fontFamily: F.semi, fontSize: 14, letterSpacing: x.titolo === 'Codice fiscale' ? 1 : 0 }}>{x.valore}</Text>}
                stileTitolo={{ fontSize: 12, fontFamily: F.bold, color: p.testoSecondario }}
              />
            ))}
          </Carta>
          <Text style={[stili.nota, { color: p.testoTerzo, paddingHorizontal: 4 }]}>
            Vengono dalla tua scheda del club e non si modificano dall’app.
          </Text>
        </Sezione>
      </Entra>

      <Entra indice={da + 2}>
        <Sezione titolo="Account">
          <PulsanteEsci email={dati.email} testo="Esci dall’account" />
        </Sezione>
      </Entra>

      {modifica === 'foto' ? <FoglioFoto attuale={dati.foto ?? null} onChiudi={() => setModifica(null)} onSalvato={fotoSalvata} /> : null}
      {modifica === 'telefono' ? <FoglioTelefono attuale={dati.telefono} onChiudi={() => setModifica(null)} onSalvato={salvato('Telefono aggiornato.')} /> : null}
      {modifica === 'indirizzo' ? <FoglioIndirizzo attuale={dati.indirizzo} onChiudi={() => setModifica(null)} onSalvato={salvato('Indirizzo aggiornato.')} /> : null}
      {modifica === 'email' ? (
        <FoglioEmail attuale={dati.email} onChiudi={() => setModifica(null)} onSalvato={salvato('Email cambiata: da adesso entri con quella nuova.')} />
      ) : null}
    </View>
  )
}

const stili = StyleSheet.create({
  attuale: { borderRadius: 18, padding: spazio.tre, gap: 2 },
  modifica: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  nota: { fontSize: 13, lineHeight: 19, fontFamily: F.medio },
})
