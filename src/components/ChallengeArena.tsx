import React, { useState } from "react";
import { CheckCircle2, XCircle, HelpCircle, ArrowRight, Sparkles, Trophy } from "lucide-react";
import { LAB_CHALLENGES } from "../data/experiments";
import { ChallengeItem, Discipline } from "../types/lab";

interface ChallengeArenaProps {
  solvedChallenges: string[];
  onSolveChallenge: (challengeId: string, xpReward: number) => void;
  onTryInLab: (discipline: Discipline) => void;
}

const ChallengeDiagram: React.FC<{ type: ChallengeItem["visualType"] }> = ({ type }) => {
  if (type === "ph" || type === "titration") {
    return (
      <svg viewBox="0 0 260 120" className="w-full h-32 rounded-lg bg-[#070B12] border border-slate-800">
        <defs>
          <linearGradient id="phScale" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="30%" stopColor="#F59E0B" />
            <stop offset="50%" stopColor="#10B981" />
            <stop offset="75%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#6366F1" />
          </linearGradient>
        </defs>
        <rect x="20" y="78" width="220" height="14" rx="4" fill="url(#phScale)" />
        <text x="20" y="106" fill="#94A3B8" fontSize="9" fontFamily="JetBrains Mono">pH 1 Acid</text>
        <text x="130" y="106" fill="#34D399" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle">pH 7 Neutral</text>
        <text x="240" y="106" fill="#94A3B8" fontSize="9" fontFamily="JetBrains Mono" textAnchor="end">pH 14 Base</text>
        <path d="M110 20 L150 20 L165 62 L95 62 Z" fill="rgba(239,68,68,0.35)" stroke="#94A3B8" strokeWidth="1.5" />
        <circle cx="122" cy="46" r="4" fill="#F87171" />
        <circle cx="138" cy="42" r="4" fill="#38BDF8" />
      </svg>
    );
  }
  if (type === "gravity" || type === "energy") {
    return (
      <svg viewBox="0 0 260 120" className="w-full h-32 rounded-lg bg-[#070B12] border border-slate-800">
        <line x1="20" y1="98" x2="240" y2="98" stroke="#334155" strokeWidth="2" />
        <path d="M 32 98 Q 130 12 228 98" fill="none" stroke="#06B6D4" strokeWidth="2" strokeDasharray="4 3" />
        <circle cx="130" cy="55" r="5" fill="#F59E0B" />
        <text x="130" y="42" fill="#FBBF24" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle">Peak Altitude</text>
        <text x="32" y="112" fill="#94A3B8" fontSize="9" fontFamily="JetBrains Mono">Launch θ</text>
        <text x="228" y="112" fill="#34D399" fontSize="9" fontFamily="JetBrains Mono" textAnchor="end">Target</text>
      </svg>
    );
  }
  if (type === "wavelength" || type === "enzymes") {
    return (
      <svg viewBox="0 0 260 120" className="w-full h-32 rounded-lg bg-[#070B12] border border-slate-800">
        <ellipse cx="130" cy="64" rx="70" ry="34" fill="rgba(16,185,129,0.18)" stroke="#10B981" strokeWidth="2" />
        <line x1="70" y1="12" x2="110" y2="48" stroke="#38BDF8" strokeWidth="2" />
        <line x1="130" y1="12" x2="130" y2="30" stroke="#4ADE80" strokeWidth="2" />
        <line x1="130" y1="30" x2="152" y2="12" stroke="#4ADE80" strokeWidth="2" strokeDasharray="3 2" />
        <line x1="190" y1="12" x2="152" y2="48" stroke="#FB7185" strokeWidth="2" />
        <text x="130" y="68" fill="#A7F3D0" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">Chloroplast</text>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 260 120" className="w-full h-32 rounded-lg bg-[#070B12] border border-slate-800">
      <ellipse cx="135" cy="60" rx="88" ry="36" fill="none" stroke="rgba(56,189,248,0.45)" strokeWidth="1.5" strokeDasharray="4 3" />
      <circle cx="96" cy="60" r="12" fill="#FDE047" />
      <circle cx="218" cy="48" r="5.5" fill="#38BDF8" />
      <text x="96" y="88" fill="#FBBF24" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle">Star</text>
      <text x="218" y="37" fill="#7DD3FC" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle">v</text>
    </svg>
  );
};

export const ChallengeArena: React.FC<ChallengeArenaProps> = ({
  solvedChallenges,
  onSolveChallenge,
  onTryInLab,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [loadingHint, setLoadingHint] = useState(false);

  const challenge = LAB_CHALLENGES[currentIndex];
  const isAnswered = selectedOption !== null;
  const isCorrect = selectedOption === challenge.correctIndex;
  const alreadySolved = solvedChallenges.includes(challenge.id);

  const handleSelectOption = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    if (idx === challenge.correctIndex) {
      setStreak((s) => s + 1);
      onSolveChallenge(challenge.id, challenge.xpReward);
    } else {
      setStreak(0);
    }
  };

  const handleNext = () => {
    setSelectedOption(null);
    setAiHint(null);
    setAiError(null);
    setCurrentIndex((prev) => (prev + 1) % LAB_CHALLENGES.length);
  };

  const handleRequestHint = async () => {
    setLoadingHint(true);
    setAiError(null);
    try {
      const res = await fetch("/api/lab-challenge/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: `${challenge.scenario} ${challenge.question}`,
          options: challenge.options,
          mode: isAnswered ? "explain" : "hint",
          selectedOption: isAnswered ? challenge.options[selectedOption!] : undefined,
          correctOption: challenge.options[challenge.correctIndex],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error || "Unable to fetch AI hint right now.");
      } else {
        setAiHint(data.explanation);
      }
    } catch {
      setAiError("Network error contacting AI Science Lab server.");
    } finally {
      setLoadingHint(false);
    }
  };

  return (
    <section id="challenge" className="max-w-7xl mx-auto px-6 py-14 border-b border-slate-800/80">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="text-xs font-mono text-amber-400 mb-1">Interactive Lab Challenge</div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-50 tracking-tight" style={{ textWrap: "balance" }}>
            Predict the Outcome Before You Test
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mt-2 max-w-2xl">
            Solve real scientific mysteries across all four labs to build your streak and earn Explorer XP.
          </p>
        </div>

        <div className="flex items-center gap-6 text-xs font-mono text-slate-300">
          <span>
            Puzzle <span className="text-slate-100 font-semibold tabular-nums">{currentIndex + 1}/{LAB_CHALLENGES.length}</span>
          </span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="inline-flex items-center gap-1.5 text-amber-400">
            <Trophy className="w-4 h-4" />
            <span className="tabular-nums">Streak: {streak}</span>
          </span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="text-emerald-400 tabular-nums">
            Solved: {solvedChallenges.length}/{LAB_CHALLENGES.length}
          </span>
        </div>
      </div>

      {/* Challenge Selector Dots Bar */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {LAB_CHALLENGES.map((item, idx) => {
          const solved = solvedChallenges.includes(item.id);
          const active = idx === currentIndex;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setCurrentIndex(idx);
                setSelectedOption(null);
                setAiHint(null);
                setAiError(null);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? "border-cyan-500 bg-cyan-500/15 text-cyan-200"
                  : solved
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-slate-800 bg-[#0E1522] text-slate-400 hover:text-slate-200"
              }`}
            >
              {idx + 1}. {item.disciplineLabel} {solved ? "✓" : ""}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Scenario & Visual Card */}
        <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-[#0E1522] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
              <span>{challenge.disciplineLabel}</span>
              <span className="font-mono text-amber-400 tabular-nums">+{challenge.xpReward} XP</span>
            </div>
            <h3 className="text-xl font-semibold text-slate-100">{challenge.title}</h3>
            <p className="text-sm text-slate-300 mt-3 leading-relaxed">{challenge.scenario}</p>

            <div className="mt-5">
              <ChallengeDiagram type={challenge.visualType} />
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleRequestHint}
              disabled={loadingHint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-700 bg-[#070B12] text-cyan-300 hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{loadingHint ? "Thinking..." : isAnswered ? "Ask AI Deep Dive" : "Ask AI for a Hint"}</span>
            </button>

            <button
              type="button"
              onClick={() => onTryInLab(challenge.discipline)}
              className="text-xs font-medium text-slate-300 hover:text-cyan-400 underline underline-offset-4 whitespace-nowrap shrink-0"
            >
              Test this in {challenge.disciplineLabel} Lab
            </button>
          </div>
        </div>

        {/* Question & Options Card */}
        <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-[#0B111C] p-6 flex flex-col justify-between">
          <div>
            <div className="text-xs font-mono text-slate-400 mb-2">
              {alreadySolved ? "● Completed Previously" : "Select the Best Hypothesis"}
            </div>
            <h4 className="text-lg font-semibold text-slate-50 leading-snug">
              {challenge.question}
            </h4>

            <div className="mt-5 space-y-3">
              {challenge.options.map((opt, idx) => {
                const isThisSelected = selectedOption === idx;
                const isThisCorrect = idx === challenge.correctIndex;

                let btnStyle = "border-slate-800 bg-[#0E1522] text-slate-200 hover:border-slate-600";
                if (isAnswered) {
                  if (isThisCorrect) {
                    btnStyle = "border-emerald-500/70 bg-emerald-500/15 text-emerald-200";
                  } else if (isThisSelected && !isThisCorrect) {
                    btnStyle = "border-rose-500/70 bg-rose-500/15 text-rose-200";
                  } else {
                    btnStyle = "border-slate-800/60 bg-[#070B12] text-slate-500";
                  }
                }

                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelectOption(idx)}
                    disabled={isAnswered}
                    className={`w-full text-left px-4 py-3.5 rounded-lg border text-sm font-medium transition-colors flex items-center justify-between gap-3 ${btnStyle}`}
                  >
                    <span>{opt}</span>
                    {isAnswered && isThisCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                    {isAnswered && isThisSelected && !isThisCorrect && <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {aiHint && (
              <div className="mt-4 p-4 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-sm text-cyan-100 leading-relaxed">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300 mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  AI Mentor Clue
                </div>
                {aiHint}
              </div>
            )}

            {aiError && (
              <div className="mt-4 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs text-amber-200">
                {aiError}
              </div>
            )}
          </div>

          {isAnswered && (
            <div className="mt-6 pt-5 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-sm text-slate-300 leading-relaxed">
                <span className={isCorrect ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
                  {isCorrect ? "Spot on! " : "Good experiment! "}
                </span>
                {challenge.factSummary}
              </div>
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-lg bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors whitespace-nowrap shrink-0 self-start sm:self-center"
              >
                <span>Next Challenge</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
