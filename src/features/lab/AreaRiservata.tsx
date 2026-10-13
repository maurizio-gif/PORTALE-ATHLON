import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { esci, laMiaArea, type Area, type ContrattoArea, type PersonaArea } from '@/api/lab'
import { Avviso } from '@/components/Avviso'
import { Bottone } from '@/components/Bottone'
import { Pagina } from '@/components/Pagina'
import { Griglia } from '@/components/Griglia'
import { Forte, Testo } from '@/components/Testo'
import { Voce } from '@/components/Voce'
import { MetodoAttualeBadge, statoLeggibile } from '@/features/metodo-pagamento/Metodo'
import { dataBreve, metodoDaPerfectGym } from '@/lib/metodoPagamento'
import { spazio, useColori } from '@/theme'

// La mia area, in sola lettura: chi sono, la famiglia, gli abbonamenti col
// metodo di pagamento, il certificato medico. Tutto dal mirror di PerfectGym
// (portale_la_mia_area); niente si scrive.

function nome(p: Pick<PersonaArea, 'nome' | 'cognome'>): string {
  return [p.nome, p.cognome].filter(Boolean).join(' ') || 'Senza nome'
}

function Scheda({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  const c = useColori()
  return (
    <View style={[stili.scheda, { backgroundColor: c.superficie, borderColor: c.bordo }]}>
      <Testo variante="sottotitolo" style={{ fontSize: 17 }}>
        {titolo}
      </Testo>
      {children}
    </View>
  )
}

function RigaContratto({ k, persona }: { k: ContrattoArea; persona: PersonaArea | undefined }) {
  const c = useColori()
  const date = [dataBreve(k.data_inizio) && `dal ${dataBreve(k.data_inizio)}`, dataBreve(k.data_fine) && `al ${dataBreve(k.data_fine)}`]
    .filter(Boolean)
    .join(' ')
  return (
    <View style={[stili.riga, { borderTopColor: c.bordo }]}>
      <Testo style={{ fontWeight: '700' }}>{k.piano ?? 'Abbonamento'}</Testo>
      <Testo variante="piccolo">
        {persona ? nome(persona) + ' · ' : ''}
        {statoLeggibile(k)}
        {date ? ' · ' + date : ''}
        {k.rinnovo_automatico ? ' · rinnovo automatico' : ''}
      </Testo>
      <View style={{ marginTop: spazio.uno }}>
        <MetodoAttualeBadge metodo={metodoDaPerfectGym(k.metodo)} />
      </View>
    </View>
  )
}

export function AreaRiservata({ email }: { email: string }) {
  const c = useColori()
  const [area, setArea] = useState<Area | null>(null)
  const [errore, setErrore] = useState<{ testo: string; nonAmmesso: boolean } | null>(null)

  const carica = useCallback(async () => {
    setErrore(null)
    const esito = await laMiaArea()
    if (esito.ok) setArea(esito.area)
    else setErrore({ testo: esito.errore, nonAmmesso: esito.nonAmmesso })
  }, [])

  useEffect(() => {
    carica()
  }, [carica])

  const uscita = <Bottone testo="Esci" variante="contorno" onPress={esci} />

  if (errore) {
    return (
      <Pagina titolo={errore.nonAmmesso ? 'Non sei fra i tester' : 'Qualcosa non va'} sottotitolo={errore.testo}>
        {!errore.nonAmmesso ? <Bottone testo="Riprova" onPress={carica} /> : null}
        {uscita}
      </Pagina>
    )
  }

  if (!area) {
    return (
      <Pagina titolo="La mia area" indietro={false}>
        <View style={{ alignItems: 'flex-start' }}>
          <ActivityIndicator color={c.accento} />
        </View>
      </Pagina>
    )
  }

  if (!area.trovato) {
    return (
      <Pagina titolo="La mia area" sottotitolo={`Sei entrato come ${email}, ma non troviamo una scheda del club con questo indirizzo.`}>
        <Testo variante="attenuato">Il laboratorio legge i dati dalla tua scheda su PerfectGym: entra con l’email con cui sei iscritto.</Testo>
        {uscita}
      </Pagina>
    )
  }

  const perId = new Map(area.persone.map((p) => [p.member_id, p]))
  const titolare = perId.get(area.titolare)
  const famiglia = area.persone.filter((p) => !p.titolare)

  return (
    <Pagina larga titolo={titolare?.nome ? `Ciao ${titolare.nome}` : 'La mia area'} sottotitolo="Laboratorio · sola lettura: i dati vengono dal gestionale del club.">
      <Griglia minima={360}>
        <Scheda titolo="Il mio profilo">
          <Testo>
            <Forte>{titolare ? nome(titolare) : email}</Forte>
          </Testo>
          <Testo variante="piccolo">
            {[titolare?.email || email, titolare?.telefono, titolare?.numero && `tessera n. ${titolare.numero}`].filter(Boolean).join(' · ')}
          </Testo>
        </Scheda>

        {famiglia.length ? (
          <Scheda titolo="La mia famiglia">
            {famiglia.map((p) => (
              <Testo key={p.member_id}>
                {nome(p)}
                {dataBreve(p.data_nascita) ? <Testo variante="piccolo">{`  ·  nato/a il ${dataBreve(p.data_nascita)}`}</Testo> : null}
              </Testo>
            ))}
          </Scheda>
        ) : null}

        <Scheda titolo="Abbonamenti">
          {area.contratti.length ? (
            area.contratti.map((k) => <RigaContratto key={k.contract_id} k={k} persona={perId.get(k.member_id)} />)
          ) : (
            <Testo variante="attenuato">Nessun abbonamento attivo, tuo o della tua famiglia.</Testo>
          )}
        </Scheda>

        <Scheda titolo="Certificato medico">
          {area.certificati.length ? (
            area.certificati.map((ce) => {
              const p = perId.get(ce.member_id)
              return (
                <Testo key={ce.member_id}>
                  {p ? nome(p) + ': ' : ''}
                  {ce.scadenza ? `scade il ${dataBreve(ce.scadenza)}` : 'nessun certificato registrato'}
                  {ce.stato ? <Testo variante="piccolo">{`  ·  ${ce.stato}`}</Testo> : null}
                </Testo>
              )
            })
          ) : (
            <Testo variante="attenuato">Nessun certificato registrato per te o per la tua famiglia.</Testo>
          )}
        </Scheda>

      </Griglia>
      <Griglia minima={360}>
        <Voce titolo="Calendario lezioni" descrizione="Posti liberi, prenota e disdici: prenotazioni vere su PerfectGym." href="/lab/calendario" />
        <Voce titolo="Pagamenti" descrizione="Pagamento diretto con carta e rate automatiche, con il tetto di prova di 5 €." href="/lab/pagamenti" />
        <Voce titolo="Guest Pass (prova)" descrizione="La procedura nuova dal link: dati, consensi, inizio e pagamento." href="/lab/guest-pass" />
      </Griglia>
      {uscita}
    </Pagina>
  )
}

const stili = StyleSheet.create({
  scheda: { borderWidth: 1, borderRadius: 12, padding: spazio.tre, gap: spazio.due },
  riga: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spazio.due, gap: 2 },
})
