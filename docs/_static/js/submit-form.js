// docs/_static/js/submit-form.js
// 章节下拉数据。由 scripts/generate-nav.py 自动生成，勿手动编辑。
// Last generated: 2026-05-25
const NAV_TREE = [
  { label: "数学工具", children: [
    { label: "微积分", children: [
      { label: "极限与连续" },
      { label: "导数与微分" },
      { label: "积分" },
      { label: "常微分方程" },
      { label: "变分法" },
    ]},
    { label: "线性代数", children: [
      { label: "向量与矩阵" },
      { label: "线性空间" },
    ]},
    { label: "矢量分析" },
    { label: "复数与复变函数" },
    { label: "概率与统计" },
    { label: "常用特殊函数" },
  ]},
  { label: "经典力学", children: [
    { label: "质点运动学" },
    { label: "质点动力学" },
    { label: "刚体力学" },
    { label: "流体力学" },
    { label: "振动与波" },
    { label: "万有引力与天体物理" },
    { label: "分析力学" },
  ]},
  { label: "热学与统计物理", children: [
    { label: "热学基本概念和物质聚集态" },
    { label: "热平衡态的统计分布律" },
    { label: "热力学第一定律" },
  ]},
  { label: "电磁学" },
  { label: "光学" },
  { label: "近代物理" },
  { label: "实验物理" },
  { label: "计算物理与工具" },
  { label: "竞赛相关" },
];

function populateChapterSelect() {
  const select = document.getElementById("submit-chapter");
  if (!select) return;

  function addOptions(children, prefix) {
    for (const item of children) {
      const label = prefix ? `${prefix} > ${item.label}` : item.label;
      const option = document.createElement("option");
      option.value = label;
      option.textContent = label;
      select.appendChild(option);
      if (item.children) {
        addOptions(item.children, label);
      }
    }
  }

  select.innerHTML = "";
  addOptions(NAV_TREE, "");
  const defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.textContent = "-- 可选，帮助编辑组分类 --";
  select.insertBefore(defaultOpt, select.firstChild);
}

let easyMDE = null;

let attributionAbort = null;

let mathJaxReady = null;

function loadMathJax() {
  if (mathJaxReady) return mathJaxReady;

  mathJaxReady = new Promise(function (resolve) {
    window.MathJax = {
      tex: {
        inlineMath: [["$", "$"], ["\\(", "\\)"]],
        displayMath: [["$$", "$$"], ["\\[", "\\]"]],
        processEscapes: true,
      },
      startup: {
        typeset: false,
        ready: function () {
          MathJax.startup.defaultReady();
          resolve(MathJax);
        },
      },
    };

    var script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js";
    script.async = true;
    document.head.appendChild(script);
  });

  return mathJaxReady;
}

function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function initEditor() {
  const el = document.getElementById("submit-content");
  if (!el || typeof EasyMDE === "undefined") return;

  // Destroy previous instance if it exists
  if (easyMDE) {
    easyMDE.toTextArea();
    easyMDE = null;
  }

  easyMDE = new EasyMDE({
    element: el,
    spellChecker: false,
    placeholder: "在这里写你的内容... 支持 Markdown 和 LaTeX 公式",
    toolbar: [
      "bold", "italic", "heading", "|",
      "quote", "unordered-list", "ordered-list", "|",
      "link", "image", "|",
      {
        name: "inline-math",
        action: function customFunction(editor) {
          const cm = editor.codemirror;
          const selection = cm.getSelection();
          cm.replaceSelection(`$${selection}$`);
          if (!selection) {
            const pos = cm.getCursor();
            cm.setCursor({ line: pos.line, ch: pos.ch - 1 });
          }
        },
        className: "fa fa-hashtag",
        title: "行内公式 $...$",
      },
      {
        name: "block-math",
        action: function customFunction(editor) {
          const cm = editor.codemirror;
          const selection = cm.getSelection();
          cm.replaceSelection(`$$${selection}$$`);
        },
        className: "fa fa-superscript",
        title: "块级公式 $$...$$",
      },
      "|",
      "preview", "side-by-side", "fullscreen",
    ],
    renderingConfig: {
      singleLineBreaks: false,
      codeSyntaxHighlighting: true,
    },
    previewRender: debounce(function (plainText, previewElement) {
      const html = this.parent.markdown(plainText);
      previewElement.innerHTML = html;
      loadMathJax()
        .then(function (mj) {
          return mj.typesetPromise([previewElement]);
        })
        .catch(console.error);
      return previewElement.innerHTML;
    }, 300),
  });
}

