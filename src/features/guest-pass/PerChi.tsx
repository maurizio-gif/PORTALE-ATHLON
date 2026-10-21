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
  return new Date(g.slice(0, 10) + 'T12:00:00Z').toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

/** La scelta di partenza: quella salvata, o nessuna. */
function sceltaDi(s: SceltaGuestPass): string | null {
  if (s.per === 'me') return 'me'
  if (s.per === 'figlio') return s.beneficiario_id ? `f${s.beneficiario_id}` : NUOVO
  return null
}

export function PerChi({ token, scelta, onScelto }: { token: string; scelta: SceltaGuestPass; onScelto: () => Promise<unknown> }) {
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
    etaNuovo === null ? null : etaNuovo > scelta.eta.max ? 'È maggiorenne: il Guest Pass lo chiede con la sua email.' : etaNuovo < scelta.eta.min ? 'Il Guest Pass si può attivare dai 13 anni.' : null
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
      return setErrore(dati.errore ?? 'Non siamo riusciti a salvare la scelta adesso. Riprova fra qualche minuto.')
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
          <Testo>
            Per <Text style={{ fontWeight: '700' }}>te</Text>.
          </Testo>
        ) : (
          <>
            <Testo>
              Per <Text style={{ fontWeight: '700' }}>{f ? nomeIntero(f) : 'tuo figlio'}</Text>
              {f?.nascita ? `, data di nascita ${dataLunga(f.nascita)}` : ''}
              {f?.codice_fiscale ? ` · ${f.codice_fiscale}` : ''}.
            </Testo>
            <Testo variante="piccolo">
              Lo attivi come genitore: i dati qui sotto sono i tuoi, e paghi tu. Il contratto è intestato a {f?.nome ?? 'tuo figlio'}
              {f?.nuovo ? ', che registriamo al club nel tuo nucleo familiare quando confermi' : ''}.
            </Testo>
          </>
        )}
        <Bottone testo="Cambia" variante="contorno" onPress={() => setAperto(true)} />
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
        Il Guest Pass si può attivare per te o per un figlio dai {scelta.eta.min} ai {scelta.eta.max} anni. Ognuno ha il suo: finito questo, puoi
        attivarne un altro.
      </Testo>
      {me ? riga(me, 'me', 'Per me', me.idoneo ? null : me.motivo) : null}
      {figli.map((x) => {
        const chi = nomeIntero(x) || 'Tuo figlio'
        const eta = x.nascita ? `${anni(x.nascita)} anni` : null
        return riga(x, `f${x.member_id}`, `Per ${chi}`, x.idoneo ? eta : x.motivo)
      })}
      <Scelta
        scelta={modo === NUOVO}
        onPress={() => {
          setModo(NUOVO)
          setErrore(null)
        }}
        spento={attesa}
        etichetta="Per un figlio che non è ancora iscritto al club"
        stile={{ alignSelf: 'stretch' }}
      >
        <Text style={{ color: modo === NUOVO ? c.suAccento : c.testo, fontWeight: '700' }}>
          {figli.length ? '+ Per un altro figlio' : 'Per un figlio'}
        </Text>
        <Text style={{ color: modo === NUOVO ? c.suAccento : c.testo, fontSize: 13, marginTop: 2 }}>Che non è ancora iscritto al club</Text>
      </Scelta>

      {modo === NUOVO ? (
        <View style={[stili.riquadro, { borderColor: c.bordo, backgroundColor: c.sfondo }]}>
          <Testo variante="piccolo">I dati di tuo figlio, per intero come sul documento: controlliamo che il codice fiscale corrisponda.</Testo>
          <Campo etichetta="Nome" value={figlio.nome} onChangeText={(v) => setFiglio((x) => ({ ...x, nome: v }))} autoCapitalize="words" errore={!figlio.nome.trim()} />
          <Campo etichetta="Cognome" value={figlio.cognome} onChangeText={(v) => setFiglio((x) => ({ ...x, cognome: v }))} autoCapitalize="words" errore={!figlio.cognome.trim()} />
          <CampoData
            etichetta="Data di nascita"
            value={figlio.nascita}
            onChange={(v) => setFiglio((x) => ({ ...x, nascita: v }))}
            annoIniziale={new Date().getFullYear() - 15}
            errore={!figlio.nascita || !!erroreEta}
          />
          <Campo
            etichetta="Codice fiscale"
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
        <Casella spuntata={tutore} onCambia={() => setTutore((x) => !x)} etichetta="Dichiaro di essere il genitore o il tutore legale">
          <Testo variante="piccolo" style={{ color: c.testo }}>
            Dichiaro di essere il genitore o il tutore legale di questo figlio, e di attivare il Guest Pass a suo nome.
          </Testo>
        </Casella>
      ) : null}

      {errore ? <Avviso>{errore}</Avviso> : null}
      <Bottone testo="Continua" onPress={conferma} inCorso={attesa} disabilitato={!pronto} />
      {scelta.per ? <Bottone testo="Lascia com’era" variante="contorno" onPress={() => setAperto(false)} disabilitato={attesa} /> : null}
    </View>
  )
}

const stili = StyleSheet.create({
  riquadro: { borderWidth: 1, borderRadius: 12, padding: spazio.tre, gap: spazio.tre },
})
