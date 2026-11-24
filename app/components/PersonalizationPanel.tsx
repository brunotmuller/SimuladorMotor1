import React, { useEffect, useState } from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "torquelab-personalizacao-v1";
type Preferences = { light: boolean; reducedMotion: boolean };

export default function PersonalizationPanel() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<Preferences>({ light: false, reducedMotion: false });

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!active || !raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed.light === "boolean" && typeof parsed.reducedMotion === "boolean") setPrefs(parsed);
      } catch { /* ignora preferências inválidas */ }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    document.body.classList.toggle("torque-light", prefs.light);
    document.body.classList.toggle("torque-no-motion", prefs.reducedMotion);
  }, [prefs]);

  async function update(next: Preferences) {
    setPrefs(next);
    try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* mantém a preferência durante a sessão */ }
  }

  function irPara(selector: string) {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    document.querySelector(selector)?.scrollIntoView({ behavior: prefs.reducedMotion ? "auto" : "smooth", block: "start" });
  }

  const card = { backgroundColor: "#121014", borderColor: "#503039", borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 16 } as const;
  const label = { color: "#fff", fontSize: 13, fontWeight: "700" as const };
  const small = { color: "#bdaeb1", fontSize: 11, lineHeight: 17 as const };
  const action = { backgroundColor: "#24151a", borderColor: "#61303a", borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 } as const;

  return (
    <View style={card}>
      <TouchableOpacity onPress={() => setOpen(!open)} activeOpacity={0.85} accessibilityRole="button" accessibilityState={{ expanded: open }} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
          <MaterialCommunityIcons name="tune-variant" size={21} color="#ff7180" />
          <View>
            <Text style={label}>Personalização</Text>
            <Text style={small}>Tema, animações e atalhos rápidos</Text>
          </View>
        </View>
        <MaterialCommunityIcons name={open ? "chevron-up" : "chevron-down"} size={23} color="#ff7180" />
      </TouchableOpacity>

      {open && (
        <View style={{ marginTop: 15, gap: 13 }}>
          <View>
            <Text style={[label, { marginBottom: 8 }]}>Aparência</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity onPress={() => update({ ...prefs, light: false })} style={[action, { flex: 1, borderColor: !prefs.light ? "#ef3340" : "#61303a" }]} accessibilityRole="button" accessibilityState={{ selected: !prefs.light }}>
                <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700", textAlign: "center" }}>☾ Escuro {!prefs.light ? "✓" : ""}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => update({ ...prefs, light: true })} style={[action, { flex: 1, borderColor: prefs.light ? "#ef3340" : "#61303a" }]} accessibilityRole="button" accessibilityState={{ selected: prefs.light }}>
                <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700", textAlign: "center" }}>☀ Claro {prefs.light ? "✓" : ""}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity onPress={() => update({ ...prefs, reducedMotion: !prefs.reducedMotion })} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 5 }} accessibilityRole="switch" accessibilityState={{ checked: prefs.reducedMotion }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={label}>Reduzir animações</Text>
              <Text style={small}>Diminui movimentos e transições da página.</Text>
            </View>
            <Text style={{ color: prefs.reducedMotion ? "#ff7180" : "#bdaeb1", fontSize: 12, fontWeight: "800" }}>{prefs.reducedMotion ? "ATIVADO" : "DESATIVADO"}</Text>
          </TouchableOpacity>

          <View>
            <Text style={[label, { marginBottom: 8 }]}>Atalhos</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
              <TouchableOpacity onPress={() => irPara("body")} style={action}><Text style={{ color: "#fff", fontSize: 11 }}>Início ↑</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => irPara("[data-torque-columns]")} style={action}><Text style={{ color: "#fff", fontSize: 11 }}>Formulário</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => irPara("[data-torque-vehicle-hub]")} style={action}><Text style={{ color: "#fff", fontSize: 11 }}>Central de veículos</Text></TouchableOpacity>
            </View>
          </View>
          <Text style={small}>As preferências ficam salvas neste dispositivo.</Text>
        </View>
      )}
    </View>
  );
}
