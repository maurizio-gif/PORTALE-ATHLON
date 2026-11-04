import { inMemoria, ricorda, scorda } from "../memoria";

// «Iscrivi entrambi» (04/11/2026, richiesta di Maurizio): dai turni vicini il genitore sceglie una combinazione per due o tre figli. Sono
// iscrizioni separate, ognuna con il suo contratto, la sua firma e il suo pagamento: l'app le fa una dopo l'altra. Qui si ricorda la
// combinazione scelta, e la sezione Junior, tornando dal pagamento, mostra a che punto si e' e propone il figlio dopo. Solo in memoria
// (come `inCorso.ts`), e dopo due ore non vale piu': i posti nel frattempo possono essere cambiati.

export type VoceCoda = {
  member_id: number;
  nome: string;
  group_id: string;
  /** «Lunedì e Giovedì · 15:50». */
  turno: string;
};

type Coda = { voci: VoceCoda[]; creata: string };

const CHIAVE = "junior:coda-iscrizioni";
const VALE_MS = 2 * 60 * 60_000;

export function codaIscrizioni(): VoceCoda[] {
  const c = inMemoria<Coda>(CHIAVE);
  if (!c) return [];
  if (Date.now() - new Date(c.creata).getTime() > VALE_MS) {
    scorda(CHIAVE);
    return [];
  }
  return c.voci;
}

export function iniziaCoda(voci: VoceCoda[]) {
  ricorda<Coda>(CHIAVE, { voci, creata: new Date().toISOString() });
}

export function chiudiCoda() {
  scorda(CHIAVE);
}

/**
 * La prossima da fare: la prima che il nucleo non dice ancora iscritta. `iscritti(member_id, group_id)` sa se il bambino e' gia' in quel
 * turno (nel mirror, o appena firmato e in arrivo).
 */
export function prossimaDellaCoda(voci: VoceCoda[], iscritto: (memberId: number, groupId: number) => boolean): VoceCoda | null {
  return voci.find((v) => !iscritto(v.member_id, Number(v.group_id))) ?? null;
}
