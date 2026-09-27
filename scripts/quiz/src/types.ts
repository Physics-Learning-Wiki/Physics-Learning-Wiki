export type QuestionType = "single_choice" | "multiple_choice" | "true_false" | "numeric" | "free_response";
export type FeedbackMode = "immediate" | "deferred";
export type SetStatus = "draft" | "published" | "retired";

export interface ObjectiveDetail {
  id: string;
  title: string;
  pageId: string;
  pageTitle: string;
  url: string;
  anchor: string;
}

export interface RelatedPageDetail {
  id: string;
  title: string;
  url: string;
}

export interface Choice {
  id: string;
  contentHtml: string;
}

export interface QuestionBase {
  id: string;
  version: number;
  status: "draft" | "published" | "retired";
  type: QuestionType;
  choiceOrder: "shuffle" | "fixed";
  topicIds: string[];
  conceptIds: string[];
  objectiveIds: string[];
  relatedPages: string[];
  stemHtml: string;
  source?: {
    stemMarkdown: string;
    choices: Array<{ id: string; contentMarkdown: string }>;
  };
  feedback?: {
    correctHtml?: string;
    incorrectHtml?: string;
    choicesHtml?: Record<string, string>;
  };
  hintsHtml: string[];
  solutionHtml: string;
  difficulty?: number;
  cognitiveLevel?: "remember" | "understand" | "apply" | "analyze";
  style?: "conceptual" | "graphical" | "computational" | "modeling";
  estimatedSeconds?: number;
  assets: Record<string, string>;
  contentFingerprint?: string;
  objectivesDetail?: ObjectiveDetail[];
  relatedPagesDetail?: RelatedPageDetail[];
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

export interface SelfAssessmentLevel {
  id: string;
  label: string;
  points: number;
}

export interface FreeResponseQuestion extends QuestionBase {
  type: "free_response";
  response: {
    format: "plain_text";
    required: boolean;
    minChars?: number;
    maxChars?: number;
    rows?: number;
    placeholder?: string;
  };
  grading: {
    mode: "self_assessed";
    rubric: SelfAssessmentLevel[];
  };
  referenceAnswerHtml?: string;
}

export type Question =
  | SingleChoiceQuestion
  | MultipleChoiceQuestion
  | BooleanQuestion
  | NumericQuestion
  | FreeResponseQuestion;
export type SelfAssessedAnswer = { text: string; levelId: string | null };
export type UserAnswer = string | string[] | boolean | { value: string; unit?: string } | SelfAssessedAnswer | null;

export type FilterCriterion = { any: string[] } | { all: string[] };

export interface DifficultyFilter {
  min?: number;
  max?: number;
}

export interface SetFilters {
  topics?: FilterCriterion;
  concepts?: FilterCriterion;
  objectives?: FilterCriterion;
  related_pages?: FilterCriterion;
  types?: QuestionType[];
  cognitive_levels?: string[];
  styles?: string[];
  question_ids?: string[];
  difficulty?: DifficultyFilter;
}

export interface SetSlot {
  id: string;
  count: number;
  filters?: SetFilters;
}

export interface SetConstraint {
  field: "difficulty" | "type" | "style";
  values: Array<string | number>;
  min?: number;
  max?: number;
}

export interface SetSelectionFixed {
  type: "fixed";
  questions: string[];
  order: "fixed" | "shuffle";
}

export interface SetSelectionQuery {
  type: "query";
  count: number;
  filters?: SetFilters;
  slots?: SetSlot[];
  constraints?: SetConstraint[];
}

export type SetSelection = SetSelectionFixed | SetSelectionQuery;

export interface QuizSetDef {
  schema_version: 1;
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  status: SetStatus;
  feedback_mode: FeedbackMode;
  selection: SetSelection;
}

export interface SetBundle {
  schemaVersion: number;
  bankFingerprint: string;
  selectionAlgorithmVersion: number;
  preview: boolean;
  set: QuizSetDef;
  runnable: boolean;
  unavailableReason: string | null;
  questions: Question[];
}

export interface Manifest {
  schemaVersion: number;
  bankFingerprint: string;
  selectionAlgorithmVersion: number;
  preview: boolean;
  catalogs: {
    questions: string;
    sets: string;
    taxonomy: string;
  };
  sets: Record<string, { title: string; status: SetStatus; bundle: string }>;
}

export interface SetCatalogItem {
  id: string;
  title: string;
  description: string;
  tags: string[];
  status: SetStatus;
  selectionType: "fixed" | "query";
  questionCount: number;
  estimatedMinutes: number | null;
  feedbackMode: FeedbackMode;
  topicIds: string[];
  runnable: boolean;
  unavailableReason: string | null;
}

export interface TaxonomyTopic {
  id: string;
  title: string;
  parent: string | null;
}

export interface TaxonomyConcept {
  id: string;
  title: string;
  topics: string[];
  aliases?: string[];
}

export interface TaxonomyCatalog {
  topics: Record<string, TaxonomyTopic>;
  concepts: Record<string, TaxonomyConcept>;
}

export type QuizSource = { type: "set"; id: string } | { type: "adhoc"; questionIds: string[] };
export type PracticeOrigin =
  | { type: "mistakes" }
  | { type: "saved" }
  | { type: "collection"; collectionId: string; collectionName: string }
  | { type: "retry"; parentSessionId: string };

export interface QuizContext {
  surface: "runner" | "inline" | "browser";
  pageId?: string;
  origin?: PracticeOrigin;
}

export interface Session {
  sessionId: string;
  profileEpoch: string;
  sessionRevision: number;
  committedResults: Record<string, { answeredAt: string; result: QuestionResult }>;
  preview: boolean;
  selectionAlgorithmVersion: number;
  state: "active" | "completed" | "discarded";
  source: QuizSource;
  seed: string;
  bankFingerprint: string;
  questionRefs: Array<{ id: string; version: number }>;
  answers: Record<string, UserAnswer>;
  uncertain: Record<string, boolean>;
  locked: Record<string, boolean>;
  currentIndex: number;
  startedAt: string;
  updatedAt: string;
  context?: QuizContext;
}

export interface QuestionResult {
  questionId: string;
  version: number;
  topicIds: string[];
  conceptIds: string[];
  objectiveIds: string[];
  answer: UserAnswer;
  correct: boolean;
  unanswered: boolean;
  uncertain: boolean;
  evaluation?: {
    mode: "automatic" | "self_assessed";
    status: "correct" | "incorrect" | "unanswered" | "assessed";
    score: number;
    maxScore: number;
    levelId?: string;
  };
}

export interface Attempt {
  sessionId: string;
  source: QuizSource;
  seed: string;
  bankFingerprint: string;
  completedAt: string;
  score: number;
  total: number;
  pointsEarned?: number;
  pointsAvailable?: number;
  selfAssessedCount?: number;
  questionResults: QuestionResult[];
  context?: QuizContext;
}

export interface QuizStorageData {
  schemaVersion: 3;
  profileEpoch: string;
  revision: number;
  activeSessions: Record<string, Session[]>;
  attempts: Attempt[];
  learning: {
    historyCoverage: "since_profile_creation" | "partial_legacy";
    trackedSince: string;
    questions: Record<string, QuestionLearningRecord>;
  };
  library: {
    savedQuestions: Record<string, SavedQuestionRecord>;
    collections: Record<string, QuestionCollection>;
  };
  preferences: { restoreSession: boolean };
}

export type LearningOutcome = "correct" | "incorrect" | "self_assessed";
export type WrongBookStatus = "learning" | "mastered";

export interface WrongBookState {
  status: WrongBookStatus;
  addedAt: string;
  updatedAt: string;
  lastWrongAt?: string;
  masteredAt?: string;
  masteredQuestionVersion?: number;
  manuallyAdded: boolean;
  legacyImported?: boolean;
  correctAfterLastWrong: number;
}

export interface QuestionLearningRecord {
  lastQuestionVersion?: number;
  answeredCount: number;
  correctCount: number;
  incorrectCount: number;
  selfAssessedCount: number;
  firstAnsweredAt?: string;
  lastAnsweredAt?: string;
  lastOutcome?: LearningOutcome;
  wrongBook?: WrongBookState;
}

export interface SavedQuestionRecord {
  savedAt: string;
  updatedAt: string;
  savedQuestionVersion: number;
  collectionIds: string[];
}

export interface QuestionCollection {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}
