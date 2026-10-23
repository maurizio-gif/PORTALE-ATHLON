import { inMemoria, ricorda, scorda } from "../memoria";

// L'iscrizione appena firmata che il mirror di PerfectGym non ha ancora (23/10/2026, richiesta di Maurizio: «tornando indietro,
// sulla sezione Junior di Emma, mi dà ancora abbonamento da fare»). Il contratto nasce su PerfectGym alla firma, ma il mirror da cui
// legge `portale-lab-junior` arriva con qualche secondo (a volte qualche minuto) di ritardo: nel frattempo la sezione Junior mostra
// l'iscrizione come «in corso, da pagare», dal momento in cui si firma, e la toglie appena il mirror la dice. Solo in memoria, mai
// sul disco, e dopo venti minuti non vale piu': se il mirror non l'ha vista, l'ultima parola e' del server.

export type InCorso = {
  member_id: number;
  group_id: number;
  gruppo: string;
  numero: string;
  /** ISO: quando si e' firmato. */
  firmata: string;
  /** Il pagamento e' andato a buon fine (lo dice la pagina dell'abbonamento): il mirror non l'ha ancora detto. */
  pagata?: boolean;
};

const CHIAVE = "junior:in-corso";
const VALE_MS = 20 * 60_000;

function vive(): InCorso[] {
  const ora = Date.now();
  return (inMemoria<InCorso[]>(CHIAVE) ?? []).filter((x) => ora - new Date(x.firmata).getTime() < VALE_MS);
}

export function iscrizioniInCorso(): InCorso[] {
  return vive();
}

export function inCorsoDi(memberId: number): InCorso | undefined {
  return vive().find((x) => x.member_id === memberId);
}

export function registraInCorso(x: Omit<InCorso, "firmata">) {
  ricorda(CHIAVE, [...vive().filter((y) => !(y.member_id === x.member_id && y.group_id === x.group_id)), { ...x, firmata: new Date().toISOString() }]);
}

/** Il mirror l'ha vista: non serve piu' dirla noi. */
export function concludiInCorso(memberId: number, groupId: number) {
  const resto = vive().filter((y) => !(y.member_id === memberId && y.group_id === groupId));
  if (resto.length) ricorda(CHIAVE, resto);
  else scorda(CHIAVE);
}

/** La pagina dell'abbonamento ha visto il pagamento a posto: la sezione Junior lo dice subito. */
export function segnaPagataInCorso(numero: string) {
  const tutte = vive();
  if (!tutte.some((x) => x.numero === numero && !x.pagata)) return;
  ricorda(CHIAVE, tutte.map((x) => (x.numero === numero ? { ...x, pagata: true } : x)));
}
