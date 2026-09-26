import module from "module";
import fs from "fs";
import path from "path";
import url from "url";
import crypto from "crypto";
import klaw from "klaw";
import { parse, HTMLElement } from "node-html-parser";

import { mathjax } from "@mathjax/src/js/mathjax.js";
import { TeX } from "@mathjax/src/js/input/tex.js";
import { CHTML } from "@mathjax/src/js/output/chtml.js";
import { LiteAdaptor, liteAdaptor } from "@mathjax/src/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "@mathjax/src/js/handlers/html.js";
import { AssistiveMmlHandler } from "@mathjax/src/js/a11y/assistive-mml.js";
import { STATE } from "@mathjax/src/js/core/MathItem.js";
import type { MathDocument } from "@mathjax/src/js/core/MathDocument.js";
import type { LiteDocument } from "@mathjax/src/js/adaptors/lite/Document.js";
import type { LiteElement } from "@mathjax/src/js/adaptors/lite/Element.js";
import "@mathjax/src/js/util/asyncLoad/esm.js";

import "@mathjax/src/js/input/tex/ams/AmsConfiguration.js";
import "@mathjax/src/js/input/tex/base/BaseConfiguration.js";
import "@mathjax/src/js/input/tex/boldsymbol/BoldsymbolConfiguration.js";
import "@mathjax/src/js/input/tex/colorv2/ColorV2Configuration.js";
import "@mathjax/src/js/input/tex/html/HtmlConfiguration.js";
import "@mathjax/src/js/input/tex/noundefined/NoUndefinedConfiguration.js";
import "@mathjax/src/js/input/tex/physics/PhysicsConfiguration.js";

import { TaskHandler, log } from "../html-postprocess.js";

// More details: https://github.com/mathjax/MathJax/issues/3443
// Should remove it after mathjax v4.0.1
import { Styles } from "@mathjax/src/js/util/Styles.js";
Styles.connect.margin = { ...Styles.connect.padding };

// More details: https://github.com/mathjax/MathJax/issues/3441
// Should remove it after mathjax v4.0.1
import { MO, OPTABLE } from "@mathjax/src/js/core/MmlTree/OperatorDictionary.js";
OPTABLE.infix["\u27C2"] = MO.REL;

// All HTML files will reference the CSS file with relative paths (to the HTML file)
// The CSS file will reference the fonts files with relative paths (to the CSS file)
const MATHJAX_TARGET_CSS_FILE = "assets/stylesheets/mathjax.css";
const MATHJAX_TARGET_FONTS_DIR = "assets/fonts/mathjax";

const FONT_PKG = "@mathjax/mathjax-newcm-font";

// Mark the client-side math rendering script with an extra query parameter
// to remove it when using server-side rendering
const MATH_CSR_SCRIPT_SUFFIX = "?math-csr";

export class MathRenderer {
  private adaptor: LiteAdaptor;
  private document: MathDocument<LiteElement, any, LiteDocument>;
  private outputJax: CHTML<LiteElement, unknown, LiteDocument>;

  async initialize() {
    this.adaptor = liteAdaptor();
    AssistiveMmlHandler(RegisterHTMLHandler(this.adaptor));

    const inputJax = new TeX({
      packages: ["ams", "base", "boldsymbol", "colorv2", "html", "noundefined", "physics"],
      formatError(_jax, error) {
        throw error;
      }
    });
    this.outputJax = new CHTML<LiteElement, unknown, LiteDocument>({
      // in windows, relative return with \, so need to replace
      fontURL: path.relative(path.dirname(MATHJAX_TARGET_CSS_FILE), MATHJAX_TARGET_FONTS_DIR).replaceAll("\\", "/"),
      adaptiveCSS: true,
      displayOverflow: "scroll"
    });

    this.document = mathjax.document("", {
      InputJax: inputJax,
      OutputJax: this.outputJax,
      renderActions: {
        removeLatex: [
          STATE.CONVERT + 1,
          () => undefined,
          math => {
            math.root?.walkTree(node => {
              node.attributes.unset("data-latex");
              node.attributes.unset("data-latex-item");
            });
          }
        ]
      }
    });
  }

  getCSS() {
    return this.adaptor.cssText(this.outputJax.styleSheet(this.document));
  }

