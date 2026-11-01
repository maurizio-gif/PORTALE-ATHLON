import { router } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { Linking, StyleSheet, Text, View } from 'react-native'

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
import { PRIVACY_URL } from '@/lib/guestPass'
import { dataBreve } from '@/lib/metodoPagamento'
import { CODICE_FISCALE_NON_ATTRIBUITO, ITALIA, pulisciCapLibero } from '@/lib/residenteEstero'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { inMemoria, prendi, ricorda } from './memoria'
import { FoglioFoto, FotoProfilo } from './profilo/FotoProfilo'
import { conFotoLocale, ricordaFotoLocale } from './profilo/fotoLocale'
import { CampoCodice, CampoTesto } from './ui/Campi'
import { Foglio } from './ui/Foglio'
import { Icona, type NomeIcona } from './ui/Icona'
import { Carta, Entra, Messaggio, Pulsante, Riga, SchedeInArrivo, Sezione } from './ui/kit'
import { SceltaLingua } from './ui/SceltaLingua'
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
    <Foglio aperto titolo={t('Telefono', 'Phone')} sottotitolo={t('Il numero su cui il club ti cerca per le lezioni e gli avvisi.', 'The number the club uses to reach you about classes and notices.')} onChiudi={onChiudi}>
      <CampoTesto
        etichetta={t('Cellulare', 'Mobile')}
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
      <Pulsante testo={t('Salva il telefono', 'Save phone number')} icona="spunta" onPress={salva} inCorso={attesa} />
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
    <Foglio aperto titolo={t('Indirizzo', 'Address')} sottotitolo={t('Dove abiti: è quello che il club usa per le ricevute e i documenti.', 'Where you live: the club uses it for receipts and documents.')} onChiudi={onChiudi}>
      <CampoTesto etichetta={t('Via e numero civico', 'Street and number')} icona="luogo" value={via} onChangeText={setVia} autoComplete="street-address" textContentType="fullStreetAddress" placeholder="Via Ugo Ojetti 134" autoFocus />
      <CampoPaese variante="lab" conItalia value={paese} onChange={setPaese} />
      <View style={{ flexDirection: 'row', gap: spazio.due }}>
        <View style={{ flex: 1 }}>
          {paese === ITALIA ? (
            <CampoTesto etichetta={t('CAP', 'Postcode')} value={cap} onChangeText={(v) => setCap(v.replace(/\D/g, '').slice(0, 5))} autoComplete="postal-code" textContentType="postalCode" inputMode="numeric" keyboardType="number-pad" placeholder="00137" />
          ) : (
            <CampoTesto etichetta={t('CAP', 'Postcode')} value={cap} onChangeText={(v) => setCap(pulisciCapLibero(v))} autoComplete="postal-code" textContentType="postalCode" autoCapitalize="characters" autoCorrect={false} maxLength={12} placeholder="SW1A 1AA" />
          )}
        </View>
        <View style={{ flex: 1.6 }}>
          <CampoTesto etichetta={t('Città', 'City')} value={citta} onChangeText={setCitta} onSubmitEditing={salva} textContentType="addressCity" placeholder="Roma" />
        </View>
      </View>
      {errore ? <Messaggio>{errore}</Messaggio> : null}
      <Pulsante testo={t('Salva l’indirizzo', 'Save address')} icona="spunta" onPress={salva} inCorso={attesa} />
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
    if (!emailValida(nuova)) return setErrore(t('Scrivi un indirizzo email valido.', 'Enter a valid email address.'))
    if (nuova === (attuale ?? '').toLowerCase()) return setErrore(t('È già la tua email.', 'That’s already your email.'))
    setAttesa(true)
    const r = await chiediCambioEmail(nuova)
    setAttesa(false)
    if (!r.ok) return setErrore(r.errore)
    setCodice('')
    setFase('codice')
  }

  async function conferma() {
    setErrore(null)
    if (codice.length < 6) return setErrore(t('Il codice ha sei cifre.', 'The code has six digits.'))
    setAttesa(true)
    const r = await confermaCambioEmail(nuova, codice)
    setAttesa(false)
    if (!r.ok) return setErrore(r.errore)
    onSalvato(r.anagrafica)
  }

  return (
    <Foglio
      aperto
      titolo={fase === 'nuova' ? t('Email', 'Email') : t('Conferma la nuova email', 'Confirm your new email')}
      sottotitolo={fase === 'nuova' ? t('È l’email con cui entri e ricevi le comunicazioni del club.', 'It’s the email you sign in with and where you get club updates.') : t(`Ti abbiamo mandato un codice di sei cifre a ${nuova}.`, `We sent a six-digit code to ${nuova}.`)}
      onChiudi={onChiudi}
    >
      {fase === 'nuova' ? (
        <>
          {attuale ? (
            <View style={[stili.attuale, { backgroundColor: p.incavo }]}>
              <Text style={{ color: p.testoSecondario, fontFamily: F.semi, fontSize: 12.5 }}>{t('Adesso', 'Current')}</Text>
              <Text style={{ color: p.testo, fontFamily: F.bold, fontSize: 15 }}>{attuale}</Text>
            </View>
          ) : null}
          <CampoTesto
            etichetta={t('Nuova email', 'New email')}
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
            placeholder={t('nome@esempio.it', 'name@example.com')}
            errore={!!errore}
          />
          <Text style={[stili.nota, { color: p.testoSecondario }]}>
            {t('Cambia davvero solo quando confermi il codice che arriva al nuovo indirizzo: fino ad allora resta quella di adesso.', 'It only changes once you confirm the code sent to the new address: until then your current email stays.')}
          </Text>
          {errore ? <Messaggio>{errore}</Messaggio> : null}
          <Pulsante testo={t('Mandami il codice', 'Send me the code')} icona="invia" onPress={manda} inCorso={attesa} />
        </>
      ) : (
        <>
          <CampoCodice value={codice} onChange={setCodice} onInvio={conferma} errore={!!errore} cifre={6} />
          {errore ? <Messaggio>{errore}</Messaggio> : null}
          <Pulsante testo={t('Conferma e cambia email', 'Confirm and change email')} icona="spunta" onPress={conferma} inCorso={attesa} />
          <Pulsante testo={t('Usa un altro indirizzo', 'Use another address')} variante="fantasma" piccolo onPress={() => setFase('nuova')} disabilitato={attesa} />
        </>
      )}
    </Foglio>
  )
}

