import { router } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Platform } from 'react-native'

import { chiamaLink } from '@/api/link'
import { Avviso } from '@/components/Avviso'
import { Bottone } from '@/components/Bottone'
import { Pagina } from '@/components/Pagina'
import { Testo } from '@/components/Testo'
import { CartaNonSalvata } from '@/features/metodo-pagamento/CartaNonSalvata'
import type { Cornice } from '@/features/metodo-pagamento/GestioneNucleo'
import { ElencoMetodi, type MetodoSalvato } from '@/features/metodo-pagamento/ElencoMetodi'
import { ElencoEsiti } from '@/features/metodo-pagamento/Metodo'
import { esitoRitornoCarta, type ContrattoNucleo, type EsitoContratto } from '@/lib/metodoPagamento'
import { t } from '@/lib/lingua'

// Il ritorno dalla pagina della carta (`thankYouPageUrl` = `/r/<token>/fatto`,
// o `/metodo-pagamento/fatto/<token>` per le richieste aperte dall'app):
// la carta e' gia' fra quelle del titolare, e qui si chiede di collegarla agli
// abbonamenti scelti prima di partire. Ripreso dal CRM (`ConfermaNucleo.tsx`).
//
// Si riprova: il gateway avvisa PerfectGym qualche secondo dopo il ritorno
// della persona, e la funzione risponde «in attesa» finche' la carta non
// compare. Un minuto, poi si dice che non e' andata — o subito, se l'indirizzo
// di ritorno dice gia' che non e' andata.

const TENTATIVI = 20
const PAUSA_MS = 3000

type Stato = 'attesa' | 'fatto' | 'non-trovata' | 'nessuna' | 'errore' | 'scegli'

/** L'indirizzo di ritorno com'e' arrivato, senza il token: i parametri del gateway. */
function parametriRitorno(params: Record<string, string | string[] | undefined>): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.search.slice(0, 500)
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (k !== 'token' && v != null) q.set(k, Array.isArray(v) ? v[0] : v)
  const s = q.toString()
  return (s ? `?${s}` : '').slice(0, 500)
}

