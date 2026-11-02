import { useMemo, useRef, useState } from 'react'
import { ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native'

import type { ImportiContratto } from '@/api/abbonamento'
import { anteprimaProposta, firmaProposta, type AnteprimaProposta, type ErroreProposta, type VistaProposta } from '@/api/proposta'
import { Avviso } from '@/components/Avviso'
import { Bottone } from '@/components/Bottone'
import { Casella } from '@/components/Casella'
import { Testo } from '@/components/Testo'
import { DocumentoContratto, giornoBreve, residenzaConPaese, RigaDato } from '@/features/lab/Abbonamento'
import { FirmaPad } from '@/features/lab/FirmaPad'
import { dataLunga, RiepilogoCosti } from '@/features/lab/RiepilogoCosti'
import { Foglio } from '@/features/lab/ui/Foglio'
import { Icona } from '@/features/lab/ui/Icona'
import { Pulsante } from '@/features/lab/ui/kit'
import { F, usePalette } from '@/features/lab/ui/tema'
import { colpetto, Tocco } from '@/features/lab/ui/Tocco'
import { euro } from '@/lib/eventi'
import { giorniFra } from '@/lib/guestPass'
import { t } from '@/lib/lingua'
import { CODICE_FISCALE_NON_ATTRIBUITO } from '@/lib/residenteEstero'
import { spazio, useColori } from '@/theme'

// Fase 2 e 3 della proposta: il giorno d'inizio, poi i dati del contratto, il contratto, le dichiarazioni e la firma.
// Il contratto che si firma e' quello che si e' letto: il server ricompone il documento e ne confronta l'impronta.

/**
 * Fino a quanti giorni dopo oggi puo' partire l'abbonamento. E' il `data_inizio_giorni_max` del catalogo (14, DATA_INIZIO del
 * sito): il server non lo manda con l'anteprima di una proposta, e se cambiasse rifiuta la data con le sue parole, che qui si
 * mostrano. Da leggere dal server, quando lo dira'.
 */
const GIORNI_MAX = 14

/** Oggi, a Roma, come `AAAA-MM-GG`: il giorno che conta per il club, qualunque sia il fuso del telefono. */
function oggiRoma(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

function piuGiorni(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// Il giorno d'inizio

export function FaseGiorno({
  token,
  vista,
  onConfermato,
  onIndietro,
  onErrore,
}: {
  token: string
  vista: VistaProposta
  onConfermato: (giorno: string, anteprima: AnteprimaProposta) => void
  onIndietro: () => void
  onErrore: (e: ErroreProposta) => boolean
}) {
  const p = usePalette()
  const oggi = useMemo(() => oggiRoma(), [])
  const giorni = useMemo(() => giorniFra(oggi, piuGiorni(oggi, GIORNI_MAX)), [oggi])
  const [giorno, setGiorno] = useState(() => (vista.data_inizio && giorni.includes(vista.data_inizio) ? vista.data_inizio : oggi))
  const [invio, setInvio] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [mancanti, setMancanti] = useState<string[] | null>(null)

  async function conferma() {
    setErrore(null)
    setMancanti(null)
    setInvio(true)
    // Con la data la persona CONFERMA il giorno: il server lo segna, e la firma lo pretende.
    const r = await anteprimaProposta(token, giorno)
    setInvio(false)
    if (!r.ok) {
      colpetto('errore')
      if (r.mancanti?.length) setMancanti(r.mancanti)
      if (!onErrore(r)) setErrore(r.errore)
      return
    }
    // Il contratto per il giorno confermato e' gia' composto: la fase dopo lo riusa e non lo chiede un'altra volta.
    onConfermato(giorno, r.anteprima)
  }

  return (
    <>
      <View style={stili.giorni}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spazio.due }}>
          {giorni.map((g) => {
            const attivo = g === giorno
            return (
              <Tocco
                key={g}
                vibra="scelta"
                stato={{ selected: attivo }}
                etichetta={t(`Parte il ${giornoBreve(g)}`, `Starts ${giornoBreve(g)}`)}
                onPress={() => setGiorno(g)}
                style={[stili.giorno, attivo ? { backgroundColor: p.accento, borderColor: p.accento } : { backgroundColor: p.carta, borderColor: p.linea }]}
              >
                <Text style={{ color: attivo ? '#fff' : p.testo, fontFamily: attivo ? F.extra : F.semi, fontSize: 13 }}>{giornoBreve(g)}</Text>
              </Tocco>
            )
          })}
        </ScrollView>
      </View>
      <Text style={[stili.nota, { color: p.testoSecondario }]}>
        {t(
          'Puoi farlo partire oggi o fino a due settimane dopo. Si paga alla firma, ma la data decide cosa copre la prima quota. Il riepilogo dei costi lo vedi al passo dopo.',
          'You can start it today or up to two weeks later. You pay when you sign, but the start date decides what the first payment covers. You’ll see the cost summary in the next step.',
        )}
      </Text>
      {errore ? <Avviso>{errore}</Avviso> : null}
      {mancanti?.length ? (
        <Avviso tono="attenzione">
          {t(
            'Per il contratto mancano dei dati che da qui non si possono completare. Chiedi di rifare la proposta, completandoli.',
            'The contract is missing details that can’t be completed from here. Ask for the offer to be redone, with those filled in.',
          )}
        </Avviso>
      ) : null}
      <Bottone testo={t('Continua', 'Continue')} onPress={conferma} inCorso={invio} />
      <Bottone testo={t('Indietro', 'Back')} variante="contorno" onPress={onIndietro} disabilitato={invio} />
    </>
  )
}

// ---------------------------------------------------------------------------
// Il contratto e la firma

export function FaseContratto({
  token,
  anteprima,
  onFirmato,
  onIndietro,
  onErrore,
}: {
  token: string
  anteprima: AnteprimaProposta
  onFirmato: (numero: string, importi: ImportiContratto) => void
  onIndietro: () => void
  onErrore: (e: ErroreProposta) => boolean
}) {
  const c = useColori()
  const p = usePalette()
  const [datiOk, setDatiOk] = useState(false)
  const [foglio, setFoglio] = useState(false)
  // Le dichiarazioni obbligatorie partono spuntate (e non si tolgono): il facoltativo segue il catalogo del club.
  const [consensi, setConsensi] = useState<Record<string, boolean>>(() => Object.fromEntries(anteprima.consensi.map((x) => [x.chiave, x.obbligatorio || x.preselezionato])))
  const [firmaPng, setFirmaPng] = useState<string | null>(null)
  const [firmando, setFirmando] = useState(false)
  const [erroreFirma, setErroreFirma] = useState<string | null>(null)

  /** Dove stanno nel foglio le dichiarazioni e la firma, per il pulsante «Firma ora». */
  const scorrimentoFoglio = useRef<ScrollView>(null)
  const posti = useRef({ corpo: 0, firma: 0 })
  const [firmaVicina, setFirmaVicina] = useState(false)

  function scorriFoglio(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, layoutMeasurement } = e.nativeEvent
    const firma = posti.current.corpo + posti.current.firma
    setFirmaVicina(firma > 0 && contentOffset.y >= firma - layoutMeasurement.height * 0.5)
  }

  function vaiAllaFirma() {
    colpetto('scelta')
    scorrimentoFoglio.current?.scrollTo({ y: Math.max(0, posti.current.corpo + posti.current.firma - 12), animated: true })
  }

  const obbligatoriOk = anteprima.consensi.every((x) => !x.obbligatorio || consensi[x.chiave])

  async function firma() {
    if (!firmaPng) return
    setErroreFirma(null)
    setFirmando(true)
    const r = await firmaProposta(token, anteprima.impronta, consensi, firmaPng)
    setFirmando(false)
    if (!r.ok) {
      colpetto('errore')
      // Il giorno non e' piu' confermato, la verifica e' persa, la proposta e' scaduta: si cambia pagina. Il resto si legge qui.
      if (r.motivo === 'giorno_non_confermato') return onIndietro()
      setFoglio(false)
      if (!onErrore(r)) setErroreFirma(r.errore)
      return
    }
    colpetto('ok')
    setFoglio(false)
    onFirmato(r.esito.numero, anteprima.importi)
  }

  const x = anteprima.contraente
  return (
    <>
      {anteprima.cambiato ? (
        <Avviso tono="attenzione">
          {t(
            `Il totale da pagare alla firma è cambiato rispetto a quando è stata preparata la proposta: era ${euro(anteprima.cambiato.prima)}, adesso è ${euro(anteprima.cambiato.adesso)}. Dipende dal giorno d’inizio o da una promozione che non vale più. Controlla il riepilogo prima di firmare.`,
            `The total to pay when signing has changed since the offer was prepared: it was ${euro(anteprima.cambiato.prima)}, now it’s ${euro(anteprima.cambiato.adesso)}. It depends on the start date or on a promotion that no longer applies. Check the summary before signing.`,
          )}
        </Avviso>
      ) : null}

      <View style={[stili.scheda, { borderColor: c.bordo, backgroundColor: c.superficie }]}>
        <Text style={[stili.titoloScheda, { color: c.testo }]}>{anteprima.genitore ? t('I dati del contratto', 'Contract details') : t('I tuoi dati', 'Your details')}</Text>
        <View style={{ gap: spazio.due }}>
          <RigaDato nome={t('Nome e cognome', 'Full name')} valore={`${x.nome} ${x.cognome}`.trim()} />
          <RigaDato nome={t('Nato/a il', 'Born on')} valore={x.data_nascita ? dataLunga(x.data_nascita) : null} />
          <RigaDato nome={t('Codice fiscale', 'Tax code')} valore={x.codice_fiscale?.toUpperCase() ?? (x.senza_codice_fiscale ? CODICE_FISCALE_NON_ATTRIBUITO : null)} />
          <RigaDato nome={t('Residenza', 'Address')} valore={residenzaConPaese(x)} />
          <RigaDato nome={t('Email', 'Email')} valore={x.email} />
          <RigaDato nome={t('Telefono', 'Phone')} valore={x.telefono} />
          {anteprima.genitore ? <RigaDato nome={t('Firma il genitore', 'Parent signing')} valore={`${anteprima.genitore.nome} ${anteprima.genitore.cognome}`.trim()} /> : null}
          <RigaDato nome={t('Parte il', 'Starts on')} valore={dataLunga(anteprima.proposta.data_inizio)} />
        </View>
      </View>
      <Text style={[stili.nota, { color: c.testoSecondario }]}>
        {t('Se un dato non è giusto non si corregge da qui: torna indietro e chiedi di rifare la proposta.', 'If a detail isn’t right it can’t be corrected from here: go back and ask for the offer to be redone.')}
      </Text>

      <RiepilogoCosti importi={anteprima.importi} />

      <Casella spuntata={datiOk} onCambia={() => setDatiOk((v) => !v)} etichetta={t('Confermo che i dati sono corretti', 'I confirm my details are correct')}>
        <Testo>{t('Confermo che questi dati sono corretti.', 'I confirm these details are correct.')}</Testo>
      </Casella>

      <Testo variante="attenuato">
        {anteprima.firmatario === 'genitore'
          ? t('Lo leggi, spunti le dichiarazioni e firma il genitore, con il dito o con il mouse. Il pagamento viene dopo: carta o conto corrente, lo scegli allora.', 'You read it, tick the declarations and the parent signs, with a finger or a mouse. Payment comes next: you choose card or bank account then.')
          : t('Lo leggi, spunti le dichiarazioni e firmi con il dito o con il mouse. Il pagamento viene dopo: carta o conto corrente, lo scegli allora.', 'You read it, tick the declarations and sign with a finger or a mouse. Payment comes next: you choose card or bank account then.')}
      </Testo>
      {erroreFirma ? <Avviso>{erroreFirma}</Avviso> : null}
      <Bottone testo={t('Leggi il contratto e firma', 'Read the contract and sign')} onPress={() => { setFirmaVicina(false); setFoglio(true) }} disabilitato={!datiOk} />
      {!datiOk ? <Text style={[stili.nota, { color: c.testoSecondario }]}>{t('Conferma i dati per continuare.', 'Confirm your details to continue.')}</Text> : null}
      <Bottone testo={t('Indietro', 'Back')} variante="contorno" onPress={onIndietro} disabilitato={firmando} />

      <Foglio
        aperto={foglio}
        titolo={t('Il tuo contratto', 'Your contract')}
        sottotitolo={t('Leggilo, oppure vai subito alle dichiarazioni e alla firma.', 'Read it, or go straight to the declarations and the signature.')}
        onChiudi={() => !firmando && setFoglio(false)}
        scorrimento={scorrimentoFoglio}
        onScorri={scorriFoglio}
        flottante={
          !firmaVicina ? (
            <Tocco
              onPress={vaiAllaFirma}
              etichetta={t('Firma ora: vai alle dichiarazioni e alla firma', 'Sign now: go to the declarations and the signature')}
              scala={0.96}
              style={[stili.firmaOra, { backgroundColor: p.accento }]}
            >
              <Text style={{ color: '#fff', fontFamily: F.extra, fontSize: 15 }}>{t('Firma ora', 'Sign now')}</Text>
              <Icona nome="giu" size={18} colore="#fff" />
            </Tocco>
          ) : null
        }
      >
        <View style={{ gap: spazio.tre }} onLayout={(e) => (posti.current.corpo = e.nativeEvent.layout.y)}>
          <RiepilogoCosti importi={anteprima.importi} />
          <DocumentoContratto blocchi={anteprima.documento.blocchi} />

          <Text style={{ color: p.testo, fontFamily: F.extra, fontSize: 18, marginTop: spazio.tre }} onLayout={(e) => (posti.current.firma = e.nativeEvent.layout.y)}>
            {t('Dichiarazioni', 'Declarations')}
          </Text>
          {anteprima.consensi.some((k) => !k.obbligatorio) ? (
            <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 13, lineHeight: 18 }}>
              {t('Le dichiarazioni del contratto sono già spuntate. Puoi togliere solo quella facoltativa, per le comunicazioni.', 'The contract declarations are already ticked. You can only untick the optional one, for communications.')}
            </Text>
          ) : null}
          {anteprima.consensi.map((k) => (
            <Casella key={k.chiave} spuntata={!!consensi[k.chiave]} bloccata={k.obbligatorio} onCambia={() => setConsensi((v) => ({ ...v, [k.chiave]: !v[k.chiave] }))} etichetta={k.testo}>
              <Text style={{ color: p.testo, fontFamily: F.normale, fontSize: 13, lineHeight: 19 }}>
                {k.testo}
                {k.obbligatorio ? '' : t(' (facoltativo)', ' (optional)')}
              </Text>
            </Casella>
          ))}

          <Text style={{ color: p.testo, fontFamily: F.extra, fontSize: 18, marginTop: spazio.tre }}>
            {anteprima.firmatario === 'genitore' ? t('Firma del genitore', 'Parent’s signature') : t('La tua firma', 'Your signature')}
          </Text>
          <FirmaPad onCambia={setFirmaPng} />
          <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 12, lineHeight: 17 }}>
            {t('Firmando confermi di aver letto il contratto. Conserviamo la firma insieme a data, ora, indirizzo IP e dispositivo, come prova della sottoscrizione.', 'By signing you confirm you’ve read the contract. We keep the signature together with the date, time, IP address and device, as proof of signing.')}
          </Text>
          {erroreFirma ? <Avviso>{erroreFirma}</Avviso> : null}
          <Pulsante testo={t('Firma il contratto', 'Sign the contract')} icona="impronta" onPress={firma} inCorso={firmando} disabilitato={!obbligatoriOk || !firmaPng} />
          {!obbligatoriOk ? <Text style={[stili.nota, { color: p.testoSecondario }]}>{t('Spunta tutte le dichiarazioni obbligatorie per firmare.', 'Tick all the required declarations to sign.')}</Text> : null}
        </View>
      </Foglio>
    </>
  )
}

const stili = StyleSheet.create({
  giorni: { marginHorizontal: -spazio.tre, paddingHorizontal: spazio.tre },
  giorno: { paddingHorizontal: 16, minHeight: 44, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  nota: { fontSize: 13, lineHeight: 19 },
  scheda: { borderWidth: 1, borderRadius: 14, padding: spazio.tre, gap: spazio.tre },
  titoloScheda: { fontSize: 16, fontWeight: '700' },
  firmaOra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 22,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
})
