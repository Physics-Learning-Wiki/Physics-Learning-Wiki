import test from "node:test";
import assert from "node:assert/strict";
import { MathRenderer, renderMathInHtml, renderMathInQuestion } from "../task-handler.js";

async function createRenderer() {
  const renderer = new MathRenderer();
  await renderer.initialize();
  return renderer;
}

test("MathJax SSR renders inline math and keeps Assistive MathML without duplicate TeX", async () => {
  const renderer = await createRenderer();
  const inputHtml = '<p>质量为 <span class="arithmatex">\\(2\\,\\mathrm{kg}\\)</span> 的物体</p>';
  const outputHtml = await renderMathInHtml(inputHtml, renderer);

  assert.ok(!outputHtml.includes("arithmatex"), "Should remove arithmatex class");
  assert.ok(outputHtml.includes("<mjx-container"), "Should render MathJax container");
  assert.ok(outputHtml.includes("<mjx-assistive-mml"), "Should retain accessible MathML");
  assert.ok(!outputHtml.includes("data-latex"), "Should remove MathJax data-latex attributes");
  assert.ok(!outputHtml.includes("<img"), "Should not add a fallback GIF image");
  assert.ok(!outputHtml.includes('title="2\\,\\mathrm{kg}"'), "Should not duplicate TeX in a fallback title");
});

test("MathJax SSR supports display math and common TeX/physics constructs", async () => {
  const renderer = await createRenderer();
  const inputHtml = [
    '<span class="arithmatex">\\(F_{\\rm net}=10-4=6\\,\\mathrm N\\)</span>',
    '<span class="arithmatex">\\(\\frac{d}{dt}x^2 + \\alpha + \\boldsymbol{\\Omega}\\)</span>',
    '<span class="arithmatex">\\(\\int_0^1 \\mathbf{F}\\cdot d\\mathbf{x}\\)</span>',
    '<div class="arithmatex">\\[\\begin{pmatrix}1&0\\\\0&1\\end{pmatrix}\\]</div>'
  ].join("");
  const outputHtml = await renderMathInHtml(inputHtml, renderer);

  assert.equal((outputHtml.match(/<mjx-container/g) ?? []).length, 4);
  assert.ok(outputHtml.includes('display="true"'), "Should render display equations as blocks");
  assert.ok(outputHtml.includes("<mjx-assistive-mml"));
  assert.ok(!outputHtml.includes("arithmatex"));
  assert.ok(!outputHtml.includes("data-latex"));
  assert.ok(!outputHtml.includes("<img"));
});

test("adaptive CSS includes glyphs first encountered in the last scanned formula", async () => {
  const renderer = await createRenderer();
  await renderer.render("x + \\alpha", false);
  const cssBeforeLastFormula = renderer.getCSS();
  await renderer.render("\\mathfrak{D} + \\int_0^1 x^2\\,dx", false);
  const cssAfterLastFormula = renderer.getCSS();

  assert.ok(cssAfterLastFormula.length > cssBeforeLastFormula.length);
  assert.match(cssAfterLastFormula, /mjx-c\.mjx-c1D507\b/, "CSS must include Mathematical Fraktur Capital D");
});

test("MathJax SSR leaves HTML without math unchanged", async () => {
  const renderer = await createRenderer();
  const plainHtml = "<p>这是一段没有公式的普通文本。</p>";
  const outputHtml = await renderMathInHtml(plainHtml, renderer);

  assert.equal(outputHtml, plainHtml);
});

test("MathJax conversion errors identify the source and formula location", async () => {
  const renderer = await createRenderer();
  await assert.rejects(
    renderMathInHtml('<span class="arithmatex">\\(\\frac{1}{\\)</span>', renderer, "notes/topic.html"),
    error => {
      assert.ok(error.message.includes("notes/topic.html formula #1"));
      assert.ok(error.message.includes("\\frac{1}{"));
      return true;
    }
  );
});

test("renderMathInQuestion processes stem, solution, hints, choices, and feedback", async () => {
  const renderer = await createRenderer();

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

  await renderMathInQuestion(question, renderer);

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
