"""Genera `src/features/lab/junior/larghezzeFont.ts`: le larghezze dei caratteri di Plus Jakarta Sans (le stesse di `F` in `ui/tema.ts`), per misurare
il testo del diplomino sull'app nativa, dove non c'e' un canvas con `measureText`.

Uso (serve fontTools: `pip install fonttools`, e `npm ci` per i file dei caratteri):

    python3 scripts/larghezze-font-diploma.py > src/features/lab/junior/larghezzeFont.ts
"""
import json
import sys
from fontTools.ttLib import TTFont

BASE = "node_modules/@expo-google-fonts/plus-jakarta-sans"
FAMIGLIE = {
    "PlusJakartaSans_800ExtraBold": "800ExtraBold/PlusJakartaSans_800ExtraBold.ttf",
    "PlusJakartaSans_700Bold": "700Bold/PlusJakartaSans_700Bold.ttf",
    "PlusJakartaSans_600SemiBold": "600SemiBold/PlusJakartaSans_600SemiBold.ttf",
    "PlusJakartaSans_500Medium": "500Medium/PlusJakartaSans_500Medium.ttf",
}
# ASCII, il Latin-1 e la punteggiatura che compare nei testi del diploma.
CARATTERI = [chr(c) for c in range(32, 127)] + [chr(c) for c in range(0xA0, 0x100)] + list("’‘“”–—…·•€")

fuori = {}
for nome, percorso in FAMIGLIE.items():
    f = TTFont(f"{BASE}/{percorso}")
    upm = f["head"].unitsPerEm
    cmap = f.getBestCmap()
    hmtx = f["hmtx"]
    larg = {}
    for ch in CARATTERI:
        g = cmap.get(ord(ch))
        if g is not None:
            larg[ch] = round(hmtx[g][0] * 1000 / upm)
    media = round(sum(larg[c] for c in "aeinorstlcdmpu" if c in larg) / len("aeinorstlcdmpu"))
    fuori[nome] = {"media": media, "larg": larg}

print("// GENERATO da scripts/larghezze-font-diploma.py: non si modifica a mano.")
print("// Le larghezze dei caratteri di Plus Jakarta Sans (1000 = un em), per misurare il testo del diplomino sull'app nativa.")
print("export const LARGHEZZE_FONT: Record<string, { media: number; larg: Record<string, number> }> = " + json.dumps(fuori, ensure_ascii=False, separators=(",", ":")) + ";")
