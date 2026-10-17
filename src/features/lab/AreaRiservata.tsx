import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Platform, StyleSheet, Text, useWindowDimensions, View, type ScrollView } from 'react-native'
import type Animated from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { contrattiAbbonamento } from '@/api/abbonamento'
import { elencoDocumenti } from '@/api/documenti'
import { laMiaArea, leggiAnagrafica, leggiGiorno, leggiVetrine, type Area, type PersonaArea } from '@/api/lab'
import type { Tessera } from '@/api/tesseramenti'
import { spazio } from '@/theme'

import { CHIAVE_CONTRATTI, ElencoAbbonamenti } from './AbbonamentiMiei'
import { DaFare } from './home/DaFare'
import { Riquadri, type VoceRiquadro } from './home/Riquadri'
import { SezioneCertificato } from './home/SezioneCertificato'
import { SezioneFamiglia } from './home/SezioneFamiglia'
import { SezioneDocumenti, useDocumenti, CHIAVE_DOCUMENTI } from './home/SezioneDocumenti'
import { SezionePagamenti } from './home/SezionePagamenti'
import { SezioneProdotti, useProdotti } from './home/SezioneProdotti'
import { SezioneTesseramento, useTesseramenti } from './home/SezioneTesseramento'
import { giorni, nome, oggi, statoCertificato, urgenzaCertificato } from './home/certificato'
import { riepilogoAbbonamenti } from './home/regolarita'
import { SEZIONI, SEZIONE_INIZIALE, sezioneDa, type SezioneHome } from './home/sezioni'
import { inMemoria, precarica, prendi } from './memoria'
import { useMovimenti } from './pagamenti/Movimenti'
import { ProfiloContenuto } from './Profilo'
import { memoria as memoriaTv } from './tv/comune'
import { Icona } from './ui/Icona'
import { Avatar, Entra, Messaggio, Pulsante, SchedeInArrivo } from './ui/kit'
import { Installa } from './ui/Installa'
import { Schermata } from './ui/Schermata'
import { PulsanteEsci } from './ui/Uscita'
import { F, FUOCO, MARE, NOTTE } from './ui/tema'
import { Tocco } from './ui/Tocco'

// La Home dell'app (17/10/2026): l'hub dell'account. In cima chi sei e le cose
// da fare; poi cinque riquadri (Abbonamenti, Pagamenti, Certificato, Famiglia,
// Profilo) che mostrano un dato vivo e scelgono la sezione sotto. La sezione
// sta nell'indirizzo, `/?sezione=pagamenti`, cosi' un link o un
// ricaricamento tornano al punto giusto. Tutto dal mirror di PerfectGym
// (portale_la_mia_area) e dalle schermate delle sezioni.

