import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { chiamaLink } from '@/api/link'
import { Avviso } from '@/components/Avviso'
import { Bottone } from '@/components/Bottone'
import { Casella } from '@/components/Casella'
import { InfoAdyen } from '@/components/InfoAdyen'
import { Pagina } from '@/components/Pagina'
import { Forte, Testo } from '@/components/Testo'
import { vaiA } from '@/lib/esterno'
import { metodoDaSistemare, type ContrattoNucleo, type EsitoContratto } from '@/lib/metodoPagamento'
import { spazio } from '@/theme'

import { ModuloIban, type DatiConto } from './ModuloIban'
import { ElencoEsiti, MetodoAttualeBadge, chi, dateContratto, statoLeggibile } from './Metodo'

// Gli abbonamenti del nucleo, col metodo che ciascuno ha adesso, e la scelta
// di quali aggiornare. Ripresa dalla pagina del CRM
// (`app/metodo-pagamento/nucleo/[codice]/GestioneNucleo.tsx`), stesse regole:
//
// - si parte con selezionati quelli da sistemare (senza metodo o con la carta
//   scaduta), perche' e' quasi sempre per quelli che si apre il link;
// - se il link l'ha mandato il desk per un contratto, si parte da quello solo
//   (`evidenziato`): l'email ha nominato quel contratto.

type Schermata = 'elenco' | 'iban' | 'esito'

