// workers/submit.js
// Cloudflare Worker: 投稿 API
// 从 Vercel Serverless Function (api/submit.js) 迁移而来

const OWNER = "Physics-Learning-Wiki";
const REPO = "Physics-Learning-Wiki";

const SUBMISSION_LABELS = {
  "full-page": "投稿-完整页面",
  "notes": "投稿-笔记/提纲",
  "errata": "投稿-勘误",
  "question": "投稿-题目",
  "suggestion": "投稿-建议",
};

function buildIssueBody(data) {
  const lines = [
    `## 投稿信息`,
    ``,
    `- **投稿类型**: ${data.typeLabel || data.type}`,
    `- **署名**: ${data.attribution || "匿名"}`,
  ];
  if (data.chapter) {
    lines.push(`- **目标章节**: ${data.chapter}`);
  }
  if (data.contact) {
    lines.push(`- **公开联系方式**: ${data.contact}`);
  }
  lines.push(``, `---`, ``, data.content);
  if (data.type === "question" && data.question) {
    const question = data.question;
    lines.push(
      "",
      "## 题目结构",
      "",
      `- **题型**: \`${question.type}\``,
      `- **难度**: ${question.difficulty != null ? question.difficulty : "未指定"}`,
      `- **主题**: ${question.topics && question.topics.length ? question.topics.join(", ") : "未指定"}`,
      `- **概念**: ${question.concepts && question.concepts.length ? question.concepts.join(", ") : "未指定"}`,
      "",
      "## 机器可读载荷",
      "",
      "```json plw-question-submission-v2",
      JSON.stringify({ schemaVersion: 2, question }),
      "```"
    );
  }
  return lines.join("\n");
}

const QUESTION_TYPES = new Set(["single_choice", "multiple_choice", "true_false", "numeric"]);
const COGNITIVE_LEVELS = new Set(["remember", "understand", "apply", "analyze"]);
const STYLES = new Set(["conceptual", "graphical", "computational", "modeling"]);

function nonEmptyString(value, max = 20000) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

function unsafeMarkdown(value) {
  return typeof value === "string" && /<(?:script|iframe|object|embed|form|input|button)\b|\bon[a-z]+\s*=|(?:\bjavascript|\bdata):/i.test(value);
}

function validHttpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

const ALLOWED_QUESTION_KEYS = new Set([
  "type",
  "choice_order",
  "stem",
  "solution",
  "answer",
  "choices",
  "feedback",
  "hints",
  "difficulty",
  "cognitive_level",
  "style",
  "estimated_seconds",
  "topics",
  "concepts",
  "objectives",
  "related_pages",
  "external_media",
  "attribution",
  "ai_assisted",
]);

const CHOICE_ID_RE = /^[A-Z][A-Z0-9]{0,7}$/;
const DOTTED_ID_RE = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9-]*)+$/;

