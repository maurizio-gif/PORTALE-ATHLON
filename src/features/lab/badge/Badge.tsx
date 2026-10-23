import { useCallback, useEffect, useState } from 'react'
import { Platform, StyleSheet, Text, View } from 'react-native'

import { laMiaArea, type EsitoArea, type PersonaArea } from '@/api/lab'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { inMemoria, prendi } from '../memoria'
import { Carta, Entra, Etichetta, Messaggio, Pulsante, SchedeInArrivo, Sezione } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, raggio, usePalette, velo } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { vistaCorrente } from '../vista'
import { BadgeAccesso, nomeLeggibile } from './BadgeAccesso'

// «Il tuo badge» (22/10/2026, richiesta di Maurizio): la carta di accesso al club per il wallet del telefono, con cui si
// passa al tornello avvicinando il telefono al lettore. **Questa e' la parte grafica**: la carta, la scelta della persona
// del nucleo, i due pulsanti del wallet e il «come si usa». Il badge vero (il pass da aggiungere, l'identificativo, il
// cambio di telefono) lo fara' la funzione `portale-lab-wallet`, che oggi non c'e': la schermata ha uno stato per ogni
// momento (`StatoBadge`) e un solo punto di aggancio (`onAggiungi`), e finche' la funzione non risponde mostra «In arrivo».
//
// Le regole dell'app che valgono qui: i testi hanno sempre i due argomenti (`t`); in vista cliente niente (l'aggiunta del
// badge crea una credenziale che apre una porta, e chi guarda l'app di un socio non la crea al suo posto); **niente foto**
// (nell'app la foto sta in due posti soli); niente decisioni sull'ingresso (le prende il database a ogni passaggio, quindi
// il badge non dice «attivo» o «scaduto»).

/** Dove e' il badge di una persona: la funzione non c'e' ancora, e' pronto da aggiungere, e' gia' nel wallet. */
export type StatoBadge = 'in_arrivo' | 'da_aggiungere' | 'aggiunto'
export type Wallet = 'apple' | 'google'

export const CHIAVE_AREA = 'area'

/** Il wallet del telefono su cui si e': Apple su iPhone e iPad, Google su Android; su un computer nessuno dei due. */
export function walletDelTelefono(): Wallet | null {
  if (Platform.OS === 'ios') return 'apple'
  if (Platform.OS === 'android') return 'google'
  if (typeof navigator === 'undefined') return null
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'apple'
  if (/Android/.test(ua)) return 'google'
  return null
}

const NOME_WALLET: Record<Wallet, () => string> = {
  apple: () => t('Aggiungi ad Apple Wallet', 'Add to Apple Wallet'),
  google: () => t('Aggiungi a Google Wallet', 'Add to Google Wallet'),
}

