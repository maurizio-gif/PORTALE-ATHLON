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
import { laMiaArea, leggiAnagrafica, leggiGiorno, leggiVetrine, type Anagrafica, type Area, type EsitoAnagrafica, type PersonaArea } from '@/api/lab'
import type { Tessera } from '@/api/tesseramenti'
import { locale, t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { CHIAVE_CONTRATTI, ElencoAbbonamenti } from './AbbonamentiMiei'
import { AvvisoCertificato } from './home/AvvisoCertificato'
import { CartaInvita } from './home/CartaInvita'
import { CartaJunior } from './home/CartaJunior'
import { CartaShop } from './home/CartaShop'
import { DaFare } from './home/DaFare'
import { MessaggioBenvenuto } from './home/MessaggioBenvenuto'
import { Campanello } from './notifiche/Campanello'
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
import { inMemoria, precarica, prendi, ricorda } from './memoria'
import { useMovimenti } from './pagamenti/Movimenti'
import { ProfiloContenuto } from './Profilo'
import { AvatarFoto } from './profilo/AvatarFoto'
import { FoglioFoto } from './profilo/FotoProfilo'
import { conFotoLocale, ricordaFotoLocale } from './profilo/fotoLocale'
import { memoria as memoriaTv } from './tv/comune'
import { Icona } from './ui/Icona'
import { Entra, Messaggio, Pulsante, SchedeInArrivo } from './ui/kit'
import { Installa } from './ui/Installa'
import { Schermata } from './ui/Schermata'
import { PulsanteEsci } from './ui/Uscita'
import { F, FUOCO, MARE, NOTTE } from './ui/tema'
import { colpetto, Tocco } from './ui/Tocco'

// La Home dell'app (17/10/2026): l'hub dell'account. In cima chi sei e le cose
// da fare; poi cinque riquadri (Abbonamenti, Pagamenti, Certificato, Famiglia,
// Profilo) che mostrano un dato vivo e scelgono la sezione sotto. La sezione
// sta nell'indirizzo, `/?sezione=pagamenti`, cosi' un link o un
// ricaricamento tornano al punto giusto. Tutto dal mirror di PerfectGym
// (portale_la_mia_area) e dalle schermate delle sezioni.

/** Quanto e' grande l'avatar della testata: con le iniziali erano 38, ma una faccia in 38 punti non si riconosce (19/10/2026). */
const AVATAR_TESTATA = 52

/**
 * La testata scura: la data, l'avatar, il saluto, le pillole di chi sei. Toccandola si apre il profilo, nella Home.
 *
 * **L'avatar e' la foto del profilo**, se c'e' (19/10/2026, richiesta di Maurizio: prima erano sempre le iniziali); se
 * manca restano le iniziali, con l'invito a metterla (anello che pulsa, fotocamera, «Aggiungi la tua foto») e toccando
 * il gruppo si apre subito il foglio per scattarla o sceglierla. Con la foto l'avatar non e' un comando a parte: il
 * tocco va al Profilo, dove «Cambia foto» c'e' gia'.
 */
function Benvenuto({
  titolare,
  email,
  famiglia,
  foto,
  invitoFoto,
  onProfilo,
  onFoto,
}: {
  titolare: PersonaArea | undefined
  email: string
  famiglia: number
  /** Il link firmato della foto del profilo, se c'e'. */
  foto: string | null
  /** La foto manca e si puo' metterla: invito sull'avatar (non con il Profilo aperto sotto, che ha il suo: un invito solo). */
  invitoFoto: boolean
  onProfilo: () => void
  onFoto: () => void
}) {
  // Su un telefono molto stretto (320 pt) la data non ha piu' posto accanto a campanello e Profilo, e a pezzi non dice niente: si toglie.
  const { width: larghezza } = useWindowDimensions()
  const conData = larghezza >= 340
  const avatar = (
    <View style={[stili.data, { gap: 12, flexShrink: 1 }]}>
      <AvatarFoto nome={titolare?.nome ?? email} cognome={titolare?.cognome} foto={foto} size={AVATAR_TESTATA} anello="rgba(255,255,255,0.18)" invito={invitoFoto} />
      <View style={{ gap: 3, flexShrink: 1 }}>
        {conData ? <Text style={stili.dataTesto} numberOfLines={2}>{oggi().toUpperCase()}</Text> : null}
        {invitoFoto ? <Text style={stili.invitoFoto}>{t('Aggiungi la tua foto', 'Add your photo')}</Text> : null}
      </View>
    </View>
  )
  return (
    <Tocco onPress={onProfilo} ruolo="link" etichetta={t('Il mio profilo: anagrafica e contatti', 'My profile: personal and contact details')} scala={0.985}>
    <LinearGradient colors={NOTTE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.benvenuto}>
      <View style={stili.bagliore} />
      <View style={[stili.data, { justifyContent: 'space-between', gap: 8 }]}>
        {invitoFoto ? (
          <Tocco onPress={onFoto} etichetta={t('Aggiungi la tua foto', 'Add your photo')} scala={0.96} style={{ flexShrink: 1 }}>
            {avatar}
          </Tocco>
        ) : (
          avatar
        )}
        {/* A destra campanello e Profilo non si restringono mai: e' la data a cedere (va a capo) su un telefono stretto. */}
        <View style={[stili.data, { gap: 8, flexShrink: 0 }]}>
          {/* Il campanello delle notifiche del club (features/lab/notifiche): non si vede finche' la funzione non risponde. */}
          <Campanello />
          <View style={stili.profilo}>
            <Icona nome="persona" size={14} colore="#fff" />
            <Text style={stili.profiloTesto}>{t('Profilo', 'Profile')}</Text>
            <Icona nome="avanti" size={13} colore="rgba(255,255,255,0.7)" />
          </View>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spazio.tre }}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={stili.ciao} numberOfLines={2}>
            {titolare?.nome ? t(`Ciao, ${titolare.nome}!`, `Hi, ${titolare.nome}!`) : t('Ciao!', 'Hi!')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
            <View style={stili.pillola}>
              <View style={[stili.puntino, { backgroundColor: FUOCO[0] }]} />
              <Text style={stili.pillolaTesto}>{titolare?.numero ? t(`Numero Utente ${titolare.numero}`, `Member number ${titolare.numero}`) : t('Socio', 'Member')}</Text>
            </View>
            {famiglia || titolare?.numero ? (
              <View style={stili.pillola}>
                <View style={[stili.puntino, { backgroundColor: MARE[0] }]} />
                <Text style={stili.pillolaTesto}>{famiglia ? t(`Famiglia di ${famiglia + 1}`, `Family of ${famiglia + 1}`) : t('Socio', 'Member')}</Text>
              </View>
            ) : null}
            {titolare?.debito ? (
              <View style={[stili.pillola, { backgroundColor: 'rgba(255,69,58,0.28)' }]}>
                <View style={[stili.puntino, { backgroundColor: '#FF453A' }]} />
                <Text style={stili.pillolaTesto}>{t('Pagamento in sospeso', 'Outstanding payment')}</Text>
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
  return n.toLocaleString(locale(), { style: 'currency', currency: 'EUR' })
}

/** «15 nov», all'ora di Roma. */
function dataCorta(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString(locale(), { day: 'numeric', month: 'short', timeZone: 'Europe/Rome' })
}

type AreaTrovata = Extract<Area, { trovato: true }>

/** Il certificato piu' urgente del nucleo, per il riquadro: chi e come sta. */
function riquadroCertificato(area: AreaTrovata): VoceRiquadro {
  const righe = area.persone.map((persona) => ({ persona, s: statoCertificato(area.certificati.find((c) => c.member_id === persona.member_id), persona.data_nascita) }))
  // A pari urgenza resta il primo del nucleo, cioe' il titolare.
  const { persona, s } = righe.reduce((a, b) => (urgenzaCertificato(b.s) > urgenzaCertificato(a.s) ? b : a))
  const chi = persona.titolare ? t('Tu', 'You') : persona.nome || nome(persona)
  const quando = s.giorni != null ? (s.giorni < 0 ? t(`scaduto da ${giorni(-s.giorni)}`, `expired ${giorni(-s.giorni)} ago`) : s.giorni === 0 ? t('scade oggi', 'expires today') : t(`ancora ${giorni(s.giorni)}`, `${giorni(s.giorni)} left`)) : s.breve
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
  if (!r.totale) return { valore: '0', nota: t('attivi', 'active') }
  if (r.tono) {
    const motivo = r.motivi.length <= 2 ? r.motivi.map((m) => m.breve).join(' · ') : t(`${r.motivi.length} cose da sistemare`, `${r.motivi.length} things to fix`)
    return { valore: String(r.totale), nota: motivo.charAt(0).toUpperCase() + motivo.slice(1), tag: { testo: t('Irregolare', 'Irregular'), tono: r.tono } }
  }
  if (r.attivi === r.totale) return { valore: String(r.totale), nota: r.totale === 1 ? t('attivo', 'active') : t('attivi', 'active') }
  const parti = [
    r.attivi ? t(`${r.attivi} attiv${r.attivi === 1 ? 'o' : 'i'}`, `${r.attivi} active`) : null,
    r.inPartenza ? (r.partenza ? t(`parte il ${dataCorta(r.partenza).replace(' ', '\u00a0')}`, `starts ${dataCorta(r.partenza).replace(' ', '\u00a0')}`) : t(`${r.inPartenza} in partenza`, `${r.inPartenza} starting soon`)) : null,
    r.sospesi ? t(`${r.sospesi} sospes${r.sospesi === 1 ? 'o' : 'i'}`, `${r.sospesi} frozen`) : null,
  ].filter(Boolean)
  return { valore: String(r.totale), nota: parti.join(' · ') }
}

/** Il dato del riquadro Tesseramento: «Attiva» e la scadenza, o quante tessere attive ci sono nel nucleo. */
function riquadroTesseramento(tessere: Tessera[]): VoceRiquadro {
  if (tessere.length === 1) {
    const al = tessere[0].al
    return { valore: t('Attiva', 'Active'), nota: al ? t(`fino al ${dataCorta(al).replace(' ', '\u00a0')}`, `until ${dataCorta(al).replace(' ', '\u00a0')}`) : t('tessera ASI', 'ASI card') }
  }
  return { valore: String(tessere.length), nota: t('tessere attive', 'active cards') }
}

/**
 * Va invitata a mettere la foto? Solo se la funzione dice che si puo' cambiare (`foto_modificabile`: non in vista
 * cliente, non con una funzione che non la conosce) e una foto non c'e' - nemmeno una appena scelta e non ancora pronta.
 */
function invitoDa(a: Anagrafica | null | undefined): boolean {
  return !!a && a.foto_modificabile === true && !conFotoLocale(a).foto
}

export function AreaRiservata({ email }: { email: string }) {
  const [area, setArea] = useState<Area | null>(inMemoria<{ ok: true; area: Area }>('area')?.area ?? null)
  const [errore, setErrore] = useState<{ testo: string; nonAmmesso: boolean } | null>(null)
  // L'anagrafica serve alla testata (la foto, o l'invito a metterla) e al Profilo: la Home parte da quella in memoria.
  const [anagrafica, setAnagrafica] = useState<Anagrafica | null>(() => {
    const gia = inMemoria<EsitoAnagrafica>('anagrafica')
    return gia?.ok ? conFotoLocale(gia.anagrafica) : null
  })
  const [foglioFoto, setFoglioFoto] = useState(false)
  const [fotoFatta, setFotoFatta] = useState<string | null>(null)
  const anagraficaRiletta = useRef(false)
  const invitoFoto = invitoDa(anagrafica)
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

  // Il Profilo, quando si apre, dice com'e' la foto: la testata la segue, e si smette di invitare appena la si mette.
  const aggiornaAnagrafica = useCallback((a: Anagrafica) => setAnagrafica(a), [])

  // L'avviso «foto aggiornata» resta qualche secondo, poi se ne va (come nel Profilo).
  useEffect(() => {
    if (!fotoFatta) return
    const timer = setTimeout(() => setFotoFatta(null), 4000)
    return () => clearTimeout(timer)
  }, [fotoFatta])

  // La foto scelta dal foglio della testata: se le misure non sono ancora pronte su PerfectGym (`inArrivo`) si tiene quella
  // appena scelta per un po', al posto del link che non c'e' ancora; altrimenti la funzione ha gia' risposto col link nuovo.
  function fotoSalvata(a: Anagrafica, esito: { anteprima: string; inArrivo: boolean }) {
    colpetto('ok')
    ricordaFotoLocale(esito.inArrivo ? esito.anteprima : null)
    const conFoto = conFotoLocale(a)
    ricorda('anagrafica', { ok: true, anagrafica: conFoto })
    setAnagrafica(conFoto)
    setFoglioFoto(false)
    setFotoFatta(esito.inArrivo ? t('Foto salvata. Per la segreteria sarà pronta fra qualche minuto.', 'Photo saved. It’ll be ready for the front desk in a few minutes.') : t('Foto aggiornata.', 'Photo updated.'))
  }

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
      // L'anagrafica serve al Profilo e alla testata (la foto, o l'invito a metterla). Si rilegge una volta a ogni apertura
      // della Home, anche se in memoria c'e': il link della foto e' firmato e dura un'ora, e uno scaduto mostrerebbe le iniziali.
      const gia = inMemoria<EsitoAnagrafica>('anagrafica')
      if (gia?.ok) setAnagrafica(conFotoLocale(gia.anagrafica))
      if (!anagraficaRiletta.current) {
        anagraficaRiletta.current = true
        prendi('anagrafica', leggiAnagrafica).then((r) => r.ok && setAnagrafica(conFotoLocale(r.anagrafica)))
      }
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
  const uscita = <PulsanteEsci testo={t('Esci', 'Sign out')} conferma={false} />

  if (errore) {
    return (
      <Schermata titolo={errore.nonAmmesso ? t('Accesso non disponibile', 'Access not available') : t('Qualcosa non va', 'Something went wrong')}>
        <Messaggio tono={errore.nonAmmesso ? 'attenzione' : 'errore'}>{errore.testo}</Messaggio>
        {!errore.nonAmmesso ? <Pulsante testo={t('Riprova', 'Try again')} icona="aggiorna" onPress={carica} /> : null}
        {uscita}
      </Schermata>
    )
  }

  if (!area) {
    return (
      <Schermata titolo={t('La mia area', 'My area')}>
        <SchedeInArrivo />
      </Schermata>
    )
  }

  if (!area.trovato) {
    return (
      <Schermata titolo={t('La mia area', 'My area')}>
        <Messaggio tono="attenzione" titolo={t('Non troviamo la tua scheda', 'We can’t find your profile')}>
          {t(`Non c’è una scheda del club con l’indirizzo ${email}. Entra con l’email con cui sei iscritto.`, `There’s no club profile with the address ${email}. Sign in with the email you registered with.`)}
        </Messaggio>
        {uscita}
      </Schermata>
    )
  }

  const titolare = area.persone.find((x) => x.member_id === area.titolare)
  const famiglia = area.persone.filter((x) => !x.titolare)

  // Il dato vivo di ogni riquadro: dall'area, e per i pagamenti dai movimenti.
  const debito = area.persone.reduce((tot, x) => tot + (x.debito?.importo ?? 0), 0)
  const daSaldare = movimenti.dati?.daSaldare.reduce((tot, m) => tot + m.importo, 0) ?? 0
  const prossimo = movimenti.dati?.futuri[0]
  const pagamenti: VoceRiquadro =
    debito > 0 || daSaldare > 0
      ? { valore: t('In sospeso', 'Outstanding'), nota: t(`${soldi(Math.max(debito, daSaldare))} da saldare`, `${soldi(Math.max(debito, daSaldare))} to pay`), allerta: 'errore' }
      : prossimo
        ? { valore: dataCorta(prossimo.scadenza), nota: t(`prossimo addebito · ${soldi(prossimo.importo)}`, `next charge · ${soldi(prossimo.importo)}`) }
        : movimenti.dati
          ? { valore: t('In regola', 'Up to date'), nota: t('nessun addebito in vista', 'no upcoming charges') }
          : movimenti.errore
            ? { valore: t('Apri', 'Open'), nota: t('prossimi pagamenti', 'upcoming payments') }
            : { valore: '…', nota: t('un attimo', 'one moment') }
  const nDocumenti = documenti.dati?.documenti.length
  const validi = prodotti.dati?.filter((x) => x.stato === 'valido').length
  const voci: Record<SezioneHome, VoceRiquadro> = {
    abbonamenti: riquadroAbbonamenti(area),
    pagamenti,
    prodotti:
      validi != null && prodotti.dati
        ? { valore: String(validi), nota: t(`${validi === 1 ? 'valido' : 'validi'} · ${prodotti.dati.length - validi} ${prodotti.dati.length - validi === 1 ? 'consumato' : 'consumati'}`, `valid · ${prodotti.dati.length - validi} used`) }
        : prodotti.errore
          ? { valore: t('Apri', 'Open'), nota: t('lezioni, accessi, recuperi', 'classes, visits, make-up classes') }
          : { valore: '…', nota: t('un attimo', 'one moment') },
    documenti:
      nDocumenti != null
        ? { valore: String(nDocumenti), nota: nDocumenti === 1 ? t('documento', 'document') : t('documenti', 'documents') }
        : documenti.errore
          ? { valore: t('Apri', 'Open'), nota: t('contratti e ricevute', 'contracts and receipts') }
          : { valore: '…', nota: t('un attimo', 'one moment') },
    certificato: riquadroCertificato(area),
    famiglia: { valore: String(area.persone.length), nota: area.persone.length === 1 ? t('persona', 'person') : t('persone', 'people') },
    profilo: { valore: titolare?.nome || t('Profilo', 'Profile'), nota: invitoFoto ? t('Aggiungi la tua foto', 'Add your photo') : titolare?.email || email },
    tesseramento: riquadroTesseramento(tesseramenti ?? []),
  }

  return (
    <Schermata titolo={titolare?.nome ? t(`Ciao, ${titolare.nome}`, `Hi, ${titolare.nome}`) : t('La mia area', 'My area')} nascondiTitolo scorrimento={scorrimento}>
      <Entra indice={0}>
        <Benvenuto titolare={titolare} email={email} famiglia={famiglia.length} foto={anagrafica?.foto ?? null} invitoFoto={invitoFoto && sezione !== 'profilo'} onProfilo={() => vai('profilo', true)} onFoto={() => setFoglioFoto(true)} />
      </Entra>

      {fotoFatta ? <Messaggio tono="ok">{fotoFatta}</Messaggio> : null}

      {/* Il certificato scaduto o mancante di chi ha un abbonamento: subito sotto la testata, prima di tutto il resto (home/AvvisoCertificato). */}
      <AvvisoCertificato area={area} onVai={() => vai('certificato', true)} />

      {/* Il messaggio di benvenuto: scritto a ogni ritorno nell'app, spinge verso il prossimo passo (home/MessaggioBenvenuto). */}
      <MessaggioBenvenuto email={email} onSezione={(s) => vai(s, true)} />

      <DaFare area={area} onSezione={(s) => vai(s, true)} />

      {/* L'invito di un amico: il link personale da condividere, solo per chi ha un abbonamento in vigore (home/CartaInvita). */}
      <CartaInvita area={area} />

      {/* Lo shop: una voce della barra e, qui, la sua carta, fuori dalla sezione Prodotti (home/CartaShop). */}
      <CartaShop />

      {/* La sezione Junior: i gruppi dei corsi per bambini e ragazzi con i posti liberi, per anno di nascita (home/CartaJunior). */}
      <CartaJunior area={area} />

      <Installa />

      <View ref={riquadri}>
        <Entra indice={2}>
          <Riquadri voci={voci} scelta={sezione} onScegli={(s) => vai(s)} sezioni={sezioniVisibili} />
        </Entra>
      </View>

      {/* Almeno un'altezza di schermo, meno poco: cosi' i riquadri si possono portare in cima anche con una sezione corta. */}
      <Entra key={sezione} indice={0} style={[stili.sezione, { minHeight: Math.max(0, height - 220) }]}>
        {sezione === 'abbonamenti' ? <ElencoAbbonamenti area={area} onSezione={(s) => vai(s, true)} /> : null}
        {sezione === 'pagamenti' ? <SezionePagamenti area={area} onAggiorna={carica} /> : null}
        {sezione === 'prodotti' ? <SezioneProdotti /> : null}
        {sezione === 'documenti' ? <SezioneDocumenti /> : null}
        {sezione === 'certificato' ? <SezioneCertificato area={area} onAggiorna={carica} /> : null}
        {sezione === 'famiglia' ? <SezioneFamiglia area={area} /> : null}
        {sezione === 'profilo' ? <ProfiloContenuto onAnagrafica={aggiornaAnagrafica} /> : null}
        {sezione === 'tesseramento' && tesseramenti ? <SezioneTesseramento tessere={tesseramenti} /> : null}
      </Entra>

      {foglioFoto ? <FoglioFoto attuale={anagrafica?.foto ?? null} onChiudi={() => setFoglioFoto(false)} onSalvato={fotoSalvata} /> : null}
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
  invitoFoto: { color: FUOCO[0], fontFamily: F.semi, fontSize: 12.5 },
  ciao: { color: '#fff', fontFamily: F.extra, fontSize: 28, lineHeight: 32, letterSpacing: -0.9 },
  pillola: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  puntino: { width: 8, height: 8, borderRadius: 3 },
  pillolaTesto: { color: 'rgba(255,255,255,0.85)', fontFamily: F.semi, fontSize: 13 },
  contatti: { color: 'rgba(255,255,255,0.5)', fontFamily: F.medio, fontSize: 12.5 },
})
