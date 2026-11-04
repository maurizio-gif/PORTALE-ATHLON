import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { turniVicini, type EsitoTurniVicini, type PersonaJunior, type PropostaTurni } from "@/api/junior";
import { t } from "@/lib/lingua";
import { spazio } from "@/theme";

import { Icona } from "../ui/Icona";
import { Carta, Messaggio, Pulsante } from "../ui/kit";
import { Tocco } from "../ui/Tocco";
import { F, usePalette, velo } from "../ui/tema";
import { attivitaDiPersona, chiaveDelGruppo } from "./attivita";
import type { VoceCoda } from "./codaIscrizioni";
import { eBaby } from "./comune";

// I turni vicini per i tuoi figli (04/11/2026, richiesta di Maurizio): un genitore con due o piu' figli in eta' da Scuola Nuoto Bambini
// vuole portarli insieme. I turni sono per fascia d'anno, quindi ogni bambino ha la sua lista: qui si incrociano. Le combinazioni le da'
// il database (`portale-lab-junior`, azione `turni_vicini`): almeno un giorno in comune e l'inizio entro mezz'ora. Un figlio gia' iscritto
// resta nel suo turno, e si cercano quelli degli altri vicini al suo. «Iscrivi» avvia le iscrizioni una dopo l'altra (`codaIscrizioni.ts`):
// ognuna ha il suo contratto, la sua firma e il suo pagamento.

/** Iscritto a un turno della Scuola Nuoto Bambini (non un altro corso). */
export function inScuolaNuoto(p: PersonaJunior): boolean {
  return p.gruppi.some((g) => chiaveDelGruppo({ nome: g.nome, corso: g.nome }) === "snb");
}

/** I figli per cui i turni vicini hanno senso: in eta' da Scuola Nuoto (o gia' iscritti), mai il Baby Nuoto, che si prenota lezione per lezione. */
export function figliPerTurniVicini(persone: PersonaJunior[]): PersonaJunior[] {
  return persone.filter((x) => x.idoneo && !eBaby(x.data_nascita) && attivitaDiPersona(x).includes("snb"));
}

/** Si mostra con almeno due figli, e almeno uno ancora da iscrivere. */
export function mostraTurniVicini(persone: PersonaJunior[]): boolean {
  const f = figliPerTurniVicini(persone);
  return f.length >= 2 && f.some((x) => !inScuolaNuoto(x));
}

type Frequenza = "tutte" | "mono" | "bi";
const MAX = 4;
const PRIME = 3;

