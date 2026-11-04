import { Text, View } from 'react-native'

import { t, tv } from '@/lib/lingua'
import { spazio } from '@/theme'

import { Icona } from '../ui/Icona'
import { Tocco } from '../ui/Tocco'
import { F, usePalette } from '../ui/tema'
import type { TemaJunior } from './store'

// Il benvenuto della chat nella sezione Junior (04/11/2026, richiesta di Maurizio: «testo fisso»). Il genitore che ha appena registrato il
// figlio dal sito arriva qui dal link dell'email, con la chat gia' aperta: invece dei suggerimenti generici (prenotare, pagare, metodo di
// pagamento) trova due righe sul corso, scritte da noi e prese dall'Help Desk e dalle pagine del sito (`data/junior.ts` di SITO-ATHLON),
// e le domande che si fanno di solito. Il testo e' fisso di proposito: e' la prima cosa che il genitore legge, e non deve poter sbagliare.
// Le risposte alle domande le da' l'assistente, con le sue fonti. Se le pagine del corso cambiano (fascia d'eta', durata, turni), va
// cambiato anche qui.

type Testo = { titolo: string; righe: string[]; domande: string[] }

function testi(tema: TemaJunior): Testo {
  const chi = tema.nome || t('tuo figlio', 'your child')
  if (tema.corso === 'baby') {
    return tema.iscritto
      ? {
          titolo: t(`Come posso aiutarti con il Baby Nuoto di ${chi}?`, `How can I help with ${chi}’s Baby Swimming?`),
          righe: [],
          domande: tv(
            ['Come prenoto la prossima lezione?', 'Cosa devo portare in piscina?', 'Come disdico una lezione?'],
            ['How do I book the next class?', 'What should I bring to the pool?', 'How do I cancel a class?'],
          ),
        }
      : {
          titolo: t(`Il Baby Nuoto per ${chi}`, `Baby Swimming for ${chi}`),
          righe: tv(
            [
              'È il corso dei più piccoli, dai 3 mesi: 40 minuti in acqua insieme a te, con lo staff che guida i movimenti. È un corso ludico-didattico, e rafforza il legame fra voi.',
              'I gruppi sono due, per età: fino ai 15 mesi e oltre i 15 mesi. Non c’è un turno fisso: le lezioni si prenotano una alla volta, da qui sotto, scegliendo quella che preferisci.',
              'Puoi prendere l’abbonamento mensile o la lezione singola: i prezzi li trovi sotto, prima di confermare.',
            ],
            [
              'It’s the course for the little ones, from 3 months: 40 minutes in the water together with you, with our staff guiding the movements. It’s playful and educational, and strengthens your bond.',
              'There are two groups by age: up to 15 months and over 15 months. There’s no fixed slot: you book one class at a time, from below, choosing the one you prefer.',
              'You can take the monthly membership or a single class: prices are shown below, before you confirm.',
            ],
          ),
          domande: tv(
            ['Come si svolge una lezione di Baby Nuoto?', 'Cosa devo portare in piscina?', 'Come prenoto la prima lezione?'],
            ['What is a Baby Swimming class like?', 'What should I bring to the pool?', 'How do I book the first class?'],
          ),
        }
  }
  if (tema.corso === 'snb') {
    return tema.iscritto
      ? {
          titolo: t(`Come posso aiutarti con la Scuola Nuoto di ${chi}?`, `How can I help with ${chi}’s Swimming School?`),
          righe: [],
          domande: tv(
            ['Come recupero una lezione persa?', 'Come vedo i progressi e i brevetti?', 'Posso cambiare orario?'],
            ['How do I make up a missed class?', 'How do I see progress and badges?', 'Can I change the time slot?'],
          ),
        }
      : {
          titolo: t(`La Scuola Nuoto per ${chi}`, `Swimming School for ${chi}`),
          righe: tv(
            [
              'Da oltre 50 anni è la nostra scuola nuoto federale. Prima costruiamo il rapporto di tuo figlio con l’acqua: i risultati arrivano da lì.',
              'I turni sono divisi per età e, dentro lo stesso orario, i bambini sono divisi in gruppi per livello, ognuno con il suo percorso. Il gruppo e l’istruttore si definiscono nella prima settimana, guardando come nuota. Il genitore non entra in vasca.',
              'Il turno che scegli resta quello per tutta la stagione; una lezione persa si recupera. I progressi e i brevetti li vedi qui nell’app, e a fine stagione c’è il brevetto della nostra Scuola Nuoto Federale.',
              'Qui sotto trovi i turni ancora disponibili per il suo anno di nascita, con i prezzi: lo iscrivi da qui, firma e pagamento compresi.',
            ],
            [
              'Our federal swimming school has been running for over 50 years. First we build your child’s relationship with the water: results come from there.',
              'Slots are split by age and, within the same slot, children are split into groups by level, each with its own path. The group and instructor are set in the first week, by watching how they swim. Parents don’t enter the pool.',
              'The slot you choose stays the same for the whole season; a missed class can be made up. Progress and badges are shown here in the app, and at the end of the season there’s our federal Swimming School badge.',
              'Below you’ll find the slots still available for their year of birth, with prices: you enrol from here, signature and payment included.',
            ],
          ),
          domande: tv(
            ['Come funziona la Scuola Nuoto?', 'Come sono divisi i gruppi e i livelli?', 'Quanto costa e cosa comprende?', 'Se salta una lezione come la recupero?'],
            ['How does the Swimming School work?', 'How are groups and levels organised?', 'How much does it cost and what’s included?', 'If we miss a class, how do we make it up?'],
          ),
        }
  }
  return {
    titolo: t('I corsi per bambini e ragazzi', 'Courses for children and teens'),
    righe: [],
    domande: tv(
      ['Quali corsi ci sono per mio figlio?', 'Come funziona l’iscrizione?', 'Come recupero una lezione persa?'],
      ['Which courses are there for my child?', 'How does enrolment work?', 'How do I make up a missed class?'],
    ),
  }
}

export function BenvenutoJunior({ tema, onManda }: { tema: TemaJunior; onManda: (domanda: string) => void }) {
  const p = usePalette()
  const x = testi(tema)
  return (
    <View style={{ gap: spazio.tre }}>
      <View style={{ gap: spazio.due, padding: spazio.tre, borderRadius: 16, borderWidth: 1, borderColor: p.linea, backgroundColor: p.fondo }}>
        <Text style={{ color: p.testo, fontFamily: F.semi, fontSize: 16, lineHeight: 22 }}>{x.titolo}</Text>
        {x.righe.map((r) => (
          <Text key={r} style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 15, lineHeight: 21 }}>
            {r}
          </Text>
        ))}
      </View>
      <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 15, lineHeight: 21 }}>{t('Chiedimi, per esempio:', 'Ask me, for example:')}</Text>
      <View style={{ gap: spazio.due }}>
        {x.domande.map((d) => (
          <Tocco
            key={d}
            onPress={() => onManda(d)}
            etichetta={d}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: p.linea, backgroundColor: p.fondo }}
          >
            <Text style={{ color: p.testo, fontFamily: F.medio, fontSize: 15, lineHeight: 21, flex: 1 }}>{d}</Text>
            <Icona nome="avanti" size={14} colore={p.testoTerzo} />
          </Tocco>
        ))}
      </View>
    </View>
  )
}