/** La schermata, senza chiamate: le persone e lo stato arrivano da fuori (cosi' si vede in ogni caso, anche in prova). */
export function BadgeVista({
  persone,
  titolare,
  stato,
  vista = false,
  onAggiungi,
}: {
  persone: PersonaArea[]
  /** `member_id` del titolare: e' la persona scelta all'inizio. */
  titolare: number
  stato: StatoBadge
  /** Vista cliente dello staff: niente comandi. */
  vista?: boolean
  onAggiungi?: (persona: PersonaArea, wallet: Wallet) => void
}) {
  const p = usePalette()
  const [scelto, setScelto] = useState(titolare)
  const persona = persone.find((x) => x.member_id === scelto) ?? persone[0]
  const telefono = walletDelTelefono()
  const intestazione = {
    titolo: t('Il tuo badge', 'Your badge'),
    sopratitolo: t('Accesso al club', 'Club access'),
    indietro: '/' as const,
    barra: false,
  }

  if (vista) {
    return (
      <Schermata {...intestazione}>
        <Messaggio tono="attenzione" titolo={t('Vista cliente', 'Client view')}>
          {t('Il badge lo aggiunge solo il socio, dal suo telefono: da qui non si crea.', 'Only the member can add the badge, from their phone: it can’t be created from here.')}
        </Messaggio>
      </Schermata>
    )
  }

  if (!persona) return null

  const pronto = stato !== 'in_arrivo'
  // Su un computer non si puo' aggiungere un pass: si mostrano tutti e due i pulsanti e si dice di aprire l'app dal telefono.
  const wallet: Wallet[] = telefono ? [telefono] : ['apple', 'google']

  return (
    <Schermata {...intestazione} sottotitolo={t('Avvicina il telefono al lettore del tornello: niente tessera da portare.', 'Hold your phone to the turnstile reader: no card to carry.')}>
      {persone.length > 1 ? (
        <View style={stili.scelta} accessibilityRole="radiogroup" accessibilityLabel={t('Per chi è il badge', 'Who the badge is for')}>
          {persone.map((x) => {
            const attivo = x.member_id === persona.member_id
            return (
              <Tocco
                key={x.member_id}
                onPress={() => setScelto(x.member_id)}
                ruolo="radio"
                etichetta={nomeLeggibile(x.nome) || t('Persona', 'Person')}
                stato={{ checked: attivo, selected: attivo }}
                vibra="scelta"
                style={[stili.chip, { backgroundColor: attivo ? velo(p, 'accento', 0.16) : p.incavo, borderColor: attivo ? p.accento : 'transparent' }]}
              >
                <Text style={[stili.chipTesto, { color: attivo ? p.accento : p.testoSecondario }]} numberOfLines={1}>
                  {nomeLeggibile(x.nome) || t('Persona', 'Person')}
                  {x.member_id === titolare ? t(' · tu', ' · you') : ''}
                </Text>
              </Tocco>
            )
          })}
        </View>
      ) : null}

      <Entra indice={0} key={persona.member_id}>
        <BadgeAccesso nome={persona.nome} cognome={persona.cognome} numero={persona.numero} />
      </Entra>

      <Entra indice={1}>
        <Carta style={{ gap: spazio.tre }}>
          {stato === 'in_arrivo' ? (
            <>
              <View style={stili.stato}>
                <Etichetta testo={t('In arrivo', 'Coming soon')} tono="blu" icona="orologio" grande />
              </View>
              <Text style={[stili.corpo, { color: p.testoSecondario }]}>
                {t('Stiamo preparando il badge per il wallet del tuo telefono. Appena è pronto lo aggiungi da qui, in un tocco.', 'We’re getting your badge ready for your phone’s wallet. As soon as it’s ready you’ll add it from here, in one tap.')}
              </Text>
            </>
          ) : stato === 'aggiunto' ? (
            <>
              <View style={stili.stato}>
                <Etichetta testo={t('Nel tuo wallet', 'In your wallet')} tono="ok" icona="ok" grande />
              </View>
              <Text style={[stili.corpo, { color: p.testoSecondario }]}>
                {t('Hai cambiato telefono? Aggiungilo di nuovo: quello vecchio smette di funzionare.', 'Got a new phone? Add it again: the old one stops working.')}
              </Text>
            </>
          ) : null}

          {wallet.map((w, i) => (
            <Pulsante
              key={w}
              testo={NOME_WALLET[w]()}
              icona="wallet"
              variante={stato === 'aggiunto' ? 'secondario' : i === 0 ? 'primario' : 'contorno'}
              disabilitato={!pronto}
              onPress={() => onAggiungi?.(persona, w)}
            />
          ))}

          {!telefono ? (
            <Text style={[stili.piccolo, { color: p.testoTerzo }]}>{t('Per aggiungerlo apri l’app dal telefono.', 'To add it, open the app on your phone.')}</Text>
          ) : null}
        </Carta>
      </Entra>

      <Sezione titolo={t('Come si usa', 'How it works')}>
        <Carta piatta style={{ gap: spazio.tre }}>
          {[
            t('Aggiungi il badge al wallet del telefono: lo fai una volta sola.', 'Add the badge to your phone’s wallet: you only do it once.'),
            t('Al tornello avvicina il telefono al lettore. Non serve aprire l’app.', 'At the turnstile, hold your phone to the reader. You don’t need to open the app.'),
            t('Se il tornello non si apre, ti arriva una notifica nell’app con il motivo e cosa fare.', 'If the turnstile doesn’t open, you’ll get a notification in the app saying why and what to do.'),
            t('Il badge è personale: ogni persona ha il suo e non va prestato.', 'The badge is personal: everyone has their own and it shouldn’t be lent.'),
          ].map((x, i) => (
            <View key={i} style={stili.punto}>
              <Text style={[stili.numero, { color: p.accento }]}>{i + 1}</Text>
              <Text style={[stili.corpo, { color: p.testoSecondario, flex: 1 }]}>{x}</Text>
            </View>
          ))}
        </Carta>
        <Text style={[stili.piccolo, { color: p.testoTerzo }]}>
          {t('Sul badge ci sono solo il tuo nome e il numero socio: niente foto, niente dati di salute o di pagamento.', 'The badge only shows your name and member number: no photo, no health or payment details.')}
        </Text>
      </Sezione>
    </Schermata>
  )
}