  async render(math: string, isDisplay: boolean) {
    const element = (await this.document.convertPromise(math, { display: isDisplay })) as LiteElement;
    return this.adaptor.outerHTML(element);
  }
}

interface MathFormula {
  tex: string;
  isDisplay: boolean;
  source: string;
}

interface QuestionMathField {
  html: string;
  source: string;
  set(value: string): void;
}

function mathFormulaFromElement(element: HTMLElement, source: string): MathFormula {
  const content = element.textContent;
  let tex: string;
  if (content.startsWith("\\(") && content.endsWith("\\)")) {
    tex = content.slice(2, -2);
  } else if (content.startsWith("\\[") && content.endsWith("\\]")) {
    tex = content.slice(2, -2);
  } else {
    // Retain the existing pymdownx.arithmatex delimiter extraction behavior.
    tex = content.slice(2, -2);
  }
  return { tex, isDisplay: element.tagName === "DIV", source };
}

function parseMathFormulas(html: string, source: string): MathFormula[] {
  if (!html || !html.includes("arithmatex")) return [];
  const root = parse(`<div id="math-ssr-root">${html}</div>`);
  const wrapper = root.querySelector("#math-ssr-root");
  if (!wrapper) return [];
  return wrapper
    .querySelectorAll("div.arithmatex, span.arithmatex")
    .map((element, index) => mathFormulaFromElement(element, `${source} formula #${index + 1}`));
}

function formatMathFailure(formula: MathFormula, error: unknown): Error {
  const detail =
    error instanceof Error
      ? error.message
      : error && typeof error === "object" && "message" in error
      ? String(error.message)
      : String(error);
  return Object.assign(
    new Error(`MathJax conversion failed at ${formula.source}: ${JSON.stringify(formula.tex)} (${detail})`),
    { cause: error }
  );
}

/**
 * Render LaTeX in an HTML string containing arithmatex spans/divs into MathJax CHTML.
 */
export async function renderMathInHtml(html: string, renderer: MathRenderer, source = "HTML"): Promise<string> {
  if (!html || !html.includes("arithmatex")) return html;
  const root = parse(`<div id="math-ssr-root">${html}</div>`);
  const wrapper = root.querySelector("#math-ssr-root");
  if (!wrapper) return html;

  const mathElements = wrapper.querySelectorAll("div.arithmatex, span.arithmatex");
  for (const [index, element] of mathElements.entries()) {
    const formula = mathFormulaFromElement(element, `${source} formula #${index + 1}`);
    try {
      element.replaceWith(await renderer.render(formula.tex, formula.isDisplay));
    } catch (error) {
      throw formatMathFailure(formula, error);
    }
  }

  return wrapper.innerHTML;
}

function questionMathFields(question: any, source: string): QuestionMathField[] {
  if (!question || typeof question !== "object") return [];
  const fields: QuestionMathField[] = [];
  const add = (html: unknown, location: string, set: (value: string) => void) => {
    if (typeof html === "string") fields.push({ html, source: location, set });
  };

  add(question.stemHtml, `${source}.stemHtml`, value => (question.stemHtml = value));
  add(question.solutionHtml, `${source}.solutionHtml`, value => (question.solutionHtml = value));
  if (Array.isArray(question.hintsHtml)) {
    question.hintsHtml.forEach((hint: unknown, index: number) =>
      add(hint, `${source}.hintsHtml[${index}]`, value => (question.hintsHtml[index] = value))
    );
  }
  if (Array.isArray(question.choices)) {
    question.choices.forEach((choice: any, index: number) => {
      if (choice && typeof choice === "object") {
        add(choice.contentHtml, `${source}.choices[${index}].contentHtml`, value => (choice.contentHtml = value));
      }
    });
  }
  if (question.feedback && typeof question.feedback === "object") {
    for (const [key, value] of Object.entries(question.feedback)) {
      add(value, `${source}.feedback.${key}`, next => ((question.feedback as Record<string, unknown>)[key] = next));
      if (value && typeof value === "object") {
        for (const [subKey, subValue] of Object.entries(value)) {
          add(subValue, `${source}.feedback.${key}.${subKey}`, next => {
            (value as Record<string, unknown>)[subKey] = next;
          });
        }
      }
    }
  }
  return fields;
}

