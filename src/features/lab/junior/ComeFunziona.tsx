import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { t } from "@/lib/lingua";
import { spazio } from "@/theme";

import { Icona, type NomeIcona } from "../ui/Icona";
import { Carta, Sezione } from "../ui/kit";
import { Tocco } from "../ui/Tocco";
import { F, usePalette, velo } from "../ui/tema";

// «Come funziona» (22/10/2026, richiesta di Maurizio): chi arriva direttamente nella sezione Junior, anche chi non e' ancora iscritto, trova
// spiegato come funzionano le lezioni, il monosettimanale e il bisettimanale, i recuperi, i gruppi agonistici e il Baby Nuoto. Tendine chiuse:
// sono per chi le apre, e non spingono giu' i corsi di chi li conosce gia'. **Ogni frase ripete una regola scritta dal club** (sito, Termini e Wiki):
// se una regola cambia, cambia qui, nella scheda del Wiki e nella knowledge base dell'assistente, o l'app dice una cosa e il sito un'altra.

type Voce = { icona: NomeIcona; titolo: () => string; righe: () => string[] };

const VOCI: Voce[] = [
  {
    icona: "calendario",
    titolo: () => t("Come funzionano le lezioni", "How classes work"),
    righe: () => [
      t(
        "Nella Scuola Nuoto il turno è fisso: giorno e ora si scelgono quando ci si iscrive e restano gli stessi per tutta la stagione. Non si prenota lezione per lezione.",
        "In the Swim School the slot is fixed: you pick the day and time when you enroll and they stay the same all season. There’s no booking class by class.",
      ),
      t(
        "L’abbonamento è mensile e segue il mese di calendario: si rinnova il 1° del mese. Se si comincia a mese iniziato, la prima quota copre solo i giorni che restano.",
        "The membership is monthly and follows the calendar month: it renews on the 1st. If you start mid-month, the first payment covers only the days left.",
      ),
      t(
        "Qui vedi le prossime lezioni del corso fino alla fine del contratto.",
        "Here you can see the course’s upcoming classes until the end of the contract.",
      ),
    ],
  },
  {
    icona: "persone",
    titolo: () => t("Monosettimanale e bisettimanale", "Once a week or twice a week"),
    righe: () => [
      t(
        "Monosettimanale: una lezione a settimana, sempre nello stesso giorno e alla stessa ora.",
        "Once a week: one class a week, always on the same day and at the same time.",
      ),
      t(
        "Bisettimanale: due lezioni a settimana, due turni fissi (per esempio lunedì e giovedì, alla stessa ora).",
        "Twice a week: two classes a week, two fixed slots (for example Monday and Thursday, at the same time).",
      ),
      t(
        "Dal monosettimanale al bisettimanale: il contratto non si rifà e la quota di attivazione non si paga di nuovo. Si chiede alla segreteria, indicando il secondo turno.",
        "From once to twice a week: the contract isn’t redone and the activation fee isn’t charged again. Ask the front desk, naming the second slot.",
      ),
      t(
        "Dal bisettimanale al monosettimanale: si disdice e ci si iscrive di nuovo dal primo giorno del mese successivo, con una nuova quota di attivazione.",
        "From twice to once a week: you cancel and enroll again from the first day of the following month, with a new activation fee.",
      ),
    ],
  },
  {
    icona: "rinnovo",
    titolo: () => t("Come funzionano i recuperi", "How make-ups work"),
    righe: () => [
      t(
        "Se non puoi venire, disdici la lezione fino a 1 ora prima dell’inizio: ottieni un recupero, uno per ogni disdetta fatta in tempo.",
        "If you can’t make it, cancel the class up to 1 hour before it starts: you get a make-up, one for each cancellation made in time.",
      ),
      t(
        "Il recupero si usa prenotando un’altra lezione della tua fascia d’età: non serve per tornare alla lezione appena disdetta. Si prenota da 3 giorni prima.",
        "You use a make-up by booking another class for your age group: it can’t bring you back to the class you just cancelled. Booking opens 3 days ahead.",
      ),
      t(
        "I recuperi non usati scadono alla fine del mese del contratto. Qui vedi quante lezioni hai disdetto, recuperato e ancora da recuperare.",
        "Unused make-ups expire at the end of the contract’s month. Here you can see how many classes you cancelled, made up and still have to make up.",
      ),
      t(
        "Una disdetta oltre l’ora non dà diritto al recupero. I recuperi sono della Scuola Nuoto Bambini.",
        "A cancellation inside that hour doesn’t earn a make-up. Make-ups are for the Kids Swim School.",
      ),
    ],
  },
  {
    icona: "bandiera",
    titolo: () => t("Agonistico, Propaganda e Pallanuoto", "Competitive, Propaganda and Water polo"),
    righe: () => [
      t(
        "Sono gruppi con giorni e orari propri: li vedi sotto, accanto a ogni gruppo.",
        "These are groups with their own days and times: you’ll see them next to each group below.",
      ),
      t(
        "Non hanno recuperi: i recuperi sono solo della Scuola Nuoto Bambini.",
        "They have no make-ups: make-ups only apply to the Kids Swim School.",
      ),
    ],
  },
  {
    icona: "goccia",
    titolo: () => t("Baby Nuoto", "Baby Swim"),
    righe: () => [
      t(
        "Dai 3 ai 36 mesi, con un genitore in acqua. Qui si prenota lezione per lezione, oppure si sceglie l’abbonamento mensile.",
        "From 3 to 36 months, with a parent in the water. Here you book class by class, or choose the monthly membership.",
      ),
    ],
  },
  {
    icona: "stella",
    titolo: () => t("Livelli", "Levels"),
    righe: () => [
      t(
        "Nella Scuola Nuoto Bambini ogni bambino ha il suo livello. Lo vedi accanto al nome e puoi aprirne la storia. Le date dei passaggi sono quelle in cui li abbiamo visti cambiare, a partire dal 22 ottobre 2026.",
        "In the Kids Swim School every child has their own level. You see it next to their name and can open its history. Dates are when we saw each change, starting 22 October 2026.",
      ),
    ],
  },
  {
    icona: "stop",
    titolo: () => t("Se il turno è al completo", "If a slot is full"),
    righe: () => [
      t(
        "Per iscriversi a un turno non c’è una lista d’attesa: si sceglie un altro turno con posti liberi. Se nessuno va bene, scrivi alla segreteria.",
        "There’s no waiting list for a slot: pick another slot with spots available. If none works, write to the front desk.",
      ),
    ],
  },
];

