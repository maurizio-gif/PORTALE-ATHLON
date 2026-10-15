import { LinearGradient } from 'expo-linear-gradient'
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
  type PersonaArea,
} from '@/api/lab'
import { emailValida } from '@/api/richieste'
import { controllaResidenza, controllaTelefono, indirizzoInRiga } from '@/lib/anagrafica'
import { dataBreve } from '@/lib/metodoPagamento'
import { spazio } from '@/theme'

import { inMemoria, prendi, ricorda } from './memoria'
import { CampoCodice, CampoTesto } from './ui/Campi'
import { Foglio } from './ui/Foglio'
import { Icona, type NomeIcona } from './ui/Icona'
import { AvvisoDebito, BollinoDebito } from './ui/Irregolarita'
import { Avatar, Carta, Entra, Messaggio, Pulsante, Riga, SchedeInArrivo, Sezione } from './ui/kit'
import { Schermata } from './ui/Schermata'
import { PulsanteEsci } from './ui/Uscita'
import { F, NOTTE, usePalette } from './ui/tema'
import { colpetto } from './ui/Tocco'

// Il mio profilo: l'anagrafica del titolare com'e' sulla scheda del club, e i
// contatti che si possono cambiare da qui: email, telefono, indirizzo. Il
// resto (nome, nascita, codice fiscale) non si tocca dall'app.
//
// Se `portale-lab-anagrafica` non c'e' ancora, si vede tutto in sola lettura
// con quello che da' la mia area (portale_la_mia_area).

type Modifica = 'email' | 'telefono' | 'indirizzo' | null

function eta(nascita: string | null): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(nascita ?? '')
  if (!m) return null
  const oggi = new Date()
  let anni = oggi.getFullYear() - Number(m[1])
  if (oggi.getMonth() + 1 < Number(m[2]) || (oggi.getMonth() + 1 === Number(m[2]) && oggi.getDate() < Number(m[3]))) anni--
  return anni
}

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
  const [attesa, setAttesa] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  async function salva() {
    setErrore(null)
    const c = controllaResidenza({ via, cap, citta })
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
      <View style={{ flexDirection: 'row', gap: spazio.due }}>
        <View style={{ flex: 1 }}>
          <CampoTesto etichetta="CAP" value={cap} onChangeText={(v) => setCap(v.replace(/\D/g, '').slice(0, 5))} autoComplete="postal-code" textContentType="postalCode" inputMode="numeric" keyboardType="number-pad" placeholder="00137" />
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
      sottotitolo={fase === 'nuova' ? 'È l’email con cui entri nel laboratorio e ricevi le comunicazioni del club.' : `Ti abbiamo mandato un codice di sei cifre a ${nuova}.`}
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

/** La testata: l'avatar grande, il nome, e tre cifre come nei profili delle app fitness. */
function Testata({ a, famiglia }: { a: Anagrafica; famiglia: number | null }) {
  const anni = eta(a.data_nascita)
  const cifre = [
    { valore: anni != null ? String(anni) : '—', etichetta: 'Anni' },
    { valore: a.numero ?? '—', etichetta: 'Tessera' },
    { valore: famiglia != null ? String(famiglia) : '—', etichetta: 'Famiglia' },
  ]
  return (
    <LinearGradient colors={NOTTE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.testata}>
      <View style={stili.bagliore} />
      <Avatar nome={a.nome} cognome={a.cognome} size={92} anello="rgba(255,255,255,0.16)" />
      <View style={{ alignItems: 'center', gap: 6 }}>
        <Text style={stili.nome}>{[a.nome, a.cognome].filter(Boolean).join(' ') || 'Il mio profilo'}</Text>
        <View style={stili.chip}>
          <Icona nome="scudo" size={13} colore="#6DD58C" />
          <Text style={stili.chipTesto}>TITOLARE</Text>
        </View>
      </View>
      <View style={stili.cifre}>
        {cifre.map((c, i) => (
          <View key={c.etichetta} style={[stili.cifra, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: 'rgba(255,255,255,0.14)' }]}>
            <Text style={stili.cifraValore} numberOfLines={1}>
              {c.valore}
            </Text>
            <Text style={stili.cifraEtichetta}>{c.etichetta}</Text>
          </View>
        ))}
      </View>
    </LinearGradient>
  )
}

