export type AltKey = "A" | "B" | "C" | "D" | "E";
export const ALT_KEYS: AltKey[] = ["A", "B", "C", "D", "E"];
export type Difficulty = "easy" | "medium" | "hard";
export type Confidence = "sure" | "doubt" | "guess";
export type QuestionStatus = "unanswered" | "correct" | "incorrect" | "review" | "mastered";

export interface Question {
  id: string;
  statement: string;
  alternatives: Partial<Record<AltKey, string>>;
  correctAnswer: AltKey;
  explanation?: string;
  subject: string;
  topic: string;
  subtopic?: string;
  difficulty: Difficulty;
  board?: string;
  exam?: string;
  tags: string[];
  image?: string;
  source?: string;
}

export interface Attempt {
  id: string;
  questionId: string;
  date: string; // ISO
  selected: AltKey;
  correct: boolean;
  timeSpent: number; // seconds
  confidence: Confidence;
  hasDraft: boolean;
  sessionId?: string;
}

export interface QuestionFlags { favorite?: boolean; review?: boolean }

export interface Point { x: number; y: number; p: number }
export interface Stroke { tool: "pen" | "eraser"; color: string; size: number; points: Point[] }

export interface ChatMessage { id: string; role: "user" | "assistant"; content: string; date: string }

export interface TutorExplanation {
  summary: string;
  concept: string;
  steps: string[];
  howToReach: string;
  alternatives: Partial<Record<AltKey, string>>;
  formulas: string[];
  tips: string[];
}

export interface NotebookEntry {
  questionId: string;
  explanation?: TutorExplanation;
  chat: ChatMessage[];
  personalNotes?: string;
  formulas: string[];
  concepts: string[];
  updatedAt: string;
}

export interface XpEvent { id: string; date: string; amount: number; reason: string }

export interface CustomList { id: string; name: string; questionIds: string[]; createdAt: string }

export interface SessionConfig {
  subject?: string;
  topic?: string;
  difficulty?: Difficulty | "any";
  count: number;
  filter: "all" | "unanswered" | "wrong" | "review" | "favorites";
  shuffle: boolean;
  timeLimitMin?: number;
  kind: "study" | "exam" | "review" | "list";
  title?: string;
}

export interface StudySession {
  id: string;
  config: SessionConfig;
  questionIds: string[];
  index: number;
  startedAt: string;
  finishedAt?: string;
  answers: Record<string, { selected: AltKey; correct: boolean; confidence: Confidence; timeSpent: number }>;
  xpEarned: number;
}

export interface Viewer { name: string; answered: number; correct: number; score: number }
export interface Vote { user: string; alt: AltKey; at: string; changed: boolean }

export interface TwitchSettings {
  channel: string;
  connected: boolean;
  chatEnabled: boolean;
  commandPrefix: string;
  pointsCorrect: number;
  pointsParticipation: number;
  voteSeconds: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number; // 0..1
}
