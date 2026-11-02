import { StyleSheet, Text, View } from "react-native";

import { spazio } from "@/theme";

import { Icona } from "../ui/Icona";
import { F, usePalette } from "../ui/tema";
import { Tocco } from "../ui/Tocco";

// Una spunta con la frase accanto, come nelle conferme di «Gestisci abbonamento» (`abbonamento/Gestisci.tsx`): la usano la disdetta Junior e la richiesta della telefonata al
// Direttore Tecnico («Confermo che posso essere richiamato a questo numero»).

export function Consenso({ spuntato, onCambia, testo, errore = false }: { spuntato: boolean; onCambia: () => void; testo: string; errore?: boolean }) {
  const p = usePalette();
  return (
    <Tocco onPress={onCambia} vibra="scelta" ruolo="checkbox" stato={{ checked: spuntato }} etichetta={testo} scala={0.99}>
      <View style={[stili.consenso, { backgroundColor: p.incavo }, errore && { borderWidth: 1.5, borderColor: p.errore }]}>
        <View style={[stili.casella, { borderColor: spuntato ? p.accento : errore ? p.errore : p.testoTerzo, backgroundColor: spuntato ? p.accento : "transparent" }]}>
          {spuntato ? <Icona nome="spunta" size={15} colore="#fff" /> : null}
        </View>
        <Text style={[stili.testo, { color: p.testo }]}>{testo}</Text>
      </View>
    </Tocco>
  );
}

const stili = StyleSheet.create({
  consenso: { flexDirection: "row", gap: spazio.tre, padding: spazio.tre, borderRadius: 14, alignItems: "flex-start", borderWidth: 1.5, borderColor: "transparent" },
  casella: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, alignItems: "center", justifyContent: "center", marginTop: 1 },
  testo: { flex: 1, fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
});