function validateQuestion(question) {
  if (!question || typeof question !== "object" || Array.isArray(question)) return "缺少结构化题目";

  // Top-level whitelist DTO check
  for (const key of Object.keys(question)) {
    if (!ALLOWED_QUESTION_KEYS.has(key)) return `题目包含未知字段: ${key}`;
  }

  if (!QUESTION_TYPES.has(question.type)) return "无效题型";
  if (!nonEmptyString(question.stem) || !nonEmptyString(question.solution)) return "题干或解析为空";
  if (unsafeMarkdown(JSON.stringify(question))) return "题目包含不安全的 Markdown 或 HTML";
  if (!question.answer || typeof question.answer !== "object" || Array.isArray(question.answer)) return "答案无效";

  // Optional choice_order
  if (question.choice_order !== undefined) {
    if (question.choice_order !== "shuffle" && question.choice_order !== "fixed") {
      return "选项顺序设置无效（仅支持 shuffle 或 fixed）";
    }
  }

  // Choice-based questions
  if (question.type === "single_choice" || question.type === "multiple_choice") {
    const minChoices = question.type === "single_choice" ? 2 : 3;
    const maxChoices = question.type === "single_choice" ? 6 : 8;
    if (!Array.isArray(question.choices) || question.choices.length < minChoices || question.choices.length > maxChoices)
      return `选项数量无效（${question.type === "single_choice" ? "单选需 2 到 6 个" : "多选需 3 到 8 个"}选项）`;

    for (const item of question.choices) {
      if (!item || typeof item !== "object" || Array.isArray(item)) return "选项结构无效";
      const keys = Object.keys(item);
      if (keys.length !== 2 || !keys.includes("id") || !keys.includes("content")) {
        return "选项包含未知属性或缺少必要属性（仅允许 id 与 content）";
      }
    }

    const choiceIds = question.choices.map(item => item.id);
    if (!choiceIds.every((id, index) => typeof id === "string" && CHOICE_ID_RE.test(id) && choiceIds.indexOf(id) === index))
      return "选项 ID 无效或重复（需以大写字母开头，最长 8 位）";
    if (!question.choices.every(item => nonEmptyString(item.content)))
      return "选项内容为空";

    // Optional choice feedback
    if (question.feedback?.choices !== undefined) {
      if (typeof question.feedback.choices !== "object" || question.feedback.choices === null || Array.isArray(question.feedback.choices)) {
        return "逐项反馈格式无效";
      }
      const feedbackIds = Object.keys(question.feedback.choices);
      if (feedbackIds.length !== choiceIds.length || !feedbackIds.every(id => choiceIds.includes(id)))
        return "逐项反馈必须与选项一致";
      if (!feedbackIds.every(id => nonEmptyString(question.feedback.choices[id])))
        return "逐项反馈不能为空";
    }

    if (question.type === "single_choice") {
      const ansKeys = Object.keys(question.answer);
      if (ansKeys.length !== 1 || ansKeys[0] !== "choice") return "单选题答案格式无效（仅允许 choice 属性）";
      if (!nonEmptyString(question.answer.choice, 8) || !choiceIds.includes(question.answer.choice))
        return "单选题答案与选项不一致";
    } else {
      const ansKeys = Object.keys(question.answer);
      if (ansKeys.length !== 1 || ansKeys[0] !== "choices") return "多选题答案格式无效（仅允许 choices 属性）";
      const selected = question.answer.choices;
      if (!Array.isArray(selected) || selected.length < 2 || !selected.every(item => choiceIds.includes(item)))
        return "多选题答案无效（至少需包含 2 个有效选项）";
      if (new Set(selected).size !== selected.length)
        return "多选题答案不能包含重复选项";
    }
  } else if (question.type === "true_false") {
    if (question.choices !== undefined) return "判断题不能包含 choices 选项列表";
    const ansKeys = Object.keys(question.answer);
    if (ansKeys.length !== 1 || ansKeys[0] !== "value") return "判断题答案格式无效（仅允许 value 属性）";
    if (typeof question.answer.value !== "boolean") return "判断题答案无效";
  } else if (question.type === "numeric") {
    if (question.choices !== undefined) return "数值题不能包含 choices 选项列表";
    const ansKeys = Object.keys(question.answer);
    if (ansKeys.length !== 3 || !ansKeys.includes("value") || !ansKeys.includes("tolerance") || !ansKeys.includes("unit")) {
      return "数值题答案格式无效（必须且仅允许包含 value, tolerance, unit）";
    }
    if (typeof question.answer.value !== "number" || !Number.isFinite(question.answer.value))
      return "数值题答案无效";

    const tol = question.answer.tolerance;
    if (!tol || typeof tol !== "object" || Array.isArray(tol)) return "数值题容差无效";
    const tolKeys = Object.keys(tol);
    if (tolKeys.length !== 2 || !tolKeys.includes("type") || !tolKeys.includes("value")) {
      return "数值题容差包含未知属性（仅允许 type 与 value）";
    }
    if (!["absolute", "relative"].includes(tol.type)) return "数值题容差类型无效";
    if (typeof tol.value !== "number" || !Number.isFinite(tol.value) || tol.value < 0 || tol.value > 1)
      return "数值题容差值无效（需在 0 到 1 之间）";
    if (question.answer.value === 0 && tol.type === "relative") {
      return "真值为 0 时容差类型必须为绝对容差";
    }

    const unit = question.answer.unit;
    if (!unit || typeof unit !== "object" || Array.isArray(unit) || typeof unit.required !== "boolean" || !Array.isArray(unit.accepted)) {
      return "数值题单位定义无效";
    }
    const unitKeys = Object.keys(unit);
    for (const uk of unitKeys) {
      if (uk !== "required" && uk !== "accepted" && uk !== "canonical") {
        return `数值题单位定义包含未知属性: ${uk}`;
      }
    }
    if (!unit.accepted.every(u => nonEmptyString(u, 50))) {
      return "数值题可接受单位必须为非空字符串数组";
    }
    if (new Set(unit.accepted).size !== unit.accepted.length) {
      return "数值题可接受单位不能重复";
    }
    if (unit.canonical !== undefined) {
      if (!nonEmptyString(unit.canonical, 50)) return "规范单位无效";
      if (unit.required && !unit.accepted.includes(unit.canonical)) {
        return "规范单位必须包含在可接受单位列表中";
      }
    }
  }

  // Optional feedback validation
  if (question.feedback !== undefined) {
    if (typeof question.feedback !== "object" || question.feedback === null || Array.isArray(question.feedback)) {
      return "反馈定义格式无效";
    }
    const fbKeys = Object.keys(question.feedback);
    for (const fk of fbKeys) {
      if (fk !== "choices" && fk !== "correct" && fk !== "incorrect") {
        return `反馈定义包含未知属性: ${fk}`;
      }
    }
    if (question.feedback.correct !== undefined && !nonEmptyString(question.feedback.correct))
      return "答对反馈无效";
    if (question.feedback.incorrect !== undefined && !nonEmptyString(question.feedback.incorrect))
      return "答错反馈无效";
  }

  // Optional hints validation
  if (question.hints !== undefined) {
    if (!Array.isArray(question.hints) || !question.hints.every(h => nonEmptyString(h))) {
      return "提示内容必须为非空字符串数组";
    }
  }

  // Optional metadata validation
  if (question.difficulty != null) {
    if (!Number.isInteger(question.difficulty) || question.difficulty < 1 || question.difficulty > 3)
      return "难度无效";
  }
  if (question.cognitive_level != null && !COGNITIVE_LEVELS.has(question.cognitive_level)) {
    return "认知层级无效";
  }
  if (question.style != null && !STYLES.has(question.style)) {
    return "题目风格无效";
  }
  if (question.estimated_seconds != null) {
    if (
      !Number.isInteger(question.estimated_seconds) ||
      question.estimated_seconds < 10 ||
      question.estimated_seconds > 1800
    )
      return "预计作答时间无效";
  }
  if (question.topics !== undefined) {
    if (!Array.isArray(question.topics) || !question.topics.every(t => typeof t === "string" && DOTTED_ID_RE.test(t)))
      return "主题分类格式无效（需为点分小写命名空间，如 mechanics.dynamics）";
    if (new Set(question.topics).size !== question.topics.length)
      return "主题分类不能包含重复项";
  }
  if (question.concepts !== undefined) {
    if (!Array.isArray(question.concepts) || !question.concepts.every(c => typeof c === "string" && DOTTED_ID_RE.test(c)))
      return "概念分类格式无效（需为点分小写命名空间，如 newton.inertia）";
    if (new Set(question.concepts).size !== question.concepts.length)
      return "概念分类不能包含重复项";
  }
  if (question.objectives !== undefined) {
    if (!Array.isArray(question.objectives) || !question.objectives.every(o => typeof o === "string" && DOTTED_ID_RE.test(o)))
      return "教学目标格式无效（需为点分命名空间）";
    if (new Set(question.objectives).size !== question.objectives.length)
      return "教学目标不能包含重复项";
  }
  if (question.related_pages !== undefined) {
    if (!Array.isArray(question.related_pages) || !question.related_pages.every(p => typeof p === "string" && DOTTED_ID_RE.test(p)))
      return "关联页面格式无效（需为点分命名空间）";
    if (new Set(question.related_pages).size !== question.related_pages.length)
      return "关联页面不能包含重复项";
  }

  // Optional external media validation
  if (question.external_media !== undefined) {
    if (!Array.isArray(question.external_media) || question.external_media.length === 0) {
      return "外部媒体必须为非空数组";
    }
    for (const media of question.external_media) {
      if (!media || typeof media !== "object" || Array.isArray(media)) return "外部媒体格式无效";
      const mediaKeys = Object.keys(media);
      if (mediaKeys.length !== 3 || !mediaKeys.includes("url") || !mediaKeys.includes("alt") || !mediaKeys.includes("rights_note")) {
        return "外部媒体包含未知属性或缺少必要属性（仅允许 url, alt, rights_note）";
      }
      if (
        !nonEmptyString(media.url, 2000) ||
        !validHttpsUrl(media.url) ||
        !nonEmptyString(media.alt, 500) ||
        !nonEmptyString(media.rights_note, 2000)
      )
        return "图片链接、替代文本或授权说明无效";
    }
  }

  if (question.attribution !== undefined) {
    if (!nonEmptyString(question.attribution, 200)) return "作者署名无效";
  }
  if (question.ai_assisted !== undefined) {
    if (typeof question.ai_assisted !== "boolean") return "ai_assisted 必须为布尔值";
  }

  return null;
}