export function RitornoCarta({
  token,
  params,
  Cornice = Pagina,
  onIndietro,
}: {
  token: string
  /** I parametri dell'indirizzo di ritorno (sull'app nativa: quelli del gateway). */
  params: Record<string, string | string[] | undefined>
  Cornice?: Cornice
  /** Dove si torna: di solito il link stesso, nell'app la schermata del metodo di pagamento. */
  onIndietro?: () => void
}) {
  const [stato, setStato] = useState<Stato>('attesa')
  const [contratti, setContratti] = useState<ContrattoNucleo[]>([])
  const [risultati, setRisultati] = useState<EsitoContratto[]>([])
  const [errore, setErrore] = useState('')
  const [motivo, setMotivo] = useState<string | null>(null)
  // La verifica e' riuscita ma la carta e' una che c'era gia' e non si sa quale: non e' una carta «non salvata».
  const [giaPresente, setGiaPresente] = useState(false)
  // Piu' carte valide e non si sa quale e' quella appena verificata: si mostrano e sceglie la persona.
  const [metodi, setMetodi] = useState<MetodoSalvato[]>([])
  const [salvando, setSalvando] = useState<number | null>(null)
  const [erroreScelta, setErroreScelta] = useState('')
  const partito = useRef(false)

  useEffect(() => {
    if (partito.current) return
    partito.current = true
    let fermo = false
    const ritorno = parametriRitorno(params)
    const fallitoSubito = esitoRitornoCarta(ritorno) === 'fallito'

    // I nomi servono solo a dire «salvata su Marco · Premium»: se la lettura
    // non va, l'esito si mostra coi numeri.
    chiamaLink(token, 'contratti').then(({ ok, dati }) => {
      if (ok && Array.isArray(dati.contratti)) setContratti(dati.contratti)
    })

    function nonSalvata() {
      setStato('non-trovata')
      chiamaLink(token, 'carta-fallita', { ritorno })
    }

    async function prova(n: number) {
      if (fermo) return
      const { stato: http, dati } = await chiamaLink(token, 'conferma', { ritorno })
      if (fermo) return
      if (http === 404 || dati.scaduto) {
        setErrore(t('Il link è scaduto mentre eri sulla pagina della carta.', 'The link expired while you were on the card page.'))
        return setStato('errore')
      }
      if (dati.ok) {
        setRisultati(dati.risultati ?? [])
        return setStato('fatto')
      }
      if (dati.nessuna) return setStato('nessuna')
      if (dati.scegli && Array.isArray(dati.metodi)) {
        setMetodi(dati.metodi as MetodoSalvato[])
        return setStato('scegli')
      }
      if (dati.fallita) {
        setMotivo(dati.motivo ?? null)
        setGiaPresente(dati.giaPresente === true)
        return setStato('non-trovata')
      }
      if (dati.inAttesa || http === 0) {
        if ((dati.inAttesa && fallitoSubito) || n + 1 >= TENTATIVI) return dati.inAttesa ? nonSalvata() : setStato('errore')
        setTimeout(() => prova(n + 1), PAUSA_MS)
        return
      }
      setErrore(dati.errore ?? '')
      setStato('errore')
    }
    prova(0)
    return () => {
      fermo = true
    }
    // Una volta sola, all'arrivo: `params` non cambia mentre si e' qui.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function usa(m: MetodoSalvato) {
    setErroreScelta('')
    setSalvando(m.fonte_id)
    // Senza `contratti`: valgono quelli che la persona aveva scelto prima di andare sulla pagina della carta.
    const { ok, dati } = await chiamaLink(token, 'usa_metodo', { fonte_id: m.fonte_id })
    setSalvando(null)
    if (!ok || !Array.isArray(dati.risultati)) {
      setErroreScelta(dati.errore ?? t('Non siamo riusciti a collegarla adesso. Riprova fra qualche minuto.', 'We couldn’t link it right now. Try again in a few minutes.'))
      return
    }
    setRisultati(dati.risultati as EsitoContratto[])
    setStato('fatto')
  }

  const indietro = onIndietro ?? (() => router.replace({ pathname: '/r/[token]', params: { token } }))
  const tutti = risultati.length > 0 && risultati.every((r) => r.ok)
  // Ha verificato una carta che gli abbonamenti usavano gia': e' andata bene, e non c'era niente da cambiare.
  const giaTutti = tutti && risultati.every((r) => r.invariato)

  if (stato === 'attesa') {
    return (
      <Cornice titolo={t('Un attimo…', 'Just a moment…')} indietro={false}>
        <Testo variante="attenuato">{t('Stiamo collegando la carta agli abbonamenti che hai scelto. Non chiudere questa pagina.', 'We’re linking the card to the memberships you chose. Don’t close this page.')}</Testo>
      </Cornice>
    )
  }

  if (stato === 'fatto') {
    return (
      <Cornice titolo={giaTutti ? t('Era già tutto a posto', 'It was already set up') : tutti ? t('Fatto, grazie!', 'Done, thank you!') : t('Ecco com’è andata', 'Here’s how it went')}>
        <Testo>
          {giaTutti
            ? t('La verifica è andata a buon fine: questa carta era già quella dei tuoi abbonamenti, quindi non abbiamo cambiato niente.', 'The check went through: this card was already the one on your memberships, so we didn’t change anything.')
            : t('La carta è stata collegata così:', 'The card was linked like this:')}
        </Testo>
        <ElencoEsiti contratti={contratti} risultati={risultati} />
        <Bottone testo={t('Torna ai tuoi abbonamenti', 'Back to your memberships')} variante="contorno" onPress={indietro} />
      </Cornice>
    )
  }

  if (stato === 'scegli') {
    return (
      <Cornice titolo={t('Quale carta vuoi usare?', 'Which card do you want to use?')}>
        <Testo>
          {t(
            'La verifica è andata a buon fine, ma la carta che hai inserito era già fra quelle salvate e ne hai più di una. Scegli quella da collegare ai tuoi abbonamenti.',
            'The check went through, but the card you entered was already among your saved ones and you have more than one. Choose the one to link to your memberships.',
          )}
        </Testo>
        {erroreScelta ? <Avviso>{erroreScelta}</Avviso> : null}
        <ElencoMetodi metodi={metodi} occupato={salvando !== null} inCorso={salvando} onScegli={usa} etichetta={() => t('Usa questa carta', 'Use this card')} />
        <Bottone testo={t('Non cambiare niente', 'Don’t change anything')} variante="contorno" onPress={indietro} />
      </Cornice>
    )
  }

  // Si arriva qui ricaricando la pagina dopo che la carta e' gia' stata
  // collegata: non c'e' niente in sospeso, e l'elenco dice com'e' adesso.
  if (stato === 'nessuna') {
    return (
      <Cornice titolo={t('Niente in sospeso', 'Nothing pending')}>
        <Testo variante="attenuato">
          {t('Non c’è nessuna carta in attesa di essere collegata. Controlla i tuoi abbonamenti per vedere il metodo di ciascuno.', 'There’s no card waiting to be linked. Check your memberships to see each one’s payment method.')}
        </Testo>
        <Bottone testo={t('Vai ai tuoi abbonamenti', 'Go to your memberships')} onPress={indietro} />
      </Cornice>
    )
  }

  if (stato === 'non-trovata') {
    return (
      <Cornice titolo={t('Metodo di pagamento', 'Payment method')}>
        <CartaNonSalvata motivo={motivo} giaPresente={giaPresente} onRiprova={indietro} />
      </Cornice>
    )
  }

  return (
    <Cornice titolo={t('Non siamo riusciti a completare', 'We couldn’t complete this')}>
      <Testo variante="attenuato">
        {errore || t('La carta potrebbe essere salvata ma non ancora collegata ai tuoi abbonamenti.', 'The card may be saved but not yet linked to your memberships.')}{' '}
        {t('Riprova fra qualche minuto dai tuoi abbonamenti.', 'Try again in a few minutes from your memberships.')}
      </Testo>
      <Bottone testo={t('Torna ai tuoi abbonamenti', 'Back to your memberships')} variante="contorno" onPress={indietro} />
    </Cornice>
  )
}
