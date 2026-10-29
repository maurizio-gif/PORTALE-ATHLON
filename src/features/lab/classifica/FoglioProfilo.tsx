import { useEffect, useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'

import { salvaProfiloClassifica, type StatoClassifica } from '@/api/classifica'
import { leggiAnagrafica, type Anagrafica } from '@/api/lab'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { inMemoria, prendi } from '../memoria'
import { AvatarFoto } from '../profilo/AvatarFoto'
import { conFotoLocale, ricordaFotoLocale } from '../profilo/fotoLocale'
import { FoglioFoto } from '../profilo/FotoProfilo'
import { Foglio } from '../ui/Foglio'
import { Messaggio, Pulsante } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { IDEE_MOTTO, MOTTO_MAX, validaMotto } from './comune'

// Foto e motto della classifica (29/10/2026, richiesta di Maurizio): **appena si entra in classifica il sistema propone di mettere la propria foto e un
// motto**, una frase che motiva. Sono tutti e due facoltativi e si possono saltare e fare dopo. La foto e' quella che il club ha gia' (la stessa del
// Profilo e della Home): qui si sceglie solo **se mostrarla agli altri soci in classifica**, e di partenza e' spenta; se la persona ne mette una nuova da qui, si
// accende da sola (e' un gesto suo). Il motto e' ripulito e controllato qui (`validaMotto`) e di nuovo dal server, che dice il motivo se lo rifiuta.
// **Il foglio della foto non si apre sopra questo**: su iPhone due fogli insieme non si presentano; questo si nasconde mentre l'altro e' aperto.

export function FoglioProfiloClassifica({ aperto, stato, primoIngresso = false, onChiudi, onSalvato }: { aperto: boolean; stato: StatoClassifica; /** Appena entrata: il testo invita, e chiudere vuol dire «dopo». */ primoIngresso?: boolean; onChiudi: () => void; onSalvato: (s: StatoClassifica) => void }) {
  const p = usePalette()
  const [anagrafica, setAnagrafica] = useState<Anagrafica | null>(() => inMemoria<{ ok: true; anagrafica: Anagrafica }>('anagrafica')?.anagrafica ?? null)
  const [mostraFoto, setMostraFoto] = useState(!!stato.profilo?.mostra_foto)
  const [motto, setMotto] = useState(stato.profilo?.motto ?? '')
  const [errore, setErrore] = useState<string | null>(null)
  const [inCorso, setInCorso] = useState(false)
  const [passo, setPasso] = useState<'profilo' | 'foto'>('profilo')

  // Ogni volta che si apre riparte da quello che c'e' sul server.
  useEffect(() => {
    if (!aperto) return
    setMostraFoto(!!stato.profilo?.mostra_foto)
    setMotto(stato.profilo?.motto ?? '')
    setErrore(null)
    setPasso('profilo')
    prendi('anagrafica', leggiAnagrafica).then((r) => r.ok && setAnagrafica(r.anagrafica))
  }, [aperto, stato.profilo?.mostra_foto, stato.profilo?.motto])

  const a = anagrafica ? conFotoLocale(anagrafica) : null
  const foto = a?.foto ?? null
  const puoCambiare = a?.foto_modificabile === true
  const [nome, cognome] = stato.nome_pubblico.split(' ')

  async function salva() {
    const m = validaMotto(motto)
    if (!m.ok) return setErrore(m.errore)
    setErrore(null)
    setInCorso(true)
    const r = await salvaProfiloClassifica({ motto: m.motto, mostra_foto: mostraFoto && !!foto })
    setInCorso(false)
    if (!r.ok) return setErrore(r.errore)
    onSalvato(r)
  }

  if (passo === 'foto') {
    return (
      <FoglioFoto
        attuale={foto}
        onChiudi={() => setPasso('profilo')}
        onSalvato={(an, esito) => {
          ricordaFotoLocale(esito.anteprima)
          setAnagrafica(an)
          // Una foto messa da qui e' un gesto per la classifica: si mostra, e si puo' spegnere subito sotto.
          setMostraFoto(true)
          setPasso('profilo')
        }}
      />
    )
  }

  return (
    <Foglio
      aperto={aperto}
      titolo={primoIngresso ? t('Sei in classifica!', 'You’re on the leaderboard!') : t('Il tuo profilo in classifica', 'Your leaderboard profile')}
      sottotitolo={t('Metti la tua foto e una frase che ti motiva: sono facoltativi, e li cambi quando vuoi.', 'Add your photo and a phrase that motivates you: both are optional, and you can change them whenever you like.')}
      onChiudi={onChiudi}
    >
      <View style={{ gap: spazio.quattro }}>
        <View style={[stili.riquadro, { backgroundColor: p.incavo }]}>
          <View style={stili.fotoRiga}>
            <AvatarFoto nome={nome ?? null} cognome={cognome ?? null} foto={mostraFoto ? foto : null} size={64} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[stili.titolo, { color: p.testo }]}>{t('La tua foto', 'Your photo')}</Text>
              <Text style={[stili.nota, { color: p.testoSecondario }]}>
                {foto
                  ? t('Quella che il club ha già. Gli altri soci in classifica la vedono solo se la mostri.', 'The one the club already has. Other members on the leaderboard see it only if you show it.')
                  : t('Ancora non ne hai una: mettila e gli altri ti riconoscono.', 'You don’t have one yet: add one and others will recognize you.')}
              </Text>
            </View>
          </View>
          {puoCambiare ? <Pulsante testo={foto ? t('Cambia foto', 'Change photo') : t('Aggiungi la tua foto', 'Add your photo')} icona="fotocamera" variante="secondario" piccolo onPress={() => setPasso('foto')} /> : null}
          {foto ? (
            <Tocco onPress={() => setMostraFoto((v) => !v)} ruolo="switch" stato={{ checked: mostraFoto }} vibra="scelta" etichetta={t('Mostra la mia foto in classifica', 'Show my photo on the leaderboard')} scala={0.99}>
              <View style={stili.interruttoreRiga}>
                <Text style={[stili.voce, { color: p.testo, flex: 1 }]}>{t('Mostra la mia foto in classifica', 'Show my photo on the leaderboard')}</Text>
                <View style={[stili.binario, { backgroundColor: mostraFoto ? p.accento : p.testoTerzo }]}>
                  <View style={[stili.pomello, { alignSelf: mostraFoto ? 'flex-end' : 'flex-start' }]} />
                </View>
              </View>
            </Tocco>
          ) : null}
        </View>

        <View style={{ gap: spazio.due }}>
          <Text style={[stili.titolo, { color: p.testo }]}>{t('Il tuo motto', 'Your motto')}</Text>
          <Text style={[stili.nota, { color: p.testoSecondario }]}>{t('Una frase tua, quella che ti spinge. Compare sotto il tuo nome.', 'A phrase of your own, the one that drives you. It appears under your name.')}</Text>
          <TextInput
            value={motto}
            onChangeText={(v) => {
              setMotto(v)
              setErrore(null)
            }}
            placeholder={t('Per esempio: Un passo alla volta', 'For example: One step at a time')}
            placeholderTextColor={p.testoTerzo}
            maxLength={MOTTO_MAX + 20}
            multiline
            accessibilityLabel={t('Il tuo motto', 'Your motto')}
            style={[stili.campo, { backgroundColor: p.incavo, color: p.testo }]}
          />
          <View style={stili.contatore}>
            <Text style={[stili.piccola, { color: [...motto].length > MOTTO_MAX ? p.errore : p.testoTerzo }]}>{`${[...motto].length}/${MOTTO_MAX}`}</Text>
          </View>
          <View style={stili.idee}>
            {IDEE_MOTTO().map((i) => (
              <Tocco key={i} onPress={() => setMotto(i)} vibra="scelta" etichetta={i} style={[stili.idea, { backgroundColor: p.incavo }]}>
                <Text style={[stili.piccola, { color: p.testo, fontFamily: F.semi }]}>{i}</Text>
              </Tocco>
            ))}
          </View>
          <Text style={[stili.piccola, { color: p.testoTerzo }]}>{t('Niente link, mail o indirizzi. Se un motto non rispetta le regole, lo staff può nasconderlo.', 'No links, emails or addresses. If a motto breaks the rules, staff can hide it.')}</Text>
        </View>

        {errore ? <Messaggio>{errore}</Messaggio> : null}
        <Pulsante testo={t('Salva', 'Save')} icona="spunta" inCorso={inCorso} onPress={salva} />
        <Pulsante testo={primoIngresso ? t('Lo faccio dopo', 'I’ll do it later') : t('Chiudi', 'Close')} variante="fantasma" piccolo onPress={onChiudi} />
      </View>
    </Foglio>
  )
}

const stili = StyleSheet.create({
  riquadro: { borderRadius: 20, padding: spazio.tre, gap: spazio.tre },
  fotoRiga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  titolo: { fontFamily: F.extra, fontSize: 16 },
  nota: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
  piccola: { fontFamily: F.medio, fontSize: 12, lineHeight: 17 },
  voce: { fontFamily: F.semi, fontSize: 14.5 },
  interruttoreRiga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, minHeight: 36 },
  binario: { width: 46, height: 28, borderRadius: 14, padding: 3, justifyContent: 'center' },
  pomello: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  campo: { borderRadius: 16, paddingHorizontal: spazio.tre, paddingVertical: spazio.tre, minHeight: 70, fontFamily: F.semi, fontSize: 16, textAlignVertical: 'top' },
  contatore: { alignItems: 'flex-end', marginTop: -4 },
  idee: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  idea: { borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12 },
})
