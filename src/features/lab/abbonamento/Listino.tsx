import { useMemo, useState } from 'react'
import { Platform, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import type { PianoAbbonamento } from '@/api/abbonamento'
import { euro } from '@/lib/eventi'
import { t, tv } from '@/lib/lingua'
import { spazio } from '@/theme'

import { ingombroBarra } from '../ui/BarraSchede'
import { Icona, type NomeIcona } from '../ui/Icona'
import { Pulsante } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'

// Il listino dentro il portale (16/10/2026), con le stesse parole del sito:
// per ogni abbonamento cosa comprende — attivita' per attivita' —, cosa non
// comprende, le tre formule con il prezzo e, per quella scelta, le condizioni
// del contratto. Prima di arrivare alla firma si sa gia' tutto.
//
// **Come la pagina Abbonamenti del sito** (03/11/2026, richiesta di Maurizio, vale anche sul totem, che e' la stessa app a 540 pixel logici): una scheda per
// abbonamento, **Premium prima** (`ordinaPiani`) e crema col bordo arancione, Smart scura; il nome grande in arancione; le attivita' comprese come tessere
// con la loro icona (si toccano per il dettaglio); e il prezzo come protagonista: tre riquadri, Annuale a rate, Annuale in un'unica soluzione e Mensile Flex,
// col risparmio sul Flex. Il riquadro toccato e' la scelta, e le condizioni del contratto compaiono sotto la scheda.

/** Le formule in italiano: e' il testo che i moduli mandano al desk (cambio abbonamento), qualunque sia la lingua dell'app. */
export const FORMULE_IT: Record<string, { titolo: string; sotto: string }> = {
  'annuale-rate': { titolo: 'Annuale, a rate', sotto: '12 mesi, pagati ogni mese' },
  'annuale-unico': { titolo: 'Annuale, in un’unica soluzione', sotto: '12 mesi, pagati subito' },
  flex: { titolo: 'Mensile Flex', sotto: 'Si rinnova di mese in mese, senza vincoli' },
}

export const FORMULE: Record<string, { titolo: string; sotto: string }> = tv(FORMULE_IT, {
  'annuale-rate': { titolo: 'Annual, monthly installments', sotto: '12 months, paid every month' },
  'annuale-unico': { titolo: 'Annual, paid in full', sotto: '12 months, paid upfront' },
  flex: { titolo: 'Mensile Flex', sotto: 'Renews month to month, no commitment' },
})

/** I tre colori di una scheda: il Premium e' crema, lo Smart e' scuro (come sul sito), un abbonamento nuovo del listino prende quello del Premium. */
type Tema = {
  fondo: string
  bordo: string
  testo: string
  muto: string
  accento: string
  tessera: string
  tesseraIcona: string
  tesseraIconaFondo: string
  badgeFondo: string
  badgeTesto: string
  riquadro: string
  riquadroAttivo: string
  riquadroBordo: string
  risparmio: string
}

const TEMA_PREMIUM: Tema = {
  fondo: '#FFF4EC',
  bordo: 'rgba(255,87,1,0.45)',
  testo: '#272423',
  muto: '#5E5853',
  accento: '#CC4600',
  tessera: 'rgba(255,255,255,0.7)',
  tesseraIcona: '#CC4600',
  tesseraIconaFondo: 'rgba(255,87,1,0.14)',
  badgeFondo: '#CC4600',
  badgeTesto: '#FFFFFF',
  riquadro: 'rgba(255,255,255,0.65)',
  riquadroAttivo: '#FFFFFF',
  riquadroBordo: 'rgba(39,36,35,0.12)',
  risparmio: '#1B7F46',
}

const TEMA_SMART: Tema = {
  fondo: '#272423',
  bordo: '#272423',
  testo: '#FFFFFF',
  muto: 'rgba(255,255,255,0.74)',
  accento: '#FF7A33',
  tessera: 'rgba(255,255,255,0.07)',
  tesseraIcona: '#FF7A33',
  tesseraIconaFondo: 'rgba(255,122,51,0.2)',
  badgeFondo: 'rgba(255,255,255,0.12)',
  badgeTesto: 'rgba(255,255,255,0.8)',
  riquadro: 'rgba(255,255,255,0.06)',
  riquadroAttivo: '#3A2A22',
  riquadroBordo: 'rgba(255,255,255,0.14)',
  risparmio: '#7BE0A4',
}

const temaDi = (abbonamento: string): Tema => (/smart/i.test(abbonamento) ? TEMA_SMART : TEMA_PREMIUM)

/** L'icona di ogni attivita': dal nome, con quelle che l'app ha gia'; una nuova del listino prende la spunta finche' non se ne sceglie una. */
function iconaAttivita(nome: string): NomeIcona {
  const n = nome.toLowerCase()
  if (/health/.test(n)) return 'cuore'
  if (/\btv\b/.test(n)) return 'riproduci'
  if (/gym|sala/.test(n)) return 'peso'
  if (/corsi/.test(n)) return 'persone'
  if (/reformer/.test(n)) return 'mobilita'
  if (/aqua|nuoto/.test(n)) return 'goccia'
  if (/gestant/.test(n)) return 'foglia'
  return 'spunta'
}

/** Il titolo e la riga sotto di ogni riquadro prezzo: corti, perche' sono tre in fila. */
const RIQUADRO: Record<string, { titolo: string; sotto: string }> = tv(
  {
    'annuale-rate': { titolo: 'Annuale', sotto: 'a rate mensili' },
    'annuale-unico': { titolo: 'Annuale', sotto: 'pagamento unico' },
    flex: { titolo: 'Mensile', sotto: 'Flex, senza vincoli' },
  },
  {
    'annuale-rate': { titolo: 'Annual', sotto: 'monthly installments' },
    'annuale-unico': { titolo: 'Annual', sotto: 'paid in full' },
    flex: { titolo: 'Monthly', sotto: 'Flex, no commitment' },
  },
)

function Condizioni({ piano }: { piano: PianoAbbonamento }) {
  const p = usePalette()
  if (!piano.condizioni.length) return null
  return (
    <View style={[stili.condizioni, { borderColor: p.linea, backgroundColor: p.incavo }]}>
      <Text style={{ color: p.testo, fontFamily: F.extra, fontSize: 15 }}>{`${t('Condizioni', 'Terms')} · ${FORMULE[piano.formula]?.titolo ?? piano.etichetta}`}</Text>
      {piano.condizioni.map((c) => (
        <View key={c.titolo} style={{ gap: 1 }}>
          <Text style={{ color: p.testo, fontFamily: F.bold, fontSize: 13 }}>{c.titolo}</Text>
          <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 13, lineHeight: 19 }}>{c.testo}</Text>
        </View>
      ))}
      <Text style={{ color: p.testoTerzo, fontFamily: F.medio, fontSize: 12, lineHeight: 17 }}>
        {t('Il contratto completo, con i Termini e Condizioni, lo leggi per intero prima di firmare.', 'You’ll read the full contract, including the Terms and Conditions, before you sign.')}
      </Text>
    </View>
  )
}