// ---------------------------------------------------------------------------

function ModificaPillola() {
  const p = usePalette()
  return (
    <View style={[stili.modifica, { backgroundColor: p.incavo }]} accessibilityLabel={t('Modifica', 'Edit')}>
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
    const tit = trovata?.persone.find((x) => x.member_id === trovata.titolare)
    if (r.nonAttiva && tit) {
      setDati({ ...tit, sesso: null, luogo_nascita: null, codice_fiscale: null, indirizzo: null })
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
    const timer = setTimeout(() => setFatto(null), 4000)
    return () => clearTimeout(timer)
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
    salvato(esito.inArrivo ? t('Foto salvata. Per la segreteria sarà pronta fra qualche minuto.', 'Photo saved. It’ll be ready for the front desk in a few minutes.') : t('Foto aggiornata.', 'Photo updated.'))(a)
  }

  // La Home sa cosi' se la foto c'e', e smette di invitare appena si mette.
  useEffect(() => {
    if (dati) onAnagrafica?.(dati)
  }, [dati, onAnagrafica])

  if (errore && !dati) {
    return (
      <View style={{ gap: spazio.tre }}>
        <Messaggio>{errore}</Messaggio>
        <Pulsante testo={t('Riprova', 'Try again')} icona="aggiorna" onPress={carica} />
      </View>
    )
  }
  if (!dati) return <SchedeInArrivo quante={2} />

  const contatti: { chiave: Exclude<Modifica, null | 'foto'>; icona: NomeIcona; titolo: string; valore: string | null; vuoto: string }[] = [
    { chiave: 'email', icona: 'email', titolo: t('Email', 'Email'), valore: dati.email, vuoto: t('Nessuna email', 'No email') },
    { chiave: 'telefono', icona: 'telefono', titolo: t('Telefono', 'Phone'), valore: dati.telefono, vuoto: t('Nessun numero', 'No number') },
    { chiave: 'indirizzo', icona: 'luogo', titolo: t('Indirizzo', 'Address'), valore: indirizzoInRiga(dati.indirizzo), vuoto: modificabile ? t('Aggiungi il tuo indirizzo', 'Add your address') : t('Non disponibile', 'Not available') },
  ]
  const tutti: { icona: NomeIcona; titolo: string; valore: string | null }[] = [
    { icona: 'persona', titolo: t('Nome e cognome', 'Full name'), valore: [dati.nome, dati.cognome].filter(Boolean).join(' ') || null },
    { icona: 'torta', titolo: t('Data di nascita', 'Date of birth'), valore: dataBreve(dati.data_nascita) },
    { icona: 'luogo', titolo: t('Luogo di nascita', 'Place of birth'), valore: dati.luogo_nascita },
    { icona: 'impronta', titolo: t('Codice fiscale', 'Tax code'), valore: dati.residente_estero ? CODICE_FISCALE_NON_ATTRIBUITO : dati.codice_fiscale },
    { icona: 'tessera', titolo: t('Numero Utente', 'Member number'), valore: dati.numero },
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
        <Sezione titolo={t('Contatti', 'Contact details')} destra={modificabile ? <Text style={{ color: p.testoTerzo, fontFamily: F.semi, fontSize: 12.5 }}>{t('tocca per cambiare', 'tap to change')}</Text> : undefined}>
          {!modificabile ? <Messaggio tono="attenzione" icona="lucchetto">{t('Al momento i contatti non si possono modificare da qui: li vedi come risultano sulla tua scheda.', 'Right now your contact details can’t be changed here: you see them as they are on your profile.')}</Messaggio> : null}
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
        <Sezione titolo={t('Dati anagrafici', 'Personal details')} destra={<Icona nome="lucchetto" size={16} colore={p.testoTerzo} />}>
          <Carta style={{ paddingVertical: spazio.due }}>
            {anagrafici.map((x, i) => (
              <Riga
                key={x.titolo}
                prima={i === 0}
                icona={x.icona}
                tono="neutro"
                titolo={x.titolo}
                sotto={<Text style={{ color: p.testo, fontFamily: F.semi, fontSize: 14, letterSpacing: x.icona === 'impronta' ? 1 : 0 }}>{x.valore}</Text>}
                stileTitolo={{ fontSize: 12, fontFamily: F.bold, color: p.testoSecondario }}
              />
            ))}
          </Carta>
          <Text style={[stili.nota, { color: p.testoTerzo, paddingHorizontal: 4 }]}>
            {t('Vengono dalla tua scheda del club e non si modificano dall’app.', 'They come from your club profile and can’t be changed in the app.')}
          </Text>
        </Sezione>
      </Entra>

      <Entra indice={da + 2}>
        <Sezione titolo={t('Account', 'Account')}>
          {/* L'informativa generale del club (20/10/2026): come si trattano i dati e come far valere i propri diritti. */}
          <Carta style={{ paddingVertical: spazio.due }}>
            <Riga
              prima
              icona="scudo"
              tono="neutro"
              titolo={t('Informativa privacy', 'Privacy notice')}
              sotto={t('Come il club tratta i tuoi dati e come esercitare i tuoi diritti.', 'How the club handles your data and how to exercise your rights.')}
              stileTitolo={{ fontSize: 14, fontFamily: F.bold, color: p.testo }}
              onPress={() => Linking.openURL(PRIVACY_URL)}
            />
          </Carta>
          {/* La lingua dell'app (21/10/2026): italiano o inglese, con le parole inglesi di PerfectGym (lib/lingua.ts). */}
          <Carta style={{ gap: spazio.due }}>
            <Text style={{ color: p.testo, fontFamily: F.bold, fontSize: 14 }}>{t('Lingua', 'Language')}</Text>
            <SceltaLingua />
          </Carta>
          <PulsanteEsci email={dati.email} testo={t('Esci dall’account', 'Sign out')} />
          {/* Elimina account (02/11/2026; Apple 5.1.1(v) e Google Play): anonimizzazione, i registri del club restano. Vedi account/EliminaAccount. */}
          <Carta style={{ paddingVertical: spazio.due }}>
            <Riga
              prima
              icona="cestino"
              tono="neutro"
              titolo={t('Elimina account', 'Delete account')}
              sotto={t('Chiude l’accesso e cancella i dati che hai scritto nell’app. Contratti e pagamenti restano.', 'Closes your login and deletes the data you entered in the app. Contracts and payments stay on record.')}
              stileTitolo={{ fontSize: 14, fontFamily: F.bold, color: p.testo }}
              onPress={() => router.push('/elimina-account' as never)}
            />
          </Carta>
        </Sezione>
      </Entra>

      {modifica === 'foto' ? <FoglioFoto attuale={dati.foto ?? null} onChiudi={() => setModifica(null)} onSalvato={fotoSalvata} /> : null}
      {modifica === 'telefono' ? <FoglioTelefono attuale={dati.telefono} onChiudi={() => setModifica(null)} onSalvato={salvato(t('Telefono aggiornato.', 'Phone number updated.'))} /> : null}
      {modifica === 'indirizzo' ? <FoglioIndirizzo attuale={dati.indirizzo} onChiudi={() => setModifica(null)} onSalvato={salvato(t('Indirizzo aggiornato.', 'Address updated.'))} /> : null}
      {modifica === 'email' ? (
        <FoglioEmail attuale={dati.email} onChiudi={() => setModifica(null)} onSalvato={salvato(t('Email cambiata: da adesso entri con quella nuova.', 'Email changed: from now on you sign in with the new one.'))} />
      ) : null}
    </View>
  )
}

const stili = StyleSheet.create({
  attuale: { borderRadius: 18, padding: spazio.tre, gap: 2 },
  modifica: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  nota: { fontSize: 13, lineHeight: 19, fontFamily: F.medio },
})
