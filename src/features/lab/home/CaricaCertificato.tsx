import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { caricaCertificato } from '@/api/certificati'
import type { PersonaArea } from '@/api/lab'
import { useCarica } from '@/features/certificato/useCarica'
import { CERTIFICATO_ISTRUZIONI, FORMATI_CERTIFICATO } from '@/lib/certificatoIstruzioni'
import { MAX_BYTE, MAX_FILE, pesoLeggibile, type FileScelto, type FonteCertificato } from '@/lib/fileCertificato'
import { spazio } from '@/theme'
import { t } from '@/lib/lingua'

import { scorda } from '../memoria'
import { Foglio } from '../ui/Foglio'
import { Icona } from '../ui/Icona'
import { Messaggio, Pulsante } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { nome } from './certificato'
import { ConfermaPersona } from './ConfermaPersona'

// Il foglio che sale dalla sezione Certificato quando manca, e' scaduto o va consegnato
// (17/10/2026): spiega quale certificato serve e lo fa caricare, come foto o come PDF.
//
// **Due passi** (10/11/2026). Prima «per chi e'?» (`ConfermaPersona`): il nome in grande, la spunta «confermo che
// e' di Tizio» e, se non e' lui, la scelta di un'altra persona del nucleo; un genitore aveva caricato sul proprio
// profilo il certificato del figlio. Poi il caricamento, con «Cambia persona» che torna al primo passo senza perdere
// i file scelti. **Fino a tre file**: il certificato e, se l'ECG sta su un foglio a parte, anche quello.
// Il file va nel bucket privato, il desk riceve un'email col file e per la persona il
// certificato resta «in verifica» finche' la segreteria non lo approva (con le date) o lo
// rifiuta (col motivo, per email). Qui non si scrive niente su PerfectGym.

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

/** Un file scelto, con il suo peso, e il comando per toglierlo. */
function FileInviato({ file, onTogli }: { file: FileScelto; onTogli: () => void }) {
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
      <Pulsante testo={t('Togli', 'Remove')} variante="fantasma" piccolo pieno={false} onPress={onTogli} />
    </View>
  )
}

