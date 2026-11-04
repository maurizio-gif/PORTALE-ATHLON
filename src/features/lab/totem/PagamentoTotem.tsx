import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native'

import { mandaLinkEmail, verificaOperatore } from '@/api/totem'
import { Avviso } from '@/components/Avviso'
import { Bottone } from '@/components/Bottone'
import { Campo } from '@/components/Campo'
import { CodiceQr } from '@/components/CodiceQr'
import { AccessoStaff, Strada } from '@/features/proposta/ContinuaSulTelefono'
import { t } from '@/lib/lingua'
import { matriceQr } from '@/lib/qr'
import { spazio } from '@/theme'

import { Carta, Messaggio, Pulsante } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { colpetto } from '../ui/Tocco'
import { ascoltaPassaggio, indirizzoSezione, passaggioCorrente, type RichiestaPassaggio } from './passaggio'
import { uscitaTotem } from './uscita'

// «Come vuoi continuare?» (04/11/2026, richiesta di Maurizio): su ogni pagamento fatto dal totem le tre strade, sempre — QR, email, con un operatore (questa dal comando «staff», piccolo e sbiadito: alla persona se ne mostrano due) — perche' una carta non si digita su uno
// schermo pubblico senza qualcuno del club accanto. Si apre da `passaDalTotem` (`passaggio.ts`), che il codice chiama prima di ogni pagamento; montata nel layout, solo sul totem.
//
// - **QR**: il telefono apre la pagina di pagamento di quello che si e' scelto (`url`) o, per un addebito su un metodo salvato, la stessa sezione dell'app (`percorso`), dove si entra con la propria email.
// - **Email**: lo stesso indirizzo, all'email dell'account (lo decide il server: non si sceglie un destinatario e non si mostra l'indirizzo sullo schermo).
// - **Con un operatore**: il suo codice di sei cifre (`portale-totem`, `operatore`), poi il pagamento prosegue qui. Il codice non resta a schermo.
// Scegliendo QR o email, o annullando, il pagamento **non parte**: «Ho finito, esco» chiude la sessione del totem.
// Il Modal e' una dissolvenza e non uno scorrimento (`FoglioAssistente`: una `transform` rimasta sul contenitore fisso fa perdere il fuoco ai campi su Android; qui non serve ma non costa).

export function PagamentoTotem() {
  const corrente = useSyncExternalStore(ascoltaPassaggio, passaggioCorrente, passaggioCorrente)
  if (!corrente) return null
  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => corrente.risolvi(false)}>
      <View style={stili.velo}>
        <ScrollView contentContainerStyle={stili.centro} keyboardShouldPersistTaps="handled">
          <Contenuto key={String(corrente.richiesta.cosa) + (corrente.richiesta.url ?? corrente.richiesta.percorso ?? '')} richiesta={corrente.richiesta} risolvi={corrente.risolvi} />
        </ScrollView>
      </View>
    </Modal>
  )
}

type Via = 'scelta' | 'qr' | 'email' | 'operatore'

