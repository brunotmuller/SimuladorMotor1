import React, { useMemo, useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

type CarReference = { id: string; label: string; engine: string };
const CARS: CarReference[] = [
  { id: "strada", label: "Fiat Strada", engine: "1.3 / 1.0 turbo — versões variam" },
  { id: "polo", label: "Volkswagen Polo", engine: "1.0 MPI / 1.0 TSI — versões variam" },
  { id: "onix", label: "Chevrolet Onix", engine: "1.0 / 1.0 turbo — versões variam" },
  { id: "hb20", label: "Hyundai HB20", engine: "1.0 / 1.0 turbo — versões variam" },
  { id: "argo", label: "Fiat Argo", engine: "1.0 / 1.3 — versões variam" },
  { id: "tcross", label: "Volkswagen T-Cross", engine: "1.0 TSI / 1.4 TSI — versões variam" },
  { id: "creta", label: "Hyundai Creta", engine: "1.0 turbo / 1.6 / 2.0 — versões variam" },
  { id: "compass", label: "Jeep Compass", engine: "1.3 turbo / 2.0 diesel — versões variam" },
  { id: "corolla", label: "Toyota Corolla", engine: "1.8 híbrido / 2.0 flex — versões variam" },
  { id: "hrv", label: "Honda HR-V", engine: "1.5 / 1.8 — versões variam" },
];

type Service = { id: string; name: string; interval: number; detail: string; warning?: string };
const SERVICES: Service[] = [
  { id: "oil", name: "Óleo do motor + filtro", interval: 10000, detail: "Referência de teste: a cada 10.000 km. O prazo em meses e a especificação do óleo também contam." },
  { id: "air", name: "Filtro de ar do motor", interval: 20000, detail: "Referência de teste: inspeção periódica e troca por volta de 20.000 km; poeira pode antecipar." },
  { id: "cabin", name: "Filtro de cabine / ar-condicionado", interval: 15000, detail: "Referência de teste: cerca de 15.000 km; uso intenso e poeira podem exigir troca antes." },
  { id: "plugs", name: "Velas de ignição", interval: 40000, detail: "Referência de teste: 40.000 km. O tipo de vela e o motor podem alterar bastante o intervalo." },
  { id: "belt", name: "Correia dentada", interval: 60000, detail: "Marco de triagem para verificar o plano de troca, não uma regra universal.", warning: "Alguns motores usam corrente ou correia banhada a óleo. Confirme o tipo e o intervalo exato no manual antes de programar a troca." },
];

const palette = { panel: "#111115", border: "#3a2a32", red: "#e43b55", text: "#fff", muted: "#b9aeb3", input: "#0b0a0e" };
const formatKm = (value: number) => Math.max(0, value).toLocaleString("pt-BR") + " km";

export default function MaintenanceAdvisor() {
  const [carId, setCarId] = useState(CARS[0].id);
  const [currentKm, setCurrentKm] = useState("");
  const [lastKm, setLastKm] = useState<Record<string, string>>({});
  const [calculated, setCalculated] = useState(false);
  const car = useMemo(() => CARS.find((item) => item.id === carId) ?? CARS[0], [carId]);
  const kmNumber = Number(currentKm);

  const card = { backgroundColor: palette.panel, borderColor: palette.border, borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 12 } as const;
  const label = { color: palette.muted, fontSize: 11, fontWeight: "800" as const, marginBottom: 7 };
  const input = { backgroundColor: palette.input, borderWidth: 1, borderColor: palette.border, borderRadius: 10, color: palette.text, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14 } as const;

  function resultado(service: Service) {
    const raw = lastKm[service.id];
    if (raw === undefined || raw.trim() === "") return null;
    const last = Number(raw);
    if (!Number.isFinite(last) || last < 0 || last > kmNumber) return { invalid: true as const };
    const due = last + service.interval;
    const remaining = due - kmNumber;
    return { invalid: false as const, due, remaining, overdue: remaining <= 0 };
  }

  const validCurrent = currentKm.trim() !== "" && Number.isFinite(kmNumber) && kmNumber >= 0;

  return (
    <View nativeID="maintenance-section" style={{ marginTop: 22 }}>
      <View style={{ marginBottom: 8 }}>
        <Text style={{ color: "#ef7185", fontSize: 10, fontWeight: "900", letterSpacing: 1.8, marginBottom: 7 }}>05 / CUIDADOS DO VEÍCULO</Text>
        <Text style={{ color: palette.text, fontSize: 25, fontWeight: "900", letterSpacing: -0.7, marginBottom: 7 }}>Manutenção por quilometragem</Text>
        <Text style={{ color: palette.muted, fontSize: 13, lineHeight: 20 }}>Informe o odômetro e a quilometragem da última troca. O TorqueLab calcula o próximo marco de cada serviço.</Text>
      </View>

      <View style={card}>
        <Text style={label}>SELECIONE O VEÍCULO</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 15 }}>
          {CARS.map((item) => {
            const active = carId === item.id;
            return <TouchableOpacity key={item.id} onPress={() => { setCarId(item.id); setCalculated(false); }} accessibilityRole="button" accessibilityState={{ selected: active }} style={{ backgroundColor: active ? "#421a23" : palette.input, borderWidth: 1, borderColor: active ? palette.red : palette.border, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 9 }}>
              <Text style={{ color: active ? "#fff" : palette.muted, fontSize: 11, fontWeight: "700" }}>{item.label}</Text>
            </TouchableOpacity>;
          })}
        </View>
        <Text style={{ color: palette.muted, fontSize: 10, marginBottom: 14 }}>{car.engine}</Text>
        <Text style={label}>QUILOMETRAGEM ATUAL DO CARRO</Text>
        <TextInput value={currentKm} onChangeText={(value) => { setCurrentKm(value.replace(/[^0-9]/g, "").slice(0, 7)); setCalculated(false); }} keyboardType="numeric" placeholder="Ex.: 68500" placeholderTextColor="#746a70" style={input} />
        <Text style={{ color: palette.muted, fontSize: 10, lineHeight: 16, marginTop: 7 }}>Depois, informe em cada serviço a KM em que ele foi feito pela última vez. Se nunca foi feito ou você não sabe, deixe em branco e consulte o histórico/manual.</Text>
      </View>

      {SERVICES.map((service) => {
        const result = calculated && validCurrent ? resultado(service) : null;
        const statusColor = result && !result.invalid ? (result.overdue ? "#ff8797" : "#7dd6a3") : palette.muted;
        return (
          <View key={service.id} style={card}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <Text style={{ color: palette.text, fontSize: 14, fontWeight: "800", flex: 1 }}>{service.name}</Text>
              <Text style={{ color: "#e98b9a", fontSize: 10, fontWeight: "900" }}>A CADA {formatKm(service.interval)}</Text>
            </View>
            <Text style={{ color: palette.muted, fontSize: 11, lineHeight: 17, marginTop: 7 }}>{service.detail}</Text>
            {service.warning ? <Text style={{ color: "#f1c27b", fontSize: 10, lineHeight: 16, marginTop: 7 }}>{service.warning}</Text> : null}
            <Text style={[label, { marginTop: 14 }]}>KM DA ÚLTIMA TROCA / SERVIÇO</Text>
            <TextInput value={lastKm[service.id] ?? ""} onChangeText={(value) => { setLastKm((old) => ({ ...old, [service.id]: value.replace(/[^0-9]/g, "").slice(0, 7) })); setCalculated(false); }} keyboardType="numeric" placeholder="Ex.: 60000" placeholderTextColor="#746a70" style={input} />
            {result ? (
              result.invalid ? <Text style={{ color: "#ff8797", fontSize: 11, marginTop: 9 }}>Confira: a KM da última troca não pode ser maior que a KM atual.</Text> :
              <View style={{ backgroundColor: "#0b0a0e", borderRadius: 10, padding: 12, marginTop: 11, borderWidth: 1, borderColor: result.overdue ? "#783440" : "#315a45" }}>
                <Text style={{ color: statusColor, fontSize: 12, fontWeight: "900" }}>{result.overdue ? "REVISAR AGORA" : "PRÓXIMA TROCA ESTIMADA"}</Text>
                <Text style={{ color: palette.text, fontSize: 12, marginTop: 5 }}>Marco previsto: {formatKm(result.due)}</Text>
                <Text style={{ color: statusColor, fontSize: 11, marginTop: 3 }}>{result.overdue ? "Passou " + formatKm(Math.abs(result.remaining)) + " do marco de referência." : "Faltam " + formatKm(result.remaining) + " para o marco de referência."}</Text>
              </View>
            ) : null}
          </View>
        );
      })}

      <TouchableOpacity onPress={() => setCalculated(true)} disabled={!validCurrent} accessibilityRole="button" style={{ backgroundColor: validCurrent ? palette.red : "#55323a", borderRadius: 11, padding: 15, alignItems: "center", marginTop: 14, opacity: validCurrent ? 1 : 0.55 }}>
        <Text style={{ color: "#fff", fontSize: 12, fontWeight: "900" }}>CALCULAR PRÓXIMAS MANUTENÇÕES</Text>
      </TouchableOpacity>
      <View style={{ backgroundColor: "#241b12", borderColor: "#72552b", borderWidth: 1, borderRadius: 12, padding: 13, marginTop: 12 }}>
        <Text style={{ color: "#f1c27b", fontSize: 11, fontWeight: "900", marginBottom: 5 }}>BASE DE TESTE — NÃO É PLANO OFICIAL DO FABRICANTE</Text>
        <Text style={{ color: "#d8c7ad", fontSize: 10, lineHeight: 16 }}>Os 10 modelos são uma seleção de referência e os intervalos acima são estimativas genéricas para demonstrar o cálculo. Eles não foram confirmados para cada motor/ano. O manual do proprietário e a concessionária definem a especificação correta; tempo, uso severo e condições do veículo também podem antecipar serviços. Correia dentada só deve ser programada após confirmar que o motor utiliza esse componente.</Text>
      </View>
    </View>
  );
}
