import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { statoInvito, type Amico, type StatoInvito } from '@/api/referral'
import { locale, t, tv } from '@/lib/lingua'
import { spazio } from '@/theme'

import { inMemoria, prendi } from '../memoria'
import { Bollino, Carta, Etichetta, Messaggio, Numero, Pulsante, Riga, SchedeInArrivo, Sezione } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, raggio, usePalette, type ToniTutti } from '../ui/tema'
import { vistaCorrente } from '../vista'
import { manda, smsDisponibile, type Canale } from './condividi'

// «Invita un amico» (21/10/2026, richiesta di Maurizio): il link personale del socio, i quattro modi di mandarlo
// (WhatsApp, email, SMS, copia) e gli amici che l'hanno accettato. Chi apre il link fa la procedura del Guest Pass
// (pagina pubblica /invito/<codice>), che con l'invito costa 5 € invece di 19 (21/10/2026), e resta abbinato a chi l'ha
// invitato per 30 giorni.
//
// Le regole dette qui sono quelle della migrazione 20261021a di APP-ATHLON, e i numeri (30 giorni, 50 €, 5 € e 19 €)
// arrivano dalla funzione. **Non si nomina il vantaggio della quota di attivazione** per chi continua dopo la prova: il
// club lo svela solo dopo che l'amico ha attivato la prova (decisione del 21/10/2026).
//
// **La resa (04/11/2026, richiesta di Maurizio)**: la pagina spiega l'iniziativa prima di chiedere di condividerla. In
// testata una foto di persone che si allenano insieme (`assets/images/invita/amici-in-sala.webp`, dalla sessione
// fotografica del club), poi il link, poi «Per voi due» (cosa ottiene l'amico e cosa ottieni tu, con la cifra in
// grande), il percorso a tappe, le regole e gli inviti. **«Chi puoi invitare» dice «dal 2021»**: e' la regola scelta dal
// club per questa campagna; il server (`guest_pass_blocco`) oggi blocca solo chi ha avuto un contratto negli ultimi 3 anni.

export const CHIAVE_INVITO = 'referral:stato'

const FOTO = require('@/../assets/images/invita/amici-in-sala.webp')

type Idoneo = Extract<StatoInvito, { ok: true; idoneo: true }>

