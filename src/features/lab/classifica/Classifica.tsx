import { LinearGradient } from 'expo-linear-gradient'
import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { classificaDelMese, entraInClassifica, esciDallaClassifica, segnalaRiga, type ClassificaMese, type RigaClassifica, type StatoClassifica } from '@/api/classifica'
import { leggiAnagrafica, type Anagrafica } from '@/api/lab'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { inMemoria, prendi } from '../memoria'
import { AvatarFoto } from '../profilo/AvatarFoto'
import { conFotoLocale } from '../profilo/fotoLocale'
import { Foglio } from '../ui/Foglio'
import { Icona } from '../ui/Icona'
import { Carta, Entra, Messaggio, Pulsante, SchedeInArrivo, Sezione } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, FUOCO, NOTTE, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { vistaCorrente } from '../vista'
import { conSalti, giorniRimasti, nomeMese, ordinale, puntiTesto } from './comune'
import { FoglioProfiloClassifica } from './FoglioProfilo'
import { CONSENSO_CLASSIFICA, INFORMATIVA_CLASSIFICA, VERSIONE_INFORMATIVA_CLASSIFICA } from './informativa'
import { useClassifica } from './useClassifica'

// La classifica del mese (29/10/2026, richiesta di Maurizio): si apre dalla carta dell'Athlon Health Score (`RigaNellaCarta.tsx`).
//   - **Chi non e' dentro** vede cos'e', come si calcola, **come apparirebbe** (nome e iniziale del cognome) e un consenso a parte per entrare; non vede
//     nessun nome degli altri (solo quanti sono). Entrando, il sistema propone di mettere la foto e un motto (`FoglioProfilo.tsx`).
//   - **Chi e' dentro** vede la sua posizione, le prime dieci e, se e' piu' in basso, se stesso con due sopra e due sotto; il suo profilo (foto e
//     motto, da cambiare) e il modo di uscire, che e' immediato. Ogni mese si riparte da zero (dal primo all'ultimo giorno, a Roma).
// **Non c'e' un elenco completo di proposito**: meno nomi e foto esposti, e chi e' in fondo non si sente messo in piazza. Un contenuto che non va (un motto,
// una foto) si segnala; lo staff lo guarda dal CRM.

const CHIAVE_MESE = 'classifica:mese'
const COLORE_PODIO = ['#F5B93A', '#B8BFCC', '#C98A5B']

function BadgePosizione({ n, tu }: { n: number; tu: boolean }) {
  const p = usePalette()
  const podio = n >= 1 && n <= 3 ? COLORE_PODIO[n - 1] : null
  return (
    <View style={[stili.badge, { backgroundColor: podio ?? p.incavo }]}>
      <Text style={[stili.badgeTesto, { color: podio ? '#1a1208' : tu ? p.accento : p.testoSecondario }]}>{n}</Text>
    </View>
  )
}

function RigaPosizione({ r, onSegnala }: { r: RigaClassifica; onSegnala: (r: RigaClassifica) => void }) {
  const p = usePalette()
  const [nome, ...resto] = r.nome.split(' ')
  return (
    <View style={[stili.riga, r.tu && { backgroundColor: p.incavo, borderColor: p.accento, borderWidth: 1.5 }]} accessibilityLabel={`${ordinale(r.posizione)}, ${r.nome}, ${puntiTesto(r.punti)}${r.motto ? `. ${r.motto}` : ''}`}>
      <BadgePosizione n={r.posizione} tu={r.tu} />
      <AvatarFoto nome={nome ?? null} cognome={resto.join(' ') || null} foto={r.foto} size={44} />
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={[stili.nome, { color: p.testo }]} numberOfLines={1}>
          {r.tu ? t(`${r.nome} (tu)`, `${r.nome} (you)`) : r.nome}
        </Text>
        {r.motto ? (
          <Text style={[stili.motto, { color: p.testoSecondario }]} numberOfLines={2}>
            {`“${r.motto}”`}
          </Text>
        ) : null}
        {!r.tu && (r.motto || r.foto) ? (
          <Tocco onPress={() => onSegnala(r)} ruolo="link" etichetta={t(`Segnala il contenuto di ${r.nome}`, `Report ${r.nome}’s content`)} style={{ alignSelf: 'flex-start' }}>
            <Text style={[stili.segnala, { color: p.testoTerzo }]}>{t('Segnala', 'Report')}</Text>
          </Tocco>
        ) : null}
      </View>
      <Text style={[stili.punti, { color: p.testo }]}>{Math.round(r.punti)}</Text>
    </View>
  )
}

