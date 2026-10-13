import { Link } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'

import { labRichiediGuestPass } from '@/api/guestPass'
import { laMiaArea, type PersonaArea } from '@/api/lab'
import { Avviso } from '@/components/Avviso'
import { Bottone } from '@/components/Bottone'
import { Pagina } from '@/components/Pagina'
import { Testo } from '@/components/Testo'
import { spazio, useColori } from '@/theme'

// Il Guest Pass nuovo, in prova dal laboratorio: si chiede per una persona
// della famiglia, e il link arriva all'email del tester (in produzione arriva
// all'email di chi lo chiede, da /richiesta/guest-pass). Chi non puo' averlo
// (un abbonamento dopo il 2023, o un Guest Pass gia' fatto) lo dice la funzione.
export function GuestPassLab({ email }: { email: string }) {
  const c = useColori()
  const [persone, setPersone] = useState<PersonaArea[] | null>(null)
  const [esiti, setEsiti] = useState<Record<number, { testo: string; tono: 'ok' | 'errore' }>>({})
  const [occupato, setOccupato] = useState<number | null>(null)

  useEffect(() => {
    laMiaArea().then((r) => setPersone(r.ok && r.area.trovato ? r.area.persone : []))
  }, [])

  async function chiedi(p: PersonaArea) {
    setOccupato(p.member_id)
    const r = await labRichiediGuestPass(p.member_id)
    setOccupato(null)
    setEsiti((e) => ({
      ...e,
      [p.member_id]: r.ok ? { testo: `Fatto: il link per attivarlo è partito a ${email}.`, tono: 'ok' } : { testo: r.errore, tono: 'errore' },
    }))
  }

  return (
    <Pagina titolo="Guest Pass (prova)" sottotitolo="La procedura nuova: link per email, dati, consensi, giorno d’inizio e pagamento.">
      <Avviso tono="attenzione">
        In prova: il Guest Pass si carica davvero su PerfectGym (19 €). Il sito usa ancora la procedura di prima.
      </Avviso>
      <Testo variante="piccolo">
        Chiedilo per una persona della tua famiglia: il link arriva a te. Per provare la richiesta con l’email e la registrazione c’è{' '}
        <Link href="/richiesta/guest-pass" style={{ color: c.accento }}>
          la pagina pubblica
        </Link>
        .
      </Testo>
      {!persone ? (
        <ActivityIndicator color={c.accento} />
      ) : (
        persone.map((p) => (
          <View key={p.member_id} style={{ gap: spazio.uno, borderTopWidth: 1, borderTopColor: c.bordo, paddingTop: spazio.due }}>
            <Testo style={{ fontWeight: '700' }}>{[p.nome, p.cognome].filter(Boolean).join(' ')}</Testo>
            <Bottone testo="Chiedi il Guest Pass" variante="contorno" onPress={() => chiedi(p)} inCorso={occupato === p.member_id} disabilitato={occupato !== null} />
            {esiti[p.member_id] ? <Avviso tono={esiti[p.member_id].tono}>{esiti[p.member_id].testo}</Avviso> : null}
          </View>
        ))
      )}
    </Pagina>
  )
}
