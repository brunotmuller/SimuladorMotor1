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
  id: string;
  badge: string;
  marca: string;
  modelo: string;
  ano: number;
  combustivel: string;
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

export const EXEMPLOS: ExemploVeiculo[] = [
  {
    id: "comum",
    badge: "Equilibrado",
    marca: "Toyota",
    modelo: "Corolla XEi 2.0 Flex",
    ano: 2020,
    combustivel: "Flex",
    km: "65000",
    peso: "1280",
    calibragem: "32",
    mesesUltimaRevisao: "6",
    tipoPneu: "Comum",
    tipoUso: "Misto",
    condicaoPneu: "Bom",
    titulo: "Carro comum",
    descricao: "Sedã de passeio do dia a dia, com revisão em dia.",
  },
  {
    id: "suv",
    badge: "SUV Urbano",
    marca: "Jeep",
    modelo: "Compass T270 1.3 Turbo",
    ano: 2023,
    combustivel: "Flex",
    km: "48000",
    peso: "1850",
    calibragem: "34",
    mesesUltimaRevisao: "4",
    tipoPneu: "Comum",
    tipoUso: "Cidade",
    condicaoPneu: "Bom",
    titulo: "SUV / carro maior",
    descricao: "Mais pesado; no trânsito urbano o consumo tende a subir.",
  },
  {
    id: "usado",
    badge: "Atenção",
    marca: "Volkswagen",
    modelo: "Gol 1.6 MSI",
    ano: 2018,
    combustivel: "Flex",
    km: "145000",
    peso: "1320",
    calibragem: "28",
    mesesUltimaRevisao: "18",
    tipoPneu: "Comum",
    tipoUso: "Cidade",
    condicaoPneu: "Desgastado",
    titulo: "Carro bem usado",
    descricao: "Alta quilometragem, revisão atrasada e pneus gastos.",
  },
];

export const EXEMPLO_PADRAO = EXEMPLOS[0];

const PONTOS = [
  {
    id: "km",
    label: "Odômetro",
    valor: "30–120 mil km",
    dica: "Quilometragem no painel. Carros usados costumam ter entre 30 mil e 120 mil km.",
    top: 12,
    left: 52,
  },
  {
    id: "peso",
    label: "Peso",
    valor: "1.100–2.200 kg",
    dica: "Carro pequeno ~1.100–1.400 kg · SUV ~1.500–2.200 kg.",
    top: 36,
    left: 8,
  },
  {
    id: "psi",
    label: "Calibragem",
    valor: "30–35 PSI",
    dica: "Pressão dos pneus. Veja a etiqueta na porta do motorista ou no manual.",
    top: 78,
    left: 22,
  },
  {
    id: "rev",
    label: "Revisão",
    valor: "a cada 6–12 meses",
    dica: "Informe quantos meses se passaram desde a última revisão.",
    top: 28,
    left: 78,
  },
] as const;

type Props = {
  onUsarExemplo: (exemplo: ExemploVeiculo) => void;
};

function Roda({ style }: { style: object }) {
  return (
    <View style={[c.roda, style]}>
      <View style={c.rodaAro} />
      <View style={c.rodaMiolo} />
      <View style={c.rodaRaio1} />
      <View style={c.rodaRaio2} />
    </View>
  );
}

