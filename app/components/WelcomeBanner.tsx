import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

import { styles } from "../(tabs)/styles/styles";

const KEY = "torquelab-welcome-v1";

export default function WelcomeBanner() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    let ativo = true;
    AsyncStorage.getItem(KEY).then((v) => {
      if (ativo && v !== "1") setVisivel(true);
    });
    return () => {
      ativo = false;
    };
  }, []);

  async function fechar() {
    setVisivel(false);
    try {
      await AsyncStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
  }

  if (!visivel) return null;

  return (
    <View style={styles.card}>
      <View style={styles.sectionKicker}>
        <Text style={styles.sectionKickerText}>BEM-VINDO</Text>
      </View>
      <Text style={styles.tituloSecao}>Como usar o Torque Lab</Text>
      <Text style={styles.descricaoSecao}>
        Em 3 passos você obtém uma estimativa educacional do veículo.
      </Text>
      <View style={styles.dicaBox}>
        <Text style={styles.dicaTitulo}>ROTEIRO</Text>
        <Text style={styles.dicaTexto}>
          1. Escolha marca, modelo e ano (valor FIPE).{"\n"}
          2. Informe a condição do carro — ou use um exemplo pronto.{"\n"}
          3. Analise, veja a nota e, se quiser, salve ou copie o relatório.
        </Text>
      </View>
      <TouchableOpacity
        style={styles.botaoSecundario}
        onPress={fechar}
        accessibilityRole="button"
      >
        <Text style={styles.botaoSecundarioTexto}>Entendi, começar</Text>
      </TouchableOpacity>
    </View>
  );
}