export { buildIssueBody, validateQuestion };

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    try {
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
      } = await request.json();

      if (!title || !content || !type) {
        return jsonResponse(
          { error: "缺少必填字段：标题、正文、投稿类型" },
          400
        );
      }

      if (!["full-page", "notes", "errata", "question", "suggestion"].includes(type)) {
        return jsonResponse({ error: "无效的投稿类型" }, 400);
      }
      if (title.length > 120 || content.length > 50000 || (contact && contact.length > 500)) {
        return jsonResponse({ error: "投稿字段超过长度限制" }, 400);
      }
      if (unsafeMarkdown(content)) {
        return jsonResponse({ error: "投稿包含不安全的 Markdown 或 HTML" }, 400);
      }
      if (contact && !contactPublicConsent) {
        return jsonResponse({ error: "联系方式将公开显示，必须明确同意公开" }, 400);
      }
      if (type === "question") {
        const questionError = validateQuestion(question);
        if (questionError) return jsonResponse({ error: questionError }, 400);
      }

      if (!turnstileToken) {
        return jsonResponse({ error: "缺少人机验证令牌" }, 400);
      }

      // Validate Turnstile
      const formBody = new URLSearchParams({
        secret: env.TURNSTILE_SECRET_KEY,
        response: turnstileToken,
      });
      const turnstileResult = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formBody,
        }
      );
      const turnstileData = await turnstileResult.json();
      if (!turnstileData.success) {
        console.error("Turnstile verification failed:", JSON.stringify(turnstileData));
        return jsonResponse({ error: "人机验证失败，请重试" }, 400);
      }

      const label = SUBMISSION_LABELS[type] || "投稿-待审核";

      // Create GitHub Issue via REST API
      const issueResult = await fetch(
        `https://api.github.com/repos/${OWNER}/${REPO}/issues`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.GITHUB_TOKEN}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "Physics-Learning-Wiki-Submit-Worker",
          },
          body: JSON.stringify({
            title: `[投稿] ${title}`,
            body: buildIssueBody({
              title,
              content,
              type,
              typeLabel,
              chapter,
              attribution,
              contact,
              question,
            }),
            labels: ["投稿-待审核", label],
          }),
        }
      );

      if (!issueResult.ok) {
        const errorText = await issueResult.text();
        console.error("GitHub API error:", issueResult.status, errorText);
        return jsonResponse({ error: "创建 Issue 失败，请稍后重试" }, 502);
      }

      const issue = await issueResult.json();

      return jsonResponse({
        success: true,
        issueUrl: issue.html_url,
        issueNumber: issue.number,
      });
    } catch (error) {
      console.error("Submission error:", error);
      return jsonResponse({ error: "提交失败，请稍后重试" }, 500);
    }
  },
};
