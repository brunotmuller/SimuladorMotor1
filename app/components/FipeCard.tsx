import React from "react";
import { Text, View } from "react-native";

import { styles } from "../(tabs)/styles/styles";
import { DadosFipe } from "../(tabs)/types/vehicle";

type Props = {
  dados: DadosFipe;
};

export default function FipeCard({ dados }: Props) {
  return (
    <View style={styles.fipe}>
      <Text style={styles.fipeLabel}>
        VALOR DE REFERÊNCIA
      </Text>

      <Text style={styles.fipePreco}>
        {dados.price}
      </Text>

      <Text style={styles.fipeNome}>
        {dados.brand} {dados.model}
      </Text>

      <View style={styles.fipeLinha}>
        <Text style={styles.fipeDetalhe}>
          {dados.modelYear}
        </Text>

        <Text style={styles.ponto}>•</Text>

        <Text style={styles.fipeDetalhe}>
          {dados.fuel}
        </Text>
      </View>

      <Text style={styles.codigoFipe}>
        Código FIPE: {dados.codeFipe}
      </Text>

      {dados.referenceMonth && (
        <Text style={styles.referenciaFipe}>
          Referência: {dados.referenceMonth}
        </Text>
      )}
    </View>
  );
}