/** La testata scura: la data, l'avatar, il saluto, le pillole di chi sei. Toccandola si apre il profilo, nella Home. */
function Benvenuto({ titolare, email, famiglia, onProfilo }: { titolare: PersonaArea | undefined; email: string; famiglia: number; onProfilo: () => void }) {
  return (
    <Tocco onPress={onProfilo} ruolo="link" etichetta="Il mio profilo: anagrafica e contatti" scala={0.985}>
    <LinearGradient colors={NOTTE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.benvenuto}>
      <View style={stili.bagliore} />
      <View style={[stili.data, { justifyContent: 'space-between' }]}>
        <View style={[stili.data, { gap: 10 }]}>
          <Avatar nome={titolare?.nome ?? email} cognome={titolare?.cognome} size={38} anello="rgba(255,255,255,0.18)" />
          <Text style={stili.dataTesto}>{oggi().toUpperCase()}</Text>
        </View>
        <View style={stili.profilo}>
          <Icona nome="persona" size={14} colore="#fff" />
          <Text style={stili.profiloTesto}>Profilo</Text>
          <Icona nome="avanti" size={13} colore="rgba(255,255,255,0.7)" />
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spazio.tre }}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={stili.ciao} numberOfLines={2}>
            {titolare?.nome ? `Ciao, ${titolare.nome}!` : 'Ciao!'}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
            <View style={stili.pillola}>
              <View style={[stili.puntino, { backgroundColor: FUOCO[0] }]} />
              <Text style={stili.pillolaTesto}>{titolare?.numero ? `Numero Utente ${titolare.numero}` : 'Socio'}</Text>
            </View>
            {famiglia || titolare?.numero ? (
              <View style={stili.pillola}>
                <View style={[stili.puntino, { backgroundColor: MARE[0] }]} />
                <Text style={stili.pillolaTesto}>{famiglia ? `Famiglia di ${famiglia + 1}` : 'Socio'}</Text>
              </View>
            ) : null}
            {titolare?.debito ? (
              <View style={[stili.pillola, { backgroundColor: 'rgba(255,69,58,0.28)' }]}>
                <View style={[stili.puntino, { backgroundColor: '#FF453A' }]} />
                <Text style={stili.pillolaTesto}>Pagamento in sospeso</Text>
              </View>
            ) : null}
          </View>
        </View>
        {/* Il marchio, arancio pieno e grande come nell'app di prima (15/10/2026): era una filigrana al 6%. */}
        <Image source={require('@/../assets/images/pittogramma.png')} style={stili.marchio} contentFit="contain" accessibilityLabel="Athlon Club" />
      </View>
      <Text style={stili.contatti} numberOfLines={2}>
        {[titolare?.email || email, titolare?.telefono].filter(Boolean).join('  ·  ')}
      </Text>
    </LinearGradient>
    </Tocco>
  )
}


// ---------------------------------------------------------------------------

function soldi(n: number): string {
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}

/** «15 nov», all'ora di Roma. */
function dataCorta(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', timeZone: 'Europe/Rome' })
}

type AreaTrovata = Extract<Area, { trovato: true }>

/** Il certificato piu' urgente del nucleo, per il riquadro: chi e come sta. */
function riquadroCertificato(area: AreaTrovata): VoceRiquadro {
  const righe = area.persone.map((persona) => ({ persona, s: statoCertificato(area.certificati.find((c) => c.member_id === persona.member_id), persona.data_nascita) }))
  // A pari urgenza resta il primo del nucleo, cioe' il titolare.
  const { persona, s } = righe.reduce((a, b) => (urgenzaCertificato(b.s) > urgenzaCertificato(a.s) ? b : a))
  const chi = persona.titolare ? 'Tu' : persona.nome || nome(persona)
  const quando = s.giorni != null ? (s.giorni < 0 ? `scaduto da ${giorni(-s.giorni)}` : s.giorni === 0 ? 'scade oggi' : `ancora ${giorni(s.giorni)}`) : s.breve
  return {
    valore: s.testo,
    nota: [chi, quando].filter(Boolean).join(' · '),
    allerta: s.tono === 'errore' ? 'errore' : s.daConsegnare || s.tono === 'attenzione' ? 'attenzione' : undefined,
  }
}

/**
 * Gli abbonamenti, per il riquadro: tutti quelli che ci sono, non solo gli
 * «attivi» (uno non ancora iniziato c'e' e va contato), e se uno non e' in
 * regola il riquadro lo dice, col tipo di irregolarita'.
 */
function riquadroAbbonamenti(area: AreaTrovata): VoceRiquadro {
  const r = riepilogoAbbonamenti(area)
  if (!r.totale) return { valore: '0', nota: 'attivi' }
  if (r.tono) {
    const motivo = r.motivi.length <= 2 ? r.motivi.map((m) => m.breve).join(' · ') : `${r.motivi.length} cose da sistemare`
    return { valore: String(r.totale), nota: motivo.charAt(0).toUpperCase() + motivo.slice(1), tag: { testo: 'Irregolare', tono: r.tono } }
  }
  if (r.attivi === r.totale) return { valore: String(r.totale), nota: r.totale === 1 ? 'attivo' : 'attivi' }
  const parti = [
    r.attivi ? `${r.attivi} attiv${r.attivi === 1 ? 'o' : 'i'}` : null,
    r.inPartenza ? (r.partenza ? `parte il ${dataCorta(r.partenza).replace(' ', '\u00a0')}` : `${r.inPartenza} in partenza`) : null,
    r.sospesi ? `${r.sospesi} sospes${r.sospesi === 1 ? 'o' : 'i'}` : null,
  ].filter(Boolean)
  return { valore: String(r.totale), nota: parti.join(' · ') }
}

