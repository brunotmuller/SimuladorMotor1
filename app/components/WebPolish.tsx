import { useEffect } from "react";
import { Platform } from "react-native";

/**
 * Injeta CSS global só na web: hover, keyframes, scroll suave e microinterações.
 */
export default function WebPolish() {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;

    const id = "torque-lab-web-polish";
    if (document.getElementById(id)) return;

    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      html {
        scroll-behavior: smooth;
      }

      body {
        background: #09090b !important;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      ::selection {
        background: rgba(239, 51, 64, 0.35);
        color: #fff;
      }

      @keyframes torque-pulse {
        0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 0 0 rgba(67, 201, 119, 0.5); }
        50% { opacity: 0.85; transform: scale(1.05); box-shadow: 0 0 0 6px rgba(67, 201, 119, 0); }
      }

      @keyframes torque-pulse-off {
        0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(239, 51, 64, 0.45); }
        50% { opacity: 0.7; box-shadow: 0 0 0 6px rgba(239, 51, 64, 0); }
      }

      @keyframes torque-shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }

      @keyframes torque-float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-4px); }
      }

      @keyframes torque-glow {
        0%, 100% { opacity: 0.45; }
        50% { opacity: 0.75; }
      }

      @keyframes torque-fade-up {
        from { opacity: 0; transform: translateY(18px); }
        to { opacity: 1; transform: translateY(0); }
      }

      [data-torque-status-dot="on"] {
        animation: torque-pulse 2.2s ease-in-out infinite;
      }

      [data-torque-status-dot="off"] {
        animation: torque-pulse-off 2.2s ease-in-out infinite;
      }

      [data-torque-hero-glow] {
        animation: torque-glow 5s ease-in-out infinite;
      }

      [data-torque-card] {
        transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
          border-color 0.28s ease,
          box-shadow 0.28s ease;
      }

      [data-torque-card]:hover {
        transform: translateY(-3px);
        border-color: #8a3d4a !important;
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(239, 51, 64, 0.12);
      }

      [data-torque-btn] {
        transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1),
          box-shadow 0.25s ease,
          filter 0.2s ease;
        cursor: pointer;
      }

      [data-torque-btn]:hover {
        transform: translateY(-2px) scale(1.01);
        box-shadow: 0 12px 32px rgba(217, 39, 62, 0.45), 0 0 0 1px rgba(255, 102, 119, 0.35);
        filter: brightness(1.06);
      }

      [data-torque-btn]:active {
        transform: translateY(0) scale(0.985);
        filter: brightness(0.96);
      }

      [data-torque-chip] {
        transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease;
        cursor: default;
      }

      [data-torque-chip]:hover {
        transform: translateY(-1px);
        border-color: #a04452 !important;
        background: #3a1a22 !important;
      }

      [data-torque-input] {
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
      }

      [data-torque-input]:focus-within,
      [data-torque-input]:focus {
        border-color: #ef3340 !important;
        box-shadow: 0 0 0 3px rgba(239, 51, 64, 0.18);
        outline: none;
      }

      [data-torque-fade] {
        animation: torque-fade-up 0.65s cubic-bezier(0.22, 1, 0.36, 1) both;
      }

      [data-torque-fade-delay-1] { animation-delay: 0.08s; }
      [data-torque-fade-delay-2] { animation-delay: 0.16s; }
      [data-torque-fade-delay-3] { animation-delay: 0.24s; }

      * {
        scrollbar-width: thin;
        scrollbar-color: #5a3038 #121014;
      }

      *::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }

      *::-webkit-scrollbar-track {
        background: #121014;
      }

      *::-webkit-scrollbar-thumb {
        background: #5a3038;
        border-radius: 99px;
      }

      *::-webkit-scrollbar-thumb:hover {
        background: #ef3340;
      }
    `;

    document.head.appendChild(style);
    return () => {
      document.getElementById(id)?.remove();
    };
  }, []);

  return null;
}
