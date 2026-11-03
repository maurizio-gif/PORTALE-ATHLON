import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { livelliJunior, type EsitoLivelli, type PersonaJunior } from "@/api/junior";
import { locale, t } from "@/lib/lingua";
import { spazio } from "@/theme";

import { Icona } from "../ui/Icona";
import { Carta, Messaggio, Pulsante, Sezione } from "../ui/kit";
import { F, usePalette, velo } from "../ui/tema";
import { dateDeiPassaggi, giornoBrevetto, leggiBrevetto, LIVELLI, nomeBrevetto, nomeSpecie, posizioneDi } from "./datiBrevetti";
import { nomeCompleto } from "./comune";
import { Dettagli } from "./Dettagli";
import { datiLibretto, stampaLibretto } from "./esportaLibretto";
import { FoglioDiploma } from "./FoglioDiploma";
import { InvitoFoto, useFotoBambino } from "./FotoBambino";
import type { DatiDiploma } from "./immagineBrevetto";
import { personaggioDi } from "./personaggiBrevetti";
import { PersonaggioAnimato } from "./PersonaggioAnimato";
import { ViaggioBrevetti } from "./ViaggioBrevetti";

// La voce «Brevetti» di un bambino iscritto (02/11/2026, richiesta di Maurizio: «al posto della voce Livello, metti Brevetti»). In una pagina:
//   1. il brevetto di adesso (il livello di PerfectGym: «A2 - Stella Marina 2») col personaggio, **la data in cui l'abbiamo visto arrivare, in evidenza** (dove la sappiamo)
//      e **«Condividi il brevetto»**: il diplomino per i social;
//   2. **il viaggio** (`ViaggioBrevetti`, 03/11/2026): la progressione dei dodici brevetti, animata, da sfogliare una pagina per brevetto; **ogni pagina conseguita si
//      condivide** (lo stesso diplomino, con quel brevetto). Ha preso il posto del libretto da sfogliare (le pagine del PDF una accanto all'altra) e dell'elenco dei livelli;
//   3. **il libretto in PDF**, per chi lo vuole da tenere o stampare: non e' piu' il modo di sfogliare, e' un file;
//   4. **il percorso**: lo storico dei passaggi (`junior_livelli_storico`, dal 22/10/2026: PerfectGym non da' le date, quindi sono date «rilevate»).
//
// **La data del brevetto non viene dal mirror di PerfectGym** (03/11/2026, verificato sul database): la relazione socio-livello porta `id`, `name`, `order`,
// `activityCategoryId`, `isDeleted` e un `version` che e' quello della definizione del livello; il `version` del socio non si muove al cambio di livello; i webhook
// `UserModified` scattano a ogni modifica del socio e non dicono cosa e' cambiato. Resta il nostro registro: una data vera (al giorno) per i passaggi dal 22/10/2026 in poi,
// niente per chi il livello lo aveva gia' (`primo_rilevamento`): e per quelli non si scrive nessuna data. Vedi `dateDeiPassaggi`.

