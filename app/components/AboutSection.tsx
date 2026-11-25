import React from "react";
import { Platform, Text, View } from "react-native";

import { styles } from "../(tabs)/styles/styles";

export default function AboutSection() {
  return (
    <View
      nativeID="about-section"
      style={styles.card}
      {...(Platform.OS === "web" ? ({ "data-torque-card": "1" } as object) : {})}
    >
      <View style={styles.sectionKicker}>
        <Text style={styles.sectionKickerText}>04 / TORQUELAB</Text>
      </View>

      <Text style={styles.tituloSecao}>Sobre o projeto</Text>

      <Text style={styles.descricaoSecao}>
        Simulador veicular educacional: consulte o valor de mercado (FIPE),
        informe como o carro está hoje e receba uma estimativa de consumo,
        condição e pontos de atenção — em poucos passos.
      </Text>

      <View
        {...(Platform.OS === "web"
          ? ({ "data-torque-grid-2": "1" } as object)
          : {})}
      >
        <View style={[styles.dicaBox, { marginBottom: 0 }]}>
          <Text style={styles.dicaTitulo}>PASSO A PASSO</Text>
          <Text style={styles.dicaTexto}>
            1. Escolha o veículo (marca → modelo → ano).{"\n"}
            2. Preencha os dados ou use um exemplo pronto.{"\n"}
            3. Toque em “Analisar veículo”.{"\n"}
            4. Confira nota, alertas, viagem e salve se quiser.
          </Text>
        </View>

        <View style={[styles.dicaBox, { marginBottom: 0 }]}>
          <Text style={styles.dicaTitulo}>COMO A NOTA É CALCULADA</Text>
          <Text style={styles.dicaTexto}>
            A nota começa em 100. Quilometragem alta, peso elevado, calibragem
            fora da faixa, pneus desgastados e revisão atrasada reduzem pontos.
            O consumo estimado considera combustível FIPE, peso, pneus e uso.
          </Text>
        </View>

        <View style={[styles.dicaBox, { marginBottom: 0 }]}>
          <Text style={styles.dicaTitulo}>TECNOLOGIAS</Text>
          <Text style={styles.dicaTexto}>
            Expo · React Native Web · TypeScript · API FIPE (Parallelum) ·
            AsyncStorage · GitHub Pages
          </Text>
        </View>

        <View style={[styles.dicaBox, { marginBottom: 0 }]}>
          <Text style={styles.dicaTitulo}>IMPORTANTE</Text>
          <Text style={styles.dicaTexto}>
            O valor FIPE vem de base externa. Consumo, saúde, desempenho e nota
            são estimativas educacionais do Torque Lab e não substituem
            avaliação mecânica profissional.
          </Text>
        </View>
      </View>
    </View>
  );
}
