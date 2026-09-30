import React from "react";
import { Image, Text, View } from "react-native";

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
        <Image
          source={require("../../assets/images/torquelab-logo.png")}
          style={styles.logoImagem}
          resizeMode="contain"
          accessibilityLabel="TorqueLab"
        />

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

      <View style={styles.hero}>
        <View style={styles.heroGlow} />
        <View style={styles.heroLinha}>
          <View style={styles.heroLinhaVermelha} />
          <Text style={styles.heroEyebrow}>SIMULADOR VEICULAR / ANÁLISE</Text>
        </View>
        <Text style={styles.titulo}>
          Informação completa para você conhecer cada detalhe do veículo
        </Text>
        <Text style={styles.subtitulo}>
          Consulte o valor FIPE e veja uma estimativa de consumo, condição e desempenho em poucos passos.
        </Text>
        <View style={styles.heroDivisor} />
        <View style={styles.heroTags}>
          <Text style={styles.heroTag}>01  ESCOLHA O CARRO</Text>
          <Text style={styles.heroTag}>02  CONTE COMO ELE ESTÁ</Text>
          <Text style={styles.heroTag}>03  VEJA O RESULTADO</Text>
        </View>
      </View>
    </>
  );
}
