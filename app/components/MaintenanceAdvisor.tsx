import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { buscarModelos } from "../(tabs)/services/fipeApi";
import { styles } from "../(tabs)/styles/styles";
import { ItemAPI } from "../(tabs)/types/vehicle";
import SeletorModal from "./SeletorModal";

type Props = {
  marcas?: ItemAPI[];
  carregandoMarcas?: boolean;
  veiculoAtual?: {
    marca: ItemAPI;
    modelo: ItemAPI;
  } | null;
};

type MaintenanceEstimate = {
  id: string;
  name: string;
  minPrice: number;
  maxPrice: number;
  description: string;
};

const ESTIMATES: MaintenanceEstimate[] = [
  {
    id: "oil",
    name: "Troca de óleo do motor",
    minPrice: 150,
    maxPrice: 350,
    description: "O óleo correto e o intervalo devem seguir o manual do veículo.",
  },
  {
    id: "air-filter",
    name: "Filtro de ar do motor",
    minPrice: 50,
    maxPrice: 120,
    description: "A necessidade depende da inspeção e das condições de uso.",
  },
  {
    id: "fuel-filter",
    name: "Filtro de combustível",
    minPrice: 60,
    maxPrice: 150,
    description: "Aplicável conforme o sistema e a recomendação do fabricante.",
  },
  {
    id: "brake-pads",
    name: "Pastilhas de freio",
    minPrice: 150,
    maxPrice: 400,
    description: "A troca depende da espessura e do estado das pastilhas.",
  },
  {
    id: "tires",
    name: "Jogo de 4 pneus",
    minPrice: 800,
    maxPrice: 2000,
    description: "O valor varia bastante conforme medida, marca e categoria.",
  },
  {
    id: "general-review",
    name: "Revisão preventiva geral",
    minPrice: 300,
    maxPrice: 800,
    description: "Valor de referência; o orçamento depende dos itens necessários.",
  },
];

const KM_PRESETS = [10000, 20000, 40000, 60000, 80000, 100000] as const;

const MODEL_TO_BRAND: { keywords: string[]; brandHint: string }[] = [
  { keywords: ["corolla", "hilux", "yaris", "sw4", "etios"], brandHint: "toyota" },
  { keywords: ["civic", "hr-v", "hrv", "city", "fit", "cr-v"], brandHint: "honda" },
  { keywords: ["onix", "tracker", "cruze", "s10", "spin", "celta", "prisma", "corsa"], brandHint: "chevrolet" },
  { keywords: ["polo", "gol", "golf", "t-cross", "tcross", "nivus", "virtus", "jetta", "saveiro", "amarok", "fox", "voyage"], brandHint: "volkswagen" },
  { keywords: ["hb20", "creta", "tucson", "ix35"], brandHint: "hyundai" },
  { keywords: ["strada", "argo", "mobi", "toro", "uno", "palio", "pulse", "fastback", "cronos"], brandHint: "fiat" },
  { keywords: ["compass", "renegade", "commander"], brandHint: "jeep" },
  { keywords: ["kwid", "sandero", "duster", "logan", "kardian", "oroch"], brandHint: "renault" },
  { keywords: ["kicks", "versa", "frontier", "sentra"], brandHint: "nissan" },
  { keywords: ["ka", "ecosport", "ranger", "mustang", "territory", "fiesta"], brandHint: "ford" },
  { keywords: ["dolphin", "song", "yuan", "seal", "king"], brandHint: "byd" },
  { keywords: ["320i", "x1", "x3", "x5"], brandHint: "bmw" },
];

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const formatKm = (value: number) => `${value.toLocaleString("pt-BR")} km`;

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "");
}

