export type Discipline = "chemistry" | "physics" | "biology" | "astronomy";

export interface ExperimentMeta {
  id: Discipline;
  title: string;
  disciplineLabel: string;
  duration: string;
  ageRange: string;
  summary: string;
  keyConcept: string;
  formula: string;
  missionTitle: string;
  missionGoal: string;
  coverImage: string;
  accentHex: string;
  starterQuestions: string[];
}

export interface LiveLabState {
  experimentId: Discipline;
  experimentTitle: string;
  discipline: string;
  parameters: Record<string, string | number | boolean>;
  statusLabel: string;
}

export interface ChallengeItem {
  id: string;
  discipline: Discipline;
  disciplineLabel: string;
  title: string;
  scenario: string;
  question: string;
  options: string[];
  correctIndex: number;
  factSummary: string;
  xpReward: number;
  visualType: "ph" | "gravity" | "wavelength" | "orbit" | "energy" | "enzymes" | "titration" | "escape";
}

export interface MentorMessage {
  id: string;
  role: "user" | "mentor";
  text: string;
  timestamp: string;
  contextSnapshot?: string;
}

export interface LabNote {
  id: string;
  experimentId: Discipline;
  experimentTitle: string;
  observation: string;
  snapshot: string;
  createdAt: string;
}

export interface StudentProgress {
  xp: number;
  completedMissions: Discipline[];
  solvedChallenges: string[];
  notes: LabNote[];
}
