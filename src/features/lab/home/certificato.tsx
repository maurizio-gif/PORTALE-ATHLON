import { useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import type { CertificatoArea, PersonaArea } from '@/api/lab'
import { istruzioniInRighe } from '@/lib/certificatoIstruzioni'
import { dataBreve } from '@/lib/metodoPagamento'
import { spazio } from '@/theme'

import { Icona } from '../ui/Icona'
import { Etichetta, Pulsante, Riga } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { vistaCorrente } from '../vista'

// Il certificato medico, come lo leggono la Home (riquadro, «Da fare») e la
// sezione Certificato: lo stato di ogni persona, la «i» di quale serve e, dove manca o
// e' scaduto, il comando per caricarlo (17/10/2026). Lo stato viene tutto da
// portale_la_mia_area: la scadenza di PerfectGym e, accanto, l'ultimo certificato
// caricato dalla persona (`caricamento`): «in verifica» finche' la segreteria non l'ha
// visto, «rifiutato» col motivo se non l'ha accettato.

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

/** Il giorno di un istante ISO, a Roma: «17/10/2026». */
function giornoRoma(iso: string | null | undefined): string | null {
  const t = iso ? new Date(iso) : null
  if (!t || Number.isNaN(t.getTime())) return null
  return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Rome' }).format(t)
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
  /** Manca, e' scaduto o va consegnato: si spiega quale certificato serve e si puo' caricare. */
  daConsegnare: boolean
  /** Ha caricato un certificato che la segreteria non ha ancora visto: non c'e' altro da fare. */
  inVerifica: boolean
  /** L'ultimo certificato caricato e' stato rifiutato: il motivo scritto dalla segreteria, se c'e'. */
  rifiutato: { motivo: string | null } | null
}

/**
 * Lo stato del certificato (la fine del definitivo, dal database): valido o in
 * scadenza (30 giorni) fino a quando e per quanti giorni ancora, scaduto da
 * quando e da quanti giorni, mancante se non e' mai stato consegnato. Sotto i
 * 6 anni non serve; nell'ultimo mese prima dei 6 va consegnato, come nel CRM
 * (certificati_stato: «non_dovuto», «compie_6_anni»).
 */
function statoDelleDate(ce: CertificatoArea | undefined, nascita?: string | null): StatoCertificato {
  const g = giorniA(ce?.scadenza ?? null)
  const data = dataBreve(ce?.scadenza)
  const sei = seiAnni(nascita)
  const aiSei = giorniA(sei)
  if (sei && aiSei != null && aiSei > 30) {
    return { testo: 'Non serve', tono: 'neutro', giorni: null, dettaglio: `Non serve fino ai 6 anni, il ${dataBreve(sei)}`, breve: 'fino ai 6 anni', daConsegnare: false, inVerifica: false, rifiutato: null }
  }
  if (sei && aiSei != null && aiSei > 0 && (g == null || g < aiSei)) {
    return { testo: 'Da consegnare', tono: 'attenzione', giorni: null, dettaglio: `Da consegnare entro il ${dataBreve(sei)}, quando compie 6 anni`, breve: `entro il ${dataBreve(sei)}`, daConsegnare: true, inVerifica: false, rifiutato: null }
  }
  if (g == null || !data) return { testo: 'Mancante', tono: 'neutro', giorni: null, dettaglio: 'Non è mai stato consegnato', breve: 'mai consegnato', daConsegnare: true, inVerifica: false, rifiutato: null }
  if (g < 0) return { testo: 'Scaduto', tono: 'errore', giorni: g, dettaglio: `Scaduto il ${data} · ${giorni(-g)} fa`, breve: '', daConsegnare: true, inVerifica: false, rifiutato: null }
  if (g === 0) return { testo: 'Scade oggi', tono: 'attenzione', giorni: 0, dettaglio: `Valido fino a oggi, ${data}`, breve: '', daConsegnare: false, inVerifica: false, rifiutato: null }
  return { testo: g <= 30 ? 'In scadenza' : 'Valido', tono: g <= 30 ? 'attenzione' : 'ok', giorni: g, dettaglio: `Valido fino al ${data} · ancora ${giorni(g)}`, breve: '', daConsegnare: false, inVerifica: false, rifiutato: null }
}

/**
 * Lo stato che si mostra: quello delle date di PerfectGym, con sopra l'ultimo certificato
 * caricato. Uno in verifica **prende il posto** di «scaduto», «mancante» o «in scadenza»: la
 * persona ha fatto la sua parte e non c'e' altro da chiederle. Uno rifiutato prende il posto
 * allo stesso modo, e dice perche'. Con un certificato valido (o sotto i 6 anni) nessuno dei
 * due conta: lo stato resta quello di PerfectGym.
 */
export function statoCertificato(ce: CertificatoArea | undefined, nascita?: string | null): StatoCertificato {
  const base = statoDelleDate(ce, nascita)
  const c = ce?.caricamento
  // Solo se il certificato serve: con uno valido (o sotto i 6 anni) lo stato resta quello di PerfectGym.
  const serve = base.daConsegnare || base.tono === 'attenzione'
  if (serve && c?.stato === 'in_verifica') {
    const il = giornoRoma(c.caricato_il)
    return {
      testo: 'In verifica',
      tono: 'neutro',
      giorni: null,
      dettaglio: il ? `Caricato il ${il} · lo stiamo controllando` : 'Lo stiamo controllando',
      breve: 'in verifica',
      daConsegnare: false,
      inVerifica: true,
      rifiutato: null,
    }
  }
  if (serve && c?.stato === 'rifiutato') {
    const il = giornoRoma(c.caricato_il)
    const motivo = c.motivo_rifiuto?.trim() || null
    return {
      ...base,
      testo: 'Rifiutato',
      tono: 'errore',
      giorni: null,
      dettaglio: `Il certificato caricato${il ? ` il ${il}` : ''} non è stato accettato${motivo ? `: ${motivo}` : ''}`,
      breve: 'rifiutato',
      rifiutato: { motivo },
    }
  }
  return base
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

// Quale certificato serve: il testo del club, scritto una volta sola in lib/certificatoIstruzioni.
const QUALE_CERTIFICATO = istruzioniInRighe()

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

/**
 * Una riga dell'elenco dei certificati; se manca o e' scaduto, con la «i» e il comando per
 * caricarlo. In vista cliente (lo staff che guarda come un cliente, in sola lettura) il
 * comando non c'e': il server rifiuterebbe comunque.
 */
export function RigaCertificato({
  persona,
  ce,
  prima,
  onCarica,
}: {
  persona: PersonaArea | undefined
  ce: CertificatoArea | undefined
  prima: boolean
  onCarica?: () => void
}) {
  const p = usePalette()
  const [aperta, setAperta] = useState(false)
  const s = statoCertificato(ce, persona?.data_nascita)
  const puoCaricare = Boolean(onCarica) && !vistaCorrente() && (s.daConsegnare || (s.tono === 'attenzione' && s.giorni !== null))
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
            {puoCaricare ? (
              <Pulsante
                testo={s.rifiutato ? 'Carica un certificato nuovo' : s.daConsegnare ? 'Carica il certificato' : 'Carica quello nuovo'}
                icona="condividi"
                variante={s.daConsegnare ? 'primario' : 'contorno'}
                piccolo
                pieno={false}
                onPress={onCarica!}
              />
            ) : null}
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