export function TurniVicini({
  persone,
  vista,
  onIscrivi,
}: {
  persone: PersonaJunior[];
  vista: boolean;
  onIscrivi: (voci: VoceCoda[]) => void;
}) {
  const p = usePalette();
  const figli = useMemo(() => figliPerTurniVicini(persone), [persone]);
  const [scelti, setScelti] = useState<number[]>(() => figli.slice(0, MAX).map((x) => x.member_id));
  const [frequenza, setFrequenza] = useState<Frequenza>("tutte");
  const [esito, setEsito] = useState<EsitoTurniVicini | null>(null);
  const [tutte, setTutte] = useState(false);
  const giro = useRef(0);

  // I figli cambiano (uno aggiunto): i nuovi entrano fra i scelti, finche' c'e' posto.
  const chiaveFigli = figli.map((x) => x.member_id).join(",");
  useEffect(() => {
    setScelti((s) => {
      const vivi = s.filter((id) => figli.some((x) => x.member_id === id));
      for (const x of figli) if (vivi.length < MAX && !vivi.includes(x.member_id)) vivi.push(x.member_id);
      return vivi;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chiaveFigli]);

  const chiave = `${scelti.join(",")}|${frequenza}`;
  useEffect(() => {
    if (scelti.length < 2) return setEsito(null);
    const mio = ++giro.current;
    setEsito(null);
    setTutte(false);
    turniVicini(scelti.map((id) => ({ member_id: id, frequenza: frequenza === "tutte" ? null : frequenza }))).then((r) => {
      if (mio === giro.current) setEsito(r);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chiave]);

  const nome = (id: number) => figli.find((x) => x.member_id === id)?.nome ?? t("Senza nome", "No name");

  function alterna(id: number) {
    setScelti((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= MAX ? s : [...s, id]));
  }

  function iscrivi(pr: PropostaTurni) {
    const voci: VoceCoda[] = pr.gruppi
      .filter((g) => !g.iscritto)
      .map((g) => ({ member_id: g.member_id, nome: nome(g.member_id), group_id: g.group_id, turno: turnoBreve(g.giorni, g.orario) }));
    if (voci.length) onIscrivi(voci);
  }

  const proposte = esito?.ok ? esito.proposte : [];
  const visibili = tutte ? proposte : proposte.slice(0, PRIME);
  const daIscrivere = figli.filter((x) => scelti.includes(x.member_id) && !inScuolaNuoto(x));

  return (
    <Carta>
      <View style={{ gap: spazio.tre }}>
        <View style={{ gap: 4 }}>
          <View style={stili.testa}>
            <Icona nome="persone" size={18} colore={p.accento} />
            <Text style={[stili.titolo, { color: p.testo }]} accessibilityRole="header">
              {t("Turni vicini per i tuoi figli", "Nearby time slots for your children")}
            </Text>
          </View>
          <Text style={[stili.nota, { color: p.testoSecondario }]}>
            {t(
              "Gli stessi giorni e l'inizio a non più di mezz'ora di distanza, con posti liberi: per portarli insieme.",
              "Same days and start times no more than half an hour apart, with places available: so you can bring them together.",
            )}
          </Text>
        </View>

        {figli.length > 2 ? (
          <View style={{ gap: 6 }}>
            <Text style={[stili.etichetta, { color: p.testoSecondario }]}>{t("Per chi", "For")}</Text>
            <View style={stili.fila}>
              {figli.map((x) => (
                <Scelta
                  key={x.member_id}
                  testo={x.nome ?? t("Senza nome", "No name")}
                  attiva={scelti.includes(x.member_id)}
                  onPress={() => alterna(x.member_id)}
                />
              ))}
            </View>
          </View>
        ) : null}

        {daIscrivere.length ? (
          <View style={{ gap: 6 }}>
            <Text style={[stili.etichetta, { color: p.testoSecondario }]}>{t("Quante volte a settimana", "How many times a week")}</Text>
            <View style={stili.fila}>
              <Scelta testo={t("Tutte", "All")} attiva={frequenza === "tutte"} onPress={() => setFrequenza("tutte")} />
              <Scelta testo={t("Una volta", "Once")} attiva={frequenza === "mono"} onPress={() => setFrequenza("mono")} />
              <Scelta testo={t("Due volte", "Twice")} attiva={frequenza === "bi"} onPress={() => setFrequenza("bi")} />
            </View>
          </View>
        ) : null}

        {scelti.length < 2 ? (
          <Text style={[stili.nota, { color: p.testoSecondario }]}>{t("Scegli almeno due figli.", "Choose at least two children.")}</Text>
        ) : !esito ? (
          <Text style={[stili.nota, { color: p.testoSecondario }]}>{t("Cerchiamo i turni…", "Looking for time slots…")}</Text>
        ) : !esito.ok ? (
          <Messaggio>{esito.errore}</Messaggio>
        ) : !proposte.length ? (
          <Messaggio tono="attenzione" titolo={t("Nessun turno vicino adesso", "No nearby time slots right now")}>
            {esito.tuttiIscritti
              ? t("Sono già tutti iscritti.", "They’re all enrolled already.")
              : t(
                  "Con i posti di adesso non ci sono turni negli stessi giorni a meno di mezz'ora. Prova con un'altra frequenza, o scegli i turni di ognuno qui sotto.",
                  "With the places available now there are no slots on the same days within half an hour. Try another frequency, or choose each child’s slot below.",
                )}
          </Messaggio>
        ) : (
          <View style={{ gap: spazio.due }}>
            {visibili.map((pr, i) => (
              <Proposta key={i} proposta={pr} nome={nome} vista={vista} onIscrivi={() => iscrivi(pr)} />
            ))}
            {proposte.length > PRIME ? (
              <Pulsante
                testo={tutte ? t("Mostra meno", "Show less") : t(`Mostra altre ${proposte.length - PRIME}`, `Show ${proposte.length - PRIME} more`)}
                variante="fantasma"
                piccolo
                pieno={false}
                onPress={() => setTutte((x) => !x)}
              />
            ) : null}
            <Text style={[stili.nota, { color: p.testoSecondario }]}>
              {t(
                "I posti sono quelli di pochi minuti fa: l'ultima parola è dell'iscrizione. Ogni figlio ha il suo contratto e il suo pagamento.",
                "Places are as of a few minutes ago: the enrollment has the final say. Each child has their own contract and payment.",
              )}
            </Text>
          </View>
        )}
      </View>
    </Carta>
  );
}

/** «Lunedì e Giovedì · 15:50». */
function turnoBreve(giorni: string | null, orario: string | null): string {
  return [giorni ? giorni.replace(/, /g, t(" e ", " and ")) : null, orario].filter(Boolean).join(" · ");
}

function scartoTesto(min: number): string {
  if (min <= 0) return t("Alla stessa ora", "At the same time");
  return t(`Inizi a ${min} minuti di distanza`, `Starts ${min} minutes apart`);
}

function Proposta({
  proposta,
  nome,
  vista,
  onIscrivi,
}: {
  proposta: PropostaTurni;
  nome: (id: number) => string;
  vista: boolean;
  onIscrivi: () => void;
}) {
  const p = usePalette();
  const nuovi = proposta.gruppi.filter((g) => !g.iscritto);
  const nomi = nuovi.map((g) => nome(g.member_id));
  const elenco = nomi.length > 1 ? `${nomi.slice(0, -1).join(", ")} ${t("e", "and")} ${nomi[nomi.length - 1]}` : (nomi[0] ?? "");
  return (
    <View style={[stili.proposta, { borderColor: p.linea, backgroundColor: velo(p, "accento", p.scuro ? 0.06 : 0.035) }]}>
      <View style={stili.testa}>
        <Icona nome="calendario" size={15} colore={p.accento} />
        <Text style={[stili.giorni, { color: p.testo }]}>{(proposta.giorni ?? "").replace(/, /g, t(" e ", " and "))}</Text>
        <Text style={[stili.nota, { color: p.testoSecondario }]}>· {scartoTesto(proposta.scarto)}</Text>
      </View>
      {proposta.gruppi.map((g) => (
        <View key={`${g.member_id}-${g.group_id}`} style={stili.riga}>
          <Text style={[stili.nome, { color: p.testo }]} numberOfLines={1}>
            {nome(g.member_id)}
          </Text>
          <Text style={[stili.nota, { color: p.testoSecondario, flex: 1 }]}>
            {/* I giorni del bambino solo se non sono quelli della proposta (un figlio due volte, l'altro una). */}
            {g.giorni === proposta.giorni ? g.orario : turnoBreve(g.giorni, g.orario)} · {g.frequenza === "bi" ? t("due volte", "twice") : t("una volta", "once")}
            {g.iscritto
              ? ` · ${t("già iscritto", "already enrolled")}`
              : g.liberi != null
                ? ` · ${g.liberi === 1 ? t("ultimo posto", "last place") : t(`${g.liberi} posti`, `${g.liberi} places`)}`
                : ""}
          </Text>
        </View>
      ))}
      {!vista && nuovi.length ? (
        <Pulsante
          testo={t(`Iscrivi ${elenco}`, `Enroll ${elenco}`)}
          icona="avanti"
          piccolo
          onPress={onIscrivi}
        />
      ) : null}
    </View>
  );
}

function Scelta({ testo, attiva, onPress }: { testo: string; attiva: boolean; onPress: () => void }) {
  const p = usePalette();
  return (
    <Tocco
      vibra="scelta"
      stato={{ selected: attiva }}
      etichetta={testo}
      onPress={onPress}
      style={[
        stili.scelta,
        { backgroundColor: attiva ? velo(p, "accento", p.scuro ? 0.18 : 0.1) : p.carta, borderColor: attiva ? p.accento : p.linea },
      ]}
    >
      {attiva ? <Icona nome="spunta" size={13} colore={p.accento} /> : null}
      <Text style={{ color: p.testo, fontFamily: attiva ? F.extra : F.bold, fontSize: 14 }}>{testo}</Text>
    </Tocco>
  );
}

const stili = StyleSheet.create({
  testa: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  titolo: { fontFamily: F.extra, fontSize: 17, letterSpacing: -0.2 },
  nota: { fontFamily: F.medio, fontSize: 13, lineHeight: 18 },
  etichetta: { fontFamily: F.bold, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4 },
  fila: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  scelta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  proposta: { borderWidth: 1, borderRadius: 14, padding: spazio.tre, gap: 8 },
  giorni: { fontFamily: F.extra, fontSize: 15 },
  riga: { flexDirection: "row", gap: 8, alignItems: "baseline" },
  nome: { fontFamily: F.bold, fontSize: 14, minWidth: 64, maxWidth: 120 },
});