export function FoglioCertificato({
  aperto,
  persona,
  persone,
  onChiudi,
  onCaricato,
}: {
  aperto: boolean
  /** La persona da cui si e' partiti (la riga toccata); si puo' cambiare nel primo passo. */
  persona: PersonaArea | null
  /** Tutto il nucleo: da qui si sceglie un'altra persona se il certificato non e' di quella da cui si e' partiti. */
  persone?: PersonaArea[]
  onChiudi: () => void
  /** Il certificato e' arrivato: la Home si rilegge e mostra «in verifica». */
  onCaricato: () => void
}) {
  const p = usePalette()
  // Per chi si carica: quella da cui si parte, finche' non se ne sceglie un'altra. Il passo «confermo che e' di Tizio» viene prima di tutto,
  // e si ripete a ogni cambio di persona: la spunta e' di una persona sola.
  const [scelta, setScelta] = useState<PersonaArea | null>(null)
  /** La spunta «confermo che e' di Tizio»: da sola non cambia schermata, la cambia «Continua». */
  const [spunta, setSpunta] = useState(false)
  /** Passato il primo passo: si caricano i file. */
  const [confermato, setConfermato] = useState(false)
  const [aggiungendo, setAggiungendo] = useState(false)
  const chi = scelta ?? persona
  const memberId = chi?.member_id ?? null
  // Ogni apertura riparte dal primo passo: il foglio e' uno solo e si apre su righe diverse.
  useEffect(() => {
    if (!aperto) return
    setScelta(null)
    setSpunta(false)
    setConfermato(false)
    setAggiungendo(false)
  }, [aperto, persona?.member_id])
  const invia = useCallback(
    async (f: FileScelto[]) => {
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
    setTimeout(c.ricomincia, 250)
  }
  // Un file aggiunto chiude le tre strade: per un altro si preme di nuovo «Aggiungi un altro file». Se non e' stato aggiunto
  // niente (selettore chiuso, doppione, file troppo pesante) restano aperte, e si riprova subito.
  const aggiungi = async (fonte: FonteCertificato) => {
    if (await c.scegli(fonte)) setAggiungendo(false)
  }
  const nucleo = persone && persone.length ? persone : persona ? [persona] : []
  const passoConferma = Boolean(chi) && !confermato && !c.fatto
  const mostraFonti = c.files.length === 0 || aggiungendo

  return (
    <Foglio
      aperto={aperto}
      titolo={c.fatto ? t('Certificato ricevuto', 'Certificate received') : passoConferma ? t('Per chi è il certificato?', 'Who is the certificate for?') : t('Carica il certificato', 'Upload certificate')}
      sottotitolo={chi && !passoConferma ? (chi.titolare ? t('Per te', 'For you') : t(`Per ${nome(chi)}`, `For ${nome(chi)}`)) : undefined}
      onChiudi={chiudi}
    >
      {c.fatto ? (
        <>
          <Messaggio tono="ok" titolo={t('Lo stiamo controllando', 'We’re checking it')}>
            {t('Appena la segreteria l’avrà verificato lo vedrai valido in questa sezione. Se qualcosa non va, ti scriviamo il motivo per email.', 'As soon as the front desk has checked it, you’ll see it as valid in this section. If something is wrong, we’ll email you the reason.')}
          </Messaggio>
          {c.mancanti ? (
            <Messaggio tono="attenzione" titolo={t('Non tutti i file sono arrivati', 'Not all the files arrived')}>
              {t('Abbiamo ricevuto il certificato ma non gli altri file. Scrivici da «Richiedi assistenza» e te li facciamo aggiungere.', 'We received the certificate but not the other files. Write to us from “Request assistance” and we’ll have them added.')}
            </Messaggio>
          ) : null}
          <Pulsante testo={t('Chiudi', 'Close')} onPress={chiudi} />
        </>
      ) : passoConferma && chi ? (
        <ConfermaPersona
          persona={chi}
          altre={nucleo.filter((x) => x.member_id !== chi.member_id)}
          spuntato={spunta}
          onSpunta={() => setSpunta((v) => !v)}
          onContinua={() => setConfermato(true)}
          onScegli={(altra) => {
            setScelta(altra)
            setSpunta(false)
            setConfermato(false)
          }}
        />
      ) : (
        <>
          {/* Di chi e' resta in vista, con la via di ritorno: «ah no, e' di un altro» riporta al primo passo e tiene i file scelti. */}
          {chi ? (
            <View style={[stili.perChi, { backgroundColor: p.incavo }]}>
              <View style={{ flex: 1, gap: 1 }}>
                <Text style={[stili.nota, { color: p.testoSecondario }]}>{t('Stai caricando il certificato di', 'You’re uploading the certificate for')}</Text>
                <Text style={[stili.forte, { color: p.testo }]} numberOfLines={1}>
                  {nome(chi)}
                </Text>
              </View>
              <Pulsante testo={t('Cambia persona', 'Change person')} variante="fantasma" piccolo pieno={false} onPress={() => {
                  setSpunta(false)
                  setConfermato(false)
                }}
              />
            </View>
          ) : null}

          <IstruzioniCertificato />

          {c.files.map((f, i) => (
            <FileInviato key={`${f.nome}-${f.byte}-${i}`} file={f} onTogli={() => c.togli(i)} />
          ))}

          {mostraFonti ? (
            <View style={{ gap: spazio.due }}>
              {/* Le stesse tre strade dei piani di allenamento: fotocamera, galleria, documenti. */}
              <Pulsante testo={c.inLettura ? t('Preparo il file…', 'Preparing the file…') : t('Scatta una foto', 'Take a photo')} icona="fotocamera" inCorso={c.inLettura} onPress={() => aggiungi('fotocamera')} />
              <Pulsante testo={t('Scegli dalla galleria', 'Choose from your photos')} variante="contorno" icona="galleria" disabilitato={c.inLettura} onPress={() => aggiungi('galleria')} />
              <Pulsante testo={t('Scegli un documento (PDF)', 'Choose a document (PDF)')} variante="contorno" icona="documento" disabilitato={c.inLettura} onPress={() => aggiungi('documenti')} />
            </View>
          ) : c.puoAggiungere ? (
            <Pulsante testo={t('Aggiungi un altro file (ad esempio l’ECG)', 'Add another file (for example the ECG)')} variante="contorno" icona="aggiungi" onPress={() => setAggiungendo(true)} />
          ) : null}
          <Text style={[stili.nota, { color: p.testoTerzo }]}>
            {FORMATI_CERTIFICATO}
            {t(
              `, fino a ${MAX_FILE} file e ${MAX_BYTE / 1024 / 1024} MB in tutto. L’ECG è su un foglio a parte? Aggiungilo qui, insieme al certificato. Se scatti una foto, controlla che si legga tutta la pagina. I file li vede solo la segreteria.`,
              `, up to ${MAX_FILE} files and ${MAX_BYTE / 1024 / 1024} MB in total. Is the ECG on a separate sheet? Add it here, together with the certificate. If you take a photo, check that the whole page is readable. Only the front desk sees the files.`,
            )}
          </Text>

          {c.errore ? <Messaggio tono="errore">{c.errore}</Messaggio> : null}

          <Pulsante
            testo={c.files.length > 1 ? t('Invia i file', 'Send the files') : t('Invia il certificato', 'Send the certificate')}
            icona="invia"
            inCorso={c.inCorso}
            disabilitato={c.files.length === 0 || c.inLettura}
            onPress={c.spedisci}
          />
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
  perChi: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, borderRadius: 16, paddingVertical: spazio.due, paddingLeft: spazio.tre, paddingRight: spazio.uno },
})
