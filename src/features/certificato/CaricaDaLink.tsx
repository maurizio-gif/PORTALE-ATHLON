import { useCallback, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { caricaDaLink, type PaginaCertificato } from '@/api/certificati'
import { Avviso } from '@/components/Avviso'
import { Bottone } from '@/components/Bottone'
import { Casella } from '@/components/Casella'
import { Pagina } from '@/components/Pagina'
import { Forte, Testo } from '@/components/Testo'
import { CERTIFICATO_ISTRUZIONI, FORMATI_CERTIFICATO } from '@/lib/certificatoIstruzioni'
import { MAX_BYTE, MAX_FILE, pesoLeggibile, type FileScelto, type FonteCertificato } from '@/lib/fileCertificato'
import { dataBreve } from '@/lib/metodoPagamento'
import { spazio, useColori } from '@/theme'

import { useCarica } from './useCarica'
import { t } from '@/lib/lingua'

// Il certificato medico dal link dell'email (`app.athlonroma.it/r/<token>`, 17/10/2026): la
// pagina in cui il CRM manda chi non ha il certificato, ce l'ha scaduto o se l'e' visto
// rifiutare. Si apre senza accedere: la credenziale e' il token, che vale per una persona sola.
//
// Fa quello che il foglio dell'area riservata (features/lab/home/CaricaCertificato) fa con la
// sessione: spiega quale certificato serve, fa scegliere una foto o un PDF e lo invia. Il file
// va nel bucket privato, il certificato resta «in verifica» e la segreteria lo guarda dal CRM.
//
// Come il foglio: **prima «per chi e'?»** (10/11/2026: un genitore aveva caricato il certificato del figlio sul profilo
// sbagliato) con la spunta «confermo che e' di Tizio», poi il caricamento di **fino a tre file** (il certificato e,
// se sta su un foglio a parte, l'ECG). Il link vale per una persona sola: se non e' lei, la pagina lo dice e rimanda
// al link giusto o all'app; non c'e' un'altra persona da scegliere.

function Istruzioni() {
  const c = useColori()
  const i = CERTIFICATO_ISTRUZIONI
  return (
    <View style={[stili.riquadro, { backgroundColor: c.superficie, borderColor: c.bordo }]}>
      <Testo variante="sottotitolo">{i.titolo}</Testo>
      <Testo>
        <Forte>{i.tipo}</Forte> {i.escluso}
      </Testo>
      <Testo variante="attenuato">{i.ecg}</Testo>
      <Testo>
        <Forte>{i.chiTitolo}</Forte>
      </Testo>
      {i.chi.map((voce) => (
        <View key={voce} style={stili.voce}>
          <View style={[stili.punto, { backgroundColor: c.accento }]} />
          <View style={{ flex: 1 }}>
            <Testo variante="attenuato">{voce}</Testo>
          </View>
        </View>
      ))}
      <Testo variante="attenuato">{i.bambini}</Testo>
      {i.note.map((nota) => (
        <Testo key={nota} variante="piccolo">
          {nota}
        </Testo>
      ))}
    </View>
  )
}

export function CaricaCertificatoDaLink({ token, iniziale }: { token: string; iniziale: PaginaCertificato }) {
  const c = useColori()
  const [stato, setStato] = useState(iniziale.stato)
  const [spunta, setSpunta] = useState(false)
  const [confermato, setConfermato] = useState(false)
  const [aggiungendo, setAggiungendo] = useState(false)
  const invia = useCallback(
    async (f: FileScelto[]) => {
      const esito = await caricaDaLink(token, f)
      if (esito.ok) setStato('in_verifica')
      return esito
    },
    [token],
  )
  const car = useCarica(invia)
  // Senza il nome della persona (il link non lo dice) non c'e' niente da confermare.
  const persona = iniziale.persona
  const passoConferma = Boolean(persona) && !confermato
  const mostraFonti = car.files.length === 0 || aggiungendo
  const aggiungi = async (fonte: FonteCertificato) => {
    // Le tre strade si richiudono solo se un file e' stato aggiunto: dopo un errore o un selettore chiuso si riprova subito.
    if (await car.scegli(fonte)) setAggiungendo(false)
  }

  return (
    <Pagina titolo={t('Certificato medico', 'Medical certificate')} sottotitolo={iniziale.persona ? t(`Per ${iniziale.persona}`, `For ${iniziale.persona}`) : undefined}>
      {stato === 'valido' ? (
        <Avviso tono="ok">
          {t(
            `Il certificato risulta valido${iniziale.scadenza ? ` fino al ${dataBreve(iniziale.scadenza)}` : ''}. Non serve altro: grazie!`,
            `The certificate is valid${iniziale.scadenza ? ` until ${dataBreve(iniziale.scadenza)}` : ''}. Nothing else is needed: thank you!`,
          )}
        </Avviso>
      ) : stato === 'in_verifica' ? (
        <>
          <Avviso tono="ok">
            {car.fatto
              ? t('Certificato ricevuto: grazie! Lo stiamo controllando.', 'Certificate received: thank you! We’re checking it.')
              : t('Abbiamo già ricevuto un certificato: lo stiamo controllando.', 'We’ve already received a certificate: we’re checking it.')}
          </Avviso>
          <Testo variante="attenuato">
            {t('Appena la segreteria l’avrà verificato risulterà valido. Se qualcosa non va, ti scriviamo il motivo per email.', 'As soon as the front desk has checked it, it will show as valid. If something’s wrong, we’ll email you the reason.')}
          </Testo>
          {car.mancanti ? (
            <Avviso tono="attenzione">
              {t('Abbiamo ricevuto il certificato ma non gli altri file. Scrivici dall’app, da «Richiedi assistenza», e te li facciamo aggiungere.', 'We received the certificate but not the other files. Write to us from the app, under “Request assistance”, and we’ll have them added.')}
            </Avviso>
          ) : null}
        </>
      ) : (
        <>
          {iniziale.rifiuto ? (
            <Avviso tono="errore">
              {t(
                `L’ultimo certificato che ci hai mandato non è stato accettato${iniziale.rifiuto.motivo ? `: ${iniziale.rifiuto.motivo}` : '.'}`,
                `The last certificate you sent us wasn’t accepted${iniziale.rifiuto.motivo ? `: ${iniziale.rifiuto.motivo}` : '.'}`,
              )}
            </Avviso>
          ) : null}

          {passoConferma ? (
            <View style={{ gap: spazio.tre }}>
              <View style={[stili.riquadro, { backgroundColor: c.superficie, borderColor: c.bordo }]}>
                <Testo variante="attenuato">{t('Stai caricando il certificato di', 'You’re uploading the certificate for')}</Testo>
                <Testo variante="sottotitolo">{persona}</Testo>
              </View>
              <Testo variante="piccolo">{t('Sul certificato devono esserci il nome e la data di nascita di questa persona.', 'The certificate must show this person’s name and date of birth.')}</Testo>
              <Casella spuntata={spunta} onCambia={() => setSpunta((v) => !v)} riquadro etichetta={t(`Confermo che il certificato è di ${persona}`, `I confirm the certificate is for ${persona}`)}>
                <Testo>{t(`Confermo che il certificato è di ${persona}`, `I confirm the certificate is for ${persona}`)}</Testo>
              </Casella>
              <Bottone testo={t('Continua', 'Continue')} disabilitato={!spunta} onPress={() => setConfermato(true)} />
              <Testo variante="piccolo">
                {t(
                  `Non è di ${persona}? Questo link vale solo per ${persona}: per un’altra persona usa il link dell’email che la riguarda, oppure accedi all’app.`,
                  `Not for ${persona}? This link is only for ${persona}: for someone else, use the link in the email about them, or sign in to the app.`,
                )}
              </Testo>
            </View>
          ) : (
            <>
              {persona ? (
                <View style={[stili.file, { backgroundColor: c.superficie, borderColor: c.bordo }]}>
                  <View style={{ flex: 1 }}>
                    <Testo variante="piccolo">{t('Stai caricando il certificato di', 'You’re uploading the certificate for')}</Testo>
                    <Text style={[stili.nomeFile, { color: c.testo }]} numberOfLines={1}>
                      {persona}
                    </Text>
                  </View>
                  <View style={{ width: 150 }}>
                    <Bottone
                      testo={t('Cambia persona', 'Change person')}
                      variante="contorno"
                      onPress={() => {
                        setSpunta(false)
                        setConfermato(false)
                      }}
                    />
                  </View>
                </View>
              ) : null}

              <Istruzioni />

              {car.files.map((f, i) => (
                <View key={`${f.nome}-${f.byte}-${i}`} style={[stili.file, { backgroundColor: c.superficie, borderColor: c.bordo }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[stili.nomeFile, { color: c.testo }]} numberOfLines={1}>
                      {f.nome}
                    </Text>
                    <Testo variante="piccolo">{pesoLeggibile(f.byte)}</Testo>
                  </View>
                  <View style={{ width: 110 }}>
                    <Bottone testo={t('Togli', 'Remove')} variante="contorno" onPress={() => car.togli(i)} />
                  </View>
                </View>
              ))}

              {mostraFonti ? (
                <View style={{ gap: 10 }}>
                  <Bottone testo={car.inLettura ? t('Preparo il file…', 'Preparing the file…') : t('Scatta una foto', 'Take a photo')} variante="contorno" inCorso={car.inLettura} onPress={() => aggiungi('fotocamera')} />
                  <Bottone testo={t('Scegli dalla galleria', 'Choose from your photos')} variante="contorno" onPress={() => aggiungi('galleria')} />
                  <Bottone testo={t('Scegli un documento (PDF)', 'Choose a document (PDF)')} variante="contorno" onPress={() => aggiungi('documenti')} />
                </View>
              ) : car.puoAggiungere ? (
                <Bottone testo={t('Aggiungi un altro file (ad esempio l’ECG)', 'Add another file (for example the ECG)')} variante="contorno" onPress={() => setAggiungendo(true)} />
              ) : null}
              <Testo variante="piccolo">
                {t(
                  `${FORMATI_CERTIFICATO}, fino a ${MAX_FILE} file e ${MAX_BYTE / 1024 / 1024} MB in tutto. L’ECG è su un foglio a parte? Aggiungilo qui, insieme al certificato. Se scatti una foto, controlla che si legga tutta la pagina. I file li vede solo la segreteria.`,
                  `${FORMATI_CERTIFICATO}, up to ${MAX_FILE} files and ${MAX_BYTE / 1024 / 1024} MB in total. Is the ECG on a separate sheet? Add it here, together with the certificate. If you take a photo, make sure the whole page is legible. Only the front desk sees the files.`,
                )}
              </Testo>

              {car.errore ? <Avviso tono="errore">{car.errore}</Avviso> : null}

              <Bottone
                testo={car.files.length > 1 ? t('Invia i file', 'Send the files') : t('Invia il certificato', 'Send the certificate')}
                inCorso={car.inCorso}
                disabilitato={car.files.length === 0 || car.inLettura}
                onPress={car.spedisci}
              />
            </>
          )}
        </>
      )}
    </Pagina>
  )
}

const stili = StyleSheet.create({
  riquadro: { borderWidth: 1, borderRadius: 12, padding: spazio.tre, gap: spazio.due },
  voce: { flexDirection: 'row', gap: spazio.due, paddingLeft: spazio.uno },
  punto: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  file: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, borderWidth: 1, borderRadius: 12, padding: spazio.tre },
  nomeFile: { fontSize: 15, fontWeight: '700' },
})
