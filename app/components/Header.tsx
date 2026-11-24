import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, Platform, Text, TouchableOpacity, View } from "react-native";
import { styles } from "../(tabs)/styles/styles";

type Props = { online: boolean; carregando: boolean };
const webAttr = (attrs: Record<string, string>) => Platform.OS === "web" ? (attrs as object) : {};

export default function Header({ online, carregando }: Props) {
  const entrada = useRef(new Animated.Value(0)).current;
  const statusLabel = online ? "FIPE CONECTADA" : carregando ? "CONECTANDO À FIPE" : "FIPE INDISPONÍVEL";

  useEffect(() => {
    Animated.timing(entrada, { toValue: 1, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
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
    <Animated.View style={{ opacity: entrada, transform: [{ translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}>
      <View style={styles.topo} {...webAttr({ "data-torque-topbar": "1" })}>
        <Image source={require("../../assets/images/torquelab-logo.png")} style={styles.logoImagem} resizeMode="contain" accessibilityLabel="TorqueLab" />
        <View style={{ flex: 1 }} />
        <View style={styles.status} accessibilityLabel={statusLabel} {...webAttr({ "data-torque-status-dot": online ? "on" : "off" })}>
          <View style={[styles.statusBolinha, !online && styles.statusOffline]} />
          <Text style={styles.statusTexto}>{statusLabel}</Text>
        </View>
      </View>

      <View style={styles.hero} {...webAttr({ "data-torque-hero": "1", "data-torque-card": "1" })}>
        <View style={styles.heroGlow} />
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
          <View style={{ width: 25, height: 3, borderRadius: 3, backgroundColor: "#ef4058" }} />
          <Text style={styles.heroEyebrow}>INTELIGÊNCIA AUTOMOTIVA</Text>
          <Text style={{ color: "#8f7d85", fontSize: 10, letterSpacing: 1, marginLeft: 6 }}>• TORQUELAB / 2026</Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 28 }} {...webAttr({ "data-torque-hero-grid": "1" })}>
          <View style={{ flex: 1, minWidth: 0 }} {...webAttr({ "data-torque-hero-copy": "1" })}>
            <Text style={styles.titulo}>Seu carro.{"\n"}Seus dados.{"\n"}Uma análise completa.</Text>
            <Text style={styles.subtitulo}>
              Consulte a referência FIPE, informe as condições do veículo e descubra indicadores para entender melhor o seu carro.
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 25 }}>
              <TouchableOpacity onPress={() => irPara("#vehicle-section")} activeOpacity={0.85} style={{ backgroundColor: "#e43b55", borderRadius: 10, paddingHorizontal: 18, paddingVertical: 14 }} accessibilityRole="button">
                <Text style={{ color: "#fff", fontSize: 12, fontWeight: "900" }}>COMEÇAR ANÁLISE  ↗</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => irPara("#explore-section")} activeOpacity={0.85} style={{ backgroundColor: "rgba(255,255,255,0.035)", borderWidth: 1, borderColor: "#49343d", borderRadius: 10, paddingHorizontal: 18, paddingVertical: 14 }} accessibilityRole="button">
                <Text style={{ color: "#e8dce0", fontSize: 12, fontWeight: "800" }}>EXPLORAR VEÍCULOS</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 18, marginTop: 30 }}>
              {["CONSULTA FIPE", "DIAGNÓSTICO", "GARAGEM DIGITAL"].map((item) => <Text key={item} style={{ color: "#a99aa0", fontSize: 9, fontWeight: "800", letterSpacing: 1.1 }}>✦  {item}</Text>)}
            </View>
          </View>

          <View style={{ width: 340, padding: 22, borderRadius: 18, backgroundColor: "rgba(8,8,11,0.62)", borderWidth: 1, borderColor: "rgba(135,66,82,.38)" }} {...webAttr({ "data-torque-hero-panel": "1" })}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <Text style={{ color: "#f3e9ec", fontSize: 11, fontWeight: "900", letterSpacing: 1.2 }}>CENTRAL DE ANÁLISE</Text>
              <Text style={{ color: "#ef687b", fontSize: 10, fontWeight: "800" }}>01 — 03</Text>
            </View>
            {[
              ["01", "Identifique o veículo", "Marca, modelo, ano e valor FIPE"],
              ["02", "Informe as condições", "Quilometragem, pneus e revisão"],
              ["03", "Veja seu diagnóstico", "Nota, estimativas e pontos de atenção"],
            ].map(([number, title, description], index) => (
              <View key={number} style={{ flexDirection: "row", gap: 13, paddingVertical: 15, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,.08)" }}>
                <View style={{ width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: index === 0 ? "#762638" : "#21171c", borderWidth: 1, borderColor: index === 0 ? "#c4475d" : "#49313a" }}>
                  <Text style={{ color: "#fff", fontSize: 11, fontWeight: "900" }}>{number}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#f7eff1", fontSize: 13, fontWeight: "800", marginBottom: 4 }}>{title}</Text>
                  <Text style={{ color: "#a99ba1", fontSize: 11, lineHeight: 17 }}>{description}</Text>
                </View>
              </View>
            ))}
            <View style={{ height: 4, borderRadius: 4, backgroundColor: "#33232a", overflow: "hidden", marginTop: 10 }}>
              <View style={{ width: "33.33%", height: 4, backgroundColor: "#e43b55" }} />
            </View>
            <Text style={{ color: "#88777e", fontSize: 9, letterSpacing: 1, marginTop: 10 }}>SIMPLES • ORGANIZADO • INFORMATIVO</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 30, paddingTop: 18, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,.08)" }} {...webAttr({ "data-torque-nav": "1" })}>
          {links.map((item) => (
            <TouchableOpacity key={item.label} onPress={() => irPara(item.selector)} activeOpacity={0.8} style={{ paddingHorizontal: 13, paddingVertical: 9, borderRadius: 8, borderWidth: 1, borderColor: "#3c2c33", backgroundColor: "rgba(255,255,255,.025)" }} accessibilityRole="button">
              <Text style={{ color: "#d7cbd0", fontSize: 11, fontWeight: "700" }}>{item.label}  ↗</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Animated.View>
  );
}
