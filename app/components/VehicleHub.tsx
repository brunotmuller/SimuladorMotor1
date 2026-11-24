import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Car = {
  id: string; brand: string; model: string; year: string; category: string;
  power: number; torque: number; fuel: string; transmission: string;
  consumption: number; weight: number; description: string;
};

const CARS: Car[] = [
  { id: "corolla", brand: "Toyota", model: "Corolla 2.0", year: "2023–2025", category: "Sedã", power: 177, torque: 21.4, fuel: "Flex", transmission: "CVT", consumption: 11, weight: 1400, description: "Sedã médio conhecido pelo conforto e uso diário." },
  { id: "civic", brand: "Honda", model: "Civic Touring 1.5 Turbo", year: "2019–2021", category: "Sedã", power: 173, torque: 22.4, fuel: "Gasolina", transmission: "CVT", consumption: 12, weight: 1400, description: "Sedã com motor turbo e proposta mais esportiva." },
  { id: "golf", brand: "Volkswagen", model: "Golf GTI 2.0 TSI", year: "2017–2019", category: "Hatch esportivo", power: 230, torque: 35.7, fuel: "Gasolina", transmission: "DSG", consumption: 10.5, weight: 1380, description: "Hatch esportivo com motor turbo e câmbio de dupla embreagem." },
  { id: "onix", brand: "Chevrolet", model: "Onix 1.0 Turbo", year: "2022–2025", category: "Hatch", power: 116, torque: 16.8, fuel: "Flex", transmission: "Automático", consumption: 13.5, weight: 1100, description: "Compacto voltado à economia e mobilidade urbana." },
  { id: "compass", brand: "Jeep", model: "Compass T270", year: "2022–2025", category: "SUV", power: 185, torque: 27.5, fuel: "Flex", transmission: "Automático", consumption: 10.4, weight: 1600, description: "SUV médio com motor turbo flex." },
  { id: "mustang", brand: "Ford", model: "Mustang GT 5.0", year: "2018–2020", category: "Esportivo", power: 466, torque: 56.7, fuel: "Gasolina", transmission: "Automático", consumption: 7, weight: 1750, description: "Esportivo V8 de alto desempenho." },
];

const FAVORITES_KEY = "torquelab-favoritos-v1";
const colors = { card: "#111115", panel: "#1b151a", border: "#3a2a32", red: "#e43b55", pink: "#ff8797", text: "#fff", muted: "#b9aeb3", dark: "#0b0a0e" };
type Panel = "spotlight" | "catalog" | "compare" | "garage" | null;

