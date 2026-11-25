import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, CheckCircle2, Orbit } from "lucide-react";
import { LiveLabState } from "../../types/lab";

interface AstronomySimProps {
  onStateChange: (state: LiveLabState) => void;
  onMissionComplete: () => void;
  missionCompleted: boolean;
}

export const AstronomySim: React.FC<AstronomySimProps> = ({
  onStateChange,
  onMissionComplete,
  missionCompleted,
}) => {
  const [starMass, setStarMass] = useState(1.0); // Solar masses
  const [startDist, setStartDist] = useState(1.2); // AU-like simulation units
  const [launchSpeed, setLaunchSpeed] = useState(28); // km/s scaled
  const [isRunning, setIsRunning] = useState(true);

  const [orbitTelemetry, setOrbitTelemetry] = useState({
    speedKms: 28,
    distanceAu: 1.2,
    eccentricity: 0.12,
    revolutions: 0,
    status: "● Stable Orbit",
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bodyRef = useRef({
    x: 1.2,
    y: 0,
    vx: 0,
    vy: 28 / 29.78,
    trail: [] as { x: number; y: number }[],
    rMin: 1.2,
    rMax: 1.2,
    angleAccum: 0,
    lastAngle: 0,
    crashed: false,
    escaped: false,
  });

  // G scaled so at starMass=1.0, r=1.0 AU, circular velocity = 1.0 (which corresponds to ~29.8 km/s)
  const circularSpeedKms = useMemo(() => {
    return 29.78 * Math.sqrt(starMass / startDist);
  }, [starMass, startDist]);

  const escapeSpeedKms = useMemo(() => {
    return circularSpeedKms * Math.SQRT2;
  }, [circularSpeedKms]);

  const resetOrbit = (mass = starMass, dist = startDist, spd = launchSpeed) => {
    const vNorm = spd / 29.78;
    bodyRef.current = {
      x: dist,
      y: 0,
      vx: 0,
      vy: vNorm,
      trail: [{ x: dist, y: 0 }],
      rMin: dist,
      rMax: dist,
      angleAccum: 0,
      lastAngle: 0,
      crashed: false,
      escaped: false,
    };
    setOrbitTelemetry({
      speedKms: spd,
      distanceAu: dist,
      eccentricity: 0,
      revolutions: 0,
      status: "● Launched",
    });
    setIsRunning(true);
  };

  useEffect(() => {
    onStateChange({
      experimentId: "astronomy",
      experimentTitle: "Orbital Gravity & Spacetime Sandbox",
      discipline: "Astronomy",
      statusLabel: orbitTelemetry.status,
      parameters: {
        starMassSolar: starMass,
        launchDistanceAu: startDist,
        launchSpeedKms: launchSpeed,
        currentSpeedKms: Number(orbitTelemetry.speedKms.toFixed(1)),
        eccentricity: Number(orbitTelemetry.eccentricity.toFixed(2)),
        completedRevolutions: orbitTelemetry.revolutions,
        orbitStatus: orbitTelemetry.status,
      },
    });
  }, [starMass, startDist, launchSpeed, orbitTelemetry, onStateChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;
    let frameCount = 0;

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
      const cy = h * 0.5;
      const pxPerAu = Math.min(w, h) * 0.19;

      const b = bodyRef.current;
      if (isRunning && !b.crashed && !b.escaped) {
        // Velocity Verlet integration for crisp stable orbits
        const subSteps = 4;
        const dt = 0.008;
        for (let s = 0; s < subSteps; s++) {
          const r2 = b.x * b.x + b.y * b.y;
          const r = Math.sqrt(r2);
          if (r < 0.16) {
            b.crashed = true;
            break;
          }
          if (r > 3.6) {
            b.escaped = true;
            break;
          }
          const aMag = -starMass / (r2 * r);
          const ax1 = aMag * b.x;
          const ay1 = aMag * b.y;

          b.x += b.vx * dt + 0.5 * ax1 * dt * dt;
          b.y += b.vy * dt + 0.5 * ay1 * dt * dt;

          const r2Next = b.x * b.x + b.y * b.y;
          const rNext = Math.sqrt(r2Next);
          const aMagNext = -starMass / (r2Next * rNext);
          const ax2 = aMagNext * b.x;
          const ay2 = aMagNext * b.y;

          b.vx += 0.5 * (ax1 + ax2) * dt;
          b.vy += 0.5 * (ay1 + ay2) * dt;

          b.rMin = Math.min(b.rMin, rNext);
          b.rMax = Math.max(b.rMax, rNext);

          const ang = Math.atan2(b.y, b.x);
          let dAng = ang - b.lastAngle;
          if (dAng > Math.PI) dAng -= Math.PI * 2;
          if (dAng < -Math.PI) dAng += Math.PI * 2;
          b.angleAccum += Math.abs(dAng);
          b.lastAngle = ang;
        }

        frameCount += 1;
        if (frameCount % 2 === 0) {
          b.trail.push({ x: b.x, y: b.y });
          if (b.trail.length > 260) b.trail.shift();
        }

        const rCurr = Math.hypot(b.x, b.y);
        const vCurr = Math.hypot(b.vx, b.vy) * 29.78;
        const ecc = (b.rMax - b.rMin) / Math.max(0.01, b.rMax + b.rMin);
        const revs = Math.floor(b.angleAccum / (Math.PI * 2));

        let status = "● Stable Orbit";
        if (b.crashed) status = "✖ Star Impact";
        else if (b.escaped) status = "✖ Escaped System";
        else if (ecc > 0.22) status = "▲ Elliptical Orbit";

        if (!missionCompleted && !b.crashed && !b.escaped && revs >= 2 && ecc >= 0.25 && ecc <= 0.65) {
          onMissionComplete();
        }

        if (frameCount % 4 === 0 || b.crashed || b.escaped) {
          setOrbitTelemetry({
            speedKms: vCurr,
            distanceAu: rCurr,
            eccentricity: ecc,
            revolutions: revs,
            status,
          });
        }
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.fillStyle = "#060911";
      ctx.fillRect(0, 0, w, h);

      // Warped spacetime grid lines
      ctx.strokeStyle = "rgba(245, 158, 11, 0.14)";
      ctx.lineWidth = 1;
      const gridStep = 32;
      for (let gx = 0; gx <= w; gx += gridStep) {
        ctx.beginPath();
        for (let gy = 0; gy <= h; gy += 12) {
          const dx = gx - cx;
          const dy = gy - cy;
          const dist = Math.hypot(dx, dy) + 18;
          const pull = (starMass * 1200) / (dist * dist + 900);
          const wx = gx - dx * pull * 0.25;
          const wy = gy - dy * pull * 0.25;
          if (gy === 0) ctx.moveTo(wx, wy);
          else ctx.lineTo(wx, wy);
        }
        ctx.stroke();
      }
      for (let gy = 0; gy <= h; gy += gridStep) {
        ctx.beginPath();
        for (let gx = 0; gx <= w; gx += 12) {
          const dx = gx - cx;
          const dy = gy - cy;
          const dist = Math.hypot(dx, dy) + 18;
          const pull = (starMass * 1200) / (dist * dist + 900);
          const wx = gx - dx * pull * 0.25;
          const wy = gy - dy * pull * 0.25;
          if (gx === 0) ctx.moveTo(wx, wy);
          else ctx.lineTo(wx, wy);
        }
        ctx.stroke();
      }

      // Central Star glow
      const starRadius = 14 + starMass * 7;
      const glow = ctx.createRadialGradient(cx, cy, starRadius * 0.3, cx, cy, starRadius * 3.2);
      glow.addColorStop(0, "rgba(253, 224, 71, 0.95)");
      glow.addColorStop(0.4, "rgba(245, 158, 11, 0.45)");
      glow.addColorStop(1, "rgba(245, 158, 11, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, starRadius * 3.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#FDE047";
      ctx.beginPath();
      ctx.arc(cx, cy, starRadius, 0, Math.PI * 2);
      ctx.fill();

      // Orbital trail
      if (b.trail.length > 1) {
        ctx.strokeStyle = "rgba(56, 189, 248, 0.7)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        b.trail.forEach((pt, idx) => {
          const px = cx + pt.x * pxPerAu;
          const py = cy + pt.y * pxPerAu;
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
      }

      // Planet & velocity vector
      if (!b.crashed) {
        const px = cx + b.x * pxPerAu;
        const py = cy + b.y * pxPerAu;

        // Velocity vector arrow
        ctx.strokeStyle = "#34D399";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + b.vx * 26, py + b.vy * 26);
        ctx.stroke();

        // Planet circle
        ctx.fillStyle = "#38BDF8";
        ctx.beginPath();
        ctx.arc(px, py, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#E0F2FE";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [starMass, isRunning, missionCompleted, onMissionComplete]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* Left Interactive Stage */}
      <div className="lg:col-span-7 flex flex-col rounded-xl border border-slate-800 bg-[#0B111C] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80">
          <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
            <span>Gravity Well</span>
            <span aria-hidden="true">·</span>
            <span
              className={
                orbitTelemetry.status.includes("✖")
                  ? "text-rose-400"
                  : orbitTelemetry.status.includes("▲")
                  ? "text-amber-400"
                  : "text-emerald-400"
              }
            >
              {orbitTelemetry.status}
            </span>
            <span aria-hidden="true">·</span>
            <span>Loops: {orbitTelemetry.revolutions}</span>
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
              onClick={() => resetOrbit()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Relaunch
            </button>
          </div>
        </div>

        <div className="relative flex-1 min-h-[360px]">
          <canvas ref={canvasRef} className="w-full h-full block" />
          <div className="absolute bottom-3 left-4 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-300 bg-[#070B12]/85 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-300 inline-block" /> Star ({starMass.toFixed(1)} M☉)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" /> Exoplanet
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-emerald-400 inline-block" /> Velocity Vector
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 border-t border-slate-800 divide-x divide-slate-800 bg-[#080D16]">
          <div className="p-3.5">
            <div className="text-xs text-slate-400">Orbital Speed</div>
            <div className="text-2xl font-mono font-semibold tabular-nums text-sky-400 mt-0.5">
              {orbitTelemetry.speedKms.toFixed(1)}
              <span className="text-xs text-slate-400 ml-1 font-normal">km/s</span>
            </div>
          </div>
          <div className="p-3.5">
            <div className="text-xs text-slate-400">Distance</div>
            <div className="text-2xl font-mono font-semibold tabular-nums text-slate-100 mt-0.5">
              {orbitTelemetry.distanceAu.toFixed(2)}
              <span className="text-xs text-slate-400 ml-1 font-normal">AU</span>
            </div>
          </div>
          <div className="p-3.5">
            <div className="text-xs text-slate-400">Eccentricity</div>
            <div className="text-2xl font-mono font-semibold tabular-nums text-amber-400 mt-0.5">
              {orbitTelemetry.eccentricity.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Right Control Deck */}
      <div className="lg:col-span-5 flex flex-col gap-5 rounded-xl border border-slate-800 bg-[#0E1522] p-5">
        <div>
          <div className="text-xs text-slate-400 mb-2">Quick Orbital Presets</div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setStarMass(1.0);
                setStartDist(1.0);
                setLaunchSpeed(30);
                resetOrbit(1.0, 1.0, 30);
              }}
              className="px-2.5 py-2 text-xs font-medium rounded-lg border border-slate-800 bg-[#070B12] text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 transition-colors whitespace-nowrap truncate"
            >
              Circular
            </button>
            <button
              type="button"
              onClick={() => {
                setStarMass(1.2);
                setStartDist(1.4);
                setLaunchSpeed(22);
                resetOrbit(1.2, 1.4, 22);
              }}
              className="px-2.5 py-2 text-xs font-medium rounded-lg border border-slate-800 bg-[#070B12] text-slate-300 hover:text-amber-300 hover:border-amber-500/40 transition-colors whitespace-nowrap truncate"
            >
              Comet Loop
            </button>
            <button
              type="button"
              onClick={() => {
                setStarMass(1.0);
                setStartDist(1.0);
                setLaunchSpeed(44);
                resetOrbit(1.0, 1.0, 44);
              }}
              className="px-2.5 py-2 text-xs font-medium rounded-lg border border-slate-800 bg-[#070B12] text-slate-300 hover:text-rose-300 hover:border-rose-500/40 transition-colors whitespace-nowrap truncate"
            >
              Escape Path
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <label htmlFor="star-mass-slider" className="text-slate-200 font-medium">
                Star Mass (M)
              </label>
              <span className="font-mono tabular-nums text-amber-400">{starMass.toFixed(1)} M☉</span>
            </div>
            <input
              id="star-mass-slider"
              type="range"
              min={0.5}
              max={2.4}
              step={0.1}
              value={starMass}
              onChange={(e) => setStarMass(Number(e.target.value))}
              className="w-full lab-slider"
            />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <label htmlFor="dist-slider" className="text-slate-200 font-medium">
                Initial Orbital Distance (r)
              </label>
              <span className="font-mono tabular-nums text-slate-200">{startDist.toFixed(2)} AU</span>
            </div>
            <input
              id="dist-slider"
              type="range"
              min={0.6}
              max={1.8}
              step={0.05}
              value={startDist}
              onChange={(e) => {
                const v = Number(e.target.value);
                setStartDist(v);
                resetOrbit(starMass, v, launchSpeed);
              }}
              className="w-full lab-slider"
            />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <label htmlFor="vel-slider" className="text-slate-200 font-medium">
                Launch Tangential Speed (v)
              </label>
              <span className="font-mono tabular-nums text-sky-400">{launchSpeed} km/s</span>
            </div>
            <input
              id="vel-slider"
              type="range"
              min={10}
              max={55}
              value={launchSpeed}
              onChange={(e) => {
                const v = Number(e.target.value);
                setLaunchSpeed(v);
                resetOrbit(starMass, startDist, v);
              }}
              className="w-full lab-slider"
            />
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-[#070B12] border border-slate-800 text-xs font-mono space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-400">Circular Speed Needed:</span>
            <span className="text-emerald-400 tabular-nums">{circularSpeedKms.toFixed(1)} km/s</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Escape Velocity Limit:</span>
            <span className="text-rose-400 tabular-nums">{escapeSpeedKms.toFixed(1)} km/s</span>
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-slate-800">
          <div className="flex items-start gap-3">
            {missionCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <Orbit className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="text-sm font-semibold text-slate-100">
                {missionCompleted ? "Mission Complete: Comet Architect (+120 XP)" : "Discovery Mission: Comet Architect"}
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Launch an elliptical orbit with eccentricity between 0.25 and 0.65 that survives 2 full loops around the star.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
