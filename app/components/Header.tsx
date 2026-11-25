import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  ImageBackground,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { styles } from "../(tabs)/styles/styles";

type Props = { online: boolean; carregando: boolean };
const webAttr = (attrs: Record<string, string>) =>
  Platform.OS === "web" ? (attrs as object) : {};

export default function Header({ online, carregando }: Props) {
  const entrada = useRef(new Animated.Value(0)).current;
  const statusLabel = online
    ? "FIPE CONECTADA"
    : carregando
      ? "CONECTANDO À FIPE"
      : "FIPE INDISPONÍVEL";

  useEffect(() => {
    Animated.timing(entrada, {
      toValue: 1,
      duration: 550,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entrada]);

  function irPara(selector: string) {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    document
      .querySelector(selector)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const links = [
    { label: "Simulador", selector: "#simulator-section" },
    { label: "Garagem", selector: "#garage-section" },
    { label: "Manutenção", selector: "#maintenance-section" },
  ];

  return (
    <Animated.View
      style={{
        opacity: entrada,
        transform: [
          {
            translateY: entrada.interpolate({
              inputRange: [0, 1],
              outputRange: [14, 0],
            }),
          },
        ],
      }}
      {...webAttr({ "data-torque-enter": "1" })}
    >
      <View style={styles.topo} {...webAttr({ "data-torque-topbar": "1" })}>
        <Image
          source={require("../../assets/images/torquelab-logo.png")}
          style={styles.logoImagem}
          resizeMode="contain"
          accessibilityLabel="TorqueLab"
        />

        <View
          style={{
            flex: 1,
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 8,
            paddingHorizontal: 12,
          }}
          {...webAttr({ "data-torque-topbar-nav": "1" })}
        >
          {links.map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => irPara(item.selector)}
              activeOpacity={0.8}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 99,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.10)",
                backgroundColor: "rgba(255,255,255,0.03)",
              }}
              accessibilityRole="button"
              {...webAttr({ "data-torque-nav-pill": "1" })}
            >
              <Text style={{ color: "#e8dde0", fontSize: 12, fontWeight: "700" }}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View
          style={styles.status}
          accessibilityLabel={statusLabel}
          {...webAttr({ "data-torque-status-dot": online ? "on" : "off" })}
        >
          <View style={[styles.statusBolinha, !online && styles.statusOffline]} />
          <Text style={styles.statusTexto}>{statusLabel}</Text>
        </View>
      </View>

      <View
        style={styles.hero}
        {...webAttr({ "data-torque-hero": "1", "data-torque-card": "1" })}
      >
        <ImageBackground
          source={{
            uri: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1800&q=85",
          }}
          resizeMode="cover"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            opacity: 0.34,
          }}
          imageStyle={{ opacity: 0.9 }}
          accessibilityLabel="Fotografia automotiva de um carro esportivo"
        />
        <View
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: "rgba(9,8,12,0.74)",
          }}
        />

        <View style={{ position: "relative", zIndex: 1 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 16,
            }}
          >
            <View
              style={{
                width: 24,
                height: 3,
                borderRadius: 3,
                backgroundColor: "#ef4058",
              }}
            />
            <Text style={styles.heroEyebrow}>INTELIGÊNCIA AUTOMOTIVA</Text>
            <Text style={{ color: "#a99ba1", fontSize: 10, letterSpacing: 1 }}>
              • TORQUELAB
            </Text>
          </View>

          <View
            style={{ flexDirection: "row", alignItems: "center", gap: 28 }}
            {...webAttr({ "data-torque-hero-grid": "1" })}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.titulo} {...webAttr({ "data-torque-title": "1" })}>
                Conheça seu carro.{"\n"}Entenda cada detalhe.
              </Text>
              <Text style={styles.subtitulo}>
                Consulte a Tabela FIPE, simule consumo e estado geral do veículo e
                tome decisões com mais clareza.
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 10,
                  marginTop: 4,
                }}
                {...webAttr({ "data-torque-hero-actions": "1" })}
              >
                <TouchableOpacity
                  onPress={() => irPara("#simulator-section")}
                  activeOpacity={0.85}
                  style={{
                    backgroundColor: "#e43b55",
                    borderRadius: 12,
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                  }}
                  accessibilityRole="button"
                  {...webAttr({ "data-torque-cta": "1" })}
                >
                  <Text style={{ color: "#fff", fontSize: 13, fontWeight: "800" }}>
                    Começar análise ↓
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View
              style={{
                width: 310,
                padding: 18,
                borderRadius: 18,
                backgroundColor: "rgba(11,10,15,0.82)",
                borderWidth: 1,
                borderColor: "rgba(220,112,132,0.34)",
              }}
              {...webAttr({ "data-torque-hero-panel": "1" })}
            >
              <Text
                style={{
                  color: "#f3e9ec",
                  fontSize: 10,
                  fontWeight: "900",
                  letterSpacing: 1.4,
                  marginBottom: 10,
                }}
              >
                COMO FUNCIONA
              </Text>
              {[
                ["01", "Escolha seu veículo", "Marca, modelo, ano e referência FIPE"],
                ["02", "Informe as condições", "Quilometragem, uso, pneus e revisão"],
                ["03", "Receba o diagnóstico", "Nota, consumo, alertas e custo de viagem"],
              ].map(([number, title, description]) => (
                <View
                  key={number}
                  style={{
                    flexDirection: "row",
                    gap: 11,
                    paddingVertical: 10,
                    borderTopWidth: 1,
                    borderTopColor: "rgba(255,255,255,0.08)",
                  }}
                >
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#6e2234",
                      borderWidth: 1,
                      borderColor: "#c4475d",
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: 10, fontWeight: "900" }}>
                      {number}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: "800",
                        marginBottom: 2,
                      }}
                    >
                      {title}
                    </Text>
                    <Text style={{ color: "#bfb1b6", fontSize: 11, lineHeight: 15 }}>
                      {description}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}
