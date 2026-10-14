import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { labRichiediGuestPass } from '@/api/guestPass'
import { laMiaArea, type PersonaArea } from '@/api/lab'
import { spazio } from '@/theme'

import { Icona } from './ui/Icona'
import { Avatar, Carta, Entra, Messaggio, Numero, Pulsante, SchedeInArrivo, Sezione, Tag } from './ui/kit'
import { Schermata } from './ui/Schermata'
import { F, FUOCO, usePalette } from './ui/tema'
import { colpetto, Tocco } from './ui/Tocco'

// Il Guest Pass nuovo, in prova dal laboratorio: si chiede per una persona
// della famiglia, e il link arriva all'email del tester (in produzione arriva
// all'email di chi lo chiede, da /richiesta/guest-pass). Chi non puo' averlo
// (un abbonamento dopo il 2023, o un Guest Pass gia' fatto) lo dice la funzione.

/** Il biglietto: arancio, con le tacche ai lati e la linea tratteggiata dello strappo. */
function Biglietto() {
  const p = usePalette()
  return (
    <LinearGradient colors={FUOCO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.biglietto}>
      <View style={stili.bigliettoIcona}>
        <Icona nome="pass" size={150} colore="rgba(255,255,255,0.1)" />
      </View>
      <View style={{ gap: spazio.due }}>
        <Tag testo="Guest Pass · in prova" colore="#fff" />
        <Text style={stili.bigliettoTitolo}>Porta qualcuno{'\n'}ad allenarsi</Text>
      </View>
      <View style={stili.strappo}>
        <View style={[stili.tacca, { left: -38, backgroundColor: p.fondo }]} />
        <View style={stili.tratteggio} />
        <View style={[stili.tacca, { right: -38, backgroundColor: p.fondo }]} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View>
          <Text style={stili.bigliettoPiccolo}>SI CARICA SU PERFECTGYM</Text>
          <Numero valore="19" unita="€" size={44} colore="#fff" />
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={stili.bigliettoPiccolo}>IL LINK VALE</Text>
          <Text style={stili.bigliettoValore}>30 giorni</Text>
        </View>
      </View>
    </LinearGradient>
  )
}

export function GuestPassLab({ email }: { email: string }) {
  const p = usePalette()
  const [persone, setPersone] = useState<PersonaArea[] | null>(null)
  const [esiti, setEsiti] = useState<Record<number, { testo: string; tono: 'ok' | 'errore' }>>({})
  const [occupato, setOccupato] = useState<number | null>(null)

  useEffect(() => {
    laMiaArea().then((r) => setPersone(r.ok && r.area.trovato ? r.area.persone : []))
  }, [])

  async function chiedi(x: PersonaArea) {
    setOccupato(x.member_id)
    const r = await labRichiediGuestPass(x.member_id)
    setOccupato(null)
    colpetto(r.ok ? 'ok' : 'errore')
    setEsiti((e) => ({
      ...e,
      [x.member_id]: r.ok ? { testo: `Fatto: il link per attivarlo è partito a ${email}.`, tono: 'ok' } : { testo: r.errore, tono: 'errore' },
    }))
  }

  return (
    <Schermata larga sopratitolo="Laboratorio · procedura nuova" titolo="Guest Pass" sottotitolo="Link per email, dati, consensi, giorno d’inizio e pagamento.">
      <View style={stili.colonne}>
        <View style={stili.colonna}>
          <Entra indice={0}>
            <Biglietto />
          </Entra>
          <Messaggio tono="attenzione" titolo="Si carica davvero">
            In prova: il Guest Pass si carica davvero su PerfectGym (19 €). Il sito usa ancora la procedura di prima.
          </Messaggio>
        </View>

        <View style={stili.colonna}>
          <Sezione titolo="Per chi lo chiedi?">
            <Text style={[stili.nota, { color: p.testoSecondario }]}>Scegli una persona della tua famiglia: il link per attivarlo arriva a te.</Text>
            {!persone ? (
              <SchedeInArrivo quante={2} />
            ) : persone.length === 0 ? (
              <Carta>
                <Text style={[stili.nota, { color: p.testoSecondario }]}>Non troviamo la tua scheda del club: entra con l’email con cui sei iscritto.</Text>
              </Carta>
            ) : (
              persone.map((x, i) => (
                <Entra key={x.member_id} indice={i + 1}>
                  <Carta style={{ gap: spazio.tre }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spazio.tre }}>
                      <Avatar nome={x.nome} cognome={x.cognome} size={48} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[stili.nome, { color: p.testo }]}>{[x.nome, x.cognome].filter(Boolean).join(' ')}</Text>
                        <Text style={[stili.nota, { color: p.testoSecondario }]}>{x.titolare ? 'Titolare' : 'Famiglia'}</Text>
                      </View>
                      <Pulsante
                        testo="Chiedi"
                        icona="invia"
                        piccolo
                        pieno={false}
                        variante={esiti[x.member_id]?.tono === 'ok' ? 'secondario' : 'primario'}
                        onPress={() => chiedi(x)}
                        inCorso={occupato === x.member_id}
                        disabilitato={occupato !== null}
                      />
                    </View>
                    {esiti[x.member_id] ? <Messaggio tono={esiti[x.member_id].tono}>{esiti[x.member_id].testo}</Messaggio> : null}
                  </Carta>
                </Entra>
              ))
            )}
          </Sezione>

          <Tocco onPress={() => router.push('/richiesta/guest-pass')} ruolo="link" etichetta="La pagina pubblica del Guest Pass" scala={0.98}>
            <Carta piatta style={{ flexDirection: 'row', alignItems: 'center', gap: spazio.tre }}>
              <View style={[stili.bollino, { backgroundColor: p.incavo }]}>
                <Icona nome="aggiungi" size={20} colore={p.testo} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[stili.nome, { color: p.testo, fontSize: 15 }]}>La pagina pubblica</Text>
                <Text style={[stili.nota, { color: p.testoSecondario }]}>Per provare la richiesta con l’email e la registrazione.</Text>
              </View>
              <Icona nome="avanti" size={16} colore={p.testoTerzo} />
            </Carta>
          </Tocco>
        </View>
      </View>
    </Schermata>
  )
}

const stili = StyleSheet.create({
  colonne: { flexDirection: 'row', flexWrap: 'wrap', gap: spazio.quattro },
  colonna: { flexGrow: 1, flexBasis: 340, minWidth: 0, gap: spazio.tre + 4 },
  biglietto: { borderRadius: 30, padding: spazio.quattro - 2, gap: spazio.tre + 2, overflow: 'hidden' },
  bigliettoIcona: { position: 'absolute', right: -24, top: -20, transform: [{ rotate: '-18deg' }] },
  bigliettoTitolo: { color: '#fff', fontFamily: F.extra, fontSize: 28, lineHeight: 32, letterSpacing: -0.9 },
  strappo: { height: 20, justifyContent: 'center', marginHorizontal: -(spazio.quattro - 2) },
  tacca: { position: 'absolute', width: 48, height: 48, borderRadius: 24, top: -14 },
  tratteggio: { marginHorizontal: 26, borderTopWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.45)' },
  bigliettoPiccolo: { color: 'rgba(255,255,255,0.75)', fontFamily: F.extra, fontSize: 10, letterSpacing: 1.2 },
  bigliettoValore: { color: '#fff', fontFamily: F.extra, fontSize: 20, letterSpacing: -0.4 },
  nome: { fontFamily: F.extra, fontSize: 16.5, letterSpacing: -0.3 },
  nota: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
  bollino: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
})
