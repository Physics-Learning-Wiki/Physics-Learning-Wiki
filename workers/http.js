export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Idempotency-Key",
  "Access-Control-Expose-Headers": "X-Request-Id",
  "Access-Control-Max-Age": "600"
};
export function response(data, status = 200, requestId = crypto.randomUUID()) {
  return new Response(JSON.stringify(data), { status, headers: {
    ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store", "X-Request-Id": requestId
  } });
}
export class ApiError extends Error {
  constructor(status, code, message, fields = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}
export async function readJson(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "INVALID_JSON", "请求必须包含 JSON 对象");
  let length = 0;
  const chunks = [];
  while (true) {
    const item = await reader.read();
    if (item.done) break;
    length += item.value.byteLength;
    if (length > 131072) {
      await reader.cancel().catch(() => {});
      throw new ApiError(413, "REQUEST_TOO_LARGE", "请求超过 128 KiB 限制");
    }
    chunks.push(item.value);
  }
  const bytes = new Uint8Array(length);
  let at = 0;
  for (const chunk of chunks) { bytes.set(chunk, at); at += chunk.byteLength; }
  try {
    const data = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error();
    return data;
  } catch { throw new ApiError(400, "INVALID_JSON", "请求必须是合法的 JSON 对象"); }
}
export async function timedFetch(url, options, timeout = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try { return await fetch(url, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}
export async function verifyTurnstile(token, type, env) {
  let result;
  try {
    result = await timedFetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST", body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token })
    }, 5000);
    if (!result.ok) throw new Error();
    result = await result.json();
  } catch { throw new ApiError(502, "VERIFICATION_UNAVAILABLE", "人机验证服务暂时不可用，请重试"); }
  const allowed = (env.ALLOWED_HOSTNAMES || "physics-learning-wiki.github.io").split(",").map(v => v.trim());
  const production = env.ENVIRONMENT === "production" || env.NODE_ENV === "production";
  const expected = type === "question" ? "submit-question" : type === "quiz-set" ? "submit-quiz-set" : "submit-general";
  if (!result.success || !result.hostname || !allowed.includes(result.hostname) ||
      (production && ["localhost", "127.0.0.1"].includes(result.hostname)) || result.action !== expected) {
    throw new ApiError(403, "VERIFICATION_FAILED", "人机验证未通过，请重新验证");
  }
}
