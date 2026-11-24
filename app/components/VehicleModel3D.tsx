import React from "react";
import { Text, View } from "react-native";

export default function VehicleModel3D() {
  return (
    <View style={{ flex: 1, minHeight: 250, alignItems: "center", justifyContent: "center", padding: 22, backgroundColor: "#171116" }}>
      <Text style={{ color: "#ff7180", fontSize: 14, fontWeight: "800", marginBottom: 8 }}>VISUALIZAÇÃO 3D</Text>
      <Text style={{ color: "#d7c9cc", fontSize: 12, textAlign: "center", lineHeight: 19 }}>
        O visualizador 3D interativo está disponível na versão web do TorqueLab.
      </Text>
    </View>
  );
}