function FoglioInformativaClassifica({ aperto, onChiudi }: { aperto: boolean; onChiudi: () => void }) {
  const p = usePalette()
  return (
    <Foglio aperto={aperto} titolo={t('Come funziona la classifica', 'How the leaderboard works')} sottotitolo={t(`Informativa · versione del ${VERSIONE_INFORMATIVA_CLASSIFICA.split('-').reverse().join('/')}`, `Privacy notice · version of ${VERSIONE_INFORMATIVA_CLASSIFICA.split('-').reverse().join('/')}`)} onChiudi={onChiudi}>
      {INFORMATIVA_CLASSIFICA.map((s) => (
        <View key={s.titolo} style={{ gap: 4 }}>
          <Text style={[stili.sezioneTitolo, { color: p.testo }]}>{s.titolo}</Text>
          <Text style={[stili.nota, { color: p.testoSecondario }]}>{s.testo}</Text>
        </View>
      ))}
      <Pulsante testo={t('Ho letto', 'Got it')} variante="secondario" onPress={onChiudi} />
    </Foglio>
  )
}

/** Chi non e' dentro: cos'e', come si appare, e il consenso per entrare. */
function Presentazione({ stato, onEntrato }: { stato: StatoClassifica; onEntrato: (s: StatoClassifica) => void }) {
  const p = usePalette()
  const [spunta, setSpunta] = useState(false)
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [informativa, setInformativa] = useState(false)
  const [nome, ...resto] = stato.nome_pubblico.split(' ')

  async function entra() {
    setErrore(null)
    setInCorso(true)
    const r = await entraInClassifica(stato.versione || VERSIONE_INFORMATIVA_CLASSIFICA)
    setInCorso(false)
    if (r.ok) onEntrato(r)
    else setErrore(r.errore)
  }

  return (
    <>
      <Entra indice={0}>
        <LinearGradient colors={NOTTE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.eroe}>
          <LinearGradient colors={FUOCO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.eroeIcona}>
            <Icona nome="trofeo" size={26} colore="#fff" />
          </LinearGradient>
          <Text style={stili.eroeTitolo}>{t(`La classifica di ${nomeMese(stato.mese.id)}`, `The ${nomeMese(stato.mese.id)} leaderboard`)}</Text>
          <Text style={stili.eroeTesto}>
            {t(
              'Ogni mese si riparte da zero: dal primo all’ultimo giorno conta quanto sei costante, in allenamento, alimentazione e recupero. Non premia chi fa di più, ma chi ci prova ogni settimana.',
              'Every month starts from zero: from the first to the last day, what counts is how consistent you are in training, nutrition and recovery. It doesn’t reward doing more, but trying every week.',
            )}
          </Text>
          <Text style={stili.eroePiccola}>{stato.partecipanti > 0 ? t(`${stato.partecipanti} ${stato.partecipanti === 1 ? 'socio è' : 'soci sono'} già dentro. ${giorniRimasti(stato.mese.giorni_rimasti)} alla fine del mese.`, `${stato.partecipanti} ${stato.partecipanti === 1 ? 'member is' : 'members are'} already in. ${giorniRimasti(stato.mese.giorni_rimasti)} until the month ends.`) : t('Sii tra i primi ad entrare.', 'Be one of the first to join.')}</Text>
        </LinearGradient>
      </Entra>

      <Entra indice={1}>
        <Carta style={{ gap: spazio.tre }}>
          <Text style={[stili.sezioneTitolo, { color: p.testo }]}>{t('Così apparirai', 'How you’ll appear')}</Text>
          <View style={[stili.riga, { backgroundColor: p.incavo }]} accessibilityLabel={t(`Anteprima: ${stato.nome_pubblico}`, `Preview: ${stato.nome_pubblico}`)}>
            <View style={[stili.badge, { backgroundColor: p.carta }]}>
              <Text style={[stili.badgeTesto, { color: p.testoSecondario }]}>?</Text>
            </View>
            <AvatarFoto nome={nome ?? null} cognome={resto.join(' ') || null} foto={null} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={[stili.nome, { color: p.testo }]}>{stato.nome_pubblico}</Text>
              <Text style={[stili.motto, { color: p.testoSecondario }]}>{t('Il tuo motto, se lo scrivi', 'Your motto, if you write one')}</Text>
            </View>
            <Text style={[stili.punti, { color: p.testo }]}>—</Text>
          </View>
          <Text style={[stili.nota, { color: p.testoSecondario }]}>
            {t(
              'Solo il nome e l’iniziale del cognome, il punteggio e la posizione. La foto e il motto li metti tu, dopo, e solo se vuoi. Vedono la classifica solo i soci che sono dentro, e solo le prime dieci posizioni più la tua con chi ti sta vicino.',
              'Just your first name and the initial of your surname, your score and your position. You add your photo and motto afterwards, and only if you want to. Only the members who are in see the leaderboard, and only the top ten positions plus yours with the people next to you.',
            )}
          </Text>
        </Carta>
      </Entra>

      <Entra indice={2}>
        <Carta style={{ gap: spazio.tre }}>
          <Text style={[stili.sezioneTitolo, { color: p.testo }]}>{t('Come si calcola', 'How it’s worked out')}</Text>
          <Text style={[stili.nota, { color: p.testoSecondario }]}>
            {t(
              'È la media del tuo Athlon Health Score nelle settimane del mese. Train viene dagli ingressi e dalle lezioni a cui la reception ha segnato la tua presenza. Food e Recover contano solo se li usi: chi non li usa è valutato su Train, e non è penalizzato.',
              'It’s the average of your Athlon Health Score over the weeks of the month. Train comes from your entries and from the classes the front desk marked you present at. Food and Recover count only if you use them: if you don’t, you’re scored on Train, and not penalized.',
            )}
          </Text>
          <Tocco onPress={() => setInformativa(true)} ruolo="link" etichetta={t('Leggi l’informativa', 'Read the privacy notice')} style={{ alignSelf: 'flex-start' }}>
            <Text style={[stili.link, { color: p.accento }]}>{t('Leggi l’informativa', 'Read the privacy notice')}</Text>
          </Tocco>
          <Tocco onPress={() => setSpunta((v) => !v)} vibra="scelta" ruolo="checkbox" stato={{ checked: spunta }} etichetta={CONSENSO_CLASSIFICA} scala={0.99}>
            <View style={[stili.spunta, { backgroundColor: p.incavo }]}>
              <View style={[stili.casella, { borderColor: spunta ? p.accento : p.testoTerzo, backgroundColor: spunta ? p.accento : 'transparent' }]}>{spunta ? <Icona nome="spunta" size={15} colore="#fff" /> : null}</View>
              <Text style={[stili.nota, { color: p.testo, flex: 1 }]}>{CONSENSO_CLASSIFICA}</Text>
            </View>
          </Tocco>
          {errore ? <Messaggio>{errore}</Messaggio> : null}
          <Pulsante testo={t('Entra in classifica', 'Join the leaderboard')} icona="trofeo" onPress={entra} disabilitato={!spunta} inCorso={inCorso} />
          <Text style={[stili.piccola, { color: p.testoTerzo }]}>{t('Puoi uscire quando vuoi: sparisci subito.', 'You can leave whenever you like: you disappear straight away.')}</Text>
        </Carta>
      </Entra>
      <FoglioInformativaClassifica aperto={informativa} onChiudi={() => setInformativa(false)} />
    </>
  )
}

