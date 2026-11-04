import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { esitoAbbonamento, pagaAbbonamento, pagaGruppo, type EsitoContratto, type EsitoPagaGruppo } from "@/api/abbonamento";
import { ModuloIban, type DatiConto } from "@/features/metodo-pagamento/ModuloIban";
import { euro } from "@/lib/eventi";
import { t } from "@/lib/lingua";
import { apriPagamento } from "@/lib/pagamentoEsterno";
import { spazio } from "@/theme";

import { SchedaScelta } from "../abbonamento/Passi";
import { scorda, scordaPrefisso } from "../memoria";
import { passaDalTotem } from "../totem/passaggio";
import { SchermataInArrivo } from "../ui/Attesa";
import { Icona } from "../ui/Icona";
import { Carta, Messaggio, Pulsante, Sezione } from "../ui/kit";
import { Schermata } from "../ui/Schermata";
import { F, usePalette } from "../ui/tema";
import { colpetto } from "../ui/Tocco";
import { vistaCorrente } from "../vista";
import { chiudiCoda } from "./codaIscrizioni";
import { CHIAVE_GRUPPI_JUNIOR } from "./Junior";

// Il pagamento di piu' figli iscritti insieme (04/11/2026, richiesta di Maurizio), dopo `IscrizioneFigli`. `?numeri=<n1>,<n2>`: i contratti
// firmati. **Per PerfectGym sono incassi separati** (uno per contratto, intestato al bambino); qui si pagano da una schermata sola:
//   - **conto (SEPA)**: l'IBAN si scrive una volta e vale per tutti (`paga_gruppo`); niente da pagare adesso, le quote si addebitano.
//   - **carta**: un «Paga» solo; si apre la pagina della banca per il primo figlio e, tornati qui, quella del secondo («Pagamento 2 di 2»).
//     Ogni pagina salva la carta sul suo bambino, per le quote dopo. Sul web la pagina si ricarica: lo stato si rilegge da `esito`.
// Un contratto pagato non si ripaga: si va avanti con quelli che mancano.

type Riga = { numero: string; esito: EsitoContratto | null };

const pagato = (e: EsitoContratto | null) => !!e && (e.pagamento?.ok === true || e.stato === "completato");
const inCorso = (e: EsitoContratto | null) => !!e && !pagato(e) && e.pagamento?.in_corso === true && !e.pagamento?.errore;

/** L'indirizzo a cui tornare dopo la pagina della carta: questa schermata, con gli stessi contratti. */
function ritorno(numeri: string[]): string | undefined {
  if (Platform.OS !== "web" || typeof window === "undefined") return undefined;
  return `${window.location.origin}/pagamento-figli?numeri=${numeri.join(",")}`;
}

