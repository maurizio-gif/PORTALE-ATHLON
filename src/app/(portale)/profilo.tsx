import { Redirect } from 'expo-router'

import { hrefSezione } from '@/features/lab/home/sezioni'

// Il profilo sta nella Home (17/10/2026): il vecchio indirizzo porta alla
// sezione giusta, cosi' i link gia' in giro non si rompono.
export default function Vai() {
  return <Redirect href={hrefSezione('profilo')} />
}
