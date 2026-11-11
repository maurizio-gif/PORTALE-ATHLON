import { useEffect } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { conPulsante, segna, type NotificaApp } from '@/api/notifiche'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { Icona } from '../ui/Icona'
import { Messaggio, Pulsante } from '../ui/kit'
import { F, FUOCO, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { apriDestinazione } from './apri'
import { invitoPush, leggiRimandoPush } from './invitoPush'
import { useAppenaAttivate, usePush } from './push'
import { chiudiFinestra, finestraComparsa } from './store'

// La finestra che compare nell'app appena il club manda una notifica (20/10/2026). Una alla volta, dalla piu' recente.
//
// **Quello che la persona fa dice al club com'e' andata**: la finestra che compare e' `vista` (lo dice subito); il pulsante e'
// `azione` e `aperta`; «Ok, letto» su una notifica senza pulsante e' `aperta`; chiudere con la X la lascia solo `vista`:
// resta fra le non lette del centro notifiche, perche' chi chiude non ha letto per forza. Il testo non e' mai tagliato.
//
// **Sotto, se la push e' spenta, una riga per attivarla** (25/10/2026, richiesta di Maurizio: «promuovi di piu l'attivazione delle
// push»): e' il momento giusto, la persona ha appena visto una notifica del club arrivare. Vale lo stesso rimando di tre giorni
// della carta in Home (`invitoPush`): chi ha detto «non ora» non se la ritrova qui.
//
// **Il pulsante «attiva le notifiche» dentro la notifica** (11/11/2026, richiesta di Maurizio: «il pulsante proprio nella notifica,
// attiva push qui»): una notifica con destinazione `attiva-notifiche` ha come pulsante l'attivazione stessa. Con la push spenta il
// tocco chiede il permesso e la attiva, e la finestra resta aperta a dire «Notifiche attivate» (poi «Ok, letto»); con la push gia'
// attiva, o dove non si puo' (browser senza push, app senza la chiave del servizio) non c'e' pulsante e resta «Ok, letto»; bloccate
// o iPhone dal web il tocco porta al centro notifiche, che spiega come sbloccarle. La riga «Vuoi riceverle…» non si ripete.

const STATI_CON_INVITO = ['spento', 'bloccato', 'serve_app_installata'] as const

export function FinestraNotifica({ notifica: n }: { notifica: NotificaApp }) {
  const p = usePalette()
  const ins = useSafeAreaInsets()
  const push = usePush()
  const attivaQui = n.destinazione === 'attiva-notifiche'
  const inVerifica = attivaQui && push.stato === 'verifica'
  const pulsante = conPulsante(n) && (!attivaQui || inVerifica || STATI_CON_INVITO.some((s) => s === push.stato))

  // Comparsa: una volta sola per notifica, anche se il componente si rimonta.
  useEffect(() => {
    finestraComparsa(n)
  }, [n])

  function chiudi() {
    chiudiFinestra(n.id)
  }

  function premi() {
    segna(n.id, 'azione', 'finestra')
    if (attivaQui && push.stato === 'spento') {
      // Il permesso va chiesto dentro il tocco: `attiva` parte subito, prima di ogni attesa. La finestra resta aperta: dice «fatto».
      void push.attiva()
      return
    }
    chiudiFinestra(n.id, true)
    apriDestinazione(n)
  }

  function letto() {
    segna(n.id, 'aperta', 'finestra')
    chiudiFinestra(n.id, true)
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={chiudi} statusBarTranslucent>
      <View style={[stili.velo, { paddingTop: ins.top + spazio.tre, paddingBottom: ins.bottom + spazio.tre }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={chiudi} accessibilityLabel={t('Chiudi', 'Close')} />
        <View style={[stili.carta, { backgroundColor: p.carta, borderColor: p.linea, boxShadow: p.ombra }]} accessibilityViewIsModal accessibilityLiveRegion="polite">
          <View style={stili.testa}>
            <View style={[stili.bollino, { backgroundColor: FUOCO[1] }]}>
              <Icona nome="campanello" size={20} colore="#fff" />
            </View>
            <Text style={[stili.sopra, { color: p.accento }]} numberOfLines={1}>
              {n.per?.nome ? t(`ATHLON CLUB · PER ${n.per.nome.toUpperCase()}`, `ATHLON CLUB · FOR ${n.per.nome.toUpperCase()}`) : 'ATHLON CLUB'}
            </Text>
            <Tocco onPress={chiudi} etichetta={t('Chiudi', 'Close')} style={[stili.chiudi, { backgroundColor: p.incavo }]}>
              <Icona nome="chiudi" size={16} colore={p.testo} />
            </Tocco>
          </View>
          <Text style={[stili.titolo, { color: p.testo }]} accessibilityRole="header">
            {n.titolo}
          </Text>
          <Text style={[stili.testo, { color: p.testoSecondario }]} selectable>
            {n.testo}
          </Text>
          <OffertaPush senzaInvito={attivaQui} />
          {attivaQui && push.errore ? <Messaggio tono="errore">{push.errore}</Messaggio> : null}
          <View style={{ gap: spazio.due, marginTop: spazio.due }}>
            {pulsante ? (
              <>
                <Pulsante testo={n.etichetta ?? t('Apri', 'Open')} icona={attivaQui ? 'campanello' : 'avanti'} inCorso={attivaQui && (push.occupato || inVerifica)} onPress={premi} />
                <Pulsante testo={t('Chiudi', 'Close')} variante="fantasma" onPress={chiudi} />
              </>
            ) : (
              <Pulsante testo={t('Ok, letto', 'OK, got it')} icona="spunta" onPress={letto} />
            )}
          </View>
        </View>
      </View>
    </Modal>
  )
}

/** «Vuoi riceverle anche con l'app chiusa?»: solo con la push spenta e non rimandata; dopo il tocco dice «fatto» per qualche secondo. */
function OffertaPush({ senzaInvito = false }: { senzaInvito?: boolean }) {
  const p = usePalette()
  const { stato, occupato, attiva } = usePush()
  const fatta = useAppenaAttivate(stato)
  if (fatta) {
    return (
      <View style={[stili.offerta, { backgroundColor: p.incavo }]}>
        <Icona nome="spunta" size={18} colore={p.ok} />
        <Text style={[stili.offertaTesto, { color: p.testo }]}>{t('Notifiche attivate: ti avvisiamo subito, anche con l’app chiusa.', 'Notifications on: we’ll alert you right away, even with the app closed.')}</Text>
      </View>
    )
  }
  // Una notifica che ha gia' il suo pulsante «attiva» non ripete l'invito qui sotto: resta solo il «fatto».
  if (senzaInvito || invitoPush(stato, leggiRimandoPush(), Date.now()) !== 'attiva') return null
  return (
    <View style={[stili.offerta, { backgroundColor: p.incavo }]}>
      <Icona nome="campanello" size={18} colore={p.accento} />
      <Text style={[stili.offertaTesto, { color: p.testo }]}>{t('Vuoi riceverle anche con l’app chiusa?', 'Want to get them even with the app closed?')}</Text>
      <Pulsante testo={t('Attiva', 'Turn on')} piccolo pieno={false} inCorso={occupato} onPress={() => void attiva()} />
    </View>
  )
}

const stili = StyleSheet.create({
  velo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: spazio.tre },
  carta: { width: '100%', maxWidth: 440, borderRadius: 30, borderWidth: 1, padding: spazio.quattro - 2, gap: spazio.tre },
  testa: { flexDirection: 'row', alignItems: 'center', gap: spazio.due + 2 },
  bollino: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sopra: { flex: 1, fontFamily: F.extra, fontSize: 11.5, letterSpacing: 1.2 },
  chiudi: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  titolo: { fontFamily: F.extra, fontSize: 24, lineHeight: 29, letterSpacing: -0.7 },
  testo: { fontFamily: F.medio, fontSize: 16, lineHeight: 23 },
  offerta: { flexDirection: 'row', alignItems: 'center', gap: spazio.due + 2, borderRadius: 18, paddingVertical: spazio.due + 2, paddingHorizontal: spazio.tre },
  offertaTesto: { flex: 1, fontFamily: F.bold, fontSize: 13.5, lineHeight: 18 },
})
