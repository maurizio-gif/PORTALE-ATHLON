import { Image } from "expo-image";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { livelliJunior, type EsitoLivelli, type PersonaJunior } from "@/api/junior";
import { locale, t } from "@/lib/lingua";
import { spazio } from "@/theme";

import { Icona } from "../ui/Icona";
import { Carta, Etichetta, Messaggio, Pulsante, Sezione } from "../ui/kit";
import { F, usePalette } from "../ui/tema";
import { Tocco } from "../ui/Tocco";
import { conseguiti, leggiBrevetto, LIVELLI, NOMI_CICLO, nomeBrevetto, nomeLivello, nomeSpecie, posizioneDi, type CicloBrevetti, type LivelloBrevetto } from "./datiBrevetti";
import { nomeCompleto } from "./comune";
import { Dettagli } from "./Dettagli";
import { FoglioDiploma } from "./FoglioDiploma";
import { FoglioLibretto } from "./LibrettoSfoglia";
import { personaggioDi } from "./personaggiBrevetti";

// La voce «Brevetti» di un bambino iscritto (02/11/2026, richiesta di Maurizio: «al posto della voce Livello, metti Brevetti»). In una pagina:
//   1. il brevetto di adesso (il livello di PerfectGym: «A2 - Stella Marina 2») col personaggio, e **«Condividi il brevetto»**: il diplomino per i social;
//   2. **il libretto**: quanti brevetti ha conseguito su dodici, da **sfogliare** (`FoglioLibretto`) e **scaricare in PDF**;
//   3. **i brevetti**, i dodici livelli del libretto del club in tre cicli. **I livelli sono progressivi**: con il M1 sono conseguiti anche A1, A2 e A3. Di ognuno si
//      aprono le prove (con la spunta dove e' conseguito) e il programma (`datiBrevetti.ts`, trascritti dal libretto stampato);
//   4. **il percorso**: lo storico dei passaggi (`junior_livelli_storico`, dal 22/10/2026: PerfectGym non da' le date, quindi sono date «rilevate»).