/** Il dato del riquadro Tesseramento: «Attiva» e la scadenza, o quante tessere attive ci sono nel nucleo. */
function riquadroTesseramento(tessere: Tessera[]): VoceRiquadro {
  if (tessere.length === 1) {
    const al = tessere[0].al
    return { valore: 'Attiva', nota: al ? `fino al ${dataCorta(al).replace(' ', '\u00a0')}` : 'tessera ASI' }
  }
  return { valore: String(tessere.length), nota: 'tessere attive' }
}

export function AreaRiservata({ email }: { email: string }) {
  const [area, setArea] = useState<Area | null>(inMemoria<{ ok: true; area: Area }>('area')?.area ?? null)
  const [errore, setErrore] = useState<{ testo: string; nonAmmesso: boolean } | null>(null)
  const movimenti = useMovimenti()
  const documenti = useDocumenti()
  const prodotti = useProdotti()
  const tesseramenti = useTesseramenti()
  const { sezione: parametro } = useLocalSearchParams<{ sezione?: string }>()
  // Il Tesseramento c'e' solo se nel nucleo c'e' una tessera attiva: finche' non si sa, o se non
  // c'e', il riquadro non compare e un indirizzo che lo chiede porta alla sezione iniziale.
  const conTessera = (tesseramenti?.length ?? 0) > 0
  const sezioniVisibili: readonly SezioneHome[] = conTessera ? SEZIONI : SEZIONI.filter((x) => x !== 'tesseramento')
  const richiesta = sezioneDa(parametro)
  const sezione = richiesta && sezioniVisibili.includes(richiesta) ? richiesta : SEZIONE_INIZIALE
  const ins = useSafeAreaInsets()
  const { height } = useWindowDimensions()
  const scorrimento = useRef<Animated.ScrollView>(null)
  const riquadri = useRef<View>(null)

  const carica = useCallback(async () => {
    setErrore(null)
    const esito = await prendi('area', laMiaArea)
    if (!esito.ok) return setErrore({ testo: esito.errore, nonAmmesso: esito.nonAmmesso })
    setArea(esito.area)
    // Le schede che probabilmente si apriranno: i loro dati arrivano mentre si
    // guarda la Home, cosi' toccandole sono gia' pronte.
    if (esito.area.trovato) {
      precarica('giorno::', () => leggiGiorno())
      precarica(CHIAVE_CONTRATTI, contrattiAbbonamento)
      precarica(CHIAVE_DOCUMENTI, elencoDocumenti)
      precarica('anagrafica', leggiAnagrafica)
      if (!memoriaTv.vetrine) leggiVetrine().then((r) => r.ok && (memoriaTv.vetrine = r.vetrine))
    }
  }, [])

  useEffect(() => {
    carica()
  }, [carica])

  /**
   * Porta i riquadri in cima allo schermo (sotto la testata sottile che compare
   * scorrendo), perche' la sezione scelta da «Da fare» sta sotto di loro.
   */
  function portaInVista() {
    const vista = riquadri.current
    if (!vista) return
    const margine = ins.top + 52 + spazio.due
    if (Platform.OS === 'web') {
      const el = vista as unknown as HTMLElement
      // Su web la schermata e' un div che scorre: lo si cerca risalendo dai riquadri.
      let sv: HTMLElement | null = el.parentElement
      while (sv && !(sv.scrollHeight > sv.clientHeight && /(auto|scroll)/.test(getComputedStyle(sv).overflowY))) sv = sv.parentElement
      // `scroll` e non `scrollTo`: react-native-web ridefinisce `scrollTo` sul nodo con un'altra firma.
      if (sv) sv.scroll({ top: sv.scrollTop + el.getBoundingClientRect().top - sv.getBoundingClientRect().top - margine, behavior: 'smooth' })
      return
    }
    const sv = scorrimento.current as unknown as ScrollView | null
    const contenuto = sv?.getInnerViewNode?.()
    if (!sv || !contenuto) return
    vista.measureLayout(contenuto, (_x, y) => sv.scrollTo({ y: Math.max(0, y - margine), animated: true }), () => undefined)
  }

  /** Sceglie la sezione (cambia il parametro). Da «Da fare» porta anche in vista i riquadri. */
  function vai(s: SezioneHome, inVista = false) {
    router.setParams({ sezione: s })
    // Dopo che la sezione nuova ha preso il suo posto, o l'altezza non basta ancora.
    if (inVista) setTimeout(portaInVista, 120)
  }

  // Nelle schermate d'errore si esce subito.
  const uscita = <PulsanteEsci testo="Esci" conferma={false} />

  if (errore) {
    return (
      <Schermata titolo={errore.nonAmmesso ? 'Accesso non disponibile' : 'Qualcosa non va'}>
        <Messaggio tono={errore.nonAmmesso ? 'attenzione' : 'errore'}>{errore.testo}</Messaggio>
        {!errore.nonAmmesso ? <Pulsante testo="Riprova" icona="aggiorna" onPress={carica} /> : null}
        {uscita}
      </Schermata>
    )
  }

  if (!area) {
    return (
      <Schermata titolo="La mia area">
        <SchedeInArrivo />
      </Schermata>
    )
  }

  if (!area.trovato) {
    return (
      <Schermata titolo="La mia area">
        <Messaggio tono="attenzione" titolo="Non troviamo la tua scheda">
          {`Non c’è una scheda del club con l’indirizzo ${email}. Entra con l’email con cui sei iscritto.`}
        </Messaggio>
        {uscita}
      </Schermata>
    )
  }

  const titolare = area.persone.find((x) => x.member_id === area.titolare)
  const famiglia = area.persone.filter((x) => !x.titolare)

  // Il dato vivo di ogni riquadro: dall'area, e per i pagamenti dai movimenti.
  const debito = area.persone.reduce((t, x) => t + (x.debito?.importo ?? 0), 0)
  const daSaldare = movimenti.dati?.daSaldare.reduce((t, m) => t + m.importo, 0) ?? 0
  const prossimo = movimenti.dati?.futuri[0]
  const pagamenti: VoceRiquadro =
    debito > 0 || daSaldare > 0
      ? { valore: 'In sospeso', nota: `${soldi(Math.max(debito, daSaldare))} da saldare`, allerta: 'errore' }
      : prossimo
        ? { valore: dataCorta(prossimo.scadenza), nota: `prossimo addebito · ${soldi(prossimo.importo)}` }
        : movimenti.dati
          ? { valore: 'In regola', nota: 'nessun addebito in vista' }
          : movimenti.errore
            ? { valore: 'Apri', nota: 'prossimi pagamenti' }
            : { valore: '…', nota: 'un attimo' }
  const nDocumenti = documenti.dati?.documenti.length
  const validi = prodotti.dati?.filter((x) => x.stato === 'valido').length
  const voci: Record<SezioneHome, VoceRiquadro> = {
    abbonamenti: riquadroAbbonamenti(area),
    pagamenti,
    prodotti:
      validi != null && prodotti.dati
        ? { valore: String(validi), nota: `${validi === 1 ? 'valido' : 'validi'} · ${prodotti.dati.length - validi} ${prodotti.dati.length - validi === 1 ? 'consumato' : 'consumati'}` }
        : prodotti.errore
          ? { valore: 'Apri', nota: 'lezioni, accessi, recuperi' }
          : { valore: '…', nota: 'un attimo' },
    documenti:
      nDocumenti != null
        ? { valore: String(nDocumenti), nota: nDocumenti === 1 ? 'documento' : 'documenti' }
        : documenti.errore
          ? { valore: 'Apri', nota: 'contratti e ricevute' }
          : { valore: '…', nota: 'un attimo' },
    certificato: riquadroCertificato(area),
    famiglia: { valore: String(area.persone.length), nota: area.persone.length === 1 ? 'persona' : 'persone' },
    profilo: { valore: titolare?.nome || 'Profilo', nota: titolare?.email || email },
    tesseramento: riquadroTesseramento(tesseramenti ?? []),
  }

  return (
    <Schermata titolo={titolare?.nome ? `Ciao, ${titolare.nome}` : 'La mia area'} nascondiTitolo scorrimento={scorrimento}>
      <Entra indice={0}>
        <Benvenuto titolare={titolare} email={email} famiglia={famiglia.length} onProfilo={() => vai('profilo', true)} />
      </Entra>

      <DaFare area={area} onSezione={(s) => vai(s, true)} />

      <Installa />

      <View ref={riquadri}>
        <Entra indice={2}>
          <Riquadri voci={voci} scelta={sezione} onScegli={(s) => vai(s)} sezioni={sezioniVisibili} />
        </Entra>
      </View>

      {/* Almeno un'altezza di schermo, meno poco: cosi' i riquadri si possono portare in cima anche con una sezione corta. */}
      <Entra key={sezione} indice={0} style={[stili.sezione, { minHeight: Math.max(0, height - 220) }]}>
        {sezione === 'abbonamenti' ? <ElencoAbbonamenti area={area} onSezione={(s) => vai(s, true)} /> : null}
        {sezione === 'pagamenti' ? <SezionePagamenti /> : null}
        {sezione === 'prodotti' ? <SezioneProdotti /> : null}
        {sezione === 'documenti' ? <SezioneDocumenti /> : null}
        {sezione === 'certificato' ? <SezioneCertificato area={area} onAggiorna={carica} /> : null}
        {sezione === 'famiglia' ? <SezioneFamiglia area={area} /> : null}
        {sezione === 'profilo' ? <ProfiloContenuto /> : null}
        {sezione === 'tesseramento' && tesseramenti ? <SezioneTesseramento tessere={tesseramenti} /> : null}
      </Entra>
    </Schermata>
  )
}