export function GestioneNucleo({
  token,
  nome,
  nomeTitolare,
  iniziali,
  evidenziato = null,
}: {
  token: string
  nome: string | null
  nomeTitolare: string
  iniziali: ContrattoNucleo[]
  evidenziato?: number | null
}) {
  const daSistemare = (lista: ContrattoNucleo[]) => {
    if (evidenziato != null && lista.some((c) => c.contract_id === evidenziato)) return new Set([evidenziato])
    return new Set(lista.filter((c) => metodoDaSistemare(c.metodo)).map((c) => c.contract_id))
  }
  const [contratti, setContratti] = useState(iniziali)
  const [scelti, setScelti] = useState<Set<number>>(() => daSistemare(iniziali))
  const [schermata, setSchermata] = useState<Schermata>('elenco')
  const [risultati, setRisultati] = useState<EsitoContratto[]>([])
  const [finale, setFinale] = useState('')
  const [errore, setErrore] = useState('')
  const [attesa, setAttesa] = useState(false)

  const selezionati = contratti.filter((c) => scelti.has(c.contract_id))

  function cambia(id: number) {
    setScelti((prima) => {
      const dopo = new Set(prima)
      if (dopo.has(id)) dopo.delete(id)
      else dopo.add(id)
      return dopo
    })
  }

  async function salvaIban(conto: DatiConto): Promise<string | null> {
    const { ok, dati } = await chiamaLink(token, 'iban', { contratti: [...scelti], ...conto })
    if (!ok) return dati.errore ?? 'Non siamo riusciti a salvarlo adesso. Riprova fra qualche minuto.'
    setRisultati(dati.risultati ?? [])
    setFinale(dati.finale ?? '')
    setSchermata('esito')
    return null
  }

  async function vaiAllaCarta() {
    setErrore('')
    setAttesa(true)
    const { ok, dati } = await chiamaLink(token, 'carta', { contratti: [...scelti] })
    if (ok && dati.url) {
      vaiA(String(dati.url))
      return
    }
    setErrore(dati.errore ?? 'Non riusciamo ad aprire la pagina della carta adesso. Riprova fra qualche minuto.')
    setAttesa(false)
  }

  async function tornaAllElenco() {
    setErrore('')
    setAttesa(true)
    const { ok, dati } = await chiamaLink(token, 'contratti')
    if (ok && Array.isArray(dati.contratti)) {
      const nuovi = dati.contratti as ContrattoNucleo[]
      setContratti(nuovi)
      // Dopo un salvataggio si riparte da quello che resta da sistemare, non
      // dal contratto dell'email: quello, di solito, e' appena fatto.
      setScelti(new Set(nuovi.filter((c) => metodoDaSistemare(c.metodo)).map((c) => c.contract_id)))
    }
    setAttesa(false)
    setSchermata('elenco')
  }

  if (schermata === 'esito') {
    const tutti = risultati.length > 0 && risultati.every((r) => r.ok)
    return (
      <Pagina titolo={tutti ? 'Fatto, grazie!' : 'Ecco com’è andata'}>
        <Testo>
          {finale ? (
            <>
              Il conto che finisce con <Forte>{finale}</Forte> {tutti ? 'è salvato su questi abbonamenti:' : 'è stato salvato così:'}
            </>
          ) : (
            'Il metodo di pagamento è stato salvato così:'
          )}
        </Testo>
        <ElencoEsiti contratti={contratti} risultati={risultati} />
        {!tutti ? (
          <Testo variante="attenuato">Dove non è andato, puoi riprovare o scriverci a desk@athlonroma.it: ci pensiamo noi.</Testo>
        ) : null}
        <Bottone testo="Torna ai tuoi abbonamenti" variante="contorno" onPress={tornaAllElenco} inCorso={attesa} />
      </Pagina>
    )
  }

  if (schermata === 'iban') {
    return (
      <Pagina titolo="Metodo di pagamento">
        <ModuloIban
          nomeCompleto={nomeTitolare}
          introduzione={
            <View style={{ gap: spazio.uno }}>
              <Testo variante="attenuato">
                Le quote di {selezionati.length === 1 ? 'questo abbonamento' : 'questi abbonamenti'} verranno addebitate su questo conto:
              </Testo>
              {selezionati.map((c) => (
                <Testo key={c.contract_id} variante="attenuato">
                  • {chi(c)}
                  {c.piano ? ` · ${c.piano}` : ''}
                </Testo>
              ))}
            </View>
          }
          etichettaInvio={selezionati.length > 1 ? `Salva il conto su ${selezionati.length} abbonamenti` : 'Salva il conto'}
          onInvia={salvaIban}
          onIndietro={() => setSchermata('elenco')}
        />
      </Pagina>
    )
  }

  return (
    <Pagina titolo={nome ? `Ciao ${nome}` : 'I tuoi abbonamenti'}>
      {contratti.length === 0 ? (
        <Testo variante="attenuato">
          Non troviamo abbonamenti attivi a tuo nome o dei tuoi figli. Se pensi sia un errore scrivici a desk@athlonroma.it.
        </Testo>
      ) : (
        <>
          <Testo>
            Questi sono gli abbonamenti attivi tuoi e della tua famiglia, con il metodo di pagamento che hanno adesso. Scegli su quali
            salvare quello nuovo.
          </Testo>

          <View style={stili.elenco}>
            {contratti.map((c) => (
              <Casella
                key={c.contract_id}
                riquadro
                spuntata={scelti.has(c.contract_id)}
                onCambia={() => cambia(c.contract_id)}
                etichetta={`${chi(c)}, ${c.piano ?? 'Abbonamento'}`}
              >
                <View style={{ gap: 2 }}>
                  <Testo style={{ fontWeight: '700' }}>{chi(c)}</Testo>
                  <Testo variante="piccolo">
                    {c.piano ?? 'Abbonamento'} · {statoLeggibile(c)}
                  </Testo>
                  {dateContratto(c) ? <Testo variante="piccolo">{dateContratto(c)}</Testo> : null}
                  <View style={{ marginTop: spazio.uno + 2 }}>
                    <MetodoAttualeBadge metodo={c.metodo} />
                  </View>
                </View>
              </Casella>
            ))}
          </View>

          <Testo variante="piccolo">Il metodo che scegli prende il posto di quello attuale sugli abbonamenti selezionati.</Testo>

          {errore ? <Avviso>{errore}</Avviso> : null}

          <Bottone
            testo="Conto corrente (IBAN)"
            disabilitato={attesa || selezionati.length === 0}
            onPress={() => {
              setErrore('')
              setSchermata('iban')
            }}
          />
          <Bottone
            testo={attesa ? 'Apro la pagina di Adyen…' : 'Carta di credito o di debito'}
            inCorso={attesa}
            disabilitato={selezionati.length === 0}
            onPress={vaiAllaCarta}
          />
          {selezionati.length === 0 ? <Testo variante="piccolo">Seleziona almeno un abbonamento.</Testo> : null}
          <Testo variante="piccolo">
            La carta si salva sulla pagina protetta di <InfoAdyen />, il partner del club per i pagamenti con carta: i suoi dati non passano
            da noi. Viene registrata a nome di {nomeTitolare || 'chi ha chiesto il link'} e collegata agli abbonamenti scelti.
          </Testo>
        </>
      )}
    </Pagina>
  )
}

const stili = StyleSheet.create({
  elenco: { gap: spazio.due },
})