function giorno(iso: string | null): string {
  if (!iso) return ''
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00Z`) : new Date(iso)
  return d.toLocaleDateString(locale(), { day: 'numeric', month: 'long', timeZone: 'Europe/Rome' })
}

/**
 * In italiano la cifra e l'euro non vanno mai a capo separati («50» in fondo a una riga e «€» all'inizio della
 * successiva): fra i due uno spazio che non si divide. Vale per ogni testo con una cifra di questa schermata.
 */
const ti = (it: string, en: string) => t(it, en).replace(/(\d) €/g, '$1\u00A0€')

/** Una cifra con la valuta come la vuole la lingua: «50 €» in italiano, «€50» in inglese. */
const euro = (n: number) => tv(`${n}\u00A0€`, `€${n}`)

/** Lo stato dell'amico in una riga: da dove viene e cosa succede dopo. */
function racconto(a: Amico): { testo: string; tono: ToniTutti } {
  switch (a.stato) {
    case 'iscritto':
      return { testo: t(`Si è iscritto il ${giorno(a.firmato_il)} · il tuo voucher è in arrivo`, `Joined on ${giorno(a.firmato_il)} · your voucher is on its way`), tono: 'ok' }
    case 'in_prova':
      return { testo: t(`In prova fino al ${giorno(a.prova_fine)}`, `On trial until ${giorno(a.prova_fine)}`), tono: 'blu' }
    case 'prova_finita':
      return { testo: t(`Prova finita · può iscriversi fino al ${giorno(a.ultimo_giorno)}`, `Trial ended · can join until ${giorno(a.ultimo_giorno)}`), tono: 'attenzione' }
    case 'scaduto':
      return { testo: t('Invito scaduto', 'Invitation expired'), tono: 'neutro' }
    default:
      return { testo: t(`Ha accettato · ha tempo fino al ${giorno(a.ultimo_giorno)}`, `Accepted · has until ${giorno(a.ultimo_giorno)}`), tono: 'accento' }
  }
}

/** La testata: la foto, e sopra la promessa in una riga, con le due cifre in grassetto. */
function Copertina({ s }: { s: Idoneo }) {
  return (
    <View style={stili.copertina}>
      <Image
        source={FOTO}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition={{ top: '30%', left: '50%' }}
        transition={200}
        accessibilityLabel={t('Tre persone si allenano fianco a fianco ai tapis roulant, in sala', 'Three people working out side by side on treadmills in the gym')}
        accessibilityIgnoresInvertColors
      />
      <LinearGradient colors={['rgba(10,10,12,0)', 'rgba(10,10,12,0.4)', 'rgba(10,10,12,0.92)']} locations={[0.2, 0.55, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View style={stili.copertinaTesto}>
        <Text style={stili.copertinaTitolo} accessibilityRole="header">
          {t('Porta un amico al club', 'Bring a friend to the club')}
        </Text>
        <Text style={stili.copertinaSotto}>
          {t('Lui prova il club per una settimana a ', 'They try the club for a week for ')}
          <Text style={stili.cifraChiara}>{euro(s.prezzo_prova)}</Text>
          {ti(` invece di ${s.prezzo_pieno} €. Tu ricevi `, ` instead of €${s.prezzo_pieno}. You get `)}
          <Text style={stili.cifraChiara}>{euro(s.voucher)}</Text>
          {t(' quando si iscrive.', ' when they join.')}
        </Text>
      </View>
    </View>
  )
}

/** Cosa ottiene l'amico e cosa ottieni tu: le due cifre in grande, e una frase ciascuna. */
function PerVoiDue({ s }: { s: Idoneo }) {
  const p = usePalette()
  return (
    <View style={stili.coppia}>
      <Carta style={stili.meta}>
        <View style={stili.testaCarta}>
          <Bollino icona="persona" tono="blu" size={36} />
          <Text style={[stili.etichettaCarta, { color: p.testoSecondario }]}>{t('Il tuo amico', 'Your friend')}</Text>
        </View>
        <View style={{ gap: 2 }}>
          <Numero valore={tv(`${s.prezzo_prova}`, `€${s.prezzo_prova}`)} unita={tv<string | undefined>('€', undefined)} size={46} />
          <Text style={[stili.piccolo, { color: p.testoSecondario }]}>{ti(`invece di ${s.prezzo_pieno} €, per una settimana`, `instead of €${s.prezzo_pieno}, for a week`)}</Text>
        </View>
        <Text style={[stili.corpo, { color: p.testoSecondario }]}>
          {t(
            'Una settimana con tutto il club: sala, corsi e vasche, senza impegno e senza rinnovo. Se preferisce, può iscriversi subito: l’invito vale lo stesso.',
            'A week with the whole club: gym floor, classes and pools, with no commitment and no renewal. If they prefer, they can join right away: the invitation still counts.',
          )}
        </Text>
      </Carta>

      <Carta style={[stili.meta, { backgroundColor: p.carbone, borderColor: 'rgba(255,255,255,0.08)' }]}>
        <View style={stili.testaCarta}>
          <Bollino icona="regalo" tono="accento" size={36} pieno />
          <Text style={[stili.etichettaCarta, { color: 'rgba(255,255,255,0.72)' }]}>{t('Tu', 'You')}</Text>
        </View>
        <View style={{ gap: 2 }}>
          <Numero valore={tv(`${s.voucher}`, `€${s.voucher}`)} unita={tv<string | undefined>('€', undefined)} size={46} colore="#FFFFFF" />
          <Text style={[stili.piccolo, { color: 'rgba(255,255,255,0.72)' }]}>{t('sul tuo abbonamento', 'on your membership')}</Text>
        </View>
        <Text style={[stili.corpo, { color: 'rgba(255,255,255,0.78)' }]}>
          {ti(
            `Quando il tuo amico si iscrive, la segreteria carica per te un voucher da ${s.voucher} € sul tuo abbonamento.`,
            `When your friend joins, the front desk adds a €${s.voucher} voucher to your membership for you.`,
          )}
        </Text>
      </Carta>
    </View>
  )
}

/** Una tappa del percorso: il numero su un filo che la unisce alla successiva. */
function Passo({ n, titolo, testo, ultimo }: { n: number; titolo: string; testo: string; ultimo?: boolean }) {
  const p = usePalette()
  return (
    <View style={stili.passo}>
      <View style={stili.passoAsse}>
        <View style={[stili.passoCerchio, { backgroundColor: p.accento }]}>
          <Text style={stili.passoNumero}>{n}</Text>
        </View>
        {ultimo ? null : <View style={[stili.passoFilo, { backgroundColor: p.linea }]} />}
      </View>
      <View style={[stili.passoTesto, { paddingBottom: ultimo ? 0 : spazio.quattro }]}>
        <Text style={[stili.passoTitolo, { color: p.testo }]}>{titolo}</Text>
        <Text style={[stili.corpo, { color: p.testoSecondario }]}>{testo}</Text>
      </View>
    </View>
  )
}

/** Una regola: l'icona, il titolo in grassetto e la frase che la spiega. */
function Regola({ icona, titolo, testo }: { icona: 'calendario' | 'clessidra' | 'persone'; titolo: string; testo: string }) {
  const p = usePalette()
  return (
    <View style={stili.regola}>
      <Bollino icona={icona} tono="accento" size={36} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[stili.passoTitolo, { color: p.testo }]}>{titolo}</Text>
        <Text style={[stili.corpo, { color: p.testoSecondario }]}>{testo}</Text>
      </View>
    </View>
  )
}

export function Invita() {
  const p = usePalette()
  const vista = vistaCorrente()
  const [stato, setStato] = useState<StatoInvito | undefined>(() => inMemoria<StatoInvito>(CHIAVE_INVITO))
  const [esito, setEsito] = useState<string | null>(null)
  const [canale, setCanale] = useState<Canale | null>(null)

  const carica = useCallback(async () => {
    if (vista) return
    setStato(await prendi(CHIAVE_INVITO, statoInvito))
  }, [vista])
  useEffect(() => {
    carica()
  }, [carica])

  async function premi(c: Canale) {
    if (!stato || !stato.ok || !stato.idoneo) return
    setEsito(null)
    setCanale(c)
    const r = await manda(c, stato.oggetto, stato.messaggio, stato.link)
    setCanale(null)
    if (r === 'copiato') setEsito(t('Link copiato: incollalo dove vuoi.', 'Link copied: paste it wherever you like.'))
    else if (r === 'errore') setEsito(t('Non riusciamo ad aprirlo da qui: copia il link e incollalo a mano.', 'We can’t open it from here: copy the link and paste it yourself.'))
  }

  const intestazione = { titolo: t('Invita un amico', 'Invite a friend'), sopratitolo: t('Allenati in compagnia', 'Train together'), indietro: '/' as const, barra: false }

  if (vista) {
    return (
      <Schermata {...intestazione}>
        <Messaggio tono="attenzione" titolo={t('Vista cliente', 'Client view')}>
          {t('L’invito lo manda solo il socio, dal suo telefono: da qui non si crea il suo link.', 'Only the member can send the invitation, from their phone: their link can’t be created from here.')}
        </Messaggio>
      </Schermata>
    )
  }

  if (!stato) {
    return (
      <Schermata {...intestazione}>
        <SchedeInArrivo quante={2} />
      </Schermata>
    )
  }

  if (!stato.ok) {
    return (
      <Schermata {...intestazione}>
        <Messaggio>{stato.errore}</Messaggio>
        <Pulsante testo={t('Riprova', 'Try again')} icona="aggiorna" variante="secondario" onPress={carica} />
      </Schermata>
    )
  }

  if (!stato.idoneo) {
    return (
      <Schermata {...intestazione}>
        <Messaggio tono="attenzione" titolo={t('Per ora non puoi invitare', 'You can’t invite anyone yet')}>
          {stato.motivo || t('Puoi invitare un amico quando hai un abbonamento in corso.', 'You can invite a friend once you have a current membership.')}
        </Messaggio>
      </Schermata>
    )
  }

  const s = stato

  return (
    <Schermata {...intestazione} sottotitolo={t('Manda il tuo link a chi vuoi: lo apre dal telefono, senza installare niente.', 'Send your link to anyone: they open it on their phone, nothing to install.')}>
      <Copertina s={s} />

      <Carta style={{ gap: spazio.tre }}>
        <Text style={[stili.etichettaLink, { color: p.accento }]}>{t('IL TUO LINK PERSONALE', 'YOUR PERSONAL LINK')}</Text>
        <View style={[stili.link, { backgroundColor: p.fondo, borderColor: p.linea }]}>
          <Text style={[stili.linkTesto, { color: p.testo }]} selectable numberOfLines={1}>
            {s.link.replace(/^https:\/\//, '')}
          </Text>
        </View>
        <Pulsante testo={t('Manda su WhatsApp', 'Send on WhatsApp')} icona="invia" onPress={() => premi('whatsapp')} inCorso={canale === 'whatsapp'} />
        <View style={stili.riga}>
          <View style={{ flex: 1 }}>
            <Pulsante testo="Email" icona="email" variante="secondario" onPress={() => premi('email')} inCorso={canale === 'email'} />
          </View>
          {smsDisponibile() ? (
            <View style={{ flex: 1 }}>
              <Pulsante testo="SMS" icona="fumetto" variante="secondario" onPress={() => premi('sms')} inCorso={canale === 'sms'} />
            </View>
          ) : null}
        </View>
        <Pulsante testo={t('Copia il link', 'Copy the link')} icona="copia" variante="contorno" onPress={() => premi('copia')} inCorso={canale === 'copia'} />
        {esito ? <Messaggio tono="ok">{esito}</Messaggio> : null}
      </Carta>

      <Sezione titolo={t('Per voi due', 'For you both')}>
        <PerVoiDue s={s} />
      </Sezione>

      <Sezione titolo={t('Come funziona', 'How it works')}>
        <Carta piatta>
          <Passo
            n={1}
            titolo={t('Mandagli il tuo link', 'Send them your link')}
            testo={t('Su WhatsApp, per email, per SMS o copiato dove preferisci: il link è sempre lo stesso, solo tuo.', 'On WhatsApp, by email, by SMS or copied wherever you like: the link is always the same, only yours.')}
          />
          <Passo
            n={2}
            titolo={t('Lui accetta l’invito', 'They accept the invitation')}
            testo={t('Apre il link, lascia la sua email e i suoi dati e riceve il link per completare.', 'They open the link, leave their email and details, and get a link to finish.')}
          />
          <Passo
            n={3}
            titolo={t('Prova il club o si iscrive', 'They try the club or join')}
            testo={ti(
              `Con il tuo invito la settimana di prova costa ${s.prezzo_prova} € invece di ${s.prezzo_pieno} €. Se preferisce, sceglie subito l’abbonamento.`,
              `With your invitation the trial week costs €${s.prezzo_prova} instead of €${s.prezzo_pieno}. If they prefer, they can pick a membership right away.`,
            )}
          />
          <Passo
            n={4}
            ultimo
            titolo={ti(`Tu ricevi ${s.voucher} €`, `You get €${s.voucher}`)}
            testo={ti(
              `Quando si iscrive, la segreteria carica il voucher da ${s.voucher} € sul tuo abbonamento. Lo segui qui sotto, in «I tuoi inviti».`,
              `When they join, the front desk adds the €${s.voucher} voucher to your membership. You can follow it below, in “Your invitations”.`,
            )}
          />
        </Carta>
      </Sezione>

      <Sezione titolo={t('Da sapere', 'Good to know')}>
        <Carta piatta style={{ gap: spazio.tre }}>
          <Regola
            icona="calendario"
            titolo={t('Chi puoi invitare', 'Who you can invite')}
            testo={t(
              'Un amico che non è stato iscritto ad Athlon dal 2021: nessun abbonamento e nessun Guest Pass da allora.',
              'A friend who hasn’t been a member of Athlon since 2021: no membership and no Guest Pass since then.',
            )}
          />
          <Regola
            icona="clessidra"
            titolo={t('Quanto tempo ha', 'How long they have')}
            testo={t(
              `Ha ${s.giorni} giorni da quando accetta l’invito per iscriversi. Se nel frattempo comincia la settimana di prova, può iscriversi fino al giorno dopo la fine della prova.`,
              `They have ${s.giorni} days from accepting the invitation to join. If they start the trial week in the meantime, they can join until the day after the trial ends.`,
            )}
          />
          <Regola
            icona="persone"
            titolo={t('Vale il primo invito', 'The first invitation counts')}
            testo={t('Se il tuo amico accetta prima l’invito di un altro socio, vale quello.', 'If your friend accepts another member’s invitation first, that one counts.')}
          />
        </Carta>
      </Sezione>

      <Sezione titolo={t('I tuoi inviti', 'Your invitations')} conteggio={s.inviti.length || undefined}>
        {s.inviti.length ? (
          <Carta piatta style={{ paddingVertical: 0 }}>
            {s.inviti.map((a, i) => {
              const r = racconto(a)
              return (
                <Riga
                  key={a.id}
                  prima={i === 0}
                  icona={a.stato === 'iscritto' ? 'ok' : 'persona'}
                  tono={r.tono}
                  titolo={a.amico}
                  sotto={
                    <View style={{ alignItems: 'flex-start', gap: 4 }}>
                      <Etichetta testo={r.testo} tono={r.tono} />
                      <Text style={[stili.piccolo, { color: p.testoTerzo }]}>{t(`Accettato il ${giorno(a.accettato_il)}`, `Accepted on ${giorno(a.accettato_il)}`)}</Text>
                    </View>
                  }
                />
              )
            })}
          </Carta>
        ) : (
          <Carta piatta>
            <Text style={[stili.corpo, { color: p.testoSecondario }]}>{t('Quando un amico accetta il tuo invito lo vedi qui, con i giorni che gli restano.', 'When a friend accepts your invitation you’ll see it here, with the days they have left.')}</Text>
          </Carta>
        )}
      </Sezione>
    </Schermata>
  )
}

const stili = StyleSheet.create({
  // La foto: alta quanto basta per le facce, mai una parete su un computer (il tetto), e il testo sul fondo scuro.
  copertina: { borderRadius: raggio.grande, overflow: 'hidden', aspectRatio: 1.3, minHeight: 250, maxHeight: 400, backgroundColor: '#17181B', justifyContent: 'flex-end' },
  copertinaTesto: { padding: spazio.tre + 4, gap: 6 },
  copertinaTitolo: { fontFamily: F.extra, fontSize: 28, lineHeight: 32, letterSpacing: -0.8, color: '#FFFFFF' },
  copertinaSotto: { fontFamily: F.medio, fontSize: 15, lineHeight: 22, color: 'rgba(255,255,255,0.88)' },
  cifraChiara: { fontFamily: F.extra, color: '#FFFFFF' },
  etichettaLink: { fontFamily: F.extra, fontSize: 12, letterSpacing: 0.8 },
  // Due schede affiancate dove c'e' posto, una sull'altra su un telefono.
  coppia: { flexDirection: 'row', flexWrap: 'wrap', gap: spazio.tre },
  meta: { flexGrow: 1, flexBasis: 280, minWidth: 240, gap: spazio.tre },
  testaCarta: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre - 4 },
  etichettaCarta: { fontFamily: F.bold, fontSize: 14 },
  corpo: { fontFamily: F.medio, fontSize: 14, lineHeight: 21 },
  piccolo: { fontFamily: F.medio, fontSize: 12.5, lineHeight: 17 },
  link: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, paddingHorizontal: spazio.tre, paddingVertical: 12 },
  linkTesto: { fontFamily: F.semi, fontSize: 14.5 },
  riga: { flexDirection: 'row', gap: spazio.due },
  passo: { flexDirection: 'row', gap: spazio.tre },
  passoAsse: { alignItems: 'center', width: 30 },
  passoCerchio: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  passoNumero: { fontFamily: F.extra, fontSize: 14, color: '#FFFFFF' },
  passoFilo: { width: 2, flex: 1, marginTop: 4, borderRadius: 1 },
  passoTesto: { flex: 1, gap: 3, paddingTop: 4 },
  passoTitolo: { fontFamily: F.bold, fontSize: 15, lineHeight: 21 },
  regola: { flexDirection: 'row', gap: spazio.tre, alignItems: 'flex-start' },
})
