import { useCallback, useEffect, useState } from 'react'
import { Text, View } from 'react-native'

import { apriDocumento, elencoDocumenti, type Documento } from '@/api/documenti'
import { spazio } from '@/theme'
import { locale, t } from '@/lib/lingua'

import { useApriPdf } from '../apriPdf'
import { inMemoria, prendi } from '../memoria'
import { Carta, LinkSezione, Messaggio, Pulsante, Riga, SchedeInArrivo, Sezione } from '../ui/kit'
import { F, usePalette } from '../ui/tema'

// La sezione Documenti della Home: i PDF del socio e della famiglia, dal piu'
// recente, divisi in contratti e moduli, ricevute, altri. Si toccano e si
// aprono: il link lo chiede il server nel momento in cui serve.
//
// I moduli non hanno data: PerfectGym non dice quando li ha prodotti, e qui non
// si inventa. L'ordine e' comunque dal piu' recente, perche' l'id che li
// ordina cresce con il tempo.

export const CHIAVE_DOCUMENTI = 'documenti:elenco'

/** Quanti se ne mostrano per gruppo prima di «Mostra tutti»: lo storico di chi c'e' dal 2021 e' lungo. */
const PRIMI = 8

type Dati = { documenti: Documento[] }

export function useDocumenti() {
  const [dati, setDati] = useState<Dati | null>(() => {
    const m = inMemoria<{ ok: true; documenti: Documento[] }>(CHIAVE_DOCUMENTI)
    return m ? { documenti: m.documenti } : null
  })
  const [errore, setErrore] = useState<string | null>(null)
  const carica = useCallback(async () => {
    setErrore(null)
    const r = await prendi(CHIAVE_DOCUMENTI, elencoDocumenti)
    if (r.ok) setDati({ documenti: r.documenti })
    else setErrore(r.errore)
  }, [])
  useEffect(() => {
    carica()
  }, [carica])
  return { dati, errore, carica }
}

function giorno(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Rome' })
}

function RigaDocumento({ d, prima, aperto, onApri }: { d: Documento; prima: boolean; aperto: boolean; onApri: () => void }) {
  const p = usePalette()
  const sotto = [d.sottotitolo, d.persona, d.data ? giorno(d.data) : null].filter(Boolean).join(' · ')
  return (
    <Riga
      prima={prima}
      icona={d.tipo === 'ricevuta' ? 'ricevuta' : 'documento'}
      tono={d.tipo === 'ricevuta' ? 'attenzione' : 'accento'}
      titolo={d.titolo}
      sotto={sotto || undefined}
      onPress={aperto ? undefined : onApri}
      coda={aperto ? <Text style={{ color: p.testoSecondario, fontFamily: F.semi, fontSize: 13 }}>{t('Apro…', 'Opening…')}</Text> : undefined}
    />
  )
}

function Gruppo({ titolo, elenco, aperto, onApri }: { titolo: string; elenco: Documento[]; aperto: string | null; onApri: (d: Documento) => void }) {
  const [tutti, setTutti] = useState(false)
  if (!elenco.length) return null
  const visibili = tutti ? elenco : elenco.slice(0, PRIMI)
  return (
    <Sezione titolo={titolo} conteggio={elenco.length} destra={elenco.length > PRIMI ? <LinkSezione testo={tutti ? t('Mostra meno', 'Show less') : t('Mostra tutti', 'Show all')} onPress={() => setTutti(!tutti)} /> : undefined}>
      <Carta style={{ paddingVertical: spazio.due }}>
        {visibili.map((d, i) => (
          <RigaDocumento key={`${d.origine}:${d.id}`} d={d} prima={i === 0} aperto={aperto === `${d.origine}:${d.id}`} onApri={() => onApri(d)} />
        ))}
      </Carta>
    </Sezione>
  )
}

export function SezioneDocumenti() {
  const p = usePalette()
  const { dati, errore, carica } = useDocumenti()
  const [aperto, setAperto] = useState<string | null>(null)
  const { apri: apriPdf, avviso } = useApriPdf()

  async function apri(d: Documento) {
    setAperto(`${d.origine}:${d.id}`)
    await apriPdf(async () => {
      const r = await apriDocumento(d)
      // Il nome del file, per chi lo salva o lo invia: il titolo del documento.
      return r.ok ? { ...r, nome: `${d.titolo.replace(/[^\p{L}\p{N} _-]/gu, '').trim() || t('documento', 'document')}.pdf` } : r
    })
    setAperto(null)
  }

  if (!dati && errore) {
    return (
      <View style={{ gap: spazio.tre }}>
        <Messaggio>{errore}</Messaggio>
        <Pulsante testo={t('Riprova', 'Try again')} icona="aggiorna" variante="secondario" onPress={carica} />
      </View>
    )
  }
  if (!dati) return <SchedeInArrivo quante={2} />

  const documenti = dati.documenti
  if (!documenti.length) {
    return (
      <Carta piatta>
        <Text style={{ color: p.testo, fontFamily: F.semi, fontSize: 15, lineHeight: 22 }}>{t('Non ci sono ancora documenti sulla tua scheda.', 'There are no documents on your account yet.')}</Text>
        <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 13.5, lineHeight: 20, marginTop: 4 }}>
          {t('I contratti, i moduli firmati e le ricevute dei pagamenti compaiono qui appena il club li emette.', 'Contracts, signed forms and payment receipts show up here as soon as the club issues them.')}
        </Text>
      </Carta>
    )
  }

  return (
    <View style={{ gap: spazio.quattro }}>
      {avviso}
      <Gruppo titolo={t('Contratti e moduli', 'Contracts and forms')} elenco={documenti.filter((d) => d.tipo === 'contratto')} aperto={aperto} onApri={apri} />
      <Gruppo titolo={t('Ricevute', 'Receipts')} elenco={documenti.filter((d) => d.tipo === 'ricevuta')} aperto={aperto} onApri={apri} />
      <Gruppo titolo={t('Altri documenti', 'Other documents')} elenco={documenti.filter((d) => d.tipo === 'altro')} aperto={aperto} onApri={apri} />
      <Text style={{ color: p.testoTerzo, fontFamily: F.medio, fontSize: 13, lineHeight: 19, paddingHorizontal: 4 }}>
        {t('Sono i documenti che il club ha reso visibili sulla tua scheda. Se ne manca uno che ti aspetti, scrivi al club.', 'These are the documents the club has made visible on your account. If one you expect is missing, write to the club.')}
      </Text>
    </View>
  )
}
