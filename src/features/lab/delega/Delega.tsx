import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { creaLinkDelega, revocaDelega, statoDelega, type DelegaAttiva, type StatoDelega } from '@/api/delega'
import { locale, t, tv } from '@/lib/lingua'
import { spazio } from '@/theme'

import { manda, smsDisponibile, type Canale } from '../invita/condividi'
import { Foglio } from '../ui/Foglio'
import { Bollino, Carta, Messaggio, Pulsante, Riga, SchedeInArrivo, Sezione } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, usePalette } from '../ui/tema'
import { vistaCorrente } from '../vista'

// La delega sui figli a un altro adulto (31/10/2026, richiesta di Maurizio). Il titolare del nucleo genera un link e lo manda
// (WhatsApp, email, SMS o copiandolo, come l'invito di un amico, `invita/`); chi lo apre si registra su /delega/<codice> con
// nome, cognome, email, cellulare e data di nascita, e da quel momento vede e gestisce i figli con lui.
//
// **Il link e' per una persona sola e scade** (la funzione dice quanti giorni): a differenza dell'invito di un amico, che e' un
// codice fisso e innocuo, questo da' accesso ai figli, quindi se qualcuno lo gira a un altro non deve funzionare due volte.
// Ce n'e' uno solo aperto per volta, e chi ne chiede uno nuovo toglie il vecchio. **Le deleghe si tolgono da qui** («Togli
// l'accesso»): una delega che non si puo' ritirare non e' una delega. Chi puo' darla, quante, cosa si scrive su PerfectGym: tutto
// della funzione `portale-lab-delega` (contratto in `docs/delega-nucleo.md`). In vista cliente non c'e' niente.