function ModificaPillola() {
  const p = usePalette()
  return (
    <View style={[stili.modifica, { backgroundColor: p.incavo }]} accessibilityLabel="Modifica">
      <Icona nome="modifica" size={16} colore={p.accento} />
    </View>
  )
}

export function Profilo() {
  const p = usePalette()
  const giaLetta = inMemoria<{ ok: true; anagrafica: Anagrafica }>('anagrafica')
  const areaLetta = inMemoria<Awaited<ReturnType<typeof laMiaArea>>>('area')
  const [dati, setDati] = useState<Anagrafica | null>(giaLetta?.anagrafica ?? null)
  const [famiglia, setFamiglia] = useState<number | null>(areaLetta?.ok && areaLetta.area.trovato ? areaLetta.area.persone.length - 1 : null)
  const [persone, setPersone] = useState<PersonaArea[]>(areaLetta?.ok && areaLetta.area.trovato ? areaLetta.area.persone : [])
  const [modificabile, setModificabile] = useState(!!giaLetta)
  const [errore, setErrore] = useState<string | null>(null)
  const [modifica, setModifica] = useState<Modifica>(null)
  const [fatto, setFatto] = useState<string | null>(null)

  const carica = useCallback(async () => {
    setErrore(null)
    const [r, area] = await Promise.all([prendi('anagrafica', leggiAnagrafica), prendi('area', laMiaArea)])
    const trovata = area.ok && area.area.trovato ? area.area : null
    if (trovata) {
      setFamiglia(trovata.persone.length - 1)
      setPersone(trovata.persone)
    }
    if (r.ok) {
      setDati(r.anagrafica)
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
      ricorda('anagrafica', { ok: true, anagrafica: a })
      setDati(a)
      setModifica(null)
      setFatto(cosa)
    }
  }

  if (errore && !dati) {
    return (
      <Schermata sopratitolo="Laboratorio" titolo="Il mio profilo" indietro="/lab" barra={false}>
        <Messaggio>{errore}</Messaggio>
        <Pulsante testo="Riprova" icona="aggiorna" onPress={carica} />
      </Schermata>
    )
  }
  if (!dati) {
    return (
      <Schermata sopratitolo="Laboratorio" titolo="Il mio profilo" indietro="/lab" barra={false}>
        <SchedeInArrivo quante={2} />
      </Schermata>
    )
  }

  const contatti: { chiave: Exclude<Modifica, null>; icona: NomeIcona; titolo: string; valore: string | null; vuoto: string }[] = [
    { chiave: 'email', icona: 'email', titolo: 'Email', valore: dati.email, vuoto: 'Nessuna email' },
    { chiave: 'telefono', icona: 'telefono', titolo: 'Telefono', valore: dati.telefono, vuoto: 'Nessun numero' },
    { chiave: 'indirizzo', icona: 'luogo', titolo: 'Indirizzo', valore: indirizzoInRiga(dati.indirizzo), vuoto: modificabile ? 'Aggiungi il tuo indirizzo' : 'Non disponibile' },
  ]
  const tutti: { icona: NomeIcona; titolo: string; valore: string | null }[] = [
    { icona: 'persona', titolo: 'Nome e cognome', valore: [dati.nome, dati.cognome].filter(Boolean).join(' ') || null },
    { icona: 'torta', titolo: 'Data di nascita', valore: dataBreve(dati.data_nascita) },
    { icona: 'luogo', titolo: 'Luogo di nascita', valore: dati.luogo_nascita },
    { icona: 'impronta', titolo: 'Codice fiscale', valore: dati.codice_fiscale },
    { icona: 'tessera', titolo: 'Numero di tessera', valore: dati.numero },
  ]
  const anagrafici = tutti.filter((x) => x.valore)

  return (
    <Schermata sopratitolo="Laboratorio" titolo="Il mio profilo" indietro="/lab" barra={false} nascondiTitolo>
      <Entra indice={0}>
        <Testata a={dati} famiglia={famiglia} />
      </Entra>

      <AvvisoDebito persone={persone} />

      {persone.length > 1 || persone.some((x) => x.debito) ? (
        <Sezione titolo="Il tuo nucleo" conteggio={persone.length}>
          <Carta style={{ paddingVertical: spazio.due }}>
            {persone.map((x, i) => (
              <Riga
                key={x.member_id}
                prima={i === 0}
                testa={<Avatar nome={x.nome} cognome={x.cognome} size={40} />}
                titolo={[x.nome, x.cognome].filter(Boolean).join(' ') || 'Socio'}
                sotto={
                  <View style={{ gap: 4 }}>
                    <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 13.5 }}>{x.titolare ? 'Tu, titolare' : 'Familiare'}</Text>
                    <BollinoDebito debito={x.debito} />
                  </View>
                }
              />
            ))}
          </Carta>
        </Sezione>
      ) : null}

      {fatto ? <Messaggio tono="ok">{fatto}</Messaggio> : null}

      <Entra indice={1}>
        <Sezione titolo="Contatti" destra={modificabile ? <Text style={{ color: p.testoTerzo, fontFamily: F.semi, fontSize: 12.5 }}>tocca per cambiare</Text> : undefined}>
          {!modificabile ? <Messaggio tono="attenzione" icona="lucchetto">La modifica dei contatti non è ancora attiva nel laboratorio: per ora li vedi in sola lettura.</Messaggio> : null}
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

      <Entra indice={2}>
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

      <Entra indice={3}>
        <Sezione titolo="Account">
          <PulsanteEsci email={dati.email} testo="Esci dall’account" />
        </Sezione>
      </Entra>

      {modifica === 'telefono' ? <FoglioTelefono attuale={dati.telefono} onChiudi={() => setModifica(null)} onSalvato={salvato('Telefono aggiornato.')} /> : null}
      {modifica === 'indirizzo' ? <FoglioIndirizzo attuale={dati.indirizzo} onChiudi={() => setModifica(null)} onSalvato={salvato('Indirizzo aggiornato.')} /> : null}
      {modifica === 'email' ? (
        <FoglioEmail attuale={dati.email} onChiudi={() => setModifica(null)} onSalvato={salvato('Email cambiata: da adesso entri con quella nuova.')} />
      ) : null}
    </Schermata>
  )
}

