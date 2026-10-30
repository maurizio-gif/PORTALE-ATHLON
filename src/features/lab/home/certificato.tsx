import { useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import type { CertificatoArea, PersonaArea } from '@/api/lab'
import { istruzioniInRighe } from '@/lib/certificatoIstruzioni'
import { dataBreve } from '@/lib/metodoPagamento'
import { spazio } from '@/theme'
import { locale, t } from '@/lib/lingua'

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
  return [p.nome, p.cognome].filter(Boolean).join(' ') || t('Senza nome', 'No name')
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
  return new Intl.DateTimeFormat(locale(), { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Rome' }).format(new Date())
}

/** «1 giorno», «76 giorni». */
export function giorni(n: number): string {
  return t(`${n} ${n === 1 ? 'giorno' : 'giorni'}`, `${n} ${n === 1 ? 'day' : 'days'}`)
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
  return new Intl.DateTimeFormat(locale(), { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Rome' }).format(t)
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
  /**
   * Non c'e' o e' scaduto (non «da consegnare entro i 6 anni», non «in scadenza»): il caso che l'avviso in cima alla
   * Home segnala a chi ha un abbonamento (20/10/2026). Falso se la persona ha gia' caricato un certificato che la
   * segreteria sta guardando; vero se l'ultimo e' stato rifiutato, perche' la situazione di prima resta.
   */
  scadutoOMancante: boolean
  /** Ha caricato un certificato che la segreteria non ha ancora visto: non c'e' altro da fare. */
  inVerifica: boolean
  /** L'ultimo certificato caricato e' stato rifiutato: il motivo scritto dalla segreteria, se c'e'. */
  rifiutato: { motivo: string | null } | null
  /** Ha una proroga temporanea concessa dalla segreteria (il «temporaneo» del CRM) ancora in corso, e il certificato non e' in regola. */
  proroga?: { fine: string } | null
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
    return { testo: t('Non serve', 'Not required'), tono: 'neutro', giorni: null, dettaglio: t(`Non serve fino ai 6 anni, il ${dataBreve(sei)}`, `Not required until age 6, on ${dataBreve(sei)}`), breve: t('fino ai 6 anni', 'until age 6'), daConsegnare: false, scadutoOMancante: false, inVerifica: false, rifiutato: null }
  }
  if (sei && aiSei != null && aiSei > 0 && (g == null || g < aiSei)) {
    return { testo: t('Da consegnare', 'Due'), tono: 'attenzione', giorni: null, dettaglio: t(`Da consegnare entro il ${dataBreve(sei)}, quando compie 6 anni`, `Due by ${dataBreve(sei)}, when they turn 6`), breve: t(`entro il ${dataBreve(sei)}`, `by ${dataBreve(sei)}`), daConsegnare: true, scadutoOMancante: false, inVerifica: false, rifiutato: null }
  }
  if (g == null || !data) return { testo: t('Mancante', 'Missing'), tono: 'neutro', giorni: null, dettaglio: t('Non è mai stato consegnato', 'Never handed in'), breve: t('mai consegnato', 'never handed in'), daConsegnare: true, scadutoOMancante: true, inVerifica: false, rifiutato: null }
  if (g < 0) return { testo: t('Scaduto', 'Expired'), tono: 'errore', giorni: g, dettaglio: t(`Scaduto il ${data} · ${giorni(-g)} fa`, `Expired on ${data} · ${giorni(-g)} ago`), breve: '', daConsegnare: true, scadutoOMancante: true, inVerifica: false, rifiutato: null }
  if (g === 0) return { testo: t('Scade oggi', 'Expires today'), tono: 'attenzione', giorni: 0, dettaglio: t(`Valido fino a oggi, ${data}`, `Valid until today, ${data}`), breve: '', daConsegnare: false, scadutoOMancante: false, inVerifica: false, rifiutato: null }
  return { testo: g <= 30 ? t('In scadenza', 'Expiring soon') : t('Valido', 'Valid'), tono: g <= 30 ? 'attenzione' : 'ok', giorni: g, dettaglio: t(`Valido fino al ${data} · ancora ${giorni(g)}`, `Valid until ${data} · ${giorni(g)} left`), breve: '', daConsegnare: false, scadutoOMancante: false, inVerifica: false, rifiutato: null }
}

/**
 * Lo stato che si mostra: quello delle date di PerfectGym, con sopra l'ultimo certificato
 * caricato. Uno in verifica **prende il posto** di «scaduto», «mancante» o «in scadenza»: la
 * persona ha fatto la sua parte e non c'e' altro da chiederle. Uno rifiutato prende il posto
 * allo stesso modo, dice perche' e **rimette la situazione di prima** (scaduto, mancante, in scadenza). Con un certificato valido (o sotto i 6 anni) nessuno dei
 * due conta: lo stato resta quello di PerfectGym.
 */
function statoCertificatoBase(ce: CertificatoArea | undefined, nascita?: string | null): StatoCertificato {
  const base = statoDelleDate(ce, nascita)
  const c = ce?.caricamento
  // Solo se il certificato serve: con uno valido (o sotto i 6 anni) lo stato resta quello di PerfectGym.
  const serve = base.daConsegnare || base.tono === 'attenzione'
  if (serve && c?.stato === 'in_verifica') {
    const il = giornoRoma(c.caricato_il)
    return {
      testo: t('In verifica', 'Under review'),
      tono: 'neutro',
      giorni: null,
      dettaglio: il ? t(`Caricato il ${il} · lo stiamo controllando`, `Uploaded on ${il} · we’re checking it`) : t('Lo stiamo controllando', 'We’re checking it'),
      breve: t('in verifica', 'under review'),
      daConsegnare: false,
      scadutoOMancante: false,
      inVerifica: true,
      rifiutato: null,
    }
  }
  if (serve && c?.stato === 'rifiutato') {
    const il = giornoRoma(c.caricato_il)
    const motivo = c.motivo_rifiuto?.trim() || null
    // **Torna «da fare» com'era prima**: il rifiuto non cancella la situazione di partenza (scaduto da N
    // giorni, mai consegnato, in scadenza) e non la nasconde dietro una parola sola. Si dice la
    // situazione, poi il rifiuto col motivo scritto dalla segreteria, e si puo' caricare di nuovo —
    // anche per chi era solo «in scadenza», che senza `daConsegnare` non avrebbe piu' il comando.
    return {
      ...base,
      testo: t('Rifiutato', 'Rejected'),
      tono: 'errore',
      dettaglio: t(
        `${base.dettaglio}. Il certificato caricato${il ? ` il ${il}` : ''} non è stato accettato${motivo ? `: ${motivo}` : ''}`,
        `${base.dettaglio}. The certificate uploaded${il ? ` on ${il}` : ''} was not accepted${motivo ? `: ${motivo}` : ''}`,
      ),
      breve: base.breve ? t(`rifiutato · ${base.breve}`, `rejected · ${base.breve}`) : t('rifiutato', 'rejected'),
      daConsegnare: true,
      rifiutato: { motivo },
    }
  }
  return base
}

/** La scritta semplice della proroga concessa dalla segreteria (30/10/2026, Maurizio: non «certificato temporaneo attivo»): «C'è una proroga temporanea che scade il 13/11/2026». */
export function testoProroga(fine: string): string {
  return t(`C’è una proroga temporanea che scade il ${dataBreve(fine)}`, `There’s a temporary extension that expires on ${dataBreve(fine)}`)
}

/**
 * Lo stato che si mostra, con la **proroga temporanea** concessa dalla segreteria (30/10/2026): la scadenza resta quella del definitivo, e la
 * proroga si dice a parte, solo se e' ancora in corso e solo dove il certificato non e' in regola (con uno valido non serve).
 */
export function statoCertificato(ce: CertificatoArea | undefined, nascita?: string | null): StatoCertificato {
  const s = statoCertificatoBase(ce, nascita)
  const g = giorniA(ce?.proroga?.fine ?? null)
  if (ce?.proroga && g !== null && g >= 0 && (s.scadutoOMancante || s.daConsegnare || s.tono === 'attenzione' || s.tono === 'errore')) return { ...s, proroga: { fine: ce.proroga.fine } }
  return s
}

/** Quanto e' urgente un certificato: piu' alto e', prima si mostra (scaduto, mai consegnato, da consegnare, in scadenza). */
export function urgenzaCertificato(s: StatoCertificato): number {
  if (s.tono === 'errore') return 5
  if (s.daConsegnare) return s.testo === t('Mancante', 'Missing') ? 4 : 3
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
        accessibilityLabel={`${t('Quale certificato serve.', 'Which certificate you need.')} ${QUALE_CERTIFICATO.join(' ')}`}
        hitSlop={10}
        style={[stili.info, { backgroundColor: p.incavo }]}
      >
        <Icona nome="info" size={16} colore={p.testo} />
      </Pressable>
      {aperta ? (
        <View style={[stili.fumetto, { backgroundColor: p.scuro ? '#2A2B31' : p.carbone }]} pointerEvents="none">
          <Text style={stili.fumettoTitolo}>{t('Quale certificato serve', 'Which certificate you need')}</Text>
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
        titolo={persona ? nome(persona) : t('Certificato', 'Certificate')}
        // L'etichetta sotto il testo e a destra solo la «i»: insieme a destra stringevano il nome e la data.
        sotto={
          <View style={{ gap: 6, alignItems: 'flex-start' }}>
            <Text style={[stili.piccolo, { color: p.testoSecondario, fontSize: 13.5, lineHeight: 19 }]}>{s.dettaglio}</Text>
            <Etichetta testo={s.testo} tono={s.tono} />
            {s.proroga ? <Etichetta testo={testoProroga(s.proroga.fine)} tono="ok" /> : null}
            {puoCaricare ? (
              <Pulsante
                testo={s.rifiutato ? t('Carica un certificato nuovo', 'Upload a new certificate') : s.daConsegnare ? t('Carica il certificato', 'Upload certificate') : t('Carica quello nuovo', 'Upload the new one')}
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
