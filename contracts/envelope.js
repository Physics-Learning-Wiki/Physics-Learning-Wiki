import { validateEnvelope, validateWithdrawal } from "./generated.js";
import { validateQuestion, unsafeMarkdown, hasHtmlOrUnsafe, hasControlCharacters } from "./validation.js";

export const LICENSE_VERSION = "CC-BY-SA-4.0";
export const TYPE_LABELS = { "full-page": "完整页面", notes: "笔记/提纲", errata: "勘误纠错",
  question: "题目投稿", suggestion: "建议/想法" };

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
  const declaration = data.sourceDeclaration;
  if (Object.values(declaration).some(value => typeof value === "string" &&
    (hasControlCharacters(value) || hasHtmlOrUnsafe(value)))) {
    result["/sourceDeclaration"] = "来源声明包含不安全的元数据";
  }
  if (declaration.kind === "adapted") {
    try {
      if (!["https:", "http:"].includes(new URL(declaration.source).protocol)) throw new Error();
    } catch { result["/sourceDeclaration/source"] = "请填写有效的来源网址"; }
  }
  return result;
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
