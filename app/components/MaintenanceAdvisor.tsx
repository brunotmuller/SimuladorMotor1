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

type MaintenanceItem = {
  id: string;
  name: string;
  minKm: number;
  cycleLabel: string;
  baseCost: number;
  combustionOnly?: boolean;
  note?: string;
};

const SERVICES: MaintenanceItem[] = [
  {
    id: "oil",
    name: "Óleo do motor + filtro de óleo",
    minKm: 10000,
    cycleLabel: "A cada 10.000 km",
    baseCost: 340,
    combustionOnly: true,
  },
  {
    id: "alignment",
    name: "Alinhamento, balanceamento e rodízio",
    minKm: 10000,
    cycleLabel: "A cada 10.000 km",
    baseCost: 190,
  },
  {
    id: "cabin",
    name: "Filtro de cabine (ar-condicionado)",
    minKm: 15000,
    cycleLabel: "A cada 15.000 km",
    baseCost: 95,
  },
  {
    id: "air",
    name: "Filtros de ar do motor e combustível",
    minKm: 20000,
    cycleLabel: "A cada 20.000 km",
    baseCost: 150,
    combustionOnly: true,
  },
  {
    id: "brake-fluid",
    name: "Fluido de freio e inspeção de sistema",
    minKm: 30000,
    cycleLabel: "A cada 30.000 km",
    baseCost: 260,
  },
  {
    id: "plugs",
    name: "Jogo de velas de ignição",
    minKm: 40000,
    cycleLabel: "A cada 40.000 km",
    baseCost: 380,
    combustionOnly: true,
  },
  {
    id: "pads",
    name: "Pastilhas de freio + aditivo arrefecimento",
    minKm: 50000,
    cycleLabel: "Marco de 50.000 km",
    baseCost: 490,
  },
  {
    id: "belt",
    name: "Kit correia dentada e tensor",
    minKm: 60000,
    cycleLabel: "Marco de 60.000 km",
    baseCost: 1150,
    combustionOnly: true,
    note: "Confirme se o motor usa correia ou corrente",
  },
  {
    id: "suspension",
    name: "Revisão de suspensão e limpeza de bicos",
    minKm: 80000,
    cycleLabel: "Marco de 80.000 km",
    baseCost: 1280,
  },
  {
    id: "trans",
    name: "Fluido de câmbio e bomba d'água",
    minKm: 100000,
    cycleLabel: "Marco de 100.000 km",
    baseCost: 980,
    combustionOnly: true,
  },
];

const INITIAL_INSPECTION: MaintenanceItem = {
  id: "initial",
  name: "Inspeção inicial, calibragem e níveis",
  minKm: 0,
  cycleLabel: "Abaixo de 10.000 km",
  baseCost: 150,
};

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

