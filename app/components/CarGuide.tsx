import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { styles } from "../(tabs)/styles/styles";
import {
  CondicaoPneu,
  TipoPneu,
  TipoUso,
} from "../(tabs)/types/vehicle";

export type ExemploVeiculo = {
  km: string;
  peso: string;
  calibragem: string;
  mesesUltimaRevisao: string;
  tipoPneu: TipoPneu;
  tipoUso: TipoUso;
  condicaoPneu: CondicaoPneu;
  titulo: string;
  descricao: string;
};

export const EXEMPLO_PADRAO: ExemploVeiculo = {
  km: "65000",
  peso: "1280",
  calibragem: "32",
  mesesUltimaRevisao: "6",
  tipoPneu: "Convencional",
  tipoUso: "Misto",
  condicaoPneu: "Bom",
  titulo: "Hatch popular (exemplo)",
  descricao:
    "Valores típicos de um carro de passeio. Use como base se não souber os dados exatos.",
};

const PONTOS = [
  {
    id: "km",
    label: "Odômetro",
    valor: "~ 65.000 km",
    dica: "Quilometragem no painel. Carros usados costumam ter entre 30 mil e 120 mil km.",
    top: 18,
    left: 58,
  },
  {
    id: "peso",
    label: "Peso",
    valor: "~ 1.280 kg",
    dica: "Peso aproximado do veículo. Hatch ~1.100–1.400 kg · SUV ~1.500–2.200 kg.",
    top: 42,
    left: 22,
  },
  {
    id: "psi",
    label: "Calibragem",
    valor: "30–35 PSI",
    dica: "Pressão dos pneus. Veja a etiqueta na porta do motorista ou no manual.",
    top: 68,
    left: 18,
  },
  {
    id: "rev",
    label: "Revisão",
    valor: "a cada 6–12 meses",
    dica: "Informe quantos meses se passaram desde a última revisão.",
    top: 38,
    left: 72,
  },
] as const;

type Props = {
  onUsarExemplo: (exemplo: ExemploVeiculo) => void;
};