function Riquadro({ x, nome, tema, attivo, onPress }: { x: PianoAbbonamento; nome: string; tema: Tema; attivo: boolean; onPress: () => void }) {
  const r = RIQUADRO[x.formula] ?? { titolo: x.etichetta, sotto: '' }
  const perAnno = x.periodo.includes('anno')
  const periodo = perAnno ? t('all’anno', 'per year') : t('al mese', 'per month')
  const nota = x.risparmio_vs_flex ? t(`Risparmi ${euro(x.risparmio_vs_flex)}`, `Save ${euro(x.risparmio_vs_flex)}`) : x.formula === 'flex' ? t('Senza vincoli', 'No lock-in') : ''
  return (
    <Tocco
      vibra="scelta"
      stato={{ selected: attivo }}
      etichetta={`${nome}, ${FORMULE[x.formula]?.titolo ?? x.etichetta}, ${euro(x.importo)} ${periodo}`}
      onPress={onPress}
      style={[stili.riquadro, { backgroundColor: attivo ? tema.riquadroAttivo : tema.riquadro, borderColor: attivo ? '#FF5701' : tema.riquadroBordo }]}
    >
      <Text style={[stili.riquadroTitolo, { color: attivo ? tema.accento : tema.muto }]}>{r.titolo}</Text>
      <Text style={{ color: tema.muto, fontFamily: F.medio, fontSize: 11.5, lineHeight: 15, marginTop: 2 }}>{r.sotto}</Text>
      <Text style={{ color: tema.testo, fontFamily: F.extra, fontSize: 30, letterSpacing: -1, marginTop: spazio.due }} numberOfLines={1} adjustsFontSizeToFit>
        {euro(x.importo)}
      </Text>
      <Text style={{ color: tema.muto, fontFamily: F.bold, fontSize: 11.5 }}>{periodo}</Text>
      <Text style={{ color: nota && x.risparmio_vs_flex ? tema.risparmio : tema.muto, fontFamily: F.extra, fontSize: 11.5, marginTop: 'auto', paddingTop: 8 }}>{nota}</Text>
    </Tocco>
  )
}

