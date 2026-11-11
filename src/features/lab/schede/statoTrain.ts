// In che momento e' la persona nell'area Train (11/11/2026), e cosa le va mostrato: puro, senza rete e senza React.
// Lo usa `AreaTrain.tsx` e lo prova `scripts/prova-stato-train.ts`.
//
// L'area Train e' diventata **verticale sul piano di allenamento** (richiesta di Maurizio: «troppa roba in ordine sparso»):
//   - **vuoto**: nessun piano. Si spiega che il piano si puo' avere in tre modi (assistito, caricato, dal personal trainer);
//   - **percorso**: c'e' un piano dell'allenamento assistito e manca il test dei massimali. Il test e' il passo dopo, in vista;
//   - **regime**: il piano sta in cima, il resto sotto.
// **Il test dei massimali non si offre piu' a tutti**: solo a chi ha un piano che lo usa, cioe' un piano dell'allenamento assistito
// o scritto dal trainer (nel CRM le righe hanno la percentuale del massimale), e non di nuoto. Chi ha solo piani caricati o scritti
// da se' non lo vede, a meno che un test l'abbia gia' fatto: un dato che c'e' non si nasconde.

export type PianoTrain = {
  id: string
  tipo: 'standard' | 'personalizzata' | 'ai' | 'socio'
  origine?: 'creata' | 'importata' | 'ai' | 'club' | null
  ambiente?: 'sala' | 'vasca'
  ultimo: string | null
}

export type TestTrain = { ultimo: string | null; fatti: number; totale: number; giorni: number; minimo?: number }

export type FaseTrain = 'vuoto' | 'percorso' | 'regime'

/**
 * Lo stato del test, per la riga che lo racconta:
 *   - `nascosto`: nessun piano lo usa e non e' mai stato fatto;
 *   - `da_fare`: mai fatto; `in_corso`: cominciato, meno esercizi del minimo; `fatto`; `da_rifare`: piu' vecchio di `giorni`.
 * `in_corso` e `fatto` si decidono dal **numero** di esercizi fatti, che e' quello che l'elenco dei piani porta: tre esercizi dello
 * stesso gruppo qui risultano «fatto», e la schermata del test (che ha i gruppi) dice quale manca.
 */
export type StatoTestTrain = 'nascosto' | 'da_fare' | 'in_corso' | 'fatto' | 'da_rifare'

/** Un piano nato dal questionario dell'allenamento assistito. */
export function eAssistito(s: Pick<PianoTrain, 'tipo' | 'origine'>): boolean {
  return s.tipo === 'ai' || (s.tipo === 'socio' && s.origine === 'ai')
}

/** Un piano scritto dal trainer, dal CRM. */
export function eDelTrainer(s: Pick<PianoTrain, 'tipo'>): boolean {
  return s.tipo === 'personalizzata'
}

/** Un piano i cui chili si calcolano dai massimali: assistito o del trainer, e non di nuoto (in vasca non ci sono chili). */
export function usaIMassimali(s: Pick<PianoTrain, 'tipo' | 'origine' | 'ambiente'>): boolean {
  return (eAssistito(s) || eDelTrainer(s)) && s.ambiente !== 'vasca'
}

export function statoTest(test: TestTrain, serve: boolean, adesso: number): StatoTestTrain {
  if (!test.ultimo) return serve ? 'da_fare' : 'nascosto'
  if (adesso - new Date(test.ultimo).getTime() > test.giorni * 86_400_000) return 'da_rifare'
  return test.fatti < (test.minimo ?? 3) ? 'in_corso' : 'fatto'
}

export type StatoTrain<P extends PianoTrain> = {
  fase: FaseTrain
  /** Il piano in cima: quello con l'allenamento piu' recente; se nessuno e' stato iniziato, il primo che usa i massimali, o il primo. */
  principale: P | null
  /** Gli altri piani della persona, nell'ordine in cui arrivano. */
  altri: P[]
  test: StatoTestTrain
  /** Nel percorso: il piano assistito a cui manca il test. */
  delPercorso: P | null
  /** Ha solo piani caricati o scritti da se': si invita a provare l'allenamento assistito. */
  invitoAssistito: boolean
}

/**
 * @param schede i piani della persona (quelli del club, `standard`, non contano)
 * @param rimandato la persona ha scelto «Lo faccio dopo» sul test (ricordato sul dispositivo)
 */
export function statoTrain<P extends PianoTrain>(schede: P[], test: TestTrain, rimandato: boolean, adesso: number = Date.now()): StatoTrain<P> {
  const mie = schede.filter((s) => s.tipo !== 'standard')
  const conTest = statoTest(test, mie.some(usaIMassimali), adesso)
  if (!mie.length) return { fase: 'vuoto', principale: null, altri: [], test: conTest, delPercorso: null, invitoAssistito: false }

  // Il percorso: un piano assistito (di sala) mai iniziato, col test ancora da fare o a meta', e la persona non l'ha rimandato.
  const daAvviare = mie.find((s) => eAssistito(s) && usaIMassimali(s) && !s.ultimo) ?? null
  const inPercorso = !!daAvviare && (conTest === 'da_fare' || conTest === 'in_corso') && !rimandato

  const iniziati = mie.filter((s) => s.ultimo).sort((a, b) => (a.ultimo! < b.ultimo! ? 1 : a.ultimo! > b.ultimo! ? -1 : 0))
  const principale = inPercorso ? daAvviare : (iniziati[0] ?? mie.find(usaIMassimali) ?? mie[0])
  return {
    fase: inPercorso ? 'percorso' : 'regime',
    principale,
    altri: mie.filter((s) => s.id !== principale!.id),
    test: conTest,
    delPercorso: inPercorso ? daAvviare : null,
    invitoAssistito: !mie.some((s) => eAssistito(s) || eDelTrainer(s)),
  }
}
