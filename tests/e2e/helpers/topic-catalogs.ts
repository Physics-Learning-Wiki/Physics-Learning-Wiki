import type { Page } from "@playwright/test";
import type { Question, SetCatalogItem, TaxonomyCatalog } from "../../../scripts/quiz/src/types.js";

export const topicTaxonomy: TaxonomyCatalog = {
  topics: {
    mechanics: { id: "mechanics", title: "经典力学", parent: null },
    "mechanics.dynamics": { id: "mechanics.dynamics", title: "动力学", parent: "mechanics" },
    "mechanics.kinematics": { id: "mechanics.kinematics", title: "运动学", parent: "mechanics" },
    "methods.advanced": { id: "methods.advanced", title: "进阶动力学", parent: "mechanics.dynamics" },
    electromagnetism: { id: "electromagnetism", title: "电磁学", parent: null },
    "electromagnetism.electrostatics": {
      id: "electromagnetism.electrostatics",
      title: "静电学",
      parent: "electromagnetism"
    },
    optics: { id: "optics", title: "光学", parent: null },
    "optics.wave": { id: "optics.wave", title: "波动光学", parent: "optics" },
    math: { id: "math", title: "数学工具", parent: null },
    "math.linear-algebra": { id: "math.linear-algebra", title: "线性代数", parent: "math" }
  },
  concepts: {
    "common.motion": { id: "common.motion", title: "运动", topics: ["mechanics"] },
    "newton.inertia": { id: "newton.inertia", title: "惯性", topics: ["mechanics.dynamics"] },
    "kinematics.velocity": { id: "kinematics.velocity", title: "速度", topics: ["mechanics.kinematics"] },
    "coulomb.field": { id: "coulomb.field", title: "电场", topics: ["electromagnetism.electrostatics"] }
  }
};

const question = (
  n: number,
  topic: string,
  concepts: string[],
  status: Question["status"] = "published"
): Question => ({
  id: `q-${900000 + n}`,
  version: 1,
  status,
  type: "true_false",
  choiceOrder: "fixed",
  topicIds: [topic],
  conceptIds: concepts,
  objectiveIds: [],
  relatedPages: [],
  stemHtml: `<p>分类测试题 ${n}</p>`,
  solutionHtml: "<p>分类测试解析．</p>",
  hintsHtml: [],
  answer: { value: true },
  assets: {}
});

const questions = [
  ...Array.from({ length: 12 }, (_, i) => question(i + 1, "mechanics.dynamics", ["common.motion", "newton.inertia"])),
  question(13, "methods.advanced", ["common.motion", "newton.inertia"]),
  question(14, "mechanics.kinematics", ["common.motion", "kinematics.velocity"]),
  question(15, "electromagnetism.electrostatics", ["coulomb.field"]),
  question(16, "optics.wave", [], "draft")
];

const set = (id: string, topicIds: string[], overrides: Partial<SetCatalogItem> = {}): SetCatalogItem => ({
  id,
  title: id,
  description: "主题筛选测试集合．",
  tags: ["测试"],
  status: "published",
  selectionType: "fixed",
  questionCount: 2,
  estimatedMinutes: null,
  feedbackMode: "deferred",
  topicIds,
  runnable: true,
  unavailableReason: null,
  ...overrides
});
const sets = [
  set("mechanics.fixed", ["mechanics", "mechanics.dynamics", "mechanics.kinematics"]),
  set("mechanics.query", ["mechanics", "mechanics.dynamics", "methods.advanced"], {
    selectionType: "query",
    feedbackMode: "immediate"
  }),
  set("electromagnetism.fixed", ["electromagnetism", "electromagnetism.electrostatics"]),
  set("optics.draft", ["optics", "optics.wave"], { status: "draft" })
];

export async function mockTopicCatalogs(page: Page, options: { preview?: boolean; failTaxonomy?: boolean } = {}) {
  await page.route("**/_generated/question-bank/manifest.json", route =>
    route.fulfill({
      json: {
        schemaVersion: 3,
        bankFingerprint: "topic-fixture",
        selectionAlgorithmVersion: 1,
        preview: Boolean(options.preview),
        catalogs: {
          questions: "catalog/questions.topics.json",
          sets: "catalog/sets.topics.json",
          taxonomy: "catalog/taxonomy.topics.json"
        },
        sets: {}
      }
    })
  );
  await page.route("**/catalog/questions.topics.json", route => route.fulfill({ json: questions }));
  await page.route("**/catalog/sets.topics.json", route => route.fulfill({ json: sets }));
  await page.route("**/catalog/taxonomy.topics.json", route =>
    options.failTaxonomy ? route.fulfill({ status: 503, body: "Unavailable" }) : route.fulfill({ json: topicTaxonomy })
  );
}
