import { router } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { storicoPrenotazioni, type EsitoPrenotazione, type PrenotazionePassata, type StoricoPrenotazioni } from '@/api/lab'
import { spazio } from '@/theme'
import { locale, t } from '@/lib/lingua'

import { Icona, type NomeIcona } from '../ui/Icona'
import { inMemoria, prendi } from '../memoria'
import { Bollino, Carta, LinkSezione, Messaggio, Pulsante, Riga, SchedeInArrivo, Sezione } from '../ui/kit'
import { F, usePalette, velo, coloreTono, type ToniTutti } from '../ui/tema'

// La sezione «Le mie prenotazioni» della Home (09/11/2026, richiesta di Maurizio): lo storico delle prenotazioni degli ultimi 90 giorni
// con il flag se la persona era presente. Lezioni e sedute di personal training, dalla piu' recente.
//
// **Il segno presente/assente c'e' solo per cinque categorie** (10/11/2026, richiesta di Maurizio): Corsi Fitness, Group Reformer, Aqua
// Fitness, Scuola Nuoto Adulti e Nuoto Libero. Lo decide la funzione (`esito: null` per le altre): sono le categorie in cui la presenza
// si segna davvero, e un'assenza dichiarata dove nessuno la segna e' un'informazione sbagliata. Le altre prenotazioni restano in elenco,
// con un'icona neutra e senza pillola; una disdetta si dice per tutte.
//
// **La presenza e' quella del club**, la stessa della scheda del CRM: la segna la reception o il trainer, non la persona. Per questo
// una lezione appena finita non dice «Assente» ma «Da confermare»: l'istruttore ha tre ore dall'inizio per segnarla, e dire a chi
// c'era che non c'era e' un'informazione sbagliata (lo decide la funzione, `_shared/storico/prenotazioni.ts` di APP-ATHLON). Una
// prenotazione disdetta non e' un'assenza e ha il suo esito.
//
// Solo il titolare: le prenotazioni dei figli stanno nella sezione Junior. Le prenotazioni in programma, con «Annulla», restano
// nel Calendario («Le tue prenotazioni»).

export const CHIAVE_STORICO_PRENOTAZIONI = 'prenotazioni:storico'

/** Quante se ne mostrano prima di «Mostra tutte»: in 90 giorni una persona assidua ne ha un centinaio. */
const PRIME = 15

const ESITI: Record<EsitoPrenotazione, { testo: string; tono: ToniTutti; icona: NomeIcona }> = {
  presente: { testo: t('Presente', 'Attended'), tono: 'ok', icona: 'ok' },
  assente: { testo: t('Assente', 'Missed'), tono: 'attenzione', icona: 'no' },
  da_confermare: { testo: t('Da confermare', 'To be confirmed'), tono: 'neutro', icona: 'clessidra' },
  annullata: { testo: t('Annullata', 'Cancelled'), tono: 'neutro', icona: 'chiudi' },
}

export function useStoricoPrenotazioni() {
  const [dati, setDati] = useState<StoricoPrenotazioni | null>(() => {
    const gia = inMemoria<{ ok: true } & StoricoPrenotazioni>(CHIAVE_STORICO_PRENOTAZIONI)
    return gia?.ok ? gia : null
  })
  const [errore, setErrore] = useState<string | null>(null)
  const carica = useCallback(async () => {
    setErrore(null)
    const r = await prendi(CHIAVE_STORICO_PRENOTAZIONI, storicoPrenotazioni)
    if (r.ok) setDati(r)
    else setErrore(r.errore)
  }, [])
  useEffect(() => {
    carica()
  }, [carica])
  return { dati, errore, carica }
}