export default function CarGuide({ onUsarExemplo }: Props) {
  const [ativo, setAtivo] = useState<string | null>("peso");
  const girar = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(girar, {
          toValue: 1,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(girar, {
          toValue: 0,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [girar]);

  const rotateY = girar.interpolate({
    inputRange: [0, 1],
    outputRange: ["-8deg", "8deg"],
  });

  const pontoAtivo = PONTOS.find((p) => p.id === ativo) ?? PONTOS[1];

  return (
    <View
      style={styles.card}
      {...(Platform.OS === "web"
        ? ({ "data-torque-card": "1" } as object)
        : {})}
    >
      <View style={styles.sectionKicker}>
        <Text style={styles.sectionKickerText}>GUIA RÁPIDO</Text>
      </View>

      <Text style={styles.tituloSecao}>Não sabe os dados?</Text>
      <Text style={styles.descricaoSecao}>
        Toque nos pontos do carro para ver exemplos. Depois use o botão para
        preencher o formulário com valores típicos.
      </Text>

      {/* Palco 3D simplificado */}
      <View style={guideStyles.stage}>
        <View style={guideStyles.chao} />

        <Animated.View
          style={[
            guideStyles.carroWrap,
            {
              transform: [{ perspective: 800 }, { rotateY }],
            },
          ]}
        >
          {/* Corpo do carro (visão 3/4 estilizada) */}
          <View style={guideStyles.corpo}>
            <View style={guideStyles.teto} />
            <View style={guideStyles.janela} />
            <View style={guideStyles.capo} />
            <View style={guideStyles.paraChoque} />
            <View style={[guideStyles.roda, guideStyles.rodaTras]} />
            <View style={[guideStyles.roda, guideStyles.rodaFrente]} />
            <View style={guideStyles.farol} />
            <View style={guideStyles.macaneta} />
          </View>

          {PONTOS.map((ponto) => (
            <TouchableOpacity
              key={ponto.id}
              activeOpacity={0.85}
              onPress={() => setAtivo(ponto.id)}
              style={[
                guideStyles.hotspot,
                {
                  top: `${ponto.top}%` as `${number}%`,
                  left: `${ponto.left}%` as `${number}%`,
                },
                ativo === ponto.id && guideStyles.hotspotAtivo,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${ponto.label}: ${ponto.valor}`}
            >
              <View style={guideStyles.hotspotBolinha} />
              <Text style={guideStyles.hotspotTexto}>{ponto.label}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      </View>

      <View style={styles.dicaBox}>
        <Text style={styles.dicaTitulo}>{pontoAtivo.label.toUpperCase()}</Text>
        <Text style={[styles.dicaTexto, { fontWeight: "700", color: "#fff" }]}>
          {pontoAtivo.valor}
        </Text>
        <Text style={[styles.dicaTexto, { marginTop: 6 }]}>{pontoAtivo.dica}</Text>
      </View>

      <View style={guideStyles.resumo}>
        <Text style={guideStyles.resumoTitulo}>{EXEMPLO_PADRAO.titulo}</Text>
        <Text style={styles.textoAjuda}>{EXEMPLO_PADRAO.descricao}</Text>
        <Text style={guideStyles.resumoLinha}>
          {EXEMPLO_PADRAO.km} km · {EXEMPLO_PADRAO.peso} kg · {" "}
          {EXEMPLO_PADRAO.calibragem} PSI · revisão há {EXEMPLO_PADRAO.mesesUltimaRevisao} meses
        </Text>
        <Text style={guideStyles.resumoLinha}>
          Pneu {EXEMPLO_PADRAO.tipoPneu} · {EXEMPLO_PADRAO.condicaoPneu} · uso{" "}
          {EXEMPLO_PADRAO.tipoUso}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.botaoSecundario}
        activeOpacity={0.85}
        onPress={() => onUsarExemplo(EXEMPLO_PADRAO)}
        accessibilityRole="button"
        {...(Platform.OS === "web"
          ? ({ "data-torque-magnetic": "1", "data-torque-btn": "1" } as object)
          : {})}
      >
        <Text style={styles.botaoSecundarioTexto}>
          Preencher formulário com este exemplo
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const guideStyles = {
  stage: {
    height: 200,
    marginBottom: 16,
    marginTop: 4,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    backgroundColor: "#0c0b0d",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#3c292e",
    overflow: "hidden" as const,
  },
  chao: {
    position: "absolute" as const,
    bottom: 28,
    width: "70%" as const,
    height: 10,
    borderRadius: 99,
    backgroundColor: "rgba(239,51,64,0.12)",
    alignSelf: "center" as const,
  },
  carroWrap: {
    width: 260,
    height: 140,
    position: "relative" as const,
  },
  corpo: {
    position: "absolute" as const,
    left: 30,
    top: 40,
    width: 200,
    height: 52,
    backgroundColor: "#c6283a",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ff6b7c",
  },
  teto: {
    position: "absolute" as const,
    left: 48,
    top: -28,
    width: 110,
    height: 34,
    backgroundColor: "#9b1c2c",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: "#e04558",
  },
  janela: {
    position: "absolute" as const,
    left: 56,
    top: -22,
    width: 94,
    height: 22,
    backgroundColor: "#1a3048",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 14,
    opacity: 0.9,
  },
  capo: {
    position: "absolute" as const,
    right: 8,
    top: 8,
    width: 40,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 2,
  },
  paraChoque: {
    position: "absolute" as const,
    right: -4,
    bottom: 6,
    width: 12,
    height: 20,
    backgroundColor: "#7a1522",
    borderRadius: 4,
  },
  roda: {
    position: "absolute" as const,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1a1a1a",
    borderWidth: 3,
    borderColor: "#555",
    bottom: -16,
  },
  rodaTras: { left: 28 },
  rodaFrente: { right: 24 },
  farol: {
    position: "absolute" as const,
    right: 4,
    top: 14,
    width: 12,
    height: 10,
    borderRadius: 3,
    backgroundColor: "#ffe082",
  },
  macaneta: {
    position: "absolute" as const,
    left: 88,
    top: 22,
    width: 14,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  hotspot: {
    position: "absolute" as const,
    transform: [{ translateX: -8 }, { translateY: -8 }],
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "rgba(20,16,18,0.92)",
    borderWidth: 1,
    borderColor: "#6a303a",
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 5,
  },
  hotspotAtivo: {
    borderColor: "#ef3340",
    backgroundColor: "#2a1518",
  },
  hotspotBolinha: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#ef3340",
    marginRight: 5,
  },
  hotspotTexto: {
    color: "#f0dce0",
    fontSize: 10,
    fontWeight: "700" as const,
  },
  resumo: {
    marginBottom: 12,
  },
  resumoTitulo: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700" as const,
    marginBottom: 4,
  },
  resumoLinha: {
    color: "#d2bdc1",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
};
