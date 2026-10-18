import { fieldErrors, machineBlock, publicRecord, readBlocks, publicBody } from "../contracts/envelope.js";
import { ApiError, readJson, response, timedFetch, verifyTurnstile } from "./http.js";

const REPO = "Physics-Learning-Wiki/Physics-Learning-Wiki";
const API = "https://api.github.com/repos/" + REPO;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const LABELS = { "full-page": "投稿-完整页面", notes: "投稿-笔记/提纲", errata: "投稿-勘误", question: "投稿-题目", suggestion: "投稿-建议" };
const STAGES = new Set(["received", "needs_info", "accepted", "importing", "draft_ready", "reviewing", "published", "rejected", "withdrawn", "resolved"]);

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])]));
  return value;
}
async function sha(value) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(v => v.toString(16).padStart(2, "0")).join("");
}
function credential(request) {
  const token = request.headers.get("Authorization")?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if (!token) throw new ApiError(403, "INVALID_CREDENTIAL", "请提供有效的投稿管理凭证");
  return token;
}
function headers(env) {
  return { Authorization: "Bearer " + env.GITHUB_TOKEN, Accept: "application/vnd.github+json",
    "User-Agent": "Physics-Learning-Wiki-Submit-Worker", "Content-Type": "application/json" };
}
async function github(path, env, options = {}) {
  const result = await timedFetch(path.startsWith("https:") ? path : API + "/" + path,
    { ...options, headers: headers(env) });
  if (!result.ok) throw new ApiError(502, "GITHUB_UNAVAILABLE", "稿件服务暂时不可用，请保留回执后重试");
  return result.json();
}
async function pages(path, env) {
  const result = [];
  for (let page = 1; page <= 20; page++) {
    const batch = await github(path + (path.includes("?") ? "&" : "?") + "per_page=100&page=" + page, env);
    if (!Array.isArray(batch)) throw new Error("Invalid paginated response");
    result.push(...batch);
    if (batch.length < 100) return result;
  }
  throw new ApiError(502, "GITHUB_PAGE_LIMIT", "稿件记录需要维护者核对，请保留回执");
}
function marker(operation) { return "<!-- plw-operation:" + operation.operation_id + " -->"; }
function issueUrl(number) { return "https://github.com/" + REPO + "/issues/" + number; }
function resultFor(receipt, operation, number) {
  return { submissionId: receipt.id, issueNumber: number, issueUrl: issueUrl(number),
    revision: operation.revision, operationId: operation.operation_id, operationState: "completed" };
}
async function finish(db, receipt, operation, number) {
  const result = resultFor(receipt, operation, number);
  await db.batch([
    db.prepare("UPDATE submissions SET issue_number=?, revision=?, status_checked_at=NULL WHERE id=? AND revision<=?")
      .bind(number, operation.revision, receipt.id, operation.revision),
    db.prepare("UPDATE submission_operations SET state='completed', result_json=? WHERE submission_id=? AND operation_key=?")
      .bind(JSON.stringify(result), receipt.id, operation.operation_key)
  ]);
  return result;
}
async function reconcile(db, receipt, operation, env) {
  if (!["sending", "uncertain"].includes(operation.state)) return null;
  const path = operation.kind === "create" ? "issues?state=all&sort=created&direction=desc&since=" +
    encodeURIComponent(operation.created_at) : "issues/" + receipt.issue_number + "/comments?";
  const candidates = await pages(path, env);
  const matches = candidates.filter(item => !item.pull_request && item.user?.id === receipt.actor_id &&
    (item.body || "").trimEnd().endsWith(marker(operation)));
  if (matches.length !== 1) return null;
  const number = operation.kind === "create" ? matches[0].number : receipt.issue_number;
  if (!Number.isSafeInteger(number) || number < 1) return null;
  return finish(db, receipt, operation, number);
}
async function obtainStatus(db, receipt, env, includeRecord) {
  if (!receipt.issue_number) return { submissionId: receipt.id, stage: "processing", revision: 0 };
  if (!includeRecord && receipt.status_json && receipt.status_checked_at > Date.now() - 60000) {
    return JSON.parse(receipt.status_json);
  }
  const issue = await github("issues/" + receipt.issue_number, env);
  if (issue.user?.id !== receipt.actor_id) throw new Error("Issue author mismatch");
  const comments = await pages("issues/" + receipt.issue_number + "/comments?", env);
  const initial = readBlocks(issue.body, "plw-submission-v1").at(-1);
  if (!initial || initial.submissionId !== receipt.id || initial.revision !== 1) throw new Error("Invalid initial record");
  let current = initial;
  let stage = "received";
  let stateDetails = {};
  let withdrawalRequested = false;
  for (const comment of comments.sort((a, b) => a.id - b.id)) {
    const owner = comment.user?.id === receipt.actor_id;
    const workflow = comment.performed_via_github_app?.slug === "github-actions";
    if (owner) {
      const revision = readBlocks(comment.body, "plw-submission-v1").at(-1);
      if (revision && revision.submissionId === receipt.id && revision.type === receipt.kind &&
          revision.revision === current.revision + 1) { current = revision; stage = "received"; stateDetails = {}; }
      if (readBlocks(comment.body, "plw-withdrawal-request-v1").some(item => item.submissionId === receipt.id)) {
        withdrawalRequested = true;
      }
    }
    if (workflow) {
      const event = readBlocks(comment.body, "plw-submission-status-v1").at(-1);
      if (event?.revision === current.revision && STAGES.has(event.stage)) {
        stage = event.stage;
        stateDetails = event;
      }
    }
  }
  const labels = issue.labels.map(item => typeof item === "string" ? item : item.name);
  // Publication labels alone are never proof that a version was deployed.
  const manual = labels.filter(item => item?.startsWith("投稿状态:")).map(item => item.slice(5));
  if (manual.length === 1 && ["needs_info", "accepted", "reviewing", "rejected", "resolved"].includes(manual[0])) {
    stage = manual[0];
  }
  const data = { submissionId: receipt.id, issueNumber: receipt.issue_number, issueUrl: issueUrl(receipt.issue_number),
    type: receipt.kind, revision: current.revision, stage, withdrawalRequested,
    updatedAt: issue.updated_at, ...stateDetails };
  // Keep the current live version visible while a new revision is being reviewed.
  const deployed = comments.filter(c => c.performed_via_github_app?.slug === "github-actions")
    .flatMap(c => readBlocks(c.body, "plw-submission-status-v1"))
    .filter(record => record.sourceSha).at(-1);
  if (deployed?.stage === "published" && deployed.url && stage !== "withdrawn" && deployed.available !== false)
    data.published = deployed;
  await db.prepare("UPDATE submissions SET status_json=?, status_checked_at=? WHERE id=?")
    .bind(JSON.stringify(data), Date.now(), receipt.id).run();
  return includeRecord ? { ...data, record: current } : data;
}

