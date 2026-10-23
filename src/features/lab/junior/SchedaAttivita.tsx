import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { t } from "@/lib/lingua";
import { spazio } from "@/theme";

import { Icona } from "../ui/Icona";
import { Bollino, Carta, Sezione } from "../ui/kit";
import { Tocco } from "../ui/Tocco";
import { F, usePalette, velo } from "../ui/tema";
import { ATTIVITA, type ChiaveAttivita } from "./attivita";

// Cosa e' l'attivita' del bambino e cosa c'e' da sapere (22/10/2026, richiesta di Maurizio): nella pagina Junior, per la persona scelta,
// una scheda per ogni attivita' che la riguarda (quella a cui e' iscritta; se no quelle che il suo anno di nascita apre). La prima si
// apre da sola. I contenuti stanno in `attivita.ts`.

function Punto({ colore }: { colore: string }) {
  return <View style={[stili.punto, { backgroundColor: colore }]} />;
}

/** Gli aspetti che contano, in stile FAQ: titolo e anteprima (una riga) chiusi, si aprono uno a uno. Usato nella scheda e prima di iscriversi. */
export function DaSapere({
  chiave,
  titolo,
}: {
  chiave: ChiaveAttivita;
  titolo?: string;
}) {
  const p = usePalette();
  const a = ATTIVITA[chiave];
  const [aperte, setAperte] = useState<Set<number>>(new Set());
  const voci = a.daSapere();
  const alterna = (i: number) =>
    setAperte((prev) => {
      const n = new Set(prev);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  return (
    <View
      style={[
        stili.evidenza,
        { backgroundColor: velo(p, "accento", p.scuro ? 0.14 : 0.08), borderColor: p.accento },
      ]}
    >
      <View style={stili.evidenzaTesta}>
        <Icona nome="info" size={16} colore={p.accento} />
        <Text style={[stili.evidenzaTitolo, { color: p.testo }]}>
          {titolo ?? t(`Da sapere su ${a.nome()}`, `Good to know about ${a.nome()}`)}
        </Text>
      </View>
      {voci.map((d, i) => {
        const on = aperte.has(i);
        return (
          <View
            key={i}
            style={[
              i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.linea },
            ]}
          >
            <Tocco
              vibra="scelta"
              stato={{ expanded: on }}
              etichetta={d.titolo}
              onPress={() => alterna(i)}
              style={stili.faq}
            >
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text style={[stili.voceTitolo, { color: p.testo }]}>{d.titolo}</Text>
                <Text
                  numberOfLines={on ? undefined : 1}
                  style={[stili.voceTesto, { color: p.testoSecondario }]}
                >
                  {d.testo}
                </Text>
              </View>
              <Icona nome={on ? "meno" : "piu"} size={16} colore={p.testoSecondario} />
            </Tocco>
            {on && d.link ? (
              <Tocco
                vibra="scelta"
                etichetta={d.link.etichetta}
                onPress={() =>
                  router.navigate({ pathname: "/", params: { sezione: d.link!.sezione } })
                }
                style={stili.link}
              >
                <Text style={[stili.voceTitolo, { color: p.accento }]}>{d.link.etichetta} →</Text>
              </Tocco>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export function SchedaAttivita({
  chiavi,
  nome,
}: {
  chiavi: ChiaveAttivita[];
  nome?: string | null;
}) {
  const p = usePalette();
  const [aperta, setAperta] = useState<ChiaveAttivita | null>(chiavi[0] ?? null);
  if (!chiavi.length) return null;
  return (
    <Sezione
      titolo={
        chiavi.length > 1
          ? t(`Le attività per ${nome ?? "chi hai scelto"}`, `Activities for ${nome ?? "the person you chose"}`)
          : t(`L’attività per ${nome ?? "chi hai scelto"}`, `Activity for ${nome ?? "the person you chose"}`)
      }
    >
      {chiavi.map((k) => {
        const a = ATTIVITA[k];
        const on = aperta === k;
        return (
          <Carta key={k}>
            <Tocco
              vibra="scelta"
              stato={{ expanded: on }}
              etichetta={a.nome()}
              onPress={() => setAperta(on ? null : k)}
              style={stili.testa}
            >
              <Bollino icona="goccia" tono="blu" size={40} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[stili.nome, { color: p.testo }]}>{a.nome()}</Text>
                <Text style={[stili.claim, { color: p.testoSecondario }]}>{a.claim()}</Text>
              </View>
              <Icona nome={on ? "meno" : "piu"} size={16} colore={p.testoSecondario} />
            </Tocco>
            {on ? (
              <View style={stili.corpo}>
                <Text style={[stili.voceTesto, { color: p.testo }]}>{a.cosaE()}</Text>
                <View style={{ gap: spazio.due }}>
                  {a.inBreve().map((r, i) => (
                    <View key={i} style={stili.riga}>
                      <Punto colore={p.blu} />
                      <Text style={[stili.voceTesto, { color: p.testoSecondario, flex: 1, minWidth: 0 }]}>{r}</Text>
                    </View>
                  ))}
                </View>
                <DaSapere chiave={k} />
              </View>
            ) : null}
          </Carta>
        );
      })}
    </Sezione>
  );
}

const stili = StyleSheet.create({
  testa: {
    flexDirection: "row",
    alignItems: "center",
    gap: spazio.tre,
    minHeight: 64,
    padding: spazio.tre,
  },
  nome: { fontFamily: F.extra, fontSize: 17, letterSpacing: -0.3 },
  claim: { fontFamily: F.medio, fontSize: 13, lineHeight: 18 },
  corpo: { gap: spazio.tre, paddingHorizontal: spazio.tre, paddingBottom: spazio.tre },
  riga: { flexDirection: "row", gap: spazio.due, alignItems: "flex-start" },
  punto: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  evidenza: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: spazio.tre,
    gap: spazio.tre,
  },
  faq: { flexDirection: "row", alignItems: "center", gap: spazio.due, paddingVertical: spazio.due, minHeight: 44 },
  link: { paddingBottom: spazio.due, minHeight: 36, justifyContent: "center" },
  evidenzaTesta: { flexDirection: "row", alignItems: "center", gap: spazio.due },
  evidenzaTitolo: { fontFamily: F.extra, fontSize: 15, flex: 1, minWidth: 0 },
  voceTitolo: { fontFamily: F.bold, fontSize: 14, lineHeight: 19 },
  voceTesto: { fontFamily: F.medio, fontSize: 14, lineHeight: 21 },
});
