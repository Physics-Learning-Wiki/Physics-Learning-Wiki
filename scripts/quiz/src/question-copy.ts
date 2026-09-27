import type { Question, UserAnswer } from "./types.js";

export function formatQuestionMarkdown(question: Question, manifestUrl: URL): string {
  if (!question.source) throw new Error("题目原始文本不可用");
  const replaceAssets = (markdown: string) =>
    markdown.replace(
      /(!\[[^\]]*\]\()asset:([a-z][a-z0-9-]{0,31})(\))/g,
      (match, before: string, id: string, after: string) => {
        const relative = question.assets[id];
        return relative ? `${before}${new URL(relative, manifestUrl).href}${after}` : match;
      }
    );
  const parts = [`题目 ID：${question.id}`, "", replaceAssets(question.source.stemMarkdown)];
  for (const choice of question.source.choices) {
    parts.push("", `${choice.id}. ${replaceAssets(choice.contentMarkdown)}`);
  }
  return parts.join("\n").trim();
}

export function formatAiPrompt(question: Question, manifestUrl: URL, answer?: UserAnswer): string {
  const prompt = [
    "我正在学习物理。请作为一名重视理解过程的物理辅导老师，帮助我分析下面这道题。",
    "",
    "要求：",
    "1. 优先帮助我识别应使用的物理概念、规律和建模方法。",
    "2. 先分析思路并逐步给予提示；除非我明确要求，否则不要只给最终答案。",
    "3. 如果我的理解存在问题，请明确指出具体是哪一步概念、假设或推理存在问题。",
    "4. 数学表达请使用 Markdown + LaTeX。",
    "5. 如果题目信息不足，请明确指出缺少什么，不要自行编造条件。",
    "",
    "题目：",
    "",
    formatQuestionMarkdown(question, manifestUrl)
  ];
  if (answer !== undefined && answer !== null) {
    prompt.push("", "我当前的作答：", typeof answer === "string" ? answer : JSON.stringify(answer));
  }
  prompt.push("", "我的问题：");
  return prompt.join("\n");
}
