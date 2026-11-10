import { useState } from 'react'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { StyleSheet, Text, TextInput, View } from 'react-native'

import { pulsanteToccato, scriviAlTeam, type CanaleTicket } from '@/api/assistente'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { ALLEGATO_BYTE_MAX, FORMATI_ALLEGATI, pesoLeggibile, type Allegato } from '../feedback/comune'
import { preparaAllegato, scegliAllegati } from '../feedback/allegati'
import { Icona } from '../ui/Icona'
import { Messaggio, Pulsante } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { InvitoPushRichiesta } from '../assistenza/InvitoPush'
import { canaleRegistrato } from '../assistenza/richieste'
import { useStatoAssistente } from './store'
import { MESSAGGIO_TEAM_MAX, type ProponeTeam } from './teamDaChat'

// «Scrivi al team» nella chat (31/10/2026): un pulsante con la proposta dell'assistente e, toccandolo, una carta che dice **cosa arriva al team** (la conversazione con l'assistente e,
// se la persona vuole, due righe sue), con «Invia al team». **Niente parte da solo**: la conversazione va al team solo quando la persona preme Invia, e la carta lo dice prima.
// **Un allegato, facoltativo** (come nella chat del sito): una foto o un PDF fino a 5 MB, per esempio il certificato medico di una sospensione. Arriva al team nella pagina del ticket (non per email).
// **La risposta arriva sempre nell'app** (10/11/2026, richiesta di Maurizio: «non mettere come canale desiderato l'email, ma specifichi che riceverà la risposta direttamente in app»). Prima (08/11)
// la persona sceglieva fra app ed email; ora la carta dice solo dove la trova (nella sua richiesta, con una notifica, e puo' riscrivere) e non chiede niente. **Quello che si dice dopo l'invio
// e' il canale registrato dal server**: una funzione di prima ignora la richiesta e fa un ticket per email, e promettere l'app a chi riceve un'email sarebbe una promessa non mantenuta.
// **Dopo l'invio, senza push attive, compare l'invito ad attivarle** (`InvitoPushRichiesta`): la risposta e' nell'app, e senza la notifica la persona la vede solo riaprendola.
// Cosa dire sui tempi non lo decidiamo qui (non si promette niente). Il testo e il resto sono letti dal team: la carta invita a non scrivere dati sulla salute.

type Fase = 'chiusa' | 'scrive' | 'invio' | 'fatto'

