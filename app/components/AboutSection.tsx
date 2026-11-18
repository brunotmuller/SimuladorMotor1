import React from "react";
import { Text, View } from "react-native";

import { styles } from "../(tabs)/styles/styles";

export default function AboutSection() {
  return (
    <View style={styles.card}>
      <View style={styles.sectionKicker}>
        <Text style={styles.sectionKickerText}>SOBRE / COMO FUNCIONA</Text>
      </View>

      <Text style={styles.tituloSecao}>Torque Lab</Text>

      <Text style={styles.descricaoSecao}>
        Simulador veicular educacional: consulte o valor de mercado (FIPE),
        informe como o carro está hoje e receba uma estimativa de consumo,
        condição e pontos de atenção — em poucos passos.
      </Text>

      <View style={styles.dicaBox}>
        <Text style={styles.dicaTitulo}>PASSO A PASSO</Text>
        <Text style={styles.dicaTexto}>
          1. Escolha o veículo (marca → modelo → ano).{"\n"}
          2. Preencha quilometragem, peso, calibragem, pneus, uso e revisão.{"\n"}
          3. Toque em “Analisar veículo” e confira nota, consumo e alertas.{"\n"}
          4. Use a calculadora de viagem e, se quiser, salve a análise neste dispositivo.
        </Text>
      </View>

      <View style={styles.dicaBox}>
        <Text style={styles.dicaTitulo}>IMPORTANTE</Text>
        <Text style={styles.dicaTexto}>
          O valor FIPE vem de base externa. Consumo, saúde, desempenho e nota
          são estimativas educacionais do Torque Lab e não substituem avaliação
          mecânica profissional nem laudo técnico.
        </Text>
      </View>
    </View>
  );
}
