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

  select.innerHTML = '<option value="">-- 可选，帮助编辑组分类 --</option>';
  addOptions(NAV_TREE, "");
}

let easyMDE;

function initEditor() {
  easyMDE = new EasyMDE({
    element: document.getElementById("submit-content"),
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
    previewRender: function (plainText, previewElement) {
      const html = this.parent.markdown(plainText);
      previewElement.innerHTML = html;
      setTimeout(() => {
        if (window.MathJax && window.MathJax.typesetPromise) {
          window.MathJax.typesetPromise([previewElement]).catch(console.error);
        }
      }, 100);
      return previewElement.innerHTML;
    },
  });
}

const TYPE_HINTS = {
  "full-page": "请包含：问题引入 → 核心概念 → 公式推导 → 例题 → 易错点",
  "notes": "半成品也没关系！把你的课堂笔记、复习提纲、思维导图粘贴进来即可",
  "errata": "请指出：具体章节 → 哪段文字/公式 → 错误描述 → 正确版本",
  "suggestion": "对网站结构、内容方向、功能改进的任何想法都欢迎",
};

function updateTypeHint() {
  const typeSelect = document.getElementById("submit-type");
  const hint = document.getElementById("submit-hint");
  if (typeSelect && hint) {
    hint.textContent = TYPE_HINTS[typeSelect.value] || "";
  }
}

function setupAttributionToggle() {
  const namedRadio = document.querySelector('input[name="attribution-type"][value="named"]');
  const anonRadio = document.querySelector('input[name="attribution-type"][value="anonymous"]');
  const attributionInput = document.getElementById("submit-attribution");

  if (!namedRadio || !anonRadio || !attributionInput) return;

  namedRadio.addEventListener("change", () => {
    attributionInput.disabled = false;
    attributionInput.placeholder = "你希望在页面上显示的署名";
  });
  anonRadio.addEventListener("change", () => {
    attributionInput.disabled = true;
    attributionInput.value = "";
    attributionInput.placeholder = "将显示为「匿名同学」";
  });
}

document.addEventListener("DOMContentLoaded", populateChapterSelect);
document.addEventListener("DOMContentLoaded", initEditor);
document.addEventListener("DOMContentLoaded", () => {
  const typeSelect = document.getElementById("submit-type");
  if (typeSelect) {
    typeSelect.addEventListener("change", updateTypeHint);
    updateTypeHint();
  }
});
document.addEventListener("DOMContentLoaded", setupAttributionToggle);
