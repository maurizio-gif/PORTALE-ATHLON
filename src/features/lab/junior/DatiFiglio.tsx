import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { laMiaArea, type EsitoArea } from "@/api/lab";
import type { PersonaJunior } from "@/api/junior";
import { dataBreve } from "@/lib/metodoPagamento";
import { t } from "@/lib/lingua";
import { chiediCodiceFiscale } from "@/lib/richiestaCodiceFiscale";
import { spazio } from "@/theme";

import { inMemoria, prendi, scorda } from "../memoria";
import { Carta, Etichetta, Pulsante } from "../ui/kit";
import { F, usePalette } from "../ui/tema";

// «I dati di …» nella sezione Junior (14/11/2026, richiesta di Maurizio): il codice fiscale del bambino si vede e si scrive (o si corregge)
// anche da qui, non solo dal foglio che si apre da solo quando il server blocca una prenotazione (sezione 226). Se il foglio automatico non
// compare, o il genitore vuole scriverlo prima, ha un posto fisso dove farlo.
//
// - **Il foglio e' lo stesso** (`FoglioCodiceFiscale`, montato nel layout, con le cure per la tastiera di Android della 236 e della 237): qui
//   si chiede con `chiediCodiceFiscale`, `motivo: 'modifica'`. Stessi controlli (sedici caratteri, controllo, coerenza con nome, cognome e data)
//   e stessa azione del server (`salva_dati` di `portale-abbonamento`), che accetta un codice nuovo anche sopra uno gia' scritto.
// - **I dati vengono dalla memoria della Home** (`area`, `portale_la_mia_area`): `dati.codice_fiscale` c'e' **solo per i figli del genitore**,
//   non per il titolare e non per un bambino raggiunto con una delega (lo decide il server, sezione 149). Senza `dati` la carta non c'e'.
// - **Mai in vista cliente**: e' di sola lettura.
export function DatiFiglio({ persona, vista }: { persona: PersonaJunior; vista: boolean }) {
  const p = usePalette();
  const [area, setArea] = useState<EsitoArea | undefined>(() => inMemoria<EsitoArea>("area"));
  const leggi = useCallback(async () => {
    const r = await prendi("area", laMiaArea);
    setArea(r);
  }, []);
  useEffect(() => {
    leggi();
  }, [leggi, persona.member_id]);

  if (vista || persona.titolare) return null;
  const dati = area?.ok && area.area.trovato ? area.area.persone.find((x) => x.member_id === persona.member_id) : undefined;
  if (!dati || dati.titolare || !dati.dati) return null;

  const cf = (dati.dati.codice_fiscale ?? "").trim().toUpperCase();
  const nome = persona.nome?.trim() || t("tuo figlio", "your child");
  const nascita = persona.data_nascita ?? dati.data_nascita;

  function apri() {
    chiediCodiceFiscale({
      persona: {
        member_id: persona.member_id,
        ruolo: "contraente",
        nome: persona.nome ?? dati?.nome ?? "",
        cognome: persona.cognome ?? dati?.cognome ?? "",
        data_nascita: nascita,
        codice_fiscale: cf || null,
        telefono: null,
        indirizzo: null,
      },
      mancanti: cf ? [] : ["codice fiscale"],
      motivo: "modifica",
      onSalvato: () => {
        scorda("area");
        leggi();
      },
    });
  }

  return (
    <Carta>
      <View style={{ gap: spazio.tre }}>
        <Text style={[stili.titolo, { color: p.testo }]}>{t(`I dati di ${nome}`, `${nome}’s details`)}</Text>
        <View style={{ gap: spazio.due }}>
          <Riga etichetta={t("Nome e cognome", "Name")} valore={[persona.nome, persona.cognome].filter(Boolean).join(" ")} />
          {nascita ? <Riga etichetta={t("Data di nascita", "Date of birth")} valore={dataBreve(nascita) ?? ""} /> : null}
          <View style={stili.riga}>
            <Text style={[stili.etichetta, { color: p.testoSecondario }]}>{t("Codice fiscale", "Tax code")}</Text>
            {cf ? (
              <Text style={[stili.valore, { color: p.testo }]} selectable>
                {cf}
              </Text>
            ) : (
              <Etichetta icona="attenzione" tono="attenzione" testo={t("Da inserire", "Missing")} />
            )}
          </View>
        </View>
        {cf ? null : (
          <Text style={[stili.nota, { color: p.testoSecondario }]}>
            {t(
              "Serve per prenotare le lezioni (Baby Nuoto e recuperi) e per iscriverlo a un corso.",
              "We need it to book classes (Baby Nuoto and make-up classes) and to enrol them in a course.",
            )}
          </Text>
        )}
        <Pulsante
          testo={cf ? t("Correggi il codice fiscale", "Edit the tax code") : t("Inserisci il codice fiscale", "Enter the tax code")}
          icona={cf ? "modifica" : "avanti"}
          variante={cf ? "secondario" : "primario"}
          onPress={apri}
        />
      </View>
    </Carta>
  );
}

function Riga({ etichetta, valore }: { etichetta: string; valore: string }) {
  const p = usePalette();
  if (!valore) return null;
  return (
    <View style={stili.riga}>
      <Text style={[stili.etichetta, { color: p.testoSecondario }]}>{etichetta}</Text>
      <Text style={[stili.valore, { color: p.testo }]}>{valore}</Text>
    </View>
  );
}

const stili = StyleSheet.create({
  titolo: { fontFamily: F.extra, fontSize: 16, letterSpacing: -0.3 },
  riga: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spazio.tre },
  etichetta: { fontFamily: F.medio, fontSize: 14 },
  valore: { fontFamily: F.semi, fontSize: 14, flexShrink: 1, textAlign: "right" },
  nota: { fontFamily: F.medio, fontSize: 13, lineHeight: 19 },
});
