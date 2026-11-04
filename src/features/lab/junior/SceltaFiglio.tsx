import { StyleSheet, Text, View } from "react-native";

import type { NucleoJunior, PersonaJunior } from "@/api/junior";
import { t } from "@/lib/lingua";
import { spazio } from "@/theme";

import { AggiungiComponente } from "../famiglia/AggiungiComponente";
import { Icona } from "../ui/Icona";
import { Avatar } from "../ui/kit";
import { Tocco } from "../ui/Tocco";
import { F, usePalette, velo } from "../ui/tema";

// «Per chi stai scegliendo?» (02/11/2026, richiesta di Maurizio): la sezione Junior comincia dalla scelta del bambino, o dal
// pulsante per aggiungerne uno nuovo. Prima c'era l'elenco della famiglia con una riga di testo per persona: ora una fila di
// tessere con l'avatar e il nome, e in fondo «Aggiungi». Chi non e' ancora in eta' per i corsi (un neonato) compare spento, con il
// motivo in una riga sola sotto la fila.

export function SceltaFiglio({
  persone,
  scelta,
  onScegli,
  onAggiunto,
  onApriAggiungi,
  tutti,
}: {
  persone: PersonaJunior[];
  scelta: number | null;
  onScegli: (memberId: number) => void;
  onAggiunto: (nome: string, nucleo: NucleoJunior | null) => void;
  onApriAggiungi: () => void;
  /** «Tutti i tuoi figli» (04/11/2026): con due o piu' figli in eta' da Scuola Nuoto, una tessera in piu' con i turni da fare insieme. */
  tutti?: { scelto: boolean; onScegli: () => void } | null;
}) {
  const p = usePalette();
  const nonIdonei = persone.filter((x) => !x.idoneo && x.motivo);
  return (
    <View style={{ gap: spazio.due }}>
      <Text style={[stili.titolo, { color: p.testoSecondario }]} accessibilityRole="header">
        {persone.length
          ? t("Per chi stai scegliendo?", "Who is this for?")
          : t("Aggiungi un figlio", "Add a child")}
      </Text>
      <View style={stili.fila}>
        {persone.map((x) => {
          const sel = x.member_id === scelta;
          return (
            <Tocco
              key={x.member_id}
              vibra="scelta"
              stato={{ selected: sel, disabled: !x.idoneo }}
              etichetta={[x.nome, x.cognome].filter(Boolean).join(" ")}
              onPress={x.idoneo ? () => onScegli(x.member_id) : undefined}
              style={[
                stili.tessera,
                {
                  backgroundColor: sel ? velo(p, "accento", p.scuro ? 0.18 : 0.1) : p.carta,
                  borderColor: sel ? p.accento : p.linea,
                  opacity: x.idoneo ? 1 : 0.5,
                },
              ]}
            >
              <Avatar nome={x.nome} cognome={x.cognome} size={32} />
              <Text style={{ color: p.testo, fontFamily: sel ? F.extra : F.bold, fontSize: 15 }} numberOfLines={1}>
                {x.nome ?? t("Senza nome", "No name")}
              </Text>
              {sel ? <Icona nome="spunta" size={14} colore={p.accento} /> : null}
            </Tocco>
          );
        })}
        {tutti ? (
          <Tocco
            vibra="scelta"
            stato={{ selected: tutti.scelto }}
            etichetta={t("Tutti i tuoi figli: i turni da fare insieme", "All your children: time slots to do together")}
            onPress={tutti.onScegli}
            style={[
              stili.tessera,
              {
                backgroundColor: tutti.scelto ? velo(p, "accento", p.scuro ? 0.18 : 0.1) : p.carta,
                borderColor: tutti.scelto ? p.accento : p.linea,
              },
            ]}
          >
            <View style={[stili.icona, { backgroundColor: velo(p, "accento", p.scuro ? 0.22 : 0.12) }]}>
              <Icona nome="persone" size={16} colore={p.accento} />
            </View>
            <Text style={{ color: p.testo, fontFamily: tutti.scelto ? F.extra : F.bold, fontSize: 15 }} numberOfLines={1}>
              {t("Tutti i tuoi figli", "All your children")}
            </Text>
            {tutti.scelto ? <Icona nome="spunta" size={14} colore={p.accento} /> : null}
          </Tocco>
        ) : null}
        <AggiungiComponente
          onApri={onApriAggiungi}
          onAggiunto={onAggiunto}
          trigger={(apri) => (
            <Tocco
              vibra="scelta"
              etichetta={t("Aggiungi un componente", "Add a family member")}
              onPress={apri}
              style={[stili.tessera, { backgroundColor: "transparent", borderColor: p.accento, borderStyle: "dashed" }]}
            >
              <Icona nome="aggiungi" size={18} colore={p.accento} />
              <Text style={{ color: p.accento, fontFamily: F.bold, fontSize: 15 }}>
                {t("Aggiungi", "Add")}
              </Text>
            </Tocco>
          )}
        />
      </View>
      {nonIdonei.map((x) => (
        <Text key={x.member_id} style={[stili.nota, { color: p.testoTerzo }]}>
          {`${x.nome ?? ""}: ${x.motivo}`}
        </Text>
      ))}
    </View>
  );
}

const stili = StyleSheet.create({
  titolo: {
    fontSize: 13,
    fontFamily: F.extra,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    paddingHorizontal: 2,
  },
  fila: { flexDirection: "row", flexWrap: "wrap", gap: spazio.due },
  tessera: {
    flexDirection: "row",
    alignItems: "center",
    gap: spazio.due,
    minHeight: 48,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 14,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  icona: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  nota: { fontSize: 13, lineHeight: 19, fontFamily: F.medio, paddingHorizontal: 2 },
});
