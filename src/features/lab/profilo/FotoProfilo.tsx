import { Image } from 'expo-image'
import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import type { StatoClassifica } from '@/api/classifica'
import { caricaFotoProfilo, type Anagrafica } from '@/api/lab'
import { fotocameraDisponibile, preparaFotoProfilo, scegliFotoProfilo, type FotoProfiloPronta, type OrigineFoto } from '@/lib/fotoProfilo'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { CHIAVE_CLASSIFICA } from '../classifica/useClassifica'
import { inMemoria } from '../memoria'
import { Foglio } from '../ui/Foglio'
import { Icona } from '../ui/Icona'
import { Entra, Messaggio, Pulsante } from '../ui/kit'
import { F, usePalette, velo } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { Richiamo } from './Richiamo'

// La foto del Profilo (17/10/2026) e il suo cambio (20/10/2026).
//
// La foto che il club ha su PerfectGym si vede in cima al Profilo e, dal 19/10/2026, nell'avatar della testata della Home
// (`AvatarFoto`); non in Famiglia, non nel Calendario. Dal 20/10/2026 chi non ne ha una trova al suo posto **un invito**: un
// riquadro vuoto con la fotocamera, un anello che pulsa piano (`Richiamo`) e due righe che dicono dove si vedra'.
// Chi ce l'ha trova la foto con un piccolo comando per cambiarla. Il cambio e' un foglio con due strade - scattare,
// scegliere - e un'anteprima: **niente parte senza «Usa questa foto»**.
//
// `puoCambiare` viene dalla funzione (`foto_modificabile`): in vista cliente dello staff, o con una funzione che il
// cambio non lo conosce ancora, non c'e' ne' invito ne' comando, e la sezione e' quella di prima.

/** Quanto e' grande la foto in cima al Profilo, e quanto tonda: lo stesso rapporto degli avatar con le iniziali. */
const LATO_FOTO = 112
const forma = (lato: number) => ({ width: lato, height: lato, borderRadius: lato * 0.36 })

export const TESTO_DOVE_SI_VEDE = t('Si vede nel tuo Profilo, in cima alla Home e sulla tua scheda in segreteria.', 'It appears in your Profile, at the top of Home and on your record at the front desk.')

/**
 * La foto del profilo, al centro in cima alla sezione. Il link e' firmato e dura un'ora: se non si carica - scaduto,
 * o la rete e' andata - la foto non si mostra. Per chi non puo' cambiarla la sezione resta com'era, senza riquadri
 * vuoti; per chi puo', c'e' il riquadro per sceglierne una (ma senza l'invito con l'anello: una foto c'e').
 */