function Contenuto({ richiesta, risolvi }: { richiesta: RichiestaPassaggio; risolvi: (ok: boolean) => void }) {
  const p = usePalette()
  const [strada, setStrada] = useState<Via>('scelta')
  const conUrl = !!richiesta.url
  const destinazione = richiesta.url ?? indirizzoSezione(richiesta.percorso ?? '/')
  // Un indirizzo troppo lungo per un QR non lo si disegna: resta l'email (e, per l'operatore, il comando «staff»).
  const qrPossibile = useMemo(() => matriceQr(destinazione) !== null, [destinazione])

  return (
    <Carta style={stili.carta}>
      {strada === 'scelta' ? (
        <View style={{ gap: spazio.quattro }}>
          <View style={{ gap: 6 }}>
            <Text style={[stili.titolo, { color: p.testo }]} accessibilityRole="header">
              {t('Come vuoi continuare?', 'How would you like to carry on?')}
            </Text>
            <Text style={[stili.testo, { color: p.testoSecondario }]}>
              {t('Per sicurezza qui non si paga da soli: scegli come proseguire.', 'For safety you don’t pay on your own here: choose how to carry on.')}
            </Text>
          </View>
          <View style={{ gap: spazio.tre }}>
            {qrPossibile ? (
              <Strada
                icona="telefono"
                titolo={t('Dal tuo telefono (QR)', 'On your phone (QR code)')}
                testo={
                  conUrl
                    ? t('Inquadri il codice e paghi dal telefono.', 'Scan the code and pay from your phone.')
                    : t('Inquadri il codice: si apre l’app alla stessa sezione, dove entri con la tua email e continui.', 'Scan the code: the app opens at the same section, where you sign in with your email and carry on.')
                }
                onPress={() => setStrada('qr')}
              />
            ) : null}
            <Strada
              icona="email"
              titolo={t('Ricevi il link per email', 'Get the link by email')}
              testo={t('Ti mandiamo il link: lo apri quando vuoi, anche a casa.', 'We’ll email you the link: open it whenever you like, even at home.')}
              onPress={() => setStrada('email')}
            />
          </View>
          {/* La persona sceglie fra QR ed email; l'operatore entra dal comando sbiadito in fondo (04/11/2026). */}
          <View style={stili.piede}>
            <Pulsante testo={t('Annulla', 'Cancel')} variante="fantasma" piccolo pieno={false} onPress={() => risolvi(false)} />
            <AccessoStaff onPress={() => setStrada('operatore')} />
          </View>
        </View>
      ) : null}

      {strada === 'qr' ? <Qr destinazione={destinazione} conUrl={conUrl} onAltraStrada={() => setStrada('scelta')} onChiudi={() => risolvi(false)} /> : null}
      {strada === 'email' ? <Email destinazione={destinazione} conUrl={conUrl} onAltraStrada={() => setStrada('scelta')} onChiudi={() => risolvi(false)} /> : null}
      {strada === 'operatore' ? <Operatore cosa={richiesta.cosa} onFatto={() => risolvi(true)} onIndietro={() => setStrada('scelta')} /> : null}
    </Carta>
  )
}

function Fine({ onAltraStrada, onChiudi }: { onAltraStrada: () => void; onChiudi: () => void }) {
  return (
    <View style={{ gap: spazio.tre }}>
      <Pulsante testo={t('Ho finito, esco', 'I’m done, sign out')} onPress={() => void uscitaTotem()} />
      <Pulsante testo={t('Scegli un’altra strada', 'Choose another way')} variante="fantasma" piccolo pieno={false} onPress={onAltraStrada} />
      <Pulsante testo={t('Chiudi', 'Close')} variante="fantasma" piccolo pieno={false} onPress={onChiudi} />
    </View>
  )
}

function Qr({ destinazione, conUrl, onAltraStrada, onChiudi }: { destinazione: string; conUrl: boolean; onAltraStrada: () => void; onChiudi: () => void }) {
  const p = usePalette()
  return (
    <View style={{ alignItems: 'center', gap: spazio.quattro }}>
      <CodiceQr testo={destinazione} size={300} etichetta={t('Codice QR per continuare dal telefono', 'QR code to carry on from your phone')} />
      <Text style={[stili.titolo, { color: p.testo, textAlign: 'center' }]}>{t('Inquadra il codice con il telefono', 'Scan the code with your phone')}</Text>
      <Text style={[stili.testo, { color: p.testoSecondario, textAlign: 'center' }]}>
        {conUrl
          ? t('Apri la fotocamera e inquadralo: si apre la pagina di pagamento di quello che hai scelto. Qui non devi fare altro.', 'Open your camera and point it at the code: the payment page for what you chose opens. There’s nothing more to do here.')
          : t('Apri la fotocamera e inquadralo: si apre l’app. Entra con la tua email e continua da lì. Qui non devi fare altro.', 'Open your camera and point it at the code: the app opens. Sign in with your email and carry on from there. There’s nothing more to do here.')}
      </Text>
      <View style={{ alignSelf: 'stretch' }}>
        <Fine onAltraStrada={onAltraStrada} onChiudi={onChiudi} />
      </View>
    </View>
  )
}