function giorno(iso: string): string {
  return new Date(iso).toLocaleDateString(locale(), { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Rome" });
}

type Stato = "fatto" | "prossimo" | "da";

function RigaLivello({ l, stato, aperto, onTocca }: { l: LivelloBrevetto; stato: Stato; aperto: boolean; onTocca: () => void }) {
  const p = usePalette();
  const img = personaggioDi(l.specie);
  return (
    <View style={[stili.livello, { borderTopColor: p.linea }]}>
      <Tocco vibra="scelta" stato={{ expanded: aperto }} etichetta={nomeLivello(l)} onPress={onTocca} style={stili.livelloTesta}>
        <View style={[stili.miniatura, { backgroundColor: p.incavo, opacity: stato === "da" ? 0.45 : 1 }]}>
          {img ? <Image source={img} style={{ width: 40, height: 40 }} contentFit="contain" /> : <Icona nome="trofeo" size={20} colore={p.testoSecondario} />}
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text style={[stili.livelloNome, { color: p.testo }]}>{nomeLivello(l)}</Text>
          <Text style={[stili.piccolo, { color: p.testoSecondario }]}>{l.codice}</Text>
        </View>
        {stato === "fatto" ? (
          <Etichetta testo={t("Conseguito", "Earned")} tono="ok" icona="spunta" />
        ) : stato === "prossimo" ? (
          <Etichetta testo={t("Prossimo", "Next")} tono="accento" />
        ) : (
          <Etichetta testo={t("Da conseguire", "To earn")} tono="neutro" />
        )}
        <Icona nome={aperto ? "su" : "giu"} size={15} colore={p.testoSecondario} />
      </Tocco>
      {aperto ? (
        <View style={stili.livelloCorpo}>
          <Text style={[stili.sezioneTitolo, { color: p.testoSecondario }]}>{stato === "fatto" ? t("Prove superate", "Tests passed") : t("Prove da superare", "Tests to pass")}</Text>
          {l.prove().map((x, i) => (
            <View key={i} style={stili.riga}>
              {stato === "fatto" ? <Icona nome="spunta" size={16} colore={p.ok} /> : <View style={[stili.cerchio, { borderColor: p.testoTerzo }]} />}
              <Text style={[stili.testo, { color: p.testo, flex: 1, minWidth: 0 }]}>{x}</Text>
            </View>
          ))}
          <Dettagli titolo={t("Cosa si impara", "What you learn")}>
            {l.programma().map((x, i) => (
              <View key={i} style={stili.riga}>
                <View style={[stili.punto, { backgroundColor: p.accento }]} />
                <Text style={[stili.piccolo, { color: p.testoSecondario, flex: 1, minWidth: 0 }]}>{x}</Text>
              </View>
            ))}
          </Dettagli>
        </View>
      ) : null}
    </View>
  );
}

export function Brevetti({ persona, vista }: { persona: PersonaJunior; vista: boolean }) {
  const p = usePalette();
  const [esito, setEsito] = useState<EsitoLivelli | undefined>();
  const [diploma, setDiploma] = useState(false);
  const [libretto, setLibretto] = useState(false);
  const id = persona.member_id;

  useEffect(() => {
    let vivo = true;
    setEsito(undefined);
    livelliJunior(id).then((e) => vivo && setEsito(e));
    return () => {
      vivo = false;
    };
  }, [id]);

  const livello = persona.livello ?? (esito?.ok ? esito.livello : null);
  const attuale = livello ? leggiBrevetto(livello) : null;
  const passaggi = esito?.ok ? esito.passaggi : [];
  const posizione = attuale ? posizioneDi(attuale.codice) : -1;
  const fatti = attuale ? conseguiti(attuale.codice) : [];
  // La data in cui il brevetto di adesso e' arrivato, se la sappiamo: la prima riga e' «al primo rilevamento» e non e' una data di passaggio.
  const dal = passaggi[0] && !passaggi[0].primo_rilevamento ? giorno(passaggi[0].rilevato_il) : null;
  const [aperto, setAperto] = useState<string | null>(null);
  // Il livello di adesso si apre da solo, una volta che si sa quale e'.
  useEffect(() => {
    if (attuale?.codice) setAperto((a) => a ?? attuale.codice);
  }, [attuale?.codice]);
  const cicli = useMemo(() => (["pre", "mini", "brevetti"] as CicloBrevetti[]).map((c) => ({ c, livelli: LIVELLI.filter((l) => l.ciclo === c) })), []);

  if (!attuale) {
    return (
      <Messaggio>
        {t(
          `${persona.nome ?? "Il bambino"} non ha ancora un brevetto registrato: appena la Direzione Tecnica lo assegna, lo trovi qui.`,
          `${persona.nome ?? "Your child"} doesn’t have a badge recorded yet: as soon as the Technical Direction assigns one, you’ll find it here.`,
        )}
      </Messaggio>
    );
  }

  const personaggio = personaggioDi(attuale.specie);
  const nome = nomeCompleto(persona);
  return (
    <>
      <Carta>
        <View style={stili.eroe}>
          {personaggio ? (
            <Image source={personaggio} style={stili.personaggio} contentFit="contain" accessibilityLabel={nomeSpecie(attuale.specie)} />
          ) : attuale.codice ? (
            <View style={[stili.sigla, { backgroundColor: p.accento }]}>
              <Text style={stili.siglaTesto}>{attuale.codice}</Text>
            </View>
          ) : (
            <Icona nome="trofeo" size={28} colore={p.accento} />
          )}
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={[stili.piccolo, { color: p.testoSecondario }]}>{t("Brevetto di adesso", "Current badge")}</Text>
            <Text style={[stili.nome, { color: p.testo }]}>{nomeSpecie(attuale.specie)}</Text>
            {attuale.codice || attuale.livello ? <Text style={[stili.piccolo, { color: p.testoSecondario }]}>{t(`Livello ${attuale.codice || attuale.livello}`, `Level ${attuale.codice || attuale.livello}`)}</Text> : null}
            {dal ? <Text style={[stili.piccolo, { color: p.testoSecondario }]}>{t(`Dal ${dal}`, `Since ${dal}`)}</Text> : null}
          </View>
        </View>
        <View style={{ padding: spazio.tre, paddingTop: 0 }}>
          <Pulsante testo={t("Condividi il brevetto", "Share the badge")} icona="condividi" onPress={() => setDiploma(true)} />
        </View>
      </Carta>

      {posizione >= 0 ? (
        <Carta>
          <View style={{ padding: spazio.tre, gap: spazio.tre }}>
            <View style={{ gap: spazio.due }}>
              <Text style={[stili.titoloCarta, { color: p.testo }]}>{t(`Il libretto di ${persona.nome ?? ""}`.trim(), `${persona.nome ?? "Your child"}’s booklet`)}</Text>
              <Text style={[stili.piccolo, { color: p.testoSecondario }]}>
                {t(`${fatti.length} brevetti conseguiti su ${LIVELLI.length}`, `${fatti.length} of ${LIVELLI.length} badges earned`)}
              </Text>
              <View style={stili.barra}>
                {LIVELLI.map((l, i) => (
                  <View key={l.codice} style={[stili.tacca, { backgroundColor: i <= posizione ? p.accento : p.incavo }]} />
                ))}
              </View>
            </View>
            <View style={stili.azioni}>
              <Pulsante testo={t("Sfoglia il libretto", "Browse the booklet")} icona="documento" onPress={() => setLibretto(true)} />
            </View>
          </View>
        </Carta>
      ) : null}

      {posizione >= 0 ? (
        <Sezione titolo={t("I brevetti", "The badges")}>
          {cicli.map(({ c, livelli }) => {
            const n = NOMI_CICLO[c]();
            return (
              <View key={c} style={{ gap: spazio.due }}>
                <View>
                  <Text style={[stili.sezioneTitolo, { color: p.testo }]}>{n.titolo}</Text>
                  <Text style={[stili.piccolo, { color: p.testoSecondario }]}>{n.sotto}</Text>
                </View>
                <Carta>
                  {livelli.map((l) => {
                    const i = posizioneDi(l.codice);
                    const stato: Stato = i <= posizione ? "fatto" : i === posizione + 1 ? "prossimo" : "da";
                    return <RigaLivello key={l.codice} l={l} stato={stato} aperto={aperto === l.codice} onTocca={() => setAperto(aperto === l.codice ? null : l.codice)} />;
                  })}
                </Carta>
              </View>
            );
          })}
          <Text style={[stili.piccolo, { color: p.testoTerzo }]}>
            {t(
              "I livelli sono progressivi: quelli fino al brevetto di adesso risultano conseguiti. Prove e programma sono quelli del libretto del club.",
              "Levels are progressive: those up to the current badge count as earned. Tests and programme are those of the club’s booklet.",
            )}
          </Text>
        </Sezione>
      ) : (
        <Carta piatta>
          <Text style={[stili.testo, { color: p.testoSecondario }]}>
            {t(
              "Il brevetto lo decide la Direzione Tecnica guardando il bambino in vasca. Se vuoi sapere a che punto è e cosa lavora adesso, puoi fissare una telefonata dalla voce «Direttore Tecnico».",
              "The badge is decided by the Technical Direction, watching the child in the pool. If you want to know where they are and what they’re working on, you can book a call from “Technical Director”.",
            )}
          </Text>
        </Carta>
      )}

      <Dettagli titolo={t("I brevetti di giugno", "The June badge session")}>
        <Text style={[stili.piccolo, { color: p.testoSecondario }]}>
          {t(
            "A fine stagione, in giugno, la Direzione Tecnica valuta i progressi durante le lezioni di sempre. Vengono consegnati il diploma di fine corso e il libretto dei brevetti, e ci sono i fotografi. Le date si comunicano.",
            "At the end of the season, in June, the Technical Direction assesses progress during the usual classes. The end-of-course diploma and the badge booklet are handed out, and photographers are there. Dates are announced.",
          )}
        </Text>
      </Dettagli>

      <Sezione titolo={t("Il percorso", "The journey")}>
        {!esito ? (
          <Text style={[stili.piccolo, { color: p.testoSecondario }]}>{t("Un momento…", "One moment…")}</Text>
        ) : !esito.ok ? (
          <Messaggio>{esito.errore}</Messaggio>
        ) : passaggi.length === 0 ? (
          <Text style={[stili.piccolo, { color: p.testoSecondario }]}>{t("Non c’è ancora nessun brevetto registrato.", "There’s no badge recorded yet.")}</Text>
        ) : (
          <View>
            {passaggi.map((x, i) => {
              const b = leggiBrevetto(x.livello);
              return (
                <View key={`${x.rilevato_il}-${i}`} style={stili.passo}>
                  <View style={stili.binario}>
                    <View style={[stili.puntoPassaggio, { backgroundColor: i === 0 ? p.accento : p.incavo, borderColor: p.accento }]} />
                    {i < passaggi.length - 1 ? <View style={[stili.linea, { backgroundColor: p.incavo }]} /> : null}
                  </View>
                  <View style={{ flex: 1, gap: 2, paddingBottom: spazio.tre }}>
                    <Text style={[stili.livelloNome, { color: p.testo }]}>{b.codice ? `${b.codice} · ${nomeBrevetto(b)}` : nomeBrevetto(b)}</Text>
                    <Text style={[stili.piccolo, { color: p.testoSecondario }]}>
                      {x.primo_rilevamento ? t(`Brevetto al primo rilevamento · ${giorno(x.rilevato_il)}`, `Badge at first check · ${giorno(x.rilevato_il)}`) : giorno(x.rilevato_il)}
                    </Text>
                  </View>
                </View>
              );
            })}
            <Text style={[stili.piccolo, { color: p.testoTerzo }]}>
              {t(
                "Le date sono quelle in cui abbiamo visto cambiare il brevetto, a partire dal 22 ottobre 2026: il passaggio può essere avvenuto qualche giorno prima. Per i passaggi precedenti non abbiamo una data.",
                "Dates are when we saw the badge change, starting on October 22, 2026: the move may have happened a few days earlier. We don’t have dates for earlier changes.",
              )}
            </Text>
          </View>
        )}
      </Sezione>

      <FoglioDiploma
        aperto={diploma}
        onChiudi={() => setDiploma(false)}
        persona={persona}
        vista={vista}
        dati={{
          nome,
          codice: attuale.codice,
          brevetto: nomeSpecie(attuale.specie),
          chiave: attuale.specie,
          // «Livello M1»: la sigla del livello di PerfectGym (come la scrive il club), non il numero in fondo al nome.
          livello: attuale.codice || attuale.livello,
          corso: t("Scuola Nuoto Bambini", "Kids Swim School"),
          data: dal,
        }}
      />
      <FoglioLibretto aperto={libretto} onChiudi={() => setLibretto(false)} persona={persona} vista={vista} nome={nome} codice={attuale.codice} />
    </>
  );
}

const stili = StyleSheet.create({
  eroe: { flexDirection: "row", alignItems: "center", gap: spazio.tre, padding: spazio.tre },
  personaggio: { width: 72, height: 72 },
  sigla: { minWidth: 56, height: 56, paddingHorizontal: 10, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  siglaTesto: { color: "#fff", fontFamily: F.extra, fontSize: 24, letterSpacing: -0.5 },
  nome: { fontFamily: F.extra, fontSize: 22, letterSpacing: -0.4 },
  titoloCarta: { fontFamily: F.extra, fontSize: 18, letterSpacing: -0.3 },
  piccolo: { fontFamily: F.medio, fontSize: 13, lineHeight: 19 },
  testo: { fontFamily: F.medio, fontSize: 14, lineHeight: 21 },
  sezioneTitolo: { fontFamily: F.extra, fontSize: 15 },
  riga: { flexDirection: "row", gap: spazio.due, alignItems: "flex-start" },
  cerchio: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, marginTop: 3 },
  punto: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  barra: { flexDirection: "row", gap: 4 },
  tacca: { flex: 1, height: 8, borderRadius: 4 },
  azioni: { flexDirection: "row", gap: spazio.due, flexWrap: "wrap" },
  livello: { borderTopWidth: StyleSheet.hairlineWidth },
  livelloTesta: { flexDirection: "row", alignItems: "center", gap: spazio.tre, padding: spazio.tre, minHeight: 64 },
  livelloCorpo: { gap: spazio.due, paddingHorizontal: spazio.tre, paddingBottom: spazio.tre },
  miniatura: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  livelloNome: { fontFamily: F.semi, fontSize: 16 },
  passo: { flexDirection: "row", gap: spazio.tre },
  binario: { width: 16, alignItems: "center" },
  puntoPassaggio: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, marginTop: 3 },
  linea: { flex: 1, width: 2, marginTop: 2 },
});
