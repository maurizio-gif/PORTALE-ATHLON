// La `fetch` che legge il corpo a pezzi. Sul telefono quella di `expo/fetch` (la `fetch` di React Native aspetta tutto il corpo); sul web
// `fetchFlusso.web.ts` usa quella del browser, che gia' lo fa.
import { fetch as fetchExpo } from 'expo/fetch'

export const fetchFlusso = fetchExpo as unknown as typeof fetch