export function ScriviAlTeam({ proposta, messaggioId, onVai }: { proposta: ProponeTeam; messaggioId: string | null; onVai: () => void }) {
  const p = usePalette()
  const { conversazioneId } = useStatoAssistente()
  const [fase, setFase] = useState<Fase>('chiusa')
  // Cosa ha registrato il server (dopo l'invio) e l'id della richiesta, per portare a leggerla.
  const [registrato, setRegistrato] = useState<{ canale: CanaleTicket; ticketId: string | null } | null>(null)
  const [testo, setTesto] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [allegato, setAllegato] = useState<Allegato | null>(null)
  const [inLettura, setInLettura] = useState(false)

  const invia = async () => {
    if (!conversazioneId || fase === 'invio') return
    setErrore(null)
    setFase('invio')
    const r = await scriviAlTeam(conversazioneId, testo.trim(), allegato)
    if (r.ok) {
      setRegistrato({ canale: canaleRegistrato('app', r.canale).canale, ticketId: r.ticketId })
      setFase('fatto')
      return
    }
    setErrore(r.errore)
    setFase('scrive')
  }

  if (fase === 'chiusa') {
    return (
      <Tocco
        etichetta={proposta.etichetta}
        onPress={() => {
          if (messaggioId) pulsanteToccato(messaggioId, 'scrivi-team')
          setFase('scrive')
        }}
        style={[stili.proposta, { backgroundColor: p.accento }]}
      >
        <Icona nome="email" size={15} colore="#fff" />
        <Text style={stili.propostaTesto} numberOfLines={2}>
          {proposta.etichetta}
        </Text>
      </Tocco>
    )
  }

  if (fase === 'fatto') {
    const inApp = registrato?.canale === 'app'
    return (
      <View style={{ gap: spazio.due, width: '100%', minWidth: 0 }}>
        <Messaggio tono="ok">
          {inApp
            ? t('Fatto: il team ha ricevuto la conversazione e ti risponde qui, nell’app. Ti avvisiamo con una notifica.', 'Done: the team has received the conversation and will reply here in the app. We’ll let you know with a notification.')
            : t('Fatto: il team ha ricevuto la conversazione e ti risponde via email.', 'Done: the team has received the conversation and will reply to you by email.')}
        </Messaggio>
        {inApp ? <InvitoPushRichiesta /> : null}
        {inApp && registrato?.ticketId ? (
          <Pulsante
            testo={t('Vedi la tua richiesta', 'See your request')}
            variante="contorno"
            piccolo
            pieno={false}
            icona="avanti"
            onPress={() => {
              onVai()
              router.navigate({ pathname: '/assistenza/[id]', params: { id: registrato.ticketId as string } })
            }}
          />
        ) : null}
      </View>
    )
  }

  const troppo = testo.length > MESSAGGIO_TEAM_MAX

  // Si sceglie un file solo: se la persona ne sceglie piu' d'uno insieme, vale il primo.
  const aggiungi = async () => {
    if (inLettura || fase === 'invio') return
    setErrore(null)
    const scelti = await scegliAllegati()
    if (!scelti.length) return
    setInLettura(true)
    const r = await preparaAllegato(scelti[0])
    setInLettura(false)
    if (r.ok) setAllegato(r.allegato)
    else setErrore(r.errore)
  }
  return (
    <View style={[stili.carta, { backgroundColor: p.carta, borderColor: p.linea }]}>
      <Text style={[stili.titolo, { color: p.testo }]}>{t('Cosa arriva al team', 'What the team receives')}</Text>
      <Text style={[stili.nota, { color: p.testoSecondario }]}>
        {t(
          'Questa conversazione con l’assistente e, se vuoi, due righe tue. Non scrivere dati sulla salute: li leggono persone del club.',
          'This conversation with the assistant and, if you like, a few lines from you. Don’t write health data: club staff read this.',
        )}
      </Text>
      <View style={[stili.dove, { backgroundColor: p.incavo }]}>
        <Icona nome="campanello" size={16} colore={p.accento} />
        <Text style={[stili.doveTesto, { color: p.testo }]}>
          {t(
            'Il team ti risponde qui, nell’app: ti avvisiamo con una notifica e leggi la risposta nella tua richiesta. Puoi anche rispondere.',
            'The team replies here, in the app: we’ll notify you and you’ll read the reply in your request. You can reply too.',
          )}
        </Text>
      </View>
      <TextInput
        value={testo}
        onChangeText={setTesto}
        placeholder={t('Vuoi aggiungere qualcosa? (facoltativo)', 'Anything to add? (optional)')}
        placeholderTextColor={p.testoTerzo}
        multiline
        maxLength={MESSAGGIO_TEAM_MAX + 200}
        editable={fase !== 'invio'}
        accessibilityLabel={t('Messaggio per il team', 'Message for the team')}
        style={[stili.campo, { color: p.testo, backgroundColor: p.incavo, borderColor: p.linea }]}
      />
      {allegato ? (
        <View style={[stili.allegato, { backgroundColor: p.incavo }]}>
          {allegato.anteprima ? (
            <Image source={{ uri: allegato.anteprima }} style={stili.miniatura} contentFit="cover" accessibilityLabel="" />
          ) : (
            <View style={[stili.miniatura, { alignItems: 'center', justifyContent: 'center', backgroundColor: p.carta }]}>
              <Icona nome="documento" size={20} colore={p.accento} />
            </View>
          )}
          <View style={{ flex: 1, gap: 1, minWidth: 0 }}>
            <Text style={[stili.forte, { color: p.testo }]} numberOfLines={1}>
              {allegato.nome}
            </Text>
            <Text style={[stili.nota, { color: p.testoSecondario }]}>
              {allegato.tipo === 'application/pdf' ? 'PDF' : allegato.tipo === 'image/png' ? 'PNG' : allegato.tipo === 'image/webp' ? 'WebP' : 'JPG'} · {pesoLeggibile(allegato.byte)}
            </Text>
          </View>
          <Tocco onPress={() => setAllegato(null)} etichetta={t(`Togli l’allegato ${allegato.nome}`, `Remove attachment ${allegato.nome}`)} style={[stili.togli, { backgroundColor: p.carta }]} spento={fase === 'invio'}>
            <Icona nome="cestino" size={17} colore={p.testoSecondario} />
          </Tocco>
        </View>
      ) : (
        <Pulsante
          testo={inLettura ? t('Preparo il file…', 'Preparing the file…') : t('Allega una foto o un PDF', 'Attach a photo or a PDF')}
          variante="contorno"
          icona="galleria"
          piccolo
          pieno={false}
          inCorso={inLettura}
          disabilitato={fase === 'invio'}
          onPress={aggiungi}
        />
      )}
      <Text style={[stili.nota, { color: p.testoTerzo }]}>
        {t(`Facoltativo: un solo file (${FORMATI_ALLEGATI}), ${ALLEGATO_BYTE_MAX / 1024 / 1024} MB al massimo. Arriva al team solo con «Invia al team», e non per email. Se mostra dati sulla salute (per esempio un certificato) lo leggono persone del club.`, `Optional: one file only (${FORMATI_ALLEGATI}), ${ALLEGATO_BYTE_MAX / 1024 / 1024} MB at most. It reaches the team only when you tap “Send to the team”, and not by email. If it shows health data (for example a certificate), club staff will read it.`)}
      </Text>
      {troppo ? <Text style={[stili.nota, { color: p.errore }]}>{t(`Al massimo ${MESSAGGIO_TEAM_MAX} caratteri.`, `At most ${MESSAGGIO_TEAM_MAX} characters.`)}</Text> : null}
      {errore ? <Messaggio>{errore}</Messaggio> : null}
      <Pulsante
        testo={t('Invia al team', 'Send to the team')}
        icona="invia"
        piccolo
        pieno={false}
        inCorso={fase === 'invio'}
        disabilitato={!conversazioneId || troppo}
        onPress={invia}
      />
    </View>
  )
}

const stili = StyleSheet.create({
  proposta: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, alignSelf: 'flex-start', maxWidth: '100%' },
  propostaTesto: { fontFamily: F.semi, fontSize: 14, color: '#fff', flexShrink: 1 },
  dove: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 12 },
  doveTesto: { flex: 1, minWidth: 0, fontFamily: F.semi, fontSize: 13.5, lineHeight: 19 },
  carta: { width: '100%', minWidth: 0, gap: 10, padding: 14, borderRadius: 16, borderWidth: 1 },
  titolo: { fontFamily: F.semi, fontSize: 15 },
  nota: { fontFamily: F.medio, fontSize: 13, lineHeight: 18 },
  allegato: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 12 },
  miniatura: { width: 44, height: 44, borderRadius: 8 },
  forte: { fontFamily: F.semi, fontSize: 14 },
  togli: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  campo: { minHeight: 84, maxHeight: 180, padding: 12, borderRadius: 12, borderWidth: 1, fontFamily: F.medio, fontSize: 15, textAlignVertical: 'top' },
})
