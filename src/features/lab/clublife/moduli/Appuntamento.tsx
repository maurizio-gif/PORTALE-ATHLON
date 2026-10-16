import { useCallback, useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

import type { Calendario, GiornoPrenotabile } from '@/api/appuntamenti'
import { orariLiberi, prenotaDesk, prenotaNuoto } from '@/api/moduli'
import { controllaTelefono } from '@/lib/anagrafica'
import { spazio } from '@/theme'

import { CampoTesto } from '../../ui/Campi'
import { Carta, Messaggio, Pulsante, SchedeInArrivo } from '../../ui/kit'
import { F, raggio, usePalette, velo } from '../../ui/tema'
import { Tocco } from '../../ui/Tocco'
import { giornoEvento } from '../comune'
import { Cornice, DaDoveParti, Fatto, Pillole } from './Cornice'
import { inVista, useIdentita } from './identita'

// L'appuntamento telefonico: col desk, o col Direttore Tecnico del nuoto. Sono
// due calendari perche' sono due persone, ma il modulo e' lo stesso: scegli un
// giorno e un orario, controlli i dati (gia' scritti: la persona e' dentro
// l'app), e invii. Cambiano solo la domanda finale — di cosa vuoi parlare, e per
// il Direttore Tecnico di quale bambino — e il calendario da cui si leggono gli
// orari.

const TESTI: Record<Calendario, { sopra: string; titolo: string; sotto: string; durata: string }> = {
  desk: {
    sopra: 'Il desk',
    titolo: 'Prenota una chiamata',
    sotto: 'Scegli quando ti richiamiamo. Ti basta dirci di cosa vuoi parlare.',
    durata: 'La telefonata dura circa dieci minuti.',
  },
  nuoto: {
    sopra: 'Direzione Tecnica del nuoto',
    titolo: 'Parla col Direttore Tecnico',
    sotto: 'Una telefonata di dieci minuti, riservata alle famiglie dei corsi di nuoto.',
    durata: 'Riceve dal lunedì al venerdì, nell’ora che vedi negli orari.',
  },
}

const ALTRO = '__altro'

function Giorni({ giorni, scelto, onScegli }: { giorni: GiornoPrenotabile[]; scelto: string | null; onScegli: (d: string) => void }) {
  const p = usePalette()
  return (
    <View style={{ gap: spazio.due }}>
      <Text style={[stili.etichetta, { color: p.testoSecondario }]}>GIORNO</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spazio.due }} accessibilityRole="radiogroup">
        {giorni.map((g) => {
          const sceltoQui = g.data === scelto
          const posti = g.slot.length
          return (
            <Tocco
              key={g.data}
              onPress={() => onScegli(g.data)}
              ruolo="radio"
              etichetta={`${g.etichetta}, ${posti} ${posti === 1 ? 'orario' : 'orari'}`}
              stato={{ selected: sceltoQui }}
              vibra="scelta"
              scala={0.96}
              style={[stili.giorno, { borderColor: sceltoQui ? p.accento : p.linea, backgroundColor: sceltoQui ? velo(p, 'accento', 0.14) : p.carta }]}
            >
              <Text style={[stili.giornoNome, { color: sceltoQui ? p.accento : p.testo }]}>{g.etichetta}</Text>
              <Text style={[stili.giornoPosti, { color: p.testoSecondario }]}>{posti === 1 ? 'ultimo orario' : `${posti} orari`}</Text>
            </Tocco>
          )
        })}
      </ScrollView>
    </View>
  )
}

function Orari({ slot, scelto, onScegli }: { slot: string[]; scelto: string | null; onScegli: (o: string) => void }) {
  const p = usePalette()
  return (
    <View style={{ gap: spazio.due }}>
      <Text style={[stili.etichetta, { color: p.testoSecondario }]}>ORARIO</Text>
      <View style={stili.orari} accessibilityRole="radiogroup">
        {slot.map((o) => {
          const sceltoQui = o === scelto
          return (
            <Tocco
              key={o}
              onPress={() => onScegli(o)}
              ruolo="radio"
              etichetta={o}
              stato={{ selected: sceltoQui }}
              vibra="scelta"
              scala={0.95}
              style={[stili.ora, { borderColor: sceltoQui ? p.accento : p.linea, backgroundColor: sceltoQui ? p.accento : p.carta }]}
            >
              <Text style={[stili.oraTesto, { color: sceltoQui ? '#fff' : p.testo }]}>{o}</Text>
            </Tocco>
          )
        })}
      </View>
    </View>
  )
}

