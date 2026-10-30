import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

import type { Calendario, GiornoPrenotabile } from '@/api/appuntamenti'
import { orariLiberi, prenotaDesk, prenotaNuoto } from '@/api/moduli'
import { controllaTelefono } from '@/lib/anagrafica'
import { t } from '@/lib/lingua'
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
    sopra: t('Il desk', 'Front desk'),
    titolo: t('Prenota una chiamata', 'Book a call'),
    sotto: t('Scegli quando ti richiamiamo. Ti basta dirci di cosa vuoi parlare.', 'Choose when we call you back. Just tell us what you’d like to talk about.'),
    durata: t('La telefonata dura circa dieci minuti.', 'The call takes about ten minutes.'),
  },
  nuoto: {
    sopra: t('Direzione Tecnica del nuoto', 'Swimming Technical Director'),
    titolo: t('Parla col Direttore Tecnico', 'Talk to the Technical Director'),
    sotto: t('Una telefonata di dieci minuti, riservata alle famiglie dei corsi di nuoto.', 'A ten-minute call, for families in our swimming courses only.'),
    durata: t('Riceve dal lunedì al venerdì, nell’ora che vedi negli orari.', 'Available Monday to Friday, during the hour shown in the times.'),
  },
}

const ALTRO = '__altro'

/**
 * Il guscio del modulo. Di norma e' la schermata (`Cornice`, con la freccia che torna a Club Life); **dentro la chat dell'assistente** (31/10/2026, la telefonata col desk che l'assistente
 * propone) e' una carta nella conversazione: stesso modulo, stessi campi e stesse regole, ma senza una schermata intera e senza il comando che porta fuori dalla chat.
 */
function Guscio({ incorporato, sopratitolo, titolo, sottotitolo, children }: { incorporato: boolean; sopratitolo: string; titolo: string; sottotitolo?: string; children: ReactNode }) {
  const p = usePalette()
  if (!incorporato) return <Cornice sopratitolo={sopratitolo} titolo={titolo} sottotitolo={sottotitolo}>{children}</Cornice>
  return (
    <View style={{ gap: spazio.tre, width: '100%', minWidth: 0 }}>
      {inVista() ? <Messaggio tono="attenzione">{t('Sei in vista cliente: i moduli non si possono inviare da qui.', 'You’re in client view: forms can’t be sent from here.')}</Messaggio> : null}
      <Text style={[stili.titoloInc, { color: p.testo }]} accessibilityRole="header">{titolo}</Text>
      {sottotitolo ? <Text style={[stili.nota, { color: p.testoSecondario }]}>{sottotitolo}</Text> : null}
      {children}
    </View>
  )
}

