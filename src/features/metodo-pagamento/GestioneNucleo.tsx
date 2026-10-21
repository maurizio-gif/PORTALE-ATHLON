import { useState, type ComponentType, type ReactNode } from 'react'
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
import { t, tv } from '@/lib/lingua'

// Gli abbonamenti del nucleo, col metodo che ciascuno ha adesso, e la scelta
// di quali aggiornare. Ripresa dalla pagina del CRM
// (`app/metodo-pagamento/nucleo/[codice]/GestioneNucleo.tsx`), stesse regole:
//
// - si parte con selezionati quelli da sistemare (senza metodo o con la carta
//   scaduta), perche' e' quasi sempre per quelli che si apre il link;
// - se il link l'ha mandato il desk per un contratto, si parte da quello solo
//   (`evidenziato`): l'email ha nominato quel contratto.

type Schermata = 'elenco' | 'iban' | 'esito'

/** Il contenitore della pagina: `Pagina` dal link dell'email, la schermata del laboratorio nell'app. */
export type Cornice = ComponentType<{ titolo: string; children: ReactNode; indietro?: boolean }>

export function GestioneNucleo({
  token,
  nome,
  nomeTitolare,
  iniziali,
  evidenziato = null,
  Cornice = Pagina,
}: {
  Cornice?: Cornice
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
    if (!ok) return dati.errore ?? t('Non siamo riusciti a salvarlo adesso. Riprova fra qualche minuto.', 'We couldn’t save it right now. Try again in a few minutes.')
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
    setErrore(dati.errore ?? t('Non riusciamo ad aprire la pagina della carta adesso. Riprova fra qualche minuto.', 'We can’t open the card page right now. Try again in a few minutes.'))
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
      <Cornice titolo={tutti ? t('Fatto, grazie!', 'Done, thank you!') : t('Ecco com’è andata', 'Here’s how it went')}>
        <Testo>
          {finale ? (
            tv(
              <>
                Il conto che finisce con <Forte>{finale}</Forte> {tutti ? 'è salvato su questi abbonamenti:' : 'è stato salvato così:'}
              </>,
              <>
                The account ending in <Forte>{finale}</Forte> {tutti ? 'is saved on these memberships:' : 'was saved like this:'}
              </>,
            )
          ) : (
            t('Il metodo di pagamento è stato salvato così:', 'The payment method was saved like this:')
          )}
        </Testo>
        <ElencoEsiti contratti={contratti} risultati={risultati} />
        {!tutti ? (
          <Testo variante="attenuato">{t('Dove non è andato, riprova fra qualche minuto.', 'Where it didn’t go through, try again in a few minutes.')}</Testo>
        ) : null}
        <Bottone testo={t('Torna ai tuoi abbonamenti', 'Back to your memberships')} variante="contorno" onPress={tornaAllElenco} inCorso={attesa} />
      </Cornice>
    )
  }

  if (schermata === 'iban') {
    return (
      <Cornice titolo={t('Metodo di pagamento', 'Payment method')}>
        <ModuloIban
          nomeCompleto={nomeTitolare}
          introduzione={
            <View style={{ gap: spazio.uno }}>
              <Testo variante="attenuato">
                {selezionati.length === 1
                  ? t('Le quote di questo abbonamento verranno addebitate su questo conto:', 'The fees for this membership will be charged to this account:')
                  : t('Le quote di questi abbonamenti verranno addebitate su questo conto:', 'The fees for these memberships will be charged to this account:')}
              </Testo>
              {selezionati.map((c) => (
                <Testo key={c.contract_id} variante="attenuato">
                  • {chi(c)}
                  {c.piano ? ` · ${c.piano}` : ''}
                </Testo>
              ))}
            </View>
          }
          etichettaInvio={selezionati.length > 1 ? t(`Salva il conto su ${selezionati.length} abbonamenti`, `Save the account on ${selezionati.length} memberships`) : t('Salva il conto', 'Save the account')}
          onInvia={salvaIban}
          onIndietro={() => setSchermata('elenco')}
        />
      </Cornice>
    )
  }

  return (
    <Cornice titolo={nome ? t(`Ciao ${nome}`, `Hi ${nome}`) : t('I tuoi abbonamenti', 'Your memberships')}>
      {contratti.length === 0 ? (
        <Testo variante="attenuato">
          {t('Non troviamo abbonamenti attivi a tuo nome o dei tuoi figli.', 'We can’t find any active memberships in your name or your children’s.')}
        </Testo>
      ) : (
        <>
          <Testo>
            {t(
              'Questi sono gli abbonamenti attivi tuoi e della tua famiglia, con il metodo di pagamento che hanno adesso. Scegli su quali salvare quello nuovo.',
              'These are the active memberships for you and your family, with the payment method they have now. Choose which ones to save the new one on.',
            )}
          </Testo>

          <View style={stili.elenco}>
            {contratti.map((c) => (
              <Casella
                key={c.contract_id}
                riquadro
                spuntata={scelti.has(c.contract_id)}
                onCambia={() => cambia(c.contract_id)}
                etichetta={`${chi(c)}, ${c.piano ?? t('Abbonamento', 'Membership')}`}
              >
                <View style={{ gap: 2 }}>
                  <Testo style={{ fontWeight: '700' }}>{chi(c)}</Testo>
                  <Testo variante="piccolo">
                    {c.piano ?? t('Abbonamento', 'Membership')} · {statoLeggibile(c)}
                  </Testo>
                  {dateContratto(c) ? <Testo variante="piccolo">{dateContratto(c)}</Testo> : null}
                  <View style={{ marginTop: spazio.uno + 2 }}>
                    <MetodoAttualeBadge metodo={c.metodo} />
                  </View>
                </View>
              </Casella>
            ))}
          </View>

          <Testo variante="piccolo">{t('Il metodo che scegli prende il posto di quello attuale sugli abbonamenti selezionati.', 'The method you choose replaces the current one on the selected memberships.')}</Testo>

          {errore ? <Avviso>{errore}</Avviso> : null}

          <Bottone
            testo={t('Conto corrente (IBAN)', 'Bank account (IBAN)')}
            disabilitato={attesa || selezionati.length === 0}
            onPress={() => {
              setErrore('')
              setSchermata('iban')
            }}
          />
          <Bottone
            testo={attesa ? t('Apro la pagina di Adyen…', 'Opening the Adyen page…') : t('Carta di credito o di debito', 'Credit or debit card')}
            inCorso={attesa}
            disabilitato={selezionati.length === 0}
            onPress={vaiAllaCarta}
          />
          {selezionati.length === 0 ? <Testo variante="piccolo">{t('Seleziona almeno un abbonamento.', 'Select at least one membership.')}</Testo> : null}
          <Testo variante="piccolo">
            {tv(
              <>
                La carta si salva sulla pagina protetta di <InfoAdyen />, il partner del club per i pagamenti con carta: i suoi dati non passano
                da noi. Viene registrata a nome di {nomeTitolare || 'chi ha chiesto il link'} e collegata agli abbonamenti scelti.
              </>,
              <>
                Your card is saved on the secure page of <InfoAdyen />, the club’s partner for card payments: your details don’t pass
                through us. It’s registered in the name of {nomeTitolare || 'whoever requested the link'} and linked to the selected memberships.
              </>,
            )}
          </Testo>
        </>
      )}
    </Cornice>
  )
}

const stili = StyleSheet.create({
  elenco: { gap: spazio.due },
})