function giorno(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00Z`) : new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(locale(), { day: 'numeric', month: 'long', timeZone: 'Europe/Rome' })
}

/** «Sara e Luca», «Sara, Luca e Anna»: i figli nominati nelle frasi. */
function elenco(nomi: string[]): string {
  if (nomi.length <= 1) return nomi[0] ?? ''
  return `${nomi.slice(0, -1).join(', ')} ${t('e', 'and')} ${nomi[nomi.length - 1]}`
}

export function Delega() {
  const p = usePalette()
  const vista = vistaCorrente()
  const [stato, setStato] = useState<StatoDelega | undefined>(undefined)
  const [esito, setEsito] = useState<string | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [canale, setCanale] = useState<Canale | null>(null)
  const [creo, setCreo] = useState(false)
  const [togliere, setTogliere] = useState<{ id: string; cosa: 'link' | 'delega'; nome?: string } | null>(null)
  const [tolgo, setTolgo] = useState(false)

  const carica = useCallback(async () => {
    if (vista) return
    setStato(await statoDelega())
  }, [vista])
  useEffect(() => {
    carica()
  }, [carica])

  async function crea() {
    setCreo(true)
    setErrore(null)
    setEsito(null)
    const r = await creaLinkDelega()
    if (!r.ok) {
      setCreo(false)
      return setErrore(r.errore)
    }
    await carica()
    setCreo(false)
  }

  async function premi(c: Canale) {
    if (!stato || !stato.ok || !stato.idoneo || !stato.aperto) return
    setEsito(null)
    setCanale(c)
    const r = await manda(c, stato.aperto.oggetto, stato.aperto.messaggio, stato.aperto.link)
    setCanale(null)
    if (r === 'copiato') setEsito(t('Link copiato: incollalo dove vuoi.', 'Link copied: paste it wherever you like.'))
    else if (r === 'errore') setEsito(t('Non riusciamo ad aprirlo da qui: copia il link e incollalo a mano.', 'We can’t open it from here: copy the link and paste it yourself.'))
  }

  async function conferma() {
    if (!togliere) return
    setTolgo(true)
    setErrore(null)
    const r = await revocaDelega(togliere.id, togliere.cosa)
    setTolgo(false)
    if (!r.ok) {
      setTogliere(null)
      return setErrore(r.errore)
    }
    setEsito(togliere.cosa === 'delega' ? t('Accesso tolto: da ora non vede più i tuoi figli.', 'Access removed: they can no longer see your children.') : t('Link annullato: non si può più usare.', 'Link cancelled: it can no longer be used.'))
    setTogliere(null)
    await carica()
  }

  const intestazione = { titolo: t('Un altro adulto sui tuoi figli', 'Another adult for your children'), sopratitolo: t('Il tuo nucleo', 'Your family'), indietro: '/' as const, barra: false }

  if (vista) {
    return (
      <Schermata {...intestazione}>
        <Messaggio tono="attenzione" titolo={t('Vista cliente', 'Client view')}>
          {t('La delega la dà solo il titolare, dal suo telefono: da qui non si crea il link.', 'Only the account holder can delegate, from their phone: the link can’t be created from here.')}
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
        <Messaggio tono="attenzione" titolo={t('Per ora non puoi', 'Not available yet')}>
          {stato.motivo || t('Puoi dare la delega quando nel tuo nucleo c’è almeno un figlio.', 'You can delegate once your family includes at least one child.')}
        </Messaggio>
      </Schermata>
    )
  }

  const figli = elenco(stato.figli)
  const pieno = stato.attive.length >= stato.massimo

  return (
    <Schermata {...intestazione} sottotitolo={t('Un altro adulto vede e gestisce i tuoi figli con te: gli mandi un link e si registra.', 'Another adult sees and manages your children with you: you send a link and they sign up.')}>
      <Carta style={{ gap: spazio.tre }}>
        <View style={stili.testa}>
          <Bollino icona="famiglia" tono="accento" size={48} pieno />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[stili.titolo, { color: p.testo }]}>{t('Dai accesso a un altro adulto', 'Give another adult access')}</Text>
            <Text style={[stili.corpo, { color: p.testoSecondario }]}>
              {figli
                ? t(`Chi riceve il link si registra con i suoi dati e da quel momento vede e gestisce ${figli} come te: lezioni, prenotazioni, pagamenti e certificato.`, `Whoever gets the link signs up with their own details and from then on sees and manages ${figli} just like you: classes, bookings, payments and certificate.`)
                : t('Chi riceve il link si registra con i suoi dati e da quel momento vede e gestisce i tuoi figli come te.', 'Whoever gets the link signs up with their own details and from then on sees and manages your children just like you.')}
            </Text>
          </View>
        </View>

        {stato.aperto ? (
          <>
            <View style={[stili.link, { backgroundColor: p.fondo, borderColor: p.linea }]}>
              <Text style={[stili.linkTesto, { color: p.testo }]} selectable numberOfLines={1}>
                {stato.aperto.link.replace(/^https:\/\//, '')}
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
            {stato.aperto.in_attesa ? (
              <Messaggio tono="attenzione">{t('Qualcuno ha già compilato il modulo: deve solo confermare dal link che gli arriva per email. Il link resta valido finché non lo fa.', 'Someone has already filled in the form: they just need to confirm from the link sent to their email. The link stays valid until they do.')}</Messaggio>
            ) : null}
            <Text style={[stili.piccolo, { color: p.testoTerzo }]}>
              {t(`Vale per una persona sola${stato.aperto.scade_il ? ` e fino al ${giorno(stato.aperto.scade_il)}` : ''}. Mandalo solo a chi ti fidi: chi lo apre potrà vedere i tuoi figli.`, `It works for one person only${stato.aperto.scade_il ? ` and until ${giorno(stato.aperto.scade_il)}` : ''}. Only send it to someone you trust: whoever opens it will be able to see your children.`)}
            </Text>
            <Pulsante testo={t('Annulla questo link', 'Cancel this link')} icona="cestino" variante="fantasma" onPress={() => setTogliere({ id: stato.aperto!.id, cosa: 'link' })} />
          </>
        ) : pieno ? (
          <Messaggio tono="attenzione">
            {t(`Hai già ${stato.attive.length} ${stato.attive.length === 1 ? 'persona' : 'persone'} con accesso, che è il massimo. Per darlo a un’altra togli prima l’accesso a una di loro.`, `You already have ${stato.attive.length} ${stato.attive.length === 1 ? 'person' : 'people'} with access, which is the limit. To add someone else, remove one of them first.`)}
          </Messaggio>
        ) : (
          <Pulsante testo={t('Crea il link', 'Create the link')} icona="link" onPress={crea} inCorso={creo} />
        )}
        {esito ? <Messaggio tono="ok">{esito}</Messaggio> : null}
        {errore ? <Messaggio>{errore}</Messaggio> : null}
      </Carta>

      <Sezione titolo={t('Chi ha accesso', 'Who has access')} conteggio={stato.attive.length || undefined}>
        {stato.attive.length ? (
          <Carta piatta style={{ paddingVertical: 0 }}>
            {stato.attive.map((a: DelegaAttiva, i) => (
              <Riga
                key={a.id}
                prima={i === 0}
                icona="persona"
                tono="accento"
                titolo={a.nome}
                sotto={<Text style={[stili.piccolo, { color: p.testoTerzo }]}>{t(`Dal ${giorno(a.dal)}`, `Since ${giorno(a.dal)}`)}</Text>}
                coda={<Pulsante testo={t('Togli', 'Remove')} variante="fantasma" piccolo pieno={false} onPress={() => setTogliere({ id: a.id, cosa: 'delega', nome: a.nome })} />}
              />
            ))}
          </Carta>
        ) : (
          <Carta piatta>
            <Text style={[stili.corpo, { color: p.testoSecondario }]}>{t('Quando qualcuno accetta il tuo link lo vedi qui, e puoi togliere l’accesso quando vuoi.', 'When someone accepts your link you’ll see them here, and you can remove their access whenever you like.')}</Text>
          </Carta>
        )}
      </Sezione>

      <Sezione titolo={t('Come funziona', 'How it works')}>
        <Carta piatta style={{ gap: spazio.due }}>
          {tv([
            'Crei il link e lo mandi alla persona: un genitore, un nonno, chi accompagna i tuoi figli.',
            'Lei lo apre dal telefono e scrive nome, cognome, email, cellulare e data di nascita. Deve essere maggiorenne.',
            `Le mandiamo un’email con un link per confermare: serve a essere sicuri che l’indirizzo sia suo. Se è già iscritta al club la colleghiamo con la sua scheda, altrimenti la registriamo noi. Il link che mandi tu funziona per una persona sola e per ${stato.giorni} giorni.`,
            'Entra nell’app con la sua email e vede i tuoi figli: li vede e può prenotare, disdire e pagare per loro, come te. Tu puoi togliere l’accesso quando vuoi.',
          ], [
            'You create the link and send it to the person: a parent, a grandparent, whoever takes your children to the club.',
            'They open it on their phone and enter first name, last name, email, mobile and date of birth. They must be an adult.',
            `We email them a link to confirm: it makes sure the address is really theirs. If they’re already a club member we link their existing profile, otherwise we register them. The link you send works for one person only and for ${stato.giorni} days.`,
            'They sign in to the app with their email and see your children: they can book, cancel and pay for them, just like you. You can remove their access whenever you like.',
          ]).map((x, i) => (
            <View key={i} style={stili.punto}>
              <Text style={[stili.numero, { color: p.accento }]}>{i + 1}</Text>
              <Text style={[stili.corpo, { color: p.testoSecondario, flex: 1 }]}>{x}</Text>
            </View>
          ))}
        </Carta>
      </Sezione>

      <Foglio
        aperto={!!togliere}
        onChiudi={() => (tolgo ? undefined : setTogliere(null))}
        titolo={togliere?.cosa === 'delega' ? t('Togliere l’accesso?', 'Remove access?') : t('Annullare il link?', 'Cancel the link?')}
        sottotitolo={
          togliere?.cosa === 'delega'
            ? t(`${togliere.nome ?? 'La persona'} non vedrà più i tuoi figli e non potrà più prenotare o pagare per loro.`, `${togliere.nome ?? 'They'} will no longer see your children or be able to book or pay for them.`)
            : t('Chi lo apre dopo non potrà più usarlo. Potrai crearne uno nuovo.', 'Anyone who opens it afterwards won’t be able to use it. You can create a new one.')
        }
      >
        <Pulsante testo={togliere?.cosa === 'delega' ? t('Sì, togli l’accesso', 'Yes, remove access') : t('Sì, annulla il link', 'Yes, cancel the link')} variante="pericolo" onPress={conferma} inCorso={tolgo} />
        <Pulsante testo={t('Lascia com’è', 'Keep it')} variante="contorno" onPress={() => setTogliere(null)} disabilitato={tolgo} />
      </Foglio>
    </Schermata>
  )
}

const stili = StyleSheet.create({
  testa: { flexDirection: 'row', gap: spazio.tre, alignItems: 'flex-start' },
  titolo: { fontFamily: F.extra, fontSize: 19, lineHeight: 24, letterSpacing: -0.4 },
  corpo: { fontFamily: F.medio, fontSize: 14, lineHeight: 21 },
  piccolo: { fontFamily: F.medio, fontSize: 12.5, lineHeight: 17 },
  link: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, paddingHorizontal: spazio.tre, paddingVertical: 12 },
  linkTesto: { fontFamily: F.semi, fontSize: 14.5 },
  riga: { flexDirection: 'row', gap: spazio.due },
  punto: { flexDirection: 'row', gap: spazio.tre, alignItems: 'flex-start' },
  numero: { fontFamily: F.extra, fontSize: 15, lineHeight: 21, width: 14, textAlign: 'center' },
})