const TYPE_HINTS = {
  "full-page": "请包含：问题引入 → 核心概念 → 公式推导 → 例题 → 易错点",
  "notes": "半成品也没关系！把你的课堂笔记、复习提纲、思维导图粘贴进来即可",
  "errata": "请指出：具体章节 → 哪段文字/公式 → 错误描述 → 正确版本",
  "question": "请提交一道完整题目；每次投稿只包含一道题，编辑组会在 Issue 中继续沟通",
  "suggestion": "对网站结构、内容方向、功能改进的任何想法都欢迎",
};

function updateTypeHint() {
  const typeSelect = document.getElementById("submit-type");
  const hint = document.getElementById("submit-hint");
  if (typeSelect && hint) {
    hint.textContent = TYPE_HINTS[typeSelect.value] || "";
    const questionFields = document.getElementById("question-fields");
    if (questionFields) questionFields.hidden = typeSelect.value !== "question";
  }
}

let questionCatalog = {};

async function loadQuestionCatalog() {
  const pageSelect = document.getElementById("question-page");
  if (!pageSelect) return;
  try {
    const response = await fetch("../_generated/question-bank/manifest.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const manifest = await response.json();
    questionCatalog = manifest.pages || {};
    pageSelect.innerHTML = '<option value="">-- 请选择 --</option>';
    for (const [pageId, page] of Object.entries(questionCatalog)) {
      const option = document.createElement("option");
      option.value = pageId;
      option.textContent = page.title;
      pageSelect.append(option);
    }
  } catch (error) {
    console.warn("Unable to load question catalog", error);
  }
}

function updateQuestionObjectives() {
  const pageId = document.getElementById("question-page")?.value;
  const objectiveSelect = document.getElementById("question-objective");
  if (!objectiveSelect) return;
  objectiveSelect.innerHTML = '<option value="">-- 请选择 --</option>';
  for (const objective of questionCatalog[pageId]?.objectives || []) {
    const option = document.createElement("option");
    option.value = objective.id;
    option.textContent = objective.title;
    objectiveSelect.append(option);
  }
}

function updateQuestionType() {
  const type = document.getElementById("question-type")?.value;
  document.querySelectorAll(".question-choice-only").forEach(element => {
    element.hidden = type !== "single_choice" && type !== "multiple_choice";
  });
}

function parsePairs(text, label) {
  const result = {};
  for (const line of text.split(/\r?\n/).map(item => item.trim()).filter(Boolean)) {
    const separator = line.indexOf("|");
    if (separator < 1 || !line.slice(separator + 1).trim()) throw new Error(`${label}格式应为“ID|内容”`);
    const id = line.slice(0, separator).trim().toUpperCase();
    if (result[id]) throw new Error(`${label}中 ID ${id} 重复`);
    result[id] = line.slice(separator + 1).trim();
  }
  return result;
}

function buildQuestionPayload(content) {
  const value = id => document.getElementById(id)?.value?.trim() || "";
  const type = value("question-type");
  const choicesById =
    type === "single_choice" || type === "multiple_choice"
      ? parsePairs(value("question-choices"), "选项")
      : {};
  const choiceFeedback =
    type === "single_choice" || type === "multiple_choice"
      ? parsePairs(value("question-choice-feedback"), "逐项反馈")
      : {};
  if (Object.keys(choicesById).join("\0") !== Object.keys(choiceFeedback).join("\0"))
    throw new Error("逐项反馈必须与选项 ID 完全一致");
  const answerText = value("question-answer");
  let answer;
  if (type === "single_choice") answer = { choice: answerText.toUpperCase() };
  else if (type === "multiple_choice")
    answer = { choices: answerText.split(",").map(item => item.trim().toUpperCase()).filter(Boolean) };
  else if (type === "true_false") {
    if (!["true", "false"].includes(answerText.toLowerCase())) throw new Error("判断题答案必须是 true 或 false");
    answer = { value: answerText.toLowerCase() === "true" };
  } else {
    const numeric = Number(answerText);
    if (!Number.isFinite(numeric)) throw new Error("数值题答案必须是有限数字");
    answer = {
      value: numeric,
      tolerance: { type: "absolute", value: 0.01 },
      unit: { required: false, accepted: [] },
    };
  }
  const correct = value("question-correct-feedback");
  const incorrect = value("question-incorrect-feedback");
  const externalUrl = value("question-image-url");
  const externalMedia = externalUrl
    ? [{ url: externalUrl, alt: value("question-image-alt"), rights_note: value("question-image-rights") }]
    : [];
  const payload = {
    page_id: value("question-page"),
    primary_objective: value("question-objective"),
    secondary_objectives: [],
    concepts: value("question-concepts").split(",").map(item => item.trim()).filter(Boolean),
    type,
    choice_order: type === "single_choice" || type === "multiple_choice" ? "shuffle" : "fixed",
    stem: content,
    choices:
      type === "single_choice" || type === "multiple_choice"
        ? Object.entries(choicesById).map(([id, content]) => ({ id, content }))
        : undefined,
    answer,
    feedback:
      type === "single_choice" || type === "multiple_choice"
        ? { choices: choiceFeedback, correct, incorrect }
        : { correct, incorrect },
    solution: value("question-solution"),
    hints: value("question-hints").split(/\r?\n/).map(item => item.trim()).filter(Boolean),
    difficulty: Number(value("question-difficulty")),
    cognitive_level: value("question-cognitive"),
    style: value("question-style"),
    estimated_seconds: Number(value("question-seconds")),
    attribution: document.querySelector('input[name="attribution-type"][value="anonymous"]')?.checked
      ? "匿名投稿者"
      : (document.getElementById("submit-attribution")?.value.trim() || "匿名投稿者"),
    ai_assisted: Boolean(document.getElementById("question-ai-assisted")?.checked),
    external_media: externalMedia,
  };
  if (
    !payload.page_id ||
    !payload.primary_objective ||
    !payload.concepts.length ||
    !payload.solution ||
    !correct ||
    !incorrect
  )
    throw new Error("请完整填写题目结构中的必填字段");
  if (!document.getElementById("question-license")?.checked) throw new Error("请确认 CC BY-SA 4.0 授权");
  if (externalUrl && (!externalUrl.startsWith("https://") || !externalMedia[0].alt || !externalMedia[0].rights_note))
    throw new Error("图片投稿必须提供 HTTPS 链接、替代文本和授权说明");
  return payload;
}

function setupAttributionToggle() {
  if (attributionAbort) attributionAbort.abort();
  attributionAbort = new AbortController();
  const signal = attributionAbort.signal;

  const namedRadio = document.querySelector('input[name="attribution-type"][value="named"]');
  const anonRadio = document.querySelector('input[name="attribution-type"][value="anonymous"]');
  const attributionInput = document.getElementById("submit-attribution");

  if (!namedRadio || !anonRadio || !attributionInput) return;

  namedRadio.addEventListener("change", () => {
    attributionInput.disabled = false;
    attributionInput.placeholder = "你希望在页面上显示的署名";
  }, { signal });
  anonRadio.addEventListener("change", () => {
    attributionInput.disabled = true;
    attributionInput.value = "";
    attributionInput.placeholder = "将显示为「匿名同学」";
  }, { signal });
}

const SUBMIT_ENDPOINT = "https://submit.folderrewind.top";

const TYPE_LABELS = {
  "full-page": "完整页面",
  "notes": "笔记/提纲",
  "errata": "勘误纠错",
  "question": "题目投稿",
  "suggestion": "建议/想法",
};

let turnstileToken = null;

function initTurnstile() {
  if (typeof turnstile === "undefined") {
    console.warn("Turnstile not loaded");
    return;
  }
  turnstile.render("#turnstile-widget", {
    sitekey: "0x4AAAAAADWCCejih_jntWim",
    callback: function (token) {
      turnstileToken = token;
    },
    "expired-callback": function () {
      turnstileToken = null;
    },
    "error-callback": function () {
      turnstileToken = null;
      const status = document.getElementById("submit-status");
      if (status) {
        status.textContent = "人机验证加载失败，请刷新页面重试";
        status.className = "error";
      }
    },
  });
}

// Turnstile 加载完成后自动初始化
window.onloadTurnstileCallback = initTurnstile;

async function handleSubmit(event) {
  event.preventDefault();

  const btn = document.getElementById("submit-btn");
  const status = document.getElementById("submit-status");
  const typeSelect = document.getElementById("submit-type");
  const titleInput = document.getElementById("submit-title");
  const chapterSelect = document.getElementById("submit-chapter");
  const attributionInput = document.getElementById("submit-attribution");
  const contactInput = document.getElementById("submit-contact");
  const contactPublic = document.getElementById("submit-contact-public");
  const anonRadio = document.querySelector('input[name="attribution-type"][value="anonymous"]');

  status.textContent = "";
  status.className = "";

  if (!easyMDE) {
    status.textContent = "编辑器尚未初始化，请刷新页面后重试";
    status.className = "error";
    return;
  }

  const content = easyMDE.value().trim();
  const title = titleInput.value.trim();
  const type = typeSelect.value;

  if (!title || !content || !type) {
    status.textContent = "请填写标题、正文和投稿类型";
    status.className = "error";
    return;
  }
  if (contactInput.value.trim() && !contactPublic.checked) {
    status.textContent = "联系方式会公开显示；请勾选公开同意，或清空联系方式";
    status.className = "error";
    return;
  }

  if (!turnstileToken) {
    status.textContent = "请完成人机验证";
    status.className = "error";
    return;
  }

  btn.disabled = true;
  btn.textContent = "提交中...";

  try {
    const resp = await fetch(SUBMIT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        content,
        type,
        typeLabel: TYPE_LABELS[type] || type,
        chapter: chapterSelect.value,
        attribution: anonRadio && anonRadio.checked
          ? "匿名"
          : (attributionInput.value.trim() || "匿名"),
        contact: contactInput.value.trim(),
        contactPublicConsent: Boolean(contactPublic.checked),
        question: type === "question" ? buildQuestionPayload(content) : undefined,
        turnstileToken,
      }),
    });

    if (!resp.ok) {
      let errorMsg = "提交失败";
      try {
        const errorData = await resp.json();
        errorMsg = errorData.error || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }

    const data = await resp.json();

    // 显示成功页面
    document.getElementById("submission-form").style.display = "none";
    document.getElementById("submit-success").style.display = "block";
    const link = document.getElementById("submit-issue-link");
    if (link) {
      link.href = data.issueUrl;
      link.textContent = data.issueUrl;
    }
  } catch (err) {
    status.textContent = err.message || "提交失败，请稍后重试。也可直接发送邮件至 submit@folderrewind.top";
    status.className = "error";
    btn.disabled = false;
    btn.textContent = "提交投稿";
    if (typeof turnstile !== "undefined") {
      turnstile.reset();
    }
    turnstileToken = null;
  }
}

