// docs/_static/js/question-contribute.js
// 专用题目投稿交互脚本 (Submission Protocol v2)

// Both submission scripts are loaded on every page. Keep this form's state and
// helpers private so they cannot collide with the general submission form.
(function () {
"use strict";

const SUBMIT_ENDPOINT = "https://submit.folderrewind.top";

let stemEditor = null;
let solutionEditor = null;
let attributionAbort = null;
let turnstileToken = null;
let turnstileWidgetId = null;

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
    const script = document.createElement("script");
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

let easyMDELoadPromise = null;
function ensureEasyMDE() {
  if (typeof EasyMDE !== "undefined") return Promise.resolve(EasyMDE);
  if (easyMDELoadPromise) return easyMDELoadPromise;
  easyMDELoadPromise = new Promise(function (resolve, reject) {
    if (!document.querySelector("link[href*='easymde.min.css']")) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/npm/easymde/dist/easymde.min.css";
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/easymde/dist/easymde.min.js";
    script.onload = function () {
      resolve(window.EasyMDE);
    };
    script.onerror = function (err) {
      easyMDELoadPromise = null;
      reject(err);
    };
    document.head.appendChild(script);
  });
  return easyMDELoadPromise;
}

async function initEditors() {
  const stemEl = document.getElementById("q-submit-stem");
  const solutionEl = document.getElementById("q-submit-solution");
  if (!stemEl || !solutionEl) return;

  try {
    await ensureEasyMDE();
  } catch (err) {
    console.warn("Failed to load EasyMDE", err);
    return;
  }

  if (stemEditor) {
    stemEditor.toTextArea();
    stemEditor = null;
  }
  if (solutionEditor) {
    solutionEditor.toTextArea();
    solutionEditor = null;
  }

  const toolbarConfig = [
    "bold", "italic", "heading", "|",
    "quote", "unordered-list", "ordered-list", "|",
    "link", "image", "|",
    {
      name: "inline-math",
      action: function (editor) {
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
      action: function (editor) {
        const cm = editor.codemirror;
        const selection = cm.getSelection();
        cm.replaceSelection(`$$${selection}$$`);
      },
      className: "fa fa-superscript",
      title: "块级公式 $$...$$",
    },
    "|",
    "preview", "side-by-side", "fullscreen",
  ];

  stemEditor = new EasyMDE({
    element: stemEl,
    spellChecker: false,
    placeholder: "输入题目题干，支持 Markdown 格式与 LaTeX 公式（如 $F=ma$）...",
    toolbar: toolbarConfig,
    renderingConfig: { singleLineBreaks: false, codeSyntaxHighlighting: true },
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

  solutionEditor = new EasyMDE({
    element: solutionEl,
    spellChecker: false,
    placeholder: "输入参考答案与考点深度解析，支持 LaTeX 公式推导...",
    toolbar: toolbarConfig,
    renderingConfig: { singleLineBreaks: false, codeSyntaxHighlighting: true },
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

function updateQuestionTypeUi() {
  const typeSelect = document.getElementById("q-submit-type");
  if (!typeSelect) return;
  const isChoice = typeSelect.value === "single_choice" || typeSelect.value === "multiple_choice";
  const choiceElements = document.querySelectorAll(".q-submit-choice-only");
  choiceElements.forEach(el => {
    el.hidden = !isChoice;
  });

  const answerInput = document.getElementById("q-submit-answer");
  if (answerInput) {
    if (typeSelect.value === "single_choice") {
      answerInput.placeholder = "填入正确选项大写字母，如 A";
    } else if (typeSelect.value === "multiple_choice") {
      answerInput.placeholder = "填入正确选项，以逗号分隔，如 A, C";
    } else if (typeSelect.value === "true_false") {
      answerInput.placeholder = "正确填 true，错误填 false";
    } else if (typeSelect.value === "numeric") {
      answerInput.placeholder = "填入有效数字（如 9.8 或 3.14）";
    }
  }
}

async function loadTaxonomyTopics() {
  const topicSelect = document.getElementById("q-submit-topic");
  if (!topicSelect) return;
  try {
    const res = await fetch("../../_generated/question-bank/manifest.json", { cache: "no-cache" });
    if (!res.ok) return;
    const manifest = await res.json();
    if (manifest.catalogs?.taxonomy) {
      const taxRes = await fetch(new URL(manifest.catalogs.taxonomy, new URL("../../_generated/question-bank/manifest.json", window.location.href)).href);
      if (taxRes.ok) {
        const taxonomy = await taxRes.json();
        topicSelect.innerHTML = '<option value="">-- 未指定（由维护者归类） --</option>';
        for (const [tid, topic] of Object.entries(taxonomy.topics || {})) {
          const opt = document.createElement("option");
          opt.value = tid;
          opt.textContent = `${topic.title} (${tid})`;
          topicSelect.appendChild(opt);
        }
      }
    }
  } catch {
    // optional
  }
}

function parsePairs(text, label) {
  const result = {};
  for (const line of text.split(/\r?\n/).map(item => item.trim()).filter(Boolean)) {
    const separator = line.indexOf("|");
    if (separator < 1 || !line.slice(separator + 1).trim()) throw new Error(`${label}格式应为「ID|内容」，例如「A|选项内容」`);
    const id = line.slice(0, separator).trim().toUpperCase();
    if (result[id]) throw new Error(`${label}中选项标号 ${id} 重复`);
    result[id] = line.slice(separator + 1).trim();
  }
  return result;
}

function setupAttributionToggle() {
  if (attributionAbort) attributionAbort.abort();
  attributionAbort = new AbortController();
  const signal = attributionAbort.signal;

  const namedRadio = document.querySelector('input[name="q-attribution-type"][value="named"]');
  const anonRadio = document.querySelector('input[name="q-attribution-type"][value="anonymous"]');
  const attributionInput = document.getElementById("q-submit-attribution");

  if (!namedRadio || !anonRadio || !attributionInput) return;

  function syncAttributionState() {
    if (anonRadio.checked) {
      attributionInput.disabled = true;
      attributionInput.value = "";
      attributionInput.placeholder = "将显示为「匿名同学」";
    } else {
      attributionInput.disabled = false;
      attributionInput.placeholder = "你希望在题目署名中显示的名称";
    }
  }

  namedRadio.addEventListener("change", syncAttributionState, { signal });
  anonRadio.addEventListener("change", syncAttributionState, { signal });
  syncAttributionState();
}

function initTurnstile() {
  const container = document.getElementById("turnstile-widget");
  if (!container) return;
  if (typeof turnstile === "undefined") {
    console.warn("Turnstile not loaded");
    return;
  }

  if (turnstileWidgetId !== null) {
    try {
      turnstile.remove(turnstileWidgetId);
    } catch {}
    turnstileWidgetId = null;
  }
  container.innerHTML = "";

  try {
    turnstileWidgetId = turnstile.render("#turnstile-widget", {
      sitekey: "0x4AAAAAADWCCejih_jntWim",
      callback: function (token) {
        turnstileToken = token;
      },
      "expired-callback": function () {
        turnstileToken = null;
      },
      "error-callback": function () {
        turnstileToken = null;
        const status = document.getElementById("q-submit-status");
        if (status) {
          status.textContent = "人机验证加载失败，请刷新页面重试";
          status.className = "error";
        }
      },
    });
  } catch (err) {
    console.warn("Turnstile render error", err);
  }
}

async function handleQuestionSubmit(event) {
  event.preventDefault();

  const btn = document.getElementById("q-submit-btn");
  const status = document.getElementById("q-submit-status");
  const typeSelect = document.getElementById("q-submit-type");
  const answerInput = document.getElementById("q-submit-answer");
  const anonRadio = document.querySelector('input[name="q-attribution-type"][value="anonymous"]');
  const attributionInput = document.getElementById("q-submit-attribution");
  const contactInput = document.getElementById("q-submit-contact");
  const contactPublic = document.getElementById("q-submit-contact-public");
  const licenseCheck = document.getElementById("q-submit-license");

  status.textContent = "";
  status.className = "";

  const stem = stemEditor ? stemEditor.value().trim() : (document.getElementById("q-submit-stem")?.value.trim() || "");
  const solution = solutionEditor ? solutionEditor.value().trim() : (document.getElementById("q-submit-solution")?.value.trim() || "");
  const type = typeSelect ? typeSelect.value : "";

  if (!stem || !solution || !type) {
    status.textContent = "请完整填写题型、题干与参考解析";
    status.className = "error";
    return;
  }

  if (!licenseCheck || !licenseCheck.checked) {
    status.textContent = "请确认您有权按 CC BY-SA 4.0 协议分享本题目";
    status.className = "error";
    return;
  }

  if (contactInput && contactInput.value.trim() && (!contactPublic || !contactPublic.checked)) {
    status.textContent = "若填写公开联系方式，请勾选同意公开展示";
    status.className = "error";
    return;
  }

  if (!turnstileToken) {
    status.textContent = "请完成人机验证";
    status.className = "error";
    return;
  }

  // Build answer and choices
  let answer;
  let choicesList;
  const answerText = answerInput ? answerInput.value.trim() : "";

  try {
    if (type === "single_choice" || type === "multiple_choice") {
      const rawChoices = document.getElementById("q-submit-choices")?.value.trim() || "";
      const choicesMap = parsePairs(rawChoices, "选项");
      const choiceIds = Object.keys(choicesMap);
      if (choiceIds.length < 2) throw new Error("选择题至少需要提供两个选项");
      choicesList = choiceIds.map(id => ({ id, content: choicesMap[id] }));

      if (type === "single_choice") {
        const choiceAns = answerText.toUpperCase();
        if (!choiceIds.includes(choiceAns)) throw new Error(`正确答案「${choiceAns}」必须是选项列表中的某一项`);
        answer = { choice: choiceAns };
      } else {
        const parts = answerText.split(/[,，\s]+/).map(s => s.trim().toUpperCase()).filter(Boolean);
        if (parts.length === 0) throw new Error("多选题必须指定至少一个正确答案");
        for (const p of parts) {
          if (!choiceIds.includes(p)) throw new Error(`正确答案「${p}」不是有效选项`);
        }
        answer = { choices: parts };
      }
    } else if (type === "true_false") {
      const lower = answerText.toLowerCase();
      if (lower !== "true" && lower !== "false") {
        throw new Error("判断题答案必须填写 true 或 false");
      }
      answer = { value: lower === "true" };
    } else if (type === "numeric") {
      const numVal = Number(answerText);
      if (!Number.isFinite(numVal)) throw new Error("数值计算题答案必须是有限数字");
      answer = {
        value: numVal,
        tolerance: { type: "absolute", value: 0.01 },
        unit: { required: false, accepted: [] },
      };
    }
  } catch (err) {
    status.textContent = err.message || "答案或选项格式错误";
    status.className = "error";
    return;
  }

  // Optional feedback
  let feedback;
  const correctFeedback = document.getElementById("q-submit-correct-feedback")?.value.trim();
  const incorrectFeedback = document.getElementById("q-submit-incorrect-feedback")?.value.trim();
  const choiceFeedbackRaw = document.getElementById("q-submit-choice-feedback")?.value.trim();

  let choiceFeedbackMap;
  if ((type === "single_choice" || type === "multiple_choice") && choiceFeedbackRaw) {
    try {
      choiceFeedbackMap = parsePairs(choiceFeedbackRaw, "逐项反馈");
    } catch (err) {
      status.textContent = err.message;
      status.className = "error";
      return;
    }
  }

  if (correctFeedback || incorrectFeedback || choiceFeedbackMap) {
    feedback = {};
    if (correctFeedback) feedback.correct = correctFeedback;
    if (incorrectFeedback) feedback.incorrect = incorrectFeedback;
    if (choiceFeedbackMap) feedback.choices = choiceFeedbackMap;
  }

  // Optional metadata
  const selectedTopic = document.getElementById("q-submit-topic")?.value.trim() || undefined;
  const rawConcepts = document.getElementById("q-submit-concepts")?.value.trim() || "";
  const conceptsList = rawConcepts ? rawConcepts.split(/[,，\s]+/).map(s => s.trim()).filter(Boolean) : undefined;

  const rawDiff = document.getElementById("q-submit-diff")?.value;
  const difficulty = rawDiff ? Number(rawDiff) : undefined;

  const rawCog = document.getElementById("q-submit-cognitive")?.value;
  const cognitiveLevel = rawCog || undefined;

  const rawStyle = document.getElementById("q-submit-style")?.value;
  const style = rawStyle || undefined;

  const rawSeconds = document.getElementById("q-submit-seconds")?.value;
  const estimatedSeconds = rawSeconds ? Number(rawSeconds) : undefined;

  const attribution = anonRadio && anonRadio.checked
    ? "匿名"
    : (attributionInput?.value.trim() || "匿名");

  const isAiAssisted = Boolean(document.getElementById("q-submit-ai")?.checked);

  // External media
  let externalMedia;
  const imgUrl = document.getElementById("q-submit-img-url")?.value.trim();
  if (imgUrl) {
    const imgAlt = document.getElementById("q-submit-img-alt")?.value.trim() || "题目插图";
    const imgRights = document.getElementById("q-submit-img-rights")?.value.trim() || "自主绘制 / 原创";
    externalMedia = [{ url: imgUrl, alt: imgAlt, rights_note: imgRights }];
  }

  const questionPayload = {
    type,
    stem,
    choices: choicesList,
    answer,
    feedback,
    solution,
    topics: selectedTopic ? [selectedTopic] : undefined,
    concepts: conceptsList,
    difficulty,
    cognitive_level: cognitiveLevel,
    style,
    estimated_seconds: estimatedSeconds,
    attribution,
    ai_assisted: isAiAssisted,
    external_media: externalMedia,
  };

  const stemPreview = stem.replace(/[#*`$\n]/g, " ").trim().slice(0, 40) || "物理小测题目";

  btn.disabled = true;
  btn.textContent = "正在提交题目...";

  try {
    const resp = await fetch(SUBMIT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `[题目] ${stemPreview}`,
        content: stem,
        type: "question",
        typeLabel: "题目投稿",
        attribution,
        contact: contactInput ? contactInput.value.trim() : "",
        contactPublicConsent: Boolean(contactPublic?.checked),
        question: questionPayload,
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

    document.getElementById("plw-question-contribute-form").style.display = "none";
    const successBox = document.getElementById("q-submit-success");
    if (successBox) successBox.style.display = "block";
    const link = document.getElementById("q-submit-issue-link");
    if (link) {
      link.href = data.issueUrl;
      link.textContent = data.issueUrl;
    }
  } catch (err) {
    status.textContent = err.message || "提交失败，请稍后重试。也可直接发送邮件至 submit@folderrewind.top";
    status.className = "error";
    btn.disabled = false;
    btn.textContent = "提交题目投稿";
    if (typeof turnstile !== "undefined") {
      if (turnstileWidgetId !== null) {
        try {
          turnstile.reset(turnstileWidgetId);
        } catch {
          turnstile.reset();
        }
      } else {
        turnstile.reset();
      }
    }
    turnstileToken = null;
  }
}

if (typeof window !== "undefined") {
  const generalSubmitTurnstileCallback = window.onloadTurnstileCallback;
  window.onloadTurnstileCallback = function () {
    if (document.getElementById("plw-question-contribute-form")) {
      initTurnstile();
    } else if (typeof generalSubmitTurnstileCallback === "function") {
      generalSubmitTurnstileCallback();
    }
  };

  if (window.document$) {
    window.document$.subscribe(async function () {
      const form = document.getElementById("plw-question-contribute-form");
      if (!form) return;

      await initEditors();
      void loadTaxonomyTopics();
      setupAttributionToggle();
      updateQuestionTypeUi();

      if (typeof turnstile !== "undefined") {
        initTurnstile();
      }

      const typeSelect = document.getElementById("q-submit-type");
      if (typeSelect) {
        typeSelect.removeEventListener("change", updateQuestionTypeUi);
        typeSelect.addEventListener("change", updateQuestionTypeUi);
      }

      form.removeEventListener("submit", handleQuestionSubmit);
      form.addEventListener("submit", handleQuestionSubmit);
    });
  }
}
})();