/** Chi e' dentro: la posizione, l'elenco, il profilo e l'uscita. */
function Dentro({ stato, imposta, onProfilo, versione }: { stato: StatoClassifica; imposta: (s: StatoClassifica) => void; /** Apre il foglio di foto e motto (sta nella schermata: lo apre anche l'ingresso). */ onProfilo: () => void; /** Cambia quando foto o motto sono stati salvati: l'elenco si rilegge, e la persona si vede come la vedono gli altri. */ versione: number }) {
  const p = usePalette()
  const [mese, setMese] = useState<ClassificaMese | null>(() => inMemoria<{ ok: true } & ClassificaMese>(CHIAVE_MESE) ?? null)
  const [errore, setErrore] = useState<string | null>(null)
  const [informativa, setInformativa] = useState(false)
  const [uscita, setUscita] = useState<'no' | 'chiedi' | 'in-corso'>('no')
  const [segnalata, setSegnalata] = useState<{ id: string; stato: 'chiedi' | 'inviata' | 'errore' } | null>(null)
  const [erroreUscita, setErroreUscita] = useState<string | null>(null)

  const leggi = useCallback(async () => {
    const r = await prendi(CHIAVE_MESE, classificaDelMese)
    if (r.ok) {
      setMese(r)
      setErrore(null)
    } else setErrore(r.errore)
  }, [])
  useFocusEffect(
    useCallback(() => {
      leggi()
    }, [leggi]),
  )
  useEffect(() => {
    if (versione > 0) leggi()
  }, [versione, leggi])

  // La mia foto, come la vedrebbero gli altri solo se ho scelto di mostrarla.
  const [anagrafica, setAnagrafica] = useState<Anagrafica | null>(() => inMemoria<{ ok: true; anagrafica: Anagrafica }>('anagrafica')?.anagrafica ?? null)
  useEffect(() => {
    prendi('anagrafica', leggiAnagrafica).then((r) => r.ok && setAnagrafica(r.anagrafica))
  }, [])
  const fotoMia = anagrafica ? conFotoLocale(anagrafica).foto ?? null : null

  const me = stato.me
  const voci = mese ? conSalti(mese.righe) : []
  const mioProfilo = stato.profilo
  const [nome, ...resto] = stato.nome_pubblico.split(' ')

  async function esci() {
    setUscita('in-corso')
    setErroreUscita(null)
    const r = await esciDallaClassifica()
    if (!r.ok) {
      setUscita('chiedi')
      return setErroreUscita(r.errore)
    }
    imposta(r)
  }

  async function segnala(r: RigaClassifica) {
    setSegnalata({ id: r.id, stato: 'chiedi' })
  }
  async function confermaSegnalazione() {
    if (!segnalata) return
    const r = await segnalaRiga(segnalata.id)
    setSegnalata({ id: segnalata.id, stato: r.ok ? 'inviata' : 'errore' })
  }

  return (
    <>
      <Entra indice={0}>
        <LinearGradient colors={NOTTE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.eroe}>
          <View style={stili.eroeTesta}>
            <Text style={stili.eroeMese}>{nomeMese(stato.mese.id).toUpperCase()}</Text>
            <View style={stili.giorni}>
              <Text style={stili.giorniTesto}>{giorniRimasti(stato.mese.giorni_rimasti)}</Text>
            </View>
          </View>
          {me?.posizione != null ? (
            <>
              <Text style={stili.grande} accessibilityLabel={t(`Sei ${ordinale(me.posizione)} su ${me.su}`, `You’re ${ordinale(me.posizione)} out of ${me.su}`)}>
                {ordinale(me.posizione)}
                <Text style={stili.grandeSu}>{` ${t('su', 'of')} ${me.su}`}</Text>
              </Text>
              <Text style={stili.eroeTesto}>{`${puntiTesto(me.punti)} · ${t('il tuo punteggio del mese', 'your score for the month')}`}</Text>
            </>
          ) : (
            <>
              <Text style={stili.grande}>{t('Sei dentro', 'You’re in')}</Text>
              <Text style={stili.eroeTesto}>{t('Appena hai il primo punto del mese compari in classifica. Si riparte il 1° di ogni mese.', 'As soon as you have your first point of the month you appear on the leaderboard. It starts over on the 1st of every month.')}</Text>
            </>
          )}
        </LinearGradient>
      </Entra>

      <Sezione titolo={t('Le prime posizioni', 'Top positions')}>
        {errore && !mese ? (
          <>
            <Messaggio>{errore}</Messaggio>
            <Pulsante testo={t('Riprova', 'Try again')} icona="aggiorna" variante="secondario" onPress={leggi} />
          </>
        ) : !mese ? (
          <SchedeInArrivo quante={2} />
        ) : voci.length ? (
          <Carta style={{ gap: 6, paddingHorizontal: spazio.due, paddingVertical: spazio.due }}>
            {voci.map((v) =>
              v.tipo === 'salto' ? (
                <Text key={v.chiave} style={[stili.salto, { color: p.testoTerzo }]} accessibilityElementsHidden>
                  ⋯
                </Text>
              ) : (
                <RigaPosizione key={v.riga.id} r={v.riga} onSegnala={segnala} />
              ),
            )}
          </Carta>
        ) : (
          <Carta style={{ alignItems: 'center', gap: spazio.due, paddingVertical: spazio.cinque }}>
            <Icona nome="trofeo" size={30} colore={p.testoTerzo} />
            <Text style={[stili.nota, { color: p.testoSecondario, textAlign: 'center' }]}>{t('Ancora nessuno ha punti questo mese: parti tu.', 'Nobody has points yet this month: you go first.')}</Text>
          </Carta>
        )}
        {mese?.aggiornata_il ? <Text style={[stili.piccola, { color: p.testoTerzo }]}>{t('Aggiornata con i dati di ieri: la posizione cambia mentre il mese va avanti.', 'Updated with yesterday’s data: your position changes as the month goes on.')}</Text> : null}
      </Sezione>

      <Sezione titolo={t('Il tuo profilo in classifica', 'Your leaderboard profile')}>
        <Carta style={{ gap: spazio.tre }}>
          <View style={stili.profiloRiga}>
            <AvatarFoto nome={nome ?? null} cognome={resto.join(' ') || null} foto={mioProfilo?.mostra_foto ? fotoMia : null} size={52} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[stili.nome, { color: p.testo }]}>{stato.nome_pubblico}</Text>
              <Text style={[stili.motto, { color: mioProfilo?.motto ? p.testoSecondario : p.testoTerzo }]} numberOfLines={2}>
                {mioProfilo?.motto ? `“${mioProfilo.motto}”` : t('Nessun motto: aggiungine uno', 'No motto: add one')}
              </Text>
              <Text style={[stili.piccola, { color: p.testoTerzo }]}>{mioProfilo?.mostra_foto ? t('La tua foto è visibile in classifica', 'Your photo is visible on the leaderboard') : t('La tua foto non è visibile in classifica', 'Your photo isn’t visible on the leaderboard')}</Text>
            </View>
          </View>
          <Pulsante testo={t('Foto e motto', 'Photo and motto')} icona="modifica" variante="secondario" piccolo onPress={onProfilo} />
        </Carta>
      </Sezione>

      <Tocco onPress={() => setInformativa(true)} ruolo="link" etichetta={t('Come funziona e informativa', 'How it works and privacy notice')} style={{ alignSelf: 'flex-start' }}>
        <Text style={[stili.link, { color: p.accento }]}>{t('Come funziona e informativa', 'How it works and privacy notice')}</Text>
      </Tocco>

      <Carta style={{ gap: spazio.tre }}>
        <Text style={[stili.sezioneTitolo, { color: p.testo }]}>{t('Uscire dalla classifica', 'Leave the leaderboard')}</Text>
        <Text style={[stili.nota, { color: p.testoSecondario }]}>{t('Sparisci subito, e cancelliamo il tuo motto e la scelta sulla foto. Il tuo Athlon Health Score continua a funzionare uguale.', 'You disappear straight away, and we delete your motto and your photo choice. Your Athlon Health Score keeps working just the same.')}</Text>
        {erroreUscita ? <Messaggio>{erroreUscita}</Messaggio> : null}
        {uscita === 'no' ? (
          <Pulsante testo={t('Esci dalla classifica', 'Leave the leaderboard')} variante="pericolo" piccolo onPress={() => setUscita('chiedi')} />
        ) : (
          <View style={stili.azioni}>
            <View style={{ flex: 1 }}>
              <Pulsante testo={t('Annulla', 'Cancel')} variante="secondario" piccolo onPress={() => setUscita('no')} />
            </View>
            <View style={{ flex: 1 }}>
              <Pulsante testo={t('Sì, esci', 'Yes, leave')} variante="pericolo" piccolo inCorso={uscita === 'in-corso'} onPress={esci} />
            </View>
          </View>
        )}
      </Carta>

      <FoglioInformativaClassifica aperto={informativa} onChiudi={() => setInformativa(false)} />
      <Foglio
        aperto={!!segnalata}
        titolo={t('Segnala un contenuto', 'Report content')}
        sottotitolo={t('Un motto o una foto che non rispetta le regole.', 'A motto or photo that breaks the rules.')}
        onChiudi={() => setSegnalata(null)}
      >
        {segnalata?.stato === 'inviata' ? (
          <Messaggio tono="ok" titolo={t('Segnalazione inviata', 'Report sent')}>
            {t('Grazie: lo staff la guarda e, se serve, nasconde il contenuto.', 'Thank you: staff will look at it and, if needed, hide the content.')}
          </Messaggio>
        ) : (
          <>
            <Text style={[stili.nota, { color: p.testoSecondario }]}>{t('Lo staff del club guarda la segnalazione e, se il contenuto non rispetta le regole, lo nasconde. La persona non sa chi ha segnalato.', 'Club staff will look at the report and, if the content breaks the rules, hide it. The person isn’t told who reported.')}</Text>
            {segnalata?.stato === 'errore' ? <Messaggio>{t('Non siamo riusciti a inviare la segnalazione. Riprova.', 'We couldn’t send the report. Try again.')}</Messaggio> : null}
            <Pulsante testo={t('Invia la segnalazione', 'Send the report')} variante="pericolo" onPress={confermaSegnalazione} />
          </>
        )}
        <Pulsante testo={segnalata?.stato === 'inviata' ? t('Chiudi', 'Close') : t('Annulla', 'Cancel')} variante="secondario" onPress={() => setSegnalata(null)} />
      </Foglio>
    </>
  )
}

