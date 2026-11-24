import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Car = {
  id: string;
  brand: string;
  model: string;
  year: string;
  category: string;
  power: number;
  torque: number;
  fuel: string;
  transmission: string;
  consumption: number;
  weight: number;
  description: string;
};

const CARS: Car[] = [
  { id: "corolla", brand: "Toyota", model: "Corolla 2.0", year: "2023–2025", category: "Sedã", power: 177, torque: 21.4, fuel: "Flex", transmission: "CVT", consumption: 11.0, weight: 1400, description: "Sedã médio conhecido pelo conforto e uso diário." },
  { id: "civic", brand: "Honda", model: "Civic Touring 1.5 Turbo", year: "2019–2021", category: "Sedã", power: 173, torque: 22.4, fuel: "Gasolina", transmission: "CVT", consumption: 12.0, weight: 1400, description: "Sedã com motor turbo e proposta mais esportiva." },
  { id: "golf", brand: "Volkswagen", model: "Golf GTI 2.0 TSI", year: "2017–2019", category: "Hatch esportivo", power: 230, torque: 35.7, fuel: "Gasolina", transmission: "DSG", consumption: 10.5, weight: 1380, description: "Hatch esportivo com motor turbo e câmbio de dupla embreagem." },
  { id: "onix", brand: "Chevrolet", model: "Onix 1.0 Turbo", year: "2022–2025", category: "Hatch", power: 116, torque: 16.8, fuel: "Flex", transmission: "Automático", consumption: 13.5, weight: 1100, description: "Compacto voltado à economia e mobilidade urbana." },
  { id: "compass", brand: "Jeep", model: "Compass T270", year: "2022–2025", category: "SUV", power: 185, torque: 27.5, fuel: "Flex", transmission: "Automático", consumption: 10.4, weight: 1600, description: "SUV médio com motor turbo flex." },
  { id: "mustang", brand: "Ford", model: "Mustang GT 5.0", year: "2018–2020", category: "Esportivo", power: 466, torque: 56.7, fuel: "Gasolina", transmission: "Automático", consumption: 7.0, weight: 1750, description: "Esportivo V8 de alto desempenho." },
];

const FAVORITES_KEY = "torquelab-favoritos-v1";
const colors = {
  card: "#121014", panel: "#1c1519", border: "#503039",
  red: "#ef3340", pink: "#ff7180", text: "#fff",
  muted: "#bdaeb1", dark: "#0b0a0c",
};

