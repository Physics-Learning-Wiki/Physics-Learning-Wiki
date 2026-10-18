import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Miniflare } from "miniflare";
import worker from "./submit.js";
import { fieldErrors } from "../contracts/envelope.js";
import { validateQuestionSchema } from "../contracts/generated.js";

const repo = "https://api.github.com/repos/Physics-Learning-Wiki/Physics-Learning-Wiki";
const base = () => ({ schemaVersion: 1, submissionId: crypto.randomUUID(), type: "notes",
  payload: { title: "关于牛顿定律的笔记", content: "请审核这份关于牛顿定律适用条件的学习笔记．" },
  licenseConsent: true, licenseVersion: "CC-BY-SA-4.0", sourceDeclaration: { kind: "original", note: "由本人整理撰写" },
  turnstileToken: "valid" });

async function harness(t) {
  const mf = new Miniflare({ modules: true, script: "export default { fetch() { return new Response('test'); } }",
    compatibilityDate: "2024-01-01", d1Databases: ["SUBMISSIONS_DB"] });
  t.after(() => mf.dispose());
  const db = await mf.getD1Database("SUBMISSIONS_DB");
  const migration = await readFile(new URL("./migrations/0001_submissions.sql", import.meta.url), "utf8");
  for (const sql of migration.split(";").filter(sql => sql.trim())) await db.prepare(sql).run();
  const env = { SUBMISSIONS_DB: db, GITHUB_TOKEN: "secret-must-not-leak", TURNSTILE_SECRET_KEY: "private",
    SUBMISSION_BOT_ID: "8", ENVIRONMENT: "production", ALLOWED_HOSTNAMES: "physics-learning-wiki.github.io" };
  const issues = [];
  const comments = [];
  const state = { committedTimeout: false, verification: {}, posts: 0 };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    if (String(url).includes("siteverify")) return Response.json({ success: true, hostname: "physics-learning-wiki.github.io",
      action: "submit-general", ...state.verification });
    const target = String(url);
    if (options.method === "POST") {
      const data = JSON.parse(options.body);
      state.posts++;
      if (target === repo + "/issues") {
        const number = issues.length + 100;
        const issue = { ...data, number, user: { id: 8 }, created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(), html_url: "https://github.com/Physics-Learning-Wiki/Physics-Learning-Wiki/issues/" + number,
          labels: data.labels.map(name => ({ name })) };
        issues.push(issue);
        if (state.committedTimeout) { state.committedTimeout = false; throw new Error("connection lost: secret-must-not-leak"); }
        return Response.json(issue, { status: 201 });
      }
      const comment = { ...data, id: comments.length + 1, user: { id: 8 } };
      comments.push(comment);
      return Response.json(comment, { status: 201 });
    }
    if (target.includes("/comments")) return Response.json(comments);
    if (/\/issues\/\d+/.test(target)) return Response.json(issues.find(i => target.includes("/issues/" + i.number)));
    return Response.json(issues);
  };
  t.after(() => { globalThis.fetch = originalFetch; });
  const token = "a".repeat(64);
  function call(body, { key = crypto.randomUUID(), path = "/v1/submissions", method = "POST", author = token } = {}) {
    return worker.fetch(new Request("https://submit.example" + path, { method,
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + author, "Idempotency-Key": key },
      ...(method === "POST" ? { body: typeof body === "string" ? body : JSON.stringify(body) } : {}) }), env);
  }
  return { db, env, state, issues, comments, call };
}

test("D1: duplicate requests reuse a receipt, reject changed content, and never store raw credentials", async t => {
  const h = await harness(t);
  const envelope = base(), key = crypto.randomUUID();
  assert.equal((await h.call(envelope, { key })).status, 201);
  for (let i = 0; i < 5; i++) assert.equal((await h.call(envelope, { key })).status, 200);
  assert.equal(h.issues.length, 1);
  assert.equal((await h.call({ ...envelope, payload: { ...envelope.payload, content: "另一份内容" } }, { key })).status, 409);
  const row = await h.db.prepare("SELECT * FROM submissions").first();
  assert.notEqual(row.token_hash, "a".repeat(64));
  assert.equal(row.token_hash.length, 64);
  assert.doesNotMatch(h.issues[0].body, /secret-must-not-leak|valid|turnstileToken|Authorization/);
});