function collectMathInQuestion(question: any, source: string): MathFormula[] {
  return questionMathFields(question, source).flatMap(field => parseMathFormulas(field.html, field.source));
}

/**
 * Render all HTML fields of a question object with MathJax CHTML SSR.
 */
export async function renderMathInQuestion(question: any, renderer: MathRenderer, source = "question"): Promise<void> {
  for (const field of questionMathFields(question, source)) {
    field.set(await renderMathInHtml(field.html, renderer, field.source));
  }
}

async function walkFiles(root: string): Promise<string[]> {
  return await new Promise((resolve, reject) => {
    const files: string[] = [];
    klaw(root)
      .on("data", item => {
        if (item.stats.isFile()) files.push(item.path);
      })
      .on("error", reject)
      .on("end", () => resolve(files.sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))));
  });
}

function addFormula(formulas: Map<string, MathFormula>, formula: MathFormula) {
  const key = JSON.stringify([formula.tex, formula.isDisplay]);
  if (!formulas.has(key)) formulas.set(key, formula);
}

async function collectSiteMathFormulas(siteDir: string): Promise<MathFormula[]> {
  const formulas = new Map<string, MathFormula>();
  const htmlFiles = (await walkFiles(siteDir)).filter(filePath => filePath.toLowerCase().endsWith(".html"));
  for (const filePath of htmlFiles) {
    const html = await fs.promises.readFile(filePath, "utf-8");
    for (const formula of parseMathFormulas(html, path.relative(siteDir, filePath))) addFormula(formulas, formula);
  }

  const questionBankRoot = path.join(siteDir, "_generated", "question-bank");
  const questionBankFiles = await walkFiles(questionBankRoot).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  for (const filePath of questionBankFiles.filter(filePath => filePath.toLowerCase().endsWith(".json"))) {
    const source = path.relative(siteDir, filePath);
    let data: any;
    try {
      data = JSON.parse(await fs.promises.readFile(filePath, "utf-8"));
    } catch (error) {
      throw Object.assign(new Error(`Could not scan MathJax in ${source}: invalid question-bank JSON`), {
        cause: error
      });
    }
    const questions = Array.isArray(data) ? data : Array.isArray(data?.questions) ? data.questions : [];
    questions.forEach((question: any, index: number) => {
      const id = typeof question?.id === "string" ? question.id : `index ${index}`;
      for (const formula of collectMathInQuestion(question, `${source} question ${id}`)) addFormula(formulas, formula);
    });
  }

  return [...formulas.values()].sort((left, right) => {
    if (left.tex !== right.tex) return left.tex < right.tex ? -1 : 1;
    return Number(left.isDisplay) - Number(right.isDisplay);
  });
}

interface MathGlobalInitialization {
  cssHash: string;
}

