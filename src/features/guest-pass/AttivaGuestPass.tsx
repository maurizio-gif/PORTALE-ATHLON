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
import { CAMPI, COSA_COMPRENDE, fineSettimana, giornoBreve, giorniFra, giornoLungo, REGOLE_PRENOTAZIONE, type PaginaGuestPass } from '@/lib/guestPass'

import { FirmaPad, firmaDisponibile } from './FirmaPad'
import { spazio, useColori } from '@/theme'

// Il Guest Pass dal link (in prova): una pagina sola, in quattro blocchi.
//   1. i tuoi dati: tutti, gia' compilati da PerfectGym e modificabili, e
//      «I miei dati sono corretti» (senza, non si attiva);
//   2. il Guest Pass in breve (cosa comprende, senza impegno, come si paga) e
//      tre caselle per i consensi, coi testi completi di PerfectGym a richiesta;
//   3. il giorno d'inizio, entro 14 giorni;
//   4. come pagare: carta (salvata sulla pagina protetta di PerfectGym) o
//      addebito su conto (IBAN);
//   5. l'anteprima del contratto (come nella prevendita di Lume): chi, da
//      quando a quando, quanto e come si paga, cosa comprende, le regole di
//      prenotazione; si firma col dito o col mouse, e la firma va sul contratto
//      di PerfectGym alla conferma.
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
  const daPerfectGym = (pp: PaginaGuestPass) =>
    Object.fromEntries(Object.keys(CAMPI).map((k) => [k, String((pp.persona as Record<string, unknown>)[k] ?? '')]))
  const [dati, setDati] = useState<Record<string, string>>(daPerfectGym(iniziale))
  const [confermati, setConfermati] = useState(!!iniziale.scelte.dati_confermati)
  const [aperto, setAperto] = useState<number | null>(null)
  const [firma, setFirma] = useState<string | null>(null)
  const [firmato, setFirmato] = useState(!!iniziale.scelte.firmato)
  const [cancellaFirma, setCancellaFirma] = useState(0)
  const [consensi, setConsensi] = useState<Set<number>>(new Set(iniziale.scelte.consensi))
  const [inizio, setInizio] = useState<string | null>(iniziale.inizio.scelto)
  const [metodo, setMetodo] = useState<'carta' | 'iban' | null>(iniziale.scelte.metodo)
  const [conto, setConto] = useState({ iban: '', intestatario: '', via: iniziale.persona.via ?? '', cap: iniziale.persona.cap ?? '', citta: iniziale.persona.citta ?? '' })
  const [occupato, setOccupato] = useState<string | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [avviso, setAvviso] = useState<{ testo: string; tono: 'ok' | 'attenzione' | 'errore' } | null>(null)
  const giaFatto = useRef(false)
  const primaScelta = useRef(`${iniziale.inizio.scelto}|${iniziale.scelte.metodo}`)
  useEffect(() => {
    const ora = `${inizio}|${metodo}`
    if (ora === primaScelta.current) return
    primaScelta.current = ora
    setFirma(null)
    setFirmato(false)
    setCancellaFirma((n) => n + 1)
  }, [inizio, metodo])

  async function ricarica() {
    const { ok, dati: d } = await chiamaLink(token, 'pagina')
    if (ok) {
      const { ok: _ok, ...resto } = d
      setP(resto as unknown as PaginaGuestPass)
      setDati(daPerfectGym(resto as unknown as PaginaGuestPass))
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
        if (ok && d.salvata && d.attivato) {
          // Il Guest Pass c'e' gia': con la carta nuova si paga subito.
          const r = await chiamaLink(token, 'ripaga')
          setOccupato(null)
          if (r.ok && typeof r.dati.url === 'string') return apri(r.dati.url)
          setAvviso({ testo: 'Carta salvata. Ora puoi pagare il Guest Pass.', tono: 'ok' })
          return void (await ricarica())
        }
        setOccupato(null)
        if (ok && d.salvata) setAvviso({ testo: 'Carta salvata. Ora conferma per attivare il Guest Pass.', tono: 'ok' })
        else if (ok && d.motivo) setAvviso({ testo: `La carta non è stata salvata. ${d.motivo}`, tono: 'errore' })
        else setAvviso({ testo: 'Non vediamo ancora la carta: se hai completato la pagina, riprova fra un minuto, altrimenti inseriscila di nuovo.', tono: 'attenzione' })
        await ricarica()
      })()
    }
    if (tornatoPagato) {
      ;(async () => {
        setOccupato('pagamento')
        for (let i = 0; i < 20; i++) {
          const { ok, dati: d } = await chiamaLink(token, 'pagamento_esito')
          if (ok && d.pagato) {
            setOccupato(null)
            setAvviso({ testo: 'Pagamento ricevuto: il tuo Guest Pass è attivo.', tono: 'ok' })
            return ricarica()
          }
          if (ok && d.fallito) {
            setOccupato(null)
            setAvviso({ testo: `Il pagamento non è andato a buon fine. ${d.motivo ?? ''}`.trim(), tono: 'errore' })
            return ricarica()
          }
          await new Promise((r) => setTimeout(r, 4000))
        }
        setOccupato(null)
        setAvviso({ testo: 'Non vediamo ancora il pagamento. Se l’hai completato, ricarica la pagina fra qualche minuto.', tono: 'attenzione' })
        await ricarica()
      })()
    }
  }, [tornatoCarta, tornatoPagato, token])

  const persona = p.persona
  const giorni = giorniFra(p.inizio.dal, p.inizio.al)
  const tuttiIConsensi = p.consensi.every((k) => consensi.has(k.id))
  const originali = daPerfectGym(p)
  const cambiati = Object.fromEntries(Object.entries(dati).filter(([k, v]) => v.trim() !== (originali[k] ?? '').trim()))
  const datiCompleti = Object.keys(CAMPI).every((k) => (dati[k] ?? '').trim())

  async function salva(extra: Record<string, unknown> = {}): Promise<boolean> {
    setErrore(null)
    const { ok, dati: d } = await chiamaLink(token, 'salva', {
      ...(Object.keys(cambiati).length ? { dati: cambiati } : {}),
      dati_confermati: confermati && datiCompleti,
      ...(firma ? { firma } : {}),
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
    if (p.stato === 'aperta' && !(await salva({ metodo: 'carta' }))) return setOccupato(null)
    const { ok, dati: d } = await chiamaLink(token, 'carta_avvia')
    setOccupato(null)
    if (!ok || typeof d.url !== 'string') return setErrore(d.errore ?? 'Non riusciamo ad aprire la pagina della carta adesso.')
    apri(d.url)
  }

  async function salvaConto() {
    setOccupato('iban')
    if (p.stato === 'aperta' && !(await salva({ metodo: 'iban' }))) return setOccupato(null)
    const { ok, dati: d } = await chiamaLink(token, 'iban', conto)
    setOccupato(null)
    if (!ok) return setErrore(d.errore ?? 'Non siamo riusciti a salvare il conto.')
    setAvviso({ testo: d.addebito ? `Conto salvato: i ${p.prezzo} € li addebitiamo sul conto. Il tuo Guest Pass è attivo.` : 'Conto salvato. Ora conferma per attivare il Guest Pass.', tono: 'ok' })
    await ricarica()
  }

  async function conferma() {
    setOccupato('conferma')
    if (!(await salva())) return setOccupato(null)
    const { ok, dati: d } = await chiamaLink(token, 'conferma')
    setOccupato(null)
    if (!ok) return setErrore(d.errore ?? 'Non siamo riusciti ad attivare il Guest Pass adesso.')
    if (d.pagamento === 'da_pagare' && typeof d.url === 'string') return apri(d.url)
    if (d.pagamento === 'link_non_aperto') {
      setAvviso({ testo: 'Il Guest Pass è registrato, ma non riusciamo ad aprire il pagamento adesso: riprova da qui fra qualche minuto.', tono: 'attenzione' })
      return void (await ricarica())
    }
    setAvviso({
      testo:
        d.pagamento === 'addebito'
          ? 'Fatto: il tuo Guest Pass è attivo. I 19 € saranno addebitati sul conto.'
          : 'Fatto: il tuo Guest Pass è attivo.',
      tono: 'ok',
    })
    await ricarica()
  }

  async function ripaga() {
    setErrore(null)
    setOccupato('ripaga')
    const { ok, dati: d } = await chiamaLink(token, 'ripaga')
    setOccupato(null)
    if (ok && typeof d.url === 'string') return apri(d.url)
    if (ok && d.pagamento === 'pagato') {
      setAvviso({ testo: 'Pagamento ricevuto: il tuo Guest Pass è attivo.', tono: 'ok' })
      return void (await ricarica())
    }
    setErrore(d.errore ?? 'Non riusciamo ad aprire il pagamento adesso. Riprova fra qualche minuto.')
  }

  if (p.stato === 'attivato') {
    const daPagare = p.pagamento_stato === 'da_pagare' || p.pagamento_stato === 'sconosciuto'
    const periodo = p.inizio.scelto ? `dal ${giornoLungo(p.inizio.scelto)} al ${giornoLungo(fineSettimana(p.inizio.scelto))}` : null
    if (!daPagare) {
      return (
        <Pagina titolo="Il tuo Guest Pass è attivo" sottotitolo={periodo ? periodo.charAt(0).toUpperCase() + periodo.slice(1) : undefined}>
          {avviso ? <Avviso tono={avviso.tono}>{avviso.testo}</Avviso> : null}
          {p.pagamento_stato === 'addebito' ? <Testo>I {p.prezzo} € saranno addebitati sul conto che hai indicato.</Testo> : null}
          <Testo>Ti aspettiamo al club. Per prenotare le lezioni usa l’app Athlon con la tua email.</Testo>
        </Pagina>
      )
    }
    return (
      <Pagina titolo="Manca il pagamento" sottotitolo={`Il tuo Guest Pass ${periodo ? `(${periodo}) ` : ''}è registrato: per usarlo manca il pagamento di ${p.resta ?? p.prezzo} €.`}>
        {avviso ? <Avviso tono={avviso.tono}>{avviso.testo}</Avviso> : null}
        {occupato === 'pagamento' ? (
          <View style={{ flexDirection: 'row', gap: spazio.due, alignItems: 'center' }}>
            <ActivityIndicator color={c.accento} />
            <Testo>Aspettiamo l’esito del pagamento…</Testo>
          </View>
        ) : null}
        {p.scelte.metodo === 'carta' && p.scelte.metodo_pronto ? (
          <Bottone testo={`Riprova il pagamento · ${p.resta ?? p.prezzo} €`} onPress={ripaga} inCorso={occupato === 'ripaga'} disabilitato={!!occupato} />
        ) : null}
        <Bottone testo="Usa un’altra carta" variante="contorno" onPress={cartaAvvia} inCorso={occupato === 'carta'} disabilitato={!!occupato} />
        <Blocco numero={1} titolo="Oppure: addebito su conto" fatto={false}>
          <Testo variante="piccolo">Salva il conto e i {p.prezzo} € li addebitiamo noi: il Guest Pass resta com’è.</Testo>
          <Campo etichetta="IBAN" value={conto.iban} onChangeText={(v) => setConto((x) => ({ ...x, iban: v }))} autoCapitalize="characters" />
          <Campo etichetta="Intestatario del conto" value={conto.intestatario} onChangeText={(v) => setConto((x) => ({ ...x, intestatario: v }))} />
          <Campo etichetta="Via e numero civico" value={conto.via} onChangeText={(v) => setConto((x) => ({ ...x, via: v }))} />
          <View style={{ flexDirection: 'row', gap: spazio.due }}>
            <Campo etichetta="CAP" value={conto.cap} onChangeText={(v) => setConto((x) => ({ ...x, cap: v }))} keyboardType="number-pad" />
            <Campo etichetta="Città" value={conto.citta} onChangeText={(v) => setConto((x) => ({ ...x, citta: v }))} />
          </View>
          <Bottone testo="Salva il conto" variante="contorno" onPress={salvaConto} inCorso={occupato === 'iban'} disabilitato={!!occupato} />
        </Blocco>
        {errore ? <Avviso>{errore}</Avviso> : null}
      </Pagina>
    )
  }

  // L'anteprima cambia con il giorno e il metodo: una firma messa prima non vale piu'.
  const firmaValida = !!firma || firmato
  const pronto = datiCompleti && confermati && tuttiIConsensi && !!inizio && p.scelte.metodo_pronto && firmaValida
  const metodoLeggibile = p.scelte.metodo === 'carta' ? 'carta, con il pagamento subito' : p.scelte.metodo === 'iban' ? 'addebito su conto (SEPA)' : null
  return (
    <Pagina titolo={nome ? `Ciao ${nome}, attiva il tuo Guest Pass` : 'Attiva il tuo Guest Pass'} sottotitolo={`Una settimana al club a ${p.prezzo} €.`}>
      {avviso ? <Avviso tono={avviso.tono}>{avviso.testo}</Avviso> : null}

      <Blocco numero={1} titolo="I tuoi dati" fatto={datiCompleti && confermati}>
        <Testo variante="piccolo">Controlla i tuoi dati: sono quelli della tua scheda del club. Se qualcosa non va, correggilo qui.</Testo>
        {Object.entries(CAMPI).map(([k, etichetta]) => (
          <Campo
            key={k}
            etichetta={etichetta}
            value={dati[k] ?? ''}
            onChangeText={(v) => {
              setDati((x) => ({ ...x, [k]: v }))
              setConfermati(false)
            }}
            autoCapitalize={k === 'codice_fiscale' ? 'characters' : k === 'email' ? 'none' : 'sentences'}
            keyboardType={k === 'email' ? 'email-address' : k === 'telefono' ? 'phone-pad' : k === 'cap' ? 'number-pad' : 'default'}
            errore={!(dati[k] ?? '').trim()}
          />
        ))}
        <Casella spuntata={confermati} onCambia={() => setConfermati((x) => !x)} etichetta="I miei dati sono corretti">
          <Testo style={{ fontWeight: '700' }}>I miei dati sono corretti</Testo>
        </Casella>
        {Object.keys(cambiati).length ? <Testo variante="piccolo">Le correzioni si salvano sulla tua scheda quando continui.</Testo> : null}
      </Blocco>

      <Blocco numero={2} titolo="Il Guest Pass in breve" fatto={tuttiIConsensi}>
        <View style={{ gap: spazio.uno + 2 }}>
          {COSA_COMPRENDE.map((t) => (
            <View key={t} style={{ flexDirection: 'row', gap: spazio.due }}>
              <Text style={{ color: c.accento, fontWeight: '800' }}>✓</Text>
              <Testo variante="piccolo" style={{ flex: 1, color: c.testo }}>
                {t}
              </Testo>
            </View>
          ))}
        </View>
        {[
          { ids: [36, 20], etichetta: 'Accetto il Regolamento del club, i Termini e Condizioni e le Condizioni di pagamento.' },
          { ids: [29], etichetta: 'Approvo in modo specifico le clausole dei Termini e Condizioni indicate qui (artt. 1341 e 1342 del Codice civile).' },
          { ids: [23], etichetta: 'Acconsento al trattamento dei miei dati personali, vista l’informativa privacy.' },
        ].map((g) => {
          const testi = p.consensi.filter((k) => g.ids.includes(k.id))
          if (!testi.length) return null
          const spuntata = testi.every((k) => consensi.has(k.id))
          return (
            <View key={g.ids.join('-')} style={{ gap: 4 }}>
              <Casella
                spuntata={spuntata}
                onCambia={() =>
                  setConsensi((s0) => {
                    const n = new Set(s0)
                    for (const k of testi) {
                      if (spuntata) n.delete(k.id)
                      else n.add(k.id)
                    }
                    return n
                  })
                }
                etichetta={g.etichetta}
              >
                <Testo variante="piccolo" style={{ color: c.testo }}>
                  {g.etichetta}
                </Testo>
              </Casella>
              <View style={{ flexDirection: 'row', gap: spazio.tre, marginLeft: 34, flexWrap: 'wrap' }}>
                <Text style={{ color: c.accento, fontSize: 13 }} onPress={() => setAperto(aperto === g.ids[0] ? null : g.ids[0])}>
                  {aperto === g.ids[0] ? 'Chiudi il testo' : 'Leggi il testo completo'}
                </Text>
                {testi
                  .filter((k) => k.allegato)
                  .map((k) => (
                    <Text key={k.id} style={{ color: c.accento, fontSize: 13, textDecorationLine: 'underline' }} onPress={() => Linking.openURL(k.allegato!)}>
                      {k.id === 23 ? 'Informativa privacy' : 'Termini e Condizioni (documento)'}
                    </Text>
                  ))}
              </View>
              {aperto === g.ids[0]
                ? testi.map((k) => (
                    <Testo key={k.id} variante="piccolo" style={{ marginLeft: 34 }}>
                      {k.testo}
                    </Testo>
                  ))
                : null}
            </View>
          )
        })}
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

      {inizio && p.scelte.metodo_pronto ? (
        <Blocco numero={5} titolo="Anteprima del contratto" fatto={firmaValida}>
          <View style={[stili.contratto, { borderColor: c.bordo, backgroundColor: c.sfondo }]}>
            <Text style={[stili.titoloContratto, { color: c.testo }]}>Guest Pass Athlon Club · 1 settimana</Text>
            {[
              ['Intestatario', [dati.nome, dati.cognome].filter(Boolean).join(' ')],
              ['Codice fiscale', dati.codice_fiscale],
              ['Nato il', dati.nascita],
              ['Indirizzo', [dati.via, [dati.cap, dati.citta].filter(Boolean).join(' ')].filter(Boolean).join(', ')],
              ['Email e cellulare', [dati.email, dati.telefono].filter(Boolean).join(' · ')],
              ['Validità', `dal ${giornoLungo(inizio)} al ${giornoLungo(fineSettimana(inizio))} compresi`],
              ['Prezzo', `${p.prezzo} € una tantum, IVA inclusa`],
              ['Rinnovo', 'nessuno: finisce da solo, senza impegno e senza altri addebiti'],
              ['Pagamento', metodoLeggibile ?? ''],
            ].map(([k, v]) => (
              <View key={k} style={[stili.riga, { borderTopColor: c.bordo }]}>
                <Text style={[stili.chiave, { color: c.testoSecondario }]}>{k}</Text>
                <Text style={[stili.valore, { color: c.testo }]}>{v}</Text>
              </View>
            ))}
            <Text style={[stili.sezione, { color: c.testo }]}>Cosa comprende</Text>
            <Testo variante="piccolo">
              Accesso a tutto il club agli orari di un abbonamento Premium: sala pesi, corsi fitness, piscine, aqua fitness e nuoto libero. Il
              certificato medico non agonistico va consegnato entro 15 giorni dall’inizio.
            </Testo>
            <Text style={[stili.sezione, { color: c.testo }]}>Regole di prenotazione</Text>
            {REGOLE_PRENOTAZIONE.map((t) => (
              <Testo key={t} variante="piccolo">{`• ${t}`}</Testo>
            ))}
            <Text style={[stili.sezione, { color: c.testo }]}>Condizioni</Text>
            <Testo variante="piccolo">
              Valgono il Regolamento del club e i Termini e Condizioni generali che hai accettato sopra, con le clausole approvate in modo
              specifico (artt. 1341 e 1342 c.c.). Società Sportiva Dilettantistica Point 2000 SSD, Via Ugo Ojetti 134, 00137 Roma.
            </Testo>
          </View>
          {firmato && !firma ? (
            <View style={{ gap: spazio.uno }}>
              <Avviso tono="ok">Contratto firmato.</Avviso>
              <Text style={{ color: c.accento, fontSize: 13 }} onPress={() => setFirmato(false)}>
                Rifai la firma
              </Text>
            </View>
          ) : (
            <View style={{ gap: spazio.uno }}>
              <Testo style={{ fontWeight: '700' }}>Firma qui con il dito o con il mouse</Testo>
              <FirmaPad onFirma={setFirma} cancella={cancellaFirma} />
              {firmaDisponibile ? (
                <Text style={{ color: c.accento, fontSize: 13, alignSelf: 'flex-end' }} onPress={() => setCancellaFirma((n) => n + 1)}>
                  Cancella
                </Text>
              ) : null}
              <Testo variante="piccolo">La firma si applica al tuo contratto quando confermi.</Testo>
            </View>
          )}
        </Blocco>
      ) : null}

      {errore ? <Avviso>{errore}</Avviso> : null}
      {occupato === 'carta' && tornatoCarta ? <ActivityIndicator color={c.accento} /> : null}
      <Bottone testo={`Conferma e attiva · ${p.prezzo} €`} onPress={conferma} inCorso={occupato === 'conferma'} disabilitato={!pronto || !!occupato} />
      {!pronto ? (
        <Testo variante="piccolo">
          {!datiCompleti ? 'Completa i tuoi dati. ' : !confermati ? 'Conferma che i tuoi dati sono corretti. ' : ''}
          {!tuttiIConsensi ? 'Spunta i consensi. ' : ''}
          {!inizio ? 'Scegli il giorno d’inizio. ' : ''}
          {!p.scelte.metodo_pronto ? 'Completa il metodo di pagamento. ' : ''}
          {inizio && p.scelte.metodo_pronto && !firmaValida ? 'Firma l’anteprima del contratto.' : ''}
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
  contratto: { borderWidth: 1, borderRadius: 12, padding: spazio.tre, gap: spazio.uno + 2 },
  titoloContratto: { fontSize: 16, fontWeight: '800', marginBottom: spazio.uno },
  riga: { flexDirection: 'row', gap: spazio.tre, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spazio.uno + 2 },
  chiave: { width: 130, fontSize: 13 },
  valore: { flex: 1, fontSize: 13, fontWeight: '600' },
  sezione: { fontSize: 14, fontWeight: '700', marginTop: spazio.due },
})
