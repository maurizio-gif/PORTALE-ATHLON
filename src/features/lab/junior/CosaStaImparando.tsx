import { Text, View } from "react-native";

import { t } from "@/lib/lingua";
import { spazio } from "@/theme";

import { F, usePalette } from "../ui/tema";
import { Dettagli } from "./Dettagli";
import { nomeLivello, type LivelloBrevetto } from "./datiBrevetti";

// «Cosa sta imparando in questo momento» (04/11/2026, richiesta di Maurizio): il programma del libretto del brevetto **in corso**, cioe' quello che il bambino sta facendo adesso
// (il livello dopo quello ottenuto; per chi non ha ancora ottenuto niente, A1). Chiuso finche' non lo si apre, come le altre spiegazioni della sezione Junior (`Dettagli`).
// Lo usano il viaggio (`ViaggioBrevetti`) e la carta «Brevetto in corso» di chi e' ancora in A1 (`Brevetti`).

export function CosaStaImparando({ livello }: { livello: LivelloBrevetto }) {
  const p = usePalette();
  return (
    <Dettagli titolo={t(`Cosa sta imparando in questo momento: ${nomeLivello(livello)}`, `What they’re learning right now: ${nomeLivello(livello)}`)}>
      {livello.programma().map((x, k) => (
        <View key={k} style={{ flexDirection: "row", gap: spazio.due, alignItems: "flex-start" }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, marginTop: 7, backgroundColor: p.accento }} />
          <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 13, lineHeight: 19, flex: 1, minWidth: 0 }}>{x}</Text>
        </View>
      ))}
    </Dettagli>
  );
}
