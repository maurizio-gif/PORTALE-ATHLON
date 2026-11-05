import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { View } from 'react-native'

import { erroreDatiPagatore, impostaPagatore, pulisciCf, statoPagatore, type FiglioPagatore, type StatoPagatore } from '@/api/pagatore'
import { Avviso } from '@/components/Avviso'
import { Campo } from '@/components/Campo'
import { Casella } from '@/components/Casella'
import { Forte, Testo } from '@/components/Testo'
import { t, tv } from '@/lib/lingua'
import type { ContrattoNucleo } from '@/lib/metodoPagamento'
import { spazio } from '@/theme'

// Il soggetto pagatore, scelto mentre si salva il metodo di pagamento (05/11/2026, decisione di Maurizio):
// una casella che dice «voglio essere indicato come soggetto pagatore sulle ricevute di <figlio>», con nome,
// cognome e codice fiscale da confermare (o da scrivere, se mancano, o da cambiare se ha pagato un altro
// genitore) e la dichiarazione di responsabilita'. Vale per i figli minorenni degli abbonamenti scelti, e
// da quel momento le ricevute nuove riportano quel pagatore (preferenza per bambino, APP-ATHLON).
//
// Lo stato sta qui, nella pagina che contiene `GestioneNucleo`: la schermata cambia (elenco, IBAN, esito) e
// dalla carta si esce dall'app, ma quello che la persona ha scritto resta finche' non salva. `prima` si
// chiama prima di ogni salvataggio (IBAN, carta, metodo gia' salvato): se la casella e' spuntata scrive la
// preferenza, e se qualcosa non torna restituisce il testo dell'errore e il salvataggio non parte.

export type PagatoreMetodo = {
  /** Il blocco da mostrare sopra i comandi: niente, se fra gli abbonamenti scelti non c'e' un figlio minorenne. */
  render: (selezionati: ContrattoNucleo[]) => ReactNode
  /** Da chiamare prima di salvare: null se si puo' proseguire, altrimenti l'errore da mostrare. */
  prima: (selezionati: ContrattoNucleo[]) => Promise<string | null>
}

const nomi = (figli: FiglioPagatore[]) => {
  const n = figli.map((f) => f.nome || t('il figlio', 'your child'))
  if (n.length <= 1) return n[0] ?? ''
  return `${n.slice(0, -1).join(', ')} ${t('e', 'and')} ${n[n.length - 1]}`
}

