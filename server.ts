import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", hasApiKey: Boolean(getGeminiClient()) });
  });

  app.post("/api/lab-mentor", async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          "Gemini API key is not configured. Add GEMINI_API_KEY in Settings > Secrets to activate the AI Lab Mentor.",
      });
      return;
    }

    try {
      const {
        experimentTitle = "General Science Lab",
        discipline = "Science",
        currentParameters = {},
        question = "",
        history = [],
      } = req.body ?? {};

      if (!question || typeof question !== "string") {
        res.status(400).json({ error: "Please provide a science question." });
        return;
      }

      const systemInstruction = [
        "You are an enthusiastic, friendly AI Science Lab Mentor guiding curious learners aged 12 to 14.",
        "Explain scientific concepts clearly using vivid everyday analogies, accurate middle-school/early-high-school physics, chemistry, biology, or astronomy, and encouraging Socratic curiosity.",
        "Keep answers concise (2 to 3 short paragraphs or 3 crisp bullet points), avoid walls of text, and reference the student's actual current simulation settings whenever relevant.",
        "Always end with one short 'Try This Next:' experiment suggestion they can test on their sliders right now.",
        "Never use fake jargon or pretend to be anything other than a helpful science lab guide.",
      ].join(" ");

      const recentHistory = Array.isArray(history)
        ? history
            .slice(-6)
            .map((m: { role?: string; text?: string }) =>
              `${m.role === "user" ? "Student" : "Mentor"}: ${String(m.text ?? "").slice(0, 400)}`
            )
            .join("\n")
        : "";

      const prompt = [
        `Active Lab Experiment: ${experimentTitle} (${discipline})`,
        `Current Bench Parameters & Live Readouts: ${JSON.stringify(currentParameters)}`,
        recentHistory ? `Recent Conversation:\n${recentHistory}` : "",
        `Student Question: ${question.trim()}`,
      ]
        .filter(Boolean)
        .join("\n\n");

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: prompt,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const reply = response.text?.trim();
      if (!reply) {
        res.status(502).json({ error: "The AI Mentor returned an empty response. Please try again." });
        return;
      }

      res.json({ reply });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to reach AI Lab Mentor.";
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/lab-challenge/explain", async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          "Gemini API key is not configured. Add GEMINI_API_KEY in Settings > Secrets to unlock AI hints.",
      });
      return;
    }

    try {
      const { question, options, selectedOption, correctOption, mode = "hint" } = req.body ?? {};
      if (!question) {
        res.status(400).json({ error: "Challenge question is required." });
        return;
      }

      const systemInstruction =
        mode === "hint"
          ? "You are a helpful science mentor for 12-14 year olds. Give a subtle, inspiring scientific clue without directly revealing the answer letter. Keep it under 50 words."
          : "You are a science mentor for 12-14 year olds. Explain clearly why the correct answer works in real-world science in 2 short sentences.";

      const prompt =
        mode === "hint"
          ? `Challenge Question: ${question}\nOptions: ${(options || []).join(" | ")}\nGive a helpful hint without giving away the answer.`
          : `Challenge Question: ${question}\nStudent chose: ${selectedOption}\nCorrect answer: ${correctOption}\nExplain the science behind why "${correctOption}" is correct.`;

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: prompt,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      res.json({ explanation: response.text?.trim() ?? "Think about what forces or molecules are changing!" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate challenge guidance.";
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI Science Lab server running on http://localhost:${PORT}`);
  });
}

startServer();
