import React, { useState } from "react";
import { ArrowRight, CheckCircle2, FlaskConical } from "lucide-react";
import { EXPERIMENTS } from "../data/experiments";
import { Discipline } from "../types/lab";

interface ExperimentCatalogProps {
  activeExperiment: Discipline;
  completedMissions: Discipline[];
  onSelectExperiment: (id: Discipline) => void;
}

export const ExperimentCatalog: React.FC<ExperimentCatalogProps> = ({
  activeExperiment,
  completedMissions,
  onSelectExperiment,
}) => {
  const [filter, setFilter] = useState<"all" | Discipline>("all");
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const visibleExperiments =
    filter === "all" ? EXPERIMENTS : EXPERIMENTS.filter((exp) => exp.id === filter);

  return (
    <section id="experiments" className="max-w-7xl mx-auto px-6 py-14 border-b border-slate-800/80">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-50 tracking-tight" style={{ textWrap: "balance" }}>
            Choose an Interactive Lab
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mt-2 max-w-2xl">
            Each station runs real scientific equations in your browser so you can test extreme conditions safely.
          </p>
        </div>

        {/* Interactive Discipline Filter Tabs */}
        <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-[#0E1522] border border-slate-800 self-start md:self-auto overflow-x-auto max-w-full">
          {(
            [
              { id: "all", label: "All Labs" },
              { id: "chemistry", label: "Chemistry" },
              { id: "physics", label: "Physics" },
              { id: "biology", label: "Biology" },
              { id: "astronomy", label: "Astronomy" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                filter === tab.id
                  ? "bg-cyan-500 text-slate-950 font-semibold"
                  : "text-slate-400 hover:text-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {visibleExperiments.map((exp) => {
          const isSelected = activeExperiment === exp.id;
          const isDone = completedMissions.includes(exp.id);
          const hasFailedImg = failedImages[exp.id];

          return (
            <article
              key={exp.id}
              className={`flex flex-col rounded-xl border transition-colors overflow-hidden bg-[#0E1522] ${
                isSelected ? "border-cyan-500/70" : "border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-[#070B12] relative">
                {!hasFailedImg ? (
                  <img
                    src={exp.coverImage}
                    alt={`${exp.title} scientific apparatus illustration`}
                    referrerPolicy="no-referrer"
                    onError={() => setFailedImages((prev) => ({ ...prev, [exp.id]: true }))}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-900 to-slate-950 text-center">
                    <FlaskConical className="w-10 h-10 text-cyan-400 mb-2" />
                    <span className="text-xs font-mono text-slate-300">{exp.disciplineLabel}</span>
                  </div>
                )}
              </div>

              <div className="p-5 flex-1 flex flex-col">
                {/* Unboxed clean metadata line */}
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span style={{ color: exp.accentHex }} className="font-medium">
                    {exp.disciplineLabel}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{exp.duration}</span>
                  <span aria-hidden="true">·</span>
                  <span>{exp.ageRange}</span>
                </div>

                <h3 className="text-lg font-semibold text-slate-100 mt-2 leading-snug">
                  {exp.title}
                </h3>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed line-clamp-3">
                  {exp.summary}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs font-mono text-slate-400 truncate">
                  {exp.formula}
                </div>

                <div className="mt-4 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectExperiment(exp.id)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                      isSelected
                        ? "bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                        : "bg-slate-800 text-slate-100 hover:bg-slate-700"
                    }`}
                  >
                    <span>{isSelected ? "Active on Bench" : "Run Experiment"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  {isDone && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 whitespace-nowrap shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                      Solved
                    </span>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
