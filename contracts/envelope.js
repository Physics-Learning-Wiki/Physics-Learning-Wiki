import { validateEnvelope, validateWithdrawal } from "./generated.js";
import { validateQuestion, unsafeMarkdown, hasHtmlOrUnsafe, hasControlCharacters } from "./validation.js";

export const LICENSE_VERSION = "CC-BY-SA-4.0";
export const TYPE_LABELS = { "full-page": "完整页面", notes: "笔记/提纲", errata: "勘误纠错",
  question: "题目投稿", "quiz-set": "题集投稿", suggestion: "建议/想法" };

export function fieldErrors(data, withdrawal = false) {
  const validate = withdrawal ? validateWithdrawal : validateEnvelope;
  const result = {};
  if (!validate(data)) {
    for (const error of validate.errors || []) {
      const path = error.instancePath + (error.params.missingProperty ? "/" + error.params.missingProperty : "");
      result[path || "/"] = error.message || "字段无效";
    }
    return result;
  }
  if (withdrawal) {
    if (unsafeMarkdown(data.reason)) result["/reason"] = "撤稿说明包含不安全内容";
    return result;
  }
  for (const name of ["title", "chapter", "attribution"]) {
    const value = data.payload[name];
    const plainValue = typeof value === "string" && name === "chapter" ? value.replaceAll(" > ", " / ") : value;
    if (value && (hasControlCharacters(value) || hasHtmlOrUnsafe(plainValue) || /[\r\n]/.test(value))) {
      result["/payload/" + name] = "此字段不能包含 HTML、换行或控制字符";
    }
  }
  if (unsafeMarkdown(data.payload.content)) result["/payload/content"] = "正文包含不安全内容";
  if (data.type === "question") {
    const error = validateQuestion(data.payload.question);
    if (error) {
      let field = "";
      if (/逐项反馈/.test(error)) field = "/feedback/choices";
      else if (/答案|容差|单位/.test(error)) field = "/answer";
      else if (/选项/.test(error)) field = "/choices";
      else if (/题干/.test(error)) field = "/stem";
      else if (/图片|媒体/.test(error)) field = "/external_media";
      else if (/自评|等级|评分/.test(error)) field = "/grading";
      result["/payload/question" + field] = error;
    }
  }
  if (data.type === "quiz-set") {
    const set = data.payload.quizSet;
    const keys = new Set();
    set.newQuestions.forEach((entry, index) => {
      const path = `/payload/quizSet/newQuestions/${index}`;
      if (keys.has(entry.clientId)) result[path + "/clientId"] = "新题条目标识重复";
      keys.add(entry.clientId);
      const error = validateQuestion(entry.question);
      if (error) result[path + "/question"] = error;
      validateDeclaration(entry.sourceDeclaration, path + "/sourceDeclaration", result);
    });
    const selected = new Set();
    set.selection.items.forEach((item, index) => {
      const key = item.kind === "new" ? item.clientId : item.questionId;
      const path = `/payload/quizSet/selection/items/${index}`;
      if (selected.has(key)) result[path] = "题集不能重复引用同一道题";
      selected.add(key);
      if (item.kind === "new" && !keys.has(key)) result[path] = "引用的新题不存在";
    });
    if (set.tags.some(tag => hasControlCharacters(tag) || hasHtmlOrUnsafe(tag)))
      result["/payload/quizSet/tags"] = "标签包含不安全内容";
  }
  validateDeclaration(data.sourceDeclaration, "/sourceDeclaration", result);
  if (new TextEncoder().encode(JSON.stringify(data)).length > 131072)
    result["/payload"] = "请求超过 128 KiB，请拆分投稿或导出草稿";
  if (new TextEncoder().encode(publicBody(publicRecord(data, (data.baseRevision || 0) + 1, "2000-01-01T00:00:00.000Z"))).length > 59900)
    result["/payload/content"] = "稿件连同题目与许可记录过大，请缩短正文或拆分投稿";
  return result;
}

function validateDeclaration(declaration, path, result) {
  if (Object.values(declaration).some(value => typeof value === "string" &&
    (hasControlCharacters(value) || hasHtmlOrUnsafe(value)))) {
    result[path] = "来源声明包含不安全的元数据";
  }
  if (declaration.kind === "adapted") {
    try {
      if (!["https:", "http:"].includes(new URL(declaration.source).protocol)) throw new Error();
    } catch { result[path + "/source"] = "请填写有效的来源网址"; }
  }
}

export function publicBody(record) {
  const payload = record.payload;
  const lines = ["## 投稿信息", "", "- **投稿类型**: " + TYPE_LABELS[record.type],
    "- **署名**: " + (payload.attribution || "匿名"),
    "- **许可协议**: CC BY-SA 4.0；作者已明确确认", "- **投稿修订**: " + record.revision];
  if (payload.chapter) lines.push("- **目标章节**: " + payload.chapter);
  lines.push("", "---", "", payload.content);
  if (record.type === "question") lines.push("", "## 参考解析", "", payload.question.solution);
  if (record.type === "quiz-set") {
    lines.push("", "## 题集编排", "", ...payload.quizSet.selection.items.map((item, index) =>
      `${index + 1}. ${item.kind === "existing" ? "引用题目 " + item.questionId : "本次新题 " + item.clientId}`));
    lines.push("", "新题数：" + payload.quizSet.newQuestions.length + "；完整题目及各自来源见下方结构化记录．");
  }
  lines.push("", machineBlock("plw-submission-v1", record));
  return lines.join("\n");
}

export function publicRecord(envelope, revision, confirmedAt) {
  const { turnstileToken, baseRevision, ...record } = envelope;
  return { ...record, revision, licenseConfirmedAt: confirmedAt };
}

export function machineBlock(kind, record) {
  const fence = String.fromCharCode(96).repeat(3);
  return fence + "json " + kind + "\n" + JSON.stringify(record) + "\n" + fence;
}

export function readBlocks(body, kind) {
  const fence = String.fromCharCode(96).repeat(3);
  const pattern = new RegExp("^" + fence + "json " + kind + "\\s*\\n([^\\n]+)\\n" + fence + "\\s*$", "gm");
  return [...(body || "").matchAll(pattern)].map(match => JSON.parse(match[1]));
}