function Scheda({ nome, formule, pianoId, onScegli }: { nome: string; formule: PianoAbbonamento[]; pianoId: number | null; onScegli: (id: number) => void }) {
  const tema = temaDi(nome)
  const base = formule[0]
  const dettaglio = base.attivita_dettaglio.length ? base.attivita_dettaglio : base.attivita.map((a) => ({ nome: a, testo: '', pagina: null }))
  const [aperta, setAperta] = useState<string | null>(null)
  const apertaTesto = dettaglio.find((a) => a.nome === aperta)?.testo ?? ''
  return (
    <View style={[stili.scheda, { backgroundColor: tema.fondo, borderColor: tema.bordo }]}>
      <View style={{ padding: spazio.quattro, paddingBottom: spazio.due, gap: 2 }}>
        {base.badge ? (
          <View style={[stili.badge, { backgroundColor: tema.badgeFondo }]}>
            <Text style={{ color: tema.badgeTesto, fontFamily: F.extra, fontSize: 10.5, letterSpacing: 1.2 }}>{base.badge.toUpperCase()}</Text>
          </View>
        ) : null}
        <Text style={{ color: tema.testo, fontFamily: F.bold, fontSize: 13, opacity: 0.8, marginTop: spazio.tre }}>{t('Abbonamento', 'Membership')}</Text>
        <Text style={{ color: tema.accento, fontFamily: F.extra, fontSize: 56, lineHeight: 58, letterSpacing: -2 }} accessibilityRole="header" adjustsFontSizeToFit numberOfLines={1}>
          {nome.toUpperCase()}
        </Text>
        {base.claim ? <Text style={{ color: tema.testo, fontFamily: F.extra, fontSize: 18, letterSpacing: -0.3, marginTop: spazio.due }}>{base.claim}</Text> : null}
        {base.descrizione ? <Text style={{ color: tema.muto, fontFamily: F.medio, fontSize: 14, lineHeight: 21, marginTop: 4 }}>{base.descrizione}</Text> : null}
      </View>

      <View style={{ paddingHorizontal: spazio.quattro, paddingTop: spazio.tre, gap: spazio.due }}>
        <Text style={[stili.titoletto, { color: tema.muto }]}>{t('ATTIVITÀ COMPRESE', 'INCLUDED')}</Text>
        <View style={stili.griglia}>
          {dettaglio.map((a) => {
            const sel = aperta === a.nome
            return (
              <Tocco
                key={a.nome}
                ruolo="button"
                vibra={null}
                scala={0.98}
                stato={{ selected: sel }}
                etichetta={sel ? t(`Nascondi il dettaglio di ${a.nome}`, `Hide details for ${a.nome}`) : t(`Mostra il dettaglio di ${a.nome}`, `Show details for ${a.nome}`)}
                onPress={() => setAperta(sel ? null : a.nome)}
                style={[stili.tessera, { backgroundColor: tema.tessera, borderColor: sel ? tema.accento : 'transparent' }]}
              >
                <View style={[stili.tesseraIcona, { backgroundColor: tema.tesseraIconaFondo }]}>
                  <Icona nome={iconaAttivita(a.nome)} size={15} colore={tema.tesseraIcona} />
                </View>
                <Text style={{ color: tema.testo, fontFamily: F.bold, fontSize: 12.5, lineHeight: 16, flex: 1 }}>{a.nome}</Text>
              </Tocco>
            )
          })}
        </View>
        {apertaTesto ? <Text style={{ color: tema.muto, fontFamily: F.medio, fontSize: 13, lineHeight: 19 }}>{apertaTesto}</Text> : null}
        {base.non_comprende.length ? (
          <Text style={{ color: tema.muto, fontFamily: F.medio, fontSize: 12.5, lineHeight: 18 }}>
            {t(`Non comprende ${base.non_comprende.join(', ')}: sono nel Premium.`, `Does not include ${base.non_comprende.join(', ')}: included in Premium.`)}
          </Text>
        ) : null}
      </View>

      <View style={{ padding: spazio.quattro, paddingTop: spazio.quattro, gap: spazio.due }}>
        <Text style={[stili.titoletto, { color: tema.muto }]}>{t('SCEGLI COME PAGARE', 'CHOOSE HOW TO PAY')}</Text>
        <View style={stili.riquadri} accessibilityRole="radiogroup">
          {formule.map((x) => (
            <Riquadro key={x.piano_id} x={x} nome={nome} tema={tema} attivo={x.piano_id === pianoId} onPress={() => onScegli(x.piano_id)} />
          ))}
        </View>
      </View>
    </View>
  )
}