test("D1: a lost GitHub response recovers the already-created Issue instead of creating another", async t => {
  const h = await harness(t);
  const envelope = base(), key = crypto.randomUUID();
  h.state.committedTimeout = true;
  assert.equal((await h.call(envelope, { key })).status, 202);
  const recovered = await h.call(envelope, { key });
  assert.equal(recovered.status, 200);
  assert.equal((await recovered.json()).issueNumber, 100);
  assert.equal(h.issues.length, 1);
});

test("D1: parallel requests reserve only one upstream side effect", async t => {
  const h = await harness(t);
  const envelope = base(), key = crypto.randomUUID();
  const results = await Promise.all([h.call(envelope, { key }), h.call(envelope, { key }), h.call(envelope, { key })]);
  assert.ok(results.every(r => [200, 201, 202].includes(r.status)), await Promise.all(results.map(r => r.clone().text())));
  assert.equal(h.issues.length, 1);
});

test("D1: revisions require the original credential and base revision; withdrawal is only a request", async t => {
  const h = await harness(t), envelope = base();
  await h.call(envelope);
  const path = "/v1/submissions/" + envelope.submissionId;
  const revision = { ...envelope, baseRevision: 1, payload: { ...envelope.payload, content: "修订后的完整笔记．" } };
  assert.equal((await h.call(revision, { path: path + "/revisions", author: "b".repeat(64) })).status, 403);
  assert.equal((await h.call(revision, { path: path + "/revisions" })).status, 200);
  assert.equal((await h.call(revision, { path: path + "/revisions" })).status, 409);
  assert.equal((await h.call({ reason: "需要更正后重新投稿", baseRevision: 2, turnstileToken: "valid" },
    { path: path + "/withdrawal-requests" })).status, 200);
  const status = await (await h.call(undefined, { method: "GET", path })).json();
  assert.equal(status.revision, 2);
  assert.equal(status.withdrawalRequested, true);
  assert.notEqual(status.stage, "withdrawn");
  assert.equal(status.record.payload.content, revision.payload.content);
});

test("HTTP boundary: licensing, types, size, verification context and error redaction", async t => {
  const h = await harness(t);
  for (const bad of [{ licenseConsent: false }, { licenseVersion: "MIT" },
    { payload: { title: [], content: "text" } }, { contact: "private@example.com" }]) {
    assert.equal((await h.call({ ...base(), ...bad })).status, 422);
  }
  assert.equal((await h.call("{invalid")).status, 400);
  assert.equal((await h.call("x".repeat(131073))).status, 413);
  h.state.verification = { hostname: "localhost" };
  assert.equal((await h.call(base())).status, 403);
  h.state.verification = { action: "submit-question" };
  assert.equal((await h.call(base())).status, 403);
  assert.equal(h.issues.length, 0);
  const missing = await worker.fetch(new Request("https://submit.example/v1/submissions", { method: "POST" }), {});
  assert.equal(missing.status, 503);
  assert.doesNotMatch(await missing.text(), /secret-must-not-leak/);
});

test("shared schema accepts all five question types and absolute tolerances above one", async () => {
  const fixture = JSON.parse(await readFile(new URL("../tests/question_bank/fixtures/submission_v2_contract.json", import.meta.url), "utf8"));
  for (const [name, question] of Object.entries(fixture.valid)) {
    assert.equal(validateQuestionSchema(question), true, name + ": " + JSON.stringify(validateQuestionSchema.errors));
    const envelope = { ...base(), type: "question", payload: { title: name, content: question.stem, question } };
    assert.deepEqual(fieldErrors(envelope), {}, name);
  }
  const question = { type: "numeric", stem: "求数量级很大的物理量", solution: "计算过程",
    answer: { value: 1e8, tolerance: { type: "absolute", value: 1000 }, unit: { required: false, accepted: [] } } };
  assert.equal(validateQuestionSchema(question), true);
  assert.deepEqual(fieldErrors({ ...base(), type: "question", payload: { title: "数值题", content: question.stem, question } }), {});
  question.answer.tolerance.type = "relative";
  assert.equal(validateQuestionSchema(question), false);
});
