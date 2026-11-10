import { StyleSheet, Text, View } from "react-native";

import { t } from "@/lib/lingua";
import { spazio } from "@/theme";

import { Scelte } from "../ui/Campi";
import { F, usePalette } from "../ui/tema";
import { DOMANDE_LIVELLO, domandaChiusa, type Risposta, type RisposteLivello } from "./livelloAcqua";

// Le tre domande del questionario di livello, con Si' / No (10/11/2026): una sola mano per «Aggiungi un componente» (`FoglioComponente`) e per il
// questionario di chi e' gia' registrato (`LivelloDaCompilare`), cosi' le parole non divergono. `titolo` e' la riga sopra le domande, se serve.
//
// **Le domande sono consequenziali** (10/11/2026): «No» a una risposta mette «No» anche alle successive, e la domanda risposta dalla cascata si vede spenta e non si tocca. Chi la
// chiama deve scrivere le risposte con `applicaRisposta` (`livelloAcqua.ts`), non con una copia dell'oggetto: e' li' che sta la cascata.

export function DomandeLivello({
  risposte,
  onCambia,
  titolo,
}: {
  risposte: RisposteLivello;
  onCambia: (id: keyof RisposteLivello, v: Exclude<Risposta, null>) => void;
  titolo?: string;
}) {
  const p = usePalette();
  return (
    <View style={stili.livello}>
      {titolo ? <Text style={[stili.livelloTitolo, { color: p.testo }]}>{titolo}</Text> : null}
      {DOMANDE_LIVELLO.map((q) => {
        // Una domanda a cui la cascata ha gia' risposto «No» si vede spenta e non si tocca.
        const chiusa = domandaChiusa(risposte, q.id);
        return (
          <View key={q.id} style={[stili.domanda, chiusa ? stili.chiusa : null]} pointerEvents={chiusa ? "none" : "auto"}>
            <Text style={[stili.domandaTesto, { color: p.testo }]}>{t(q.it, q.en)}</Text>
            <Scelte
              valori={[
                { valore: "si", testo: t("Sì", "Yes") },
                { valore: "no", testo: t("No", "No") },
              ]}
              scelto={risposte[q.id]}
              onScegli={(v) => onCambia(q.id, v)}
            />
          </View>
        );
      })}
    </View>
  );
}

const stili = StyleSheet.create({
  livello: { gap: spazio.tre },
  livelloTitolo: { fontSize: 15, lineHeight: 21, fontFamily: F.extra },
  domanda: { gap: spazio.due },
  domandaTesto: { fontSize: 14, lineHeight: 20, fontFamily: F.semi },
  chiusa: { opacity: 0.5 },
});
