import { useState } from 'react'
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native'

import {
  annullaAppuntamento,
  giorniLiberi,
  spostaAppuntamento,
  type Appuntamento,
  type Calendario,
  type GiornoPrenotabile,
} from '@/api/appuntamenti'
import { Avviso } from '@/components/Avviso'
import { Bottone } from '@/components/Bottone'
import { Pagina } from '@/components/Pagina'
import { Scelta } from '@/components/Scelta'
import { Testo } from '@/components/Testo'
import { spazio, useColori } from '@/theme'

// L'appuntamento telefonico visto da chi l'ha preso: vederlo, spostarlo,
// annullarlo. Ripreso dal CRM (`app/appuntamento/[token]/GestioneAppuntamento.tsx`).
//
// La disdetta chiede conferma, lo spostamento no: annullare e' irreversibile da
// qui (per riprenotare si torna sul sito), spostare si puo' rifare quante volte
// si vuole.

type Schermata = 'riepilogo' | 'sposta' | 'conferma-annulla' | 'annullato' | 'spostato'

function quando(giorni: GiornoPrenotabile[], data: string, ora: string): string {
  const giorno = giorni.find((g) => g.data === data)
  return `${giorno ? giorno.etichetta : data} alle ${ora}`
}

export function GestioneAppuntamento({
  token,
  calendario,
  iniziale,
  giorni,
}: {
  token: string
  calendario: Calendario
  iniziale: Appuntamento
  giorni: GiornoPrenotabile[]
}) {
  const c = useColori()
  const [appuntamento, setAppuntamento] = useState(iniziale)
  const [schermata, setSchermata] = useState<Schermata>(iniziale.stato === 'da_fare' ? 'riepilogo' : 'annullato')
  const [giornoAperto, setGiornoAperto] = useState('')
  const [scelto, setScelto] = useState<{ data: string; ora: string } | null>(null)
  const [errore, setErrore] = useState('')
  const [attesa, setAttesa] = useState(false)
  const [listaGiorni, setListaGiorni] = useState(giorni)

  // Per il desk sotto l'orario c'e' l'argomento scritto da chi ha prenotato;
  // per il Direttore Tecnico il nome del bambino di cui si parla.
  const etichettaOggetto = calendario === 'nuoto' ? 'Per' : 'Argomento'
  // «ti chiamiamo noi» per il desk, «ti chiama il Direttore Tecnico» per il nuoto.
  const tiChiama = calendario === 'nuoto' ? 'ti chiama il Direttore Tecnico' : 'ti chiamiamo noi'
  const etichetta = quando(listaGiorni, appuntamento.data, appuntamento.ora)
  const giorno = listaGiorni.find((g) => g.data === giornoAperto)
  const contatto = calendario === 'nuoto' ? 'nuoto@athlonroma.it' : 'desk@athlonroma.it'

  async function annulla() {
    setErrore('')
    setAttesa(true)
    const esito = await annullaAppuntamento(calendario, token)
    setAttesa(false)
    if (esito.ok) setSchermata('annullato')
    else {
      setErrore(esito.errore)
      setSchermata('riepilogo')
    }
  }

  async function sposta() {
    if (!scelto) return
    setErrore('')
    setAttesa(true)
    const esito = await spostaAppuntamento(calendario, token, scelto)
    if (esito.ok) {
      setAppuntamento({ ...appuntamento, ...scelto })
      setSchermata('spostato')
    } else {
      // L'orario e' sparito mentre sceglieva: si ricaricano gli orari veri.
      if (esito.slotOccupato) {
        const freschi = await giorniLiberi(calendario, token)
        if (freschi) setListaGiorni(freschi)
        setScelto(null)
      }
      setErrore(esito.errore)
    }
    setAttesa(false)
  }

  const orario = <Text style={[stili.orario, { color: c.accento }]}>{etichetta}</Text>

  if (schermata === 'annullato') {
    return (
      <Pagina titolo="Appuntamento annullato">
        <Testo variante="attenuato">Non ti chiamiamo più. Quando vuoi puoi prenotarne un altro dal sito, oppure scriverci a {contatto}.</Testo>
        <Bottone testo="Torna al sito" onPress={() => Linking.openURL('https://www.athlonroma.it')} />
      </Pagina>
    )
  }

  if (schermata === 'spostato') {
    return (
      <Pagina titolo="Spostato">
        {orario}
        <Testo variante="attenuato">{tiChiama.charAt(0).toUpperCase() + tiChiama.slice(1)} al nuovo orario. Se cambia di nuovo qualcosa, questo stesso link resta valido.</Testo>
        <Bottone testo="Va bene" onPress={() => setSchermata('riepilogo')} />
      </Pagina>
    )
  }

  if (schermata === 'conferma-annulla') {
    return (
      <Pagina titolo="Annulliamo la telefonata?" sottotitolo={etichetta}>
        <Testo variante="attenuato">Da qui non si torna indietro: per un nuovo appuntamento si prenota di nuovo dal sito.</Testo>
        <Bottone testo="Sì, annulla l’appuntamento" onPress={annulla} inCorso={attesa} />
        <Bottone testo="No, tienilo" variante="contorno" onPress={() => setSchermata('riepilogo')} disabilitato={attesa} />
      </Pagina>
    )
  }

  if (schermata === 'sposta') {
    return (
      <Pagina titolo="Quando ti chiamiamo?" sottotitolo={`Adesso sei su ${etichetta}. Scegli un altro momento nei prossimi giorni.`}>
        {listaGiorni.length === 0 ? (
          <Testo variante="attenuato">Non ci sono altri orari liberi in questi giorni. Scrivici a {contatto} e troviamo un momento.</Testo>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={stili.giorni}>
              {listaGiorni.map((g) => {
                const [settimana, numero] = g.etichetta.split(' ')
                const attivo = g.data === giornoAperto
                const colore = attivo ? c.suAccento : c.testo
                return (
                  <Scelta
                    key={g.data}
                    scelta={attivo}
                    etichetta={`${g.etichetta}, ${g.slot.length} orari liberi`}
                    onPress={() => {
                      setGiornoAperto(g.data)
                      setScelto(null)
                    }}
                    stile={stili.giorno}
                  >
                    <Text style={[stili.settimana, { color: colore }]}>{settimana}</Text>
                    <Text style={[stili.numero, { color: colore }]}>{numero}</Text>
                    <Text style={[stili.liberi, { color: colore }]}>{g.slot.length} liberi</Text>
                  </Scelta>
                )
              })}
            </ScrollView>
            {!giorno ? (
              <Testo variante="attenuato">Scegli un giorno per vedere gli orari liberi.</Testo>
            ) : (
              <View style={stili.orari}>
                {giorno.slot.map((o) => {
                  const attivo = scelto?.data === giorno.data && scelto?.ora === o
                  return (
                    <Scelta key={o} scelta={attivo} onPress={() => setScelto({ data: giorno.data, ora: o })} stile={stili.slot} etichetta={o}>
                      <Text style={[stili.testoSlot, { color: attivo ? c.suAccento : c.testo, fontWeight: attivo ? '700' : '400' }]}>{o}</Text>
                    </Scelta>
                  )
                })}
              </View>
            )}
          </>
        )}
        {errore ? <Avviso>{errore}</Avviso> : null}
        <Bottone
          testo={scelto ? `Sposta a ${quando(listaGiorni, scelto.data, scelto.ora)}` : 'Scegli un orario'}
          onPress={sposta}
          disabilitato={!scelto}
          inCorso={attesa}
        />
        <Bottone testo="Indietro" variante="contorno" onPress={() => setSchermata('riepilogo')} disabilitato={attesa} />
      </Pagina>
    )
  }

  const primo = appuntamento.nome ? appuntamento.nome.split(' ')[0] : ''
  return (
    <Pagina titolo={primo ? `${primo}, ${tiChiama}` : tiChiama.charAt(0).toUpperCase() + tiChiama.slice(1)}>
      {orario}
      {appuntamento.oggetto ? (
        <Testo variante="attenuato">
          {etichettaOggetto}: <Text style={{ fontStyle: 'italic' }}>{appuntamento.oggetto}</Text>
        </Testo>
      ) : null}
      {errore ? <Avviso>{errore}</Avviso> : null}
      <Bottone testo="Sposta a un altro orario" onPress={() => setSchermata('sposta')} disabilitato={attesa} />
      <Bottone testo="Annulla l’appuntamento" variante="contorno" onPress={() => setSchermata('conferma-annulla')} disabilitato={attesa} />
    </Pagina>
  )
}

const stili = StyleSheet.create({
  orario: { fontSize: 21, fontWeight: '700' },
  giorni: { gap: spazio.due, paddingBottom: spazio.uno },
  giorno: { minWidth: 76, alignItems: 'center' },
  settimana: { fontSize: 11, textTransform: 'uppercase', opacity: 0.8 },
  numero: { fontSize: 17, fontWeight: '700' },
  liberi: { fontSize: 10, opacity: 0.75 },
  orari: { flexDirection: 'row', flexWrap: 'wrap', gap: spazio.due },
  slot: { minWidth: 72, alignItems: 'center' },
  testoSlot: { fontSize: 15, fontVariant: ['tabular-nums'] },
})
