import React, { useEffect, useMemo, useRef, useState } from "react";
import { Flame, Pause, Play, RotateCcw, CheckCircle2, AlertTriangle, Droplets } from "lucide-react";
import { LiveLabState } from "../../types/lab";

interface ChemistrySimProps {
  onStateChange: (state: LiveLabState) => void;
  onMissionComplete: () => void;
  missionCompleted: boolean;
}

interface Ion {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: "H+" | "OH-" | "H2O";
  life: number;
}

function calculatePH(acidMl: number, baseMl: number): number {
  const c = 0.1; // 0.1 M HCl & NaOH
  const totalVol = Math.max(10, acidMl + baseMl);
  const molesH = (acidMl / 1000) * c;
  const molesOH = (baseMl / 1000) * c;
  const diff = molesH - molesOH;

  if (Math.abs(diff) < 1e-7) {
    return 7.0;
  }
  if (diff > 0) {
    const concH = diff / (totalVol / 1000);
    return Math.max(0.5, Math.min(6.99, -Math.log10(concH)));
  }
  const concOH = Math.abs(diff) / (totalVol / 1000);
  const pOH = -Math.log10(concOH);
  return Math.max(7.01, Math.min(13.5, 14 - pOH));
}

function getIndicatorColor(ph: number, useIndicator: boolean): { liquid: string; glow: string; label: string } {
  if (!useIndicator) {
    return {
      liquid: "rgba(186, 230, 253, 0.22)",
      glow: "rgba(186, 230, 253, 0.12)",
      label: "Clear (No Indicator)",
    };
  }
  if (ph < 3.5) {
    return { liquid: "rgba(239, 68, 68, 0.58)", glow: "rgba(239, 68, 68, 0.25)", label: "Crimson (Strong Acid)" };
  }
  if (ph < 5.8) {
    return { liquid: "rgba(245, 158, 11, 0.58)", glow: "rgba(245, 158, 11, 0.25)", label: "Amber (Weak Acid)" };
  }
  if (ph <= 7.5) {
    return { liquid: "rgba(16, 185, 129, 0.62)", glow: "rgba(16, 185, 129, 0.28)", label: "Emerald (Neutral)" };
  }
  if (ph < 10.5) {
    return { liquid: "rgba(6, 182, 212, 0.58)", glow: "rgba(6, 182, 212, 0.25)", label: "Teal (Weak Base)" };
  }
  return { liquid: "rgba(99, 102, 241, 0.62)", glow: "rgba(99, 102, 241, 0.28)", label: "Indigo (Strong Base)" };
}