export function usePagatoreMetodo(): PagatoreMetodo {
  const [stato, setStato] = useState<StatoPagatore | null>(null)
  const [attivo, setAttivo] = useState(false)
  const [nome, setNome] = useState('')
  const [cognome, setCognome] = useState('')
  const [cf, setCf] = useState('')
  const [dichiaro, setDichiaro] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [precompilato, setPrecompilato] = useState(false)

  const carica = useCallback(async () => {
    const r = await statoPagatore()
    if (r.ok) setStato(r.stato)
  }, [])
  useEffect(() => {
    carica()
  }, [carica])

  // I campi partono da chi e' connesso (il «mio nominativo»): la persona li conferma, li completa o li cambia.
  useEffect(() => {
    if (!stato?.titolare || precompilato) return
    setNome(stato.titolare.nome ?? '')
    setCognome(stato.titolare.cognome ?? '')
    setCf(stato.titolare.cf ?? '')
    setPrecompilato(true)
  }, [stato, precompilato])

  const figliDi = useCallback(
    (selezionati: ContrattoNucleo[]) => (stato?.figli ?? []).filter((f) => selezionati.some((c) => c.member_id === f.member_id)),
    [stato],
  )

  const prima = useCallback(
    async (selezionati: ContrattoNucleo[]): Promise<string | null> => {
      const figli = figliDi(selezionati)
      if (!attivo || !figli.length) return null
      const e = erroreDatiPagatore({ nome, cognome, codice_fiscale: cf })
      if (e) {
        setErrore(e)
        return e
      }
      if (!dichiaro) {
        const m = t('Per indicare il soggetto pagatore spunta la dichiarazione.', 'To name the payer, tick the declaration.')
        setErrore(m)
        return m
      }
      const r = await impostaPagatore({ intestatari: figli.map((f) => f.member_id), nome: nome.trim(), cognome: cognome.trim(), codice_fiscale: pulisciCf(cf), origine: 'metodo_pagamento' })
      if (!r.ok) {
        setErrore(r.errore)
        return r.errore
      }
      setErrore(null)
      setAttivo(false)
      setDichiaro(false)
      await carica()
      return null
    },
    [attivo, cf, cognome, dichiaro, figliDi, nome, carica],
  )

  const render = useCallback(
    (selezionati: ContrattoNucleo[]): ReactNode => {
      const figli = figliDi(selezionati)
      if (!stato || !figli.length) return null
      // Se tutti i figli interessati hanno gia' la stessa scelta, si dice chi compare adesso.
      const gia = figli.every((f) => f.scelta) && new Set(figli.map((f) => `${f.scelta?.cf}|${f.scelta?.nome}|${f.scelta?.cognome}`)).size === 1 ? figli[0].scelta : null
      const chi = nomi(figli)
      return (
        <View style={{ gap: spazio.tre }}>
          {gia ? (
            <Testo variante="piccolo">
              {tv(
                <>
                  Sulle ricevute di {chi} compare già <Forte>{`${gia.nome} ${gia.cognome}`}</Forte>
                  {gia.cf ? ` (${gia.cf})` : ''}.
                </>,
                <>
                  {chi}’s receipts already name <Forte>{`${gia.nome} ${gia.cognome}`}</Forte>
                  {gia.cf ? ` (${gia.cf})` : ''}.
                </>,
              )}
            </Testo>
          ) : null}
          <Casella
            riquadro
            spuntata={attivo}
            onCambia={() => {
              setAttivo(!attivo)
              setErrore(null)
            }}
            etichetta={t('Indica il soggetto pagatore sulle ricevute', 'Name the payer on the receipts')}
          >
            <View style={{ gap: 2 }}>
              <Testo style={{ fontWeight: '700' }}>
                {gia
                  ? t(`Cambia chi risulta come soggetto pagatore sulle ricevute di ${chi}`, `Change who is named as payer on ${chi}’s receipts`)
                  : t(`Voglio essere indicato come soggetto pagatore sulle ricevute di ${chi}`, `I want to be named as the payer on ${chi}’s receipts`)}
              </Testo>
              <Testo variante="piccolo">
                {t(
                  'Per la detrazione delle spese sportive dei ragazzi: nome, cognome e codice fiscale di chi paga compaiono sulle ricevute che il club emette da adesso.',
                  'For the tax deduction of young people’s sports costs: the payer’s first name, last name and tax code appear on the receipts the club issues from now on.',
                )}
              </Testo>
            </View>
          </Casella>

          {attivo ? (
            <View style={{ gap: spazio.tre }}>
              <Testo variante="piccolo">
                {t('Conferma i dati, o scrivi quelli di chi paga se non sei tu (l’altro genitore, per esempio).', 'Confirm the details, or enter those of whoever pays if it isn’t you (the other parent, for example).')}
              </Testo>
              <View style={{ flexDirection: 'row', gap: spazio.tre }}>
                <Campo etichetta={t('Nome', 'First name')} value={nome} onChangeText={setNome} autoComplete="off" autoCapitalize="words" />
                <Campo etichetta={t('Cognome', 'Last name')} value={cognome} onChangeText={setCognome} autoComplete="off" autoCapitalize="words" />
              </View>
              <Campo
                etichetta={t('Codice fiscale', 'Tax code')}
                value={cf}
                onChangeText={(v) => setCf(pulisciCf(v))}
                autoCapitalize="characters"
                autoCorrect={false}
                autoComplete="off"
                maxLength={16}
                errore={!!errore && !!erroreDatiPagatore({ nome, cognome, codice_fiscale: cf })}
              />
              <Casella spuntata={dichiaro} onCambia={() => setDichiaro(!dichiaro)} etichetta={t('Dichiarazione', 'Declaration')}>
                <Testo variante="piccolo">{stato.dichiarazione}</Testo>
              </Casella>
              {errore ? <Avviso>{errore}</Avviso> : null}
            </View>
          ) : null}
        </View>
      )
    },
    [attivo, cf, cognome, dichiaro, errore, figliDi, nome, stato],
  )

  return { render, prima }
}
