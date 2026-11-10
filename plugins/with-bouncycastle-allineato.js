// Android: le tre librerie BouncyCastle devono avere la stessa versione (10/11/2026).
//
// **Perche' esiste.** La prima build Android con l'SDK di Adyen (3.1.0) si e' fermata nel passo `checkReleaseDuplicateClasses` di Gradle:
//
//   Duplicate class org.bouncycastle.asn1.iana.IANAObjectIdentifiers found in modules
//   bcprov-jdk15to18-1.86 (org.bouncycastle:bcprov-jdk15to18:1.86) and bcutil-jdk15to18-1.81 (org.bouncycastle:bcutil-jdk15to18:1.81)
//
// Una dipendenza porta `bcprov` 1.86, un'altra (via `bcpkix`) porta `bcutil` 1.81. La classe e' passata da `bcutil` a `bcprov` nelle versioni nuove, quindi
// il mix le ha tutte e due. Con le tre alla stessa versione non c'e' nessuna classe in comune (controllato sui jar veri: bcprov, bcutil e bcpkix 1.86 hanno 0
// classi doppie, e il mix 1.86 + 1.81 ne ha una).
//
// La regola va nel `build.gradle` radice e vale per tutti i progetti (anche i moduli nativi delle librerie). Tocca solo `bcprov`, `bcutil` e `bcpkix`: un
// altro modulo BouncyCastle non si cambia per una versione che potrebbe non esistere. Quando le librerie portano versioni coerenti da sole (e il guasto non si
// vede piu' senza questo plugin) si puo' togliere da `app.json`.
const { withProjectBuildGradle } = require('expo/config-plugins')

const VERSIONE = '1.86'
const MODULI = ['bcprov-jdk15to18', 'bcutil-jdk15to18', 'bcpkix-jdk15to18']
const MARCA = '// athlon: BouncyCastle alla stessa versione'

module.exports = function withBouncyCastleAllineato(config) {
  return withProjectBuildGradle(config, (c) => {
    if (c.modResults.language !== 'groovy') {
      throw new Error('with-bouncycastle-allineato: il build.gradle radice non e\' in Groovy, la regola va riscritta.')
    }
    // Idempotente: un secondo prebuild non la scrive due volte.
    if (!c.modResults.contents.includes(MARCA)) {
      c.modResults.contents += `
${MARCA}
allprojects {
  configurations.configureEach {
    resolutionStrategy.eachDependency { details ->
      if (details.requested.group == 'org.bouncycastle' && [${MODULI.map((m) => `'${m}'`).join(', ')}].contains(details.requested.name)) {
        details.useVersion '${VERSIONE}'
        details.because('bcprov, bcutil e bcpkix devono avere la stessa versione, o Gradle trova classi doppie')
      }
    }
  }
}
`
    }
    return c
  })
}
