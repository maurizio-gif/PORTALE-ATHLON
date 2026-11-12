import { useCallback, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { caricaCertificato } from '@/api/certificati'
import type { PersonaArea } from '@/api/lab'
import { useCarica } from '@/features/certificato/useCarica'
import { CERTIFICATO_ISTRUZIONI, FORMATI_CERTIFICATO } from '@/lib/certificatoIstruzioni'
import { MAX_BYTE, pesoLeggibile, type FileScelto } from '@/lib/fileCertificato'
import { dataBreve } from '@/lib/metodoPagamento'
import { spazio } from '@/theme'
import { t } from '@/lib/lingua'

import { scorda } from '../memoria'
import { Foglio } from '../ui/Foglio'
import { Icona } from '../ui/Icona'
import { Messaggio, Pulsante } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { nome } from './certificato'

// Il foglio che sale dalla sezione Certificato quando manca, e' scaduto o va consegnato
// (17/10/2026): spiega quale certificato serve e lo fa caricare, come foto o come PDF.
// Il file va nel bucket privato, il desk riceve un'email col file e per la persona il
// certificato resta «in verifica» finche' la segreteria non lo approva (con le date) o lo
// rifiuta (col motivo, per email). Qui non si scrive niente su PerfectGym.
//
// **La conferma della persona** (12/11/2026, richiesta del club: «succede spesso che il genitore carichi il
// certificato sulla propria anagrafica invece che su quella del figlio»): «Invia il certificato» non invia,
// apre un passo che dice per chi si sta caricando, con nome, cognome e data di nascita, e chiede di
// confermarlo. Da li' si puo' passare a un'altra persona del nucleo senza scegliere di nuovo il file.

/** Quale certificato serve: le stesse parole del fumetto «i» e delle email del club. */
export function IstruzioniCertificato() {
  const p = usePalette()
  const i = CERTIFICATO_ISTRUZIONI
  return (
    <View style={[stili.istruzioni, { backgroundColor: p.incavo }]}>
      <Text style={[stili.titolo, { color: p.testo }]}>{i.titolo}</Text>
      <Text style={[stili.forte, { color: p.testo }]}>{i.tipo}</Text>
      <Text style={[stili.testo, { color: p.testoSecondario }]}>{i.escluso}</Text>
      <Text style={[stili.testo, { color: p.testoSecondario }]}>{i.ecg}</Text>
      <Text style={[stili.forte, { color: p.testo }]}>{i.chiTitolo}</Text>
      {i.chi.map((c) => (
        <View key={c} style={stili.voce}>
          <View style={[stili.punto, { backgroundColor: p.accento }]} />
          <Text style={[stili.testo, { color: p.testoSecondario, flex: 1 }]}>{c}</Text>
        </View>
      ))}
      <Text style={[stili.testo, { color: p.testoSecondario }]}>{i.bambini}</Text>
      {i.note.map((n) => (
        <Text key={n} style={[stili.nota, { color: p.testoTerzo }]}>
          {n}
        </Text>
      ))}
    </View>
  )
}

/** Il file scelto, con il suo peso, e il comando per cambiarlo. */
function FileInviato({ file, onCambia }: { file: FileScelto; onCambia: () => void }) {
  const p = usePalette()
  return (
    <View style={[stili.file, { backgroundColor: p.incavo }]}>
      <Icona nome="documento" size={20} colore={p.accento} />
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={[stili.forte, { color: p.testo }]} numberOfLines={1}>
          {file.nome}
        </Text>
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          {file.tipo === 'application/pdf' ? 'PDF' : file.tipo === 'image/png' ? 'PNG' : 'JPG'} · {pesoLeggibile(file.byte)}
        </Text>
      </View>
      <Pulsante testo={t('Cambia', 'Change')} variante="fantasma" piccolo pieno={false} onPress={onCambia} />
    </View>
  )
}

/** «nato/a il 12/03/2015», come nella sezione Famiglia (PerfectGym non ci dice il sesso in modo affidabile). */
function nascita(x: PersonaArea): string | null {
  const d = dataBreve(x.data_nascita)
  return d ? t(`nato/a il ${d}`, `born ${d}`) : null
}

/** Il passo di conferma: per chi si carica, e le altre persone del nucleo se e' per qualcun altro. */
function ConfermaPersona({
  chi,
  altre,
  inCorso,
  errore,
  onConferma,
  onAltra,
  onIndietro,
}: {
  chi: PersonaArea
  altre: PersonaArea[]
  inCorso: boolean
  errore: string | null
  onConferma: () => void
  onAltra: (x: PersonaArea) => void
  onIndietro: () => void
}) {
  const p = usePalette()
  const n = nome(chi)
  const nata = nascita(chi)
  return (
    <>
      <Text style={[stili.testo, { color: p.testoSecondario }]}>
        {t('Stai caricando il certificato medico per:', 'You’re uploading the medical certificate for:')}
      </Text>
      <View style={[stili.persona, { backgroundColor: p.incavo, borderColor: p.accento }]}>
        <Icona nome="certificato" size={22} colore={p.accento} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[stili.nomePersona, { color: p.testo }]}>{n}</Text>
          {nata ? <Text style={[stili.forte, { color: p.testo }]}>{nata}</Text> : null}
          {chi.titolare ? <Text style={[stili.nota, { color: p.testoSecondario }]}>{t('Sei tu, il titolare dell’account', 'That’s you, the account holder')}</Text> : null}
        </View>
      </View>
      <Text style={[stili.testo, { color: p.testoSecondario }]}>
        {t(
          'Il certificato viene registrato sulla scheda di questa persona. Controlla che nome e data di nascita siano quelli scritti sul certificato.',
          'The certificate is filed on this person’s record. Check that the name and date of birth match the ones on the certificate.',
        )}
      </Text>

      {errore ? <Messaggio tono="errore">{errore}</Messaggio> : null}

      <Pulsante testo={t(`Sì, carica per ${n}`, `Yes, upload for ${n}`)} icona="invia" inCorso={inCorso} onPress={onConferma} />

      {altre.length ? (
        <View style={{ gap: spazio.due }}>
          <Text style={[stili.forte, { color: p.testo }]}>
            {chi.titolare
              ? t('È il certificato di un familiare? Sceglilo qui:', 'Is it a family member’s certificate? Choose them here:')
              : t('È per un’altra persona? Sceglila qui:', 'Is it for someone else? Choose them here:')}
          </Text>
          {altre.map((x) => (
            <Pulsante
              key={x.member_id}
              testo={[x.titolare ? t(`${nome(x)} (tu)`, `${nome(x)} (you)`) : nome(x), nascita(x)].filter(Boolean).join(' · ')}
              variante="contorno"
              disabilitato={inCorso}
              onPress={() => onAltra(x)}
            />
          ))}
        </View>
      ) : null}

      <Pulsante testo={t('Indietro', 'Back')} variante="fantasma" disabilitato={inCorso} onPress={onIndietro} />
    </>
  )
}