const stili = StyleSheet.create({
  testata: { borderRadius: 32, padding: spazio.quattro, alignItems: 'center', gap: spazio.tre, overflow: 'hidden' },
  bagliore: { position: 'absolute', width: 260, height: 260, borderRadius: 130, top: -150, backgroundColor: '#FF5701', opacity: 0.35, filter: 'blur(60px)' } as object,
  nome: { color: '#fff', fontFamily: F.extra, fontSize: 26, letterSpacing: -0.8, textAlign: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 8, borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 8, paddingVertical: 3 },
  chipTesto: { color: 'rgba(255,255,255,0.85)', fontFamily: F.extra, fontSize: 10, letterSpacing: 1 },
  cifre: { flexDirection: 'row', alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 22, paddingVertical: spazio.tre, marginTop: spazio.uno },
  cifra: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: 4 },
  cifraValore: { color: '#fff', fontFamily: F.extra, fontSize: 20, letterSpacing: -0.5 },
  cifraEtichetta: { color: 'rgba(255,255,255,0.55)', fontFamily: F.semi, fontSize: 11.5 },
  modifica: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  attuale: { borderRadius: 18, padding: spazio.tre, gap: 2 },
  nota: { fontSize: 13, lineHeight: 19, fontFamily: F.medio },
})
