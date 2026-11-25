import React, { useState } from "react";
import { ArrowRight, Atom, FlaskConical, Sparkles, Compass } from "lucide-react";
import { HERO_LAB_IMAGE } from "../data/experiments";

interface HeroSectionProps {
  completedMissionsCount: number;
  solvedChallengesCount: number;
  xp: number;
  onEnterLab: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  completedMissionsCount,
  solvedChallengesCount,
  xp,
  onEnterLab,
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <section id="top" className="border-b border-slate-800/80 bg-[#070B12]">
      <div className="max-w-7xl mx-auto px-6 py-12 lg:py-16">
        {/* Two-column Hero Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center">
            <div className="text-xs font-medium text-cyan-400 tracking-wide mb-3">
              Interactive Digital Laboratory · Ages 12–14
            </div>
            <h1
              className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-50 leading-[1.1]"
              style={{ textWrap: "balance" }}
            >
              Experiment safely with real science in motion
            </h1>
            <p className="mt-5 text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl">
              Mix reactive molecules, launch probes across planetary gravity wells, inspect living chloroplasts, and ask an AI lab mentor why every result happens.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onEnterLab}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-lg bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors whitespace-nowrap shrink-0"
              >
                <span>Open Lab Bench</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href="#experiments"
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-lg border border-slate-700 bg-[#0E1522] text-slate-200 hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
              >
                Explore Experiments
              </a>
            </div>
          </div>

          <div className="lg:col-span-6 flex">
            <div className="relative w-full min-h-[280px] lg:min-h-[380px] rounded-xl overflow-hidden border border-slate-800 bg-[#0E1522]">
              {!imgError ? (
                <img
                  src={HERO_LAB_IMAGE}
                  alt="Futuristic digital science laboratory workstation with optical lenses and atomic orbital holograms"
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-900 via-[#0E1522] to-cyan-950/40 text-center">
                  <Atom className="w-14 h-14 text-cyan-400 mb-3" />
                  <div className="text-lg font-semibold text-slate-100">AI Science Lab Workbench</div>
                  <p className="text-xs text-slate-400 mt-1">Interactive Physics, Chemistry, Biology & Astronomy</p>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#070B12]/70 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column Capability & Progress Strip Below Hero */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-slate-800 rounded-xl bg-[#0B111C] divide-y sm:divide-y-0 sm:divide-x divide-slate-800">
          <div className="p-5 flex items-start gap-3.5">
            <FlaskConical className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-slate-100">4 Live Simulations</div>
              <div className="text-xs text-slate-400 mt-1">Chemistry, Physics, Biology, and Space</div>
            </div>
          </div>
          <div className="p-5 flex items-start gap-3.5">
            <Compass className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-slate-100 tabular-nums">
                {completedMissionsCount} / 4 Missions
              </div>
              <div className="text-xs text-slate-400 mt-1">Hands-on lab discovery goals</div>
            </div>
          </div>
          <div className="p-5 flex items-start gap-3.5">
            <Atom className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-slate-100 tabular-nums">
                {solvedChallengesCount} / 8 Challenges
              </div>
              <div className="text-xs text-slate-400 mt-1">Interactive STEM prediction puzzles</div>
            </div>
          </div>
          <div className="p-5 flex items-start gap-3.5">
            <Sparkles className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-slate-100 tabular-nums">
                {xp} Explorer XP
              </div>
              <div className="text-xs text-slate-400 mt-1">Guided by real-time AI Mentor</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