export function FoglioCertificato({
  aperto,
  persona,
  nucleo = [],
  onChiudi,
  onCaricato,
}: {
  aperto: boolean
  persona: PersonaArea | null
  /** Le persone del nucleo: nel passo di conferma si puo' passare a un'altra senza ricominciare. */
  nucleo?: PersonaArea[]
  onChiudi: () => void
  /** Il certificato e' arrivato: la Home si rilegge e mostra «in verifica». */
  onCaricato: () => void
}) {
  const p = usePalette()
  // La persona cambiata nel passo di conferma; finche' non si cambia vale quella con cui il foglio si e' aperto.
  const [scelta, setScelta] = useState<PersonaArea | null>(null)
  const [conferma, setConferma] = useState(false)
  const chi = scelta ?? persona
  const memberId = chi?.member_id ?? null
  const invia = useCallback(
    async (f: FileScelto) => {
      if (memberId == null) return { ok: false as const, errore: t('Non troviamo la persona a cui carichi il certificato.', 'We can’t find the person you’re uploading the certificate for.') }
      const esito = await caricaCertificato(memberId, f)
      if (esito.ok) {
        // La mia area in memoria ha ancora il certificato di prima (e potrebbe essere fresca): si butta, cosi' la Home la rilegge.
        scorda('area')
        onCaricato()
      }
      return esito
    },
    [memberId, onCaricato],
  )
  const c = useCarica(invia)
  const chiudi = () => {
    onChiudi()
    // Alla chiusura il foglio torna com'era: la prossima persona non trova il file di quella prima.
    setTimeout(() => {
      c.ricomincia()
      setScelta(null)
      setConferma(false)
    }, 250)
  }
  const altre = chi ? nucleo.filter((x) => x.member_id !== chi.member_id) : []

  return (
    <Foglio
      aperto={aperto}
      titolo={c.fatto ? t('Certificato ricevuto', 'Certificate received') : conferma ? t('Per chi è il certificato?', 'Who is the certificate for?') : t('Carica il certificato', 'Upload certificate')}
      sottotitolo={chi ? (chi.titolare ? t(`Per te, ${nome(chi)}`, `For you, ${nome(chi)}`) : t(`Per ${nome(chi)}`, `For ${nome(chi)}`)) : undefined}
      onChiudi={chiudi}
    >
      {c.fatto ? (
        <>
          <Messaggio tono="ok" titolo={t('Lo stiamo controllando', 'We’re checking it')}>
            {t('Appena la segreteria l’avrà verificato lo vedrai valido in questa sezione. Se qualcosa non va, ti scriviamo il motivo per email.', 'As soon as the front desk has checked it, you’ll see it as valid in this section. If something is wrong, we’ll email you the reason.')}
          </Messaggio>
          <Pulsante testo={t('Chiudi', 'Close')} onPress={chiudi} />
        </>
      ) : conferma && chi && c.file ? (
        <ConfermaPersona chi={chi} altre={altre} inCorso={c.inCorso} errore={c.errore} onConferma={c.spedisci} onAltra={setScelta} onIndietro={() => setConferma(false)} />
      ) : (
        <>
          <IstruzioniCertificato />

          {c.file ? (
            <FileInviato file={c.file} onCambia={c.ricomincia} />
          ) : (
            <View style={{ gap: spazio.due }}>
              {/* Le stesse tre strade dei piani di allenamento: fotocamera, galleria, documenti. */}
              <Pulsante testo={c.inLettura ? t('Preparo il file…', 'Preparing the file…') : t('Scatta una foto', 'Take a photo')} icona="fotocamera" inCorso={c.inLettura} onPress={() => c.scegli('fotocamera')} />
              <Pulsante testo={t('Scegli dalla galleria', 'Choose from your photos')} variante="contorno" icona="galleria" disabilitato={c.inLettura} onPress={() => c.scegli('galleria')} />
              <Pulsante testo={t('Scegli un documento (PDF)', 'Choose a document (PDF)')} variante="contorno" icona="documento" disabilitato={c.inLettura} onPress={() => c.scegli('documenti')} />
            </View>
          )}
          <Text style={[stili.nota, { color: p.testoTerzo }]}>
            {FORMATI_CERTIFICATO}
            {t(
              `, fino a ${MAX_BYTE / 1024 / 1024} MB. Se scatti una foto, controlla che si legga tutta la pagina. Il file lo vede solo la segreteria.`,
              `, up to ${MAX_BYTE / 1024 / 1024} MB. If you take a photo, check that the whole page is readable. Only the front desk sees the file.`,
            )}
          </Text>

          {c.errore ? <Messaggio tono="errore">{c.errore}</Messaggio> : null}

          {/* Non invia ancora: prima si conferma per chi (il genitore che lo carica su di se' invece che sul figlio). */}
          <Pulsante testo={t('Continua', 'Continue')} icona="avanti" disabilitato={!c.file || c.inLettura || !chi} onPress={() => setConferma(true)} />
        </>
      )}
    </Foglio>
  )
}

const stili = StyleSheet.create({
  istruzioni: { borderRadius: 18, padding: spazio.tre, gap: 8 },
  titolo: { fontFamily: F.extra, fontSize: 16, letterSpacing: -0.3 },
  forte: { fontFamily: F.semi, fontSize: 14.5, lineHeight: 20 },
  testo: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  nota: { fontFamily: F.medio, fontSize: 12.5, lineHeight: 18 },
  voce: { flexDirection: 'row', gap: 8, paddingLeft: 4 },
  punto: { width: 5, height: 5, borderRadius: 3, marginTop: 8 },
  file: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, borderRadius: 16, padding: spazio.tre },
  persona: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, borderRadius: 18, borderWidth: 1.5, padding: spazio.tre },
  nomePersona: { fontFamily: F.extra, fontSize: 19, lineHeight: 24, letterSpacing: -0.3 },
})
