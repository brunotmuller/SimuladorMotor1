import { useEffect } from "react";
import { Platform } from "react-native";

/**
 * Polimento visual exclusivo para web: layout responsivo em grid,
 * superfícies refinadas, foco acessível e transições suaves.
 */
export default function WebPolish() {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;

    const styleId = "torque-lab-web-polish";
    let style = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      document.head.appendChild(style);
    }

    style.textContent = `
      html {
        scroll-behavior: smooth;
        scroll-padding-top: 24px;
      }
      body {
        background:
          radial-gradient(ellipse 80% 45% at 50% -10%, rgba(168, 36, 62, 0.22), transparent 60%),
          radial-gradient(ellipse 50% 35% at 90% 15%, rgba(110, 22, 42, 0.14), transparent 55%),
          #09090c !important;
        color: #f5f1f2;
        -webkit-font-smoothing: antialiased;
        overflow-x: hidden;
      }
      ::selection {
        background: rgba(228, 59, 85, 0.35);
        color: #fff;
      }
      * {
        scrollbar-width: thin;
        scrollbar-color: #4c2d35 #100f14;
      }
      *::-webkit-scrollbar { width: 8px; height: 8px; }
      *::-webkit-scrollbar-track { background: #100f14; }
      *::-webkit-scrollbar-thumb { background: #4c2d35; border-radius: 99px; }
      *::-webkit-scrollbar-thumb:hover { background: #e43b55; }

      :focus-visible, [role="button"]:focus-visible, button:focus-visible {
        outline: 2px solid #ff8793 !important;
        outline-offset: 2px !important;
      }
      button, [role="button"] {
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }

      /* Topbar */
      [data-torque-topbar] {
        min-height: 68px;
        padding: 4px 2px 18px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        margin-bottom: 22px;
      }
      [data-torque-topbar] img {
        filter: drop-shadow(0 6px 16px rgba(0, 0, 0, 0.4));
      }
      [data-torque-nav-pill] {
        transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
      }
      [data-torque-nav-pill]:hover {
        background: rgba(228, 59, 85, 0.14) !important;
        border-color: rgba(228, 59, 85, 0.55) !important;
        transform: translateY(-1px);
      }

      /* Status pulse */
      @keyframes torque-pulse {
        0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(67, 201, 119, 0.45); }
        50% { opacity: 0.85; box-shadow: 0 0 0 6px rgba(67, 201, 119, 0); }
      }
      @keyframes torque-pulse-off {
        0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(239, 51, 64, 0.4); }
        50% { opacity: 0.75; box-shadow: 0 0 0 6px rgba(239, 51, 64, 0); }
      }
      [data-torque-status-dot="on"] { animation: torque-pulse 2.2s ease-in-out infinite; }
      [data-torque-status-dot="off"] { animation: torque-pulse-off 2.2s ease-in-out infinite; }

      /* Hero */
      [data-torque-hero] {
        position: relative;
        border-radius: 24px !important;
        border: 1px solid rgba(191, 77, 99, 0.34) !important;
        background:
          radial-gradient(ellipse at 85% 20%, rgba(164, 39, 61, 0.22), transparent 45%),
          linear-gradient(125deg, #151218 0%, #0f0e13 56%, #1a1016 100%) !important;
        box-shadow: 0 26px 70px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.05) !important;
      }
      [data-torque-hero-panel] {
        backdrop-filter: blur(14px);
        box-shadow: 0 20px 44px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.05);
      }
      [data-torque-title] {
        font-size: clamp(32px, 4.2vw, 52px) !important;
        line-height: 1.06 !important;
        letter-spacing: -0.04em !important;
      }

      /* Cards & Interactive states */
      [data-torque-card] {
        transition: border-color 0.22s ease, box-shadow 0.22s ease, transform 0.22s ease;
      }
      [data-torque-card]:hover {
        border-color: #6b3b46 !important;
        box-shadow: 0 18px 42px rgba(0, 0, 0, 0.36);
      }
      [data-torque-example-card] {
        transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
      }
      [data-torque-example-card]:hover {
        transform: translateY(-3px);
        border-color: #e43b55 !important;
        box-shadow: 0 14px 32px rgba(228, 59, 85, 0.16);
      }
      [data-torque-cta] {
        transition: transform 0.18s ease, box-shadow 0.2s ease, filter 0.18s ease;
      }
      [data-torque-cta]:hover {
        transform: translateY(-1px);
        box-shadow: 0 12px 28px rgba(217, 46, 73, 0.35);
        filter: brightness(1.06);
      }

      /* Inputs */
      input, textarea {
        caret-color: #f05a70;
        transition: border-color 0.18s ease, box-shadow 0.18s ease;
      }
      input:focus, textarea:focus {
        border-color: #c84b63 !important;
        box-shadow: 0 0 0 3px rgba(228, 59, 85, 0.14) !important;
        outline: none !important;
      }

      /* Responsive Grids */
      [data-torque-columns] {
        display: flex;
        flex-direction: column;
        gap: 18px;
      }
      [data-torque-examples-grid] {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      [data-torque-grid-2] {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      @media (min-width: 900px) {
        [data-torque-columns] {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1.08fr);
          align-items: start;
          gap: 20px;
        }
        [data-torque-columns] > * { min-width: 0; }

        [data-torque-examples-grid] {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          align-items: stretch;
        }
        [data-torque-examples-grid] > * { min-width: 0; }

        [data-torque-grid-2] {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
          align-items: stretch;
        }
        [data-torque-grid-2] > * { min-width: 0; }
      }

      @media (max-width: 900px) {
        [data-torque-hero] { padding: 26px !important; }
        [data-torque-hero-grid] {
          flex-direction: column !important;
          align-items: stretch !important;
          gap: 20px !important;
        }
        [data-torque-hero-panel] {
          width: 100% !important;
          flex: 0 0 auto !important;
        }
      }

      @media (max-width: 640px) {
        [data-torque-mode-topbar] {
          flex-direction: column !important;
          align-items: stretch !important;
        }
        [data-torque-mode-nav] {
          width: 100% !important;
          justify-content: space-between !important;
          flex-wrap: wrap !important;
        }
        [data-torque-mode-nav] > * {
          flex: 1 1 auto !important;
          justify-content: center !important;
        }
        [data-torque-topbar] {
          padding: 4px 0 14px;
          margin-bottom: 16px;
        }
        [data-torque-topbar] img {
          width: 128px !important;
          height: 54px !important;
        }
        [data-torque-topbar-nav] {
          display: none !important;
        }
        [data-torque-hero] {
          padding: 20px !important;
          border-radius: 18px !important;
        }
        [data-torque-hero-actions] {
          display: grid !important;
          grid-template-columns: 1fr;
          gap: 9px !important;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          scroll-behavior: auto !important;
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }

      #examples-section,
      #simulator-section,
      #vehicle-section,
      #data-section,
      #result-section,
      #garage-section,
      #explore-section,
      #maintenance-section,
      #about-section {
        scroll-margin-top: 20px;
      }
    `;

    return () => {
      document.getElementById(styleId)?.remove();
    };
  }, []);

  return null;
}
