import React, { useEffect, useState } from "react";
import {
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatKm, validateKmUpdate } from "@/lib/preventive/engine";
import { pStyles, webAttr } from "./styles";

type Props = {
  visible: boolean;
  vehicleLabel: string;
  currentKm: number;
  onClose: () => void;
  onSave: (newKm: number) => void;
};

const QUICK_DELTAS = [100, 500, 1000, 2500];

export default function UpdateKmModal({
  visible,
  vehicleLabel,
  currentKm,
  onClose,
  onSave,
}: Props) {
  const [kmInput, setKmInput] = useState(String(currentKm));
  const [error, setError] = useState("");

  useEffect(() => {
    if (visible) {
      setKmInput(String(currentKm));
      setError("");
    }
  }, [visible, currentKm]);

  function handleQuickAdd(delta: number) {
    const base = Number(kmInput.replace(/[^\d]/g, "")) || currentKm;
    const next = Math.max(currentKm, base) + delta;
    setKmInput(String(next));
    setError("");
  }

  function handleConfirm() {
    const result = validateKmUpdate(currentKm, kmInput);
    if (!result.valid) {
      setError(result.error);
      return;
    }
    onSave(result.km);
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={pStyles.modalBackdrop}>
        <View style={[pStyles.modalSheet, { maxWidth: 460 }]}>
          <View style={pStyles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={pStyles.sectionEyebrow}>HODÔMETRO DO VEÍCULO</Text>
              <Text style={pStyles.modalTitle}>Atualizar quilometragem</Text>
              <Text style={pStyles.modalSubtitle}>{vehicleLabel}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={pStyles.modalCloseBtn}
              accessibilityRole="button"
              accessibilityLabel="Fechar modal de quilometragem"
            >
              <Ionicons name="close" size={18} color="#d9cdd2" />
            </TouchableOpacity>
          </View>

          <View
            style={{
              backgroundColor: "#181622",
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
              padding: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={{ color: "#a99ca2", fontSize: 12, fontWeight: "700" }}>
              Quilometragem atual cadastrada
            </Text>
            <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "900" }}>
              {formatKm(currentKm)}
            </Text>
          </View>

          <Text style={pStyles.fieldLabel}>Nova quilometragem (km)</Text>
          <TextInput
            style={[pStyles.input, { fontSize: 20, fontWeight: "800" }]}
            value={kmInput}
            onChangeText={(text) => {
              setKmInput(text.replace(/[^\d]/g, ""));
              setError("");
            }}
            keyboardType="numeric"
            placeholder={String(currentKm)}
            placeholderTextColor="#665d62"
            accessibilityLabel="Nova quilometragem em quilômetros"
          />

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 10,
            }}
          >
            {QUICK_DELTAS.map((delta) => (
              <TouchableOpacity
                key={delta}
                onPress={() => handleQuickAdd(delta)}
                activeOpacity={0.8}
                accessibilityRole="button"
                style={{
                  backgroundColor: "#1c1926",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.1)",
                  borderRadius: 99,
                  paddingHorizontal: 11,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ color: "#dfd4d8", fontSize: 12, fontWeight: "700" }}>
                  +{delta.toLocaleString("pt-BR")} km
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {error !== "" && (
            <View style={pStyles.errorBox}>
              <Ionicons name="alert-circle" size={18} color="#fca5a5" />
              <Text style={pStyles.errorText}>{error}</Text>
            </View>
          )}

          <Text
            style={{
              color: "#998c92",
              fontSize: 12,
              marginTop: 12,
              lineHeight: 18,
            }}
          >
            Todos os prazos e barras de progresso do semáforo serão recalculados
            automaticamente ao salvar.
          </Text>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
            <TouchableOpacity
              onPress={onClose}
              style={[pStyles.secondaryBtn, { flex: 1 }]}
              accessibilityRole="button"
            >
              <Text style={pStyles.secondaryBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              style={[pStyles.primaryCtaBtn, { flex: 1.4 }]}
              activeOpacity={0.85}
              accessibilityRole="button"
              {...webAttr({ "data-torque-cta": "1" })}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              <Text style={pStyles.primaryCtaText}>Salvar KM</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