export const taskHandler = new (class implements TaskHandler<MathGlobalInitialization> {
  // Scan the whole site first so the adaptive stylesheet contains every glyph used by SSR.
  async globalInitialize(siteDir: string): Promise<MathGlobalInitialization> {
    log("Copying MathJax fonts");
    const req = module.createRequire(import.meta.url);

    const fontPkgDir = path.dirname(req.resolve(`${FONT_PKG}/package.json`));
    const fontsSourceDir = path.join(fontPkgDir, "chtml", "woff2");
    const fontsDestDir = path.join(siteDir, MATHJAX_TARGET_FONTS_DIR);

    const fontFilesToCopy = await fs.promises.readdir(fontsSourceDir);

    await fs.promises.mkdir(fontsDestDir, { recursive: true });
    await Promise.all(
      fontFilesToCopy.map(filename =>
        fs.promises.copyFile(path.join(fontsSourceDir, filename), path.join(fontsDestDir, filename))
      )
    );

    log("Scanning site and question-bank math");
    const formulas = await collectSiteMathFormulas(siteDir);
    log(`Collected ${formulas.length} distinct inline/display formulas`);

    log("Collecting adaptive MathJax CSS");
    const renderer = new MathRenderer();
    await renderer.initialize();
    for (const formula of formulas) {
      try {
        await renderer.render(formula.tex, formula.isDisplay);
      } catch (error) {
        throw formatMathFailure(formula, error);
      }
    }
    const cssDestFile = path.join(siteDir, MATHJAX_TARGET_CSS_FILE);
    await fs.promises.mkdir(path.dirname(cssDestFile), { recursive: true });
    const css = renderer.getCSS();
    await fs.promises.writeFile(cssDestFile, css, "utf-8");
    const cssHash = crypto.createHash("sha256").update(css).digest("hex");

    log("Rendering math in question bank bundles");
    const questionBankRoot = path.join(siteDir, "_generated", "question-bank");
    const questionBankFiles = await walkFiles(questionBankRoot).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return [];
      throw error;
    });
    for (const filePath of questionBankFiles.filter(filePath => filePath.toLowerCase().endsWith(".json"))) {
      const raw = await fs.promises.readFile(filePath, "utf-8");
      const data = JSON.parse(raw);
      const questions = Array.isArray(data) ? data : Array.isArray(data?.questions) ? data.questions : undefined;
      if (!questions) continue;
      const source = path.relative(siteDir, filePath);
      for (const [index, question] of questions.entries()) {
        const id = typeof question?.id === "string" ? question.id : `index ${index}`;
        await renderMathInQuestion(question, renderer, `${source} question ${id}`);
      }
      await fs.promises.writeFile(filePath, JSON.stringify(data), "utf-8");
    }

    log("Remove client-side rendering assets");
    await fs.promises.rm(path.join(siteDir, "_static/js/math-csr.js"), { force: true });
    await fs.promises.rm(path.join(siteDir, "assets/vendor/mathjax"), { recursive: true, force: true });
    return { cssHash };
  }

  siteDir: string;
  renderer: MathRenderer;
  cssHash: string;

  async initialize(globalInitialization: MathGlobalInitialization, siteDir: string) {
    this.siteDir = siteDir;
    this.cssHash = globalInitialization.cssHash;

    this.renderer = new MathRenderer();
    await this.renderer.initialize();
  }

  async process(document: HTMLElement, filePath: string) {
    const mathElements = document.querySelectorAll("div.arithmatex, span.arithmatex");
    const source = path.relative(this.siteDir, filePath);
    for (const [index, element] of mathElements.entries()) {
      const formula = mathFormulaFromElement(element, `${source} formula #${index + 1}`);
      try {
        element.replaceWith(await this.renderer.render(formula.tex, formula.isDisplay));
      } catch (error) {
        throw formatMathFailure(formula, error);
      }
    }

    const mathContainers = document.querySelectorAll("mjx-container");
    const hasStaticMath = mathContainers.length > 0;
    const article = document.querySelector("article.md-content__inner.md-typeset");
    const features = (article?.getAttribute("data-plw-features") ?? "").split(/\s+/).filter(Boolean);
    const hasDynamicQuiz =
      features.includes("quiz") ||
      Boolean(
        article?.querySelector(
          "#plw-quiz-root, #plw-quiz-sets-root, #plw-quiz-questions-root, #plw-quiz-home-root, .plw-quiz-inline-root"
        )
      );
    const needsMathContract = hasStaticMath || hasDynamicQuiz;

    if (needsMathContract) {
      const pagePath = path.relative(this.siteDir, filePath);
      const rootCssHref = `${MATHJAX_TARGET_CSS_FILE}?hash=${this.cssHash}`;
      article?.setAttribute("data-plw-math-css", rootCssHref);

      if (hasStaticMath) {
        const cssFilePathToHtml = path.relative(path.dirname(pagePath), MATHJAX_TARGET_CSS_FILE).replaceAll("\\", "/");
        const pageCssHref = `${cssFilePathToHtml}?hash=${this.cssHash}`;
        const head = document.querySelector("head");
        if (!head) throw new Error(`Cannot inject MathJax CSS link: missing <head> in ${source}`);
        head.insertAdjacentHTML("beforeend", `<link rel="stylesheet" href="${pageCssHref}">`);
      }
    }

    // Remove client-side rendering script
    document
      .querySelectorAll("script")
      .filter(element => element.getAttribute("src")?.endsWith(MATH_CSR_SCRIPT_SUFFIX))
      .forEach(element => element.remove());
  }
})();