/** La schermata vera: legge le persone del nucleo e, finche' la funzione del wallet non c'e', dice «In arrivo». */
export function Badge() {
  const vista = vistaCorrente()
  const [esito, setEsito] = useState<EsitoArea | undefined>(() => inMemoria<EsitoArea>(CHIAVE_AREA))

  const carica = useCallback(async () => {
    setEsito(await prendi(CHIAVE_AREA, laMiaArea))
  }, [])
  useEffect(() => {
    carica()
  }, [carica])

  const intestazione = { titolo: t('Il tuo badge', 'Your badge'), sopratitolo: t('Accesso al club', 'Club access'), indietro: '/' as const, barra: false }

  if (!esito) {
    return (
      <Schermata {...intestazione}>
        <SchedeInArrivo quante={2} />
      </Schermata>
    )
  }
  if (!esito.ok) {
    return (
      <Schermata {...intestazione}>
        <Messaggio>{esito.errore}</Messaggio>
        <Pulsante testo={t('Riprova', 'Try again')} icona="aggiorna" variante="secondario" onPress={carica} />
      </Schermata>
    )
  }
  if (!esito.area.trovato) {
    return (
      <Schermata {...intestazione}>
        <Messaggio tono="attenzione" titolo={t('Non troviamo la tua scheda', 'We can’t find your profile')}>
          {t('Il badge è per chi ha una scheda al club. Se pensi sia un errore, scrivi al club.', 'The badge is for people with a profile at the club. If you think this is a mistake, write to the club.')}
        </Messaggio>
      </Schermata>
    )
  }
  // Il titolare per primo, poi gli altri del nucleo.
  const area = esito.area
  const persone = [...area.persone].sort((a, b) => Number(b.member_id === area.titolare) - Number(a.member_id === area.titolare))
  return <BadgeVista persone={persone} titolare={area.titolare} stato="in_arrivo" vista={!!vista} />
}

const stili = StyleSheet.create({
  scelta: { flexDirection: 'row', flexWrap: 'wrap', gap: spazio.due },
  chip: { borderRadius: raggio.pillola, borderWidth: 1.5, paddingHorizontal: spazio.tre, paddingVertical: 9, maxWidth: '100%' },
  chipTesto: { fontFamily: F.bold, fontSize: 14 },
  stato: { alignItems: 'flex-start' },
  corpo: { fontFamily: F.medio, fontSize: 14, lineHeight: 21 },
  piccolo: { fontFamily: F.medio, fontSize: 12.5, lineHeight: 18 },
  punto: { flexDirection: 'row', gap: spazio.tre, alignItems: 'flex-start' },
  numero: { fontFamily: F.extra, fontSize: 15, lineHeight: 21, width: 14, textAlign: 'center' },
})
