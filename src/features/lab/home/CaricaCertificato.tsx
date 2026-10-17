import { useCallback } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { caricaCertificato } from '@/api/certificati'
import type { PersonaArea } from '@/api/lab'
import { useCarica } from '@/features/certificato/useCarica'
import { CERTIFICATO_ISTRUZIONI, FORMATI_CERTIFICATO } from '@/lib/certificatoIstruzioni'
import { MAX_BYTE, pesoLeggibile, type FileScelto } from '@/lib/fileCertificato'
import { spazio } from '@/theme'

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
      <Pulsante testo="Cambia" variante="fantasma" piccolo pieno={false} onPress={onCambia} />
    </View>
  )
}

export function FoglioCertificato({
  aperto,
  persona,
  onChiudi,
  onCaricato,
}: {
  aperto: boolean
  persona: PersonaArea | null
  onChiudi: () => void
  /** Il certificato e' arrivato: la Home si rilegge e mostra «in verifica». */
  onCaricato: () => void
}) {
  const p = usePalette()
  const memberId = persona?.member_id ?? null
  const invia = useCallback(
    async (f: FileScelto) => {
      if (memberId == null) return { ok: false as const, errore: 'Non troviamo la persona a cui carichi il certificato.' }
      const esito = await caricaCertificato(memberId, f)
      if (esito.ok) onCaricato()
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

  return (
    <Foglio
      aperto={aperto}
      titolo={c.fatto ? 'Certificato ricevuto' : 'Carica il certificato'}
      sottotitolo={persona ? (persona.titolare ? 'Per te' : `Per ${nome(persona)}`) : undefined}
      onChiudi={chiudi}
    >
      {c.fatto ? (
        <>
          <Messaggio tono="ok" titolo="Lo stiamo controllando">
            Appena la segreteria l’avrà verificato lo vedrai valido in questa sezione. Se qualcosa non va, ti scriviamo il motivo per email.
          </Messaggio>
          <Pulsante testo="Chiudi" onPress={chiudi} />
        </>
      ) : (
        <>
          <IstruzioniCertificato />

          {c.file ? (
            <FileInviato file={c.file} onCambia={c.scegli} />
          ) : (
            <Pulsante
              testo={c.inLettura ? 'Preparo il file…' : `Scegli la foto o il PDF`}
              variante="contorno"
              icona="condividi"
              inCorso={c.inLettura}
              onPress={c.scegli}
            />
          )}
          <Text style={[stili.nota, { color: p.testoTerzo }]}>
            {FORMATI_CERTIFICATO}, fino a {MAX_BYTE / 1024 / 1024} MB. Se scatti una foto, controlla che si legga tutta la pagina. Il file lo vede solo la
            segreteria.
          </Text>

          {c.errore ? <Messaggio tono="errore">{c.errore}</Messaggio> : null}

          <Pulsante testo="Invia il certificato" icona="invia" inCorso={c.inCorso} disabilitato={!c.file || c.inLettura} onPress={c.spedisci} />
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
})
