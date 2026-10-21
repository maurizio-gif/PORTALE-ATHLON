import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { statoInvito, type Amico, type StatoInvito } from '@/api/referral'
import { spazio } from '@/theme'

import { inMemoria, prendi } from '../memoria'
import { Bollino, Carta, Etichetta, Messaggio, Pulsante, Riga, SchedeInArrivo, Sezione } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, usePalette, type ToniTutti } from '../ui/tema'
import { vistaCorrente } from '../vista'
import { manda, smsDisponibile, type Canale } from './condividi'

// «Invita un amico» (21/10/2026, richiesta di Maurizio): il link personale del socio, i quattro modi di mandarlo
// (WhatsApp, email, SMS, copia) e gli amici che l'hanno accettato. Chi apre il link fa la procedura del Guest Pass
// (pagina pubblica /invito/<codice>), che con l'invito costa 5 € invece di 19 (21/10/2026), e resta abbinato a chi l'ha
// invitato per 30 giorni.
//
// Le regole dette qui sono quelle della migrazione 20261021a di APP-ATHLON, e i due numeri (30 giorni, 50 €) arrivano
// dalla funzione. **Non si nomina il vantaggio della quota di attivazione** per chi continua dopo la prova: il club lo
// svela solo dopo che l'amico ha attivato la prova (decisione del 21/10/2026).

export const CHIAVE_INVITO = 'referral:stato'

function giorno(iso: string | null): string {
  if (!iso) return ''
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00Z`) : new Date(iso)
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', timeZone: 'Europe/Rome' })
}

/** Lo stato dell'amico in una riga: da dove viene e cosa succede dopo. */
function racconto(a: Amico): { testo: string; tono: ToniTutti } {
  switch (a.stato) {
    case 'iscritto':
      return { testo: `Si è iscritto il ${giorno(a.firmato_il)} · il tuo voucher è in arrivo`, tono: 'ok' }
    case 'in_prova':
      return { testo: `In prova fino al ${giorno(a.prova_fine)}`, tono: 'blu' }
    case 'prova_finita':
      return { testo: `Prova finita · può iscriversi fino al ${giorno(a.ultimo_giorno)}`, tono: 'attenzione' }
    case 'scaduto':
      return { testo: 'Invito scaduto', tono: 'neutro' }
    default:
      return { testo: `Ha accettato · ha tempo fino al ${giorno(a.ultimo_giorno)}`, tono: 'accento' }
  }
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
    if (r === 'copiato') setEsito('Link copiato: incollalo dove vuoi.')
    else if (r === 'errore') setEsito('Non riusciamo ad aprirlo da qui: copia il link e incollalo a mano.')
  }

  const intestazione = { titolo: 'Invita un amico', sopratitolo: 'Allenati in compagnia', indietro: '/' as const, barra: false }

  if (vista) {
    return (
      <Schermata {...intestazione}>
        <Messaggio tono="attenzione" titolo="Vista cliente">
          L’invito lo manda solo il socio, dal suo telefono: da qui non si crea il suo link.
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
        <Pulsante testo="Riprova" icona="aggiorna" variante="secondario" onPress={carica} />
      </Schermata>
    )
  }

  if (!stato.idoneo) {
    return (
      <Schermata {...intestazione}>
        <Messaggio tono="attenzione" titolo="Per ora non puoi invitare">
          {stato.motivo || 'Puoi invitare un amico quando hai un abbonamento in corso.'}
        </Messaggio>
      </Schermata>
    )
  }

  return (
    <Schermata {...intestazione} sottotitolo="Manda il tuo link a chi vuoi: lo apre dal telefono, senza installare niente.">
      <Carta style={{ gap: spazio.tre }}>
        <View style={stili.testa}>
          <Bollino icona="regalo" tono="accento" size={48} pieno />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[stili.titolo, { color: p.testo }]}>Porta un amico al club</Text>
            <Text style={[stili.corpo, { color: p.testoSecondario }]}>
              Con il tuo invito il tuo amico prova il club per una settimana pagando solo {stato.prezzo_prova} € invece di {stato.prezzo_pieno}, oppure si
              iscrive subito. Se si iscrive, ricevi un voucher da {stato.voucher} € sul tuo abbonamento.
            </Text>
          </View>
        </View>
        <View style={[stili.link, { backgroundColor: p.fondo, borderColor: p.linea }]}>
          <Text style={[stili.linkTesto, { color: p.testo }]} selectable numberOfLines={1}>
            {stato.link.replace(/^https:\/\//, '')}
          </Text>
        </View>
        <Pulsante testo="Manda su WhatsApp" icona="invia" onPress={() => premi('whatsapp')} inCorso={canale === 'whatsapp'} />
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
        <Pulsante testo="Copia il link" icona="copia" variante="contorno" onPress={() => premi('copia')} inCorso={canale === 'copia'} />
        {esito ? <Messaggio tono="ok">{esito}</Messaggio> : null}
      </Carta>

      <Sezione titolo="Come funziona">
        <Carta piatta style={{ gap: spazio.due }}>
          {[
            'Il tuo amico apre il link, lascia la sua email e i suoi dati, e riceve il link per completare.',
            `Ha ${stato.giorni} giorni da quando accetta l’invito per iscriversi. Se nel frattempo comincia la settimana di prova, può iscriversi fino al giorno dopo la fine della prova.`,
            `Quando si iscrive, la segreteria carica il voucher da ${stato.voucher} € sul tuo abbonamento.`,
            'Vale per chi non ha avuto abbonamenti o Guest Pass al club negli ultimi 3 anni. Se il tuo amico accetta prima l’invito di un altro socio, vale quello.',
          ].map((t, i) => (
            <View key={i} style={stili.punto}>
              <Text style={[stili.numero, { color: p.accento }]}>{i + 1}</Text>
              <Text style={[stili.corpo, { color: p.testoSecondario, flex: 1 }]}>{t}</Text>
            </View>
          ))}
        </Carta>
      </Sezione>

      <Sezione titolo="I tuoi inviti" conteggio={stato.inviti.length || undefined}>
        {stato.inviti.length ? (
          <Carta piatta style={{ paddingVertical: 0 }}>
            {stato.inviti.map((a, i) => {
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
                      <Text style={[stili.piccolo, { color: p.testoTerzo }]}>Accettato il {giorno(a.accettato_il)}</Text>
                    </View>
                  }
                />
              )
            })}
          </Carta>
        ) : (
          <Carta piatta>
            <Text style={[stili.corpo, { color: p.testoSecondario }]}>Quando un amico accetta il tuo invito lo vedi qui, con i giorni che gli restano.</Text>
          </Carta>
        )}
      </Sezione>
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