export function Brevetti({ persona, vista }: { persona: PersonaJunior; vista: boolean }) {
  const p = usePalette();
  const [esito, setEsito] = useState<EsitoLivelli | undefined>();
  // Il diplomino da condividere: quello del brevetto di adesso (dalla carta in cima) o di uno dei conseguiti (dalla sua pagina del viaggio).
  const [diploma, setDiploma] = useState<Omit<DatiDiploma, "foto"> | null>(null);
  const [lavoroPdf, setLavoroPdf] = useState(false);
  const [errorePdf, setErrorePdf] = useState<string | null>(null);
  const id = persona.member_id;
  // La foto del bambino, per il viaggio (il gettone sul binario), per la copertina del PDF e per il diploma: la legge una volta la pagina.
  const statoFoto = useFotoBambino(true, persona, vista);

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
  // Le date in cui abbiamo visto arrivare i brevetti: solo i passaggi veri, mai le righe «al primo rilevamento» (dicono che il livello c'era gia', non da quando).
  const date = dateDeiPassaggi(passaggi);
  const dal = attuale?.codice && date[attuale.codice] ? giornoBrevetto(date[attuale.codice]) : null;

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
  // I dati del diplomino di un brevetto: la sigla come la scrive il club («Livello M1»), la data solo dove la sappiamo.
  const datiDiploma = (codice: string, specie: string, numero: string | null): Omit<DatiDiploma, "foto"> => ({
    nome,
    codice,
    brevetto: nomeSpecie(specie),
    chiave: specie,
    livello: codice || numero,
    corso: t("Scuola Nuoto Bambini", "Kids Swim School"),
    data: codice && date[codice] ? giornoBrevetto(date[codice]) : null,
  });
  const diplomaAttuale = datiDiploma(attuale.codice, attuale.specie, attuale.livello);

  const scarica = async () => {
    setLavoroPdf(true);
    setErrorePdf(null);
    const oggi = new Date().toLocaleDateString(locale(), { day: "numeric", month: "long", year: "numeric" });
    const r = await stampaLibretto(datiLibretto(nome, attuale.codice, statoFoto.foto, oggi));
    setLavoroPdf(false);
    if (r === "errore") setErrorePdf(t("Non siamo riusciti a preparare il PDF. Riprova.", "We couldn’t prepare the PDF. Please try again."));
  };

  return (
    <>
      <Carta>
        <View style={stili.eroe}>
          {personaggio ? (
            <PersonaggioAnimato specie={attuale.specie} larghezza={72} altezza={72} effetti={false} etichetta={nomeSpecie(attuale.specie)} />
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
          </View>
        </View>
        {/* La data in cui il brevetto e' stato aggiornato, in evidenza: scritta solo dove la sappiamo (vedi il commento in testa). */}
        {dal ? (
          <View style={[stili.dataEvidenza, { backgroundColor: velo(p, "accento", p.scuro ? 0.18 : 0.1) }]}>
            <Icona nome="calendario" size={16} colore={p.accento} />
            <Text style={[stili.dataTesto, { color: p.accento }]}>{t(`Aggiornato il ${dal}`, `Updated on ${dal}`)}</Text>
          </View>
        ) : null}
        <View style={{ padding: spazio.tre, paddingTop: 0 }}>
          <Pulsante testo={t("Condividi il brevetto", "Share the badge")} icona="condividi" onPress={() => setDiploma(diplomaAttuale)} />
        </View>
      </Carta>

      {posizione >= 0 ? (
        <>
          <ViaggioBrevetti
            nome={persona.nome ?? ""}
            posizione={posizione}
            date={date}
            foto={statoFoto.foto}
            onCondividi={(l) => setDiploma(datiDiploma(l.codice, l.specie, l.numero))}
          />
          <Text style={[stili.piccolo, { color: p.testoTerzo }]}>
            {t(
              "I livelli sono progressivi: quelli fino al brevetto di adesso risultano conseguiti. Prove e programma sono quelli del libretto del club.",
              "Levels are progressive: those up to the current badge count as earned. Tests and programme are those of the club’s booklet.",
            )}
          </Text>

          <InvitoFoto
            nome={persona.nome ?? t("il bambino", "your child")}
            stato={statoFoto}
            dove={t("Compare nel viaggio, sul diploma e sulla copertina del libretto in PDF.", "It appears in the journey, on the diploma and on the cover of the PDF booklet.")}
          />

          <Carta>
            <View style={{ padding: spazio.tre, gap: spazio.tre }}>
              <View style={{ gap: 2 }}>
                <Text style={[stili.titoloCarta, { color: p.testo }]}>{t("Il libretto in PDF", "The booklet as a PDF")}</Text>
                <Text style={[stili.piccolo, { color: p.testoSecondario }]}>
                  {t(
                    `Tutti i ${LIVELLI.length} brevetti con le prove e il programma, in 15 pagine da tenere o stampare. Per sfogliarlo usa il viaggio qui sopra: questo è il file.`,
                    `All ${LIVELLI.length} badges with tests and programme, in 15 pages to keep or print. To browse it use the journey above: this is the file.`,
                  )}
                </Text>
              </View>
              {errorePdf ? <Messaggio>{errorePdf}</Messaggio> : null}
              <Pulsante testo={t("Scarica il libretto in PDF", "Download the booklet as a PDF")} icona="scarica" variante="secondario" inCorso={lavoroPdf} onPress={scarica} />
              {!statoFoto.foto && statoFoto.modificabile ? (
                <Text style={[stili.piccolo, { color: p.accento, fontFamily: F.bold }]}>
                  {t("Senza la foto la copertina resta vuota: mettila qui sopra prima di scaricare il PDF.", "Without the photo the cover stays empty: add it above before downloading the PDF.")}
                </Text>
              ) : null}
            </View>
          </Carta>
        </>
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

      <Sezione titolo={t("Il percorso", "The journey so far")}>
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
                      {x.primo_rilevamento ? t(`Brevetto al primo rilevamento · ${giornoBrevetto(x.rilevato_il)}`, `Badge at first check · ${giornoBrevetto(x.rilevato_il)}`) : giornoBrevetto(x.rilevato_il)}
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

      <FoglioDiploma aperto={diploma !== null} onChiudi={() => setDiploma(null)} persona={persona} vista={vista} dati={diploma ?? diplomaAttuale} />
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
  livelloNome: { fontFamily: F.semi, fontSize: 16 },
  dataEvidenza: { flexDirection: "row", alignItems: "center", gap: spazio.due, alignSelf: "flex-start", marginHorizontal: spazio.tre, marginBottom: spazio.tre, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  dataTesto: { fontFamily: F.extra, fontSize: 14 },
  passo: { flexDirection: "row", gap: spazio.tre },
  binario: { width: 16, alignItems: "center" },
  puntoPassaggio: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, marginTop: 3 },
  linea: { flex: 1, width: 2, marginTop: 2 },
});
