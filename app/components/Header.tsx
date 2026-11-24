import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, Platform, Text, TouchableOpacity, View } from "react-native";
import { styles } from "../(tabs)/styles/styles";

type Props = { online: boolean; carregando: boolean };
const webAttr = (attrs: Record<string, string>) => Platform.OS === "web" ? (attrs as object) : {};

export default function Header({ online, carregando }: Props) {
  const logo = useRef(new Animated.Value(0)).current;
  const hero = useRef(new Animated.Value(0)).current;
  const statusLabel = online ? "FIPE online" : carregando ? "Conectando..." : "FIPE offline";

  useEffect(() => {
    Animated.stagger(110, [
      Animated.timing(logo, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(hero, { toValue: 1, duration: 560, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [logo, hero]);

  const fadeUp = (value: Animated.Value) => ({
    opacity: value,
    transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
  });

  function irPara(selector: string) {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    document.querySelector(selector)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const navItems = [
    { label: "Analisar veículo", selector: "#vehicle-section" },
    { label: "Informar dados", selector: "#data-section" },
    { label: "Minha garagem", selector: "#garage-section" },
    { label: "Explorar carros", selector: "#explore-section" },
  ];

  return (
    <>
      <Animated.View style={[styles.topo, fadeUp(logo)]}>
        <Image source={require("../../assets/images/torquelab-logo.png")} style={styles.logoImagem} resizeMode="contain" accessibilityLabel="TorqueLab" />
        <View style={styles.status} accessibilityLabel={statusLabel} {...webAttr({ "data-torque-status-dot": online ? "on" : "off" })}>
          <View style={[styles.statusBolinha, !online && styles.statusOffline]} />
          <Text style={styles.statusTexto}>{statusLabel}</Text>
        </View>
      </Animated.View>

      <Animated.View style={[styles.hero, fadeUp(hero)]} {...webAttr({ "data-torque-hero": "1", "data-torque-card": "1" })}>
        <View style={styles.heroGlow} />
        <View style={styles.heroCopy} {...webAttr({ "data-torque-hero-copy": "1" })}>
            <View style={styles.heroLinha}>
              <View style={styles.heroLinhaVermelha} />
              <Text style={styles.heroEyebrow}>TECNOLOGIA E INTELIGÊNCIA AUTOMOTIVA</Text>
            </View>
            <Text style={styles.titulo}>Conheça seu carro além do painel.</Text>
            <Text style={styles.subtitulo}>
              Consulte a FIPE, avalie as condições do veículo e descubra estimativas importantes em uma experiência simples e completa.
            </Text>
            <View style={styles.heroTags}>
              <Text style={styles.heroTag}>CONSULTA FIPE</Text>
              <Text style={styles.heroTag}>ANÁLISE VEICULAR</Text>
              <Text style={styles.heroTag}>COMPARAÇÃO</Text>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 25 }} {...webAttr({ "data-torque-nav": "1" })}>
              {navItems.map((item, index) => (
                <TouchableOpacity key={item.label} onPress={() => irPara(item.selector)} activeOpacity={0.82}
                  style={{ paddingHorizontal: 13, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: index === 0 ? "#a94352" : "#493038", backgroundColor: index === 0 ? "#371820" : "rgba(15,12,15,0.78)" }}
                  accessibilityRole="button">
                  <Text style={{ color: index === 0 ? "#ff9aa5" : "#e4d6d9", fontSize: 11, fontWeight: "700" }}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
        </View>
      </Animated.View>
    </>
  );
}
