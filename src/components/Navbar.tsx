import React from "react";
import { BookOpen } from "lucide-react";

interface NavbarProps {
  xp: number;
  onOpenNotebook: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ xp, onOpenNotebook }) => {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#070B12]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#top"
          className="text-lg font-bold tracking-tight text-slate-100 hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0"
          style={{ fontFamily: "var(--font-display)" }}
        >
          AI Science Lab
        </a>

        {/* Zone 2: 4 Single-line Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-400">
          <a
            href="#experiments"
            className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            Experiments
          </a>
          <a
            href="#lab-bench"
            className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            Lab Bench
          </a>
          <a
            href="#challenge"
            className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            Challenge
          </a>
          <a
            href="#ai-mentor"
            className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            AI Mentor
          </a>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenNotebook}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors whitespace-nowrap shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Lab Notebook</span>
            <span className="font-mono tabular-nums opacity-80">({xp} XP)</span>
          </button>
        </div>
      </div>
    </header>
  );
};
