import { useEffect } from "react";
import { Platform } from "react-native";

/**
 * Efeitos visuais só na web (CSS + JS leve).
 * Mantém formulários usáveis — sem física destrutiva nos inputs.
 */
export default function WebPolish() {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;

    const styleId = "torque-lab-web-polish";
    const fxId = "torque-lab-fx-root";

    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        html { scroll-behavior: smooth; }
        body {
          background: #09090b !important;
          -webkit-font-smoothing: antialiased;
          cursor: auto;
        }
        [data-torque-columns] { display: flex; flex-direction: column; }
        @media (min-width: 900px) {
          [data-torque-columns] {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
            align-items: start;
            gap: 18px;
          }
          [data-torque-columns] > * { min-width: 0; }
        }
        @media (max-width: 899px) {
          [data-torque-columns] { display: flex; flex-direction: column; }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { scroll-behavior: auto !important; animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
        }
        :focus-visible, [role="button"]:focus-visible, button:focus-visible {
          outline: 2px solid #ff8793 !important;
          outline-offset: 3px !important;
        }
        #torque-cursor, #torque-trail { display: none !important; }
        @media (pointer: coarse) {
          body { cursor: auto; }
          #torque-cursor, #torque-trail, #torque-fx-canvas { display: none !important; }
        }
        ::selection {
          background: rgba(239, 51, 64, 0.35);
          color: #fff;
        }

        body {
          background:
            radial-gradient(ellipse at 50% -18%, rgba(111, 30, 48, 0.22), transparent 42%),
            linear-gradient(180deg, #0b0a0d 0%, #09090b 46%, #0d0b0e 100%) !important;
        }
        html { scroll-padding-top: 24px; }
        [data-torque-hero] {
          isolation: isolate;
          background:
            radial-gradient(ellipse at 82% 45%, rgba(129, 35, 54, 0.24), transparent 36%),
            linear-gradient(125deg, #151116 0%, #100e12 58%, #1b1016 100%) !important;
          border: 1px solid rgba(142, 65, 82, 0.42) !important;
          box-shadow: 0 28px 70px rgba(0,0,0,.34), inset 0 1px 0 rgba(255,255,255,.035);
        }
        [data-torque-hero]::after {
          content: "";
          position: absolute;
          z-index: -1;
          right: -7%;
          bottom: -52%;
          width: 54%;
          aspect-ratio: 1;
          border: 1px solid rgba(242, 82, 108, .14);
          border-radius: 50%;
          box-shadow: 0 0 0 34px rgba(242,82,108,.025), 0 0 0 72px rgba(242,82,108,.018);
          pointer-events: none;
        }
        [data-torque-hero-copy] { position: relative; z-index: 1; max-width: 760px; }
        [data-torque-nav] { align-items: center; }
        [data-torque-nav] button, [data-torque-nav] [role="button"] {
          transition: transform .2s ease, border-color .2s ease, background .2s ease;
        }
        [data-torque-nav] [role="button"]:hover { transform: translateY(-2px); border-color: #a94352 !important; }
        #vehicle-section, #data-section, #garage-section, #explore-section { scroll-margin-top: 22px; }
        #vehicle-section, #data-section, #garage-section {
          background: linear-gradient(145deg, #141217 0%, #101014 100%) !important;
          border-color: #33272e !important;
          box-shadow: 0 18px 50px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.025);
        }
        input, textarea { caret-color: #f05a70; }
        input:focus, textarea:focus {
          border-color: #a94352 !important;
          box-shadow: 0 0 0 3px rgba(239,51,64,.11) !important;
          outline: none !important;
        }
        button { -webkit-tap-highlight-color: transparent; }
        @media (min-width: 900px) {
          [data-torque-hero] { padding: 46px !important; min-height: 350px; display: flex; align-items: center; }
          [data-torque-hero] h1 { max-width: 700px; }
          #vehicle-section, #data-section, #garage-section { border-radius: 22px !important; }
        }
        @media (max-width: 640px) {
          [data-torque-hero] { padding: 25px !important; border-radius: 22px !important; }
          [data-torque-hero] h1 { font-size: 36px !important; line-height: 41px !important; }
          #vehicle-section, #data-section, #garage-section { padding: 19px !important; border-radius: 18px !important; }
        }

        /* Hero automotivo em duas colunas */
        [data-torque-hero] {
          min-height: 430px;
          padding: 42px !important;
          background:
            radial-gradient(ellipse at 78% 52%, rgba(164, 39, 61, .2), transparent 42%),
            linear-gradient(125deg, #141116 0%, #0e0d11 56%, #1a0f15 100%) !important;
        }
        [data-torque-hero-layout] {
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
          gap: 28px !important;
        }
        [data-torque-hero-copy] { flex: 1 1 54%; max-width: none !important; }
        [data-torque-hero-visual] {
          flex: 0 0 44%;
          width: 44% !important;
          min-width: 0 !important;
          height: 350px !important;
          border-radius: 22px !important;
          background:
            radial-gradient(ellipse at 50% 65%, rgba(131,38,56,.2), transparent 64%),
            #09090c !important;
          box-shadow: inset 0 0 50px rgba(183,49,72,.12), 0 20px 55px rgba(0,0,0,.35);
        }
        [data-torque-hero-visual] model-viewer {
          width: 100% !important;
          height: 100% !important;
          min-height: 350px !important;
          --poster-color: transparent;
          background: transparent !important;
        }
        [data-torque-hero-copy] h1 { font-size: clamp(38px, 4vw, 58px) !important; line-height: 1.02 !important; }
        @media (max-width: 900px) {
          [data-torque-hero] { padding: 28px !important; }
          [data-torque-hero-layout] { flex-direction: column !important; align-items: stretch !important; }
          [data-torque-hero-copy] { width: 100% !important; }
          [data-torque-hero-visual] {
            flex: 0 0 auto !important;
            width: 100% !important;
            height: 280px !important;
          }
          [data-torque-hero-visual] model-viewer { min-height: 280px !important; }
        }
        @media (max-width: 600px) {
          [data-torque-hero] { padding: 21px !important; border-radius: 20px !important; }
          [data-torque-hero-copy] h1 { font-size: 36px !important; line-height: 1.08 !important; }
          [data-torque-hero-visual] { height: 230px !important; }
          [data-torque-hero-visual] model-viewer { min-height: 230px !important; }
        }

        /* SVG gooey filter target */
        .torque-gooey { filter: url(#torque-goo); }

        /* Liquid hover on hero */
        [data-torque-hero] {
          position: relative;
          transition: transform 0.45s cubic-bezier(0.22,1,0.36,1), filter 0.35s ease;
        }
        [data-torque-hero]:hover {
          filter: saturate(1.15) contrast(1.05);
        }

        /* Glitch title */
        [data-torque-glitch] {
          position: relative;
          display: inline-block;
        }
        [data-torque-glitch].is-glitching {
          animation: torque-glitch 0.45s steps(2, end) 1;
        }
        [data-torque-glitch].is-glitching::before,
        [data-torque-glitch].is-glitching::after {
          content: attr(data-text);
          position: absolute;
          left: 0; top: 0;
          width: 100%;
          overflow: hidden;
          pointer-events: none;
        }
        [data-torque-glitch].is-glitching::before {
          color: #00f0ff;
          clip-path: inset(0 0 55% 0);
          transform: translate(-3px, -1px);
          mix-blend-mode: screen;
        }
        [data-torque-glitch].is-glitching::after {
          color: #ff2a5f;
          clip-path: inset(45% 0 0 0);
          transform: translate(3px, 1px);
          mix-blend-mode: screen;
        }
        @keyframes torque-glitch {
          0% { transform: translate(0); }
          20% { transform: translate(-4px, 1px) skewX(-2deg); }
          40% { transform: translate(4px, -1px); }
          60% { transform: translate(-2px, 2px) skewX(1deg); }
          80% { transform: translate(2px, 0); }
          100% { transform: translate(0); }
        }

        /* RGB / chromatic on fast scroll */
        body.torque-rgb-shift [data-torque-hero],
        body.torque-rgb-shift [data-torque-card] {
          filter: drop-shadow(-3px 0 0 rgba(255,40,80,0.45))
                  drop-shadow(3px 0 0 rgba(0,220,255,0.35));
          transition: filter 0.05s linear;
        }

        /* Magnetic buttons */
        [data-torque-magnetic] {
          transition: transform 0.18s cubic-bezier(0.22,1,0.36,1);
          will-change: transform;
        }

        /* Cards */
        [data-torque-card] {
          transition: transform 0.3s cubic-bezier(0.22,1,0.36,1),
            border-color 0.28s ease, box-shadow 0.28s ease;
        }
        [data-torque-card]:hover {
          transform: translateY(-4px) scale(1.005);
          border-color: #8a3d4a !important;
          box-shadow: 0 18px 44px rgba(0,0,0,0.5), 0 0 0 1px rgba(239,51,64,0.14);
        }

        [data-torque-btn] {
          transition: transform 0.2s cubic-bezier(0.22,1,0.36,1),
            box-shadow 0.25s ease, filter 0.2s ease;
          cursor: pointer;
        }
        [data-torque-btn]:hover {
          box-shadow: 0 14px 36px rgba(217,39,62,0.5), 0 0 0 1px rgba(255,102,119,0.4);
          filter: brightness(1.08);
        }

        [data-torque-chip] {
          transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease;
        }
        [data-torque-chip]:hover {
          transform: translateY(-2px);
          border-color: #a04452 !important;
          background: #3a1a22 !important;
        }

        /* Kinetic eyebrow */
        [data-torque-kinetic] {
          letter-spacing: 0.12em;
          transition: letter-spacing 0.5s ease, transform 0.5s ease;
        }
        [data-torque-kinetic]:hover {
          letter-spacing: 0.28em;
        }

        /* Parallax layers */
        [data-torque-parallax] {
          will-change: transform;
          transition: transform 0.08s linear;
        }

        /* Morph blob */
        #torque-morph-blob {
          position: fixed;
          width: 220px;
          height: 220px;
          border-radius: 42% 58% 55% 45% / 48% 42% 58% 52%;
          background: radial-gradient(circle at 30% 30%, rgba(255,80,100,0.22), rgba(120,20,40,0.06) 70%, transparent);
          pointer-events: none;
          z-index: 0;
          filter: blur(2px);
          animation: torque-morph 12s ease-in-out infinite;
          opacity: 0.7;
        }
        @keyframes torque-morph {
          0%, 100% { border-radius: 42% 58% 55% 45% / 48% 42% 58% 52%; transform: translate(0,0) scale(1); }
          33% { border-radius: 58% 42% 45% 55% / 42% 58% 42% 58%; transform: translate(30px, -20px) scale(1.08); }
          66% { border-radius: 48% 52% 60% 40% / 55% 45% 55% 45%; transform: translate(-20px, 25px) scale(0.94); }
        }

        /* Custom cursor */
        #torque-cursor {
          position: fixed;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #ff4658;
          box-shadow: 0 0 0 2px rgba(255,70,88,0.35), 0 0 24px rgba(255,70,88,0.55);
          pointer-events: none;
          z-index: 99999;
          transform: translate(-50%, -50%);
          transition: width 0.15s ease, height 0.15s ease, background 0.15s ease;
          mix-blend-mode: screen;
        }
        #torque-cursor.is-hot {
          width: 28px;
          height: 28px;
          background: #fff;
        }
        #torque-trail {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 99998;
          overflow: hidden;
        }
        .torque-spark {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: radial-gradient(circle, #ff8a96, #ef3340 60%, transparent);
          pointer-events: none;
          opacity: 0.9;
          transform: translate(-50%, -50%);
          animation: torque-spark-out 0.55s ease-out forwards;
        }
        @keyframes torque-spark-out {
          to { opacity: 0; transform: translate(-50%, -50%) scale(0.2); }
        }

        /* Scrollbar */
        * { scrollbar-width: thin; scrollbar-color: #5a3038 #121014; }
        *::-webkit-scrollbar { width: 8px; height: 8px; }
        *::-webkit-scrollbar-track { background: #121014; }
        *::-webkit-scrollbar-thumb { background: #5a3038; border-radius: 99px; }
        *::-webkit-scrollbar-thumb:hover { background: #ef3340; }

        @keyframes torque-pulse {
          0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 0 0 rgba(67,201,119,0.5); }
          50% { opacity: 0.85; transform: scale(1.05); box-shadow: 0 0 0 6px rgba(67,201,119,0); }
        }
        @keyframes torque-pulse-off {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(239,51,64,0.45); }
          50% { opacity: 0.7; box-shadow: 0 0 0 6px rgba(239,51,64,0); }
        }
        [data-torque-status-dot="on"] { animation: torque-pulse 2.2s ease-in-out infinite; }
        [data-torque-status-dot="off"] { animation: torque-pulse-off 2.2s ease-in-out infinite; }

        [data-torque-section-heading] {
          margin: 42px 0 4px;
          padding-left: 2px;
          position: relative;
        }
        [data-torque-section-heading="vehicle"] { margin-top: 28px; }
        [data-torque-section-heading="garage"] { margin-top: 48px; }
        [data-torque-section-heading="explore"] { margin-top: 48px; }
        [data-torque-section-heading="about"] { margin-top: 48px; }
        [data-torque-section-heading] > * { text-shadow: 0 2px 16px rgba(0,0,0,.25); }
        [data-torque-hero-panel] > div { position: relative; }
        [data-torque-hero-panel] > div:first-child { padding-bottom: 3px; }
        [data-torque-progress] { border-color: #33262e !important; }
        /* TORQUELAB — redesign editorial */
        body {
          background:
            radial-gradient(ellipse at 50% 0%, rgba(94, 26, 43, .22), transparent 38%),
            #08080a !important;
          color: #f5f1f2;
        }
        [data-torque-topbar] {
          min-height: 78px;
          padding: 8px 4px 22px;
          border-bottom: 1px solid rgba(255,255,255,.07);
          margin-bottom: 26px;
        }
        [data-torque-topbar] img { filter: drop-shadow(0 8px 18px rgba(0,0,0,.35)); }
        [data-torque-hero] {
          position: relative;
          min-height: 450px;
          padding: 42px !important;
          border-radius: 24px !important;
          border: 1px solid rgba(191,77,99,.36) !important;
          background:
            radial-gradient(ellipse at 92% 10%, rgba(159,43,65,.20), transparent 35%),
            linear-gradient(135deg, #171319 0%, #100e12 52%, #1b1117 100%) !important;
          box-shadow: 0 32px 90px rgba(0,0,0,.42), inset 0 1px 0 rgba(255,255,255,.04) !important;
          overflow: hidden;
        }
        [data-torque-hero]::before {
          content: "TL";
          position: absolute;
          right: 38px;
          bottom: -78px;
          color: rgba(255,255,255,.025);
          font-size: clamp(190px, 25vw, 360px);
          line-height: 1;
          font-weight: 950;
          letter-spacing: -.12em;
          pointer-events: none;
        }
        [data-torque-hero-grid] { position: relative; z-index: 1; }
        [data-torque-hero-copy] { max-width: 700px; }
        [data-torque-hero-copy] > * { position: relative; z-index: 1; }
        [data-torque-hero-panel] {
          flex: 0 0 340px;
          box-shadow: 0 24px 55px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.04);
          backdrop-filter: blur(12px);
        }
        [data-torque-nav] { position: relative; z-index: 2; }
        [data-torque-nav] [role="button"] { transition: transform .18s ease, border-color .18s ease, background .18s ease; }
        [data-torque-nav] [role="button"]:hover { transform: translateY(-2px); border-color: #b64a60 !important; background: rgba(180,52,78,.12) !important; }
        #vehicle-section, #data-section, #garage-section, #explore-section { scroll-margin-top: 26px; }
        #vehicle-section, #data-section, #garage-section {
          border-radius: 20px !important;
          padding: 28px !important;
          background: linear-gradient(145deg, #151318 0%, #100f13 100%) !important;
          border: 1px solid #342831 !important;
          box-shadow: 0 18px 48px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.035);
          transition: border-color .2s ease, transform .2s ease;
        }
        #vehicle-section:hover, #data-section:hover, #garage-section:hover { border-color: #68404c !important; }
        #vehicle-section h2, #data-section h2, #garage-section h2 { letter-spacing: -.04em; }
        [data-torque-columns] { gap: 20px !important; align-items: stretch !important; }
        [data-torque-columns] > * { min-width: 0; }
        input, textarea {
          background: #0b0a0e !important;
          border: 1px solid #3c3038 !important;
          border-radius: 11px !important;
          color: #fff !important;
          transition: border-color .18s ease, box-shadow .18s ease;
        }
        input:focus, textarea:focus {
          border-color: #c04b63 !important;
          box-shadow: 0 0 0 3px rgba(207,59,88,.12) !important;
          outline: none !important;
        }
        [data-torque-btn], button, [role="button"] { cursor: pointer; }
        [data-torque-btn]:hover, button:hover { filter: brightness(1.08); }
        @media (min-width: 1100px) {
          [data-torque-hero] { padding: 50px 54px !important; }
          [data-torque-hero-grid] { gap: 48px !important; }
          [data-torque-hero-panel] { flex-basis: 370px; width: 370px !important; }
        }
        @media (max-width: 900px) {
          [data-torque-hero] { min-height: 0; padding: 30px !important; }
          [data-torque-hero-grid] { flex-direction: column !important; align-items: stretch !important; }
          [data-torque-hero-panel] { width: 100% !important; flex: 0 0 auto !important; }
          [data-torque-hero-copy] { width: 100% !important; }
        }
        @media (max-width: 600px) {
          [data-torque-topbar] { min-height: 62px; margin-bottom: 18px; }
          [data-torque-hero] { padding: 23px !important; border-radius: 18px !important; }
          [data-torque-hero-panel] { padding: 17px !important; }
          #vehicle-section, #data-section, #garage-section { padding: 19px !important; border-radius: 16px !important; }
        }
      `;
      document.head.appendChild(style);
    }

    // SVG gooey filter + morph defs
    if (!document.getElementById("torque-svg-fx")) {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("id", "torque-svg-fx");
      svg.setAttribute("width", "0");
      svg.setAttribute("height", "0");
      svg.style.position = "absolute";
      svg.innerHTML = `
        <defs>
          <filter id="torque-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            <feColorMatrix in="blur" mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      `;
      document.body.appendChild(svg);
    }

    // Morph blob background
    if (!document.getElementById("torque-morph-blob")) {
      const blob = document.createElement("div");
      blob.id = "torque-morph-blob";
      blob.style.left = "60%";
      blob.style.top = "12%";
      document.body.appendChild(blob);
    }

    // Custom cursor + trail
    let cursor = document.getElementById("torque-cursor");
    let trail = document.getElementById("torque-trail");
    if (!cursor) {
      cursor = document.createElement("div");
      cursor.id = "torque-cursor";
      document.body.appendChild(cursor);
    }
    if (!trail) {
      trail = document.createElement("div");
      trail.id = "torque-trail";
      document.body.appendChild(trail);
    }

    let mx = 0;
    let my = 0;
    let lastSpark = 0;
    let lastScrollY = window.scrollY;
    let lastScrollT = performance.now();
    let rgbTimer: ReturnType<typeof setTimeout> | null = null;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (cursor) {
        cursor.style.left = `${mx}px`;
        cursor.style.top = `${my}px`;
      }

      const now = performance.now();
      if (trail && now - lastSpark > 28) {
        lastSpark = now;
        const spark = document.createElement("div");
        spark.className = "torque-spark";
        spark.style.left = `${mx + (Math.random() * 10 - 5)}px`;
        spark.style.top = `${my + (Math.random() * 10 - 5)}px`;
        trail.appendChild(spark);
        setTimeout(() => spark.remove(), 560);
      }

      // Magnetic buttons
      document.querySelectorAll("[data-torque-magnetic]").forEach((el) => {
        const node = el as HTMLElement;
        const r = node.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = mx - cx;
        const dy = my - cy;
        const dist = Math.hypot(dx, dy);
        const pull = 110;
        if (dist < pull) {
          const force = (1 - dist / pull) * 14;
          node.style.transform = `translate(${(dx / dist) * force || 0}px, ${(dy / dist) * force || 0}px)`;
          cursor?.classList.add("is-hot");
        } else {
          node.style.transform = "";
        }
      });
    };

    const onScroll = () => {
      const y = window.scrollY;
      const t = performance.now();
      const dt = Math.max(t - lastScrollT, 1);
      const speed = Math.abs(y - lastScrollY) / dt;
      lastScrollY = y;
      lastScrollT = t;

      // Parallax
      document.querySelectorAll("[data-torque-parallax]").forEach((el) => {
        const node = el as HTMLElement;
        const depth = Number(node.dataset.depth || "0.15");
        node.style.transform = `translate3d(0, ${y * depth * 0.25}px, 0)`;
      });

      // RGB shift on fast scroll
      if (speed > 1.2) {
        document.body.classList.add("torque-rgb-shift");
        if (rgbTimer) clearTimeout(rgbTimer);
        rgbTimer = setTimeout(() => {
          document.body.classList.remove("torque-rgb-shift");
        }, 120);
      }

      // Occasional glitch on title while scrolling
      if (speed > 0.8 && Math.random() > 0.7) {
        document.querySelectorAll("[data-torque-glitch]").forEach((el) => {
          el.classList.add("is-glitching");
          setTimeout(() => el.classList.remove("is-glitching"), 450);
        });
      }
    };

    // Tag interactive elements after React paints
    const tagElements = () => {
      document.querySelectorAll('[role="button"], button').forEach((el) => {
        if (!(el as HTMLElement).dataset.torqueMagnetic) {
          (el as HTMLElement).dataset.torqueMagnetic = "1";
          (el as HTMLElement).dataset.torqueBtn = "1";
        }
      });
    };

    const observer = new MutationObserver(() => tagElements());
    observer.observe(document.body, { childList: true, subtree: true });
    tagElements();

    // Glitch on logo/title hover
    const onOver = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const glitch = t.closest("[data-torque-glitch]") as HTMLElement | null;
      if (glitch) {
        glitch.classList.add("is-glitching");
        setTimeout(() => glitch.classList.remove("is-glitching"), 450);
      }
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("mouseover", onOver, { passive: true });

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("mouseover", onOver);
      observer.disconnect();
      if (rgbTimer) clearTimeout(rgbTimer);
      document.getElementById(styleId)?.remove();
      document.getElementById("torque-cursor")?.remove();
      document.getElementById("torque-trail")?.remove();
      document.getElementById("torque-morph-blob")?.remove();
      document.getElementById("torque-svg-fx")?.remove();
      document.body.classList.remove("torque-rgb-shift");
      document.body.style.cursor = "";
    };
  }, []);

  return null;
}
