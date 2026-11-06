import { useMemo, useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { GruppoJunior, PersonaJunior } from "@/api/junior";
import { t, tv } from "@/lib/lingua";
import { spazio } from "@/theme";

import { ConAltre } from "../consigli/Lezioni";
import { Icona } from "../ui/Icona";
import { Bollino, Carta, Etichetta, Messaggio, Riga, Sezione } from "../ui/kit";
import { Tocco } from "../ui/Tocco";
import { F, usePalette, velo } from "../ui/tema";
import { ATTIVITA, attivitaDiPersona, chiaveDelGruppo, type ChiaveAttivita } from "./attivita";
import {
  annoDi,
  calendarioGruppo,
  giorniDelAnno,
  gruppiDellAnno,
  quotaMensile,
  SIGLE_GIORNI,
  statoPosti,
  titoloGruppo,
} from "./comune";
import { MediaAttivita } from "./MediaAttivita";
import { DaSapere } from "./SchedaAttivita";

// Le attivita' per un bambino che non ha ancora un abbonamento (02/11/2026, richiesta di Maurizio): una carta per ogni attivita' che
// il suo anno di nascita apre, **chiusa**, con quello che serve per scegliere (nome, la frase che la racconta, da quanto costa al mese e
// quanti posti restano); toccandola si apre con tutti i dettagli: cos'e', i dati in breve, i turni con «Iscriviti» e il «Da sapere».
// Con una sola attivita' si apre da sola. Il Baby Nuoto non ha turni: al loro posto c'e' quello che gli serve (`contenutoBaby`: la lezione
// singola o l'abbonamento mensile, e il calendario). Prima erano due blocchi separati (le schede in fondo, i turni in mezzo ai filtri).

export function AttivitaDaScegliere({
  persona,
  gruppi,
  puoIscriversi,
  onIscrivi,
  contenutoBaby,
}: {
  persona: PersonaJunior;
  gruppi: GruppoJunior[];
  /** Questa persona puo' iscriversi a quel turno (idonea, nell'anno giusto, posti, non gia' dentro). */
  puoIscriversi: (g: GruppoJunior) => boolean;
  onIscrivi: (g: GruppoJunior) => void;
  contenutoBaby: ReactNode;
}) {
  const p = usePalette();
  const chiavi = useMemo(() => attivitaDiPersona(persona), [persona]);
  const anno = annoDi(persona);
  const [aperta, setAperta] = useState<ChiaveAttivita | null>(chiavi.length === 1 ? chiavi[0] : null);

  if (!chiavi.length) {
    return (
      <Messaggio
        tono="attenzione"
        titolo={t(`Nessuna attività per i nati nel ${anno ?? "?"}`, `No activities for those born in ${anno ?? "?"}`)}
      >
        {t(
          `Al momento non ci sono attività per ${persona.nome ?? "chi hai scelto"}. Per altre informazioni chiedi in segreteria.`,
          `There are no activities for ${persona.nome ?? "the person you chose"} right now. Ask at the front desk for more information.`,
        )}
      </Messaggio>
    );
  }

  return (
    <Sezione
      titolo={t(`Scegli l’attività per ${persona.nome ?? "chi hai scelto"}`, `Choose the activity for ${persona.nome ?? "the person you chose"}`)}
    >
      {chiavi.map((k) => {
        const a = ATTIVITA[k];
        const on = aperta === k;
        const delle = k === "baby" || anno == null ? [] : gruppi.filter((g) => g.anni.includes(anno) && chiaveDelGruppo(g) === k);
        const liberi = delle.reduce((s, g) => s + Math.max(g.liberi ?? 0, 0), 0);
        // Il prezzo d'attacco: la quota piu' bassa fra i turni («da 89 € / mese»); se sono tutte uguali, quella.
        const quote = delle.map((g) => quotaMensile(g)).filter((q): q is string => !!q);
        const numero = (q: string) => Number(/\d+/.exec(q)?.[0] ?? Infinity);
        const minima = quote.length ? quote.reduce((a, b) => (numero(b) < numero(a) ? b : a)) : null;
        const prezzo = minima && new Set(quote.map(numero)).size > 1 ? t(`da ${minima}`, `from ${minima}`) : minima;
        return (
          <Carta key={k}>
            <Tocco
              vibra="scelta"
              stato={{ expanded: on }}
              etichetta={a.nome()}
              onPress={() => setAperta(on ? null : k)}
              style={stili.testa}
            >
              <Bollino icona="goccia" tono="blu" size={44} />
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <Text style={[stili.nome, { color: p.testo }]}>{a.nome()}</Text>
                <Text style={[stili.claim, { color: p.testoSecondario }]} numberOfLines={on ? undefined : 2}>
                  {a.claim()}
                </Text>
                {!on && (prezzo || delle.length) ? (
                  <View style={stili.pillole}>
                    {prezzo ? <Etichetta testo={prezzo} tono="accento" /> : null}
                    {delle.length ? (
                      <Etichetta
                        testo={liberi > 0 ? t(`${liberi} posti liberi`, `${liberi} spots left`) : t("Al completo", "Full")}
                        tono={liberi > 0 ? "ok" : "neutro"}
                      />
                    ) : null}
                  </View>
                ) : null}
              </View>
              <Icona nome={on ? "su" : "giu"} size={16} colore={p.testoSecondario} />
            </Tocco>
            {on ? (
              <View style={stili.corpo}>
                <MediaAttivita chiave={k} />
                <Text style={[stili.testo, { color: p.testo }]}>{a.cosaE()}</Text>
                <View style={{ gap: spazio.due }}>
                  {a.inBreve().map((r, i) => (
                    <View key={i} style={stili.riga}>
                      <View style={[stili.punto, { backgroundColor: p.blu }]} />
                      <Text style={[stili.testo, { color: p.testoSecondario, flex: 1, minWidth: 0 }]}>{r}</Text>
                    </View>
                  ))}
                </View>
                {k === "baby" ? (
                  contenutoBaby
                ) : (
                  <TurniAttivita
                    chiave={k}
                    gruppi={delle}
                    anno={anno}
                    puoIscriversi={puoIscriversi}
                    onIscrivi={onIscrivi}
                  />
                )}
                <DaSapere chiave={k} />
              </View>
            ) : null}
          </Carta>
        );
      })}
    </Sezione>
  );
}

function Filtro({ attivo, testo, onPress, etichetta }: { attivo: boolean; testo: string; onPress: () => void; etichetta?: string }) {
  const p = usePalette();
  return (
    <Tocco
      vibra="scelta"
      stato={{ selected: attivo }}
      etichetta={etichetta ?? testo}
      onPress={onPress}
      style={[
        stili.filtro,
        { backgroundColor: attivo ? velo(p, "accento", p.scuro ? 0.16 : 0.1) : p.carta, borderColor: attivo ? p.accento : p.linea },
      ]}
    >
      <Text style={{ color: p.testo, fontFamily: attivo ? F.extra : F.bold, fontSize: 14 }}>{testo}</Text>
    </Tocco>
  );
}

/** I turni di un'attivita' per l'anno del bambino, col filtro per giorno e per posti liberi, e «Iscriviti» su ogni turno. */
function TurniAttivita({
  chiave,
  gruppi,
  anno,
  puoIscriversi,
  onIscrivi,
}: {
  chiave: ChiaveAttivita;
  gruppi: GruppoJunior[];
  anno: number | null;
  puoIscriversi: (g: GruppoJunior) => boolean;
  onIscrivi: (g: GruppoJunior) => void;
}) {
  const p = usePalette();
  const [giorni, setGiorni] = useState<number[]>([]);
  const [soloLiberi, setSoloLiberi] = useState(false);
  const giorniAnno = useMemo(() => (anno == null ? [] : giorniDelAnno(gruppi, anno)), [gruppi, anno]);
  const attivi = giorni.filter((i) => giorniAnno.includes(i));
  const blocchi = useMemo(
    () => (anno == null ? [] : gruppiDellAnno(gruppi, anno, soloLiberi, attivi)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gruppi, anno, soloLiberi, attivi.join(",")],
  );
  const alternaGiorno = (i: number) => setGiorni((v) => (v.includes(i) ? v.filter((x) => x !== i) : [...v, i]));

  if (!gruppi.length) {
    return (
      <Messaggio tono="attenzione">
        {t("Al momento non ci sono turni aperti per questa attività.", "There are no open slots for this activity right now.")}
      </Messaggio>
    );
  }

  return (
    <View style={{ gap: spazio.tre }}>
      <Text style={[stili.titoloSezione, { color: p.testoSecondario }]} accessibilityRole="header">
        {t("Turni disponibili", "Available slots")}
      </Text>
      {chiave === "pallanuoto" ? (
        <Text style={[stili.nota, { color: p.testoSecondario }]}>{t("La pallanuoto è solo maschile.", "Water polo is boys only.")}</Text>
      ) : null}
      {giorniAnno.length > 1 || gruppi.length > 1 ? (
        <View style={stili.filtri}>
          {giorniAnno.length > 1 ? (
            <>
              <Filtro attivo={!attivi.length} testo={t("Tutti", "All")} etichetta={t("Tutti i giorni", "Every day")} onPress={() => setGiorni([])} />
              {giorniAnno.map((i) => (
                <Filtro key={i} attivo={attivi.includes(i)} testo={SIGLE_GIORNI[i]} onPress={() => alternaGiorno(i)} />
              ))}
            </>
          ) : null}
          {gruppi.length > 1 ? (
            <Filtro
              attivo={soloLiberi}
              testo={t("Solo con posti liberi", "Only with spots left")}
              onPress={() => setSoloLiberi((v) => !v)}
            />
          ) : null}
        </View>
      ) : null}
      {blocchi.length ? (
        blocchi.map((b) => (
          <View key={b.corso} style={{ gap: spazio.due }}>
            {blocchi.length > 1 ? (
              <Text style={[stili.titoloSezione, { color: p.testo }]}>{b.corso}</Text>
            ) : null}
            <Carta>
              <ConAltre
                visibili={5}
                nome={tv<[string, string]>(["turno", "turni"], ["slot", "slots"])}
                voci={b.gruppi.map((g, i) => {
                const s = statoPosti(g);
                const puo = puoIscriversi(g);
                return (
                  <Riga
                    key={g.id}
                    prima={i === 0}
                    titolo={titoloGruppo(g)}
                    sotto={
                      <View style={{ gap: 8 }}>
                        {calendarioGruppo(g) ? (
                          <Text style={[stili.nota, { color: p.testoSecondario }]}>{calendarioGruppo(g)}</Text>
                        ) : null}
                        <View style={stili.pillole}>
                          <Etichetta testo={s.testo} tono={s.tono} />
                          {quotaMensile(g) ? <Etichetta testo={quotaMensile(g)!} tono="neutro" /> : null}
                        </View>
                      </View>
                    }
                    coda={
                      puo ? (
                        <Text style={{ color: p.accento, fontFamily: F.bold, fontSize: 14 }}>{t("Iscriviti →", "Enroll →")}</Text>
                      ) : undefined
                    }
                    onPress={puo ? () => onIscrivi(g) : undefined}
                  />
                );
              })}
              />
            </Carta>
          </View>
        ))
      ) : (
        <Messaggio tono="attenzione">
          {t("Con questi filtri non c’è nessun turno. Prova a togliere un giorno o i posti liberi.", "No slots match these filters. Try removing a day or the available-spots filter.")}
        </Messaggio>
      )}
      <Text style={[stili.nota, { color: p.testoTerzo }]}>
        {t("I posti si aggiornano ogni pochi minuti: la segreteria conferma al momento dell’iscrizione.", "Spots update every few minutes: the front desk confirms when you enroll.")}
      </Text>
    </View>
  );
}

const stili = StyleSheet.create({
  testa: { flexDirection: "row", alignItems: "center", gap: spazio.tre, minHeight: 72, padding: spazio.tre },
  nome: { fontFamily: F.extra, fontSize: 17, letterSpacing: -0.3 },
  claim: { fontFamily: F.medio, fontSize: 13, lineHeight: 18 },
  pillole: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 },
  corpo: { gap: spazio.tre, paddingHorizontal: spazio.tre, paddingBottom: spazio.tre },
  riga: { flexDirection: "row", gap: spazio.due, alignItems: "flex-start" },
  punto: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  testo: { fontFamily: F.medio, fontSize: 14, lineHeight: 21 },
  titoloSezione: { fontSize: 13, fontFamily: F.extra, letterSpacing: 0.4, textTransform: "uppercase" },
  nota: { fontSize: 13, lineHeight: 19, fontFamily: F.medio },
  filtri: { flexDirection: "row", flexWrap: "wrap", gap: spazio.due },
  filtro: {
    minWidth: 48,
    minHeight: 40,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