export function PagamentoFigli() {
  const p = usePalette();
  const { numeri: numeriParam } = useLocalSearchParams<{ numeri?: string }>();
  const numeri = useMemo(
    () =>
      typeof numeriParam === "string"
        ? [...new Set(numeriParam.split(",").map((x) => x.trim()).filter((x) => /^[A-Z0-9-]{6,40}$/.test(x)))].slice(0, 4)
        : [],
    [numeriParam],
  );
  const vista = !!vistaCorrente();
  const [righe, setRighe] = useState<Riga[] | null>(null);
  const [metodo, setMetodo] = useState<"carta" | "conto">("carta");
  const [conto, setConto] = useState<DatiConto | null>(null);
  const [pagando, setPagando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const giri = useRef(0);

  const carica = useCallback(async () => {
    const r = await Promise.all(numeri.map((n) => esitoAbbonamento(n)));
    setRighe(numeri.map((numero, i) => ({ numero, esito: r[i].ok ? r[i].esito : null })));
  }, [numeri]);
  useEffect(() => {
    if (numeri.length) carica();
  }, [carica, numeri.length]);
  // Al ritorno dalla pagina della carta l'esito puo' arrivare con qualche secondo di ritardo: si rilegge per un po'.
  useEffect(() => {
    if (!righe?.some((x) => inCorso(x.esito)) || giri.current >= 8) return;
    const id = setTimeout(() => {
      giri.current += 1;
      carica();
    }, 3000);
    return () => clearTimeout(id);
  }, [righe, carica]);

  const daPagare = (righe ?? []).filter((x) => !pagato(x.esito));
  const fatti = (righe ?? []).filter((x) => pagato(x.esito));
  const tutti = !!righe && !daPagare.length;
  const nome = (x: Riga) => x.esito?.contratto?.nome ?? t("tuo figlio", "your child");
  const totale = daPagare.reduce((s, x) => s + Number(x.esito?.contratto?.totale_oggi ?? 0), 0);
  const prossimo = daPagare.find((x) => !inCorso(x.esito)) ?? null;
  const indice = prossimo ? (righe ?? []).findIndex((x) => x.numero === prossimo.numero) + 1 : 0;

  useEffect(() => {
    if (!tutti) return;
    chiudiCoda();
    scorda(CHIAVE_GRUPPI_JUNIOR);
    scordaPrefisso("junior:corsi");
    scorda("abbonamenti:contratti");
    scorda("area");
  }, [tutti]);

  async function pagaConto() {
    if (!conto || !daPagare.length) return;
    if (!(await passaDalTotem({ cosa: "abbonamento", percorso: "/junior" }))) return;
    setErrore(null);
    setPagando(true);
    const numeriDaPagare = daPagare.map((x) => x.numero);
    // Con un solo contratto rimasto (l'altro gia' pagato) si usa `paga`: `paga_gruppo` ne vuole almeno due.
    const r =
      numeriDaPagare.length >= 2
        ? await pagaGruppo(numeriDaPagare, conto)
        : await pagaAbbonamento(numeriDaPagare[0], { metodo: "conto", ...conto }).then((x) =>
            x.ok ? { ok: true as const, esiti: [{ numero: numeriDaPagare[0], ok: true }] as EsitoPagaGruppo[] } : x,
          );
    setPagando(false);
    if (!r.ok) {
      colpetto("errore");
      return setErrore(r.errore);
    }
    const falliti = r.esiti.filter((x) => !x.ok);
    if (falliti.length) {
      colpetto("errore");
      setErrore(falliti.map((x) => x.errore).filter(Boolean).join(" "));
    } else colpetto("ok");
    carica();
  }

  async function pagaCarta() {
    if (!prossimo) return;
    setErrore(null);
    setPagando(true);
    const r = await pagaAbbonamento(prossimo.numero, { metodo: "carta", con_carta: false }, ritorno(numeri));
    if (!r.ok) {
      setPagando(false);
      colpetto("errore");
      return setErrore(r.errore);
    }
    if (r.esito.url) {
      await apriPagamento(r.esito.url);
      // Sull'app installata il browser integrato si chiude e si torna qui: si rilegge. Sul web la pagina e' gia' cambiata.
      setPagando(false);
      giri.current = 0;
      carica();
      return;
    }
    setPagando(false);
    carica();
  }

  const intestazione = {
    titolo: t("Pagamento", "Payment"),
    sopratitolo: t("Corsi per bambini e ragazzi", "Courses for children and teens"),
    indietro: "/junior" as const,
    barra: false,
  };

  if (vista) {
    return (
      <Schermata {...intestazione}>
        <Messaggio tono="attenzione" titolo={t("Solo dal suo account", "Only from their account")}>
          {t("Il pagamento si fa dall’account del socio: da qui si guarda e basta.", "Payment is made from the member’s own account: from here you can only look.")}
        </Messaggio>
      </Schermata>
    );
  }
  if (!numeri.length) {
    return (
      <Schermata {...intestazione}>
        <Messaggio>{t("Non troviamo i contratti da pagare.", "We can’t find the contracts to pay.")}</Messaggio>
        <Pulsante testo={t("Torna alla sezione Junior", "Back to the Junior section")} variante="secondario" onPress={() => router.navigate("/junior" as const)} />
      </Schermata>
    );
  }
  if (!righe) return <SchermataInArrivo titolo={t("Pagamento", "Payment")} />;

  const nomi = (r: Riga[]) => {
    const n = r.map(nome);
    return n.length > 1 ? `${n.slice(0, -1).join(", ")} ${t("e", "and")} ${n[n.length - 1]}` : (n[0] ?? "");
  };

  return (
    <Schermata
      {...intestazione}
      sottotitolo={
        tutti
          ? t("Fatto: le iscrizioni sono a posto.", "Done: the enrollments are all set.")
          : t("I contratti sono firmati. Ultimo passo: un pagamento per tutti.", "The contracts are signed. Last step: one payment for all.")
      }
    >
      <View style={{ gap: spazio.quattro }}>
        <Sezione titolo={t("Le iscrizioni", "The enrollments")}>
          {righe.map((x) => (
            <Carta piatta key={x.numero}>
              <View style={stili.riga}>
                <Icona nome={pagato(x.esito) ? "ok" : inCorso(x.esito) ? "clessidra" : "carta"} size={18} colore={pagato(x.esito) ? p.ok : p.testoSecondario} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[stili.nome, { color: p.testo }]}>{nome(x)}</Text>
                  <Text style={[stili.nota, { color: p.testoSecondario }]}>
                    {[x.esito?.contratto?.titolo, pagato(x.esito) ? t("pagato", "paid") : inCorso(x.esito) ? t("pagamento in verifica", "payment being checked") : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </View>
                {x.esito?.contratto && !pagato(x.esito) ? <Text style={[stili.nome, { color: p.testo }]}>{euro(x.esito.contratto.totale_oggi)}</Text> : null}
              </View>
              {x.esito?.pagamento?.errore && !pagato(x.esito) ? <Text style={[stili.nota, { color: p.errore ?? p.testo }]}>{x.esito.pagamento.errore}</Text> : null}
            </Carta>
          ))}
        </Sezione>

        {tutti ? (
          <>
            <Messaggio tono="ok" titolo={t("Iscrizioni fatte", "Enrollments done")} icona="ok">
              {t(
                `${nomi(fatti)}: contratti firmati e pagati. Le prossime quote si addebitano da sole, ognuna sul contratto del suo figlio.`,
                `${nomi(fatti)}: contracts signed and paid. The next installments are charged automatically, each on its own child’s contract.`,
              )}
            </Messaggio>
            <Pulsante testo={t("Torna alla sezione Junior", "Back to the Junior section")} onPress={() => router.replace("/junior" as const)} />
          </>
        ) : (
          <>
            <Sezione titolo={t("Come paghi", "How you pay")}>
              <View style={{ gap: spazio.due }} accessibilityRole="radiogroup">
                <SchedaScelta
                  attiva={metodo === "carta"}
                  etichetta={t("Paga con carta", "Pay by card")}
                  icona="carta"
                  titolo={t("Carta", "Card")}
                  sotto={t(
                    "Paghi sulla pagina sicura della banca, una per ogni figlio, una dopo l’altra: la carta resta salvata e le quote dopo si addebitano da sole.",
                    "You pay on the bank’s secure page, one per child, one after the other: the card stays saved and later installments are charged automatically.",
                  )}
                  onPress={() => {
                    setMetodo("carta");
                    setErrore(null);
                  }}
                />
                <SchedaScelta
                  attiva={metodo === "conto"}
                  etichetta={t("Paga con conto corrente", "Pay by bank account")}
                  icona="banca"
                  titolo={t("Conto corrente (addebito SEPA)", "Bank account (SEPA direct debit)")}
                  sotto={t(
                    "Scrivi l’IBAN una volta: vale per tutti i figli. Le quote, la prima compresa, si addebitano sul conto. Niente da pagare adesso.",
                    "Enter the IBAN once: it applies to all your children. All installments, the first included, are charged to the account. Nothing to pay now.",
                  )}
                  onPress={() => {
                    setMetodo("conto");
                    setErrore(null);
                  }}
                />
              </View>
              {metodo === "conto" ? (
                conto ? (
                  <View style={{ gap: spazio.due }}>
                    <Text style={[stili.nota, { color: p.testoSecondario }]}>
                      {t(`Conto •••• ${conto.iban.slice(-4)}, intestato a ${conto.intestatario}.`, `Account •••• ${conto.iban.slice(-4)}, in the name of ${conto.intestatario}.`)}
                    </Text>
                    <Pulsante testo={t("Cambia conto", "Change account")} variante="fantasma" piccolo pieno={false} onPress={() => setConto(null)} />
                  </View>
                ) : (
                  <ModuloIban
                    nomeCompleto=""
                    introduzione={<Text style={[stili.nota, { color: p.testoSecondario }]}>{t("Scrivi l’IBAN su cui addebitare le quote di tutti i figli.", "Enter the IBAN to charge all your children’s installments to.")}</Text>}
                    etichettaInvio={t("Usa questo conto", "Use this account")}
                    onInvia={async (d) => {
                      setConto(d);
                      return null;
                    }}
                    onIndietro={() => setMetodo("carta")}
                  />
                )
              ) : null}
            </Sezione>

            {errore ? <Messaggio>{errore}</Messaggio> : null}
            {metodo === "conto" ? (
              <Pulsante
                testo={t(`Conferma e attiva per ${nomi(daPagare)}`, `Confirm and activate for ${nomi(daPagare)}`)}
                icona="banca"
                onPress={pagaConto}
                inCorso={pagando}
                disabilitato={!conto}
              />
            ) : prossimo ? (
              <Pulsante
                testo={
                  fatti.length || daPagare.length < righe.length
                    ? t(`Paga per ${nome(prossimo)} (${indice} di ${righe.length})`, `Pay for ${nome(prossimo)} (${indice} of ${righe.length})`)
                    : t(`Paga ${euro(totale)}`, `Pay ${euro(totale)}`)
                }
                icona="carta"
                onPress={pagaCarta}
                inCorso={pagando}
              />
            ) : (
              <Text style={[stili.nota, { color: p.testoSecondario }]}>{t("Verifichiamo il pagamento…", "Checking the payment…")}</Text>
            )}
            {metodo === "carta" && prossimo && !fatti.length && daPagare.length > 1 ? (
              <Text style={[stili.nota, { color: p.testoSecondario }]}>
                {t(
                  `In tutto ${euro(totale)}: la banca chiede un pagamento per figlio. Si comincia da ${nome(prossimo)}, poi si torna qui per ${nomi(daPagare.filter((x) => x !== prossimo))}.`,
                  `${euro(totale)} in total: the bank asks for one payment per child. We start with ${nome(prossimo)}, then come back here for ${nomi(daPagare.filter((x) => x !== prossimo))}.`,
                )}
              </Text>
            ) : null}
            <Text style={[stili.nota, { color: p.testoSecondario }]}>
              {t(
                "Se non completi ora, i contratti restano firmati: riprendi dal pagamento dalla sezione Junior o da Abbonamenti.",
                "If you don’t finish now, the contracts stay signed: pick up the payment from the Junior section or Memberships.",
              )}
            </Text>
          </>
        )}
      </View>
    </Schermata>
  );
}

const stili = StyleSheet.create({
  riga: { flexDirection: "row", alignItems: "center", gap: spazio.tre },
  nome: { fontFamily: F.bold, fontSize: 15 },
  nota: { fontFamily: F.medio, fontSize: 13, lineHeight: 19 },
});