/** «mar 10 nov», all'ora di Roma. */
function giornoBreve(iso: string): string {
  return new Intl.DateTimeFormat(locale(), { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Rome' }).format(new Date(iso))
}

/** «18:30», all'ora di Roma. */
function ora(iso: string): string {
  return new Intl.DateTimeFormat(locale(), { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Europe/Rome' }).format(new Date(iso))
}

/** La sala, se dice qualcosa: niente se ripete il nome dell'attivita' («Gym Floor» sotto «Allenamento Gym Floor»). */
function salaDi(x: PrenotazionePassata): string | null {
  const s = x.sala?.trim()
  if (!s || x.nome.toLowerCase().includes(s.toLowerCase())) return null
  return s
}

function Pillola({ esito }: { esito: EsitoPrenotazione }) {
  const pal = usePalette()
  const e = ESITI[esito]
  return (
    <View style={[stili.pillola, { backgroundColor: velo(pal, e.tono, 0.16) }]}>
      <Text style={[stili.pillolaTesto, { color: coloreTono(pal, e.tono) }]}>{e.testo}</Text>
    </View>
  )
}

function RigaPrenotazione({ x, prima }: { x: PrenotazionePassata; prima: boolean }) {
  // Senza esito: la prenotazione si vede, senza il segno (icona neutra e nessuna pillola).
  const e = x.esito ? ESITI[x.esito] : null
  const sotto = [`${giornoBreve(x.inizio)} · ${ora(x.inizio)}`, salaDi(x), x.istruttore ? t(`con ${x.istruttore}`, `with ${x.istruttore}`) : null].filter((v): v is string => !!v).join(' · ')
  return <Riga prima={prima} icona={e?.icona ?? 'calendario'} tono={e?.tono ?? 'neutro'} titolo={x.nome} sotto={sotto} coda={x.esito ? <Pillola esito={x.esito} /> : undefined} />
}

/** Una cifra col suo nome, con il segno dell'esito: la colonna di un riepilogo. */
function Cifra({ valore, nome, esito }: { valore: number; nome: string; esito: EsitoPrenotazione }) {
  const pal = usePalette()
  const e = ESITI[esito]
  return (
    <View style={stili.cifra} accessible accessibilityLabel={`${valore} ${nome}`}>
      <Bollino icona={e.icona} tono={e.tono} size={32} />
      <Text style={[stili.cifraValore, { color: pal.testo }]}>{valore}</Text>
      <Text style={[stili.cifraNome, { color: pal.testoSecondario }]} numberOfLines={1}>
        {nome}
      </Text>
    </View>
  )
}

export function SezionePrenotazioni() {
  const pal = usePalette()
  const { dati, errore, carica } = useStoricoPrenotazioni()
  const [tutte, setTutte] = useState(false)

  if (!dati && errore) {
    return (
      <View style={{ gap: spazio.tre }}>
        <Messaggio>{errore}</Messaggio>
        <Pulsante testo={t('Riprova', 'Try again')} icona="aggiorna" variante="secondario" onPress={carica} />
      </View>
    )
  }
  if (!dati) return <SchedeInArrivo quante={2} />

  if (!dati.voci.length) {
    return (
      <View style={{ gap: spazio.tre }}>
        <Carta piatta>
          <Text style={{ color: pal.testo, fontFamily: F.semi, fontSize: 15, lineHeight: 22 }}>{t(`Non hai prenotazioni negli ultimi ${dati.giorni} giorni.`, `You have no bookings in the last ${dati.giorni} days.`)}</Text>
          <Text style={{ color: pal.testoSecondario, fontFamily: F.medio, fontSize: 13.5, lineHeight: 20, marginTop: 4 }}>
            {t('Le lezioni a cui ti prenoti compaiono qui, con il segno di quelle a cui sei stato presente.', 'The classes you book show up here, marked with the ones you attended.')}
          </Text>
        </Carta>
        <Pulsante testo={t('Prenota una lezione', 'Book a class')} icona="calendario" variante="secondario" onPress={() => router.push('/calendario')} />
      </View>
    )
  }

  const visibili = tutte ? dati.voci : dati.voci.slice(0, PRIME)
  return (
    <View style={{ gap: spazio.quattro }}>
      <Carta>
        <Text style={[stili.riepilogoTitolo, { color: pal.testoSecondario }]}>{t(`Ultimi ${dati.giorni} giorni`, `Last ${dati.giorni} days`)}</Text>
        <View style={stili.cifre}>
          <Cifra valore={dati.presenze} nome={dati.presenze === 1 ? t('presenza', 'attended') : t('presenze', 'attended')} esito="presente" />
          <Cifra valore={dati.assenze} nome={dati.assenze === 1 ? t('assenza', 'missed') : t('assenze', 'missed')} esito="assente" />
          <Cifra valore={dati.annullate} nome={dati.annullate === 1 ? t('annullata', 'cancelled') : t('annullate', 'cancelled')} esito="annullata" />
        </View>
      </Carta>

      <Sezione
        titolo={t('Le mie prenotazioni', 'My bookings')}
        conteggio={dati.voci.length}
        destra={dati.voci.length > PRIME ? <LinkSezione testo={tutte ? t('Mostra meno', 'Show less') : t('Mostra tutte', 'Show all')} onPress={() => setTutte(!tutte)} /> : undefined}
      >
        <Carta style={{ paddingVertical: spazio.due }}>
          {visibili.map((x, i) => (
            <RigaPrenotazione key={`${x.tipo}-${x.id}`} x={x} prima={i === 0} />
          ))}
        </Carta>
      </Sezione>

      <View style={stili.legenda}>
        <Icona nome="info" size={14} colore={pal.testoTerzo} />
        <Text style={{ flex: 1, color: pal.testoTerzo, fontFamily: F.medio, fontSize: 13, lineHeight: 19 }}>
          {t(
            'La presenza la segna il club e si mostra per Corsi Fitness, Group Reformer, Aqua Fitness, Scuola Nuoto Adulti e Nuoto Libero. «Da confermare» vuol dire che c’è ancora tempo per segnarla: passato quel tempo diventa «Presente» o «Assente». Una prenotazione disdetta non conta fra le assenze.',
            'Attendance is recorded by the club and shown for Corsi Fitness, Group Reformer, Aqua Fitness, Scuola Nuoto Adulti and Nuoto Libero. “To be confirmed” means there is still time to record it: once that time has passed it becomes “Attended” or “Missed”. A cancelled booking doesn’t count as missed.',
          )}
        </Text>
      </View>
    </View>
  )
}

const stili = StyleSheet.create({
  pillola: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  pillolaTesto: { fontFamily: F.extra, fontSize: 11.5 },
  riepilogoTitolo: { fontFamily: F.bold, fontSize: 13, marginBottom: spazio.tre },
  cifre: { flexDirection: 'row', gap: spazio.tre },
  cifra: { flex: 1, minWidth: 0, alignItems: 'flex-start', gap: 4 },
  cifraValore: { fontFamily: F.extra, fontSize: 28, letterSpacing: -0.8, marginTop: 4 },
  cifraNome: { fontFamily: F.semi, fontSize: 12.5 },
  legenda: { flexDirection: 'row', gap: 8, paddingHorizontal: 4, alignItems: 'flex-start' },
})