function Email({ destinazione, conUrl, onAltraStrada, onChiudi }: { destinazione: string; conUrl: boolean; onAltraStrada: () => void; onChiudi: () => void }) {
  const [esito, setEsito] = useState<'invio' | 'ok' | { errore: string }>('invio')
  const [giro, setGiro] = useState(0)
  useEffect(() => {
    let vivo = true
    setEsito('invio')
    mandaLinkEmail(destinazione, conUrl ? 'pagamento' : 'schermata').then((r) => {
      if (!vivo) return
      if (r.ok) {
        colpetto('ok')
        setEsito('ok')
      } else {
        colpetto('errore')
        setEsito({ errore: r.errore })
      }
    })
    return () => {
      vivo = false
    }
  }, [destinazione, conUrl, giro])

  return (
    <View style={{ gap: spazio.quattro }}>
      {esito === 'invio' ? <Messaggio>{t('Ti mandiamo l’email…', 'Sending you the email…')}</Messaggio> : null}
      {esito === 'ok' ? (
        <Messaggio tono="ok" titolo={t('Email mandata', 'Email sent')} icona="ok">
          {t('Ti abbiamo mandato il link all’indirizzo del tuo account. Aprilo quando vuoi: qui non devi fare altro. Non vedi l’email? Controlla anche la posta indesiderata.', 'We’ve sent the link to your account’s email address. Open it whenever you like: there’s nothing more to do here. Can’t see it? Check your spam folder too.')}
        </Messaggio>
      ) : null}
      {typeof esito === 'object' ? (
        <>
          <Messaggio tono="attenzione" titolo={t('Non siamo riusciti a mandarla', 'We couldn’t send it')}>
            {esito.errore}
          </Messaggio>
          <Pulsante testo={t('Riprova', 'Try again')} icona="aggiorna" onPress={() => setGiro((g) => g + 1)} />
        </>
      ) : null}
      <Fine onAltraStrada={onAltraStrada} onChiudi={onChiudi} />
    </View>
  )
}

function Operatore({ cosa, onFatto, onIndietro }: { cosa: string; onFatto: () => void; onIndietro: () => void }) {
  const p = usePalette()
  const [codice, setCodice] = useState('')
  const [invio, setInvio] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  async function conferma() {
    const c = codice.trim()
    if (!c) return
    setErrore(null)
    setInvio(true)
    const r = await verificaOperatore(c, cosa)
    setInvio(false)
    // Il codice non resta a schermo, giusto o sbagliato.
    setCodice('')
    if (!r.ok) {
      colpetto('errore')
      return setErrore(r.errore)
    }
    colpetto('ok')
    onFatto()
  }

  return (
    <View style={{ gap: spazio.quattro }}>
      <Text style={[stili.titolo, { color: p.testo }]} accessibilityRole="header">
        {t('Chiedi a un operatore', 'Ask a staff member')}
      </Text>
      <Text style={[stili.testo, { color: p.testoSecondario }]}>
        {t('Chi ti assiste digita il suo codice operatore: poi continui il pagamento su questo schermo.', 'Whoever is helping you types their operator code: then you carry on with the payment on this screen.')}
      </Text>
      <Campo
        etichetta={t('Codice operatore', 'Operator code')}
        value={codice}
        onChangeText={(v) => setCodice(v.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        inputMode="numeric"
        secureTextEntry
        autoComplete="off"
        autoCorrect={false}
        onSubmitEditing={conferma}
        errore={!!errore}
        editable={!invio}
      />
      {errore ? <Avviso>{errore}</Avviso> : null}
      <Bottone testo={t('Continua', 'Continue')} onPress={conferma} inCorso={invio} disabilitato={!codice.trim()} />
      <Bottone testo={t('Indietro', 'Back')} variante="contorno" onPress={onIndietro} disabilitato={invio} />
    </View>
  )
}

const stili = StyleSheet.create({
  velo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  centro: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: spazio.quattro },
  carta: { width: '100%', maxWidth: 560, gap: spazio.quattro },
  titolo: { fontFamily: F.extra, fontSize: 22, lineHeight: 28, letterSpacing: -0.4 },
  testo: { fontFamily: F.normale, fontSize: 15, lineHeight: 21 },
  piede: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spazio.tre },
})