export function Appuntamento({ calendario, emailAccesso, oggettoIniziale = '' }: { calendario: Calendario; emailAccesso?: string | null; oggettoIniziale?: string }) {
  const t = TESTI[calendario]
  const pal = usePalette()
  const identita = useIdentita(emailAccesso)
  const [orari, setOrari] = useState<{ giorni: GiornoPrenotabile[] } | null>(null)
  const [erroreOrari, setErroreOrari] = useState<string | null>(null)
  const [giorno, setGiorno] = useState<string | null>(null)
  const [ora, setOra] = useState<string | null>(null)
  const [telefono, setTelefono] = useState<string | null>(null)
  const [oggetto, setOggetto] = useState(oggettoIniziale)
  // Il bambino (solo Direttore Tecnico): uno dei figli, o «un altro».
  const [figlio, setFiglio] = useState<string | null>(null)
  const [altroNome, setAltroNome] = useState('')
  const [altroCognome, setAltroCognome] = useState('')
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [fatto, setFatto] = useState<{ data: string; ora: string } | null>(null)

  const leggi = useCallback(async () => {
    setErroreOrari(null)
    const r = await orariLiberi(calendario)
    if (r.ok) setOrari({ giorni: r.giorni })
    else setErroreOrari(r.errore)
  }, [calendario])

  useEffect(() => {
    leggi()
  }, [leggi])

  const giornoScelto = orari?.giorni.find((g) => g.data === giorno) ?? null
  const figli = identita?.figli ?? []
  // Con un figlio solo e' lui; con piu' di uno si sceglie; senza, si scrive.
  const figlioAttivo = figlio ?? (figli.length === 1 ? '0' : figli.length ? null : ALTRO)
  const opzioniFiglio = [...figli.map((f, i) => ({ id: String(i), testo: f.nome || f.cognome })), { id: ALTRO, testo: 'Un altro bambino' }]

  async function invia() {
    if (!identita || inCorso) return
    setErrore(null)
    if (!giorno || !ora) return setErrore('Scegli un giorno e un orario.')
    const tel = controllaTelefono(telefono ?? identita.telefono)
    if (!tel.ok) return setErrore('Controlla il numero di cellulare: serve a chi ti chiama.')
    const base = { data: giorno, ora, email: identita.email, nome: identita.nome, cognome: identita.cognome, telefono: tel.valore }
    setInCorso(true)
    let esito
    if (calendario === 'desk') {
      if (!oggetto.trim()) {
        setInCorso(false)
        return setErrore('Dicci di cosa vuoi parlare: serve a chi ti chiama.')
      }
      esito = await prenotaDesk({ ...base, oggetto: oggetto.trim() })
    } else {
      const bimbo = figlioAttivo === ALTRO || figlioAttivo === null ? { nome: altroNome.trim(), cognome: altroCognome.trim() } : figli[Number(figlioAttivo)]
      if (!bimbo?.nome || !bimbo?.cognome) {
        setInCorso(false)
        return setErrore('Serve il nome e il cognome del bambino di cui parliamo.')
      }
      if (!oggetto.trim()) {
        setInCorso(false)
        return setErrore('Scrivi, anche in due parole, cosa vuoi chiedere.')
      }
      esito = await prenotaNuoto({ ...base, minore: bimbo, motivo: oggetto.trim() })
    }
    setInCorso(false)
    if (esito.ok) return setFatto({ data: esito.data, ora: esito.ora })
    setErrore(esito.errore)
    // Quell'orario lo ha preso un altro: si rileggono gli orari e si sceglie di nuovo.
    if (esito.slotOccupato) {
      setOra(null)
      leggi()
    }
  }

  if (fatto) {
    return (
      <Cornice sopratitolo={t.sopra} titolo={t.titolo}>
        <Fatto titolo="Appuntamento fissato">
          {`${giornoEvento(`${fatto.data}T00:00:00Z`)} alle ${fatto.ora}. Ti mandiamo la conferma a ${identita?.email ?? 'la tua email'}, con il link per spostarlo o annullarlo.`}
        </Fatto>
      </Cornice>
    )
  }

  return (
    <Cornice sopratitolo={t.sopra} titolo={t.titolo} sottotitolo={t.sotto}>
      {erroreOrari ? (
        <View style={{ gap: spazio.tre }}>
          <Messaggio>{erroreOrari}</Messaggio>
          <Pulsante testo="Riprova" icona="aggiorna" onPress={leggi} />
        </View>
      ) : !orari || !identita ? (
        <SchedeInArrivo quante={1} />
      ) : !orari.giorni.length ? (
        <Messaggio tono="attenzione">Per ora non ci sono orari liberi. Riprova fra qualche giorno.</Messaggio>
      ) : (
        <>
          <Giorni giorni={orari.giorni} scelto={giorno} onScegli={(d) => (setGiorno(d), setOra(null))} />
          {giornoScelto ? <Orari slot={giornoScelto.slot} scelto={ora} onScegli={setOra} /> : null}
          <Text style={[stili.nota, { color: pal.testoSecondario }]}>{t.durata}</Text>

          {calendario === 'nuoto' ? (
            <>
              <Pillole etichetta="Di quale bambino parliamo" opzioni={opzioniFiglio} valore={figlioAttivo} onScegli={setFiglio} />
              {figlioAttivo === ALTRO || figlioAttivo === null ? (
                <Carta piatta style={{ gap: spazio.tre }}>
                  <CampoTesto etichetta="Nome del bambino" value={altroNome} onChangeText={setAltroNome} autoCapitalize="words" autoComplete="off" />
                  <CampoTesto etichetta="Cognome del bambino" value={altroCognome} onChangeText={setAltroCognome} autoCapitalize="words" autoComplete="off" />
                </Carta>
              ) : null}
            </>
          ) : null}

          <CampoTesto
            etichetta={calendario === 'desk' ? 'Di cosa vuoi parlare' : 'Cosa vuoi chiedere'}
            value={oggetto}
            onChangeText={setOggetto}
            multiline
            numberOfLines={3}
            maxLength={500}
            style={{ minHeight: 72, textAlignVertical: 'top' }}
            placeholder={calendario === 'desk' ? 'In due parole' : 'Ad esempio: il livello di mia figlia'}
          />
          <CampoTesto
            etichetta="Cellulare per la chiamata"
            icona="telefono"
            value={telefono ?? identita.telefono}
            onChangeText={setTelefono}
            keyboardType="phone-pad"
            autoComplete="tel"
          />
          <DaDoveParti email={identita.email} />

          {errore ? <Messaggio>{errore}</Messaggio> : null}
          <Pulsante testo="Fissa l’appuntamento" icona="avanti" onPress={invia} inCorso={inCorso} disabilitato={inVista()} />
        </>
      )}
    </Cornice>
  )
}

const stili = StyleSheet.create({
  etichetta: { fontFamily: F.extra, fontSize: 11.5, letterSpacing: 1.2 },
  giorno: { borderWidth: 1.5, borderRadius: raggio.piccolo, paddingHorizontal: spazio.tre - 2, paddingVertical: 10, minWidth: 128, gap: 2 },
  giornoNome: { fontFamily: F.extra, fontSize: 14.5, lineHeight: 19 },
  giornoPosti: { fontFamily: F.medio, fontSize: 12.5 },
  orari: { flexDirection: 'row', flexWrap: 'wrap', gap: spazio.due },
  ora: { borderWidth: 1.5, borderRadius: raggio.piccolo, minWidth: 76, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spazio.tre - 4 },
  oraTesto: { fontFamily: F.bold, fontSize: 15 },
  nota: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
})