function Giorni({ giorni, scelto, onScegli }: { giorni: GiornoPrenotabile[]; scelto: string | null; onScegli: (d: string) => void }) {
  const p = usePalette()
  return (
    <View style={{ gap: spazio.due }}>
      <Text style={[stili.etichetta, { color: p.testoSecondario }]}>{t('GIORNO', 'DAY')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spazio.due }} accessibilityRole="radiogroup">
        {giorni.map((g) => {
          const sceltoQui = g.data === scelto
          const posti = g.slot.length
          return (
            <Tocco
              key={g.data}
              onPress={() => onScegli(g.data)}
              ruolo="radio"
              etichetta={`${g.etichetta}, ${posti} ${posti === 1 ? t('orario', 'time') : t('orari', 'times')}`}
              stato={{ selected: sceltoQui }}
              vibra="scelta"
              scala={0.96}
              style={[stili.giorno, { borderColor: sceltoQui ? p.accento : p.linea, backgroundColor: sceltoQui ? velo(p, 'accento', 0.14) : p.carta }]}
            >
              <Text style={[stili.giornoNome, { color: sceltoQui ? p.accento : p.testo }]}>{g.etichetta}</Text>
              <Text style={[stili.giornoPosti, { color: p.testoSecondario }]}>{posti === 1 ? t('ultimo orario', 'last time') : t(`${posti} orari`, `${posti} times`)}</Text>
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
      <Text style={[stili.etichetta, { color: p.testoSecondario }]}>{t('ORARIO', 'TIME')}</Text>
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

export function Appuntamento({ calendario, emailAccesso, oggettoIniziale = '', incorporato = false }: { calendario: Calendario; emailAccesso?: string | null; oggettoIniziale?: string; incorporato?: boolean }) {
  const testi = TESTI[calendario]
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
  const opzioniFiglio = [...figli.map((f, i) => ({ id: String(i), testo: f.nome || f.cognome })), { id: ALTRO, testo: t('Un altro bambino', 'Another child') }]

  async function invia() {
    if (!identita || inCorso) return
    setErrore(null)
    if (!giorno || !ora) return setErrore(t('Scegli un giorno e un orario.', 'Choose a day and a time.'))
    const tel = controllaTelefono(telefono ?? identita.telefono)
    if (!tel.ok) return setErrore(t('Controlla il numero di cellulare: serve a chi ti chiama.', 'Check your mobile number: we need it to call you.'))
    const base = { data: giorno, ora, email: identita.email, nome: identita.nome, cognome: identita.cognome, telefono: tel.valore }
    setInCorso(true)
    let esito
    if (calendario === 'desk') {
      if (!oggetto.trim()) {
        setInCorso(false)
        return setErrore(t('Dicci di cosa vuoi parlare: serve a chi ti chiama.', 'Tell us what you’d like to talk about: it helps whoever calls you.'))
      }
      esito = await prenotaDesk({ ...base, oggetto: oggetto.trim() })
    } else {
      const bimbo = figlioAttivo === ALTRO || figlioAttivo === null ? { nome: altroNome.trim(), cognome: altroCognome.trim() } : figli[Number(figlioAttivo)]
      if (!bimbo?.nome || !bimbo?.cognome) {
        setInCorso(false)
        return setErrore(t('Serve il nome e il cognome del bambino di cui parliamo.', 'We need the first and last name of the child.'))
      }
      if (!oggetto.trim()) {
        setInCorso(false)
        return setErrore(t('Scrivi, anche in due parole, cosa vuoi chiedere.', 'Write, even briefly, what you’d like to ask.'))
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
      <Guscio incorporato={incorporato} sopratitolo={testi.sopra} titolo={testi.titolo}>
        {incorporato ? (
          // Nella chat: la conferma sta nella conversazione, senza il comando «Torna a Club Life» (porterebbe fuori dalla chat).
          <Messaggio tono="ok">{t(`Appuntamento fissato: ${giornoEvento(`${fatto.data}T00:00:00Z`)} alle ${fatto.ora}. Ti mandiamo la conferma a ${identita?.email ?? 'la tua email'}, con il link per spostarlo o annullarlo.`, `Appointment booked: ${giornoEvento(`${fatto.data}T00:00:00Z`)} at ${fatto.ora}. We’ll send a confirmation to ${identita?.email ?? 'your email'}, with a link to reschedule or cancel.`)}</Messaggio>
        ) : (
          <Fatto titolo={t('Appuntamento fissato', 'Appointment booked')}>
            {t(`${giornoEvento(`${fatto.data}T00:00:00Z`)} alle ${fatto.ora}. Ti mandiamo la conferma a ${identita?.email ?? 'la tua email'}, con il link per spostarlo o annullarlo.`, `${giornoEvento(`${fatto.data}T00:00:00Z`)} at ${fatto.ora}. We’ll send a confirmation to ${identita?.email ?? 'your email'}, with a link to reschedule or cancel.`)}
          </Fatto>
        )}
      </Guscio>
    )
  }

  return (
    <Guscio incorporato={incorporato} sopratitolo={testi.sopra} titolo={testi.titolo} sottotitolo={testi.sotto}>
      {erroreOrari ? (
        <View style={{ gap: spazio.tre }}>
          <Messaggio>{erroreOrari}</Messaggio>
          <Pulsante testo={t('Riprova', 'Try again')} icona="aggiorna" onPress={leggi} />
        </View>
      ) : !orari || !identita ? (
        <SchedeInArrivo quante={1} />
      ) : !orari.giorni.length ? (
        <Messaggio tono="attenzione">{t('Per ora non ci sono orari liberi. Riprova fra qualche giorno.', 'There are no free times right now. Try again in a few days.')}</Messaggio>
      ) : (
        <>
          <Giorni giorni={orari.giorni} scelto={giorno} onScegli={(d) => (setGiorno(d), setOra(null))} />
          {giornoScelto ? <Orari slot={giornoScelto.slot} scelto={ora} onScegli={setOra} /> : null}
          <Text style={[stili.nota, { color: pal.testoSecondario }]}>{testi.durata}</Text>

          {calendario === 'nuoto' ? (
            <>
              <Pillole etichetta={t('Di quale bambino parliamo', 'Which child is it about')} opzioni={opzioniFiglio} valore={figlioAttivo} onScegli={setFiglio} />
              {figlioAttivo === ALTRO || figlioAttivo === null ? (
                <Carta piatta style={{ gap: spazio.tre }}>
                  <CampoTesto etichetta={t('Nome del bambino', 'Child’s first name')} value={altroNome} onChangeText={setAltroNome} autoCapitalize="words" autoComplete="off" />
                  <CampoTesto etichetta={t('Cognome del bambino', 'Child’s last name')} value={altroCognome} onChangeText={setAltroCognome} autoCapitalize="words" autoComplete="off" />
                </Carta>
              ) : null}
            </>
          ) : null}

          <CampoTesto
            etichetta={calendario === 'desk' ? t('Di cosa vuoi parlare', 'What would you like to talk about') : t('Cosa vuoi chiedere', 'What would you like to ask')}
            value={oggetto}
            onChangeText={setOggetto}
            multiline
            submitBehavior="blurAndSubmit"
            returnKeyType="done"
            numberOfLines={3}
            maxLength={500}
            style={{ minHeight: 72, textAlignVertical: 'top' }}
            placeholder={calendario === 'desk' ? t('In due parole', 'In a few words') : t('Ad esempio: il livello di mia figlia', 'For example: my daughter’s level')}
          />
          <CampoTesto
            etichetta={t('Cellulare per la chiamata', 'Mobile number for the call')}
            icona="telefono"
            value={telefono ?? identita.telefono}
            onChangeText={setTelefono}
            keyboardType="phone-pad"
            autoComplete="tel"
          />
          <DaDoveParti email={identita.email} />

          {errore ? <Messaggio>{errore}</Messaggio> : null}
          <Pulsante testo={t('Fissa l’appuntamento', 'Book the appointment')} icona="avanti" onPress={invia} inCorso={inCorso} disabilitato={inVista()} />
        </>
      )}
    </Guscio>
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
  titoloInc: { fontFamily: F.semi, fontSize: 16, lineHeight: 22 },
})