export default function VehicleHub() {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("Todos");
  const [selecionado, setSelecionado] = useState(CARS[0].id);
  const [comparacaoA, setComparacaoA] = useState(CARS[0].id);
  const [comparacaoB, setComparacaoB] = useState(CARS[2].id);
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [somenteFavoritos, setSomenteFavoritos] = useState(false);
  const [activePanel, setActivePanel] = useState<Panel>(null);
  const giro = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let ativo = true;
    AsyncStorage.getItem(FAVORITES_KEY).then((raw) => {
      if (!ativo || !raw) return;
      try {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.every((id) => typeof id === "string")) setFavoritos(parsed);
      } catch { /* ignora dados locais inválidos */ }
    });
    return () => { ativo = false; };
  }, []);

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(giro, { toValue: 1, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(giro, { toValue: 0, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [giro]);

  const carro = CARS.find((item) => item.id === selecionado) ?? CARS[0];
  const carroA = CARS.find((item) => item.id === comparacaoA) ?? CARS[0];
  const carroB = CARS.find((item) => item.id === comparacaoB) ?? CARS[2];
  const rotacao = giro.interpolate({ inputRange: [0, 1], outputRange: ["-4deg", "4deg"] });
  const categorias = ["Todos", ...Array.from(new Set(CARS.map((item) => item.category)))];
  const filtrados = useMemo(() => CARS.filter((item) => {
    const texto = `${item.brand} ${item.model} ${item.category}`.toLowerCase();
    return texto.includes(busca.toLowerCase()) && (categoria === "Todos" || item.category === categoria) && (!somenteFavoritos || favoritos.includes(item.id));
  }), [busca, categoria, somenteFavoritos, favoritos]);

  async function alternarFavorito(id: string) {
    const atualizados = favoritos.includes(id) ? favoritos.filter((item) => item !== id) : [...favoritos, id];
    setFavoritos(atualizados);
    try { await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(atualizados)); } catch { /* mantém estado em memória */ }
  }

  const secao = { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 22, padding: 22, marginBottom: 18, shadowColor: "#000", shadowOpacity: 0.22, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } } as const;
  const titulo = { color: colors.text, fontSize: 20, fontWeight: "800" as const, marginBottom: 6 };
  const subtitulo = { color: colors.muted, fontSize: 12, lineHeight: 18, marginBottom: 14 } as const;
  const botao = { backgroundColor: "#2a171d", borderWidth: 1, borderColor: "#71313a", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 } as const;
  const chip = (ativo: boolean) => ({ backgroundColor: ativo ? "#421a23" : colors.dark, borderColor: ativo ? colors.red : colors.border, borderWidth: 1, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 9, marginRight: 7, marginBottom: 7 } as const);

  function trocarComparacao(value: string, setValue: (id: string) => void) {
    const atual = CARS.findIndex((item) => item.id === value);
    setValue(CARS[(atual + 1) % CARS.length].id);
  }

  function barra(label: string, a: number, b: number, unidade: string) {
    const max = Math.max(a, b, 1);
    return (
      <View style={{ marginTop: 14 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 7 }}>
          <Text style={{ color: colors.muted, fontSize: 11 }}>{label}</Text>
          <Text style={{ color: colors.text, fontSize: 11, fontWeight: "700" }}>{a} {unidade} × {b} {unidade}</Text>
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
    <View nativeID="explore-section" style={{ marginTop: 8 }}>
      <View style={[secao, { padding: 15 }]}>
        <Text style={titulo}>Central de veículos</Text>
        <Text style={subtitulo}>As ferramentas ficam organizadas aqui. Toque em um ícone para abrir e toque novamente para fechar.</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {([
            { id: "spotlight", label: "Destaque", icon: "car-sports" },
            { id: "catalog", label: "Catálogo", icon: "car-multiple" },
            { id: "compare", label: "Comparar", icon: "compare-horizontal" },
            { id: "garage", label: "Garagem", icon: "garage" },
          ] as const).map((item) => {
            const ativo = activePanel === item.id;
            return (
              <TouchableOpacity key={item.id} onPress={() => setActivePanel(ativo ? null : item.id)} activeOpacity={0.82} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected: ativo }} style={{ flex: 1, minWidth: "22%", alignItems: "center", justifyContent: "center", paddingVertical: 13, paddingHorizontal: 5, borderRadius: 13, borderWidth: 1, borderColor: ativo ? colors.red : colors.border, backgroundColor: ativo ? "#3b1821" : colors.dark }}>
                <MaterialCommunityIcons name={item.icon} size={25} color={ativo ? colors.pink : "#d7c9cc"} />
                <Text style={{ color: colors.text, fontSize: 10, fontWeight: "700", marginTop: 6 }}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {activePanel === "spotlight" && (
        <View style={secao}>
          <Text style={{ color: colors.pink, fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginBottom: 7 }}>VEÍCULO EM DESTAQUE</Text>
          <Text style={titulo}>{carro.brand} {carro.model}</Text>
          <Text style={subtitulo}>{carro.year} · {carro.category} · {carro.transmission}</Text>
          <View style={{ backgroundColor: "#09090c", borderRadius: 17, borderWidth: 1, borderColor: colors.border, height: 235, justifyContent: "center", alignItems: "center", overflow: "hidden" }}>
            <View style={{ position: "absolute", bottom: 30, width: "76%", height: 26, borderRadius: 100, backgroundColor: "#000", opacity: 0.75, transform: [{ scaleX: 1.1 }] }} />
            <Animated.View style={{ width: "88%", maxWidth: 480, height: 155, alignItems: "center", justifyContent: "center", transform: [{ perspective: 850 }, { rotateY: rotacao }, { rotateX: "3deg" }] }}>
              <View style={{ position: "absolute", bottom: 19, width: "92%", height: 72, borderRadius: 35, borderTopLeftRadius: 55, borderTopRightRadius: 48, backgroundColor: "#7f1d2c", borderBottomWidth: 7, borderBottomColor: "#350d16", shadowColor: "#f34a5e", shadowOpacity: 0.5, shadowRadius: 15, shadowOffset: { width: 0, height: -5 }, elevation: 12 }} />
              <View style={{ position: "absolute", top: 7, width: "54%", height: 72, backgroundColor: "#681724", borderTopLeftRadius: 60, borderTopRightRadius: 50, borderWidth: 2, borderColor: "#c15b69", transform: [{ skewX: "-8deg" }] }} />
              <View style={{ position: "absolute", top: 16, width: "44%", height: 46, backgroundColor: "#14232c", borderRadius: 12, borderWidth: 2, borderColor: "#82949b", flexDirection: "row", overflow: "hidden" }}>
                <View style={{ flex: 1, borderRightWidth: 2, borderRightColor: "#84949a", backgroundColor: "#1b303a" }} />
                <View style={{ flex: 1, backgroundColor: "#101c24" }} />
              </View>
              <View style={{ position: "absolute", top: 61, width: "90%", height: 3, backgroundColor: "#f08b96", opacity: 0.8, borderRadius: 5 }} />
              <View style={{ position: "absolute", bottom: 29, left: "4%", width: 22, height: 12, borderRadius: 7, backgroundColor: "#fff1cf", shadowColor: "#fff", shadowOpacity: 0.9, shadowRadius: 8, elevation: 4 }} />
              <View style={{ position: "absolute", bottom: 29, right: "4%", width: 21, height: 11, borderRadius: 6, backgroundColor: "#ff3149" }} />
              {[{ left: "17%" }, { right: "17%" }].map((position, index) => (
                <View key={index} style={[{ position: "absolute", bottom: 0, width: 45, height: 45, borderRadius: 22, backgroundColor: "#050506", borderWidth: 5, borderColor: "#6c7078", alignItems: "center", justifyContent: "center" }, position]}>
                  <View style={{ width: 15, height: 15, borderRadius: 10, backgroundColor: "#bfc3c9", borderWidth: 3, borderColor: "#565a60" }} />
                </View>
              ))}
            </Animated.View>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 12, gap: 7 }}>
            {[[`${carro.power} cv`, "Potência"], [`${carro.torque} kgfm`, "Torque"], [`${carro.consumption} km/L`, "Consumo ref."]].map(([value, label]) => (
              <View key={label} style={{ flex: 1, minWidth: "28%", backgroundColor: colors.panel, borderRadius: 9, padding: 10 }}>
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: "800" }}>{value}</Text>
                <Text style={{ color: colors.muted, fontSize: 9, marginTop: 3 }}>{label}</Text>
              </View>
            ))}
          </View>
          <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 10 }}>{carro.description}</Text>
          <Text style={{ color: colors.muted, fontSize: 10, marginTop: 8 }}>Ilustração 3D estilizada. Para aparência fotorealista, o próximo passo é integrar um modelo 3D real (GLB/GLTF).</Text>
        </View>
      )}

      {activePanel === "catalog" && (
        <View style={secao}>
          <Text style={titulo}>Catálogo de veículos</Text>
          <Text style={subtitulo}>Pesquise por marca, modelo ou categoria e selecione um carro para ver a ficha.</Text>
          <TextInput value={busca} onChangeText={setBusca} placeholder="Buscar veículo..." placeholderTextColor="#8f7d82" style={{ backgroundColor: colors.dark, color: colors.text, borderColor: colors.border, borderWidth: 1, borderRadius: 11, paddingHorizontal: 13, paddingVertical: 12, marginBottom: 12 }} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            {categorias.map((item) => <TouchableOpacity key={item} style={chip(categoria === item)} onPress={() => setCategoria(item)}><Text style={{ color: "#f5e5e7", fontSize: 11, fontWeight: "700" }}>{item}</Text></TouchableOpacity>)}
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
          <Text style={{ color: colors.muted, fontSize: 10, lineHeight: 16, marginTop: 8 }}>Os números são referências aproximadas para comparação educativa. Podem variar conforme ano, versão e condições de medição. Confirme na ficha oficial do fabricante.</Text>
        </View>
      )}

      {activePanel === "compare" && (
        <View style={secao}>
          <Text style={titulo}>Comparador de veículos</Text>
          <Text style={subtitulo}>Compare potência, torque, consumo de referência e peso. Toque nos seletores para alternar os modelos.</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 9 }}>
            <View style={{ flex: 1, minWidth: 130 }}>
              <Text style={{ color: colors.muted, fontSize: 10, marginBottom: 7 }}>VEÍCULO A</Text>
              <TouchableOpacity style={botao} onPress={() => trocarComparacao(comparacaoA, setComparacaoA)}>
                <Text style={{ color: colors.text, fontSize: 12, fontWeight: "700" }}>{carroA.brand} {carroA.model}</Text>
                <Text style={{ color: colors.pink, fontSize: 10, marginTop: 4 }}>Toque para trocar ↻</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1, minWidth: 130 }}>
              <Text style={{ color: colors.muted, fontSize: 10, marginBottom: 7 }}>VEÍCULO B</Text>
              <TouchableOpacity style={botao} onPress={() => trocarComparacao(comparacaoB, setComparacaoB)}>
                <Text style={{ color: colors.text, fontSize: 12, fontWeight: "700" }}>{carroB.brand} {carroB.model}</Text>
                <Text style={{ color: colors.pink, fontSize: 10, marginTop: 4 }}>Toque para trocar ↻</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={{ backgroundColor: colors.panel, borderRadius: 12, padding: 13, marginTop: 14 }}>
            <Text style={{ color: colors.text, fontSize: 12, fontWeight: "800" }}>{carroA.brand} × {carroB.brand}</Text>
            <Text style={{ color: colors.muted, fontSize: 10, marginTop: 2 }}>Barra superior: veículo A. Barra inferior: veículo B.</Text>
            {barra("Potência", carroA.power, carroB.power, "cv")}
            {barra("Torque", carroA.torque, carroB.torque, "kgfm")}
            {barra("Consumo", carroA.consumption, carroB.consumption, "km/L")}
            {barra("Peso", carroA.weight, carroB.weight, "kg")}
          </View>
        </View>
      )}

      {activePanel === "garage" && (
        <View style={secao}>
          <Text style={titulo}>Minha garagem</Text>
          <Text style={subtitulo}>Seus veículos favoritos ficam salvos neste dispositivo.</Text>
          {favoritos.length === 0 ? (
            <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 19 }}>Sua garagem está vazia. Abra o catálogo e toque na estrela de um veículo para adicioná-lo.</Text>
          ) : favoritos.map((id) => {
            const item = CARS.find((car) => car.id === id);
            if (!item) return null;
            return (
              <View key={id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 12, fontWeight: "700" }}>{item.brand} {item.model}</Text>
                  <Text style={{ color: colors.muted, fontSize: 10, marginTop: 3 }}>{item.power} cv · {item.torque} kgfm</Text>
                </View>
                <TouchableOpacity onPress={() => alternarFavorito(id)} style={botao}>
                  <Text style={{ color: colors.pink, fontSize: 10, fontWeight: "700" }}>Remover</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
