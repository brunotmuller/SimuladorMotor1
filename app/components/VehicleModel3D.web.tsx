import React, { useEffect } from "react";
import { createElement } from "react";

const MODEL_URL = "https://models.vinish.dev/realistic-cars/executive-sedan.glb";
const SCRIPT_ID = "torquelab-model-viewer-script";

export default function VehicleModel3D() {
  useEffect(() => {
    if (typeof document === "undefined" || customElements.get("model-viewer")) return;
    if (document.getElementById(SCRIPT_ID)) return;

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.type = "module";
    script.src = "https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js";
    document.head.appendChild(script);
  }, []);

  return createElement(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        minHeight: "260px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(ellipse at 50% 48%, #39232b 0%, #171116 48%, #09090c 100%)",
        borderRadius: "16px",
        overflow: "hidden",
      },
    },
    createElement("model-viewer", {
      src: MODEL_URL,
      alt: "Modelo tridimensional detalhado de um automóvel",
      "camera-controls": "",
      "auto-rotate": "",
      "auto-rotate-delay": "1200",
      "rotation-per-second": "18deg",
      "shadow-intensity": "1.2",
      "exposure": "1.05",
      "environment-image": "neutral",
      "tone-mapping": "aces",
      "interaction-prompt": "auto",
      "camera-orbit": "35deg 72deg 5.5m",
      "min-camera-orbit": "auto 35deg 3m",
      "max-camera-orbit": "auto 100deg 9m",
      "field-of-view": "30deg",
      style: {
        width: "100%",
        height: "100%",
        minHeight: "260px",
        backgroundColor: "transparent",
        "--poster-color": "transparent",
      },
    })
  );
}
