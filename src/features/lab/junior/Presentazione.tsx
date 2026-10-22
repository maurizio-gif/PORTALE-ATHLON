import { StyleSheet, Text, View } from "react-native";

import { t } from "@/lib/lingua";
import { spazio } from "@/theme";

import { Icona, type NomeIcona } from "../ui/Icona";
import { F, MARE, raggio } from "../ui/tema";

// La testata della sezione Junior (22/10/2026, richiesta di Maurizio: «una vera sezione junior only one»). Un riquadro blu acqua, il colore
// del secondo riquadro forte dell'app, che dice a chi arriva che qui c'e' tutto: i corsi dei figli, le lezioni, i recuperi, i livelli,
// le iscrizioni. Solo Views e il tema: niente immagini ne' sfumature, funziona uguale su web e nativo.

const VOCI: { icona: NomeIcona; testo: () => string }[] = [
  { icona: "calendario", testo: () => t("Lezioni", "Classes") },
  { icona: "rinnovo", testo: () => t("Recuperi", "Make-ups") },
  { icona: "stella", testo: () => t("Livelli", "Levels") },
  { icona: "aggiungi", testo: () => t("Iscrizioni", "Enrollments") },
];

export function TestataJunior({ nome }: { nome?: string | null }) {
  return (
    <View
      style={[stili.riquadro, { backgroundColor: MARE[1] }]}
      accessible
      accessibilityRole="header"
      accessibilityLabel={t("Junior: i corsi dei tuoi figli, tutto in un posto", "Junior: your kids’ courses, all in one place")}
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
      <Text style={stili.titolo}>
        {nome
          ? t(`Tutto sui corsi di ${nome}, in un posto solo`, `Everything about ${nome}’s courses, in one place`)
          : t("I corsi dei tuoi figli, in un posto solo", "Your kids’ courses, in one place")}
      </Text>
      <Text style={stili.testo}>
        {t(
          "Iscrizioni, abbonamento, lezioni, recuperi e livelli: qui controlli tutto, e trovi spiegato come funziona.",
          "Enrollments, membership, classes, make-ups and levels: manage it all here, with explanations of how everything works.",
        )}
      </Text>
      <View style={stili.pillole}>
        {VOCI.map((v, i) => (
          <View key={i} style={stili.pillola}>
            <Icona nome={v.icona} size={14} colore="#fff" />
            <Text style={stili.pillolaTesto}>{v.testo()}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const stili = StyleSheet.create({
  riquadro: {
    borderRadius: raggio.grande,
    padding: spazio.quattro,
    gap: spazio.due,
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
  titolo: {
    color: "#fff",
    fontFamily: F.extra,
    fontSize: 24,
    lineHeight: 29,
    letterSpacing: -0.5,
  },
  testo: {
    color: "#fff",
    fontFamily: F.medio,
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.92,
  },
  pillole: { flexDirection: "row", flexWrap: "wrap", gap: spazio.due, marginTop: 4 },
  pillola: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    minHeight: 30,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  pillolaTesto: { color: "#fff", fontFamily: F.bold, fontSize: 13 },
});