const roundPrice = (base: number, factor: number) =>
  Math.round((base * factor) / 10) * 10;

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function inferVehicleProfile(name: string) {
  const norm = normalizeText(name);

  const isElectric = [
    "byd",
    "dolphin",
    "seal",
    "yuan",
    "ora ",
    "e-tech",
    "eletrico",
    "electric",
    " ev",
    "tesla",
    "leaf",
    "zoe",
    "taycan",
    "i3 ",
    "ix",
  ].some((k) => norm.includes(k));

  if (
    [
      "bmw",
      "mercedes",
      "audi",
      "porsche",
      "volvo",
      "land rover",
      "jaguar",
      "lexus",
      "mini",
      "maserati",
      "ram",
      "dodge",
    ].some((k) => norm.includes(k))
  ) {
    return { factor: 1.85, tierLabel: "Premium / Importado", isElectric };
  }

  if (
    [
      "diesel",
      "hilux",
      "sw4",
      "s10",
      "ranger",
      "amarok",
      "frontier",
      "l200",
      "triton",
      "toro",
      "rampage",
      "pajero",
      "trailblazer",
      "4x4",
      "v6",
      "v8",
    ].some((k) => norm.includes(k))
  ) {
    return { factor: 1.45, tierLabel: "Picape / Utilitário / Diesel", isElectric };
  }

  if (
    [
      "corolla",
      "civic",
      "compass",
      "renegade",
      "commander",
      "t-cross",
      "tcross",
      "creta",
      "hr-v",
      "hrv",
      "tracker",
      "nivus",
      "taos",
      "tiggo",
      "haval",
      "song",
      "cruze",
      "jetta",
      "sentra",
      "kicks",
      "duster",
      "oroch",
      "spin",
      "equinox",
      "suv",
      "turbo",
      "tsi",
      "t270",
      "t200",
      "2.0",
      "1.8",
      "1.6",
      "1.5",
      "1.4",
    ].some((k) => norm.includes(k))
  ) {
    return { factor: 1.22, tierLabel: "Médio / SUV / Turbo", isElectric };
  }

  return { factor: 1.0, tierLabel: "Compacto / Passeio", isElectric };
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

  // Auto-populate from simulator vehicle when it changes
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
      if (abrirModelosDepois) {
        setModalModelo(true);
      }
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

  // Sugestão de marca FIPE com base no texto digitado pelo usuário
  const marcaSugerida = useMemo(() => {
    const termo = normalizeText(carroDigitado.trim());
    if (termo.length < 2 || marcas.length === 0) return null;

    const direto = marcas.find((m) => normalizeText(m.name).includes(termo));
    if (direto) return direto;

    const matchModelo = MODEL_TO_BRAND.find((entry) =>
      entry.keywords.some((kw) => termo.includes(kw))
    );
    if (!matchModelo) return null;

    return (
      marcas.find((m) => normalizeText(m.name).includes(matchModelo.brandHint)) ??
      null
    );
  }, [carroDigitado, marcas]);

  const activeVehicleLabel = useMemo(() => {
    const typed = carroDigitado.trim();
    if (typed.length > 0) return typed;
    if (marca && modelo) return `${marca.name} ${modelo.name}`;
    if (marca) return marca.name;
    return "Veículo de passeio (padrão)";
  }, [carroDigitado, marca, modelo]);

  const profile = useMemo(
    () => inferVehicleProfile(activeVehicleLabel),
    [activeVehicleLabel]
  );

  const kmNumber = Number(currentKm);
  const validKm =
    currentKm.trim() !== "" && Number.isFinite(kmNumber) && kmNumber >= 0;

  const eligibleServices = useMemo(
    () =>
      profile.isElectric
        ? SERVICES.filter((item) => !item.combustionOnly)
        : SERVICES,
    [profile.isElectric]
  );

  const dueItems = useMemo(() => {
    if (!validKm) return [];
    const matched = eligibleServices.filter((item) => kmNumber >= item.minKm);
    const list = matched.length > 0 ? matched : [INITIAL_INSPECTION];
    return list.map((item) => ({
      ...item,
      cost: roundPrice(item.baseCost, profile.factor),
    }));
  }, [validKm, kmNumber, eligibleServices, profile.factor]);

  const nextMilestone = useMemo(() => {
    if (!validKm) return null;
    return eligibleServices.find((item) => item.minKm > kmNumber) ?? null;
  }, [validKm, kmNumber, eligibleServices]);

  const totalCost = useMemo(
    () =>
      dueItems
        .filter((item) => !excludedIds.includes(item.id))
        .reduce((acc, item) => acc + item.cost, 0),
    [dueItems, excludedIds]
  );

  const selectedCount = dueItems.filter(
    (item) => !excludedIds.includes(item.id)
  ).length;

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
      <Text style={styles.tituloSecao}>Calculadora de manutenção</Text>
      <Text style={styles.descricaoSecao}>
        Pesquise qualquer carro por marca e modelo na Tabela FIPE ou digite o
        nome do veículo diretamente, informe a quilometragem e veja tudo o que
        precisa trocar com o valor de cada item e o total.
      </Text>

      <View
        {...(Platform.OS === "web"
          ? ({ "data-torque-columns": "1" } as object)
          : {})}
      >
        {/* Coluna esquerda: busca por marca/modelo FIPE ou nome livre + KM */}
        <View>
          {veiculoAtual && (
            <View
              style={{
                alignSelf: "flex-start",
                backgroundColor: "#1a1f1a",
                borderWidth: 1,
                borderColor: "#2a4a2a",
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 6,
                marginBottom: 14,
              }}
            >
              <Text style={{ color: "#7ec67e", fontSize: 11, fontWeight: "600" }}>
                ✓ Usando: {veiculoAtual.marca.name} {veiculoAtual.modelo.name}
              </Text>
            </View>
          )}

          <Text style={styles.label}>
            1. Pesquisar por marca e modelo (FIPE)
          </Text>
          <View style={styles.linha}>
            <View style={[styles.campoMetade, styles.campoEsquerda]}>
              <TouchableOpacity
                style={[
                  styles.seletor,
                  (carregandoMarcas || marcas.length === 0) && styles.desativado,
                ]}
                disabled={carregandoMarcas || marcas.length === 0}
                activeOpacity={0.8}
                onPress={() => setModalMarca(true)}
                accessibilityRole="button"
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.seletorTexto,
                    !marca && styles.placeholder,
                  ]}
                >
                  {carregandoMarcas
                    ? "Carregando..."
                    : marca?.name || "Selecionar marca"}
                </Text>
                {carregandoMarcas ? (
                  <ActivityIndicator size="small" color="#ef3340" />
                ) : (
                  <Text style={styles.chevron}>›</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.campoMetade}>
              <TouchableOpacity
                style={[
                  styles.seletor,
                  (!marca || carregandoModelos || modelos.length === 0) &&
                    styles.desativado,
                ]}
                disabled={!marca || carregandoModelos || modelos.length === 0}
                activeOpacity={0.8}
                onPress={() => setModalModelo(true)}
                accessibilityRole="button"
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.seletorTexto,
                    !modelo && styles.placeholder,
                  ]}
                >
                  {carregandoModelos
                    ? "Carregando..."
                    : modelo?.name ||
                      (marca ? "Selecionar modelo" : "Escolha a marca")}
                </Text>
                {carregandoModelos ? (
                  <ActivityIndicator size="small" color="#ef3340" />
                ) : (
                  <Text style={styles.chevron}>›</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {erroFipe !== "" && (
            <Text style={{ color: "#ff8797", fontSize: 11, marginBottom: 10 }}>
              {erroFipe}
            </Text>
          )}

          <Text style={styles.label}>Ou digite qualquer carro diretamente</Text>
          <TextInput
            value={carroDigitado}
            onChangeText={(texto) => {
              setCarroDigitado(texto);
              if (texto.trim().length > 0) {
                setErroFipe("");
              }
            }}
            placeholder="Ex.: Honda Civic, Hilux Diesel, Gol 1.6, BYD Dolphin..."
            placeholderTextColor="#6f6267"
            style={[styles.input, { marginBottom: marcaSugerida ? 8 : 14 }]}
          />

          {marcaSugerida && carroDigitado.trim().length >= 2 && (
            <TouchableOpacity
              onPress={() => selecionarMarcaFipe(marcaSugerida, true)}
              activeOpacity={0.85}
              accessibilityRole="button"
              style={{
                alignSelf: "flex-start",
                backgroundColor: "#1d1419",
                borderWidth: 1,
                borderColor: "#57313b",
                borderRadius: 9,
                paddingHorizontal: 11,
                paddingVertical: 7,
                marginBottom: 14,
              }}
            >
              <Text style={{ color: "#ff8797", fontSize: 11, fontWeight: "700" }}>
                Ver modelos de {marcaSugerida.name} na FIPE →
              </Text>
            </TouchableOpacity>
          )}

          <Text style={styles.label}>2. Quilometragem atual (km)</Text>
          <TextInput
            value={currentKm}
            onChangeText={(value) =>
              setCurrentKm(value.replace(/[^0-9]/g, "").slice(0, 7))
            }
            keyboardType="numeric"
            placeholder="Ex.: 60000"
            placeholderTextColor="#6f6267"
            style={[styles.input, { marginBottom: 10 }]}
          />

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 6,
              marginBottom: 14,
            }}
          >
            {KM_PRESETS.map((preset) => {
              const active = validKm && kmNumber === preset;
              return (
                <TouchableOpacity
                  key={preset}
                  onPress={() => setCurrentKm(String(preset))}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  style={{
                    backgroundColor: active ? "#2b161d" : "#151218",
                    borderWidth: 1,
                    borderColor: active ? "#e43b55" : "#33272e",
                    borderRadius: 99,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                  }}
                >
                  <Text
                    style={{
                      color: active ? "#ff8797" : "#b8a9ae",
                      fontSize: 11,
                      fontWeight: "700",
                    }}
                  >
                    {formatKm(preset)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={{ color: "#9d8e93", fontSize: 11, lineHeight: 17 }}>
            Perfil detectado:{" "}
            <Text style={{ color: "#e8dde0", fontWeight: "700" }}>
              {profile.tierLabel}
              {profile.isElectric ? " · Elétrico" : ""}
            </Text>
            . Toque em qualquer item ao lado para desmarcar o que você já trocou.
          </Text>
        </View>

        {/* Coluna direita: itens a trocar, preço individual e valor final */}
        <View
          style={{
            backgroundColor: "#0c0b10",
            borderWidth: 1,
            borderColor: "#3e2b34",
            borderRadius: 16,
            padding: 18,
          }}
        >
          {!validKm ? (
            <Text style={{ color: "#b8a9ae", fontSize: 13, lineHeight: 20 }}>
              Digite a quilometragem atual ou escolha um atalho ao lado para
              ver os itens e o orçamento estimado.
            </Text>
          ) : (
            <>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingBottom: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: "#261d22",
                  gap: 12,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: "#ff8797",
                      fontSize: 10,
                      fontWeight: "900",
                      letterSpacing: 0.8,
                    }}
                  >
                    {activeVehicleLabel.toUpperCase()} • {formatKm(kmNumber)}
                  </Text>
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: 16,
                      fontWeight: "800",
                      marginTop: 3,
                    }}
                  >
                    O que trocar / revisar ({selectedCount})
                  </Text>
                </View>

                <View style={{ alignItems: "flex-end" }}>
                  <Text
                    style={{ color: "#a8999e", fontSize: 10, fontWeight: "700" }}
                  >
                    TOTAL ESTIMADO
                  </Text>
                  <Text
                    style={{
                      color: "#43c977",
                      fontSize: 22,
                      fontWeight: "900",
                      marginTop: 1,
                    }}
                  >
                    {brl.format(totalCost)}
                  </Text>
                </View>
              </View>

              {dueItems.map((item) => {
                const checked = !excludedIds.includes(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => toggleItem(item.id)}
                    activeOpacity={0.8}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingVertical: 11,
                      borderBottomWidth: 1,
                      borderBottomColor: "#1f181c",
                      gap: 10,
                      opacity: checked ? 1 : 0.45,
                    }}
                  >
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: checked ? "#e43b55" : "#56434a",
                        backgroundColor: checked ? "#e43b55" : "transparent",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {checked && (
                        <Text
                          style={{
                            color: "#fff",
                            fontSize: 11,
                            fontWeight: "900",
                          }}
                        >
                          ✓
                        </Text>
                      )}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: "#fff",
                          fontSize: 13,
                          fontWeight: "700",
                          textDecorationLine: checked ? "none" : "line-through",
                        }}
                      >
                        {item.name}
                      </Text>
                      <Text
                        style={{ color: "#9f9095", fontSize: 11, marginTop: 2 }}
                      >
                        {item.cycleLabel}
                        {item.note ? ` · ${item.note}` : ""}
                      </Text>
                    </View>

                    <Text
                      style={{
                        color: checked ? "#fff" : "#8b7c81",
                        fontSize: 13,
                        fontWeight: "800",
                      }}
                    >
                      {brl.format(item.cost)}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: "#1a1216",
                  borderWidth: 1,
                  borderColor: "#63323e",
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  marginTop: 14,
                }}
              >
                <View>
                  <Text
                    style={{
                      color: "#ff8797",
                      fontSize: 10,
                      fontWeight: "900",
                      letterSpacing: 0.8,
                    }}
                  >
                    VALOR FINAL ESTIMADO
                  </Text>
                  <Text style={{ color: "#bdaeb3", fontSize: 11, marginTop: 2 }}>
                    Peças + mão de obra ({selectedCount}{" "}
                    {selectedCount === 1 ? "item" : "itens"})
                  </Text>
                </View>
                <Text style={{ color: "#fff", fontSize: 22, fontWeight: "900" }}>
                  {brl.format(totalCost)}
                </Text>
              </View>

              {nextMilestone && (
                <Text style={{ color: "#a99aa0", fontSize: 11, marginTop: 10 }}>
                  Próximo marco: {nextMilestone.name} aos{" "}
                  {formatKm(nextMilestone.minKm)} (+
                  {brl.format(roundPrice(nextMilestone.baseCost, profile.factor))}
                  ).
                </Text>
              )}
            </>
          )}
        </View>
      </View>

      <Text
        style={{
          color: "#8f8085",
          fontSize: 11,
          lineHeight: 16,
          marginTop: 14,
        }}
      >
        Estimativa média de referência no Brasil (peças + mão de obra) ajustada
        ao porte do veículo para fins educativos. Valores e intervalos variam
        conforme oficina, região e manual do fabricante.
      </Text>

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
