import React, { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { calcularViagem } from "../(tabs)/utils/trip";
import { styles } from "../(tabs)/styles/styles";

type Props = { consumo: number };

function numero(valor: string) {
  return Number(valor.replace(",", "."));
}

export default function TripCalculator({ consumo }: Props) {
  const [distancia, setDistancia] = useState("");
  const [preco, setPreco] = useState("");
  const estimativa = calcularViagem(numero(distancia), numero(preco), consumo);
  const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <View style={styles.card}>
      <View style={styles.sectionKicker}><Text style={styles.sectionKickerText}>PLANEJE O TRAJETO</Text></View>
      <Text style={styles.tituloSecao}>Quanto custaria a viagem?</Text>
      <Text style={styles.descricaoSecao}>
        Use o consumo estimado de {consumo} km/L. O custo depende do preço que você informar.
      </Text>
      <Text style={styles.label}>Distância total (km)</Text>
      <TextInput
        style={styles.input}
        value={distancia}
        onChangeText={setDistancia}
        keyboardType="decimal-pad"
        placeholder="Ex.: 250"
        placeholderTextColor="#9d858b"
        maxLength={8}
      />
      <Text style={styles.label}>Preço do combustível por litro (R$)</Text>
      <TextInput
        style={styles.input}
        value={preco}
        onChangeText={setPreco}
        keyboardType="decimal-pad"
        placeholder="Ex.: 5,80"
        placeholderTextColor="#9d858b"
        maxLength={8}
      />
      {estimativa ? (
        <View style={styles.simulacaoBox}>
          <Text style={styles.simulacaoLabel}>CUSTO ESTIMADO</Text>
          <Text style={styles.simulacaoValor}>{moeda.format(estimativa.custo)}</Text>
          <Text style={styles.simulacaoDetalhe}>
            Aproximadamente {estimativa.litros.toFixed(1).replace(".", ",")} litros para o trajeto.
          </Text>
        </View>
      ) : (
        <Text style={styles.textoAjuda}>Preencha os dois campos com valores maiores que zero para ver o cálculo.</Text>
      )}
      <Text style={styles.textoAjuda}>Consumo e custo são estimativas. O consumo real varia conforme veículo, trajeto e condução.</Text>
    </View>
  );
}