export function SchermataClassifica() {
  const vista = !!vistaCorrente()
  const c = useClassifica(vista)
  // Il foglio di foto e motto: si apre da solo appena si entra (`primo`) e dal pulsante «Foto e motto» di chi e' gia' dentro.
  const [profilo, setProfilo] = useState<'no' | 'primo' | 'modifica'>('no')
  const [versione, setVersione] = useState(0)
  const stato = c.stato
  const testata = { sopratitolo: 'Athlon Health System', titolo: t('Classifica', 'Leaderboard'), indietro: '/allenamento' as const, barra: false as const }

  if (vista) {
    return (
      <Schermata {...testata}>
        <Messaggio tono="attenzione" titolo={t('Non visibile nella vista cliente', 'Not visible in client view')}>
          {t('La classifica la vedono solo i soci, dalla loro app.', 'Only members see the leaderboard, from their own app.')}
        </Messaggio>
      </Schermata>
    )
  }
  if (!stato) {
    return (
      <Schermata {...testata}>
        <SchedeInArrivo quante={2} />
      </Schermata>
    )
  }
  if (!c.visibile) {
    return (
      <Schermata {...testata}>
        <Messaggio tono="attenzione" titolo={t('Classifica non disponibile', 'Leaderboard not available')}>
          {!stato.maggiorenne ? t('La classifica è riservata ai maggiorenni.', 'The leaderboard is for adults only.') : t('La classifica non è ancora attiva.', 'The leaderboard isn’t on yet.')}
        </Messaggio>
      </Schermata>
    )
  }
  return (
    <Schermata {...testata}>
      {stato.consenso ? (
        <Dentro stato={stato} imposta={c.imposta} onProfilo={() => setProfilo('modifica')} versione={versione} />
      ) : (
        <Presentazione
          stato={stato}
          onEntrato={(s) => {
            c.imposta(s)
            // Appena dentro, il sistema propone la foto e il motto.
            setProfilo('primo')
          }}
        />
      )}
      {stato.consenso ? (
        <FoglioProfiloClassifica
          aperto={profilo !== 'no'}
          stato={stato}
          primoIngresso={profilo === 'primo'}
          onChiudi={() => setProfilo('no')}
          onSalvato={(x) => {
            c.imposta(x)
            setVersione((v) => v + 1)
            setProfilo('no')
          }}
        />
      ) : null}
    </Schermata>
  )
}