export function Listino({
  piani,
  pianoId,
  onScegli,
}: {
  piani: PianoAbbonamento[]
  pianoId: number | null
  onScegli: (id: number) => void
}) {
  // L'ordine arriva da `statoAbbonamento` (Premium, poi Smart); qui si raggruppa soltanto, conservandolo.
  const gruppi = useMemo(() => {
    const m = new Map<string, PianoAbbonamento[]>()
    for (const x of piani) m.set(x.abbonamento, [...(m.get(x.abbonamento) ?? []), x])
    return [...m.entries()]
  }, [piani])

  return (
    <View style={{ gap: spazio.quattro }}>
      {gruppi.map(([nome, formule]) => {
        const scelto = formule.find((x) => x.piano_id === pianoId)
        return (
          <View key={nome} style={{ gap: spazio.tre }}>
            <Scheda nome={nome} formule={formule} pianoId={pianoId} onScegli={onScegli} />
            {scelto ? <Condizioni piano={scelto} /> : null}
          </View>
        )
      })}
    </View>
  )
}

/**
 * «La tua scelta» (03/11/2026): sotto il listino una barra scura riassume cosa si e' scelto e porta avanti. Sul web resta in vista mentre si scorre (`sticky`, sopra la barra
 * delle schede); nell'app nativa sta in fondo al listino, perche' React Native non ha l'`sticky`. Non scrive la quota di attivazione: la dice la riga sopra, e con una
 * promozione o dopo una prova non e' dovuta.
 */
export function BarraScelta({ piano, onContinua }: { piano: PianoAbbonamento | undefined; onContinua: () => void }) {
  const ins = useSafeAreaInsets()
  const f = piano ? FORMULE[piano.formula] : null
  const prezzo = piano ? `${euro(piano.importo)} ${piano.periodo.includes('anno') ? t('all’anno', 'a year') : t('al mese', 'a month')}` : null
  const sticky = Platform.OS === 'web' ? ({ position: 'sticky', bottom: ingombroBarra(ins.bottom) + spazio.due, zIndex: 5 } as object) : null
  return (
    <View style={[stili.barra, sticky]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[stili.barraEtichetta]}>{t('LA TUA SCELTA', 'YOUR CHOICE')}</Text>
        <Text style={{ color: '#FFFFFF', fontFamily: F.extra, fontSize: 15.5, letterSpacing: -0.2 }} numberOfLines={2}>
          {piano && f ? `${piano.abbonamento} · ${f.titolo}` : t('Scegli come pagare', 'Choose how to pay')}
        </Text>
        {prezzo ? <Text style={{ color: 'rgba(255,255,255,0.78)', fontFamily: F.medio, fontSize: 12.5 }}>{prezzo}</Text> : null}
      </View>
      <Pulsante testo={t('Continua', 'Continue')} icona="avanti" piccolo pieno={false} onPress={onContinua} disabilitato={!piano} />
    </View>
  )
}

const stili = StyleSheet.create({
  titoletto: { fontFamily: F.extra, fontSize: 11.5, letterSpacing: 1.2 },
  condizioni: { gap: spazio.due, borderWidth: 1, borderRadius: 14, padding: spazio.tre },
  scheda: { borderRadius: 24, borderWidth: 1.5, overflow: 'hidden' },
  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 },
  griglia: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tessera: { width: '48.5%', flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, paddingVertical: 7, paddingHorizontal: 9, borderRadius: 14, borderWidth: 1.5 },
  tesseraIcona: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  riquadri: { flexDirection: 'row', gap: 8 },
  riquadro: { flex: 1, minHeight: 150, paddingVertical: 11, paddingHorizontal: 9, borderRadius: 16, borderWidth: 2 },
  barra: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, backgroundColor: '#272423', borderRadius: 20, paddingVertical: 12, paddingLeft: spazio.quattro, paddingRight: spazio.tre, boxShadow: '0 10px 30px rgba(0,0,0,0.25)' } as object,
  barraEtichetta: { color: 'rgba(255,255,255,0.7)', fontFamily: F.extra, fontSize: 10.5, letterSpacing: 1.2 },
  riquadroTitolo: { fontFamily: F.extra, fontSize: 11.5, letterSpacing: 0.8, textTransform: 'uppercase' },
})
