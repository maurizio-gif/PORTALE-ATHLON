import { useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { spazio } from "@/theme";

import { Icona } from "../ui/Icona";
import { Tocco } from "../ui/Tocco";
import { F, usePalette } from "../ui/tema";

// Il testo che spiega, chiuso finche' non lo si vuole (02/11/2026, richiesta di Maurizio: nella sezione Junior «c'e' troppo testo tutto
// insieme»). Una riga col titolo e il «+»: toccandola si legge tutto.

export function Dettagli({ titolo, children }: { titolo: string; children: ReactNode }) {
  const p = usePalette();
  const [aperto, setAperto] = useState(false);
  return (
    <View style={{ gap: spazio.due }}>
      <Tocco
        vibra="scelta"
        stato={{ expanded: aperto }}
        etichetta={titolo}
        onPress={() => setAperto((v) => !v)}
        style={stili.riga}
      >
        <Icona nome="info" size={16} colore={p.accento} />
        <Text style={[stili.titolo, { color: p.accento }]}>{titolo}</Text>
        <Icona nome={aperto ? "meno" : "piu"} size={14} colore={p.accento} />
      </Tocco>
      {aperto ? <View style={{ gap: spazio.due }}>{children}</View> : null}
    </View>
  );
}

const stili = StyleSheet.create({
  riga: { flexDirection: "row", alignItems: "center", gap: spazio.due, minHeight: 36 },
  titolo: { fontFamily: F.bold, fontSize: 14, flexShrink: 1 },
});
