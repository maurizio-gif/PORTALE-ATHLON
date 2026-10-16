import { useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import type { CertificatoArea, PersonaArea } from '@/api/lab'
import { dataBreve } from '@/lib/metodoPagamento'
import { spazio } from '@/theme'

import { Icona } from '../ui/Icona'
import { Etichetta, Riga } from '../ui/kit'
import { F, usePalette } from '../ui/tema'

// Il certificato medico, come lo leggono la Home (riquadro, «Da fare») e la
// sezione Certificato: lo stato di ogni persona e la «i» di quale serve.
// Tutto dai dati di portale_la_mia_area; niente si scrive.

export function nome(p: Pick<PersonaArea, 'nome' | 'cognome'>): string {
  return [p.nome, p.cognome].filter(Boolean).join(' ') || 'Senza nome'
}

export const GIORNO = 86_400_000

/**
 * I giorni di calendario da oggi (a Roma) a quella data: 0 oggi, negativi nel
 * passato. Fra due mezzogiorni, non da adesso: con l'ora del momento le date
 * passate venivano un giorno corte.
 */
export function giorniA(iso: string | null): number | null {
  if (!iso) return null
  const t = new Date(iso.slice(0, 10) + 'T12:00:00Z').getTime()
  const oggi = new Date(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date()) + 'T12:00:00Z').getTime()
  return Number.isFinite(t) ? Math.round((t - oggi) / GIORNO) : null
}

/** «martedì 14 ottobre», all'ora di Roma. */
export function oggi(): string {
  return new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Rome' }).format(new Date())
}

/** «1 giorno», «76 giorni». */
export function giorni(n: number): string {
  return `${n} ${n === 1 ? 'giorno' : 'giorni'}`
}

