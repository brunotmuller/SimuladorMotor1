import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, Platform, Text, View } from "react-native";

import { styles } from "../(tabs)/styles/styles";

type Props = {
  online: boolean;
  carregando: boolean;
};

const webAttr = (attrs: Record<string, string>) =>
  Platform.OS === "web" ? (attrs as object) : {};

export default function Header({ online, carregando }: Props) {
  const logo = useRef(new Animated.Value(0)).current;
  const hero = useRef(new Animated.Value(0)).current;
  const tags = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(100, [
      Animated.timing(logo, {
        toValue: 1,
        duration: 480,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(hero, {
        toValue: 1,
        duration: 620,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(tags, {
        toValue: 1,
        duration: 480,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [logo, hero, tags]);

  const fadeUp = (v: Animated.Value, dy = 16) => ({
    opacity: v,
    transform: [
      {
        translateY: v.interpolate({
          inputRange: [0, 1],
          outputRange: [dy, 0],
        }),
      },
    ],
  });

  const statusLabel = online
    ? "FIPE online"
    : carregando
      ? "Conectando..."
      : "FIPE offline";

  const titulo =
    "Informação completa para você conhecer cada detalhe do veículo";

  return (
    <>
      <Animated.View style={[styles.topo, fadeUp(logo, 10)]}>
        <View {...webAttr({ "data-torque-glitch": "1", "data-text": "TorqueLab" })}>
          <Image
            source={require("../../assets/images/torquelab-logo.png")}
            style={styles.logoImagem}
            resizeMode="contain"
            accessibilityLabel="TorqueLab"
          />
        </View>

        <View
          style={styles.status}
          accessibilityLabel={statusLabel}
          {...webAttr({
            "data-torque-status-dot": online ? "on" : "off",
          })}
        >
          <View
            style={[
              styles.statusBolinha,
              !online && styles.statusOffline,
            ]}
            {...webAttr({
              "data-torque-status-dot": online ? "on" : "off",
            })}
          />
          <Text style={styles.statusTexto}>{statusLabel}</Text>
        </View>
      </Animated.View>

      <Animated.View
        style={[styles.hero, fadeUp(hero, 22)]}
        {...webAttr({ "data-torque-hero": "1", "data-torque-card": "1" })}
      >
        <View
          style={styles.heroGlow}
          {...webAttr({ "data-torque-parallax": "1", "data-depth": "0.35" })}
        />
        <View style={styles.heroLinha}>
          <View style={styles.heroLinhaVermelha} />
          <Text
            style={styles.heroEyebrow}
            {...webAttr({ "data-torque-kinetic": "1" })}
          >
            SIMULADOR VEICULAR / ANÁLISE
          </Text>
        </View>
        <Text
          style={styles.titulo}
          {...webAttr({
            "data-torque-glitch": "1",
            "data-text": titulo,
          })}
        >
          {titulo}
        </Text>
        <Text style={styles.subtitulo}>
          Consulte o valor FIPE e veja uma estimativa de consumo, condição e
          desempenho em poucos passos.
        </Text>
        <View style={styles.heroDivisor} />
        <Animated.View style={[styles.heroTags, fadeUp(tags, 12)]}>
          <Text
            style={styles.heroTag}
            {...webAttr({ "data-torque-chip": "1", "data-torque-magnetic": "1" })}
          >
            01  ESCOLHA O CARRO
          </Text>
          <Text
            style={styles.heroTag}
            {...webAttr({ "data-torque-chip": "1", "data-torque-magnetic": "1" })}
          >
            02  CONTE COMO ELE ESTÁ
          </Text>
          <Text
            style={styles.heroTag}
            {...webAttr({ "data-torque-chip": "1", "data-torque-magnetic": "1" })}
          >
            03  VEJA O RESULTADO
          </Text>
        </Animated.View>
      </Animated.View>
    </>
  );
}
