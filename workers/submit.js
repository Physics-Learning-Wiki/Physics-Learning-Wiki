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
  return typeof value === "string" && /<(?:script|iframe|object|embed)\b|(?:javascript|data):/i.test(value);
}

function validHttpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

const CHOICE_ID_RE = /^[A-Z][A-Z0-9]{0,7}$/;

function validateQuestion(question) {
  if (!question || typeof question !== "object") return "缺少结构化题目";
  if (!QUESTION_TYPES.has(question.type)) return "无效题型";
  if (!nonEmptyString(question.stem) || !nonEmptyString(question.solution)) return "题干或解析为空";
  if (unsafeMarkdown(JSON.stringify(question))) return "题目包含不安全的 Markdown 或 HTML";
  if (!question.answer || typeof question.answer !== "object") return "答案无效";

  // Choice-based questions
  if (question.type === "single_choice" || question.type === "multiple_choice") {
    const maxChoices = question.type === "single_choice" ? 6 : 8;
    if (!Array.isArray(question.choices) || question.choices.length < 2 || question.choices.length > maxChoices)
      return `选项数量无效（需在 2 到 ${maxChoices} 之间）`;
    const choiceIds = question.choices.map(item => item?.id);
    if (!choiceIds.every((id, index) => typeof id === "string" && CHOICE_ID_RE.test(id) && choiceIds.indexOf(id) === index))
      return "选项 ID 无效或重复（需以大写字母开头，最长 8 位）";
    if (!question.choices.every(item => nonEmptyString(item?.content)))
      return "选项内容为空";

    // Optional choice feedback
    if (question.feedback?.choices) {
      const feedbackIds = Object.keys(question.feedback.choices);
      if (feedbackIds.length !== choiceIds.length || !feedbackIds.every(id => choiceIds.includes(id)))
        return "逐项反馈必须与选项一致";
      if (!feedbackIds.every(id => nonEmptyString(question.feedback.choices[id])))
        return "逐项反馈不能为空";
    }

    if (question.type === "single_choice") {
      if (!nonEmptyString(question.answer.choice, 8) || !choiceIds.includes(question.answer.choice))
        return "单选题答案与选项不一致";
    } else {
      const selected = question.answer.choices;
      if (!Array.isArray(selected) || !selected.length || !selected.every(item => choiceIds.includes(item)))
        return "多选题答案与选项不一致";
    }
  } else if (question.type === "true_false") {
    if (typeof question.answer.value !== "boolean") return "判断题答案无效";
  } else if (question.type === "numeric") {
    if (typeof question.answer.value !== "number" || !Number.isFinite(question.answer.value))
      return "数值题答案无效";
    if (question.answer.tolerance !== undefined) {
      const tol = question.answer.tolerance;
      if (!tol || typeof tol !== "object") return "数值题容差无效";
      if (!["absolute", "relative"].includes(tol.type)) return "数值题容差类型无效";
      if (typeof tol.value !== "number" || !Number.isFinite(tol.value) || tol.value < 0 || tol.value > 1)
        return "数值题容差值无效（需在 0 到 1 之间）";
      if (question.answer.value === 0 && tol.type === "relative") {
        return "真值为 0 时容差类型必须为绝对容差";
      }
    }
    if (question.answer.unit !== undefined) {
      const unit = question.answer.unit;
      if (!unit || typeof unit !== "object" || typeof unit.required !== "boolean" || !Array.isArray(unit.accepted)) {
        return "数值题单位定义无效";
      }
      if (!unit.accepted.every(u => typeof u === "string")) {
        return "数值题可接受单位必须为字符串数组";
      }
    }
  }

  // Optional global feedback validation
  if (question.feedback) {
    if (question.feedback.correct !== undefined && !nonEmptyString(question.feedback.correct))
      return "答对反馈无效";
    if (question.feedback.incorrect !== undefined && !nonEmptyString(question.feedback.incorrect))
      return "答错反馈无效";
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
  if (question.topics != null) {
    if (!Array.isArray(question.topics) || !question.topics.every(t => nonEmptyString(t, 120)))
      return "主题分类格式无效";
  }
  if (question.concepts != null) {
    if (!Array.isArray(question.concepts) || !question.concepts.every(c => nonEmptyString(c, 120)))
      return "概念分类格式无效";
  }

  // Optional external media validation
  if (question.external_media?.length) {
    for (const media of question.external_media) {
      if (
        !nonEmptyString(media.url, 2000) ||
        !validHttpsUrl(media.url) ||
        !nonEmptyString(media.alt, 500) ||
        !nonEmptyString(media.rights_note, 2000)
      )
        return "图片链接、替代文本或授权说明无效";
    }
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
