import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { chiamaLink } from '@/api/link'
import { Avviso } from '@/components/Avviso'
import { Bottone } from '@/components/Bottone'
import { Campo } from '@/components/Campo'
import { CampoData } from '@/components/CampoData'
import { Casella } from '@/components/Casella'
import { Scelta } from '@/components/Scelta'
import { Testo } from '@/components/Testo'
import { problemaCodiceFiscale } from '@/lib/codiceFiscale'
import type { CandidatoGuestPass, SceltaGuestPass } from '@/lib/guestPass'
import { locale, t } from '@/lib/lingua'
import { spazio, useColori } from '@/theme'

// «Per chi è il Guest Pass?» (21/10/2026, decisione di Maurizio): il primo blocco del link. Il primo passo del sito non
// dice niente sull'email; qui, nella casella della persona, si vede per chi si puo' attivare: per se', per un figlio del
// nucleo dai 13 ai 17 anni, o per un figlio che il club non conosce ancora. Chi non puo' averlo resta nell'elenco,
// spento, col perche'. Un Guest Pass per volta: a contratto fatto la pagina propone gli altri («Attivalo anche per…»).
//
// I controlli veri li fa `guest-pass` (azione `scegli`, e di nuovo alla conferma): eta', codice fiscale valido e
// coerente, gia' registrato in un altro nucleo, abbonamenti e Guest Pass negli ultimi 3 anni del figlio, tre figli nuovi
// al mese. Qui si controlla solo quello che si vede subito (il codice fiscale scritto male, l'eta').

const NUOVO = 'nuovo'

/** Gli anni compiuti oggi. */
function anni(nascita: string): number {
  const [a, m, g] = nascita.slice(0, 10).split('-').map(Number)
  const o = new Date()
  const [A, M, G] = [o.getFullYear(), o.getMonth() + 1, o.getDate()]
  return A - a - (M < m || (M === m && G < g) ? 1 : 0)
}

function nomeIntero(c: { nome: string | null; cognome: string | null }): string {
  return `${c.nome ?? ''} ${c.cognome ?? ''}`.trim()
}

