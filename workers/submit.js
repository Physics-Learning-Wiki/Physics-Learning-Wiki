// workers/submit.js
// Cloudflare Worker: 投稿 API
// 从 Vercel Serverless Function (api/submit.js) 迁移而来

const OWNER = "Physics-Learning-Wiki";
const REPO = "Physics-Learning-Wiki";

const SUBMISSION_LABELS = {
  "full-page": "投稿-完整页面",
  "notes": "投稿-笔记/提纲",
  "errata": "投稿-勘误",
  "suggestion": "投稿-建议",
};

function buildIssueBody(data) {
  const lines = [
    `## 投稿信息`,
    ``,
    `- **投稿类型**: ${data.typeLabel || data.type}`,
    `- **目标章节**: ${data.chapter || "未指定"}`,
    `- **署名**: ${data.attribution || "匿名"}`,
  ];
  if (data.contact) {
    lines.push(`- **联系方式**: ${data.contact}`);
  }
  lines.push(``, `---`, ``, data.content);
  return lines.join("\n");
}

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
        turnstileToken,
      } = await request.json();

      if (!title || !content || !type) {
        return jsonResponse(
          { error: "缺少必填字段：标题、正文、投稿类型" },
          400
        );
      }

      if (!["full-page", "notes", "errata", "suggestion"].includes(type)) {
        return jsonResponse({ error: "无效的投稿类型" }, 400);
      }

      if (!turnstileToken) {
        return jsonResponse({ error: "缺少人机验证令牌" }, 400);
      }

      // Validate Turnstile
      const clientIp = request.headers.get("CF-Connecting-IP");
      const formBody = new URLSearchParams({
        secret: env.TURNSTILE_SECRET_KEY,
        response: turnstileToken,
        ...(clientIp && { remoteip: clientIp }),
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
