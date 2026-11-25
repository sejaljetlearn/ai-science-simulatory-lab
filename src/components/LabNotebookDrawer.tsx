import React from "react";
import { X, CheckCircle2, Trash2, Award, BookOpen } from "lucide-react";
import { EXPERIMENTS } from "../data/experiments";
import { StudentProgress } from "../types/lab";

interface LabNotebookDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  progress: StudentProgress;
  onDeleteNote: (id: string) => void;
  onResetProgress: () => void;
}

function getExplorerRank(xp: number): string {
  if (xp >= 700) return "Lead Quantum Architect";
  if (xp >= 400) return "Senior Lab Researcher";
  if (xp >= 180) return "Field Experiment Specialist";
  return "Junior Lab Apprentice";
}

export const LabNotebookDrawer: React.FC<LabNotebookDrawerProps> = ({
  isOpen,
  onClose,
  progress,
  onDeleteNote,
  onResetProgress,
}) => {
  if (!isOpen) return null;

  const rank = getExplorerRank(progress.xp);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#0B111C] border-l border-slate-800 h-full flex flex-col">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-slate-100">My Lab Notebook</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Lab Notebook"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Explorer Rank Summary */}
          <div className="p-4 rounded-xl border border-slate-800 bg-[#0E1522]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">Explorer Rank</div>
                <div className="text-base font-semibold text-slate-100 mt-0.5">{rank}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">Total XP</div>
                <div className="text-xl font-mono font-bold tabular-nums text-cyan-400">
                  {progress.xp}
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Missions: {progress.completedMissions.length}/4</span>
              <span>Challenges: {progress.solvedChallenges.length}/8</span>
            </div>
          </div>

          {/* Discovery Missions Checklist */}
          <div>
            <h3 className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3">
              Discovery Missions
            </h3>
            <div className="space-y-2">
              {EXPERIMENTS.map((exp) => {
                const done = progress.completedMissions.includes(exp.id);
                return (
                  <div
                    key={exp.id}
                    className="p-3 rounded-lg border border-slate-800 bg-[#070B12] flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-200">{exp.missionTitle}</div>
                      <div className="text-xs text-slate-500">{exp.disciplineLabel} Lab</div>
                    </div>
                    {done ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        Complete
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <Award className="w-4 h-4" />
                        In Progress
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Saved Lab Observations */}
          <div>
            <h3 className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3">
              Saved Observations ({progress.notes.length})
            </h3>
            {progress.notes.length === 0 ? (
              <p className="text-xs text-slate-500 leading-relaxed">
                No observations logged yet. Use the observation bar under any simulation on the Lab Bench to record discoveries.
              </p>
            ) : (
              <div className="space-y-3">
                {progress.notes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3.5 rounded-lg border border-slate-800 bg-[#0E1522] space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="text-cyan-400 font-medium">{note.experimentTitle}</span>
                      <button
                        type="button"
                        onClick={() => onDeleteNote(note.id)}
                        aria-label="Delete observation"
                        className="text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed">{note.observation}</p>
                    <div className="text-[11px] font-mono text-slate-500">
                      {note.snapshot} · {note.createdAt}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onResetProgress}
            className="text-xs text-slate-500 hover:text-rose-400 transition-colors"
          >
            Reset Local Progress
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-slate-100 hover:bg-slate-700 transition-colors"
          >
            Back to Lab
          </button>
        </div>
      </div>
    </div>
  );
};
