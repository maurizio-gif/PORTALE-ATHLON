// Sul web la `fetch` del browser legge gia' il corpo a pezzi. Vedi `fetchFlusso.ts`.
export const fetchFlusso: typeof fetch = (...a) => fetch(...a)
