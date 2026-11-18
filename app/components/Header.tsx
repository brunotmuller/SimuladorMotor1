import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, Platform, Text, View } from "react-native";

import { styles } from "../(tabs)/styles/styles";

type Props = {
  online: boolean;
  carregando: boolean;
};

export default function Header({
  online,
  carregando,
}: Props) {
  const logo = useRef(new Animated.Value(0)).current;
  const hero = useRef(new Animated.Value(0)).current;
  const tags = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.timing(logo, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(hero, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(tags, {
        toValue: 1,
        duration: 500,
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

  return (
    <>
      <Animated.View style={[styles.topo, fadeUp(logo, 10)]}>
        <Image
          source={require("../../assets/images/torquelab-logo.png")}
          style={styles.logoImagem}
          resizeMode="contain"
          accessibilityLabel="TorqueLab"
        />

        <View style={styles.status}>
          <View
            // @ts-expect-error data attrs para CSS web
            dataSet={{
              torqueStatusDot: online ? "on" : "off",
            }}
            {...(Platform.OS === "web"
              ? {
                  // react-native-web propaga data-*
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  ...({
                    "data-torque-status-dot": online ? "on" : "off",
                  } as any),
                }
              : {})}
            style={[
              styles.statusBolinha,
              !online && styles.statusOffline,
            ]}
          />

          <Text style={styles.statusTexto}>
            {online
              ? "FIPE online"
              : carregando
                ? "Conectando..."
                : "FIPE offline"}
          </Text>
        </View>
      </Animated.View>

      <Animated.View style={[styles.hero, fadeUp(hero, 22)]}>
        <View
          {...(Platform.OS === "web"
            ? ({ "data-torque-hero-glow": "1" } as object)
            : {})}
          style={styles.heroGlow}
        />
        <View style={styles.heroLinha}>
          <View style={styles.heroLinhaVermelha} />
          <Text style={styles.heroEyebrow}>SIMULADOR VEICULAR / ANÁLISE</Text>
        </View>
        <Text style={styles.titulo}>
          Informação completa para você conhecer cada detalhe do veículo
        </Text>
        <Text style={styles.subtitulo}>
          Consulte o valor FIPE e veja uma estimativa de consumo, condição e desempenho em poucos passos.
        </Text>
        <View style={styles.heroDivisor} />
        <Animated.View style={[styles.heroTags, fadeUp(tags, 12)]}>
          {["01  ESCOLHA O CARRO", "02  CONTE COMO ELE ESTÁ", "03  VEJA O RESULTADO"].map(
            (label) => (
              <Text
                key={label}
                {...(Platform.OS === "web"
                  ? ({ "data-torque-chip": "1" } as object)
                  : {})}
                style={styles.heroTag}
              >
                {label}
              </Text>
            )
          )}
        </Animated.View>
      </Animated.View>
    </>
  );
}