export function FotoProfilo({ url, puoCambiare, indice, onCambia }: { url: string | null; puoCambiare: boolean; indice: number; onCambia: () => void }) {
  const p = usePalette()
  const [rotta, setRotta] = useState(false)
  useEffect(() => setRotta(false), [url])
  const conFoto = !!url && !rotta
  // Niente nemmeno l'involucro che entra dal basso: una vista vuota terrebbe lo spazio fra una sezione e l'altra.
  if (!conFoto && !puoCambiare) return null
  // L'invito, con l'anello, c'e' solo se il server dice che una foto non c'e': un link che non si carica non e' una foto mancante.
  const invito = !url

  const immagine = (
    <View style={forma(LATO_FOTO)}>
      {invito ? <Richiamo raggio={LATO_FOTO * 0.36} colore={p.accento} /> : null}
      {conFoto ? (
        // L'ombra sta su una vista a parte: lo stile di un'immagine non ha `boxShadow`.
        <View style={[forma(LATO_FOTO), { boxShadow: p.ombra }]}>
          <Image
            source={{ uri: url }}
            onError={() => setRotta(true)}
            contentFit="cover"
            // Le facce stanno sopra il centro: ritagliando una foto non quadrata si perde prima il fondo.
            contentPosition={{ left: '50%', top: '30%' }}
            transition={150}
            accessibilityLabel={t('La tua foto del profilo', 'Your profile photo')}
            accessibilityIgnoresInvertColors
            style={[forma(LATO_FOTO), { backgroundColor: p.incavo }]}
          />
        </View>
      ) : (
        <View style={[forma(LATO_FOTO), stili.vuota, { backgroundColor: velo(p, 'accento', 0.12), borderColor: velo(p, 'accento', 0.5) }]}>
          <Icona nome="fotocamera" size={36} colore={p.accento} />
        </View>
      )}
      {puoCambiare ? (
        <View style={[stili.distintivo, { backgroundColor: p.accento, borderColor: p.fondo }]}>
          <Icona nome={conFoto ? 'fotocamera' : 'piu'} size={15} colore="#fff" />
        </View>
      ) : null}
    </View>
  )

  return (
    <Entra indice={indice}>
      <View style={stili.blocco}>
        {/* Un comando solo dove c'e' qualcosa da fare: per chi non puo' cambiare la foto e' soltanto la foto. */}
        {puoCambiare ? (
          <Tocco onPress={onCambia} etichetta={invito ? t('Aggiungi la tua foto', 'Add your photo') : t('Cambia la tua foto', 'Change your photo')} scala={0.96}>
            {immagine}
          </Tocco>
        ) : (
          immagine
        )}

        {invito ? (
          <View style={stili.testi}>
            <Text style={[stili.titolo, { color: p.testo }]}>{t('Aggiungi la tua foto', 'Add your photo')}</Text>
            <Text style={[stili.sotto, { color: p.testoSecondario }]}>{TESTO_DOVE_SI_VEDE}</Text>
          </View>
        ) : puoCambiare ? (
          // Un pulsante non pieno si allinea a inizio riga: qui sta al centro, sotto la foto.
          <View style={stili.cambia}>
            <Pulsante testo={t('Cambia foto', 'Change photo')} variante="fantasma" piccolo pieno={false} onPress={onCambia} />
          </View>
        ) : null}
      </View>
    </Entra>
  )
}

/**
 * Il foglio per scegliere la foto: scattare (dove c'e' una fotocamera da aprire), scegliere, guardare l'anteprima e
 * confermare. L'attesa visibile comincia dopo la scelta, non mentre la finestra dei file e' aperta: chi la chiude
 * senza scegliere sul web non fa partire nessun evento (come per il certificato e per le schede).
 */
