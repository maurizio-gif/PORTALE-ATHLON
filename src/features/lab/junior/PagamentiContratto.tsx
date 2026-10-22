import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  contrattiAbbonamento,
  documentoAbbonamento,
  type AddebitoContratto,
  type ContrattoElenco,
} from "@/api/abbonamento";
import { t } from "@/lib/lingua";
import { spazio } from "@/theme";

import { useApriPdf } from "../apriPdf";
import { inMemoria, prendi } from "../memoria";
import { Carta, Etichetta, Pulsante, Riga } from "../ui/kit";
import { F, usePalette } from "../ui/tema";
import { dataIt, euroIt } from "./comune";

// Il contratto firmato e i pagamenti di un abbonamento junior (22/10/2026, richiesta di Maurizio): il PDF sottoscritto, le quote
// gia' pagate e quelle in arrivo, mese per mese. Stessi dati e stessa funzione di «I tuoi abbonamenti» (`portale-abbonamento`,
// azione `contratti`): niente di nuovo da calcolare qui. Se la lettura non riesce o il contratto non e' nell'elenco, la sezione
// non compare: i dati dell'abbonamento restano quelli della carta sopra.

const CHIAVE = "abbonamenti:contratti";

type Esito = { ok: true; contratti: ContrattoElenco[] } | { ok: false; errore: string };

function nomeQuota(a: AddebitoContratto): string {
  if (a.tipo === "Manual") return a.descrizione?.trim() || t("Addebito", "Charge");
  if (a.tipo === "Prorata") return t("Pro-rata", "Pro rata");
  if (a.tipo === "AdminFee" || a.tipo === "JoiningFee") return t("Quota di attivazione", "Joining fee");
  if (a.tipo === "Freeze") return t("Sospensione", "Freeze");
  return t("Quota mensile", "Monthly fee");
}

export function PagamentiContratto({ contrattoId }: { contrattoId: number }) {
  const p = usePalette();
  const [esito, setEsito] = useState<Esito | undefined>(() => inMemoria<Esito>(CHIAVE));
  const [scarico, setScarico] = useState(false);
  const { apri, avviso } = useApriPdf();

  useEffect(() => {
    let vivo = true;
    prendi(CHIAVE, () => contrattiAbbonamento()).then((e) => vivo && setEsito(e as Esito));
    return () => {
      vivo = false;
    };
  }, []);

  const c = esito?.ok ? esito.contratti.find((x) => x.contract_id === contrattoId) : undefined;
  if (!c) return null;

  const pagati = c.addebiti
    .filter((a) => a.stato === "pagato")
    .sort((x, y) => (y.scadenza ?? "").localeCompare(x.scadenza ?? ""));
  const futuri = c.addebiti
    .filter((a) => a.stato === "da_pagare")
    .sort((x, y) => (x.scadenza ?? "").localeCompare(y.scadenza ?? ""));

  async function scarica() {
    if (!c?.firmato) return;
    const numero = c.firmato.numero;
    setScarico(true);
    await apri(async () => {
      const r = await documentoAbbonamento(numero);
      return r.ok ? { ...r, nome: t(`contratto-${numero}.pdf`, `contract-${numero}.pdf`) } : r;
    });
    setScarico(false);
  }

  return (
    <>
      <Carta>
        <View style={{ gap: spazio.due, padding: spazio.tre }}>
          <Text style={[stili.titolo, { color: p.testo }]}>{t("Il contratto", "The contract")}</Text>
          <Voce nome={t("Sottoscritto il", "Signed on")} valore={dataIt(c.data_firma)} />
          <Voce nome={t("Addebitato", "Charged")} valore={euroIt(c.totali.addebitato)} />
          <Voce nome={t("Pagato", "Paid")} valore={euroIt(c.totali.pagato)} colore={p.ok} />
          <Voce nome={t("Da pagare", "Due")} valore={euroIt(c.totali.da_pagare)} colore={c.totali.da_pagare > 0 ? p.accento : undefined} />
          {c.firmato?.pdf ? (
            <Pulsante
              testo={t("Il contratto firmato (PDF)", "Signed contract (PDF)")}
              icona="documento"
              variante="contorno"
              piccolo
              onPress={scarica}
              inCorso={scarico}
            />
          ) : (
            <Text style={[stili.nota, { color: p.testoTerzo }]}>
              {t("Il PDF del contratto firmato non è disponibile da qui: chiedilo alla segreteria.", "The signed PDF isn’t available here: ask the front desk.")}
            </Text>
          )}
          {avviso}
        </View>
      </Carta>

      <Carta>
        {[
          ...futuri.map((a) => ({ a, futuro: true })),
          ...pagati.map((a) => ({ a, futuro: false })),
        ].length ? (
          [...futuri.map((a) => ({ a, futuro: true })), ...pagati.map((a) => ({ a, futuro: false }))].map(({ a, futuro }, i) => (
            <Riga
              key={`${a.scadenza}-${a.tipo}-${i}`}
              prima={i === 0}
              titolo={nomeQuota(a)}
              sotto={
                futuro
                  ? t(`Scade il ${dataIt(a.scadenza)}`, `Due on ${dataIt(a.scadenza)}`)
                  : t(`Del ${dataIt(a.scadenza)}`, `Dated ${dataIt(a.scadenza)}`)
              }
              coda={
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text style={[stili.importo, { color: p.testo }]}>{euroIt(futuro ? a.da_pagare : a.importo)}</Text>
                  <Etichetta testo={futuro ? t("Da pagare", "Due") : t("Pagato", "Paid")} tono={futuro ? "attenzione" : "ok"} />
                </View>
              }
            />
          ))
        ) : (
          <Text style={[stili.nota, { color: p.testoSecondario, padding: spazio.tre }]}>
            {t("Nessun pagamento da mostrare su questo contratto.", "No payments to show on this contract.")}
          </Text>
        )}
      </Carta>
    </>
  );
}

function Voce({ nome, valore, colore }: { nome: string; valore: string; colore?: string }) {
  const p = usePalette();
  return (
    <View style={stili.voce}>
      <Text style={[stili.nota, { color: p.testoSecondario }]}>{nome}</Text>
      <Text style={[stili.valore, { color: colore ?? p.testo }]}>{valore}</Text>
    </View>
  );
}

const stili = StyleSheet.create({
  titolo: { fontFamily: F.extra, fontSize: 16 },
  nota: { fontFamily: F.medio, fontSize: 13, lineHeight: 18 },
  voce: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  valore: { fontFamily: F.bold, fontSize: 14 },
  importo: { fontFamily: F.bold, fontSize: 14 },
});
