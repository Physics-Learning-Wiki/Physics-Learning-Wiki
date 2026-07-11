export type QuizMode = "quick" | "full" | "retry";
export type QuestionType = "single_choice" | "multiple_choice" | "true_false" | "numeric";

export interface Objective {
  id: string;
  title: string;
  anchor: string;
}

export interface Choice {
  id: string;
  contentHtml: string;
}

export interface QuestionBase {
  id: string;
  version: number;
  type: QuestionType;
  primaryObjective: string;
  secondaryObjectives: string[];
  conceptIds: string[];
  stemHtml: string;
  feedback: {
    correctHtml: string;
    incorrectHtml: string;
    choicesHtml?: Record<string, string>;
  };
  hintsHtml: string[];
  solutionHtml: string;
  difficulty: number;
  estimatedSeconds: number;
}

export interface SingleChoiceQuestion extends QuestionBase {
  type: "single_choice";
  choices: Choice[];
  answer: { choice: string };
}

export interface MultipleChoiceQuestion extends QuestionBase {
  type: "multiple_choice";
  choices: Choice[];
  answer: { choices: string[] };
}

export interface BooleanQuestion extends QuestionBase {
  type: "true_false";
  answer: { value: boolean };
}

export interface NumericQuestion extends QuestionBase {
  type: "numeric";
  answer: {
    value: number;
    tolerance: { type: "absolute" | "relative"; value: number };
    unit: { required: boolean; canonical?: string; accepted: string[] };
  };
}

export type Question = SingleChoiceQuestion | MultipleChoiceQuestion | BooleanQuestion | NumericQuestion;
export type UserAnswer = string | string[] | boolean | { value: string; unit?: string } | null;

export interface BlueprintMode {
  title: string;
  total: number;
  feedback_mode: "immediate" | "deferred";
  slots: Array<{ id: string; count: number; objectives: string[] }>;
}

export interface PageBundle {
  schemaVersion: number;
  bankFingerprint: string;
  preview: boolean;
  page: { id: string; title: string; url: string; objectives: Objective[] };
  blueprint: { modes: { quick: BlueprintMode; full: BlueprintMode } };
  questions: Question[];
}

export interface ManifestPage {
  title: string;
  url: string;
  bundle: string;
  status: "construction" | "available";
  publishedQuestionCount: number;
  previewQuestionCount: number;
  modes: Record<string, number>;
}

export interface Manifest {
  schemaVersion: number;
  bankFingerprint: string;
  preview: boolean;
  pages: Record<string, ManifestPage>;
}

export interface QuestionResult {
  questionId: string;
  version: number;
  primaryObjective: string;
  answer: UserAnswer;
  correct: boolean;
  unanswered: boolean;
  uncertain: boolean;
}

export interface Session {
  pageId: string;
  mode: QuizMode;
  seed: string;
  bankFingerprint: string;
  questionRefs: Array<{ id: string; version: number }>;
  answers: Record<string, UserAnswer>;
  uncertain: Record<string, boolean>;
  locked: Record<string, boolean>;
  currentIndex: number;
  startedAt: string;
  updatedAt: string;
}

export interface Attempt {
  pageId: string;
  mode: QuizMode;
  seed: string;
  bankFingerprint: string;
  completedAt: string;
  score: number;
  total: number;
  questionResults: QuestionResult[];
}

export interface QuizStorageData {
  schemaVersion: 1;
  activeSessions: Record<string, Session[]>;
  attempts: Attempt[];
  wrongQuestions: Record<string, string>;
  preferences: { restoreSession: boolean };
}
