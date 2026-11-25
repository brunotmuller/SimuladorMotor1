import React, { useEffect, useState } from "react";
import {
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MaintenanceEvaluation } from "@/lib/preventive/types";
import { formatDateBR, formatKm, toIsoDate } from "@/lib/preventive/engine";
import { pStyles, webAttr } from "./styles";

type Props = {
  evaluation: MaintenanceEvaluation | null;
  currentKm: number;
  onClose: () => void;
  onConfirm: (params: {
    itemId: MaintenanceEvaluation["definition"]["id"];
    performedDate: string;
    performedKm: number;
    notes?: string;
  }) => void;
};

function parseDateInputToIso(input: string): string | null {
  const trimmed = input.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const brMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (brMatch) {
    const [, dd, mm, yyyy] = brMatch;
    const d = Number(dd);
    const m = Number(mm);
    const y = Number(yyyy);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2000 && y <= 2100) {
      return `${yyyy}-${mm}-${dd}`;
    }
  }
  return null;
}

export default function ConfirmServiceModal({
  evaluation,
  currentKm,
  onClose,
  onConfirm,
}: Props) {
  const [dateBr, setDateBr] = useState("");
  const [kmText, setKmText] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (evaluation) {
      setDateBr(formatDateBR(toIsoDate(new Date())));
      setKmText(String(currentKm));
      setNotes("");
      setError("");
    }
  }, [evaluation, currentKm]);

  if (!evaluation) return null;

  function handleConfirm() {
    if (!evaluation) return;
    const isoDate = parseDateInputToIso(dateBr);
    if (!isoDate) {
      setError("Informe uma data válida no formato DD/MM/AAAA.");
      return;
    }
    const km = Number(kmText.replace(/[^\d]/g, ""));
    if (!Number.isFinite(km) || km < 0 || km > 2_000_000) {
      setError("Informe uma quilometragem válida.");
      return;
    }

    onConfirm({
      itemId: evaluation.definition.id,
      performedDate: isoDate,
      performedKm: km,
      notes,
    });
    onClose();
  }

  return (
    <Modal
      visible={!!evaluation}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={pStyles.modalBackdrop}>
        <View style={[pStyles.modalSheet, { maxWidth: 480 }]}>
          <View style={pStyles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={pStyles.sectionEyebrow}>REGISTRAR MANUTENÇÃO</Text>
              <Text style={pStyles.modalTitle}>Já fiz essa troca</Text>
              <Text style={pStyles.modalSubtitle}>
                {evaluation.definition.name}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={pStyles.modalCloseBtn}
              accessibilityRole="button"
              accessibilityLabel="Fechar confirmação"
            >
              <Ionicons name="close" size={18} color="#d9cdd2" />
            </TouchableOpacity>
          </View>

          <View
            style={{
              backgroundColor: "rgba(34, 197, 94, 0.1)",
              borderWidth: 1,
              borderColor: "rgba(34, 197, 94, 0.3)",
              borderRadius: 12,
              padding: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Ionicons name="checkmark-circle" size={20} color="#4ade80" />
            <Text
              style={{
                flex: 1,
                color: "#dcfce7",
                fontSize: 12,
                lineHeight: 18,
                fontWeight: "600",
              }}
            >
              Ao confirmar, o status voltará para Verde, a barra de progresso
              será reiniciada, a próxima previsão será recalculada e o serviço
              ficará salvo no histórico.
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={pStyles.fieldLabel}>Data realizada (DD/MM/AAAA)</Text>
              <TextInput
                style={pStyles.input}
                value={dateBr}
                onChangeText={(t) => {
                  setDateBr(t);
                  setError("");
                }}
                placeholder="25/11/2026"
                placeholderTextColor="#665d62"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={pStyles.fieldLabel}>Quilometragem (km)</Text>
              <TextInput
                style={pStyles.input}
                value={kmText}
                onChangeText={(t) => {
                  setKmText(t.replace(/[^\d]/g, ""));
                  setError("");
                }}
                keyboardType="numeric"
                placeholder={String(currentKm)}
                placeholderTextColor="#665d62"
              />
            </View>
          </View>

          <Text style={pStyles.fieldLabel}>Observação (opcional)</Text>
          <TextInput
            style={pStyles.input}
            value={notes}
            onChangeText={setNotes}
            placeholder="Ex.: Oficina do bairro, óleo 5W30 sintético"
            placeholderTextColor="#665d62"
            maxLength={120}
          />

          <Text
            style={{
              color: "#9d9096",
              fontSize: 11,
              marginTop: 8,
            }}
          >
            Quilometragem atual do carro: {formatKm(currentKm)}
          </Text>

          {error !== "" && (
            <View style={pStyles.errorBox}>
              <Ionicons name="alert-circle" size={18} color="#fca5a5" />
              <Text style={pStyles.errorText}>{error}</Text>
            </View>
          )}

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
              style={[
                pStyles.primaryCtaBtn,
                { flex: 1.5, backgroundColor: "#16a34a" },
              ]}
              activeOpacity={0.85}
              accessibilityRole="button"
              {...webAttr({ "data-torque-cta": "1" })}
            >
              <Ionicons name="checkmark-done" size={18} color="#fff" />
              <Text style={pStyles.primaryCtaText}>Confirmar troca</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
