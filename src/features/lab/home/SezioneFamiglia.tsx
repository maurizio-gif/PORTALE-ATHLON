import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { Text, View } from 'react-native'

import { statoDelega, type DelegaAttiva } from '@/api/delega'
import type { Area } from '@/api/lab'
import { dataBreve } from '@/lib/metodoPagamento'
import { spazio } from '@/theme'
import { t } from '@/lib/lingua'

import { AggiungiComponente } from '../famiglia/AggiungiComponente'
import { CHIAVE_GRUPPI_JUNIOR } from '../junior/Junior'
import { scorda } from '../memoria'
import { Avatar, Carta, Etichetta, Messaggio, Riga } from '../ui/kit'
import { BollinoDebito } from '../ui/Irregolarita'
import { F, usePalette } from '../ui/tema'
import { vistaCorrente } from '../vista'
import { nome, statoCertificato } from './certificato'

// La sezione Famiglia della Home: le persone del nucleo, con la data di
// nascita, il certificato in sintesi e il bollino di un pagamento in sospeso.
// Il dettaglio del certificato sta nella sezione Certificato.
//
// In fondo «Aggiungi un componente» (31/10/2026, richiesta di Maurizio; lo stesso pulsante di Junior): un figlio, che la funzione
// controlla non sia gia' al club, oppure un altro adulto a cui dare la delega sui figli (`/delega`). Mai in vista cliente.
//
// **Chi ha accesso ai tuoi figli** (01/11/2026, richiesta di Maurizio dopo il test di Sara): sotto le persone del nucleo, una riga per ogni adulto
// con una delega attiva, **con nome e cognome interi** e da quando; tocca per aprire la schermata della delega. **Non e' nel nucleo**: la delega
// non lo mette fra le persone della famiglia (non vede niente del titolare), e la riga e' di sola lettura. Si legge da `portale-lab-delega`
// (`stato`) a ogni ritorno sulla sezione; senza risposta, o in vista cliente (la funzione e' chiusa), la riga non c'e'.

type AreaTrovata = Extract<Area, { trovato: true }>

export function SezioneFamiglia({ area, onAggiorna }: { area: AreaTrovata; onAggiorna: () => void }) {
  const p = usePalette()
  const [aggiunto, setAggiunto] = useState<string | null>(null)
  const [deleghe, setDeleghe] = useState<DelegaAttiva[]>([])

  useFocusEffect(
    useCallback(() => {
      if (vistaCorrente()) return
      let vivo = true
      statoDelega().then((r) => {
        if (vivo) setDeleghe(r.ok && r.idoneo ? r.attive : [])
      })
      return () => {
        vivo = false
      }
    }, []),
  )
  return (
    <View style={{ gap: spazio.due }}>
      <Carta style={{ paddingVertical: spazio.due }}>
        {area.persone.map((x, i) => {
          const s = statoCertificato(area.certificati.find((c) => c.member_id === x.member_id), x.data_nascita)
          return (
            <Riga
              key={x.member_id}
              prima={i === 0}
              testa={<Avatar nome={x.nome} cognome={x.cognome} size={40} />}
              titolo={nome(x)}
              sotto={
                <View style={{ gap: 6, alignItems: 'flex-start' }}>
                  <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 13.5 }}>
                    {[x.titolare ? t('Tu, titolare', 'You, account holder') : t('Familiare', 'Family member'), dataBreve(x.data_nascita) ? t(`nato/a il ${dataBreve(x.data_nascita)}`, `born ${dataBreve(x.data_nascita)}`) : null].filter(Boolean).join(' · ')}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    <Etichetta testo={t(`Certificato: ${s.testo.toLowerCase()}`, `Certificate: ${s.testo.toLowerCase()}`)} tono={s.tono} />
                    <BollinoDebito debito={x.debito} />
                  </View>
                </View>
              }
            />
          )
        })}
      </Carta>
      {deleghe.length ? (
        <Carta style={{ paddingVertical: spazio.due }}>
          {deleghe.map((d, i) => {
            const intero = (d.nome_completo ?? d.nome).trim()
            const [primo, ...resto] = intero.split(/\s+/)
            return (
              <Riga
                key={d.id}
                prima={i === 0}
                testa={<Avatar nome={primo ?? null} cognome={resto.join(' ')} size={40} />}
                titolo={intero}
                sotto={
                  <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 13.5 }}>
                    {[t('Ha accesso ai tuoi figli', 'Has access to your children'), dataBreve(d.dal) ? t(`dal ${dataBreve(d.dal)}`, `since ${dataBreve(d.dal)}`) : null].filter(Boolean).join(' · ')}
                  </Text>
                }
                onPress={() => router.navigate('/delega')}
              />
            )
          })}
        </Carta>
      ) : null}
      {area.persone.length === 1 ? (
        <Text style={{ color: p.testoTerzo, fontFamily: F.medio, fontSize: 13, lineHeight: 19, paddingHorizontal: 4 }}>
          {t('Sulla tua scheda non ci sono altre persone: i familiari iscritti al club compaiono qui.', 'There is no one else on your account: family members registered with the club show up here.')}
        </Text>
      ) : null}
      {aggiunto ? <Messaggio tono="ok">{aggiunto}</Messaggio> : null}
      <AggiungiComponente
        onApri={() => setAggiunto(null)}
        onAggiunto={(nome) => {
          setAggiunto(t(`${nome} è nel tuo nucleo familiare.`, `${nome} is now in your family members.`))
          // L'area e Junior hanno il nucleo di prima: si rileggono.
          scorda('area')
          scorda(CHIAVE_GRUPPI_JUNIOR)
          onAggiorna()
        }}
      />
    </View>
  )
}
