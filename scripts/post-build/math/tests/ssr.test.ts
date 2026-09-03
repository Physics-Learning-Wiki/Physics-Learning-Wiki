import test from "node:test";
import assert from "node:assert/strict";
import { MathRenderer, renderMathInHtml, renderMathInQuestion } from "../task-handler.js";

test("MathJax SSR renders inline math with thin space and mathrm", async () => {
  const renderer = new MathRenderer();
  await renderer.initialize();

  const inputHtml = '<p>质量为 <span class="arithmatex">\\(2\\,\\mathrm{kg}\\)</span> 的物体</p>';
  const outputHtml = renderMathInHtml(inputHtml, renderer);

  assert.ok(!outputHtml.includes("arithmatex"), "Should remove arithmatex class");
  assert.ok(outputHtml.includes("<mjx-container"), "Should render MathJax container");
  assert.ok(outputHtml.includes('title="2\\,\\mathrm{kg}"'), "Should preserve LaTeX in fallback title");
  assert.ok(outputHtml.includes("data-latex="), "Should contain MathJax data attributes");
});

test("MathJax SSR renders display math block", async () => {
  const renderer = new MathRenderer();
  await renderer.initialize();

  const inputHtml = '<div class="arithmatex">\\[\nF_{\\rm net}=10-4=6\\,\\mathrm N\n\\]</div>';
  const outputHtml = renderMathInHtml(inputHtml, renderer);

  assert.ok(!outputHtml.includes("arithmatex"), "Should remove arithmatex class");
  assert.ok(outputHtml.includes("<mjx-container"), "Should render MathJax container");
});

test("MathJax SSR leaves HTML without math unchanged", async () => {
  const renderer = new MathRenderer();
  await renderer.initialize();

  const plainHtml = "<p>这是一段没有公式的普通文本。</p>";
  const outputHtml = renderMathInHtml(plainHtml, renderer);

  assert.equal(outputHtml, plainHtml);
});

test("renderMathInQuestion processes all question HTML fields", async () => {
  const renderer = new MathRenderer();
  await renderer.initialize();

  const question = {
    id: "test-q1",
    stemHtml: '<p>质量为 <span class="arithmatex">\\(2\\,\\mathrm{kg}\\)</span></p>',
    solutionHtml: '<p>合力为 <span class="arithmatex">\\(F = 6\\,\\mathrm{N}\\)</span></p>',
    hintsHtml: ['<p>提示 1：<span class="arithmatex">\\(F=ma\\)</span></p>', "<p>提示 2：纯文本提示</p>"],
    choices: [
      { id: "A", contentHtml: '<p><span class="arithmatex">\\(a = 3\\,\\mathrm{m/s^2}\\)</span></p>' },
      { id: "B", contentHtml: "<p>纯文本选项</p>" }
    ],
    feedback: {
      correctHtml: '<p>正确！<span class="arithmatex">\\(a=3\\)</span></p>',
      incorrectHtml: "<p>错误，请重试。</p>",
      choicesHtml: {
        A: '<p>解析：<span class="arithmatex">\\(3\\,\\mathrm{m/s^2}\\)</span> 正确</p>',
        B: "<p>纯文本反馈</p>"
      }
    }
  };

  renderMathInQuestion(question, renderer);

  assert.ok(!question.stemHtml.includes("arithmatex"));
  assert.ok(question.stemHtml.includes("<mjx-container"));

  assert.ok(!question.solutionHtml.includes("arithmatex"));
  assert.ok(question.solutionHtml.includes("<mjx-container"));

  assert.ok(!question.hintsHtml[0].includes("arithmatex"));
  assert.ok(question.hintsHtml[0].includes("<mjx-container"));
  assert.equal(question.hintsHtml[1], "<p>提示 2：纯文本提示</p>");

  assert.ok(!question.choices[0].contentHtml.includes("arithmatex"));
  assert.ok(question.choices[0].contentHtml.includes("<mjx-container"));
  assert.equal(question.choices[1].contentHtml, "<p>纯文本选项</p>");

  assert.ok(!question.feedback.correctHtml.includes("arithmatex"));
  assert.ok(question.feedback.correctHtml.includes("<mjx-container"));
  assert.equal(question.feedback.incorrectHtml, "<p>错误，请重试。</p>");

  assert.ok(!question.feedback.choicesHtml.A.includes("arithmatex"));
  assert.ok(question.feedback.choicesHtml.A.includes("<mjx-container"));
  assert.equal(question.feedback.choicesHtml.B, "<p>纯文本反馈</p>");
});
