import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useState } from 'react'
import { Platform, StyleSheet, Text, View } from 'react-native'

import { spazio } from '@/theme'

import { Icona, type NomeIcona } from './Icona'
import { F, FUOCO, NOTTE } from './tema'
import { Tocco } from './Tocco'

// «Installa l'app» (PWA). Sul web e solo se non e' gia' installata, in
// evidenza nella Home e nella pagina di accesso, con la procedura del
// dispositivo e del browser che si sta usando (15/10/2026):
//
// - Chrome, Edge, Samsung su Android (e il computer): se il browser ha tenuto
//   da parte la richiesta (public/index.html, `beforeinstallprompt`) c'e' il
//   pulsante «Installa»; i passi restano sotto, per quando non la offre.
// - iPhone e iPad: la richiesta non esiste, quindi solo i passi di Safari, o
//   di Chrome/Firefox per iOS.
// - Dentro Instagram, Facebook, Gmail e simili non si installa niente: prima
//   si apre la pagina nel browser vero, e c'e' il pulsante per copiare il link.
//
// «Non ora» la nasconde per una settimana, non per sempre: l'app installata
// e' quella che vogliamo che usino. Su iPhone l'app installata ha un accesso
// suo, separato da Safari: per questo la si propone anche prima di entrare.

const CHIAVE = 'athlon:installa-dopo'
const SETTIMANA = 7 * 86_400_000

type Richiesta = { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
type Finestra = Window & { __installa?: Richiesta | null }

type Caso = 'ios-safari' | 'ios-altro' | 'android-chrome' | 'android-samsung' | 'android-firefox' | 'in-app' | 'computer'
type Passo = { icona: NomeIcona; testo: string; forte?: string; poi?: string }

function installata(): boolean {
  if (typeof window === 'undefined') return true
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

/** Il dispositivo e il browser, dallo user agent: basta a scegliere i passi giusti. */
function caso(): Caso {
  const ua = navigator.userAgent
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const android = /Android/i.test(ua)
  // I browser dentro le app: non installano niente.
  if (/Instagram|FBAN|FBAV|FB_IAB|Line\/|GSA\/|Snapchat|Twitter|LinkedInApp|TikTok|musical_ly/i.test(ua) || (android && /; wv\)/.test(ua))) return 'in-app'
  if (ios) return /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua) ? 'ios-altro' : 'ios-safari'
  if (android) return /SamsungBrowser/i.test(ua) ? 'android-samsung' : /Firefox/i.test(ua) ? 'android-firefox' : 'android-chrome'
  return 'computer'
}

function rimandata(): boolean {
  try {
    return Number(localStorage.getItem(CHIAVE) ?? 0) > Date.now()
  } catch {
    return false
  }
}

