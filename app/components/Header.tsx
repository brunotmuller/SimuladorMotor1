import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, ImageBackground, Platform, Text, TouchableOpacity, View } from "react-native";
import { styles } from "../(tabs)/styles/styles";

type Props = { online: boolean; carregando: boolean };
const webAttr = (attrs: Record<string, string>) => Platform.OS === "web" ? (attrs as object) : {};

export default function Header({ online, carregando }: Props) {
  const entrada = useRef(new Animated.Value(0)).current;
  const statusLabel = online ? "FIPE CONECTADA" : carregando ? "CONECTANDO À FIPE" : "FIPE INDISPONÍVEL";

  useEffect(() => {
    Animated.timing(entrada, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [entrada]);

  function irPara(selector: string) {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    document.querySelector(selector)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const links = [
    { label: "Análise", selector: "#vehicle-section" },
    { label: "Minha garagem", selector: "#garage-section" },
    { label: "Explorar", selector: "#explore-section" },
  ];

  return (
    <Animated.View style={{ opacity: entrada, transform: [{ translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }} {...webAttr({ "data-torque-enter": "1" })}>
      <View style={styles.topo} {...webAttr({ "data-torque-topbar": "1" })}>
        <Image source={require("../../assets/images/torquelab-logo.png")} style={styles.logoImagem} resizeMode="contain" accessibilityLabel="TorqueLab" />
        <View style={{ flex: 1 }} />
        <View style={styles.status} accessibilityLabel={statusLabel} {...webAttr({ "data-torque-status-dot": online ? "on" : "off" })}>
          <View style={[styles.statusBolinha, !online && styles.statusOffline]} />
          <Text style={styles.statusTexto}>{statusLabel}</Text>
        </View>
      </View>

      <View style={styles.hero} {...webAttr({ "data-torque-hero": "1", "data-torque-card": "1" })}>
        <ImageBackground
          source={{ uri: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1800&q=85" }}
          resizeMode="cover"
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, opacity: 0.42 }}
          imageStyle={{ opacity: 0.9 }}
          accessibilityLabel="Fotografia automotiva de um Porsche esportivo"
        />
        <View style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(9,8,11,0.70)" }} />
        <View style={{ position: "relative", zIndex: 1, flex: 1 }} {...webAttr({ "data-torque-hero-content": "1" })}>
          <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 22 }}>
            <View style={{ width: 25, height: 3, borderRadius: 3, backgroundColor: "#ef4058" }} />
            <Text style={styles.heroEyebrow} {...webAttr({ "data-torque-kinetic": "1" })}>INTELIGÊNCIA AUTOMOTIVA</Text>
            <Text style={{ color: "#b8a9ae", fontSize: 10, letterSpacing: 1, marginLeft: 6 }}>TORQUELAB / 2026</Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 30 }} {...webAttr({ "data-torque-hero-grid": "1" })}>
            <View style={{ flex: 1, minWidth: 0 }} {...webAttr({ "data-torque-hero-copy": "1" })}>
              <Text style={styles.titulo} {...webAttr({ "data-torque-title": "1" })}>Conheça seu carro.{"\n"}Entenda cada detalhe.</Text>
              <Text style={styles.subtitulo}>
                Consulte a referência FIPE, avalie as condições do veículo e descubra indicadores para tomar decisões com mais informação.
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 22 }} {...webAttr({ "data-torque-hero-actions": "1" })}>
                <TouchableOpacity onPress={() => irPara("#vehicle-section")} activeOpacity={0.85} style={{ backgroundColor: "#e43b55", borderRadius: 10, paddingHorizontal: 19, paddingVertical: 15 }} accessibilityRole="button">
                  <Text style={{ color: "#fff", fontSize: 12, fontWeight: "900" }}>COMEÇAR ANÁLISE ↗</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => irPara("#explore-section")} activeOpacity={0.85} style={{ backgroundColor: "rgba(10,9,12,0.65)", borderWidth: 1, borderColor: "#80616a", borderRadius: 10, paddingHorizontal: 19, paddingVertical: 15 }} accessibilityRole="button">
                  <Text style={{ color: "#fff", fontSize: 12, fontWeight: "800" }}>EXPLORAR CARROS</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 17, marginTop: 27 }}>
                {["CONSULTA FIPE", "ANÁLISE VEICULAR", "GARAGEM DIGITAL"].map((item) => <Text key={item} style={{ color: "#d0c3c7", fontSize: 9, fontWeight: "800", letterSpacing: 1 }}>✦ {item}</Text>)}
              </View>
            </View>

            <View style={{ width: 300, padding: 21, borderRadius: 17, backgroundColor: "rgba(9,8,11,0.78)", borderWidth: 1, borderColor: "rgba(220,112,132,.38)" }} {...webAttr({ "data-torque-hero-panel": "1" })}>
              <Text style={{ color: "#f3e9ec", fontSize: 10, fontWeight: "900", letterSpacing: 1.5, marginBottom: 15 }}>COMO FUNCIONA</Text>
              {[
                ["01", "Escolha seu veículo", "Marca, modelo, ano e referência FIPE"],
                ["02", "Informe os detalhes", "Uso, quilometragem, pneus e revisão"],
                ["03", "Receba sua análise", "Indicadores e pontos de atenção"],
              ].map(([number, title, description]) => (
                <View key={number} style={{ flexDirection: "row", gap: 12, paddingVertical: 13, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,.10)" }}>
                  <View style={{ width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#762638", borderWidth: 1, borderColor: "#c4475d" }}>
                    <Text style={{ color: "#fff", fontSize: 10, fontWeight: "900" }}>{number}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#fff", fontSize: 12, fontWeight: "800", marginBottom: 4 }}>{title}</Text>
                    <Text style={{ color: "#c0b2b7", fontSize: 10, lineHeight: 16 }}>{description}</Text>
                  </View>
                </View>
              ))}
              <Text style={{ color: "#d88a98", fontSize: 9, fontWeight: "800", letterSpacing: 1, marginTop: 8 }}>INFORMAÇÃO PARA CUIDAR MELHOR</Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 27, paddingTop: 17, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,.14)" }} {...webAttr({ "data-torque-nav": "1" })}>
            {links.map((item) => (
              <TouchableOpacity key={item.label} onPress={() => irPara(item.selector)} activeOpacity={0.8} style={{ paddingHorizontal: 13, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: "#66505a", backgroundColor: "rgba(255,255,255,.06)" }} accessibilityRole="button">
                <Text style={{ color: "#f1e7ea", fontSize: 11, fontWeight: "700" }}>{item.label} ↗</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}
