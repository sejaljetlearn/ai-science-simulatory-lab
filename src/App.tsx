import { useCallback, useEffect, useState } from "react";
import { Navbar } from "./components/Navbar";
import { HeroSection } from "./components/HeroSection";
import { ExperimentCatalog } from "./components/ExperimentCatalog";
import { LabBenchWorkspace } from "./components/LabBenchWorkspace";
import { ChallengeArena } from "./components/ChallengeArena";
import { AIMentorPanel } from "./components/AIMentorPanel";
import { LabNotebookDrawer } from "./components/LabNotebookDrawer";
import { Discipline, LiveLabState, StudentProgress } from "./types/lab";

const STORAGE_KEY = "ai_science_lab_progress_v1";

const DEFAULT_PROGRESS: StudentProgress = {
  xp: 0,
  completedMissions: [],
  solvedChallenges: [],
  notes: [],
};

export default function App() {
  const [activeExperiment, setActiveExperiment] = useState<Discipline>("chemistry");
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [mentorPreFill, setMentorPreFill] = useState<string | undefined>(undefined);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [progress, setProgress] = useState<StudentProgress>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as StudentProgress;
    } catch {
      // ignore storage errors
    }
    return DEFAULT_PROGRESS;
  });

  const [liveState, setLiveState] = useState<LiveLabState>({
    experimentId: "chemistry",
    experimentTitle: "Acid-Base Reaction & pH Mixer",
    discipline: "Chemistry",
    statusLabel: "▲ Acidic Solution",
    parameters: {
      acidVolumeMl: 50,
      baseVolumeMl: 20,
      temperatureC: 24,
      calculatedPH: 1.37,
    },
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // ignore storage errors
    }
  }, [progress]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3500);
  }, []);

  const handleSelectExperiment = (id: Discipline) => {
    setActiveExperiment(id);
    const el = document.getElementById("lab-bench");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const handleMissionComplete = useCallback(
    (id: Discipline) => {
      setProgress((prev) => {
        if (prev.completedMissions.includes(id)) return prev;
        showToast(`Mission Unlocked! +120 XP earned in ${id.toUpperCase()} Lab`);
        return {
          ...prev,
          xp: prev.xp + 120,
          completedMissions: [...prev.completedMissions, id],
        };
      });
    },
    [showToast]
  );

  const handleSolveChallenge = useCallback(
    (challengeId: string, xpReward: number) => {
      setProgress((prev) => {
        if (prev.solvedChallenges.includes(challengeId)) return prev;
        showToast(`Challenge Solved! +${xpReward} XP`);
        return {
          ...prev,
          xp: prev.xp + xpReward,
          solvedChallenges: [...prev.solvedChallenges, challengeId],
        };
      });
    },
    [showToast]
  );

  const handleSaveObservation = (observation: string) => {
    const newNote = {
      id: `${Date.now()}`,
      experimentId: liveState.experimentId,
      experimentTitle: liveState.experimentTitle,
      observation,
      snapshot: liveState.statusLabel,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setProgress((prev) => ({
      ...prev,
      xp: prev.xp + 25,
      notes: [newNote, ...prev.notes],
    }));
    showToast("Observation saved to Lab Notebook (+25 XP)");
  };

  const handleAskMentorFromBench = () => {
    setMentorPreFill(
      `Look at my current ${liveState.experimentTitle} settings (${liveState.statusLabel}). Can you explain why this is happening and what I should test next?`
    );
    const el = document.getElementById("ai-mentor");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#070B12] text-slate-100">
      <Navbar xp={progress.xp} onOpenNotebook={() => setNotebookOpen(true)} />

      <main className="flex-1">
        <HeroSection
          completedMissionsCount={progress.completedMissions.length}
          solvedChallengesCount={progress.solvedChallenges.length}
          xp={progress.xp}
          onEnterLab={() => {
            const el = document.getElementById("lab-bench");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}
        />

        <ExperimentCatalog
          activeExperiment={activeExperiment}
          completedMissions={progress.completedMissions}
          onSelectExperiment={handleSelectExperiment}
        />

        <LabBenchWorkspace
          activeExperiment={activeExperiment}
          onSelectExperiment={setActiveExperiment}
          liveState={liveState}
          onLiveStateChange={setLiveState}
          completedMissions={progress.completedMissions}
          onMissionComplete={handleMissionComplete}
          onSaveObservation={handleSaveObservation}
          onAskMentorFromBench={handleAskMentorFromBench}
        />

        <ChallengeArena
          solvedChallenges={progress.solvedChallenges}
          onSolveChallenge={handleSolveChallenge}
          onTryInLab={handleSelectExperiment}
        />

        <AIMentorPanel
          liveState={liveState}
          preFilledPrompt={mentorPreFill}
          onClearPreFill={() => setMentorPreFill(undefined)}
        />
      </main>

      <footer className="border-t border-slate-800/80 bg-[#070B12] py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <span>AI Science Lab · Interactive STEM Exploration for Learners Aged 12–14</span>
          <div className="flex items-center gap-6">
            <a href="#experiments" className="hover:text-slate-300 transition-colors">
              Experiments
            </a>
            <a href="#lab-bench" className="hover:text-slate-300 transition-colors">
              Lab Bench
            </a>
            <a href="#challenge" className="hover:text-slate-300 transition-colors">
              Challenge
            </a>
            <a href="#ai-mentor" className="hover:text-slate-300 transition-colors">
              AI Mentor
            </a>
          </div>
        </div>
      </footer>

      <LabNotebookDrawer
        isOpen={notebookOpen}
        onClose={() => setNotebookOpen(false)}
        progress={progress}
        onDeleteNote={(id) =>
          setProgress((prev) => ({
            ...prev,
            notes: prev.notes.filter((n) => n.id !== id),
          }))
        }
        onResetProgress={() => {
          setProgress(DEFAULT_PROGRESS);
          setNotebookOpen(false);
        }}
      />

      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl border border-emerald-500/50 bg-[#0B111C] text-emerald-300 text-xs font-semibold shadow-lg">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