function passi(c: Caso, dopoAccesso: boolean): { titolo: string; passi: Passo[] } {
  const ultimo: Passo = dopoAccesso
    ? { icona: 'casa', testo: 'Apri ', forte: 'Athlon Club 4.0', poi: ' dall’icona sulla schermata Home ed entra con la tua email: l’app installata ha un accesso suo.' }
    : { icona: 'casa', testo: 'Apri ', forte: 'Athlon Club 4.0', poi: ' dall’icona sulla schermata Home, ed entra lì con la tua email.' }
  switch (c) {
    case 'ios-safari':
      return {
        titolo: 'Su iPhone, con Safari',
        passi: [
          { icona: 'condividi', testo: 'Tocca ', forte: 'Condividi', poi: ' (il quadrato con la freccia in su) nella barra di Safari. Se non lo vedi, tocca prima «•••».' },
          { icona: 'aggiungiQuadrato', testo: 'Scorri l’elenco e tocca ', forte: 'Aggiungi alla schermata Home', poi: '. Se non c’è, tocca «Mostra altro» in fondo.' },
          { icona: 'spunta', testo: 'Lascia acceso ', forte: 'Apri come app web', poi: ' e tocca «Aggiungi» in alto a destra.' },
          ultimo,
        ],
      }
    case 'ios-altro':
      return {
        titolo: 'Su iPhone, con Chrome o un altro browser',
        passi: [
          { icona: 'condividi', testo: 'Tocca ', forte: 'Condividi', poi: ' (il quadrato con la freccia in su) nella barra dell’indirizzo, in alto a destra, o nel menu.' },
          { icona: 'aggiungiQuadrato', testo: 'Scegli ', forte: 'Aggiungi alla schermata Home', poi: ' e conferma con «Aggiungi».' },
          ultimo,
          { icona: 'apriFuori', testo: 'Non trovi la voce? Apri questa pagina in ', forte: 'Safari', poi: ': lì funziona sempre.' },
        ],
      }
    case 'android-samsung':
      return {
        titolo: 'Su Android, con Samsung Internet',
        passi: [
          { icona: 'menuRighe', testo: 'Tocca il ', forte: 'menu ☰', poi: ' in basso a destra.' },
          { icona: 'aggiungiQuadrato', testo: 'Scegli ', forte: 'Aggiungi pagina a', poi: ', poi «Schermata Home».' },
          { icona: 'spunta', testo: 'Conferma con ', forte: 'Aggiungi', poi: '.' },
          ultimo,
        ],
      }
    case 'android-firefox':
      return {
        titolo: 'Su Android, con Firefox',
        passi: [
          { icona: 'menuPunti', testo: 'Tocca il ', forte: 'menu ⋮', poi: ' accanto alla barra dell’indirizzo.' },
          { icona: 'scarica', testo: 'Scegli ', forte: 'Installa', poi: ' (o «Aggiungi alla schermata Home») e conferma.' },
          ultimo,
        ],
      }
    case 'in-app':
      return {
        titolo: 'Prima apri la pagina nel browser',
        passi: [
          { icona: 'menuPunti', testo: 'Sei dentro un’altra app (Instagram, Facebook, Gmail…): da qui non si installa. Tocca ', forte: '••• o ⋮', poi: ' in alto.' },
          { icona: 'apriFuori', testo: 'Scegli ', forte: 'Apri nel browser', poi: ' (Safari su iPhone, Chrome su Android), oppure copia il link qui sotto e incollalo lì.' },
          { icona: 'aggiungiQuadrato', testo: 'Nel browser torna su questa pagina: ti diciamo i passi per ', forte: 'installarla', poi: '.' },
        ],
      }
    case 'computer':
      return { titolo: 'Sul computer', passi: [{ icona: 'scarica', testo: 'Usa il pulsante ', forte: 'Installa', poi: ' qui sopra, o l’icona di installazione nella barra dell’indirizzo.' }] }
    default:
      return {
        titolo: 'Su Android, con Chrome',
        passi: [
          { icona: 'menuPunti', testo: 'Tocca il ', forte: 'menu ⋮', poi: ' in alto a destra.' },
          { icona: 'scarica', testo: 'Scegli ', forte: 'Installa app', poi: ' (o «Aggiungi a schermata Home»).' },
          { icona: 'spunta', testo: 'Conferma con ', forte: 'Installa', poi: '.' },
          ultimo,
        ],
      }
  }
}