// Single initialization point using mkdocs-material's document$ observable.
// This fires on both initial page load and instant navigation.
document$.subscribe(function () {
  // Only run on the submit page
  if (!document.getElementById("submission-form")) return;

  populateChapterSelect();
  initEditor();
  void loadQuestionCatalog();
  setupAttributionToggle();
  updateTypeHint();
  updateQuestionType();

  const typeSelect = document.getElementById("submit-type");
  if (typeSelect) {
    typeSelect.removeEventListener("change", updateTypeHint);
    typeSelect.addEventListener("change", updateTypeHint);
  }
  const questionPage = document.getElementById("question-page");
  if (questionPage) {
    questionPage.removeEventListener("change", updateQuestionObjectives);
    questionPage.addEventListener("change", updateQuestionObjectives);
  }
  const questionType = document.getElementById("question-type");
  if (questionType) {
    questionType.removeEventListener("change", updateQuestionType);
    questionType.addEventListener("change", updateQuestionType);
  }
  const parameters = new URL(window.location.href).searchParams;
  if (parameters.get("type") === "errata") {
    typeSelect.value = "errata";
    document.getElementById("submit-title").value = parameters.get("title") || "";
    const prefill = [
      `题目 ID：${parameters.get("question_id") || ""}`,
      `题目版本：${parameters.get("question_version") || ""}`,
      `页面 ID：${parameters.get("page_id") || ""}`,
      "",
      "问题描述：",
    ].join("\n");
    easyMDE?.value(prefill);
    updateTypeHint();
  }

  const form = document.getElementById("submission-form");
  if (form) {
    form.removeEventListener("submit", handleSubmit);
    form.addEventListener("submit", handleSubmit);
  }
});
