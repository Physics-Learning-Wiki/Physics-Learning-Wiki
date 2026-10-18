import { buildIssueBody, validateQuestion, unsafeMarkdown, hasHtmlOrUnsafe, hasControlCharacters } from "../contracts/validation.js";
import { handleSubmissionApi } from "./submissions.js";
import { CORS } from "./http.js";
export { buildIssueBody, validateQuestion, unsafeMarkdown, hasHtmlOrUnsafe };
const OWNER = "Physics-Learning-Wiki";
const REPO = "Physics-Learning-Wiki";
const SUBMISSION_LABELS = {"full-page":"投稿-完整页面", notes:"投稿-笔记/提纲", errata:"投稿-勘误", question:"投稿-题目", suggestion:"投稿-建议"};
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Idempotency-Key",
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

const ALLOWED_TOP_LEVEL_KEYS = new Set([
  "title",
  "content",
  "type",
  "typeLabel",
  "chapter",
  "attribution",
  "contact",
  "contactPublicConsent",
  "question",
  "turnstileToken",
  "licenseConsent",
  "licenseVersion",
]);

const ALLOWED_SUBMISSION_TYPES = new Set([
  "full-page",
  "notes",
  "errata",
  "question",
  "suggestion",
]);

export default {
  async fetch(request, env) {
    if (request.method !== "OPTIONS" && new URL(request.url).pathname.startsWith("/v1/submissions")) {
      return handleSubmissionApi(request, env);
    }
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const MAX_REQUEST_BYTES = 131072; // 128 KiB

    // S-08 & P1-2: 128 KiB Content-Length check
    const contentLengthHeader = request.headers.get("content-length");
    if (contentLengthHeader) {
      const contentLength = parseInt(contentLengthHeader, 10);
      if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
        return jsonResponse({ error: "请求数据超出体积限制 (128KB)" }, 413);
      }
    }

    // P1-2: Enforce bounded streaming read when Content-Length is missing or spoofed
    let rawText = "";
    if (request.body && typeof request.body.getReader === "function") {
      const reader = request.body.getReader();
      const decoder = new TextDecoder();
      let totalBytes = 0;
      const chunks = [];
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          totalBytes += value.byteLength;
          if (totalBytes > MAX_REQUEST_BYTES) {
            try {
              await reader.cancel();
            } catch {}
            return jsonResponse({ error: "请求数据超出体积限制 (128KB)" }, 413);
          }
          chunks.push(value);
        }
      } catch {
        return jsonResponse({ error: "读取请求体失败" }, 400);
      }

      const combined = new Uint8Array(totalBytes);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.byteLength;
      }
      rawText = decoder.decode(combined);
    } else {
      try {
        rawText = await request.text();
        if (new TextEncoder().encode(rawText).length > MAX_REQUEST_BYTES) {
          return jsonResponse({ error: "请求数据超出体积限制 (128KB)" }, 413);
        }
      } catch {
        return jsonResponse({ error: "读取请求体失败" }, 400);
      }
    }

    let rawBody;
    try {
      rawBody = JSON.parse(rawText);
    } catch (parseError) {
      return jsonResponse({ error: "请求格式无效，必须为合法的 JSON 对象" }, 400);
    }

    if (typeof rawBody !== "object" || rawBody === null || Array.isArray(rawBody)) {
      return jsonResponse({ error: "请求载荷必须为 JSON 对象" }, 400);
    }

    // S-01: Top-level key whitelist
    for (const key of Object.keys(rawBody)) {
      if (!ALLOWED_TOP_LEVEL_KEYS.has(key)) {
        return jsonResponse({ error: `不支持的未知顶层字段: ${key}` }, 400);
      }
    }

    // Strict string type and length validations
    const {
      title,
      content,
      type,
      typeLabel,
      chapter,
      attribution,
      contact,
      contactPublicConsent,
      question,
      turnstileToken,
      licenseConsent,
      licenseVersion,
    } = rawBody;

    if (typeof title !== "string" || typeof content !== "string" || typeof type !== "string") {
      return jsonResponse({ error: "缺少必填字符串字段：标题、正文、投稿类型" }, 400);
    }

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    const trimmedType = type.trim();

    if (!trimmedTitle || !trimmedContent || !trimmedType) {
      return jsonResponse({ error: "标题、正文和投稿类型不能为空" }, 400);
    }

    if (hasControlCharacters(trimmedTitle) || hasHtmlOrUnsafe(trimmedTitle)) {
      return jsonResponse({ error: "标题包含不合法的控制字符或 HTML 标签" }, 400);
    }

    if (/[\r\n]/.test(trimmedTitle)) {
      return jsonResponse({ error: "标题不能包含换行符" }, 400);
    }

    if (trimmedTitle.length > 120) {
      return jsonResponse({ error: "标题长度不能超过 120 字符" }, 400);
    }

    if (trimmedContent.length > 50000) {
      return jsonResponse({ error: "正文长度不能超过 50000 字符" }, 400);
    }

    if (!ALLOWED_SUBMISSION_TYPES.has(trimmedType)) {
      return jsonResponse({ error: "无效的投稿类型" }, 400);
    }

    if (unsafeMarkdown(trimmedContent)) {
      return jsonResponse({ error: "投稿包含不安全的 Markdown 或 HTML" }, 400);
    }

    let sanitizedAttribution = "匿名";
    if (attribution !== undefined && attribution !== null) {
      if (typeof attribution !== "string") {
        return jsonResponse({ error: "署名必须为字符串类型" }, 400);
      }
      const trimmedAttribution = attribution.trim();
      if (trimmedAttribution.length > 60) {
        return jsonResponse({ error: "署名长度不能超过 60 字符" }, 400);
      }
      if (hasControlCharacters(trimmedAttribution) || /[\r\n]/.test(trimmedAttribution) || hasHtmlOrUnsafe(trimmedAttribution)) {
        return jsonResponse({ error: "署名不能包含控制字符、换行符或 HTML 标签" }, 400);
      }
      if (trimmedAttribution) {
        sanitizedAttribution = trimmedAttribution;
      }
    }

    let sanitizedChapter = "";
    if (chapter !== undefined && chapter !== null) {
      if (typeof chapter !== "string") {
        return jsonResponse({ error: "目标章节必须为字符串类型" }, 400);
      }
      const trimmedChapter = chapter.trim();
      if (trimmedChapter.length > 120) {
        return jsonResponse({ error: "目标章节长度不能超过 120 字符" }, 400);
      }
      if (hasControlCharacters(trimmedChapter) || /[\r\n]/.test(trimmedChapter) || hasHtmlOrUnsafe(trimmedChapter)) {
        return jsonResponse({ error: "目标章节不能包含控制字符、换行符或 HTML 标签" }, 400);
      }
      sanitizedChapter = trimmedChapter;
    }

    let sanitizedTypeLabel = "";
    if (typeLabel !== undefined && typeLabel !== null) {
      if (typeof typeLabel !== "string") {
        return jsonResponse({ error: "类型标签必须为字符串类型" }, 400);
      }
      const trimmedTypeLabel = typeLabel.trim();
      if (trimmedTypeLabel.length > 60) {
        return jsonResponse({ error: "类型标签长度不能超过 60 字符" }, 400);
      }
      if (hasControlCharacters(trimmedTypeLabel) || /[\r\n]/.test(trimmedTypeLabel) || hasHtmlOrUnsafe(trimmedTypeLabel)) {
        return jsonResponse({ error: "类型标签不能包含控制字符、换行符或 HTML 标签" }, 400);
      }
      sanitizedTypeLabel = trimmedTypeLabel;
    }

    let sanitizedContact = "";
    if (contact !== undefined && contact !== null) {
      if (typeof contact !== "string") {
        return jsonResponse({ error: "联系方式必须为字符串类型" }, 400);
      }
      const trimmedContact = contact.trim();
      if (trimmedContact.length > 200) {
        return jsonResponse({ error: "联系方式长度不能超过 200 字符" }, 400);
      }
      if (hasControlCharacters(trimmedContact) || /[\r\n]/.test(trimmedContact) || hasHtmlOrUnsafe(trimmedContact)) {
        return jsonResponse({ error: "联系方式不能包含控制字符、换行符或 HTML 标签" }, 400);
      }
      if (trimmedContact) {
        if (typeof contactPublicConsent !== "boolean") {
          return jsonResponse({ error: "提供联系方式时，必须以布尔值明确声明是否同意公开" }, 400);
        }
        if (!contactPublicConsent) {
          return jsonResponse({ error: "联系方式将公开显示在 Issue 中，必须明确同意公开" }, 400);
        }
        sanitizedContact = trimmedContact;
      }
    }

    if (licenseConsent !== undefined && typeof licenseConsent !== "boolean") {
      return jsonResponse({ error: "licenseConsent 必须为布尔值" }, 400);
    }

    if (licenseVersion !== undefined && (typeof licenseVersion !== "string" || licenseVersion.length > 32)) {
      return jsonResponse({ error: "licenseVersion 必须为有效字符串" }, 400);
    }

    if (trimmedType === "question") {
      if (!question || typeof question !== "object" || Array.isArray(question)) {
        return jsonResponse({ error: "题目投稿必须包含有效的 question 对象" }, 400);
      }
      if (!licenseConsent) {
        return jsonResponse({ error: "题目投稿必须明确同意按 CC BY-SA 4.0 协议发布" }, 400);
      }
      const questionError = validateQuestion(question);
      if (questionError) return jsonResponse({ error: questionError }, 400);
    }

    if (typeof turnstileToken !== "string" || !turnstileToken.trim()) {
      return jsonResponse({ error: "缺少人机验证令牌" }, 400);
    }
    if (turnstileToken.length > 2048) {
      return jsonResponse({ error: "人机验证令牌长度无效" }, 400);
    }

    // S-07: Turnstile verification with timeout and domain/action checks
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    let turnstileResult;
    try {
      const formBody = new URLSearchParams({
        secret: env.TURNSTILE_SECRET_KEY,
        response: turnstileToken.trim(),
      });
      turnstileResult = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formBody,
          signal: controller.signal,
        }
      );
    } catch (turnstileFetchError) {
      clearTimeout(timeoutId);
      console.error("Turnstile request failed:", turnstileFetchError?.message || "timeout");
      return jsonResponse({ error: "人机验证服务暂时不可用，请稍后重试" }, 502);
    }
    clearTimeout(timeoutId);

    if (!turnstileResult.ok) {
      return jsonResponse({ error: "人机验证服务返回异常，请稍后重试" }, 502);
    }

    let turnstileData;
    try {
      turnstileData = await turnstileResult.json();
    } catch {
      return jsonResponse({ error: "人机验证响应解析失败" }, 502);
    }

    if (!turnstileData || !turnstileData.success) {
      console.error("Turnstile verification failed:", JSON.stringify(turnstileData));
      return jsonResponse({ error: "人机验证失败，请重试" }, 400);
    }

    // P1-1: Validate hostname strictly (fail-closed)
    const isProduction = env.ENVIRONMENT === "production" || env.NODE_ENV === "production";
    const allowedHostnames = new Set(
      env.ALLOWED_HOSTNAMES
        ? env.ALLOWED_HOSTNAMES.split(",").map(h => h.trim()).filter(Boolean)
        : isProduction
          ? ["physics-learning-wiki.github.io"]
          : ["physics-learning-wiki.github.io", "localhost", "127.0.0.1"]
    );
    if (!turnstileData.hostname || !allowedHostnames.has(turnstileData.hostname)) {
      console.error("Turnstile hostname disallowed or missing:", turnstileData.hostname);
      return jsonResponse({ error: "人机验证来源主机名无效" }, 400);
    }

    // P1-1: Validate action strictly (fail-closed, must strictly match expectedAction)
    const expectedAction = trimmedType === "question" ? "submit-question" : "submit-general";
    if (!turnstileData.action || turnstileData.action !== expectedAction) {
      console.error("Turnstile action mismatch or missing:", turnstileData.action, "expected:", expectedAction);
      return jsonResponse({ error: "人机验证业务行为不匹配" }, 400);
    }

    return jsonResponse({ code: "CLIENT_UPGRADE_REQUIRED", message: "投稿接口已升级，请刷新投稿页面后重新确认来源与许可．",
      error: "投稿接口已升级，请刷新投稿页面后重新确认来源与许可．", fieldErrors: {} }, 409);
  },
};
