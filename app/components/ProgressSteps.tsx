import React from "react";
import { Text, View } from "react-native";

import { styles } from "../(tabs)/styles/styles";

type Props = {
  passo: 1 | 2 | 3;
};

const PASSOS = [
  { n: 1, label: "Veículo" },
  { n: 2, label: "Condição" },
  { n: 3, label: "Resultado" },
] as const;

export default function ProgressSteps({ passo }: Props) {
  return (
    <View style={progressStyles.wrap}>
      {PASSOS.map((item, index) => {
        const ativo = passo === item.n;
        const feito = passo > item.n;
        return (
          <React.Fragment key={item.n}>
            {index > 0 && (
              <View
                style={[
                  progressStyles.linha,
                  (feito || ativo) && progressStyles.linhaAtiva,
                ]}
              />
            )}
            <View style={progressStyles.item}>
              <View
                style={[
                  progressStyles.bolinha,
                  (ativo || feito) && progressStyles.bolinhaAtiva,
                ]}
              >
                <Text
                  style={[
                    progressStyles.numero,
                    (ativo || feito) && progressStyles.numeroAtivo,
                  ]}
                >
                  {feito ? "✓" : item.n}
                </Text>
              </View>
              <Text
                style={[
                  progressStyles.label,
                  ativo && progressStyles.labelAtivo,
                ]}
              >
                {item.label}
              </Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const progressStyles = {
  wrap: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginTop: 22,
    marginBottom: 34,
    paddingVertical: 17,
    paddingHorizontal: 18,
    backgroundColor: "#111014",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#30252d",
  },
  item: {
    alignItems: "center" as const,
    minWidth: 64,
  },
  bolinha: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1a1517",
    borderWidth: 1,
    borderColor: "#5a3038",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 6,
  },
  bolinhaAtiva: {
    backgroundColor: "#c52f4b",
    borderColor: "#ed6178",
  },
  numero: {
    color: "#9d858b",
    fontSize: 12,
    fontWeight: "800" as const,
  },
  numeroAtivo: {
    color: "#fff",
  },
  label: {
    color: "#9d858b",
    fontSize: 11,
    fontWeight: "600" as const,
  },
  labelAtivo: {
    color: "#ff7180",
  },
  linha: {
    flex: 1,
    height: 2,
    backgroundColor: "#3a282c",
    marginBottom: 18,
    maxWidth: 40,
  },
  linhaAtiva: {
    backgroundColor: "#ef3340",
  },
};
