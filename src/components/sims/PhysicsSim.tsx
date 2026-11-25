import React, { useEffect, useMemo, useRef, useState } from "react";
import { Play, RotateCcw, CheckCircle2, Target, Wind } from "lucide-react";
import { LiveLabState } from "../../types/lab";

interface PhysicsSimProps {
  onStateChange: (state: LiveLabState) => void;
  onMissionComplete: () => void;
  missionCompleted: boolean;
}

type PlanetId = "earth" | "moon" | "mars" | "jupiter";

const PLANETS: Record<PlanetId, { name: string; g: number; skyColor: string; groundColor: string }> = {
  earth: { name: "Earth", g: 9.81, skyColor: "#0B192C", groundColor: "#1E3A2F" },
  moon: { name: "Moon", g: 1.62, skyColor: "#090D16", groundColor: "#334155" },
  mars: { name: "Mars", g: 3.71, skyColor: "#1C1014", groundColor: "#5C281B" },
  jupiter: { name: "Jupiter Cloud Deck", g: 24.79, skyColor: "#1A1412", groundColor: "#78350F" },
};

export const PhysicsSim: React.FC<PhysicsSimProps> = ({
  onStateChange,
  onMissionComplete,
  missionCompleted,
}) => {
  const [planet, setPlanet] = useState<PlanetId>("moon");
  const [angleDeg, setAngleDeg] = useState(45);
  const [speedMs, setSpeedMs] = useState(14);
  const [airDrag, setAirDrag] = useState(false);
  const [isLaunched, setIsLaunched] = useState(false);
  const [hitCount, setHitCount] = useState(0);

  const [telemetry, setTelemetry] = useState({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    maxHeight: 0,
    range: 0,
    kePct: 100,
    pePct: 0,
    hitTarget: false,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simRef = useRef({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    maxHeight: 0,
    trail: [] as { x: number; y: number }[],
    landed: false,
    hitTarget: false,
  });

  const targetDistance = 120; // meters (crater center 110m - 130m)
  const g = PLANETS[planet].g;

  const theoreticalRange = useMemo(() => {
    const rad = (angleDeg * Math.PI) / 180;
    return (speedMs * speedMs * Math.sin(2 * rad)) / g;
  }, [angleDeg, speedMs, g]);

  useEffect(() => {
    onStateChange({
      experimentId: "physics",
      experimentTitle: "Gravity & Projectile Trajectory Lab",
      discipline: "Physics",
      statusLabel: telemetry.hitTarget ? "● Target Reached" : isLaunched ? "▲ Probe In Flight" : "● Ready on Pad",
      parameters: {
        planet: PLANETS[planet].name,
        gravityMs2: g,
        launchAngleDeg: angleDeg,
        launchSpeedMs: speedMs,
        airResistanceEnabled: airDrag,
        currentRangeMeters: Number(telemetry.range.toFixed(1)),
        maxAltitudeMeters: Number(telemetry.maxHeight.toFixed(1)),
        targetZoneMeters: "110m - 130m",
      },
    });
  }, [planet, g, angleDeg, speedMs, airDrag, telemetry, isLaunched, onStateChange]);

  const launchProbe = () => {
    const rad = (angleDeg * Math.PI) / 180;
    simRef.current = {
      x: 0,
      y: 0,
      vx: speedMs * Math.cos(rad),
      vy: speedMs * Math.sin(rad),
      maxHeight: 0,
      trail: [{ x: 0, y: 0 }],
      landed: false,
      hitTarget: false,
    };
    setIsLaunched(true);
  };

  const resetSim = () => {
    setIsLaunched(false);
    simRef.current = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      maxHeight: 0,
      trail: [],
      landed: false,
      hitTarget: false,
    };
    setTelemetry({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      maxHeight: 0,
      range: 0,
      kePct: 100,
      pePct: 0,
      hitTarget: false,
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;

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
      const worldMaxX = 180; // meters across canvas
      const padLeft = 42;
      const groundY = h - 48;
      const scale = (w - padLeft - 24) / worldMaxX;

      // Physics step
      const st = simRef.current;
      if (isLaunched && !st.landed) {
        const dt = 0.045;
        const dragFactor = airDrag && planet !== "moon" ? 0.014 : 0;
        const speed = Math.hypot(st.vx, st.vy);
        const ax = -dragFactor * st.vx * speed;
        const ay = -g - dragFactor * st.vy * speed;

        st.vx += ax * dt;
        st.vy += ay * dt;
        st.x += st.vx * dt;
        st.y += st.vy * dt;

        if (st.y > st.maxHeight) st.maxHeight = st.y;
        st.trail.push({ x: st.x, y: Math.max(0, st.y) });

        if (st.y <= 0 && st.trail.length > 3) {
          st.y = 0;
          st.landed = true;
          const landedInside = Math.abs(st.x - targetDistance) <= 10;
          st.hitTarget = landedInside;
          if (landedInside) {
            setHitCount((c) => c + 1);
            if (!missionCompleted && planet === "moon" && speedMs <= 22) {
              onMissionComplete();
            }
          }
        }

        const totalEnergy = 0.5 * speedMs * speedMs;
        const currentPE = Math.min(totalEnergy, g * Math.max(0, st.y));
        const pePct = totalEnergy > 0 ? Math.round((currentPE / totalEnergy) * 100) : 0;

        setTelemetry({
          x: st.x,
          y: Math.max(0, st.y),
          vx: st.vx,
          vy: st.vy,
          maxHeight: st.maxHeight,
          range: st.x,
          kePct: Math.max(0, 100 - pePct),
          pePct,
          hitTarget: st.hitTarget,
        });
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Sky gradient
      ctx.fillStyle = PLANETS[planet].skyColor;
      ctx.fillRect(0, 0, w, h);

      // Distance grid ticks
      ctx.strokeStyle = "rgba(148, 163, 184, 0.08)";
      ctx.lineWidth = 1;
      for (let m = 0; m <= worldMaxX; m += 20) {
        const px = padLeft + m * scale;
        ctx.beginPath();
        ctx.moveTo(px, 16);
        ctx.lineTo(px, groundY);
        ctx.stroke();
        ctx.fillStyle = "rgba(148, 163, 184, 0.55)";
        ctx.font = "10px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(`${m}m`, px, groundY + 18);
      }

      // Ground
      ctx.fillStyle = PLANETS[planet].groundColor;
      ctx.fillRect(0, groundY, w, h - groundY);
      ctx.strokeStyle = "rgba(226, 232, 240, 0.25)";
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(w, groundY);
      ctx.stroke();

      // Target crater zone (110m - 130m)
      const targetPx = padLeft + targetDistance * scale;
      const zoneWidth = 20 * scale;
      ctx.fillStyle = st.hitTarget ? "rgba(16, 185, 129, 0.35)" : "rgba(245, 158, 11, 0.25)";
      ctx.fillRect(targetPx - zoneWidth / 2, groundY - 6, zoneWidth, 10);
      ctx.strokeStyle = st.hitTarget ? "#10B981" : "#F59E0B";
      ctx.lineWidth = 2;
      ctx.strokeRect(targetPx - zoneWidth / 2, groundY - 6, zoneWidth, 10);

      ctx.fillStyle = st.hitTarget ? "#34D399" : "#FBBF24";
      ctx.font = "600 10px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("TARGET 120m", targetPx, groundY - 14);

      // Aim guide line before launch
      const rad = (angleDeg * Math.PI) / 180;
      ctx.strokeStyle = "rgba(6, 182, 212, 0.55)";
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(padLeft, groundY - 6);
      ctx.lineTo(padLeft + Math.cos(rad) * 44, groundY - 6 - Math.sin(rad) * 44);
      ctx.stroke();
      ctx.setLineDash([]);

      // Launcher barrel
      ctx.save();
      ctx.translate(padLeft, groundY - 6);
      ctx.rotate(-rad);
      ctx.fillStyle = "#38BDF8";
      ctx.fillRect(0, -4, 22, 8);
      ctx.restore();

      // Trail
      if (st.trail.length > 1) {
        ctx.strokeStyle = "#06B6D4";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        st.trail.forEach((pt, idx) => {
          const px = padLeft + pt.x * scale;
          const py = groundY - pt.y * scale;
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
      }

      // Probe body
      const probeX = padLeft + st.x * scale;
      const probeY = groundY - 6 - st.y * scale;
      ctx.fillStyle = st.hitTarget ? "#10B981" : "#F8FAFC";
      ctx.beginPath();
      ctx.arc(probeX, probeY, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#06B6D4";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [planet, angleDeg, speedMs, airDrag, g, isLaunched, missionCompleted, onMissionComplete]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* Left Interactive Stage */}
      <div className="lg:col-span-7 flex flex-col rounded-xl border border-slate-800 bg-[#0B111C] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80">
          <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
            <span>Trajectory Range</span>
            <span aria-hidden="true">·</span>
            <span className="text-cyan-400">{PLANETS[planet].name} ({g} m/s²)</span>
            <span aria-hidden="true">·</span>
            <span>Hits: {hitCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={launchProbe}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors whitespace-nowrap shrink-0"
            >
              <Play className="w-3.5 h-3.5" />
              Launch Probe
            </button>
            <button
              type="button"
              onClick={resetSim}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        </div>

        <div className="relative flex-1 min-h-[360px]">
          <canvas ref={canvasRef} className="w-full h-full block" />
          {telemetry.hitTarget && (
            <div className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono">
              ● Target Hit at {telemetry.range.toFixed(1)}m
            </div>
          )}
        </div>

        {/* Live Energy & Kinematics Telemetry */}
        <div className="grid grid-cols-3 border-t border-slate-800 divide-x divide-slate-800 bg-[#080D16]">
          <div className="p-3.5">
            <div className="text-xs text-slate-400">Distance Traveled</div>
            <div className="text-2xl font-mono font-semibold tabular-nums text-slate-100 mt-0.5">
              {telemetry.range.toFixed(1)}
              <span className="text-xs text-slate-400 ml-1 font-normal">m</span>
            </div>
          </div>
          <div className="p-3.5">
            <div className="text-xs text-slate-400">Peak Altitude</div>
            <div className="text-2xl font-mono font-semibold tabular-nums text-cyan-400 mt-0.5">
              {telemetry.maxHeight.toFixed(1)}
              <span className="text-xs text-slate-400 ml-1 font-normal">m</span>
            </div>
          </div>
          <div className="p-3.5">
            <div className="text-xs text-slate-400 mb-1.5">KE / PE Split</div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden flex">
              <div className="bg-cyan-400 h-full transition-all duration-75" style={{ width: `${telemetry.kePct}%` }} />
              <div className="bg-amber-400 h-full transition-all duration-75" style={{ width: `${telemetry.pePct}%` }} />
            </div>
            <div className="flex justify-between text-[11px] font-mono tabular-nums text-slate-400 mt-1">
              <span>KE {telemetry.kePct}%</span>
              <span>PE {telemetry.pePct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Control Deck */}
      <div className="lg:col-span-5 flex flex-col gap-5 rounded-xl border border-slate-800 bg-[#0E1522] p-5">
        <div>
          <div className="text-xs text-slate-400 mb-2">Select Gravity Environment</div>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(PLANETS) as PlanetId[]).map((pid) => (
              <button
                key={pid}
                type="button"
                onClick={() => {
                  setPlanet(pid);
                  resetSim();
                }}
                className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-colors whitespace-nowrap truncate ${
                  planet === pid
                    ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-200"
                    : "border-slate-800 bg-[#070B12] text-slate-400 hover:text-slate-200"
                }`}
              >
                {PLANETS[pid].name} · {PLANETS[pid].g} m/s²
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <label htmlFor="angle-slider" className="text-slate-200 font-medium">
                Launch Angle (θ)
              </label>
              <span className="font-mono tabular-nums text-cyan-400">{angleDeg}°</span>
            </div>
            <input
              id="angle-slider"
              type="range"
              min={10}
              max={85}
              value={angleDeg}
              onChange={(e) => setAngleDeg(Number(e.target.value))}
              className="w-full lab-slider"
            />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <label htmlFor="speed-slider" className="text-slate-200 font-medium">
                Initial Launch Speed (v₀)
              </label>
              <span className="font-mono tabular-nums text-amber-400">{speedMs} m/s</span>
            </div>
            <input
              id="speed-slider"
              type="range"
              min={8}
              max={45}
              value={speedMs}
              onChange={(e) => setSpeedMs(Number(e.target.value))}
              className="w-full lab-slider"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-sm text-slate-300 flex items-center gap-2">
              <Wind className="w-4 h-4 text-slate-400" />
              Atmospheric Air Drag
            </span>
            <button
              type="button"
              onClick={() => setAirDrag((v) => !v)}
              disabled={planet === "moon"}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                planet === "moon"
                  ? "border-slate-800 bg-slate-900/50 text-slate-600 cursor-not-allowed"
                  : airDrag
                  ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                  : "border-slate-700 bg-slate-900 text-slate-400"
              }`}
            >
              {planet === "moon" ? "Vacuum (Moon)" : airDrag ? "Drag On" : "Drag Off"}
            </button>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-[#070B12] border border-slate-800 text-xs font-mono flex items-center justify-between">
          <span className="text-slate-400">Predicted Vacuum Range:</span>
          <span className="text-slate-100 tabular-nums">{theoreticalRange.toFixed(1)} m</span>
        </div>

        <div className="mt-auto pt-4 border-t border-slate-800">
          <div className="flex items-start gap-3">
            {missionCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <Target className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="text-sm font-semibold text-slate-100">
                {missionCompleted ? "Mission Complete: Lunar Precision (+120 XP)" : "Discovery Mission: Lunar Precision"}
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Select Moon gravity and land your probe inside the 120m target zone (110m–130m) using a launch speed of 22 m/s or less.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
