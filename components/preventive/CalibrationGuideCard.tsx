import React, { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PreventiveVehicle, TirePressureSpec } from "@/lib/preventive/types";
import { pStyles, webAttr } from "./styles";

type Props = {
  vehicle: PreventiveVehicle;
  onSaveTirePressure: (spec: TirePressureSpec) => void;
};

export default function CalibrationGuideCard({
  vehicle,
  onSaveTirePressure,
}: Props) {
  const [loadMode, setLoadMode] = useState<"empty" | "loaded">("empty");
  const [editing, setEditing] = useState(false);

  const spec = vehicle.tirePressure;
  const [frontEmpty, setFrontEmpty] = useState(
    spec ? String(spec.frontEmptyPsi) : ""
  );
  const [rearEmpty, setRearEmpty] = useState(
    spec ? String(spec.rearEmptyPsi) : ""
  );
  const [frontLoaded, setFrontLoaded] = useState(
    spec ? String(spec.frontLoadedPsi) : ""
  );
  const [rearLoaded, setRearLoaded] = useState(
    spec ? String(spec.rearLoadedPsi) : ""
  );
  const [error, setError] = useState("");

  function openEditor() {
    setFrontEmpty(spec ? String(spec.frontEmptyPsi) : "");
    setRearEmpty(spec ? String(spec.rearEmptyPsi) : "");
    setFrontLoaded(spec ? String(spec.frontLoadedPsi) : "");
    setRearLoaded(spec ? String(spec.rearLoadedPsi) : "");
    setError("");
    setEditing(true);
  }

  function handleSave() {
    const fe = Number(frontEmpty);
    const re = Number(rearEmpty);
    const fl = Number(frontLoaded);
    const rl = Number(rearLoaded);

    const values = [fe, re, fl, rl];
    if (values.some((v) => !Number.isFinite(v) || v < 20 || v > 65)) {
      setError("Informe pressões válidas entre 20 e 65 PSI (conforme etiqueta).");
      return;
    }

    onSaveTirePressure({
      frontEmptyPsi: fe,
      rearEmptyPsi: re,
      frontLoadedPsi: fl,
      rearLoadedPsi: rl,
      source: "user_confirmed",
      note: "Confirmado pelo motorista a partir da etiqueta/manual do veículo.",
    });
    setEditing(false);
    setError("");
  }

  const activeFront =
    spec && (loadMode === "empty" ? spec.frontEmptyPsi : spec.frontLoadedPsi);
  const activeRear =
    spec && (loadMode === "empty" ? spec.rearEmptyPsi : spec.rearLoadedPsi);

  return (
    <View
      style={pStyles.calibrationCard}
      {...webAttr({ "data-torque-card": "1" })}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <View style={{ flex: 1, minWidth: 220 }}>
          <View style={pStyles.eyebrowRow}>
            <Ionicons name="speedometer-outline" size={16} color="#ff6b7f" />
            <Text style={pStyles.sectionEyebrow}>GUIA DE CALIBRAGEM</Text>
          </View>
          <Text style={pStyles.sectionTitle}>Pressão dos pneus (PSI)</Text>
          <Text style={pStyles.sectionSubtitle}>
            {vehicle.brand} {vehicle.model} {vehicle.year}
            {vehicle.version ? ` · ${vehicle.version}` : ""}
          </Text>
        </View>

        {!editing && (
          <TouchableOpacity
            onPress={openEditor}
            style={pStyles.secondaryBtn}
            accessibilityRole="button"
          >
            <Ionicons
              name={spec ? "create-outline" : "add-circle-outline"}
              size={16}
              color="#ff8c9b"
            />
            <Text style={pStyles.secondaryBtnText}>
              {spec ? "Editar PSI da etiqueta" : "Informar PSI da etiqueta"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Opção Veículo Vazio vs Carregado/Viagem */}
      <View style={pStyles.loadToggleRow}>
        <TouchableOpacity
          onPress={() => setLoadMode("empty")}
          activeOpacity={0.8}
          accessibilityRole="button"
          style={[
            pStyles.loadToggleBtn,
            loadMode === "empty" && pStyles.loadToggleBtnActive,
          ]}
        >
          <Ionicons
            name="person-outline"
            size={15}
            color={loadMode === "empty" ? "#fff" : "#b7aab0"}
          />
          <Text
            style={[
              pStyles.loadToggleText,
              loadMode === "empty" && pStyles.loadToggleTextActive,
            ]}
          >
            Veículo vazio
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setLoadMode("loaded")}
          activeOpacity={0.8}
          accessibilityRole="button"
          style={[
            pStyles.loadToggleBtn,
            loadMode === "loaded" && pStyles.loadToggleBtnActive,
          ]}
        >
          <Ionicons
            name="briefcase-outline"
            size={15}
            color={loadMode === "loaded" ? "#fff" : "#b7aab0"}
          />
          <Text
            style={[
              pStyles.loadToggleText,
              loadMode === "loaded" && pStyles.loadToggleTextActive,
            ]}
          >
            Carregado / viagem
          </Text>
        </TouchableOpacity>
      </View>

      {spec ? (
        <>
          <View style={pStyles.psiGrid}>
            <View style={pStyles.psiBox}>
              <Text style={pStyles.psiPosition}>PNEUS DIANTEIROS</Text>
              <Text style={pStyles.psiNumber}>{activeFront}</Text>
              <Text style={pStyles.psiUnit}>PSI</Text>
            </View>
            <View style={pStyles.psiBox}>
              <Text style={pStyles.psiPosition}>PNEUS TRASEIROS</Text>
              <Text style={pStyles.psiNumber}>{activeRear}</Text>
              <Text style={pStyles.psiUnit}>PSI</Text>
            </View>
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginTop: 12,
              backgroundColor: "rgba(34, 197, 94, 0.1)",
              borderWidth: 1,
              borderColor: "rgba(34, 197, 94, 0.28)",
              borderRadius: 12,
              padding: 11,
            }}
          >
            <Ionicons name="checkmark-circle" size={16} color="#4ade80" />
            <Text style={{ flex: 1, color: "#dcfce7", fontSize: 12, lineHeight: 17 }}>
              Valores confirmados por você a partir da etiqueta do veículo (
              {loadMode === "empty" ? "uso diário / vazio" : "carregado / viagem"}
              ). Calibre sempre com os pneus frios.
            </Text>
          </View>
        </>
      ) : (
        <View
          style={{
            backgroundColor: "rgba(245, 158, 11, 0.1)",
            borderWidth: 1,
            borderColor: "rgba(245, 158, 11, 0.34)",
            borderRadius: 16,
            padding: 16,
            gap: 10,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="information-circle" size={20} color="#fbbf24" />
            <Text style={{ color: "#fde68a", fontSize: 14, fontWeight: "800", flex: 1 }}>
              Pressão oficial não confirmada para esta versão
            </Text>
          </View>
          <Text style={{ color: "#e5d5b0", fontSize: 13, lineHeight: 20 }}>
            A calibragem correta em <Text style={{ fontWeight: "800" }}>PSI</Text>{" "}
            varia conforme a versão exata e a medida do pneu/aro. Para sua
            segurança, o TorqueLab nunca inventa uma pressão como se fosse
            oficial.
          </Text>
          <Text style={{ color: "#d4c8cd", fontSize: 12, lineHeight: 19 }}>
            Onde conferir agora: abra a <Text style={{ fontWeight: "800", color: "#fff" }}>porta do motorista (etiqueta na coluna)</Text>, a{" "}
            <Text style={{ fontWeight: "800", color: "#fff" }}>tampa do tanque de combustível</Text> ou o{" "}
            <Text style={{ fontWeight: "800", color: "#fff" }}>manual do proprietário</Text>. Depois, salve os valores aqui para consultar em 1 segundo no posto.
          </Text>

          <View style={pStyles.psiGrid}>
            <View style={[pStyles.psiBox, { opacity: 0.78 }]}>
              <Text style={pStyles.psiPosition}>DIANTEIROS ({loadMode === "empty" ? "VAZIO" : "CARREGADO"})</Text>
              <Text style={[pStyles.psiNumber, { fontSize: 22, color: "#fcd34d" }]}>
                Consultar etiqueta
              </Text>
              <Text style={pStyles.psiUnit}>UNIDADE: PSI</Text>
            </View>
            <View style={[pStyles.psiBox, { opacity: 0.78 }]}>
              <Text style={pStyles.psiPosition}>TRASEIROS ({loadMode === "empty" ? "VAZIO" : "CARREGADO"})</Text>
              <Text style={[pStyles.psiNumber, { fontSize: 22, color: "#fcd34d" }]}>
                Consultar etiqueta
              </Text>
              <Text style={pStyles.psiUnit}>UNIDADE: PSI</Text>
            </View>
          </View>
        </View>
      )}

      {editing && (
        <View
          style={{
            marginTop: 14,
            backgroundColor: "#181622",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.1)",
            borderRadius: 16,
            padding: 16,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 14, fontWeight: "800" }}>
            Salvar PSI oficial da etiqueta do seu carro
          </Text>
          <Text style={{ color: "#a799a0", fontSize: 12, marginTop: 3 }}>
            Copie os números exatos da etiqueta do veículo ou do manual.
          </Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            <View style={{ flex: 1, minWidth: 130 }}>
              <Text style={pStyles.fieldLabel}>Dianteiro — Vazio (PSI)</Text>
              <TextInput
                style={pStyles.input}
                value={frontEmpty}
                onChangeText={(t) => {
                  setFrontEmpty(t.replace(/[^\d]/g, ""));
                  setError("");
                }}
                keyboardType="numeric"
                placeholder="Ex.: 32"
                placeholderTextColor="#665d62"
              />
            </View>
            <View style={{ flex: 1, minWidth: 130 }}>
              <Text style={pStyles.fieldLabel}>Traseiro — Vazio (PSI)</Text>
              <TextInput
                style={pStyles.input}
                value={rearEmpty}
                onChangeText={(t) => {
                  setRearEmpty(t.replace(/[^\d]/g, ""));
                  setError("");
                }}
                keyboardType="numeric"
                placeholder="Ex.: 30"
                placeholderTextColor="#665d62"
              />
            </View>
            <View style={{ flex: 1, minWidth: 130 }}>
              <Text style={pStyles.fieldLabel}>Dianteiro — Carregado (PSI)</Text>
              <TextInput
                style={pStyles.input}
                value={frontLoaded}
                onChangeText={(t) => {
                  setFrontLoaded(t.replace(/[^\d]/g, ""));
                  setError("");
                }}
                keyboardType="numeric"
                placeholder="Ex.: 34"
                placeholderTextColor="#665d62"
              />
            </View>
            <View style={{ flex: 1, minWidth: 130 }}>
              <Text style={pStyles.fieldLabel}>Traseiro — Carregado (PSI)</Text>
              <TextInput
                style={pStyles.input}
                value={rearLoaded}
                onChangeText={(t) => {
                  setRearLoaded(t.replace(/[^\d]/g, ""));
                  setError("");
                }}
                keyboardType="numeric"
                placeholder="Ex.: 36"
                placeholderTextColor="#665d62"
              />
            </View>
          </View>

          {error !== "" && (
            <View style={pStyles.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#fca5a5" />
              <Text style={pStyles.errorText}>{error}</Text>
            </View>
          )}

          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <TouchableOpacity
              onPress={() => setEditing(false)}
              style={[pStyles.secondaryBtn, { flex: 1 }]}
              accessibilityRole="button"
            >
              <Text style={pStyles.secondaryBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              style={[pStyles.primaryCtaBtn, { flex: 1.4 }]}
              accessibilityRole="button"
            >
              <Text style={pStyles.primaryCtaText}>Salvar calibragem</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