export async function handleSubmissionApi(request, env) {
  const requestId = crypto.randomUUID();
  let sending = false;
  let pendingResult;
  try {
    const url = new URL(request.url);
    const create = url.pathname === "/v1/submissions";
    const match = url.pathname.match(/^\/v1\/submissions\/([^/]+)(?:\/(revisions|withdrawal-requests))?$/);
    if (!create && (!match || !UUID.test(match[1]))) throw new ApiError(404, "NOT_FOUND", "投稿记录不存在");
    if (!env.SUBMISSIONS_DB) throw new ApiError(503, "STORAGE_NOT_CONFIGURED", "投稿服务正在准备中，请保留草稿或通过邮件投稿");
    if (request.method !== "GET" && request.method !== "POST") throw new ApiError(405, "METHOD_NOT_ALLOWED", "不支持的请求方法");
    const db = env.SUBMISSIONS_DB;
    const id = create ? null : match[1];
    let receipt = id ? await db.prepare("SELECT * FROM submissions WHERE id=?").bind(id).first() : null;
    if (request.method === "GET" && !create && !match[2]) {
      if (!receipt) throw new ApiError(404, "NOT_FOUND", "投稿记录不存在");
      const privateQuery = request.headers.has("Authorization");
      if (privateQuery && await sha(credential(request)) !== receipt.token_hash) {
        throw new ApiError(403, "INVALID_CREDENTIAL", "投稿管理凭证无效");
      }
      let active = await db.prepare("SELECT * FROM submission_operations WHERE submission_id=? AND state IN ('pending','sending','uncertain')")
        .bind(id).first();
      if (active && privateQuery) {
        const recovered = await reconcile(db, receipt, active, env);
        if (recovered) {
          receipt = await db.prepare("SELECT * FROM submissions WHERE id=?").bind(id).first();
          active = null;
        }
      }
      const data = await obtainStatus(db, receipt, env, privateQuery);
      if (active && !receipt.issue_number) return response({ ...data, operationState: active.state }, 202, requestId);
      return response({ ...data, operationState: active?.state || "completed" }, 200, requestId);
    }
    if (request.method !== "POST" || (!create && !match[2])) throw new ApiError(405, "METHOD_NOT_ALLOWED", "不支持的请求方法");
    if (env.SUBMISSIONS_ENABLED === "false" || env.AUTHOR_MUTATIONS_ENABLED === "false") {
      throw new ApiError(503, "SUBMISSIONS_PAUSED", "投稿修改暂时暂停，草稿和回执可继续保留");
    }
    const tokenHash = await sha(credential(request));
    const key = request.headers.get("Idempotency-Key");
    if (!key || !UUID.test(key)) throw new ApiError(400, "INVALID_OPERATION_KEY", "请保留并复用有效的提交操作编号");
    const data = await readJson(request);
    const withdrawal = match?.[2] === "withdrawal-requests";
    const errors = fieldErrors(data, withdrawal);
    if (Object.keys(errors).length) throw new ApiError(422, "VALIDATION_FAILED", "请检查标记的投稿字段", errors);
    if (!create && (!receipt || receipt.token_hash !== tokenHash)) throw new ApiError(403, "INVALID_CREDENTIAL", "投稿管理凭证无效");
    const submissionId = create ? data.submissionId : id;
    if (!create && !withdrawal && (data.submissionId !== id || data.type !== receipt.kind)) {
      throw new ApiError(409, "SUBMISSION_MISMATCH", "修订必须对应原投稿的编号和类型");
    }
    if (create) {
      receipt = await db.prepare("SELECT * FROM submissions WHERE id=?").bind(submissionId).first();
      if (receipt && receipt.token_hash !== tokenHash) throw new ApiError(403, "INVALID_CREDENTIAL", "投稿管理凭证无效");
    }
    const kind = create ? "create" : withdrawal ? "withdrawal" : "revision";
    const { turnstileToken, ...stableData } = data;
    const requestHash = await sha(JSON.stringify(canonical({ kind, data: stableData })));
    let operation = await db.prepare("SELECT * FROM submission_operations WHERE submission_id=? AND operation_key=?")
      .bind(submissionId, key).first();
    if (operation) {
      if (operation.request_hash !== requestHash) throw new ApiError(409, "IDEMPOTENCY_CONFLICT", "此操作编号已用于其他内容，请先确认原提交结果");
      if (operation.state === "completed") return response(JSON.parse(operation.result_json), 200, requestId);
      const recovered = await reconcile(db, receipt, operation, env);
      if (recovered) return response(recovered, 200, requestId);
      if (["sending", "uncertain"].includes(operation.state)) {
        return response({ submissionId, operationId: operation.operation_id, operationState: "processing" }, 202, requestId);
      }
    }
    if (!create && data.baseRevision !== receipt.revision) throw new ApiError(409, "REVISION_CONFLICT", "稿件已有新版本，请先载入最新版本");
    if (create && receipt?.revision) throw new ApiError(409, "ALREADY_SUBMITTED", "投稿已收到，请通过回执提交修订");
    await verifyTurnstile(turnstileToken, create ? data.type : receipt.kind, env);
    if (!receipt) {
      const actor = env.SUBMISSION_BOT_ID ? { id: Number(env.SUBMISSION_BOT_ID) } :
        await github("https://api.github.com/user", env);
      if (!Number.isSafeInteger(actor.id) || actor.id < 1) throw new Error("Invalid submission actor");
      await db.prepare("INSERT INTO submissions(id,token_hash,kind,actor_id,created_at) VALUES(?,?,?,?,?) ON CONFLICT(id) DO NOTHING")
        .bind(submissionId, tokenHash, data.type, actor.id, new Date().toISOString()).run();
      receipt = await db.prepare("SELECT * FROM submissions WHERE id=?").bind(submissionId).first();
      if (receipt.token_hash !== tokenHash) throw new ApiError(403, "INVALID_CREDENTIAL", "投稿管理凭证无效");
    }
    const revision = withdrawal ? receipt.revision : receipt.revision + 1;
    if (!operation) {
      try {
        const inserted = await db.prepare("INSERT INTO submission_operations(submission_id,operation_key,operation_id,request_hash,kind,revision,state,created_at) SELECT ?,?,?,?,?,?,'pending',? FROM submissions WHERE id=? AND revision=?")
          .bind(submissionId, key, crypto.randomUUID(), requestHash, kind, revision, new Date().toISOString(),
            submissionId, create ? 0 : data.baseRevision).run();
        if (!inserted.meta.changes) throw new ApiError(409, "REVISION_CONFLICT", "稿件版本已变化，请重新载入");
      } catch (error) {
        if (error instanceof ApiError) throw error;
        const same = await db.prepare("SELECT * FROM submission_operations WHERE submission_id=? AND operation_key=?")
          .bind(submissionId, key).first();
        if (same && same.request_hash === requestHash) {
          return response(same.result_json ? JSON.parse(same.result_json) :
            { submissionId, operationState: "processing" }, same.state === "completed" ? 200 : 202, requestId);
        }
        const concurrent = await db.prepare("SELECT operation_key FROM submission_operations WHERE submission_id=? AND state IN ('pending','sending','uncertain')")
          .bind(submissionId).first();
        if (concurrent) throw new ApiError(409, "OPERATION_IN_PROGRESS", "上一操作仍在处理中，请先查询回执");
        throw error;
      }
      operation = await db.prepare("SELECT * FROM submission_operations WHERE submission_id=? AND operation_key=?").bind(submissionId, key).first();
    } else if (operation.state === "failed") {
      await db.prepare("UPDATE submission_operations SET state='pending' WHERE submission_id=? AND operation_key=? AND state='failed'")
        .bind(submissionId, key).run();
    }
    const record = withdrawal ? { submissionId, revision, reason: data.reason } :
      publicRecord(data, revision, operation.created_at);
    const body = (withdrawal ? "作者申请撤稿，请维护者审核．\n\n" +
      machineBlock("plw-withdrawal-request-v1", record) : publicBody(record)) + "\n\n" + marker(operation);
    if (new TextEncoder().encode(body).length > 60000) {
      await db.prepare("UPDATE submission_operations SET state='failed' WHERE submission_id=? AND operation_key=?").bind(submissionId, key).run();
      throw new ApiError(422, "ISSUE_TOO_LARGE", "稿件生成后超过 60 KiB 限制，请缩短正文或分拆稿件", { "/payload/content": "生成的稿件过长" });
    }
    const claimed = await db.prepare("UPDATE submission_operations SET state='sending' WHERE submission_id=? AND operation_key=? AND state='pending'")
      .bind(submissionId, key).run();
    if (!claimed.meta.changes) return response({ submissionId, operationState: "processing" }, 202, requestId);
    sending = true;
    pendingResult = { submissionId, operationId: operation.operation_id, operationState: "processing" };
    const target = create ? "issues" : "issues/" + receipt.issue_number + "/comments";
    const outgoing = create ? { title: "[投稿] " + data.payload.title, body,
      labels: ["投稿-待审核", LABELS[data.type]] } : { body };
    let upstream;
    try { upstream = await timedFetch(API + "/" + target, { method: "POST", headers: headers(env), body: JSON.stringify(outgoing) }); }
    catch {
      await db.prepare("UPDATE submission_operations SET state='uncertain' WHERE submission_id=? AND operation_key=?").bind(submissionId, key).run();
      return response(pendingResult, 202, requestId);
    }
    if (!upstream.ok) {
      const uncertain = upstream.status >= 500;
      await db.prepare("UPDATE submission_operations SET state=? WHERE submission_id=? AND operation_key=?")
        .bind(uncertain ? "uncertain" : "failed", submissionId, key).run();
      if (uncertain) return response(pendingResult, 202, requestId);
      sending = false;
      throw new ApiError(upstream.status === 429 ? 429 : 502, "GITHUB_REJECTED", "稿件服务暂时拒绝了请求，请保留原操作编号后重试");
    }
    const upstreamData = await upstream.json();
    const number = create ? upstreamData.number : receipt.issue_number;
    if (!Number.isSafeInteger(number) || number < 1) throw new Error("Invalid upstream result");
    const result = await finish(db, receipt, operation, number);
    return response(result, create ? 201 : 200, requestId);
  } catch (error) {
    // The upstream may have committed. Never advise a fresh POST after an uncertain write.
    if (sending) return response(pendingResult, 202, requestId);
    const code = error instanceof ApiError ? error.code : "SERVICE_UNAVAILABLE";
    console.error("submission_api", code, requestId);
    return response({ code, message: error instanceof ApiError ? error.message : "投稿服务暂时不可用，请保留草稿和回执",
      error: error instanceof ApiError ? error.message : "投稿服务暂时不可用", fieldErrors: error.fields || {}, requestId },
    error instanceof ApiError ? error.status : 503, requestId);
  }
}