/** «15 ottobre 2010». */
function dataLunga(g: string): string {
  return new Date(g.slice(0, 10) + 'T12:00:00Z').toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

/** La scelta di partenza: quella salvata, o nessuna. */
function sceltaDi(s: SceltaGuestPass): string | null {
  if (s.per === 'me') return 'me'
  if (s.per === 'figlio') return s.beneficiario_id ? `f${s.beneficiario_id}` : NUOVO
  return null
}

export function PerChi({
  token,
  scelta,
  onScelto,
  titolare,
  comprende,
  quando,
}: {
  token: string
  scelta: SceltaGuestPass
  onScelto: () => Promise<unknown>
  /** Nome e cognome di chi ha l'email: si leggono sotto «Per te». */
  titolare?: string
  /** Cosa comprende il Pass e quando vale: le due righe sotto la scelta (30/10/2026). */
  comprende?: string
  quando?: string
}) {
  const c = useColori()
  const [aperto, setAperto] = useState(!scelta.per)
  const [modo, setModo] = useState<string | null>(sceltaDi(scelta))
  const [tutore, setTutore] = useState(scelta.tutore)
  const nuovoSalvato = scelta.per === 'figlio' && scelta.figlio?.nuovo ? scelta.figlio : null
  const [figlio, setFiglio] = useState({
    nome: nuovoSalvato?.nome ?? '',
    cognome: nuovoSalvato?.cognome ?? '',
    nascita: nuovoSalvato?.nascita ?? '',
    codice_fiscale: nuovoSalvato?.codice_fiscale ?? '',
  })
  const [errore, setErrore] = useState<string | null>(null)
  const [attesa, setAttesa] = useState(false)

  const me = scelta.candidati.find((x) => x.chi === 'me') ?? null
  const figli = scelta.candidati.filter((x) => x.chi === 'figlio')
  const perFiglio = modo !== null && modo !== 'me'
  const erroreCf = modo === NUOVO ? problemaCodiceFiscale(figlio) : null
  const etaNuovo = modo === NUOVO && /^\d{4}-\d{2}-\d{2}$/.test(figlio.nascita) ? anni(figlio.nascita) : null
  const erroreEta =
    etaNuovo === null ? null : etaNuovo > scelta.eta.max ? t('È maggiorenne: il Guest Pass lo chiede con la sua email.', 'They’re an adult: they request the Guest Pass with their own email.') : etaNuovo < scelta.eta.min ? t('Il Guest Pass si può attivare dai 13 anni.', 'The Guest Pass can be activated from age 13.') : null
  const nuovoCompleto =
    !!figlio.nome.trim() && !!figlio.cognome.trim() && !!figlio.nascita && figlio.codice_fiscale.replace(/\s/g, '').length === 16 && !erroreCf && !erroreEta
  const pronto = modo !== null && (!perFiglio || tutore) && (modo !== NUOVO || nuovoCompleto)

  async function conferma() {
    if (!modo) return
    setErrore(null)
    setAttesa(true)
    const corpo =
      modo === 'me'
        ? { per: 'me' }
        : modo === NUOVO
          ? { per: 'figlio', tutore, figlio: { ...figlio, codice_fiscale: figlio.codice_fiscale.toUpperCase().replace(/\s/g, '') } }
          : { per: 'figlio', tutore, member_id: Number(modo.slice(1)) }
    const { ok, dati } = await chiamaLink(token, 'scegli', corpo)
    if (!ok) {
      // Un'anagrafica simile: la scelta resta, ferma finche' la segreteria non risponde, e la pagina lo dice in cima.
      if (dati.verifica) {
        await onScelto()
        setAttesa(false)
        return setAperto(false)
      }
      setAttesa(false)
      return setErrore(dati.errore ?? t('Non siamo riusciti a salvare la scelta adesso. Riprova fra qualche minuto.', 'We couldn’t save your choice right now. Try again in a few minutes.'))
    }
    await onScelto()
    setAttesa(false)
    setAperto(false)
  }

  // Scelto: una riga, con «Cambia».
  if (!aperto && scelta.per) {
    const f = scelta.figlio
    return (
      <View style={{ gap: spazio.due }}>
        {scelta.per === 'me' ? (
          <>
            <Testo>
              {t('Per', 'For')} <Text style={{ fontWeight: '700' }}>{t('te', 'you')}</Text>.
            </Testo>
            {titolare ? <Text style={{ color: c.testo, fontSize: 18, fontWeight: '800' }}>{titolare}</Text> : null}
          </>
        ) : (
          <>
            <Testo>
              {t('Per', 'For')} <Text style={{ fontWeight: '700' }}>{f ? nomeIntero(f) : t('tuo figlio', 'your child')}</Text>
              {f?.nascita ? t(`, data di nascita ${dataLunga(f.nascita)}`, `, date of birth ${dataLunga(f.nascita)}`) : ''}
              {f?.codice_fiscale ? ` · ${f.codice_fiscale}` : ''}.
            </Testo>
            <Testo variante="piccolo">
              {t(
                `Lo attivi come genitore: i dati qui sotto sono i tuoi, e paghi tu. Il contratto è intestato a ${f?.nome ?? 'tuo figlio'}`,
                `You activate it as the parent: the details below are yours, and you pay. The contract is in ${f?.nome ? `${f.nome}’s` : 'your child’s'} name`,
              )}
              {f?.nuovo ? t(', che registriamo al club nel tuo nucleo familiare quando confermi', ', whom we’ll register at the club in your family when you confirm') : ''}.
            </Testo>
          </>
        )}
        {comprende || quando ? (
          <View style={[stili.riquadro, { borderColor: c.bordo, backgroundColor: c.sfondo, gap: spazio.due }]}>
            {comprende ? (
              <View style={{ gap: 2 }}>
                <Text style={[stili.etichetta, { color: c.accento }]}>{t('COSA COMPRENDE', 'WHAT’S INCLUDED')}</Text>
                <Testo variante="piccolo" style={{ color: c.testo }}>{comprende}</Testo>
              </View>
            ) : null}
            {quando ? (
              <View style={{ gap: 2 }}>
                <Text style={[stili.etichetta, { color: c.accento }]}>{t('QUANDO', 'WHEN')}</Text>
                <Testo variante="piccolo" style={{ color: c.testo }}>{quando}</Testo>
              </View>
            ) : null}
          </View>
        ) : null}
        <Bottone testo={t('Cambia', 'Change')} variante="contorno" onPress={() => setAperto(true)} />
      </View>
    )
  }

  const riga = (x: CandidatoGuestPass, chiave: string, titolo: string, sotto: string | null) => {
    const scelto = modo === chiave
    const colore = scelto ? c.suAccento : c.testo
    return (
      <Scelta
        key={chiave}
        scelta={scelto}
        onPress={() => {
          setModo(chiave)
          setErrore(null)
        }}
        spento={!x.idoneo || attesa}
        etichetta={titolo}
        stile={{ alignSelf: 'stretch' }}
      >
        <Text style={{ color: colore, fontWeight: '700' }}>{titolo}</Text>
        {sotto ? <Text style={{ color: colore, fontSize: 13, marginTop: 2 }}>{sotto}</Text> : null}
      </Scelta>
    )
  }

  return (
    <View style={{ gap: spazio.due }}>
      <Testo variante="piccolo">
        {t(
          `Il Guest Pass si può attivare per te o per un figlio dai ${scelta.eta.min} ai ${scelta.eta.max} anni. Ognuno ha il suo: finito questo, puoi attivarne un altro.`,
          `The Guest Pass can be activated for you or a child aged ${scelta.eta.min} to ${scelta.eta.max}. Everyone gets their own: once this one is done, you can activate another.`,
        )}
      </Testo>
      {me ? riga(me, 'me', t('Per me', 'For me'), me.idoneo ? null : me.motivo) : null}
      {figli.map((x) => {
        const chi = nomeIntero(x) || t('Tuo figlio', 'Your child')
        const eta = x.nascita ? t(`${anni(x.nascita)} anni`, `${anni(x.nascita)} years old`) : null
        return riga(x, `f${x.member_id}`, t(`Per ${chi}`, `For ${chi}`), x.idoneo ? eta : x.motivo)
      })}
      <Scelta
        scelta={modo === NUOVO}
        onPress={() => {
          setModo(NUOVO)
          setErrore(null)
        }}
        spento={attesa}
        etichetta={t('Per un figlio che non è ancora iscritto al club', 'For a child who isn’t registered at the club yet')}
        stile={{ alignSelf: 'stretch' }}
      >
        <Text style={{ color: modo === NUOVO ? c.suAccento : c.testo, fontWeight: '700' }}>
          {figli.length ? t('+ Per un altro figlio', '+ For another child') : t('Per un figlio', 'For a child')}
        </Text>
        <Text style={{ color: modo === NUOVO ? c.suAccento : c.testo, fontSize: 13, marginTop: 2 }}>{t('Che non è ancora iscritto al club', 'Who isn’t registered at the club yet')}</Text>
      </Scelta>

      {modo === NUOVO ? (
        <View style={[stili.riquadro, { borderColor: c.bordo, backgroundColor: c.sfondo }]}>
          <Testo variante="piccolo">{t('I dati di tuo figlio, per intero come sul documento: controlliamo che il codice fiscale corrisponda.', 'Your child’s details, in full as on their ID: we check that the tax code matches.')}</Testo>
          <Campo etichetta={t('Nome', 'First name')} value={figlio.nome} onChangeText={(v) => setFiglio((x) => ({ ...x, nome: v }))} autoCapitalize="words" errore={!figlio.nome.trim()} />
          <Campo etichetta={t('Cognome', 'Last name')} value={figlio.cognome} onChangeText={(v) => setFiglio((x) => ({ ...x, cognome: v }))} autoCapitalize="words" errore={!figlio.cognome.trim()} />
          <CampoData
            etichetta={t('Data di nascita', 'Date of birth')}
            value={figlio.nascita}
            onChange={(v) => setFiglio((x) => ({ ...x, nascita: v }))}
            annoIniziale={new Date().getFullYear() - 15}
            errore={!figlio.nascita || !!erroreEta}
          />
          <Campo
            etichetta={t('Codice fiscale', 'Tax code')}
            value={figlio.codice_fiscale}
            onChangeText={(v) => setFiglio((x) => ({ ...x, codice_fiscale: v.toUpperCase() }))}
            autoCapitalize="characters"
            maxLength={16}
            placeholder="RSSGLI10A41H501X"
            errore={!figlio.codice_fiscale.trim() || !!erroreCf}
          />
          {erroreEta ? <Avviso tono="attenzione">{erroreEta}</Avviso> : null}
          {erroreCf ? <Avviso tono="attenzione">{erroreCf}</Avviso> : null}
        </View>
      ) : null}

      {perFiglio ? (
        <Casella spuntata={tutore} onCambia={() => setTutore((x) => !x)} etichetta={t('Dichiaro di essere il genitore o il tutore legale', 'I declare I am the parent or legal guardian')}>
          <Testo variante="piccolo" style={{ color: c.testo }}>
            {t('Dichiaro di essere il genitore o il tutore legale di questo figlio, e di attivare il Guest Pass a suo nome.', 'I declare I am the parent or legal guardian of this child, and that I’m activating the Guest Pass in their name.')}
          </Testo>
        </Casella>
      ) : null}

      {errore ? <Avviso>{errore}</Avviso> : null}
      <Bottone testo={t('Continua', 'Continue')} onPress={conferma} inCorso={attesa} disabilitato={!pronto} />
      {scelta.per ? <Bottone testo={t('Lascia com’era', 'Leave as it was')} variante="contorno" onPress={() => setAperto(false)} disabilitato={attesa} /> : null}
    </View>
  )
}

const stili = StyleSheet.create({
  riquadro: { borderWidth: 1, borderRadius: 12, padding: spazio.tre, gap: spazio.tre },
  etichetta: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
})
