import { useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'

import { chiamaLink } from '@/api/link'
import { Avviso } from '@/components/Avviso'
import { Bottone } from '@/components/Bottone'
import { Campo } from '@/components/Campo'
import { Casella } from '@/components/Casella'
import { Pagina } from '@/components/Pagina'
import { Scelta } from '@/components/Scelta'
import { Forte, Testo } from '@/components/Testo'
import { CAMPI, fineSettimana, giornoBreve, giorniFra, giornoLungo, type PaginaGuestPass } from '@/lib/guestPass'
import { spazio, useColori } from '@/theme'

// Il Guest Pass dal link (in prova): una pagina sola, in quattro blocchi.
//   1. i tuoi dati (si chiede solo quello che su PerfectGym manca);
//   2. i consensi della prova, come caselle, coi testi di PerfectGym;
//   3. il giorno d'inizio, entro 14 giorni;
//   4. come pagare: carta (salvata sulla pagina protetta di PerfectGym) o
//      addebito su conto (IBAN).
// Poi «Conferma e attiva»: solo allora il Guest Pass si carica su PerfectGym;
// con la carta si paga la quota sulla pagina di PerfectGym e si torna qui.

function apri(url: string) {
  if (Platform.OS === 'web') window.location.assign(url)
  else Linking.openURL(url)
}

function Blocco({ numero, titolo, fatto, children }: { numero: number; titolo: string; fatto: boolean; children: React.ReactNode }) {
  const c = useColori()
  return (
    <View style={[stili.blocco, { borderColor: fatto ? c.ok : c.bordo, backgroundColor: c.superficie }]}>
      <View style={stili.testaBlocco}>
        <Text style={[stili.numero, { backgroundColor: fatto ? c.ok : c.accento, color: c.suAccento }]}>{fatto ? '✓' : numero}</Text>
        <Text style={[stili.titoloBlocco, { color: c.testo }]}>{titolo}</Text>
      </View>
      {children}
    </View>
  )
}

export function AttivaGuestPass({ token, nome, iniziale }: { token: string; nome: string | null; iniziale: PaginaGuestPass }) {
  const c = useColori()
  const { carta: tornatoCarta, pagato: tornatoPagato } = useLocalSearchParams<{ carta?: string; pagato?: string }>()
  const [p, setP] = useState(iniziale)
  const [dati, setDati] = useState<Record<string, string>>({})
  const [consensi, setConsensi] = useState<Set<number>>(new Set(iniziale.scelte.consensi))
  const [inizio, setInizio] = useState<string | null>(iniziale.inizio.scelto)
  const [metodo, setMetodo] = useState<'carta' | 'iban' | null>(iniziale.scelte.metodo)
  const [conto, setConto] = useState({ iban: '', intestatario: '', via: iniziale.persona.via ?? '', cap: iniziale.persona.cap ?? '', citta: iniziale.persona.citta ?? '' })
  const [occupato, setOccupato] = useState<string | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [avviso, setAvviso] = useState<{ testo: string; tono: 'ok' | 'attenzione' | 'errore' } | null>(null)
  const giaFatto = useRef(false)

  async function ricarica() {
    const { ok, dati: d } = await chiamaLink(token, 'pagina')
    if (ok) {
      const { ok: _ok, ...resto } = d
      setP(resto as unknown as PaginaGuestPass)
      return resto as unknown as PaginaGuestPass
    }
    return null
  }

  // Il ritorno dalla pagina della carta (?carta=1) o dal pagamento (?pagato=1).
  useEffect(() => {
    if (giaFatto.current) return
    giaFatto.current = true
    if (tornatoCarta) {
      ;(async () => {
        setOccupato('carta')
        const { ok, dati: d } = await chiamaLink(token, 'carta_esito')
        setOccupato(null)
        if (ok && d.salvata) setAvviso({ testo: 'Carta salvata. Ora conferma per attivare il Guest Pass.', tono: 'ok' })
        else setAvviso({ testo: 'Non vediamo ancora la carta: se hai completato la pagina, riprova fra un minuto, altrimenti inseriscila di nuovo.', tono: 'attenzione' })
        await ricarica()
      })()
    }
    if (tornatoPagato) {
      ;(async () => {
        for (let i = 0; i < 20; i++) {
          const { ok, dati: d } = await chiamaLink(token, 'pagamento_esito')
          if (ok && d.pagato) {
            setAvviso({ testo: 'Pagamento ricevuto: il tuo Guest Pass è attivo.', tono: 'ok' })
            return ricarica()
          }
          await new Promise((r) => setTimeout(r, 4000))
        }
        setAvviso({ testo: 'Non vediamo ancora il pagamento. Se l’hai completato, ricarica la pagina fra qualche minuto.', tono: 'attenzione' })
      })()
    }
  }, [tornatoCarta, tornatoPagato, token])

  const persona = p.persona
  const giorni = giorniFra(p.inizio.dal, p.inizio.al)
  const tuttiIConsensi = p.consensi.every((k) => consensi.has(k.id))
  const datiCompleti = persona.manca.every((k) => (dati[k] ?? '').trim())

  async function salva(extra: Record<string, unknown> = {}): Promise<boolean> {
    setErrore(null)
    const { ok, dati: d } = await chiamaLink(token, 'salva', {
      ...(persona.manca.length ? { dati } : {}),
      consensi: [...consensi],
      inizio,
      metodo,
      ...extra,
    })
    if (!ok) setErrore(d.errore ?? 'Non siamo riusciti a salvare adesso.')
    return ok
  }

  async function cartaAvvia() {
    setOccupato('carta')
    if (!(await salva({ metodo: 'carta' }))) return setOccupato(null)
    const { ok, dati: d } = await chiamaLink(token, 'carta_avvia')
    setOccupato(null)
    if (!ok || typeof d.url !== 'string') return setErrore(d.errore ?? 'Non riusciamo ad aprire la pagina della carta adesso.')
    apri(d.url)
  }

  async function salvaConto() {
    setOccupato('iban')
    if (!(await salva({ metodo: 'iban' }))) return setOccupato(null)
    const { ok, dati: d } = await chiamaLink(token, 'iban', conto)
    setOccupato(null)
    if (!ok) return setErrore(d.errore ?? 'Non siamo riusciti a salvare il conto.')
    setAvviso({ testo: 'Conto salvato. Ora conferma per attivare il Guest Pass.', tono: 'ok' })
    await ricarica()
  }

  async function conferma() {
    setOccupato('conferma')
    if (!(await salva())) return setOccupato(null)
    const { ok, dati: d } = await chiamaLink(token, 'conferma')
    setOccupato(null)
    if (!ok) return setErrore(d.errore ?? 'Non siamo riusciti ad attivare il Guest Pass adesso.')
    if (d.pagamento === 'da_pagare' && typeof d.url === 'string') return apri(d.url)
    setAvviso({
      testo:
        d.pagamento === 'addebito'
          ? 'Fatto: il tuo Guest Pass è attivo. I 19 € saranno addebitati sul conto.'
          : 'Fatto: il tuo Guest Pass è attivo.',
      tono: 'ok',
    })
    await ricarica()
  }

  if (p.stato === 'attivato') {
    return (
      <Pagina titolo="Il tuo Guest Pass è attivo" sottotitolo={p.inizio.scelto ? `Dal ${giornoLungo(p.inizio.scelto)} al ${giornoLungo(fineSettimana(p.inizio.scelto))}` : undefined}>
        {avviso ? <Avviso tono={avviso.tono}>{avviso.testo}</Avviso> : null}
        {p.pagamento?.startsWith('avviato') ? (
          <Avviso tono="attenzione">Il pagamento dei 19 € non risulta ancora completato.</Avviso>
        ) : null}
        <Testo>Ti aspettiamo al club. Per prenotare le lezioni usa l’app Athlon con questa email.</Testo>
      </Pagina>
    )
  }

  const pronto = datiCompleti && tuttiIConsensi && !!inizio && p.scelte.metodo_pronto
  return (
    <Pagina titolo={nome ? `Ciao ${nome}, attiva il tuo Guest Pass` : 'Attiva il tuo Guest Pass'} sottotitolo={`Una settimana al club a ${p.prezzo} €.`}>
      {avviso ? <Avviso tono={avviso.tono}>{avviso.testo}</Avviso> : null}

      <Blocco numero={1} titolo="I tuoi dati" fatto={datiCompleti}>
        <Testo variante="piccolo">
          {[persona.nome, persona.cognome].filter(Boolean).join(' ')}
          {persona.email ? ` · ${persona.email}` : ''}
          {persona.telefono ? ` · ${persona.telefono}` : ''}
        </Testo>
        {persona.manca.length ? (
          <>
            <Testo variante="piccolo">Per attivare il Guest Pass ci servono anche:</Testo>
            {persona.manca.map((k) => (
              <Campo key={k} etichetta={CAMPI[k] ?? k} value={dati[k] ?? ''} onChangeText={(v) => setDati((x) => ({ ...x, [k]: v }))} autoCapitalize={k === 'codice_fiscale' ? 'characters' : 'sentences'} />
            ))}
          </>
        ) : (
          <Testo variante="piccolo">I tuoi dati sono completi.</Testo>
        )}
      </Blocco>

      <Blocco numero={2} titolo="I consensi della prova" fatto={tuttiIConsensi}>
        {p.consensi.map((k) => (
          <View key={k.id} style={{ gap: 4 }}>
            <Casella
              spuntata={consensi.has(k.id)}
              onCambia={() =>
                setConsensi((s) => {
                  const n = new Set(s)
                  if (n.has(k.id)) n.delete(k.id)
                  else n.add(k.id)
                  return n
                })
              }
              etichetta={k.nome}
            >
              <Testo variante="piccolo">{k.testo}</Testo>
            </Casella>
            {k.allegato ? (
              <Text style={{ color: c.accento, textDecorationLine: 'underline', fontSize: 13, marginLeft: 34 }} onPress={() => Linking.openURL(k.allegato!)}>
                Leggi il documento
              </Text>
            ) : null}
          </View>
        ))}
      </Blocco>

      <Blocco numero={3} titolo="Quando vuoi cominciare" fatto={!!inizio}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spazio.due }}>
          {giorni.map((g) => {
            const b = giornoBreve(g)
            const attivo = g === inizio
            const colore = attivo ? c.suAccento : c.testo
            return (
              <Scelta key={g} scelta={attivo} onPress={() => setInizio(g)} stile={{ minWidth: 64, alignItems: 'center' }} etichetta={giornoLungo(g)}>
                <Text style={{ color: colore, fontSize: 11, textTransform: 'uppercase' }}>{b.settimana}</Text>
                <Text style={{ color: colore, fontSize: 18, fontWeight: '700' }}>{b.numero}</Text>
                <Text style={{ color: colore, fontSize: 11 }}>{b.mese}</Text>
              </Scelta>
            )
          })}
        </ScrollView>
        {inizio ? <Testo variante="piccolo">{`Dal ${giornoLungo(inizio)} al ${giornoLungo(fineSettimana(inizio))}.`}</Testo> : null}
      </Blocco>

      <Blocco numero={4} titolo="Come vuoi pagare" fatto={p.scelte.metodo_pronto}>
        <View style={{ flexDirection: 'row', gap: spazio.due }}>
          <Scelta scelta={metodo === 'carta'} onPress={() => setMetodo('carta')} etichetta="Carta">
            <Text style={{ color: metodo === 'carta' ? c.suAccento : c.testo, fontWeight: '600' }}>Carta</Text>
          </Scelta>
          <Scelta scelta={metodo === 'iban'} onPress={() => setMetodo('iban')} etichetta="Addebito su conto">
            <Text style={{ color: metodo === 'iban' ? c.suAccento : c.testo, fontWeight: '600' }}>Addebito su conto</Text>
          </Scelta>
        </View>
        {metodo === 'carta' ? (
          p.scelte.metodo === 'carta' && p.scelte.metodo_pronto ? (
            <Avviso tono="ok">Carta salvata.</Avviso>
          ) : (
            <>
              <Testo variante="piccolo">La inserisci sulla pagina protetta del club, che la custodisce: qui non passa. Dopo la conferma paghi i {p.prezzo} €.</Testo>
              <Bottone testo="Inserisci la carta" onPress={cartaAvvia} inCorso={occupato === 'carta'} disabilitato={!!occupato} />
            </>
          )
        ) : null}
        {metodo === 'iban' ? (
          p.scelte.metodo === 'iban' && p.scelte.metodo_pronto ? (
            <Avviso tono="ok">Conto salvato: i {p.prezzo} € saranno addebitati sul conto.</Avviso>
          ) : (
            <>
              <Campo etichetta="IBAN" value={conto.iban} onChangeText={(v) => setConto((x) => ({ ...x, iban: v }))} autoCapitalize="characters" />
              <Campo etichetta="Intestatario del conto" value={conto.intestatario} onChangeText={(v) => setConto((x) => ({ ...x, intestatario: v }))} />
              <Campo etichetta="Via e numero civico" value={conto.via} onChangeText={(v) => setConto((x) => ({ ...x, via: v }))} />
              <View style={{ flexDirection: 'row', gap: spazio.due }}>
                <Campo etichetta="CAP" value={conto.cap} onChangeText={(v) => setConto((x) => ({ ...x, cap: v }))} keyboardType="number-pad" />
                <Campo etichetta="Città" value={conto.citta} onChangeText={(v) => setConto((x) => ({ ...x, citta: v }))} />
              </View>
              <Bottone testo="Salva il conto" onPress={salvaConto} inCorso={occupato === 'iban'} disabilitato={!!occupato} />
            </>
          )
        ) : null}
      </Blocco>

      {errore ? <Avviso>{errore}</Avviso> : null}
      {occupato === 'carta' && tornatoCarta ? <ActivityIndicator color={c.accento} /> : null}
      <Bottone testo={`Conferma e attiva · ${p.prezzo} €`} onPress={conferma} inCorso={occupato === 'conferma'} disabilitato={!pronto || !!occupato} />
      {!pronto ? (
        <Testo variante="piccolo">
          {!datiCompleti ? 'Completa i tuoi dati. ' : ''}
          {!tuttiIConsensi ? 'Spunta i consensi. ' : ''}
          {!inizio ? 'Scegli il giorno d’inizio. ' : ''}
          {!p.scelte.metodo_pronto ? 'Completa il metodo di pagamento.' : ''}
        </Testo>
      ) : (
        <Testo variante="piccolo">
          Confermando attivi il Guest Pass <Forte>dal {giornoLungo(inizio!)}</Forte>
          {p.scelte.metodo === 'carta' ? ' e paghi subito i 19 € con la carta.' : ' con l’addebito dei 19 € sul conto.'}
        </Testo>
      )}
    </Pagina>
  )
}

const stili = StyleSheet.create({
  blocco: { borderWidth: 1, borderRadius: 16, padding: spazio.tre, gap: spazio.due },
  testaBlocco: { flexDirection: 'row', alignItems: 'center', gap: spazio.due },
  numero: { width: 26, height: 26, borderRadius: 13, textAlign: 'center', lineHeight: 26, fontWeight: '800', overflow: 'hidden' },
  titoloBlocco: { fontSize: 17, fontWeight: '700' },
})