const stili = StyleSheet.create({
  eroe: { borderRadius: 28, padding: spazio.tre + 4, gap: spazio.due + 2 },
  eroeIcona: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  eroeTitolo: { color: '#fff', fontFamily: F.extra, fontSize: 26, lineHeight: 30, letterSpacing: -0.7 },
  eroeTesto: { color: 'rgba(255,255,255,0.85)', fontFamily: F.medio, fontSize: 14.5, lineHeight: 21 },
  eroePiccola: { color: 'rgba(255,255,255,0.65)', fontFamily: F.semi, fontSize: 12.5, lineHeight: 18 },
  eroeTesta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spazio.due },
  eroeMese: { color: 'rgba(255,255,255,0.7)', fontFamily: F.bold, fontSize: 11.5, letterSpacing: 1 },
  giorni: { backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 4 },
  giorniTesto: { color: '#fff', fontFamily: F.bold, fontSize: 12 },
  grande: { color: '#fff', fontFamily: F.extra, fontSize: 52, lineHeight: 56, letterSpacing: -2 },
  grandeSu: { color: 'rgba(255,255,255,0.65)', fontFamily: F.semi, fontSize: 20, letterSpacing: -0.4 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: spazio.due + 2, borderRadius: 18, paddingVertical: spazio.due, paddingHorizontal: spazio.due + 2, borderWidth: 1.5, borderColor: 'transparent' },
  badge: { width: 30, height: 30, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  badgeTesto: { fontFamily: F.extra, fontSize: 14 },
  nome: { fontFamily: F.extra, fontSize: 15.5, letterSpacing: -0.2 },
  motto: { fontFamily: F.medio, fontSize: 13, lineHeight: 18, fontStyle: 'italic' },
  segnala: { fontFamily: F.semi, fontSize: 11.5, paddingVertical: 2 },
  punti: { fontFamily: F.extra, fontSize: 18, letterSpacing: -0.4, minWidth: 30, textAlign: 'right' },
  salto: { textAlign: 'center', fontSize: 18, lineHeight: 14 },
  nota: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  piccola: { fontFamily: F.medio, fontSize: 12, lineHeight: 17 },
  link: { fontFamily: F.bold, fontSize: 14, paddingVertical: 6 },
  sezioneTitolo: { fontFamily: F.extra, fontSize: 17 },
  spunta: { flexDirection: 'row', alignItems: 'flex-start', gap: spazio.tre, borderRadius: 16, padding: spazio.tre },
  casella: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  profiloRiga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  azioni: { flexDirection: 'row', gap: spazio.due },
})
