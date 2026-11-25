import React, { useEffect, useRef, useState } from "react";
import { Send, Sparkles, AlertCircle, Trash2 } from "lucide-react";
import { EXPERIMENTS } from "../data/experiments";
import { LiveLabState, MentorMessage } from "../types/lab";

interface AIMentorPanelProps {
  liveState: LiveLabState;
  preFilledPrompt?: string;
  onClearPreFill?: () => void;
}

export const AIMentorPanel: React.FC<AIMentorPanelProps> = ({
  liveState,
  preFilledPrompt,
  onClearPreFill,
}) => {
  const [messages, setMessages] = useState<MentorMessage[]>([
    {
      id: "welcome",
      role: "mentor",
      text: "Welcome to the AI Science Lab! I can see your live lab bench settings right now. Ask me why a reaction changes color, how gravity curves an orbit, or what happens if you push an experiment to its limits.",
      timestamp: "Ready",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const activeMeta =
    EXPERIMENTS.find((e) => e.id === liveState.experimentId) ?? EXPERIMENTS[0];

  useEffect(() => {
    if (preFilledPrompt) {
      setInput(preFilledPrompt);
      onClearPreFill?.();
    }
  }, [preFilledPrompt, onClearPreFill]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const sendQuestion = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || isLoading) return;

    const userMsg: MentorMessage = {
      id: `${Date.now()}-u`,
      role: "user",
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      contextSnapshot: `${liveState.experimentTitle} · ${liveState.statusLabel}`,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/lab-mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experimentTitle: liveState.experimentTitle,
          discipline: liveState.discipline,
          currentParameters: liveState.parameters,
          question: trimmed,
          history: messages.slice(-6).map((m) => ({ role: m.role, text: m.text })),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMsg(data.error || "Unable to reach the AI Mentor right now.");
      } else {
        const mentorMsg: MentorMessage = {
          id: `${Date.now()}-m`,
          role: "mentor",
          text: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, mentorMsg]);
      }
    } catch {
      setErrorMsg("Network error while contacting the AI Mentor server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendQuestion(input);
  };

  return (
    <section id="ai-mentor" className="max-w-7xl mx-auto px-6 py-14">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Context & Starter Curiosity Column */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-xl border border-slate-800 bg-[#0E1522] p-6">
          <div>
            <div className="text-xs font-mono text-cyan-400 mb-1">
              Real-Time AI Science Guidance
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-50 tracking-tight" style={{ textWrap: "balance" }}>
              Ask Your AI Lab Mentor
            </h2>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Your mentor reads the exact parameters on your active Lab Bench so explanations match what you are seeing on screen.
            </p>

            {/* Live Connected Bench Snapshot */}
            <div className="mt-6 p-4 rounded-lg bg-[#070B12] border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>Connected Lab Station</span>
                <span className="text-cyan-400 font-mono">{liveState.discipline}</span>
              </div>
              <div className="text-sm font-semibold text-slate-100">{liveState.experimentTitle}</div>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs font-mono">
                {Object.entries(liveState.parameters)
                  .slice(0, 6)
                  .map(([key, val]) => (
                    <div key={key} className="flex justify-between gap-2 truncate">
                      <span className="text-slate-500 truncate">{key}:</span>
                      <span className="text-slate-200 tabular-nums shrink-0">{String(val)}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Starter Curiosity Prompts */}
            <div className="mt-6">
              <div className="text-xs font-medium text-slate-400 mb-2.5">
                Quick Questions for {activeMeta.disciplineLabel}
              </div>
              <div className="space-y-2">
                {activeMeta.starterQuestions.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => sendQuestion(q)}
                    disabled={isLoading}
                    className="w-full text-left px-3.5 py-2.5 rounded-lg border border-slate-800 bg-[#070B12] text-xs text-slate-300 hover:border-cyan-500/50 hover:text-cyan-200 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Tailored for learners aged 12–14</span>
            <button
              type="button"
              onClick={() =>
                setMessages([
                  {
                    id: "reset",
                    role: "mentor",
                    text: "Fresh lab chat started! Adjust any simulation on the bench above and ask me what's happening.",
                    timestamp: "Ready",
                  },
                ])
              }
              className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Chat
            </button>
          </div>
        </div>

        {/* Right Conversation Window */}
        <div className="lg:col-span-7 flex flex-col rounded-xl border border-slate-800 bg-[#0B111C] overflow-hidden min-h-[460px]">
          <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Lab Mentor Session</span>
            </div>
            <span className="text-xs font-mono text-slate-400">{liveState.statusLabel}</span>
          </div>

          <div ref={scrollRef} className="flex-1 p-5 space-y-4 overflow-y-auto max-h-[420px]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                    msg.role === "user"
                      ? "bg-cyan-500 text-slate-950 font-medium"
                      : "bg-[#0E1522] border border-slate-800 text-slate-200"
                  }`}
                >
                  {msg.text}
                </div>
                <div className="text-[11px] font-mono text-slate-500 mt-1 px-1">
                  {msg.role === "user" ? "You" : "AI Mentor"} · {msg.timestamp}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start">
                <div className="rounded-xl px-4 py-3 text-sm bg-[#0E1522] border border-slate-800 text-cyan-300 font-mono">
                  Analyzing your {liveState.discipline.toLowerCase()} experiment data...
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="p-3.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-xs text-amber-200 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-4 border-t border-slate-800 bg-[#080D16] flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask why ${liveState.experimentTitle} behaves this way...`}
              className="flex-1 bg-[#070B12] border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-lg bg-cyan-500 text-slate-950 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};
