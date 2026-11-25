import React, { useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MAINTENANCE_CATALOG } from "@/lib/preventive/catalog";
import { formatDateBR, formatKm } from "@/lib/preventive/engine";
import {
  MaintenanceHistoryEntry,
  MaintenanceItemId,
} from "@/lib/preventive/types";
import { pStyles, webAttr } from "./styles";

type Props = {
  vehicleLabel: string;
  history: MaintenanceHistoryEntry[];
  compact?: boolean;
  onOpenFullHistory?: () => void;
};

export default function ServiceHistorySection({
  vehicleLabel,
  history,
  compact = false,
  onOpenFullHistory,
}: Props) {
  const [selectedItemId, setSelectedItemId] = useState<
    MaintenanceItemId | "all"
  >("all");

  const sortedHistory = useMemo(() => {
    const base = [...history].sort((a, b) => {
      if (a.performedDate !== b.performedDate) {
        return b.performedDate.localeCompare(a.performedDate);
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
    if (selectedItemId === "all") return base;
    return base.filter((entry) => entry.itemId === selectedItemId);
  }, [history, selectedItemId]);

  const visibleEntries = compact ? sortedHistory.slice(0, 3) : sortedHistory;

  return (
    <View style={pStyles.historyCard} {...webAttr({ "data-torque-card": "1" })}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <View style={{ flex: 1, minWidth: 200 }}>
          <Text style={pStyles.sectionEyebrow}>REGISTROS REALIZADOS</Text>
          <Text style={pStyles.sectionTitle}>Histórico de serviços</Text>
          <Text style={pStyles.sectionSubtitle}>
            {vehicleLabel} · {history.length}{" "}
            {history.length === 1
              ? "serviço registrado"
              : "serviços registrados"}
          </Text>
        </View>

        {compact && onOpenFullHistory && (
          <TouchableOpacity
            onPress={onOpenFullHistory}
            style={pStyles.secondaryBtn}
            accessibilityRole="button"
          >
            <Ionicons name="time-outline" size={16} color="#ff8c9b" />
            <Text style={pStyles.secondaryBtnText}>Ver histórico completo</Text>
          </TouchableOpacity>
        )}
      </View>

      {!compact && history.length > 0 && (
        <View style={[pStyles.filterRow, { marginBottom: 14 }]}>
          <TouchableOpacity
            onPress={() => setSelectedItemId("all")}
            style={[
              pStyles.filterPill,
              selectedItemId === "all" && pStyles.filterPillActive,
            ]}
            accessibilityRole="button"
          >
            <Text
              style={[
                pStyles.filterPillText,
                selectedItemId === "all" && pStyles.filterPillTextActive,
              ]}
            >
              Todos ({history.length})
            </Text>
          </TouchableOpacity>
          {MAINTENANCE_CATALOG.map((item) => {
            const count = history.filter((h) => h.itemId === item.id).length;
            if (count === 0) return null;
            const active = selectedItemId === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => setSelectedItemId(item.id)}
                style={[pStyles.filterPill, active && pStyles.filterPillActive]}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    pStyles.filterPillText,
                    active && pStyles.filterPillTextActive,
                  ]}
                >
                  {item.shortName} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {visibleEntries.length === 0 ? (
        <View style={pStyles.emptyBox}>
          <Ionicons name="clipboard-outline" size={28} color="#8f8288" />
          <Text style={pStyles.emptyTitle}>
            Nenhuma manutenção registrada ainda
          </Text>
          <Text style={pStyles.emptySub}>
            Quando você concluir um serviço e clicar em “Já fiz essa troca”, o
            registro aparecerá aqui organizado por data com a próxima previsão.
          </Text>
        </View>
      ) : (
        <View>
          {visibleEntries.map((entry, idx) => (
            <View
              key={entry.id}
              style={[
                pStyles.historyRow,
                idx === 0 && { borderTopWidth: 0, paddingTop: 4 },
              ]}
            >
              <View style={pStyles.historyDot}>
                <Ionicons name="checkmark" size={16} color="#4ade80" />
              </View>
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 6,
                  }}
                >
                  <Text
                    style={{
                      color: "#ffffff",
                      fontSize: 14,
                      fontWeight: "800",
                    }}
                  >
                    {entry.serviceName}
                  </Text>
                  <Text
                    style={{
                      color: "#ff8c9b",
                      fontSize: 12,
                      fontWeight: "700",
                    }}
                  >
                    {formatDateBR(entry.performedDate)}
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 12,
                    marginTop: 5,
                  }}
                >
                  <Text style={{ color: "#c9bcc1", fontSize: 12 }}>
                    Quilometragem:{" "}
                    <Text style={{ color: "#fff", fontWeight: "700" }}>
                      {formatKm(entry.performedKm)}
                    </Text>
                  </Text>
                  <Text style={{ color: "#c9bcc1", fontSize: 12 }}>
                    Próxima previsão:{" "}
                    <Text style={{ color: "#86efac", fontWeight: "700" }}>
                      {entry.nextForecastLabel}
                    </Text>
                  </Text>
                </View>

                {!!entry.notes && (
                  <Text
                    style={{
                      color: "#9d9096",
                      fontSize: 12,
                      marginTop: 5,
                      fontStyle: "italic",
                    }}
                  >
                    “{entry.notes}”
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
