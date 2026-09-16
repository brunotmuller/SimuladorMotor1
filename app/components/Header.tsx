import React from "react";
import { Text, View } from "react-native";

import { styles } from "../(tabs)/styles/styles";

type Props = {
  online: boolean;
  carregando: boolean;
};

export default function Header({
  online,
  carregando,
}: Props) {
  return (
    <>
      <View style={styles.topo}>
        <Text style={styles.logo}>
          Torque
          <Text style={styles.logoVermelho}>
            Lab
          </Text>
        </Text>

        <View style={styles.status}>
          <View
            style={[
              styles.statusBolinha,
              !online && styles.statusOffline,
            ]}
          />

          <Text style={styles.statusTexto}>
            {online
              ? "FIPE online"
              : carregando
                ? "Conectando..."
                : "FIPE offline"}
          </Text>
        </View>
      </View>

      <Text style={styles.titulo}>
        Análise veicular{"\n"}simples.
      </Text>

      <Text style={styles.subtitulo}>
        Escolha seu veículo e informe os dados
        atuais para gerar uma análise estimada.
      </Text>
    </>
  );
}