export function FoglioFoto({
  attuale,
  onChiudi,
  onSalvato,
}: {
  /** La foto di adesso, se c'e': si vede finche' non se ne sceglie un'altra. */
  attuale: string | null
  onChiudi: () => void
  onSalvato: (a: Anagrafica, esito: { anteprima: string; inArrivo: boolean }) => void
}) {
  const p = usePalette()
  const [pronta, setPronta] = useState<FotoProfiloPronta | null>(null)
  const [attesa, setAttesa] = useState<OrigineFoto | 'invio' | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const conCamera = fotocameraDisponibile()
  const inClassifica = !!inMemoria<StatoClassifica>(CHIAVE_CLASSIFICA)?.consenso
  const occupato = attesa !== null

  async function scegli(da: OrigineFoto) {
    setErrore(null)
    const file = await scegliFotoProfilo(da)
    if (!file) return
    setAttesa(da)
    const r = await preparaFotoProfilo(file)
    setAttesa(null)
    if (!r.ok) return setErrore(r.errore)
    setPronta(r.foto)
  }

  async function salva() {
    if (!pronta) return
    setErrore(null)
    setAttesa('invio')
    const r = await caricaFotoProfilo(pronta.dati)
    setAttesa(null)
    if (!r.ok) return setErrore(r.errore)
    onSalvato(r.anagrafica, { anteprima: pronta.anteprima, inArrivo: r.inArrivo })
  }

  const mostra = pronta?.anteprima ?? attuale

  return (
    <Foglio
      aperto
      titolo={t('La tua foto', 'Your photo')}
      sottotitolo={
        // Chi e' in classifica puo' scegliere di mostrarla agli altri soci (29/10/2026): il testo non puo' piu' dire «gli altri soci no».
        inClassifica
          ? t('Una foto del tuo viso, ben illuminata. La vede il club; gli altri soci solo se scegli di mostrarla in classifica.', 'A well-lit photo of your face. The club sees it; other members only if you choose to show it on the leaderboard.')
          : t('Una foto del tuo viso, ben illuminata. La vede solo il club: gli altri soci no.', 'A well-lit photo of your face. Only the club sees it, not other members.')
      }
      // Chiudere a metà invio lascerebbe la schermata ferma alla foto di prima, con la nuova già partita.
      onChiudi={attesa === 'invio' ? () => undefined : onChiudi}
    >
      <View style={stili.anteprima}>
        <View style={[forma(ANTEPRIMA), { boxShadow: p.ombra }]}>
          {mostra ? (
            <Image source={{ uri: mostra }} contentFit="cover" contentPosition={{ left: '50%', top: '30%' }} accessibilityLabel={pronta ? t('Anteprima della nuova foto', 'Preview of the new photo') : t('La tua foto di adesso', 'Your current photo')} accessibilityIgnoresInvertColors style={[forma(ANTEPRIMA), { backgroundColor: p.incavo }]} />
          ) : (
            <View style={[forma(ANTEPRIMA), stili.vuota, { backgroundColor: p.incavo, borderColor: p.linea }]}>
              <Icona nome="fotocamera" size={48} colore={p.testoTerzo} />
            </View>
          )}
        </View>
        {pronta ? <Text style={[stili.sotto, { color: p.testoSecondario }]}>{t('Così ti vedranno.', 'This is how you’ll look.')}</Text> : null}
      </View>

      {errore ? <Messaggio>{errore}</Messaggio> : null}

      {pronta ? <Pulsante testo={t('Usa questa foto', 'Use this photo')} icona="spunta" onPress={salva} inCorso={attesa === 'invio'} disabilitato={occupato} /> : null}
      {conCamera ? (
        <Pulsante
          testo={pronta ? t('Scatta di nuovo', 'Take another') : t('Scatta una foto', 'Take a photo')}
          icona="fotocamera"
          variante={pronta ? 'secondario' : 'primario'}
          onPress={() => scegli('fotocamera')}
          inCorso={attesa === 'fotocamera'}
          disabilitato={occupato}
        />
      ) : null}
      <Pulsante
        testo={pronta ? t('Scegli un’altra foto', 'Choose another photo') : conCamera ? t('Scegli dalla galleria', 'Choose from gallery') : t('Scegli una foto', 'Choose a photo')}
        icona="galleria"
        variante={pronta || conCamera ? 'secondario' : 'primario'}
        onPress={() => scegli('galleria')}
        inCorso={attesa === 'galleria'}
        disabilitato={occupato}
      />
    </Foglio>
  )
}

const ANTEPRIMA = 168

const stili = StyleSheet.create({
  blocco: { alignItems: 'center', gap: spazio.tre },
  vuota: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  // Sull'angolo in basso a destra, col bordo del colore del fondo: si stacca dalla foto senza un'ombra.
  distintivo: { position: 'absolute', right: -6, bottom: -6, width: 34, height: 34, borderRadius: 17, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  cambia: { alignSelf: 'center' },
  testi: { alignItems: 'center', gap: 4, maxWidth: 300 },
  titolo: { fontFamily: F.bold, fontSize: 16, textAlign: 'center' },
  sotto: { fontFamily: F.medio, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  anteprima: { alignItems: 'center', gap: spazio.tre, paddingVertical: spazio.due },
})
