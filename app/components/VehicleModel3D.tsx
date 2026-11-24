import React, { useEffect, useState } from "react";
import { Platform, Text, View } from "react-native";

const MODEL_VIEWER_SCRIPT =
  "https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js";

export default function VehicleModel3D() {
  const [viewerReady, setViewerReady] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;

    if (customElements.get("model-viewer")) {
      setViewerReady(true);
      return;
    }

    let script = document.querySelector<HTMLScriptElement>(
      'script[data-torquelab-model-viewer="true"]'
    );

    if (!script) {
      script = document.createElement("script");
      script.type = "module";
      script.src = MODEL_VIEWER_SCRIPT;
      script.dataset.torquelabModelViewer = "true";
      document.head.appendChild(script);
    }

    let ativo = true;
    customElements.whenDefined("model-viewer").then(() => {
      if (ativo) setViewerReady(true);
    });

    return () => {
      ativo = false;
    };
  }, []);

  if (Platform.OS !== "web") {
    return (
      <View style={{ flex: 1, minHeight: 250, alignItems: "center", justifyContent: "center", padding: 22, backgroundColor: "#171116" }}>
        <Text style={{ color: "#ff7180", fontSize: 14, fontWeight: "800", marginBottom: 8 }}>
          VISUALIZAÇÃO 3D
        </Text>
        <Text style={{ color: "#d7c9cc", fontSize: 12, textAlign: "center", lineHeight: 19 }}>
          O visualizador interativo está disponível na versão web do TorqueLab.
        </Text>
      </View>
    );
  }

  if (!viewerReady) {
    return (
      <View style={{ flex: 1, minHeight: 250, alignItems: "center", justifyContent: "center", padding: 22, backgroundColor: "#09090c" }}>
        <Text style={{ color: "#ff7180", fontSize: 13, fontWeight: "800", marginBottom: 7 }}>
          CARREGANDO MODELO 3D...
        </Text>
        <Text style={{ color: "#d7c9cc", fontSize: 11, textAlign: "center" }}>
          Aguarde enquanto o veículo é preparado.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, minHeight: 250, overflow: "hidden", backgroundColor: "#09090c" }}>
      {React.createElement("model-viewer" as any, {
        src: "https://models.vinish.dev/realistic-cars/executive-sedan.glb",
        alt: "Modelo 3D realista de um sedã azul",
        "camera-controls": true,
        "auto-rotate": true,
        "auto-rotate-delay": 1800,
        "rotation-per-second": "18deg",
        "interaction-prompt": "auto",
        "camera-orbit": "35deg 70deg 5.5m",
        "min-camera-orbit": "auto 25deg 3.5m",
        "max-camera-orbit": "auto 110deg 8m",
        "field-of-view": "30deg",
        "shadow-intensity": "1",
        "shadow-softness": "0.9",
        exposure: "1.05",
        "tone-mapping": "aces",
        "environment-image": "https://modelviewer.dev/shared-assets/environments/neutral.hdr",
        style: {
          width: "100%",
          height: "100%",
          minHeight: "250px",
          backgroundColor: "#09090c",
          "--poster-color": "#09090c",
        },
      })}
    </View>
  );
}
