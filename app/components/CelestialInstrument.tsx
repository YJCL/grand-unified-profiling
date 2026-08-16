"use client";

import { useEffect, useRef } from "react";
import { BrandOrb } from "./BrandOrb";

const planes = ["plane-a", "plane-b", "plane-c", "plane-d"];

const readouts = [
  {
    className: "readout-a",
    index: "01",
    label: "WESTERN ASTROLOGY",
    value: "EPHEMERIS / LOCKED",
  },
  {
    className: "readout-b",
    index: "04",
    label: "SHUKUYO",
    value: "LUNAR MANSION / 27",
  },
  {
    className: "readout-c",
    index: "06",
    label: "HUMAN DESIGN",
    value: "BODYGRAPH / SYNC",
  },
  {
    className: "readout-d",
    index: "08",
    label: "TRANSIT",
    value: "NOW / CALIBRATING",
  },
];

export function CelestialInstrument() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const instrument = ref.current;
    if (!instrument) return;

    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = true;
    const syncMotion = () => {
      instrument.classList.toggle(
        "is-active",
        visible && !document.hidden && !reducedMotion.matches,
      );
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncMotion();
    });

    observer.observe(instrument);
    document.addEventListener("visibilitychange", syncMotion);
    reducedMotion.addEventListener("change", syncMotion);
    syncMotion();

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncMotion);
      reducedMotion.removeEventListener("change", syncMotion);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="orba-celestial-instrument"
      aria-label="8つの読み解きを表す天体観測装置"
    >
      <div className="orba-instrument-motion">
        <div className="orba-instrument-aura" />
        <svg
          className="orba-instrument-svg"
          viewBox="0 0 900 900"
          aria-hidden="true"
        >
          <g className="orba-instrument-outer-assembly">
            <circle className="orba-instrument-outer-ring" cx="450" cy="450" r="385" />
            <g className="orba-instrument-ticks">
              {Array.from({ length: 72 }, (_, index) => {
                const angle = (index / 72) * Math.PI * 2;
                const inner = index % 6 === 0 ? 367 : 374;
                const outer = 384;
                return (
                  <line
                    key={index}
                    x1={450 + Math.cos(angle) * inner}
                    y1={450 + Math.sin(angle) * inner}
                    x2={450 + Math.cos(angle) * outer}
                    y2={450 + Math.sin(angle) * outer}
                  />
                );
              })}
            </g>
          </g>

          <g className="orba-instrument-reticle">
            <circle cx="450" cy="450" r="354" />
            <circle cx="450" cy="450" r="322" />
            <path d="M450 48V852M48 450H852" />
            <path d="M165 165L735 735M735 165L165 735" />
          </g>

          <path
            className="orba-instrument-scan"
            d="M112 565C278 485 615 484 788 336"
          />
        </svg>

        <div className="orba-instrument-object">
          <BrandOrb />
          <div className="orba-orbital-volume">
            {planes.map((plane) => (
              <div className={`orba-orbital-plane ${plane}`} key={plane}>
                <div className="orba-orbital-plane-track">
                  <i />
                </div>
              </div>
            ))}
          </div>
          <div className="orba-orbital-depth-haze" />
        </div>

        <div className="orba-instrument-readouts">
          {readouts.map((readout) => (
            <div
              className={`orba-instrument-readout ${readout.className}`}
              key={readout.index}
            >
              <span>{readout.index}</span>
              <p>
                {readout.label}
                <small>{readout.value}</small>
              </p>
            </div>
          ))}
        </div>

        <div className="orba-instrument-status">
          <i /> 8 LAYERS / ONE LIVING PROFILE
        </div>
        <div className="orba-instrument-coordinate">
          35.6812°N / 139.7671°E
          <br />
          <span>ORBA OBSERVATION FIELD</span>
        </div>
      </div>
    </div>
  );
}