export default function MaintenanceAdvisor({
  marcas = [],
  carregandoMarcas = false,
  veiculoAtual = null,
}: Props) {
  const [marca, setMarca] = useState<ItemAPI | null>(null);
  const [modelo, setModelo] = useState<ItemAPI | null>(null);
  const [modelos, setModelos] = useState<ItemAPI[]>([]);
  const [carregandoModelos, setCarregandoModelos] = useState(false);
  const [erroFipe, setErroFipe] = useState("");
  const [modalMarca, setModalMarca] = useState(false);
  const [modalModelo, setModalModelo] = useState(false);
  const [carroDigitado, setCarroDigitado] = useState("");
  const [currentKm, setCurrentKm] = useState("60000");
  const [excludedIds, setExcludedIds] = useState<string[]>([]);

  useEffect(() => {
    if (veiculoAtual) {
      setMarca(veiculoAtual.marca);
      setModelo(veiculoAtual.modelo);
      setCarroDigitado("");
    }
  }, [veiculoAtual]);

  async function selecionarMarcaFipe(item: ItemAPI, abrirModelosDepois = false) {
    setMarca(item);
    setModelo(null);
    setModelos([]);
    setErroFipe("");

    try {
      setCarregandoModelos(true);
      const lista = await buscarModelos(item.code);
      setModelos(lista);
      if (abrirModelosDepois) setModalModelo(true);
    } catch {
      setErroFipe("Não foi possível carregar os modelos desta marca na FIPE.");
    } finally {
      setCarregandoModelos(false);
    }
  }

  function selecionarModeloFipe(item: ItemAPI) {
    setModelo(item);
    setCarroDigitado("");
    setErroFipe("");
  }

  const marcaSugerida = useMemo(() => {
    const termo = normalizeText(carroDigitado.trim());
    if (termo.length < 2 || marcas.length === 0) return null;
    const direto = marcas.find((m) => normalizeText(m.name).includes(termo));
    if (direto) return direto;
    const matchModelo = MODEL_TO_BRAND.find((entry) =>
      entry.keywords.some((kw) => termo.includes(kw))
    );
    if (!matchModelo) return null;
    return marcas.find((m) => normalizeText(m.name).includes(matchModelo.brandHint)) ?? null;
  }, [carroDigitado, marcas]);

  const activeVehicleLabel = useMemo(() => {
    const typed = carroDigitado.trim();
    if (typed) return typed;
    if (marca && modelo) return `${marca.name} ${modelo.name}`;
    if (marca) return marca.name;
    return "Veículo não identificado";
  }, [carroDigitado, marca, modelo]);

  const kmNumber = Number(currentKm);
  const validKm = currentKm.trim() !== "" && Number.isFinite(kmNumber) && kmNumber >= 0;

  const selectedItems = ESTIMATES.filter((item) => !excludedIds.includes(item.id));
  const totalMin = selectedItems.reduce((sum, item) => sum + item.minPrice, 0);
  const totalMax = selectedItems.reduce((sum, item) => sum + item.maxPrice, 0);

  function toggleItem(id: string) {
    setExcludedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  return (
    <View
      nativeID="maintenance-section"
      style={[styles.card, { marginTop: 18 }]}
      {...(Platform.OS === "web" ? ({ "data-torque-card": "1" } as object) : {})}
    >
      <View style={styles.sectionKicker}>
        <Text style={styles.sectionKickerText}>03 / REVISÃO & CUSTOS</Text>
      </View>
      <Text style={styles.tituloSecao}>Planejador de manutenção</Text>
      <Text style={styles.descricaoSecao}>
        Consulte faixas de preços publicadas para serviços comuns e monte uma previsão de gastos.
        A quilometragem ajuda a contextualizar o planejamento, mas não determina sozinha o que deve ser trocado.
      </Text>

      <View {...(Platform.OS === "web" ? ({ "data-torque-columns": "1" } as object) : {})}>
        <View>
          {veiculoAtual && (
            <View style={{ alignSelf: "flex-start", backgroundColor: "#1a1f1a", borderWidth: 1, borderColor: "#2a4a2a", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 14 }}>
              <Text style={{ color: "#7ec67e", fontSize: 11, fontWeight: "600" }}>
                ✓ Veículo do simulador: {veiculoAtual.marca.name} {veiculoAtual.modelo.name}
              </Text>
            </View>
          )}

          <Text style={styles.label}>1. Identifique seu veículo (opcional)</Text>
          <View style={styles.linha}>
            <View style={[styles.campoMetade, styles.campoEsquerda]}>
              <TouchableOpacity
                style={[styles.seletor, (carregandoMarcas || marcas.length === 0) && styles.desativado]}
                disabled={carregandoMarcas || marcas.length === 0}
                activeOpacity={0.8}
                onPress={() => setModalMarca(true)}
                accessibilityRole="button"
              >
                <Text numberOfLines={1} style={[styles.seletorTexto, !marca && styles.placeholder]}>
                  {carregandoMarcas ? "Carregando..." : marca?.name || "Selecionar marca"}
                </Text>
                {carregandoMarcas ? <ActivityIndicator size="small" color="#ef3340" /> : <Text style={styles.chevron}>›</Text>}
              </TouchableOpacity>
            </View>
            <View style={styles.campoMetade}>
              <TouchableOpacity
                style={[styles.seletor, (!marca || carregandoModelos || modelos.length === 0) && styles.desativado]}
                disabled={!marca || carregandoModelos || modelos.length === 0}
                activeOpacity={0.8}
                onPress={() => setModalModelo(true)}
                accessibilityRole="button"
              >
                <Text numberOfLines={1} style={[styles.seletorTexto, !modelo && styles.placeholder]}>
                  {carregandoModelos ? "Carregando..." : modelo?.name || (marca ? "Selecionar modelo" : "Escolha a marca")}
                </Text>
                {carregandoModelos ? <ActivityIndicator size="small" color="#ef3340" /> : <Text style={styles.chevron}>›</Text>}
              </TouchableOpacity>
            </View>
          </View>

          {erroFipe !== "" && <Text style={{ color: "#ff8797", fontSize: 11, marginBottom: 10 }}>{erroFipe}</Text>}

          <Text style={styles.label}>Ou digite o nome do carro</Text>
          <TextInput
            value={carroDigitado}
            onChangeText={(texto) => {
              setCarroDigitado(texto);
              if (texto.trim()) setErroFipe("");
            }}
            placeholder="Ex.: Honda Civic, Hilux, BYD Dolphin..."
            placeholderTextColor="#6f6267"
            style={[styles.input, { marginBottom: marcaSugerida ? 8 : 14 }]}
          />

          {marcaSugerida && carroDigitado.trim().length >= 2 && (
            <TouchableOpacity
              onPress={() => selecionarMarcaFipe(marcaSugerida, true)}
              activeOpacity={0.85}
              accessibilityRole="button"
              style={{ alignSelf: "flex-start", backgroundColor: "#1d1419", borderWidth: 1, borderColor: "#57313b", borderRadius: 9, paddingHorizontal: 11, paddingVertical: 7, marginBottom: 14 }}
            >
              <Text style={{ color: "#ff8797", fontSize: 11, fontWeight: "700" }}>
                Ver modelos de {marcaSugerida.name} na FIPE →
              </Text>
            </TouchableOpacity>
          )}

          <Text style={styles.label}>2. Quilometragem atual (para referência)</Text>
          <TextInput
            value={currentKm}
            onChangeText={(value) => setCurrentKm(value.replace(/[^0-9]/g, "").slice(0, 7))}
            keyboardType="numeric"
            placeholder="Ex.: 60000"
            placeholderTextColor="#6f6267"
            style={[styles.input, { marginBottom: 10 }]}
          />

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            {KM_PRESETS.map((preset) => {
              const active = validKm && kmNumber === preset;
              return (
                <TouchableOpacity
                  key={preset}
                  onPress={() => setCurrentKm(String(preset))}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  style={{ backgroundColor: active ? "#2b161d" : "#151218", borderWidth: 1, borderColor: active ? "#e43b55" : "#33272e", borderRadius: 99, paddingHorizontal: 10, paddingVertical: 6 }}
                >
                  <Text style={{ color: active ? "#ff8797" : "#b8a9ae", fontSize: 11, fontWeight: "700" }}>
                    {formatKm(preset)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={{ color: "#9d8e93", fontSize: 11, lineHeight: 17 }}>
            Veículo selecionado: <Text style={{ color: "#e8dde0", fontWeight: "700" }}>{activeVehicleLabel}</Text>
          </Text>
        </View>

        <View style={{ backgroundColor: "#0c0b10", borderWidth: 1, borderColor: "#3e2b34", borderRadius: 16, padding: 18 }}>
          {!validKm ? (
            <Text style={{ color: "#b8a9ae", fontSize: 13, lineHeight: 20 }}>
              Informe uma quilometragem válida para registrar o contexto da sua estimativa.
            </Text>
          ) : (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#261d22", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ color: "#ff8797", fontSize: 10, fontWeight: "900", letterSpacing: 0.8 }}>
                    {activeVehicleLabel.toUpperCase()} • {formatKm(kmNumber)}
                  </Text>
                  <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800", marginTop: 3 }}>
                    Faixas de preço de referência
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ color: "#a8999e", fontSize: 10, fontWeight: "700" }}>TOTAL DOS ITENS MARCADOS</Text>
                  <Text style={{ color: "#43c977", fontSize: 18, fontWeight: "900", marginTop: 1 }}>
                    {brl.format(totalMin)} – {brl.format(totalMax)}
                  </Text>
                </View>
              </View>

              {ESTIMATES.map((item) => {
                const checked = !excludedIds.includes(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => toggleItem(item.id)}
                    activeOpacity={0.8}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                    style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: "#1f181c", gap: 10, opacity: checked ? 1 : 0.45 }}
                  >
                    <View style={{ width: 20, height: 20, borderRadius: 6, borderWidth: 1, borderColor: checked ? "#e43b55" : "#56434a", backgroundColor: checked ? "#e43b55" : "transparent", alignItems: "center", justifyContent: "center" }}>
                      {checked && <Text style={{ color: "#fff", fontSize: 11, fontWeight: "900" }}>✓</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700", textDecorationLine: checked ? "none" : "line-through" }}>
                        {item.name}
                      </Text>
                      <Text style={{ color: "#9f9095", fontSize: 11, marginTop: 3, lineHeight: 16 }}>
                        {item.description}
                      </Text>
                    </View>
                    <Text style={{ color: checked ? "#fff" : "#8b7c81", fontSize: 12, fontWeight: "800" }}>
                      {brl.format(item.minPrice)}–{brl.format(item.maxPrice)}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <View style={{ backgroundColor: "#1a1216", borderWidth: 1, borderColor: "#63323e", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginTop: 14 }}>
                <Text style={{ color: "#ff8797", fontSize: 10, fontWeight: "900", letterSpacing: 0.8 }}>PREVISÃO DOS ITENS SELECIONADOS</Text>
                <Text style={{ color: "#fff", fontSize: 22, fontWeight: "900", marginTop: 4 }}>
                  {brl.format(totalMin)} – {brl.format(totalMax)}
                </Text>
                <Text style={{ color: "#bdaeb3", fontSize: 11, marginTop: 4 }}>
                  {selectedItems.length} {selectedItems.length === 1 ? "serviço marcado" : "serviços marcados"}. Desmarque o que não deseja incluir na simulação.
                </Text>
              </View>
            </>
          )}
        </View>
      </View>

      <View style={{ marginTop: 14, padding: 12, backgroundColor: "#171217", borderWidth: 1, borderColor: "#46313a", borderRadius: 10 }}>
        <Text style={{ color: "#fff", fontSize: 12, fontWeight: "800", marginBottom: 5 }}>Importante: estimativa não é ordem de troca</Text>
        <Text style={{ color: "#b8a9ae", fontSize: 11, lineHeight: 17 }}>
          As faixas são referências gerais publicadas no Brasil, não cotações em tempo real nem preços específicos deste carro. O valor muda conforme região, oficina, peça e motorização. A FIPE identifica marca e modelo, mas não fornece plano de manutenção. Para saber quando trocar cada item, consulte o manual da versão exata e o histórico do veículo. Não substitua peças apenas por atingir a quilometragem.
        </Text>
        <Text style={{ color: "#9f9095", fontSize: 10, lineHeight: 15, marginTop: 8 }}>
          Fonte dos preços: Ipiranga, tabela de custos estimados de manutenção; referência consultada em novembro de 2026. Valores de referência: óleo R$ 150–350; filtros R$ 50–150; pastilhas R$ 150–400; pneus R$ 800–2.000; revisão geral R$ 300–800.
        </Text>
        <Text style={{ color: "#9f9095", fontSize: 10, lineHeight: 15, marginTop: 4 }}>
          Consulte a fonte: https://www.ipiranga.com.br/wps/portal/pt-br/ipiranga/blog-ipiranga/categorias/dicas-para-motoristas/carro-quanto-custa-manter
        </Text>
      </View>

      <SeletorModal
        visible={modalMarca}
        titulo="Selecionar marca (manutenção)"
        itens={marcas}
        carregando={carregandoMarcas}
        onClose={() => setModalMarca(false)}
        onSelect={(item) => selecionarMarcaFipe(item, false)}
      />

      <SeletorModal
        visible={modalModelo}
        titulo={`Modelo${marca ? ` · ${marca.name}` : ""}`}
        itens={modelos}
        carregando={carregandoModelos}
        onClose={() => setModalModelo(false)}
        onSelect={selecionarModeloFipe}
      />
    </View>
  );
}