const stili = StyleSheet.create({
  // Sotto i riquadri la sezione ha la stessa larghezza dei riquadri e di ogni altra
  // schermata (la colonna la limita `Schermata`): una colonna piu' stretta qui
  // faceva saltare la larghezza passando dai riquadri alla sezione.
  sezione: { width: '100%', alignSelf: 'center' },
  benvenuto: { borderRadius: 32, padding: spazio.quattro - 2, gap: spazio.tre + 2, overflow: 'hidden' },
  bagliore: { position: 'absolute', width: 260, height: 260, borderRadius: 130, right: -90, top: -110, backgroundColor: '#FF5701', opacity: 0.28, filter: 'blur(50px)' } as object,
  marchio: { width: 104, height: 84 },
  data: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  profilo: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingLeft: 10, paddingRight: 8, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.12)' },
  profiloTesto: { color: '#fff', fontFamily: F.extra, fontSize: 12 },
  dataTesto: { color: 'rgba(255,255,255,0.6)', fontFamily: F.extra, fontSize: 11.5, letterSpacing: 1.2 },
  ciao: { color: '#fff', fontFamily: F.extra, fontSize: 28, lineHeight: 32, letterSpacing: -0.9 },
  pillola: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  puntino: { width: 8, height: 8, borderRadius: 3 },
  pillolaTesto: { color: 'rgba(255,255,255,0.85)', fontFamily: F.semi, fontSize: 13 },
  contatti: { color: 'rgba(255,255,255,0.5)', fontFamily: F.medio, fontSize: 12.5 },
})
