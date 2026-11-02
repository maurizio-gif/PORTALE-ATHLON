import { StyleSheet, Text, View } from "react-native";

import { t } from "@/lib/lingua";
import { spazio } from "@/theme";

import { Icona } from "../ui/Icona";
import { F, MARE, raggio } from "../ui/tema";

// La testata della sezione Junior (22/10/2026, richiesta di Maurizio: «una vera sezione junior only one»). Un riquadro blu acqua, il colore
// del secondo riquadro forte dell'app. **Dal 02/11/2026 e' corta** (richiesta di Maurizio: «c'e' troppo testo tutto insieme»): solo il
// titolo, «I Corsi per Sara Palermo» (nome e cognome del bambino scelto); il paragrafo e le quattro pillole sono stati tolti. Solo Views e il tema: niente immagini ne'
// sfumature, funziona uguale su web e nativo.

export function TestataJunior({ nome }: { nome?: string | null }) {
  return (
    <View
      style={[stili.riquadro, { backgroundColor: MARE[1] }]}
      accessible
      accessibilityRole="header"
      accessibilityLabel={t("Junior: i corsi dei tuoi figli", "Junior: your kids’ courses")}
    >
      {/* Due onde di mare, cerchi del blu piu' scuro e piu' chiaro: la sola decorazione. */}
      <View style={[stili.onda, stili.ondaGrande, { backgroundColor: MARE[2] }]} />
      <View style={[stili.onda, stili.ondaPiccola, { backgroundColor: MARE[0] }]} />
      <View style={stili.testa}>
        <View style={stili.goccia}>
          <Icona nome="goccia" size={22} colore="#fff" />
        </View>
        <Text style={stili.sopra}>{t("Athlon Junior", "Athlon Junior")}</Text>
      </View>
      {nome ? (
        // Nome e cognome in evidenza (richiesta di Maurizio, 02/11/2026): «I Corsi per» piccolo e sopra, il nome grande sotto.
        <View style={{ gap: 2 }}>
          <Text style={stili.per}>{t("I Corsi per", "Courses for")}</Text>
          <Text style={stili.nomeGrande} numberOfLines={2}>
            {nome}
          </Text>
        </View>
      ) : (
        <Text style={stili.titolo}>{t("I corsi dei tuoi figli", "Your kids’ courses")}</Text>
      )}
    </View>
  );
}

const stili = StyleSheet.create({
  riquadro: {
    borderRadius: raggio.grande,
    padding: spazio.quattro,
    gap: spazio.tre,
    overflow: "hidden",
  },
  onda: { position: "absolute", borderRadius: 999, opacity: 0.55 },
  ondaGrande: { width: 220, height: 220, right: -70, top: -90 },
  ondaPiccola: { width: 120, height: 120, right: 30, bottom: -70, opacity: 0.35 },
  testa: { flexDirection: "row", alignItems: "center", gap: spazio.due },
  goccia: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  sopra: {
    color: "#fff",
    fontFamily: F.extra,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    opacity: 0.9,
  },
  per: { color: "rgba(255,255,255,0.88)", fontFamily: F.semi, fontSize: 17, letterSpacing: -0.2 },
  nomeGrande: { color: "#fff", fontFamily: F.extra, fontSize: 34, lineHeight: 38, letterSpacing: -1 },
  titolo: {
    color: "#fff",
    fontFamily: F.extra,
    fontSize: 24,
    lineHeight: 29,
    letterSpacing: -0.5,
  },
});
