import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Sun, CheckCircle2, AlertTriangle, Thermometer } from "lucide-react";
import { LiveLabState } from "../../types/lab";

interface BiologySimProps {
  onStateChange: (state: LiveLabState) => void;
  onMissionComplete: () => void;
  missionCompleted: boolean;
}

type SpectrumId = "full" | "blue" | "green" | "red";

const SPECTRA: Record<SpectrumId, { label: string; nm: string; absorption: number; photonColor: string }> = {
  full: { label: "Full Sunlight", nm: "400–700nm", absorption: 1.0, photonColor: "#FDE047" },
  blue: { label: "Blue Light", nm: "450nm", absorption: 0.92, photonColor: "#38BDF8" },
  red: { label: "Red Light", nm: "660nm", absorption: 0.88, photonColor: "#FB7185" },
  green: { label: "Green Light", nm: "530nm", absorption: 0.14, photonColor: "#4ADE80" },
};

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  kind: "photon" | "o2" | "co2";
}

export const BiologySim: React.FC<BiologySimProps> = ({
  onStateChange,
  onMissionComplete,
  missionCompleted,
}) => {
  const [lightIntensity, setLightIntensity] = useState(75);
  const [spectrum, setSpectrum] = useState<SpectrumId>("full");
  const [co2Ppm, setCo2Ppm] = useState(650);
  const [tempC, setTempC] = useState(26);
  const [isRunning, setIsRunning] = useState(true);
  const [testedGreen, setTestedGreen] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  // Biological rate calculation with limiting factors & enzyme denaturation
  const { efficiencyPct, o2BubblesPerMin, glucoseMgHr, statusLabel } = useMemo(() => {
    const lightFactor = (lightIntensity / 100) * SPECTRA[spectrum].absorption;
    const co2Factor = Math.min(1, co2Ppm / 800);

    // Enzyme thermal curve peaking around 28°C, denaturing rapidly past 42°C
    let tempFactor = 0;
    if (tempC < 5) tempFactor = 0.1;
    else if (tempC <= 32) tempFactor = 0.25 + ((tempC - 5) / 27) * 0.75;
    else if (tempC <= 42) tempFactor = 1.0 - ((tempC - 32) / 10) * 0.35;
    else tempFactor = Math.max(0.02, 0.65 - ((tempC - 42) / 14) * 0.65);

    // Blackman's Law of Limiting Factors + weighted interaction
    const rawRate = Math.min(lightFactor, co2Factor * 1.05, tempFactor) * (0.65 + 0.35 * lightFactor * co2Factor);
    const eff = Math.max(0, Math.min(99, Math.round(rawRate * 100)));
    const o2 = Math.round(eff * 1.45);
    const glucose = (eff * 0.48).toFixed(1);

    let status = "● Optimal Output";
    if (tempC > 42) status = "✖ Enzyme Denaturation";
    else if (spectrum === "green") status = "▲ Green Light Reflected";
    else if (lightIntensity < 25) status = "▲ Light-Limited";
    else if (co2Ppm < 250) status = "▲ CO₂-Limited";

    return {
      efficiencyPct: eff,
      o2BubblesPerMin: o2,
      glucoseMgHr: glucose,
      statusLabel: status,
    };
  }, [lightIntensity, spectrum, co2Ppm, tempC]);

  useEffect(() => {
    if (spectrum === "green") setTestedGreen(true);
  }, [spectrum]);

  useEffect(() => {
    if (!missionCompleted && efficiencyPct >= 88 && testedGreen) {
      onMissionComplete();
    }
  }, [efficiencyPct, testedGreen, missionCompleted, onMissionComplete]);

  useEffect(() => {
    onStateChange({
      experimentId: "biology",
      experimentTitle: "Photosynthesis & Oxygen Reactor",
      discipline: "Biology",
      statusLabel,
      parameters: {
        lightIntensityPercent: lightIntensity,
        wavelength: `${SPECTRA[spectrum].label} (${SPECTRA[spectrum].nm})`,
        co2ConcentrationPpm: co2Ppm,
        temperatureC: tempC,
        oxygenOutputPerMin: o2BubblesPerMin,
        glucoseMgPerHr: Number(glucoseMgHr),
        efficiencyPercent: efficiencyPct,
      },
    });
  }, [lightIntensity, spectrum, co2Ppm, tempC, o2BubblesPerMin, glucoseMgHr, efficiencyPct, statusLabel, onStateChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;
    let frame = 0;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
          canvas.width = Math.round(rect.width * dpr);
          canvas.height = Math.round(rect.height * dpr);
        }
      }

      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const cx = w * 0.5;
      const cy = h * 0.54;
      const rx = Math.min(185, w * 0.34);
      const ry = Math.min(105, h * 0.28);

      if (isRunning) {
        frame += 1;
        // Spawn photons from top
        const photonRate = Math.max(1, Math.round((100 - lightIntensity) / 14));
        if (lightIntensity > 5 && frame % photonRate === 0 && particlesRef.current.length < 130) {
          particlesRef.current.push({
            x: cx - rx * 0.8 + Math.random() * rx * 1.6,
            y: 12,
            vx: (Math.random() - 0.5) * 0.4,
            vy: 2.3 + Math.random() * 1.1,
            kind: "photon",
          });
        }
        // Spawn O2 bubbles proportional to efficiency
        const bubbleInterval = efficiencyPct > 5 ? Math.max(3, Math.round(28 - efficiencyPct * 0.24)) : 9999;
        if (frame % bubbleInterval === 0 && particlesRef.current.length < 130) {
          particlesRef.current.push({
            x: cx + (Math.random() - 0.5) * rx * 1.1,
            y: cy + (Math.random() - 0.5) * ry * 0.5,
            vx: (Math.random() - 0.5) * 0.6,
            vy: -1.4 - Math.random() * 1.2,
            kind: "o2",
          });
        }
        // Spawn CO2 entering from bottom/sides
        const co2Interval = Math.max(5, Math.round(30 - (co2Ppm / 1200) * 24));
        if (frame % co2Interval === 0 && particlesRef.current.length < 130) {
          particlesRef.current.push({
            x: cx + (Math.random() - 0.5) * rx * 1.3,
            y: h - 18,
            vx: (Math.random() - 0.5) * 0.5,
            vy: -1.1 - Math.random() * 0.7,
            kind: "co2",
          });
        }
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      // Subtle lab background grid
      ctx.strokeStyle = "rgba(148, 163, 184, 0.06)";
      ctx.lineWidth = 1;
      for (let gx = 32; gx < w; gx += 32) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }

      // Sunlight beam cone from top
      if (lightIntensity > 0) {
        const beamGrad = ctx.createLinearGradient(0, 0, 0, cy + ry);
        beamGrad.addColorStop(0, `${SPECTRA[spectrum].photonColor}33`);
        beamGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(cx - rx * 0.65, 0);
        ctx.lineTo(cx + rx * 0.65, 0);
        ctx.lineTo(cx + rx * 1.05, cy + 20);
        ctx.lineTo(cx - rx * 1.05, cy + 20);
        ctx.closePath();
        ctx.fill();
      }

      // Chloroplast outer membrane
      const membraneColor = tempC > 42 ? "#EF4444" : "#10B981";
      ctx.fillStyle = tempC > 42 ? "rgba(127, 29, 29, 0.35)" : "rgba(6, 78, 59, 0.42)";
      ctx.strokeStyle = membraneColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Inner membrane
      ctx.strokeStyle = tempC > 42 ? "rgba(248, 113, 113, 0.45)" : "rgba(52, 211, 153, 0.45)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx - 10, ry - 10, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Thylakoid stacks (grana)
      const stackOffsets = [-0.55, -0.18, 0.18, 0.55];
      stackOffsets.forEach((off, sIdx) => {
        const sx = cx + off * rx;
        const sy = cy + (sIdx % 2 === 0 ? -12 : 12);
        for (let disc = -2; disc <= 2; disc++) {
          ctx.fillStyle = tempC > 42 ? "rgba(239, 68, 68, 0.45)" : "rgba(16, 185, 129, 0.55)";
          ctx.strokeStyle = tempC > 42 ? "#FCA5A5" : "#6EE7B7";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(sx, sy + disc * 9, 24, 5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      });

      // Update & draw particles
      const nextParticles: Particle[] = [];
      for (const p of particlesRef.current) {
        if (isRunning) {
          p.x += p.vx;
          p.y += p.vy;
        }

        if (p.kind === "photon") {
          // If green light hits chloroplast, reflect upward!
          const insideChloroplast =
            Math.pow((p.x - cx) / rx, 2) + Math.pow((p.y - cy) / ry, 2) <= 1;
          if (insideChloroplast) {
            if (spectrum === "green" && p.vy > 0) {
              p.vy = -Math.abs(p.vy) * 0.9;
              p.vx = (Math.random() - 0.5) * 2.5;
            } else if (spectrum !== "green") {
              // Absorbed!
              continue;
            }
          }
          if (p.y < 0 || p.y > h) continue;
          ctx.fillStyle = SPECTRA[spectrum].photonColor;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.kind === "o2") {
          if (p.y < 10) continue;
          ctx.strokeStyle = "#38BDF8";
          ctx.fillStyle = "rgba(56, 189, 248, 0.25)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#BAE6FD";
          ctx.font = "600 7px 'JetBrains Mono', monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("O₂", p.x, p.y + 0.5);
        } else if (p.kind === "co2") {
          const distCenter = Math.hypot(p.x - cx, p.y - cy);
          if (distCenter < 28 || p.y < 10) continue;
          ctx.fillStyle = "rgba(148, 163, 184, 0.85)";
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        nextParticles.push(p);
      }
      particlesRef.current = nextParticles;

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [lightIntensity, spectrum, co2Ppm, tempC, efficiencyPct, isRunning]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* Left Interactive Stage */}
      <div className="lg:col-span-7 flex flex-col rounded-xl border border-slate-800 bg-[#0B111C] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80">
          <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
            <span>Chloroplast View</span>
            <span aria-hidden="true">·</span>
            <span
              className={
                tempC > 42
                  ? "text-rose-400"
                  : spectrum === "green"
                  ? "text-amber-400"
                  : "text-emerald-400"
              }
            >
              {statusLabel}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsRunning((r) => !r)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isRunning ? "Pause" : "Resume"}
            </button>
            <button
              type="button"
              onClick={() => {
                setLightIntensity(75);
                setSpectrum("full");
                setCo2Ppm(650);
                setTempC(26);
                setIsRunning(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        </div>

        <div className="relative flex-1 min-h-[360px]">
          <canvas ref={canvasRef} className="w-full h-full block" />
          <div className="absolute bottom-3 left-4 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-300 bg-[#070B12]/85 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: SPECTRA[spectrum].photonColor }}
              />{" "}
              Light Photons
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full border border-sky-400 bg-sky-400/25 inline-block" /> O₂ Bubbles
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" /> CO₂ Input
            </span>
          </div>
        </div>

        {/* Live Numeric Readouts */}
        <div className="grid grid-cols-3 border-t border-slate-800 divide-x divide-slate-800 bg-[#080D16]">
          <div className="p-3.5">
            <div className="text-xs text-slate-400">Oxygen Output</div>
            <div className="text-2xl font-mono font-semibold tabular-nums text-sky-400 mt-0.5">
              {o2BubblesPerMin}
              <span className="text-xs text-slate-400 ml-1.5 font-normal">bubbles/m</span>
            </div>
          </div>
          <div className="p-3.5">
            <div className="text-xs text-slate-400">Glucose Yield</div>
            <div className="text-2xl font-mono font-semibold tabular-nums text-amber-400 mt-0.5">
              {glucoseMgHr}
              <span className="text-xs text-slate-400 ml-1.5 font-normal">mg/hr</span>
            </div>
          </div>
          <div className="p-3.5">
            <div className="text-xs text-slate-400">Reactor Efficiency</div>
            <div className="text-2xl font-mono font-semibold tabular-nums text-emerald-400 mt-0.5">
              {efficiencyPct}
              <span className="text-xs text-slate-400 ml-1 font-normal">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Control Deck */}
      <div className="lg:col-span-5 flex flex-col gap-5 rounded-xl border border-slate-800 bg-[#0E1522] p-5">
        <div>
          <div className="text-xs text-slate-400 mb-2">Select Light Wavelength</div>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(SPECTRA) as SpectrumId[]).map((sid) => (
              <button
                key={sid}
                type="button"
                onClick={() => setSpectrum(sid)}
                className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-colors whitespace-nowrap truncate ${
                  spectrum === sid
                    ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-200"
                    : "border-slate-800 bg-[#070B12] text-slate-400 hover:text-slate-200"
                }`}
              >
                {SPECTRA[sid].label} · {SPECTRA[sid].nm}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <label htmlFor="light-slider" className="text-slate-200 font-medium flex items-center gap-1.5">
                <Sun className="w-4 h-4 text-amber-400" />
                Light Intensity
              </label>
              <span className="font-mono tabular-nums text-amber-400">{lightIntensity}%</span>
            </div>
            <input
              id="light-slider"
              type="range"
              min={0}
              max={100}
              value={lightIntensity}
              onChange={(e) => setLightIntensity(Number(e.target.value))}
              className="w-full lab-slider"
            />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <label htmlFor="co2-slider" className="text-slate-200 font-medium">
                Carbon Dioxide (CO₂)
              </label>
              <span className="font-mono tabular-nums text-cyan-400">{co2Ppm} ppm</span>
            </div>
            <input
              id="co2-slider"
              type="range"
              min={50}
              max={1200}
              step={25}
              value={co2Ppm}
              onChange={(e) => setCo2Ppm(Number(e.target.value))}
              className="w-full lab-slider"
            />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <label htmlFor="bio-temp-slider" className="text-slate-200 font-medium flex items-center gap-1.5">
                <Thermometer className="w-4 h-4 text-rose-400" />
                Chamber Temperature
              </label>
              <span className={`font-mono tabular-nums ${tempC > 42 ? "text-rose-400" : "text-emerald-400"}`}>
                {tempC} °C
              </span>
            </div>
            <input
              id="bio-temp-slider"
              type="range"
              min={5}
              max={55}
              value={tempC}
              onChange={(e) => setTempC(Number(e.target.value))}
              className="w-full lab-slider"
            />
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-slate-800">
          <div className="flex items-start gap-3">
            {missionCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="text-sm font-semibold text-slate-100">
                {missionCompleted ? "Mission Complete: Peak Bio-Reactor (+120 XP)" : "Discovery Mission: Peak Bio-Reactor"}
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                First test Green Light (530nm) to observe chlorophyll reflection{testedGreen ? " (done)" : ""}, then tune light, CO₂, and temperature to exceed 88% efficiency.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
