import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, Text, View } from "react-native";

import { styles } from "../(tabs)/styles/styles";

type Props = {
  online: boolean;
  carregando: boolean;
};

export default function Header({ online, carregando }: Props) {
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

  const statusLabel = online
    ? "FIPE online"
    : carregando
      ? "Conectando..."
      : "FIPE offline";

  return (
    <>
      <Animated.View style={[styles.topo, fadeUp(logo, 10)]}>
        <Image
          source={require("../../assets/images/torquelab-logo.png")}
          style={styles.logoImagem}
          resizeMode="contain"
          accessibilityLabel="TorqueLab"
        />

        <View style={styles.status} accessibilityLabel={statusLabel}>
          <View
            style={[
              styles.statusBolinha,
              !online && styles.statusOffline,
            ]}
          />
          <Text style={styles.statusTexto}>{statusLabel}</Text>
        </View>
      </Animated.View>

      <Animated.View style={[styles.hero, fadeUp(hero, 22)]}>
        <View style={styles.heroGlow} />
        <View style={styles.heroLinha}>
          <View style={styles.heroLinhaVermelha} />
          <Text style={styles.heroEyebrow}>SIMULADOR VEICULAR / ANÁLISE</Text>
        </View>
        <Text style={styles.titulo}>
          Informação completa para você conhecer cada detalhe do veículo
        </Text>
        <Text style={styles.subtitulo}>
          Consulte o valor FIPE e veja uma estimativa de consumo, condição e
          desempenho em poucos passos.
        </Text>
        <View style={styles.heroDivisor} />
        <Animated.View style={[styles.heroTags, fadeUp(tags, 12)]}>
          <Text style={styles.heroTag}>01  ESCOLHA O CARRO</Text>
          <Text style={styles.heroTag}>02  CONTE COMO ELE ESTÁ</Text>
          <Text style={styles.heroTag}>03  VEJA O RESULTADO</Text>
        </Animated.View>
      </Animated.View>
    </>
  );
}