export const ChemistrySim: React.FC<ChemistrySimProps> = ({
  onStateChange,
  onMissionComplete,
  missionCompleted,
}) => {
  const [acidMl, setAcidMl] = useState(50);
  const [baseMl, setBaseMl] = useState(20);
  const [tempC, setTempC] = useState(24);
  const [useIndicator, setUseIndicator] = useState(true);
  const [isRunning, setIsRunning] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ionsRef = useRef<Ion[]>([]);

  const ph = useMemo(() => calculatePH(acidMl, baseMl), [acidMl, baseMl]);
  const indicator = useMemo(() => getIndicatorColor(ph, useIndicator), [ph, useIndicator]);
  const neutralizationPct = useMemo(() => {
    const maxReact = Math.max(acidMl, baseMl, 1);
    const reacted = Math.min(acidMl, baseMl);
    return Math.round((reacted / maxReact) * 100);
  }, [acidMl, baseMl]);

  const solutionState =
    ph < 6.5 ? "▲ Acidic Solution" : ph > 7.5 ? "◆ Alkaline Solution" : "● Neutral Equilibrium";

  const kineticEnergyKj = useMemo(() => {
    return (2.4 + (tempC / 100) * 5.8).toFixed(2);
  }, [tempC]);

  // Mission check: Neutral pH (6.80–7.20) AND temp > 45°C
  useEffect(() => {
    if (!missionCompleted && ph >= 6.8 && ph <= 7.2 && tempC > 45) {
      onMissionComplete();
    }
  }, [ph, tempC, missionCompleted, onMissionComplete]);

  // Report live telemetry to parent
  useEffect(() => {
    onStateChange({
      experimentId: "chemistry",
      experimentTitle: "Acid-Base Reaction & pH Mixer",
      discipline: "Chemistry",
      statusLabel: solutionState,
      parameters: {
        acidVolumeMl: acidMl,
        baseVolumeMl: baseMl,
        temperatureC: tempC,
        calculatedPH: Number(ph.toFixed(2)),
        neutralizationPercent: neutralizationPct,
        indicatorActive: useIndicator,
        kineticEnergyKjPerMol: Number(kineticEnergyKj),
      },
    });
  }, [acidMl, baseMl, tempC, ph, neutralizationPct, useIndicator, kineticEnergyKj, solutionState, onStateChange]);

  // Sync ion particle counts when sliders change
  useEffect(() => {
    const excessAcid = Math.max(0, acidMl - baseMl);
    const excessBase = Math.max(0, baseMl - acidMl);
    const neutralPairs = Math.min(acidMl, baseMl);

    const hCount = Math.min(35, Math.round(excessAcid * 0.45));
    const ohCount = Math.min(35, Math.round(excessBase * 0.45));
    const h2oCount = Math.min(28, Math.round(neutralPairs * 0.35));

    const newIons: Ion[] = [];
    const spawn = (type: Ion["type"]): Ion => ({
      x: 0.28 + Math.random() * 0.44,
      y: 0.38 + Math.random() * 0.42,
      vx: (Math.random() - 0.5) * 0.004,
      vy: (Math.random() - 0.5) * 0.004,
      type,
      life: Math.random() * 100,
    });

    for (let i = 0; i < hCount; i++) newIons.push(spawn("H+"));
    for (let i = 0; i < ohCount; i++) newIons.push(spawn("OH-"));
    for (let i = 0; i < h2oCount; i++) newIons.push(spawn("H2O"));
    ionsRef.current = newIons;
  }, [acidMl, baseMl]);

  // Canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;
    let t = 0;

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
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      // Subtle coordinate grid
      ctx.strokeStyle = "rgba(148, 163, 184, 0.07)";
      ctx.lineWidth = 1;
      for (let x = 24; x < w; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 24; y < h; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      const cx = w * 0.5;
      const flaskBottom = h * 0.84;
      const flaskTop = h * 0.16;
      const neckWidth = Math.min(92, w * 0.18);
      const baseWidth = Math.min(280, w * 0.52);

      // Bunsen / thermal plate glow under flask
      if (tempC > 26) {
        const heatRatio = Math.min(1, (tempC - 20) / 70);
        const grad = ctx.createRadialGradient(cx, flaskBottom + 14, 6, cx, flaskBottom + 14, baseWidth * 0.65);
        grad.addColorStop(0, `rgba(245, 158, 11, ${0.45 * heatRatio})`);
        grad.addColorStop(1, "rgba(245, 158, 11, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(cx, flaskBottom + 12, baseWidth * 0.55, 22, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw liquid inside Erlenmeyer shape
      const fillFraction = Math.min(0.86, 0.25 + ((acidMl + baseMl) / 200) * 0.6);
      const liquidSurfaceY = flaskBottom - (flaskBottom - (flaskTop + 65)) * fillFraction;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx - neckWidth / 2, flaskTop);
      ctx.lineTo(cx - neckWidth / 2, flaskTop + 65);
      ctx.lineTo(cx - baseWidth / 2, flaskBottom - 18);
      ctx.quadraticCurveTo(cx - baseWidth / 2 - 4, flaskBottom, cx - baseWidth / 2 + 18, flaskBottom);
      ctx.lineTo(cx + baseWidth / 2 - 18, flaskBottom);
      ctx.quadraticCurveTo(cx + baseWidth / 2 + 4, flaskBottom, cx + baseWidth / 2, flaskBottom - 18);
      ctx.lineTo(cx + neckWidth / 2, flaskTop + 65);
      ctx.lineTo(cx + neckWidth / 2, flaskTop);
      ctx.closePath();
      ctx.clip();

      // Liquid body with gentle wave
      const waveAmp = isRunning ? 3 + (tempC / 90) * 4 : 1.5;
      ctx.fillStyle = indicator.liquid;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 8) {
        const y = liquidSurfaceY + Math.sin(x * 0.03 + t * 0.06) * waveAmp;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();

      // Glow at surface
      ctx.strokeStyle = "rgba(255,255,255,0.38)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 8) {
        const y = liquidSurfaceY + Math.sin(x * 0.03 + t * 0.06) * waveAmp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Animate ions inside liquid bounds
      const speedMult = 0.5 + (tempC / 35) * 1.4;
      for (const ion of ionsRef.current) {
        if (isRunning) {
          ion.x += ion.vx * speedMult;
          ion.y += ion.vy * speedMult;
          ion.life += 1;

          // Keep inside trapezoid bounds roughly
          const relY = Math.max(0.25, Math.min(0.84, ion.y));
          if (ion.y < (liquidSurfaceY + 14) / h) {
            ion.y = (liquidSurfaceY + 14) / h;
            ion.vy = Math.abs(ion.vy);
          }
          if (ion.y > 0.82) {
            ion.y = 0.82;
            ion.vy = -Math.abs(ion.vy);
          }
          const progressDown = Math.max(0, (relY - 0.3) / 0.54);
          const halfSpan = ((neckWidth / 2 + progressDown * (baseWidth / 2 - neckWidth / 2)) * 0.82) / w;
          if (ion.x < 0.5 - halfSpan) {
            ion.x = 0.5 - halfSpan;
            ion.vx = Math.abs(ion.vx);
          }
          if (ion.x > 0.5 + halfSpan) {
            ion.x = 0.5 + halfSpan;
            ion.vx = -Math.abs(ion.vx);
          }
        }

        const px = ion.x * w;
        const py = ion.y * h;

        if (ion.type === "H+") {
          ctx.fillStyle = "#F87171";
          ctx.beginPath();
          ctx.arc(px, py, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#070B12";
          ctx.font = "600 9px 'JetBrains Mono', monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("H+", px, py + 0.5);
        } else if (ion.type === "OH-") {
          ctx.fillStyle = "#38BDF8";
          ctx.beginPath();
          ctx.arc(px, py, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#070B12";
          ctx.font = "600 8px 'JetBrains Mono', monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("OH-", px, py + 0.5);
        } else {
          // Neutral H2O molecule bubble
          ctx.strokeStyle = "rgba(167, 243, 208, 0.75)";
          ctx.fillStyle = "rgba(16, 185, 129, 0.25)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(px, py, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }

      ctx.restore();

      // Flask glass outline
      ctx.strokeStyle = "rgba(226, 232, 240, 0.6)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx - neckWidth / 2 - 6, flaskTop);
      ctx.lineTo(cx - neckWidth / 2, flaskTop + 4);
      ctx.lineTo(cx - neckWidth / 2, flaskTop + 65);
      ctx.lineTo(cx - baseWidth / 2, flaskBottom - 18);
      ctx.quadraticCurveTo(cx - baseWidth / 2 - 4, flaskBottom, cx - baseWidth / 2 + 18, flaskBottom);
      ctx.lineTo(cx + baseWidth / 2 - 18, flaskBottom);
      ctx.quadraticCurveTo(cx + baseWidth / 2 + 4, flaskBottom, cx + baseWidth / 2, flaskBottom - 18);
      ctx.lineTo(cx + neckWidth / 2, flaskTop + 65);
      ctx.lineTo(cx + neckWidth / 2, flaskTop + 4);
      ctx.lineTo(cx + neckWidth / 2 + 6, flaskTop);
      ctx.stroke();

      // Graduation tick marks on flask
      ctx.strokeStyle = "rgba(148, 163, 184, 0.45)";
      ctx.lineWidth = 1;
      [0.45, 0.58, 0.71].forEach((frac, idx) => {
        const ty = h * frac;
        ctx.beginPath();
        ctx.moveTo(cx - 28, ty);
        ctx.lineTo(cx - 10, ty);
        ctx.stroke();
        ctx.fillStyle = "rgba(148, 163, 184, 0.65)";
        ctx.font = "10px 'JetBrains Mono', monospace";
        ctx.textAlign = "right";
        ctx.fillText(`${(3 - idx) * 50}mL`, cx - 32, ty + 3);
      });

      // Thermal burner stand base
      ctx.fillStyle = "#1E293B";
      ctx.fillRect(cx - baseWidth * 0.48, flaskBottom + 4, baseWidth * 0.96, 8);

      ctx.restore();

      if (isRunning) {
        t += 1;
      }
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [acidMl, baseMl, tempC, indicator, isRunning]);

  // Titration curve SVG points
  const curvePath = useMemo(() => {
    const pts: string[] = [];
    for (let b = 0; b <= 100; b += 4) {
      const p = calculatePH(acidMl, b);
      const x = 16 + (b / 100) * 208;
      const y = 104 - (p / 14) * 90;
      pts.push(`${b === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    return pts.join(" ");
  }, [acidMl]);

  const currentMarkerX = 16 + (baseMl / 100) * 208;
  const currentMarkerY = 104 - (ph / 14) * 90;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* Left Interactive Canvas Stage */}
      <div className="lg:col-span-7 flex flex-col rounded-xl border border-slate-800 bg-[#0B111C] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80">
          <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
            <span>Ion Chamber</span>
            <span aria-hidden="true">·</span>
            <span className={ph < 6.5 ? "text-rose-400" : ph > 7.5 ? "text-cyan-400" : "text-emerald-400"}>
              {solutionState}
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
                setAcidMl(50);
                setBaseMl(20);
                setTempC(24);
                setUseIndicator(true);
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
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" /> H⁺ Acid Ion
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" /> OH⁻ Base Ion
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full border border-emerald-300 bg-emerald-500/30 inline-block" /> H₂O Water
            </span>
          </div>
        </div>

        {/* Live Numeric Telemetry Strip */}
        <div className="grid grid-cols-3 border-t border-slate-800 divide-x divide-slate-800 bg-[#080D16]">
          <div className="p-3.5">
            <div className="text-xs text-slate-400">Solution pH</div>
            <div className="text-2xl font-mono font-semibold tabular-nums text-slate-100 mt-0.5">
              {ph.toFixed(2)}
              <span className="text-xs text-slate-400 ml-1.5 font-normal">pH</span>
            </div>
          </div>
          <div className="p-3.5">
            <div className="text-xs text-slate-400">Neutralized</div>
            <div className="text-2xl font-mono font-semibold tabular-nums text-emerald-400 mt-0.5">
              {neutralizationPct}
              <span className="text-xs text-slate-400 ml-1 font-normal">%</span>
            </div>
          </div>
          <div className="p-3.5">
            <div className="text-xs text-slate-400">Kinetic Energy</div>
            <div className="text-2xl font-mono font-semibold tabular-nums text-amber-400 mt-0.5">
              {kineticEnergyKj}
              <span className="text-xs text-slate-400 ml-1.5 font-normal">kJ/mol</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Control & Concept Deck */}
      <div className="lg:col-span-5 flex flex-col gap-5 rounded-xl border border-slate-800 bg-[#0E1522] p-5">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Controls & Reaction Curve</span>
            <span className="font-mono text-slate-300">HCl + NaOH → NaCl + H₂O</span>
          </div>

          {/* Sliders */}
          <div className="space-y-4 mt-3">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <label htmlFor="acid-slider" className="text-slate-200 font-medium">
                  Hydrochloric Acid (HCl)
                </label>
                <span className="font-mono tabular-nums text-rose-400">{acidMl} mL</span>
              </div>
              <input
                id="acid-slider"
                type="range"
                min={0}
                max={100}
                value={acidMl}
                onChange={(e) => setAcidMl(Number(e.target.value))}
                className="w-full lab-slider"
              />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <label htmlFor="base-slider" className="text-slate-200 font-medium">
                  Sodium Hydroxide (NaOH)
                </label>
                <span className="font-mono tabular-nums text-sky-400">{baseMl} mL</span>
              </div>
              <input
                id="base-slider"
                type="range"
                min={0}
                max={100}
                value={baseMl}
                onChange={(e) => setBaseMl(Number(e.target.value))}
                className="w-full lab-slider"
              />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <label htmlFor="temp-slider" className="text-slate-200 font-medium flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-400" />
                  Thermal Plate Temperature
                </label>
                <span className="font-mono tabular-nums text-amber-400">{tempC} °C</span>
              </div>
              <input
                id="temp-slider"
                type="range"
                min={10}
                max={90}
                value={tempC}
                onChange={(e) => setTempC(Number(e.target.value))}
                className="w-full lab-slider"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-sm text-slate-300 flex items-center gap-2">
                <Droplets className="w-4 h-4 text-cyan-400" />
                Universal Indicator Dye
              </span>
              <button
                type="button"
                onClick={() => setUseIndicator((v) => !v)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                  useIndicator
                    ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                    : "border-slate-700 bg-slate-900 text-slate-400"
                }`}
              >
                {useIndicator ? "Dye Added" : "Add Dye"}
              </button>
            </div>
          </div>
        </div>

        {/* Live Titration Curve */}
        <div className="pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Live Titration Curve (pH vs. NaOH)</span>
            <span className="font-mono text-slate-300">{indicator.label}</span>
          </div>
          <svg viewBox="0 0 240 120" className="w-full h-28 bg-[#070B12] rounded-lg border border-slate-800">
            <line x1="16" y1="59" x2="224" y2="59" stroke="rgba(16,185,129,0.25)" strokeDasharray="3 3" />
            <text x="20" y="55" fill="#10B981" fontSize="8" fontFamily="JetBrains Mono">
              pH 7 Neutral
            </text>
            <path d={curvePath} fill="none" stroke="#06B6D4" strokeWidth="2" />
            <circle cx={currentMarkerX} cy={currentMarkerY} r="4.5" fill="#F59E0B" stroke="#070B12" strokeWidth="1.5" />
          </svg>
        </div>

        {/* Discovery Mission Callout */}
        <div className="mt-auto pt-4 border-t border-slate-800">
          <div className="flex items-start gap-3">
            {missionCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="text-sm font-semibold text-slate-100">
                {missionCompleted ? "Mission Complete: Equilibrium Master (+120 XP)" : "Discovery Mission: Equilibrium Master"}
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Balance HCl and NaOH to reach neutral pH (6.80–7.20) while heating the flask above 45°C.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