/** Il giorno dei 6 anni, dalla data di nascita: da li' il certificato e' obbligatorio. */
function seiAnni(nascita: string | null | undefined): string | null {
  const m = String(nascita ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  // Date.UTC porta il 29 febbraio di un anno non bisestile al 1° marzo.
  return new Date(Date.UTC(Number(m[1]) + 6, Number(m[2]) - 1, Number(m[3]))).toISOString().slice(0, 10)
}

export type StatoCertificato = {
  testo: string
  tono: 'ok' | 'attenzione' | 'errore' | 'neutro'
  /** I giorni alla scadenza (negativi se scaduto); null se non c'e' una scadenza da contare. */
  giorni: number | null
  /** La riga per esteso: «Valido fino al 31/07/2027 · ancora 289 giorni». */
  dettaglio: string
  /** La riga corta del riquadro scuro, quando non ci sono giorni da contare. */
  breve: string
  /** Manca, e' scaduto o va consegnato: si spiega quale certificato serve. */
  daConsegnare: boolean
}

/**
 * Lo stato del certificato (la fine del definitivo, dal database): valido o in
 * scadenza (30 giorni) fino a quando e per quanti giorni ancora, scaduto da
 * quando e da quanti giorni, mancante se non e' mai stato consegnato. Sotto i
 * 6 anni non serve; nell'ultimo mese prima dei 6 va consegnato, come nel CRM
 * (certificati_stato: «non_dovuto», «compie_6_anni»).
 */
export function statoCertificato(ce: CertificatoArea | undefined, nascita?: string | null): StatoCertificato {
  const g = giorniA(ce?.scadenza ?? null)
  const data = dataBreve(ce?.scadenza)
  const sei = seiAnni(nascita)
  const aiSei = giorniA(sei)
  if (sei && aiSei != null && aiSei > 30) {
    return { testo: 'Non serve', tono: 'neutro', giorni: null, dettaglio: `Non serve fino ai 6 anni, il ${dataBreve(sei)}`, breve: 'fino ai 6 anni', daConsegnare: false }
  }
  if (sei && aiSei != null && aiSei > 0 && (g == null || g < aiSei)) {
    return { testo: 'Da consegnare', tono: 'attenzione', giorni: null, dettaglio: `Da consegnare entro il ${dataBreve(sei)}, quando compie 6 anni`, breve: `entro il ${dataBreve(sei)}`, daConsegnare: true }
  }
  if (g == null || !data) return { testo: 'Mancante', tono: 'neutro', giorni: null, dettaglio: 'Non è mai stato consegnato', breve: 'mai consegnato', daConsegnare: true }
  if (g < 0) return { testo: 'Scaduto', tono: 'errore', giorni: g, dettaglio: `Scaduto il ${data} · ${giorni(-g)} fa`, breve: '', daConsegnare: true }
  if (g === 0) return { testo: 'Scade oggi', tono: 'attenzione', giorni: 0, dettaglio: `Valido fino a oggi, ${data}`, breve: '', daConsegnare: false }
  return { testo: g <= 30 ? 'In scadenza' : 'Valido', tono: g <= 30 ? 'attenzione' : 'ok', giorni: g, dettaglio: `Valido fino al ${data} · ancora ${giorni(g)}`, breve: '', daConsegnare: false }
}

/** Quanto e' urgente un certificato: piu' alto e', prima si mostra (scaduto, mai consegnato, da consegnare, in scadenza). */
export function urgenzaCertificato(s: StatoCertificato): number {
  if (s.tono === 'errore') return 5
  if (s.daConsegnare) return s.testo === 'Mancante' ? 4 : 3
  if (s.tono === 'attenzione') return 2
  return s.tono === 'ok' ? 1 : 0
}

/** Serve fare qualcosa: e' scaduto, manca, va consegnato o scade fra poco. */
export function richiedeAzione(s: StatoCertificato): boolean {
  return urgenzaCertificato(s) >= 2
}

/** Il colore del pallino di un certificato, sul riquadro scuro. */
export const PALLINO = { ok: '#6DD58C', attenzione: '#F2B84B', errore: '#FF6B6B', neutro: '#8E9098' } as const

// Quale certificato serve, dal wiki del club (Generali → Certificato medico).
// Senza «invialo al desk»: nel portale non si rimanda al desk (13/10/2026).
const QUALE_CERTIFICATO = [
  'Il certificato di idoneità all’attività sportiva non agonistica, obbligatorio dai 6 anni. Si consegna solo in formato digitale.',
  'Lo rilasciano il medico di base o il pediatra (per i propri assistiti), o un medico dello sport.',
  'Vale un anno dalla data di rilascio. Serve un ECG a riposo almeno una volta nella vita; ogni anno dopo i 60 anni, con fattori di rischio cardiovascolare.',
  'Il certificato agonistico serve solo per pallanuoto Under 14 e Under 16, nuoto agonistico e nuoto propaganda: lo rilascia solo il medico dello sport, con il modulo della società.',
]

/** La «i» con il fumetto di quale certificato serve: sul web al passaggio del mouse, sul telefono al tocco. */
function InfoCertificato({ aperta, onCambia }: { aperta: boolean; onCambia: (aperta: boolean) => void }) {
  const p = usePalette()
  // Aperto dal mouse, il clic che segue non lo deve richiudere.
  const conMouse = useRef(false)
  return (
    <View style={{ position: 'relative' }}>
      <Pressable
        onPress={() => onCambia(conMouse.current ? true : !aperta)}
        onHoverIn={() => {
          conMouse.current = true
          onCambia(true)
        }}
        onHoverOut={() => {
          conMouse.current = false
          onCambia(false)
        }}
        accessibilityRole="button"
        accessibilityLabel={`Quale certificato serve. ${QUALE_CERTIFICATO.join(' ')}`}
        hitSlop={10}
        style={[stili.info, { backgroundColor: p.incavo }]}
      >
        <Icona nome="info" size={16} colore={p.testo} />
      </Pressable>
      {aperta ? (
        <View style={[stili.fumetto, { backgroundColor: p.scuro ? '#2A2B31' : p.carbone }]} pointerEvents="none">
          <Text style={stili.fumettoTitolo}>Quale certificato serve</Text>
          {QUALE_CERTIFICATO.map((t) => (
            <View key={t} style={{ flexDirection: 'row', gap: 8 }}>
              <View style={stili.fumettoPunto} />
              <Text style={stili.fumettoTesto}>{t}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}

/** Una riga dell'elenco dei certificati; se manca o e' scaduto, con la «i». */
export function RigaCertificato({ persona, ce, prima }: { persona: PersonaArea | undefined; ce: CertificatoArea | undefined; prima: boolean }) {
  const p = usePalette()
  const [aperta, setAperta] = useState(false)
  const s = statoCertificato(ce, persona?.data_nascita)
  return (
    // Col fumetto aperto la riga sta sopra le altre, che altrimenti lo coprirebbero.
    <View style={{ zIndex: aperta ? 10 : 0, elevation: aperta ? 10 : 0 }}>
      <Riga
        prima={prima}
        icona="certificato"
        tono={s.tono}
        titolo={persona ? nome(persona) : 'Certificato'}
        // L'etichetta sotto il testo e a destra solo la «i»: insieme a destra stringevano il nome e la data.
        sotto={
          <View style={{ gap: 6, alignItems: 'flex-start' }}>
            <Text style={[stili.piccolo, { color: p.testoSecondario, fontSize: 13.5, lineHeight: 19 }]}>{s.dettaglio}</Text>
            <Etichetta testo={s.testo} tono={s.tono} />
          </View>
        }
        coda={s.daConsegnare ? <InfoCertificato aperta={aperta} onCambia={setAperta} /> : undefined}
      />
    </View>
  )
}

const stili = StyleSheet.create({
  piccolo: { fontFamily: F.medio, fontSize: 12.5 },
  info: { width: 30, height: 30, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  fumetto: { position: 'absolute', bottom: 38, right: -4, width: 320, borderRadius: 18, padding: spazio.tre, gap: 8, zIndex: 10, elevation: 6, boxShadow: '0 14px 34px rgba(0,0,0,0.35)' },
  fumettoTitolo: { color: '#fff', fontFamily: F.extra, fontSize: 14 },
  fumettoTesto: { flex: 1, color: 'rgba(255,255,255,0.86)', fontFamily: F.medio, fontSize: 13, lineHeight: 18 },
  fumettoPunto: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#FF8A2B', marginTop: 7 },
})
