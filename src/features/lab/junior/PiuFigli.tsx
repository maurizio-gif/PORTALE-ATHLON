import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { NucleoJunior, PersonaJunior } from "@/api/junior";
import { t } from "@/lib/lingua";
import { spazio } from "@/theme";

import { AggiungiComponente } from "../famiglia/AggiungiComponente";
import { Icona } from "../ui/Icona";
import { Carta, Pulsante } from "../ui/kit";
import { F, usePalette } from "../ui/tema";
import type { VoceCoda } from "./codaIscrizioni";

// Piu' figli nella sezione Junior (04/11/2026, richiesta di Maurizio).
//   - `CodaIscrizioniCarta`: dopo «Iscrivi …» dai turni vicini, a che punto sono le iscrizioni dei figli, e il comando per il prossimo.
//     Ogni iscrizione ha contratto, firma e pagamento suoi: dopo il pagamento si torna qui, e la carta propone il figlio dopo.
//   - `InvitoAltroFiglio`: con un solo figlio in eta' per i corsi, l'invito ad aggiungere gli altri. Con due figli della Scuola Nuoto
//     compaiono i turni vicini, per portarli insieme.

export function CodaIscrizioniCarta({
  voci,
  iscritto,
  onContinua,
  onChiudi,
}: {
  voci: VoceCoda[];
  iscritto: (memberId: number, groupId: number) => boolean;
  onContinua: (v: VoceCoda) => void;
  onChiudi: () => void;
}) {
  const p = usePalette();
  const prossima = voci.find((v) => !iscritto(v.member_id, Number(v.group_id))) ?? null;
  return (
    <Carta>
      <View style={{ gap: spazio.due }}>
        <Text style={[stili.titolo, { color: p.testo }]} accessibilityRole="header">
          {prossima ? t("Le iscrizioni dei tuoi figli", "Your children’s enrollments") : t("Iscrizioni fatte", "Enrollments done")}
        </Text>
        {voci.map((v) => {
          const fatta = iscritto(v.member_id, Number(v.group_id));
          return (
            <View key={`${v.member_id}-${v.group_id}`} style={stili.riga}>
              <Icona nome={fatta ? "ok" : "clessidra"} size={16} colore={fatta ? p.ok : p.testoSecondario} />
              <Text style={[stili.testo, { color: p.testo }]}>
                <Text style={{ fontFamily: F.bold }}>{v.nome}</Text> · {v.turno}
                {fatta ? ` · ${t("fatta", "done")}` : ""}
              </Text>
            </View>
          );
        })}
        {prossima ? (
          <>
            <Pulsante
              testo={t(`Continua con ${prossima.nome}`, `Continue with ${prossima.nome}`)}
              icona="avanti"
              onPress={() => onContinua(prossima)}
            />
            <Pulsante testo={t("Lascia stare", "Never mind")} variante="fantasma" piccolo pieno={false} onPress={onChiudi} />
          </>
        ) : (
          <Pulsante testo={t("Fatto", "Done")} variante="secondario" piccolo onPress={onChiudi} />
        )}
      </View>
    </Carta>
  );
}

/** Si mostra con un solo bambino del nucleo in eta' per i corsi, e mai in vista cliente. */
export function mostraInvitoAltroFiglio(persone: PersonaJunior[]): boolean {
  return persone.filter((x) => x.idoneo && !x.titolare && x.minorenne).length === 1;
}

export function InvitoAltroFiglio({
  onAggiunto,
  onApri,
}: {
  onAggiunto: (nome: string, nucleo: NucleoJunior | null) => void;
  onApri?: () => void;
}) {
  const p = usePalette();
  return (
    <AggiungiComponente
      onApri={onApri}
      onAggiunto={onAggiunto}
      trigger={(apri): ReactNode => (
        <Carta onPress={apri}>
          <View style={stili.invito}>
            <Icona nome="aggiungi" size={20} colore={p.accento} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[stili.titolo, { color: p.testo }]}>{t("Hai un altro figlio?", "Do you have another child?")}</Text>
              <Text style={[stili.testo, { color: p.testoSecondario }]}>
                {t(
                  "Aggiungilo qui: se fanno tutti e due la Scuola Nuoto, ti mostriamo i turni vicini per portarli insieme.",
                  "Add them here: if they both do Swim School, we’ll show you nearby time slots so you can bring them together.",
                )}
              </Text>
            </View>
            <Icona nome="avanti" size={16} colore={p.testoSecondario} />
          </View>
        </Carta>
      )}
    />
  );
}

const stili = StyleSheet.create({
  titolo: { fontFamily: F.extra, fontSize: 16, letterSpacing: -0.2 },
  testo: { fontFamily: F.medio, fontSize: 13, lineHeight: 19, flexShrink: 1 },
  riga: { flexDirection: "row", alignItems: "center", gap: 8 },
  invito: { flexDirection: "row", alignItems: "center", gap: spazio.tre },
});
