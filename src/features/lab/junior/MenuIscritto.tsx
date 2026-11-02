import { StyleSheet, Text, View } from "react-native";

import { t } from "@/lib/lingua";
import { spazio } from "@/theme";

import { Icona, type NomeIcona } from "../ui/Icona";
import { Tocco } from "../ui/Tocco";
import { F, usePalette, velo } from "../ui/tema";

// Il menu di un bambino che ha un abbonamento attivo (02/11/2026, richiesta di Maurizio: «una sorta di menu con ancore, che ti dice
// cosa puoi andare a vedere, senza che scorri all'infinito»). Una fila di voci con l'icona; toccandone una sotto compare solo quella
// parte, come i riquadri della Home: la pagina resta corta e non e' un elenco unico di tutto.

export type VoceJunior = "abbonamento" | "lezioni" | "recuperi" | "livello" | "cambio" | "dt" | "attivita";

const VOCI: Record<VoceJunior, { icona: NomeIcona; testo: () => string }> = {
  abbonamento: { icona: "abbonamento", testo: () => t("Abbonamento", "Membership") },
  lezioni: { icona: "calendario", testo: () => t("Lezioni", "Classes") },
  recuperi: { icona: "rinnovo", testo: () => t("Recuperi", "Make-ups") },
  livello: { icona: "stella", testo: () => t("Livello", "Level") },
  cambio: { icona: "orologio", testo: () => t("Cambio orario", "Change time") },
  dt: { icona: "telefono", testo: () => t("Direttore Tecnico", "Technical Director") },
  attivita: { icona: "info", testo: () => t("Da sapere", "Good to know") },
};

export function MenuIscritto({
  voci,
  scelta,
  onScegli,
}: {
  voci: VoceJunior[];
  scelta: VoceJunior;
  onScegli: (v: VoceJunior) => void;
}) {
  const p = usePalette();
  return (
    <View style={stili.fila} accessibilityRole="tablist">
      {voci.map((v) => {
        const on = v === scelta;
        return (
          <Tocco
            key={v}
            vibra="scelta"
            ruolo="tab"
            stato={{ selected: on }}
            etichetta={VOCI[v].testo()}
            onPress={() => onScegli(v)}
            style={[
              stili.voce,
              {
                backgroundColor: on ? velo(p, "accento", p.scuro ? 0.18 : 0.1) : p.carta,
                borderColor: on ? p.accento : p.linea,
              },
            ]}
          >
            <Icona nome={VOCI[v].icona} size={17} colore={on ? p.accento : p.testoSecondario} />
            <Text style={{ color: p.testo, fontFamily: on ? F.extra : F.bold, fontSize: 14 }}>{VOCI[v].testo()}</Text>
          </Tocco>
        );
      })}
    </View>
  );
}

const stili = StyleSheet.create({
  fila: { flexDirection: "row", flexWrap: "wrap", gap: spazio.due },
  voce: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
  },
});
