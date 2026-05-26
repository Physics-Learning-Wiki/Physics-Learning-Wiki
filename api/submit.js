// ⚠️ DEPRECATED: 此文件已被 Cloudflare Worker (workers/submit.js) 替代。
// *.vercel.app 域名在中国大陆被 GFW 封锁，此函数不可用。
// 保留作为备份参考，不删除。
import { Octokit } from "octokit";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY;
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

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { title, content, type, chapter, attribution, contact, turnstileToken } =
      req.body;

    if (!title || !content || !type) {
      return res.status(400).json({ error: "缺少必填字段：标题、正文、投稿类型" });
    }

    if (!["full-page", "notes", "errata", "suggestion"].includes(type)) {
      return res.status(400).json({ error: "无效的投稿类型" });
    }

    // Validate Turnstile
    const turnstileResult = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: TURNSTILE_SECRET,
          response: turnstileToken,
        }),
      }
    );
    const turnstileData = await turnstileResult.json();
    if (!turnstileData.success) {
      return res.status(400).json({ error: "人机验证失败，请重试" });
    }

    const label = SUBMISSION_LABELS[type] || "投稿-待审核";

    const octokit = new Octokit({ auth: GITHUB_TOKEN });
    const issue = await octokit.rest.issues.create({
      owner: OWNER,
      repo: REPO,
      title: `[投稿] ${title}`,
      body: buildIssueBody({ title, content, type, chapter, attribution, contact }),
      labels: ["投稿-待审核", label],
    });

    return res.status(200).json({
      success: true,
      issueUrl: issue.data.html_url,
      issueNumber: issue.data.number,
    });
  } catch (error) {
    console.error("Submission error:", error);
    return res.status(500).json({ error: "提交失败，请稍后重试" });
  }
}