export default function CarGuide({ onUsarExemplo }: Props) {
  const [ativo, setAtivo] = useState<string | null>("peso");
  const [exemploId, setExemploId] = useState("comum");
  const girar = useRef(new Animated.Value(0)).current;
  const brilho = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loopGiro = Animated.loop(
      Animated.sequence([
        Animated.timing(girar, {
          toValue: 1,
          duration: 3800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(girar, {
          toValue: 0,
          duration: 3800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    const loopBrilho = Animated.loop(
      Animated.sequence([
        Animated.timing(brilho, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(brilho, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loopGiro.start();
    loopBrilho.start();
    return () => {
      loopGiro.stop();
      loopBrilho.stop();
    };
  }, [girar, brilho]);

  const rotateY = girar.interpolate({
    inputRange: [0, 1],
    outputRange: ["-10deg", "10deg"],
  });

  const farolOpacidade = brilho.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 1],
  });

  const pontoAtivo = PONTOS.find((p) => p.id === ativo) ?? PONTOS[1];
  const exemplo = EXEMPLOS.find((e) => e.id === exemploId) ?? EXEMPLO_PADRAO;

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
        Toque nos pontos do carro e escolha um perfil de exemplo para preencher
        o formulário.
      </Text>

      <View style={c.stage}>
        <View style={c.stageGlow} />
        <View style={c.chao} />
        <View style={c.chaoReflexo} />

        <Animated.View
          style={[
            c.carroWrap,
            { transform: [{ perspective: 900 }, { rotateY }] },
          ]}
        >
          <View style={c.sombraCarro} />
          <View style={c.saia} />
          <View style={c.corpo}>
            <View style={c.corpoBrilho} />
            <View style={c.linhaCintura} />
          </View>
          <View style={c.capo}>
            <View style={c.capoLinha} />
          </View>
          <View style={c.traseira} />
          <View style={c.teto}>
            <View style={c.tetoBrilho} />
          </View>
          <View style={c.vidroFrente} />
          <View style={c.vidroTras} />
          <View style={c.pilar} />
          <Animated.View style={[c.farol, { opacity: farolOpacidade }]}>
            <View style={c.farolLente} />
          </Animated.View>
          <View style={c.lanterna} />
          <View style={c.macaneta} />
          <View style={c.grade} />
          <View style={c.paraChoqueF} />
          <View style={c.paraChoqueT} />
          <View style={c.retrovisor} />
          <Roda style={c.rodaTras} />
          <Roda style={c.rodaFrente} />

          {PONTOS.map((ponto) => (
            <TouchableOpacity
              key={ponto.id}
              activeOpacity={0.85}
              onPress={() => setAtivo(ponto.id)}
              style={[
                c.hotspot,
                {
                  top: `${ponto.top}%` as `${number}%`,
                  left: `${ponto.left}%` as `${number}%`,
                },
                ativo === ponto.id && c.hotspotAtivo,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${ponto.label}: ${ponto.valor}`}
            >
              <View
                style={[
                  c.hotspotBolinha,
                  ativo === ponto.id && c.hotspotBolinhaAtiva,
                ]}
              />
              <Text style={c.hotspotTexto}>{ponto.label}</Text>
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

      <Text style={styles.label}>Escolha um perfil de exemplo</Text>
      <View style={styles.opcoes}>
        {EXEMPLOS.map((item) => {
          const ativoEx = exemploId === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.opcao, ativoEx && styles.opcaoAtiva]}
              onPress={() => setExemploId(item.id)}
            >
              <Text
                style={[styles.opcaoTexto, ativoEx && styles.opcaoTextoAtivo]}
              >
                {item.titulo}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={c.resumo}>
        <Text style={c.resumoTitulo}>{exemplo.titulo}</Text>
        <Text style={styles.textoAjuda}>{exemplo.descricao}</Text>
        <Text style={c.resumoLinha}>
          {exemplo.km} km · {exemplo.peso} kg · {exemplo.calibragem} PSI ·
          revisão há {exemplo.mesesUltimaRevisao} meses
        </Text>
        <Text style={c.resumoLinha}>
          Pneu {exemplo.tipoPneu} · {exemplo.condicaoPneu} · uso {exemplo.tipoUso}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.botaoSecundario}
        activeOpacity={0.85}
        onPress={() => onUsarExemplo(exemplo)}
        accessibilityRole="button"
      >
        <Text style={styles.botaoSecundarioTexto}>
          Preencher formulário com este exemplo
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const c = {
  stage: {
    height: 230,
    marginBottom: 16,
    marginTop: 4,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    backgroundColor: "#0a090b",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#3c292e",
    overflow: "hidden" as const,
  },
  stageGlow: {
    position: "absolute" as const,
    width: 280,
    height: 120,
    borderRadius: 140,
    backgroundColor: "rgba(200, 30, 50, 0.12)",
    top: 20,
  },
  chao: {
    position: "absolute" as const,
    bottom: 36,
    width: "72%" as const,
    height: 14,
    borderRadius: 99,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignSelf: "center" as const,
  },
  chaoReflexo: {
    position: "absolute" as const,
    bottom: 40,
    width: "55%" as const,
    height: 4,
    borderRadius: 99,
    backgroundColor: "rgba(239,51,64,0.18)",
    alignSelf: "center" as const,
  },
  carroWrap: {
    width: 300,
    height: 160,
    position: "relative" as const,
  },
  sombraCarro: {
    position: "absolute" as const,
    left: 48,
    bottom: 18,
    width: 210,
    height: 16,
    borderRadius: 99,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  saia: {
    position: "absolute" as const,
    left: 52,
    top: 98,
    width: 200,
    height: 10,
    backgroundColor: "#1a0a0c",
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  corpo: {
    position: "absolute" as const,
    left: 48,
    top: 58,
    width: 208,
    height: 46,
    backgroundColor: "#d42a3d",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ff7a8a",
    overflow: "hidden" as const,
  },
  corpoBrilho: {
    position: "absolute" as const,
    left: 0,
    top: 0,
    right: 0,
    height: 16,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  linhaCintura: {
    position: "absolute" as const,
    left: 12,
    right: 12,
    top: 22,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  capo: {
    position: "absolute" as const,
    left: 198,
    top: 62,
    width: 58,
    height: 38,
    backgroundColor: "#c42234",
    borderTopRightRadius: 18,
    borderBottomRightRadius: 12,
    borderWidth: 1,
    borderColor: "#f06070",
  },
  capoLinha: {
    position: "absolute" as const,
    left: 10,
    top: 12,
    width: 36,
    height: 2,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  traseira: {
    position: "absolute" as const,
    left: 42,
    top: 64,
    width: 22,
    height: 36,
    backgroundColor: "#a81c2c",
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 10,
    borderWidth: 1,
    borderColor: "#e04558",
  },
  teto: {
    position: "absolute" as const,
    left: 88,
    top: 28,
    width: 118,
    height: 36,
    backgroundColor: "#9e1a2a",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: "#e05062",
    overflow: "hidden" as const,
  },
  tetoBrilho: {
    position: "absolute" as const,
    left: 8,
    top: 4,
    width: 70,
    height: 10,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  vidroFrente: {
    position: "absolute" as const,
    left: 148,
    top: 34,
    width: 48,
    height: 26,
    backgroundColor: "#1e3a55",
    borderTopRightRadius: 16,
    borderBottomRightRadius: 4,
    opacity: 0.95,
    borderWidth: 1,
    borderColor: "#3a6080",
  },
  vidroTras: {
    position: "absolute" as const,
    left: 96,
    top: 34,
    width: 48,
    height: 26,
    backgroundColor: "#173048",
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 4,
    opacity: 0.95,
    borderWidth: 1,
    borderColor: "#355a78",
  },
  pilar: {
    position: "absolute" as const,
    left: 142,
    top: 34,
    width: 8,
    height: 28,
    backgroundColor: "#8a1524",
    borderRadius: 2,
  },
  farol: {
    position: "absolute" as const,
    left: 242,
    top: 72,
    width: 16,
    height: 14,
    borderRadius: 6,
    backgroundColor: "#ffe9a0",
    borderWidth: 1,
    borderColor: "#fff3c4",
  },
  farolLente: {
    position: "absolute" as const,
    right: 2,
    top: 3,
    width: 5,
    height: 8,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  lanterna: {
    position: "absolute" as const,
    left: 44,
    top: 74,
    width: 10,
    height: 12,
    borderRadius: 3,
    backgroundColor: "#ff4d5e",
    borderWidth: 1,
    borderColor: "#ff8a96",
  },
  macaneta: {
    position: "absolute" as const,
    left: 128,
    top: 78,
    width: 16,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  grade: {
    position: "absolute" as const,
    left: 248,
    top: 90,
    width: 10,
    height: 8,
    borderRadius: 2,
    backgroundColor: "#2a1518",
    borderWidth: 1,
    borderColor: "#5a3038",
  },
  paraChoqueF: {
    position: "absolute" as const,
    left: 248,
    top: 98,
    width: 14,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2a1216",
  },
  paraChoqueT: {
    position: "absolute" as const,
    left: 40,
    top: 98,
    width: 14,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2a1216",
  },
  retrovisor: {
    position: "absolute" as const,
    left: 188,
    top: 58,
    width: 12,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#b01e30",
    borderWidth: 1,
    borderColor: "#ff6b7c",
  },
  roda: {
    position: "absolute" as const,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#111",
    borderWidth: 3,
    borderColor: "#333",
    bottom: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  rodaAro: {
    position: "absolute" as const,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#888",
    backgroundColor: "#2a2a2a",
  },
  rodaMiolo: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#c0c0c0",
    zIndex: 2,
  },
  rodaRaio1: {
    position: "absolute" as const,
    width: 18,
    height: 2,
    backgroundColor: "#777",
    borderRadius: 1,
  },
  rodaRaio2: {
    position: "absolute" as const,
    width: 2,
    height: 18,
    backgroundColor: "#777",
    borderRadius: 1,
  },
  rodaTras: { left: 72 },
  rodaFrente: { left: 198 },
  hotspot: {
    position: "absolute" as const,
    transform: [{ translateX: -8 }, { translateY: -8 }],
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "rgba(14,12,14,0.94)",
    borderWidth: 1,
    borderColor: "#6a303a",
    borderRadius: 99,
    paddingHorizontal: 9,
    paddingVertical: 5,
    zIndex: 8,
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
  hotspotBolinhaAtiva: {
    backgroundColor: "#ff7180",
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