export function ComeFunziona() {
  const p = usePalette();
  const [aperta, setAperta] = useState<number | null>(null);
  return (
    <Sezione titolo={t("Come funziona", "How it works")}>
      <Carta>
        {VOCI.map((v, i) => {
          const on = aperta === i;
          return (
            <View key={i}>
              <Tocco
                vibra="scelta"
                stato={{ expanded: on }}
                etichetta={v.titolo()}
                onPress={() => setAperta(on ? null : i)}
                style={[
                  stili.testa,
                  i > 0 && {
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: p.linea,
                  },
                ]}
              >
                <View style={[stili.bollino, { backgroundColor: velo(p, "blu", p.scuro ? 0.2 : 0.12) }]}>
                  <Icona nome={v.icona} size={18} colore={p.blu} />
                </View>
                <Text style={[stili.titolo, { color: p.testo }]}>{v.titolo()}</Text>
                <Icona nome={on ? "meno" : "piu"} size={16} colore={p.testoSecondario} />
              </Tocco>
              {on ? (
                <View style={stili.corpo}>
                  {v.righe().map((r, j) => (
                    <View key={j} style={stili.riga}>
                      <View style={[stili.punto, { backgroundColor: p.blu }]} />
                      <Text style={[stili.testo, { color: p.testoSecondario }]}>{r}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}
      </Carta>
    </Sezione>
  );
}

const stili = StyleSheet.create({
  testa: {
    flexDirection: "row",
    alignItems: "center",
    gap: spazio.tre,
    minHeight: 56,
    paddingVertical: spazio.due,
    paddingHorizontal: spazio.tre,
  },
  bollino: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  titolo: { flex: 1, minWidth: 0, fontFamily: F.bold, fontSize: 15, lineHeight: 20 },
  corpo: { gap: spazio.due, paddingHorizontal: spazio.tre, paddingBottom: spazio.tre },
  riga: { flexDirection: "row", gap: spazio.due, alignItems: "flex-start" },
  punto: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  testo: { flex: 1, minWidth: 0, fontFamily: F.medio, fontSize: 14, lineHeight: 21 },
});
