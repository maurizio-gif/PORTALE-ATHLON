import { useCallback, useEffect, useMemo, useState } from 'react'
import { Text, View } from 'react-native'

import {
  MAX_PER_CHIAMATA,
  erroreDatiPagatore,
  pulisciCf,
  ricevuteModificabili,
  ristampaRicevute,
  statoPagatore,
  type EsitoRistampa,
  type RicevutaModificabile,
  type StatoPagatore,
} from '@/api/pagatore'
import { Casella } from '@/components/Casella'
import { locale, t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { CampoTesto, Scelte } from '../ui/Campi'
import { Foglio } from '../ui/Foglio'
import { Messaggio, Pulsante, SchedeInArrivo } from '../ui/kit'
import { F, usePalette } from '../ui/tema'

// «Cambia pagatore» sulle ricevute dei figli (05/11/2026, decisioni di Maurizio). Il genitore sceglie il figlio e
// l'anno (oggi solo l'anno solare precedente), scrive nome, cognome e codice fiscale di chi ha pagato davvero, accetta
// la dichiarazione, e il club rifa le ricevute: una versione nuova per quelle nostre, una **copia con lo stesso numero**
// per quelle vecchie di PerfectGym (senza progressivo dell'Agenzia delle Entrate, senza tessera ASI e senza IVA: sulle
// vecchie non c'erano). Il PDF vecchio resta fra i Documenti. Le ricevute di PerfectGym non si agganciano da sole a un
// pagamento quando in quel giorno ce n'e' piu' d'uno: la persona sceglie dall'importo.

const giorno = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Rome' })
const euro = (n: number) => n.toLocaleString(locale(), { style: 'currency', currency: 'EUR' })

export function FoglioPagatore({ aperto, onChiudi, onFatto }: { aperto: boolean; onChiudi: () => void; onFatto: () => void }) {
  const p = usePalette()
  const [carica, setCarica] = useState<'attesa' | 'pronto' | 'errore'>('attesa')
  const [errore, setErrore] = useState('')
  const [stato, setStato] = useState<StatoPagatore | null>(null)
  const [ricevute, setRicevute] = useState<RicevutaModificabile[]>([])

  const [figlio, setFiglio] = useState<number | null>(null)
  const [anno, setAnno] = useState<number | null>(null)
  const [scelti, setScelti] = useState<Set<string>>(new Set())
  const [pick, setPick] = useState<Record<string, number>>({})

  const [nome, setNome] = useState('')
  const [cognome, setCognome] = useState('')
  const [cf, setCf] = useState('')
  const [futuro, setFuturo] = useState(true)
  const [dichiaro, setDichiaro] = useState(false)

  const [inCorso, setInCorso] = useState<{ fatte: number; tutte: number } | null>(null)
  const [erroreForm, setErroreForm] = useState('')
  const [esito, setEsito] = useState<EsitoRistampa | null>(null)

  const leggi = useCallback(async () => {
    setCarica('attesa')
    const [s, r] = await Promise.all([statoPagatore(), ricevuteModificabili()])
    if (!s.ok || !r.ok) {
      setErrore(!s.ok ? s.errore : !r.ok ? r.errore : '')
      setCarica('errore')
      return
    }
    setStato(s.stato)
    setRicevute(r.ricevute)
    setCarica('pronto')
  }, [])

  // Si rilegge a ogni apertura: l'elenco dice cosa c'e' adesso (e chi risulta come pagatore).
  useEffect(() => {
    if (!aperto) return
    setEsito(null)
    setErroreForm('')
    setDichiaro(false)
    setInCorso(null)
    leggi()
  }, [aperto, leggi])

  const figli = useMemo(() => {
    const visti = new Map<number, string>()
    for (const r of ricevute) if (!visti.has(r.member_id)) visti.set(r.member_id, r.persona ?? t('Figlio', 'Child'))
    return [...visti].map(([id, nomeFiglio]) => ({ id, nome: nomeFiglio }))
  }, [ricevute])

  // Il primo figlio e il primo anno, quando l'elenco arriva.
  useEffect(() => {
    if (carica !== 'pronto') return
    const f = figlio != null && figli.some((x) => x.id === figlio) ? figlio : (figli[0]?.id ?? null)
    if (f !== figlio) setFiglio(f)
  }, [carica, figli, figlio])

  const anniDelFiglio = useMemo(() => [...new Set(ricevute.filter((r) => r.member_id === figlio).map((r) => r.anno))].sort((a, b) => b - a), [ricevute, figlio])
  useEffect(() => {
    if (anno == null || !anniDelFiglio.includes(anno)) setAnno(anniDelFiglio[0] ?? null)
  }, [anniDelFiglio, anno])

  const elenco = useMemo(() => ricevute.filter((r) => r.member_id === figlio && r.anno === anno), [ricevute, figlio, anno])

  // Cambiano figlio o anno: tutte le ricevute scelte (quelle che si agganciano da sole), e i dati di chi paga ripartono da quello che il club sa.
  useEffect(() => {
    setScelti(new Set(elenco.filter((r) => !r.da_scegliere).map((r) => r.chiave)))
    setPick({})
  }, [elenco])
  useEffect(() => {
    if (!stato) return
    const f = stato.figli.find((x) => x.member_id === figlio)
    const da = f?.scelta ?? (stato.titolare ? { nome: stato.titolare.nome ?? '', cognome: stato.titolare.cognome ?? '', cf: stato.titolare.cf } : null)
    setNome(da?.nome ?? '')
    setCognome(da?.cognome ?? '')
    setCf(da?.cf ?? '')
  }, [stato, figlio])

  const risolte = elenco.filter((r) => scelti.has(r.chiave) && (!r.da_scegliere || pick[r.chiave] != null))
  const nomeFiglio = figli.find((x) => x.id === figlio)?.nome ?? ''

  function cambia(r: RicevutaModificabile) {
    setScelti((prima) => {
      const dopo = new Set(prima)
      if (dopo.has(r.chiave)) dopo.delete(r.chiave)
      else dopo.add(r.chiave)
      return dopo
    })
  }

  async function invia() {
    setErroreForm('')
    const e = erroreDatiPagatore({ nome, cognome, codice_fiscale: cf })
    if (e) return setErroreForm(e)
    if (!risolte.length) return setErroreForm(t('Scegli almeno una ricevuta.', 'Choose at least one receipt.'))
    if (!dichiaro) return setErroreForm(t('Per continuare spunta la dichiarazione.', 'To continue, tick the declaration.'))

    // A gruppi: ogni PDF si disegna e si deposita, e il server ne fa al massimo MAX_PER_CHIAMATA per volta.
    const chiavi = risolte.map((r) => r.chiave)
    const totale: EsitoRistampa = { fatte: 0, invariate: 0, errori: [], risultati: [] }
    setInCorso({ fatte: 0, tutte: chiavi.length })
    for (let i = 0; i < chiavi.length; i += MAX_PER_CHIAMATA) {
      const gruppo = chiavi.slice(i, i + MAX_PER_CHIAMATA)
      const scelte: Record<string, number> = {}
      for (const k of gruppo) if (pick[k] != null) scelte[k] = pick[k]
      const r = await ristampaRicevute({ nome: nome.trim(), cognome: cognome.trim(), codice_fiscale: pulisciCf(cf), ricevute: gruppo, scelte, anchePerIlFuturo: futuro && i === 0 })
      if (!r.ok) {
        for (const k of gruppo) totale.errori.push({ chiave: k, errore: r.errore })
      } else {
        totale.fatte += r.esito.fatte
        totale.invariate += r.esito.invariate
        totale.errori.push(...r.esito.errori)
        totale.risultati.push(...r.esito.risultati)
      }
      setInCorso({ fatte: Math.min(i + gruppo.length, chiavi.length), tutte: chiavi.length })
    }
    setInCorso(null)
    setEsito(totale)
    if (totale.fatte > 0) onFatto()
  }

  const titolo = t('Soggetto pagatore sulle ricevute', 'Payer on the receipts')

  if (esito) {
    return (
      <Foglio aperto={aperto} titolo={titolo} onChiudi={onChiudi}>
        <Messaggio tono={esito.fatte > 0 && !esito.errori.length ? 'ok' : esito.fatte > 0 ? 'attenzione' : 'errore'} titolo={esito.fatte > 0 ? t('Fatto', 'Done') : t('Non è cambiato niente', 'Nothing changed')}>
          {esito.fatte > 0
            ? t(
                `Abbiamo rifatto ${esito.fatte} ${esito.fatte === 1 ? 'ricevuta' : 'ricevute'} con ${nome} ${cognome} come soggetto pagatore. Le trovi in Documenti, accanto alle originali, che restano.`,
                `We redid ${esito.fatte} ${esito.fatte === 1 ? 'receipt' : 'receipts'} naming ${nome} ${cognome} as the payer. You’ll find them in Documents, next to the originals, which stay.`,
              )
            : t('Nessuna ricevuta è stata rifatta.', 'No receipt was redone.')}
        </Messaggio>
        {esito.invariate > 0 ? (
          <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 14, lineHeight: 20 }}>
            {t(`${esito.invariate} avevano già questo soggetto pagatore e non sono cambiate.`, `${esito.invariate} already had this payer and weren’t changed.`)}
          </Text>
        ) : null}
        {esito.errori.length > 0 ? (
          <View style={{ gap: spazio.due }}>
            <Text style={{ color: p.testo, fontFamily: F.semi, fontSize: 14.5 }}>{t(`${esito.errori.length} non si sono potute rifare:`, `${esito.errori.length} couldn’t be redone:`)}</Text>
            {esito.errori.slice(0, 5).map((e) => {
              const r = ricevute.find((x) => x.chiave === e.chiave)
              return (
                <Text key={e.chiave} style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 }}>
                  • {r ? `${r.numero}: ` : ''}
                  {e.errore}
                </Text>
              )
            })}
          </View>
        ) : null}
        <Pulsante testo={t('Chiudi', 'Close')} onPress={onChiudi} />
      </Foglio>
    )
  }

  return (
    <Foglio tastiera aperto={aperto} titolo={titolo} sottotitolo={t('Intesta le ricevute a chi ha pagato davvero, per la detrazione.', 'Put the receipts in the name of whoever actually paid, for the tax deduction.')} onChiudi={onChiudi}>
      {carica === 'attesa' ? <SchedeInArrivo quante={2} /> : null}
      {carica === 'errore' ? (
        <>
          <Messaggio>{errore}</Messaggio>
          <Pulsante testo={t('Riprova', 'Try again')} icona="aggiorna" variante="secondario" onPress={leggi} />
        </>
      ) : null}
      {carica === 'pronto' && !ricevute.length ? (
        <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 14.5, lineHeight: 21 }}>
          {stato?.anni.length
            ? t(`Non ci sono ricevute dei tuoi figli minorenni che si possono rifare: oggi si possono rifare quelle del ${stato.anni.join(' e ')}.`, `There are no receipts for your minor children that can be redone: right now you can redo those of ${stato.anni.join(' and ')}.`)
            : t('Non ci sono ricevute che si possono rifare adesso.', 'There are no receipts that can be redone right now.')}
        </Text>
      ) : null}

      {carica === 'pronto' && ricevute.length > 0 ? (
        <>
          {figli.length > 1 ? <Scelte valori={figli.map((f) => ({ valore: f.id, testo: f.nome }))} scelto={figlio} onScegli={setFiglio} /> : null}
          {anniDelFiglio.length > 1 ? <Scelte valori={anniDelFiglio.map((a) => ({ valore: a, testo: String(a) }))} scelto={anno} onScegli={setAnno} /> : null}

          <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 14, lineHeight: 20 }}>
            {t(
              `Le ricevute del ${anno} di ${nomeFiglio}. Se le rifai, quelle originali restano: la copia ha lo stesso numero e in più il soggetto pagatore.`,
              `${nomeFiglio}’s receipts for ${anno}. If you redo them the originals stay: the copy has the same number and also names the payer.`,
            )}
          </Text>

          <View style={{ gap: spazio.due }}>
            {elenco.map((r) => (
              <View key={r.chiave} style={{ gap: spazio.due }}>
                <Casella
                  spuntata={scelti.has(r.chiave)}
                  onCambia={() => cambia(r)}
                  etichetta={t(`Ricevuta ${r.numero}`, `Receipt ${r.numero}`)}
                >
                  <View style={{ gap: 1 }}>
                    <Text style={{ color: p.testo, fontFamily: F.semi, fontSize: 14.5 }}>
                      {t('Ricevuta', 'Receipt')} {r.numero}
                    </Text>
                    <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 13 }}>
                      {[giorno(r.data), r.importo != null ? euro(r.importo) : null, r.pagatore ? t(`oggi: ${r.pagatore.nome}`, `now: ${r.pagatore.nome}`) : null].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                </Casella>
                {r.da_scegliere && scelti.has(r.chiave) ? (
                  <View style={{ gap: spazio.due, paddingLeft: 34 }}>
                    <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 13, lineHeight: 18 }}>
                      {t('Quel giorno ci sono più pagamenti: scegli quello di questa ricevuta (l’importo lo vedi sul PDF).', 'There are several payments that day: pick the one for this receipt (you can see the amount on the PDF).')}
                    </Text>
                    <Scelte
                      valori={r.candidati.map((c) => ({ valore: c.transazione_id, testo: `${euro(c.importo)} · ${c.ora}` }))}
                      scelto={pick[r.chiave] ?? null}
                      onScegli={(v) => setPick((prima) => ({ ...prima, [r.chiave]: v }))}
                    />
                  </View>
                ) : null}
              </View>
            ))}
          </View>

          <View style={{ gap: spazio.tre }}>
            <Text style={{ color: p.testo, fontFamily: F.semi, fontSize: 15 }}>{t('Chi ha pagato', 'Who paid')}</Text>
            <CampoTesto etichetta={t('Nome', 'First name')} value={nome} onChangeText={setNome} autoComplete="off" autoCapitalize="words" />
            <CampoTesto etichetta={t('Cognome', 'Last name')} value={cognome} onChangeText={setCognome} autoComplete="off" autoCapitalize="words" />
            <CampoTesto etichetta={t('Codice fiscale', 'Tax code')} value={cf} onChangeText={(v) => setCf(pulisciCf(v))} autoCapitalize="characters" autoCorrect={false} autoComplete="off" maxLength={16} />
          </View>

          <Casella spuntata={futuro} onCambia={() => setFuturo(!futuro)} etichetta={t('Anche per le ricevute future', 'Also for future receipts')}>
            <Text style={{ color: p.testo, fontFamily: F.medio, fontSize: 14, lineHeight: 20 }}>
              {t(`Usa questo soggetto pagatore anche per le prossime ricevute di ${nomeFiglio}.`, `Use this payer for ${nomeFiglio}’s upcoming receipts too.`)}
            </Text>
          </Casella>
          <Casella spuntata={dichiaro} onCambia={() => setDichiaro(!dichiaro)} etichetta={t('Dichiarazione', 'Declaration')}>
            <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 }}>{stato?.dichiarazione}</Text>
          </Casella>

          {erroreForm ? <Messaggio>{erroreForm}</Messaggio> : null}
          <Pulsante
            testo={
              inCorso
                ? t(`Rifaccio le ricevute… ${inCorso.fatte}/${inCorso.tutte}`, `Redoing the receipts… ${inCorso.fatte}/${inCorso.tutte}`)
                : risolte.length === 1
                  ? t('Rifai 1 ricevuta', 'Redo 1 receipt')
                  : t(`Rifai ${risolte.length} ricevute`, `Redo ${risolte.length} receipts`)
            }
            onPress={invia}
            disabilitato={inCorso != null || risolte.length === 0}
          />
        </>
      ) : null}
    </Foglio>
  )
}