export default function VehicleHub() {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("Todos");
  const [selecionado, setSelecionado] = useState(CARS[0].id);
  const [comparacaoA, setComparacaoA] = useState(CARS[0].id);
  const [comparacaoB, setComparacaoB] = useState(CARS[2].id);
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [somenteFavoritos, setSomenteFavoritos] = useState(false);
  const giro = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let ativo = true;
    AsyncStorage.getItem(FAVORITES_KEY).then((raw) => {
      if (!ativo || !raw) return;
      try {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.every((id) => typeof id === "string")) {
          setFavoritos(parsed);
        }
      } catch { /* ignora dados locais inválidos */ }
    });
    return () => { ativo = false; };
  }, []);

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(giro, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(giro, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [giro]);

  const carro = CARS.find((item) => item.id === selecionado) ?? CARS[0];
  const carroA = CARS.find((item) => item.id === comparacaoA) ?? CARS[0];
  const carroB = CARS.find((item) => item.id === comparacaoB) ?? CARS[2];
  const rotacao = giro.interpolate({ inputRange: [0, 1], outputRange: ["-5deg", "5deg"] });
  const categorias = ["Todos", ...Array.from(new Set(CARS.map((item) => item.category)))];

  const filtrados = useMemo(() => CARS.filter((item) => {
    const texto = `${item.brand} ${item.model} ${item.category}`.toLowerCase();
    return texto.includes(busca.toLowerCase()) &&
      (categoria === "Todos" || item.category === categoria) &&
      (!somenteFavoritos || favoritos.includes(item.id));
  }), [busca, categoria, somenteFavoritos, favoritos]);

  async function alternarFavorito(id: string) {
    const atualizados = favoritos.includes(id)
      ? favoritos.filter((item) => item !== id)
      : [...favoritos, id];
    setFavoritos(atualizados);
    try { await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(atualizados)); } catch { /* mantém estado em memória */ }
  }

  const secao = { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 20, padding: 18, marginBottom: 18 } as const;
  const titulo = { color: colors.text, fontSize: 21, fontWeight: "800" as const, marginBottom: 6 };
  const subtitulo = { color: colors.muted, fontSize: 12, lineHeight: 19, marginBottom: 15 } as const;
  const chip = (ativo: boolean) => ({ backgroundColor: ativo ? "#421a23" : colors.dark, borderColor: ativo ? colors.red : colors.border, borderWidth: 1, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 9, marginRight: 7, marginBottom: 7 } as const);
  const chipText = { color: "#f5e5e7", fontSize: 11, fontWeight: "700" as const } as const;
  const botao = { backgroundColor: "#2a171d", borderWidth: 1, borderColor: "#71313a", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 } as const;

  function seletorComparacao(label: string, value: string, setValue: (id: string) => void) {
    const atual = CARS.findIndex((item) => item.id === value);
    return (
      <View style={{ flex: 1, minWidth: 130 }}>
        <Text style={{ color: colors.muted, fontSize: 10, marginBottom: 7 }}>{label}</Text>
        <TouchableOpacity style={botao} onPress={() => setValue(CARS[(atual + 1) % CARS.length].id)}>
          <Text style={{ color: colors.text, fontSize: 12, fontWeight: "700" }}>{CARS[atual].brand} {CARS[atual].model}</Text>
          <Text style={{ color: colors.pink, fontSize: 10, marginTop: 4 }}>Toque para trocar ↻</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function barraComparativa(label: string, a: number, b: number, unidade: string) {
    const max = Math.max(a, b, 1);
    return (
      <View style={{ marginTop: 15 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 7 }}>
          <Text style={{ color: colors.muted, fontSize: 11 }}>{label}</Text>
          <Text style={{ color: colors.text, fontSize: 11, fontWeight: "700" }}>{a} {unidade}  ×  {b} {unidade}</Text>
        </View>
        {[{ value: a, color: colors.red }, { value: b, color: "#8b7880" }].map((item, index) => (
          <View key={index} style={{ height: 7, backgroundColor: "#30252a", borderRadius: 9, overflow: "hidden", marginBottom: 5 }}>
            <View style={{ width: `${Math.max(3, item.value / max * 100)}%`, height: "100%", backgroundColor: item.color, borderRadius: 9 }} />
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={{ marginTop: 8 }}>
      <View style={secao}>
        <Text style={{ color: colors.pink, fontSize: 10, fontWeight: "800", letterSpacing: 1.3, marginBottom: 8 }}>CENTRAL AUTOMOTIVA</Text>
        <Text style={titulo}>Explore os veículos</Text>
        <Text style={subtitulo}>Consulte fichas técnicas de demonstração, compare modelos e monte sua garagem de favoritos.</Text>

        <View style={{ backgroundColor: "#0a090b", borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 12, overflow: "hidden" }}>
          <Text style={{ color: colors.pink, fontSize: 9, fontWeight: "800", letterSpacing: 1 }}>VEÍCULO EM DESTAQUE</Text>
          <Animated.View style={{ height: 125, alignItems: "center", justifyContent: "center", transform: [{ perspective: 700 }, { rotateY: rotacao }] }}>
            <View style={{ width: "78%", maxWidth: 390, height: 48, backgroundColor: "#8f2635", borderRadius: 28, borderTopLeftRadius: 48, borderTopRightRadius: 35, borderBottomWidth: 5, borderBottomColor: "#4b1720", justifyContent: "center", alignItems: "center" }}>
              <View style={{ position: "absolute", top: -24, left: "28%", width: "43%", height: 34, backgroundColor: "#641d29", borderTopLeftRadius: 35, borderTopRightRadius: 28, borderWidth: 2, borderColor: "#b34a58" }} />
              <View style={{ position: "absolute", top: -16, left: "34%", width: "14%", height: 21, backgroundColor: "#17242b", borderRadius: 5 }} />
              <View style={{ position: "absolute", top: -16, right: "27%", width: "13%", height: 21, backgroundColor: "#17242b", borderRadius: 5 }} />
              <View style={{ position: "absolute", right: 5, top: 12, width: 13, height: 8, backgroundColor: "#ffe2b1", borderRadius: 5 }} />
              <View style={{ position: "absolute", left: 5, top: 12, width: 10, height: 8, backgroundColor: "#ef3340", borderRadius: 5 }} />
            </View>
            <View style={{ position: "absolute", bottom: 19, left: "22%", width: 29, height: 29, borderRadius: 20, backgroundColor: "#080808", borderWidth: 5, borderColor: "#777", alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: 7, height: 7, borderRadius: 5, backgroundColor: "#bbb" }} />
            </View>
            <View style={{ position: "absolute", bottom: 19, right: "22%", width: 29, height: 29, borderRadius: 20, backgroundColor: "#080808", borderWidth: 5, borderColor: "#777", alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: 7, height: 7, borderRadius: 5, backgroundColor: "#bbb" }} />
            </View>
          </Animated.View>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "800" }}>{carro.brand} {carro.model}</Text>
          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 3 }}>{carro.year} · {carro.category} · {carro.transmission}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 13 }}>
            {[[`${carro.power} cv`, "Potência"], [`${carro.torque} kgfm`, "Torque"], [`${carro.consumption} km/L`, "Consumo ref." ]].map(([value, label]) => (
              <View key={label} style={{ minWidth: "31%", flexGrow: 1, backgroundColor: colors.panel, borderRadius: 9, padding: 10, marginRight: 5, marginBottom: 5 }}>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: "800" }}>{value}</Text>
                <Text style={{ color: colors.muted, fontSize: 9, marginTop: 3 }}>{label}</Text>
              </View>
            ))}
          </View>
          <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 7 }}>{carro.description}</Text>
        </View>
      </View>

      <View style={secao}>
        <Text style={titulo}>Catálogo de veículos</Text>
        <Text style={subtitulo}>Pesquise por marca, modelo ou categoria e selecione um carro para ver a ficha.</Text>
        <TextInput value={busca} onChangeText={setBusca} placeholder="Buscar veículo..." placeholderTextColor="#8f7d82" style={{ backgroundColor: colors.dark, color: colors.text, borderColor: colors.border, borderWidth: 1, borderRadius: 11, paddingHorizontal: 13, paddingVertical: 12, marginBottom: 12 }} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          {categorias.map((item) => <TouchableOpacity key={item} style={chip(categoria === item)} onPress={() => setCategoria(item)}><Text style={chipText}>{item}</Text></TouchableOpacity>)}
        </ScrollView>
        <TouchableOpacity onPress={() => setSomenteFavoritos(!somenteFavoritos)} style={[botao, { alignSelf: "flex-start", marginBottom: 12, backgroundColor: somenteFavoritos ? "#421a23" : "#171116" }]}>
          <Text style={{ color: colors.text, fontSize: 11, fontWeight: "700" }}>{somenteFavoritos ? "★ Exibindo favoritos" : "☆ Mostrar favoritos"}</Text>
        </TouchableOpacity>
        {filtrados.map((item) => (
          <TouchableOpacity key={item.id} onPress={() => setSelecionado(item.id)} style={{ padding: 13, borderRadius: 12, borderWidth: 1, borderColor: selecionado === item.id ? colors.red : colors.border, backgroundColor: selecionado === item.id ? "#28151b" : colors.dark, marginBottom: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: "800", fontSize: 13 }}>{item.brand} {item.model}</Text>
                <Text style={{ color: colors.muted, fontSize: 10, marginTop: 4 }}>{item.year} · {item.category} · {item.power} cv</Text>
              </View>
              <TouchableOpacity onPress={() => alternarFavorito(item.id)} style={{ padding: 8 }} accessibilityRole="button" accessibilityLabel="Alternar favorito">
                <Text style={{ color: colors.pink, fontSize: 20 }}>{favoritos.includes(item.id) ? "★" : "☆"}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
        {filtrados.length === 0 && <Text style={{ color: colors.muted, textAlign: "center", padding: 20 }}>Nenhum veículo encontrado. Tente outra busca ou categoria.</Text>}
        <Text style={{ color: colors.muted, fontSize: 10, lineHeight: 16, marginTop: 8 }}>Os números deste catálogo são referências aproximadas para comparação educativa. Podem variar conforme ano, versão, combustível e condições de medição. Confirme no manual ou ficha oficial do fabricante.</Text>
      </View>

      <View style={secao}>
        <Text style={titulo}>Comparador de veículos</Text>
        <Text style={subtitulo}>Compare potência, torque, consumo de referência e peso. Toque nos seletores para alternar os modelos.</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 9 }}>
          {seletorComparacao("VEÍCULO A", comparacaoA, setComparacaoA)}
          {seletorComparacao("VEÍCULO B", comparacaoB, setComparacaoB)}
        </View>
        <View style={{ backgroundColor: colors.panel, borderRadius: 12, padding: 13, marginTop: 14 }}>
          <Text style={{ color: colors.text, fontSize: 12, fontWeight: "800" }}>{carroA.brand} {carroA.model}</Text>
          <Text style={{ color: colors.muted, fontSize: 10, marginTop: 2 }}>A barra superior representa o veículo A; a inferior, o B.</Text>
          {barraComparativa("Potência (cv)", carroA.power, carroB.power, "cv")}
          {barraComparativa("Torque (kgfm)", carroA.torque, carroB.torque, "kgfm")}
          {barraComparativa("Consumo (km/L)", carroA.consumption, carroB.consumption, "km/L")}
          {barraComparativa("Peso (kg)", carroA.weight, carroB.weight, "kg")}
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12, gap: 8 }}>
          <Text style={{ flex: 1, color: colors.pink, fontSize: 10, fontWeight: "700" }}>A · {carroA.brand} {carroA.model}</Text>
          <Text style={{ flex: 1, color: "#c5b7bb", fontSize: 10, fontWeight: "700", textAlign: "right" }}>B · {carroB.brand} {carroB.model}</Text>
        </View>
      </View>

      <View style={secao}>
        <Text style={titulo}>Minha garagem</Text>
        <Text style={subtitulo}>Seus veículos favoritos ficam salvos neste dispositivo.</Text>
        {favoritos.length === 0 ? (
          <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 19 }}>Sua garagem está vazia. Toque na estrela de um veículo do catálogo para adicioná-lo.</Text>
        ) : favoritos.map((id) => {
          const item = CARS.find((car) => car.id === id);
          if (!item) return null;
          return (
            <View key={id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 12, fontWeight: "700" }}>{item.brand} {item.model}</Text>
                <Text style={{ color: colors.muted, fontSize: 10, marginTop: 3 }}>{item.power} cv · {item.torque} kgfm</Text>
              </View>
              <TouchableOpacity onPress={() => { setSelecionado(id); alternarFavorito(id); }} style={botao}>
                <Text style={{ color: colors.pink, fontSize: 10, fontWeight: "700" }}>Remover</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </View>
  );
}