/** Il riquadro «Installa l'app». `dopoAccesso`: nella pagina di accesso, prima di entrare. */
export function Installa({ dopoAccesso = false }: { dopoAccesso?: boolean }) {
  const [stato, setStato] = useState<{ caso: Caso; richiesta: boolean } | null>(null)
  const [aperti, setAperti] = useState(false)
  const [copiato, setCopiato] = useState(false)

  useEffect(() => {
    if (Platform.OS !== 'web' || installata() || rimandata()) return
    const w = window as Finestra
    const aggiorna = () => {
      const c = caso()
      const richiesta = !!w.__installa
      // Sul computer si mostra solo se il browser sa installare.
      setStato(c === 'computer' && !richiesta ? null : { caso: c, richiesta })
    }
    aggiorna()
    window.addEventListener('athlon-installabile', aggiorna)
    const fatta = () => setStato(null)
    window.addEventListener('appinstalled', fatta)
    return () => {
      window.removeEventListener('athlon-installabile', aggiorna)
      window.removeEventListener('appinstalled', fatta)
    }
  }, [])

  if (!stato) return null

  const nonOra = () => {
    try {
      localStorage.setItem(CHIAVE, String(Date.now() + SETTIMANA))
    } catch {
      // Senza memoria del browser il riquadro torna alla prossima apertura: va bene.
    }
    setStato(null)
  }

  async function installa() {
    const w = window as Finestra
    const r = w.__installa
    if (!r) return
    await r.prompt()
    const scelta = await r.userChoice.catch(() => null)
    w.__installa = null
    if (scelta?.outcome === 'accepted') setStato(null)
    else setStato((s) => (s ? { ...s, richiesta: false } : s))
  }

  async function copiaLink() {
    try {
      await navigator.clipboard.writeText(`${location.origin}/lab`)
      setCopiato(true)
    } catch {
      setCopiato(false)
    }
  }

  const guida = passi(stato.caso, dopoAccesso)
  // Col pulsante del browser i passi sono il ripiego: chiusi, si aprono a richiesta.
  const mostraPassi = !stato.richiesta || aperti

  return (
    <LinearGradient colors={NOTTE} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={stili.riquadro}>
      <View style={stili.bagliore} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spazio.tre }}>
        <Image source={{ uri: '/apple-touch-icon.png' }} style={stili.icona} accessibilityIgnoresInvertColors />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={stili.occhiello}>{dopoAccesso ? 'PRIMA DI ENTRARE' : 'CONSIGLIATO'}</Text>
          <Text style={stili.titolo}>Installa l’app sul telefono</Text>
        </View>
      </View>
      <Text style={stili.testo}>
        Athlon Club 4.0 si salva sulla schermata Home come un’app: si apre a tutto schermo con un tocco, senza cercarla nel browser. Non serve passare dall’App Store o da Google Play.
      </Text>

      {stato.richiesta ? (
        <Tocco onPress={installa} etichetta="Installa l’app" style={stili.pulsante}>
          <LinearGradient colors={FUOCO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.pulsanteFondo}>
            <Icona nome="scarica" size={18} colore="#fff" />
            <Text style={stili.pulsanteTesto}>Installa</Text>
          </LinearGradient>
        </Tocco>
      ) : null}

      {mostraPassi ? (
        <View style={stili.passi}>
          <Text style={stili.guida}>{guida.titolo.toUpperCase()}</Text>
          {guida.passi.map((x, i) => (
            <View key={i} style={stili.passo}>
              <View style={stili.numero}>
                <Text style={stili.numeroTesto}>{i + 1}</Text>
              </View>
              <Text style={stili.passoTesto}>
                {x.testo}
                {x.forte ? <Text style={stili.forte}>{x.forte}</Text> : null}
                {x.poi}
              </Text>
              <Icona nome={x.icona} size={20} colore={FUOCO[0]} />
            </View>
          ))}
          {stato.caso === 'in-app' || stato.caso === 'ios-altro' ? (
            <Tocco onPress={copiaLink} etichetta="Copia il link" style={stili.secondario}>
              <Icona nome={copiato ? 'spunta' : 'copia'} size={16} colore="#fff" />
              <Text style={stili.secondarioTesto}>{copiato ? 'Link copiato' : 'Copia il link'}</Text>
            </Tocco>
          ) : null}
        </View>
      ) : (
        <Tocco onPress={() => setAperti(true)} etichetta="Mostra i passi" ruolo="link">
          <Text style={stili.link}>Non si apre? Ecco i passi</Text>
        </Tocco>
      )}

      <Tocco onPress={nonOra} etichetta="Non ora" style={{ alignSelf: 'center', padding: 6 }}>
        <Text style={stili.nonOra}>Non ora</Text>
      </Tocco>
    </LinearGradient>
  )
}

const BIANCO_70 = 'rgba(255,255,255,0.72)'

const stili = StyleSheet.create({
  riquadro: { borderRadius: 28, padding: spazio.quattro - 4, gap: spazio.tre, overflow: 'hidden', boxShadow: '0 16px 40px rgba(0,0,0,0.22)' } as object,
  bagliore: { position: 'absolute', width: 260, height: 260, borderRadius: 130, right: -90, top: -110, backgroundColor: '#FF5701', opacity: 0.32, filter: 'blur(50px)' } as object,
  icona: { width: 52, height: 52, borderRadius: 13 },
  occhiello: { color: FUOCO[0], fontFamily: F.extra, fontSize: 10.5, letterSpacing: 1.4 },
  titolo: { color: '#fff', fontFamily: F.extra, fontSize: 19, letterSpacing: -0.4 },
  testo: { color: BIANCO_70, fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  pulsante: { borderRadius: 999, overflow: 'hidden' },
  pulsanteFondo: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', minHeight: 50, borderRadius: 999 },
  pulsanteTesto: { color: '#fff', fontFamily: F.extra, fontSize: 16 },
  passi: { gap: spazio.due + 2, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: spazio.tre, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  guida: { color: BIANCO_70, fontFamily: F.extra, fontSize: 10.5, letterSpacing: 1.3 },
  passo: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  numero: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#FF5701', alignItems: 'center', justifyContent: 'center' },
  numeroTesto: { color: '#fff', fontFamily: F.extra, fontSize: 13 },
  passoTesto: { flex: 1, color: BIANCO_70, fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  forte: { color: '#fff', fontFamily: F.extra },
  secondario: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', minHeight: 44, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  secondarioTesto: { color: '#fff', fontFamily: F.bold, fontSize: 14.5 },
  link: { color: FUOCO[0], fontFamily: F.bold, fontSize: 14, textAlign: 'center' },
  nonOra: { color: 'rgba(255,255,255,0.55)', fontFamily: F.semi, fontSize: 13.5 },
})
