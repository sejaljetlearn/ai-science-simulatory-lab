import React, { useState } from "react";
import { BookmarkPlus, MessageSquare, Check } from "lucide-react";
import { EXPERIMENTS } from "../data/experiments";
import { Discipline, LiveLabState } from "../types/lab";
import { ChemistrySim } from "./sims/ChemistrySim";
import { PhysicsSim } from "./sims/PhysicsSim";
import { BiologySim } from "./sims/BiologySim";
import { AstronomySim } from "./sims/AstronomySim";

interface LabBenchWorkspaceProps {
  activeExperiment: Discipline;
  onSelectExperiment: (id: Discipline) => void;
  liveState: LiveLabState;
  onLiveStateChange: (state: LiveLabState) => void;
  completedMissions: Discipline[];
  onMissionComplete: (id: Discipline) => void;
  onSaveObservation: (noteText: string) => void;
  onAskMentorFromBench: () => void;
}

export const LabBenchWorkspace: React.FC<LabBenchWorkspaceProps> = ({
  activeExperiment,
  onSelectExperiment,
  liveState,
  onLiveStateChange,
  completedMissions,
  onMissionComplete,
  onSaveObservation,
  onAskMentorFromBench,
}) => {
  const [noteInput, setNoteInput] = useState("");
  const [savedFeedback, setSavedFeedback] = useState(false);

  const currentMeta = EXPERIMENTS.find((e) => e.id === activeExperiment) ?? EXPERIMENTS[0];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = noteInput.trim();
    if (!trimmed) return;
    onSaveObservation(trimmed);
    setNoteInput("");
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  return (
    <section id="lab-bench" className="max-w-7xl mx-auto px-6 py-14 border-b border-slate-800/80">
      {/* Bench Header & Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 mb-6">
        <div>
          <div className="text-xs font-mono text-cyan-400 mb-1">
            Virtual Lab Bench · {currentMeta.keyConcept}
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-50 tracking-tight">
            {currentMeta.title}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-[#0E1522] border border-slate-800 overflow-x-auto max-w-full">
            {EXPERIMENTS.map((exp) => (
              <button
                key={exp.id}
                type="button"
                onClick={() => onSelectExperiment(exp.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activeExperiment === exp.id
                    ? "bg-cyan-500 text-slate-950 font-semibold"
                    : "text-slate-400 hover:text-slate-100"
                }`}
              >
                {exp.disciplineLabel}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onAskMentorFromBench}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border border-cyan-500/50 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 transition-colors whitespace-nowrap shrink-0"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Ask AI Mentor About This Run
          </button>
        </div>
      </div>

      {/* Active Simulation Stage */}
      {activeExperiment === "chemistry" && (
        <ChemistrySim
          onStateChange={onLiveStateChange}
          onMissionComplete={() => onMissionComplete("chemistry")}
          missionCompleted={completedMissions.includes("chemistry")}
        />
      )}
      {activeExperiment === "physics" && (
        <PhysicsSim
          onStateChange={onLiveStateChange}
          onMissionComplete={() => onMissionComplete("physics")}
          missionCompleted={completedMissions.includes("physics")}
        />
      )}
      {activeExperiment === "biology" && (
        <BiologySim
          onStateChange={onLiveStateChange}
          onMissionComplete={() => onMissionComplete("biology")}
          missionCompleted={completedMissions.includes("biology")}
        />
      )}
      {activeExperiment === "astronomy" && (
        <AstronomySim
          onStateChange={onLiveStateChange}
          onMissionComplete={() => onMissionComplete("astronomy")}
          missionCompleted={completedMissions.includes("astronomy")}
        />
      )}

      {/* Observation Logger Bar */}
      <form
        onSubmit={handleSave}
        className="mt-6 p-4 rounded-xl border border-slate-800 bg-[#0B111C] flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
      >
        <div className="text-xs font-mono text-slate-400 whitespace-nowrap shrink-0">
          Log Lab Observation ({liveState.statusLabel}):
        </div>
        <input
          type="text"
          value={noteInput}
          onChange={(e) => setNoteInput(e.target.value)}
          placeholder="Write what you discovered (e.g., Green light bounced off the chloroplast and dropped O₂)..."
          className="flex-1 bg-[#070B12] border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-slate-100 hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
        >
          {savedFeedback ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
          <span>{savedFeedback ? "Saved to Notebook" : "Save Observation"}</span>
        </button>
      </form>
    </section>
  );
};
