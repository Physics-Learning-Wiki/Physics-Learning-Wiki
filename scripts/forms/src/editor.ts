import EasyMDE from "easymde";
import { loadPreviewMathJax } from "./math-preview.js";

export interface EditorHandle {
  instance: EasyMDE;
  dispose(): void;
}

interface MarkdownPreviewContext {
  parent: { markdown(markdown: string): string };
}

export function createEditor(
  textarea: HTMLTextAreaElement,
  options: Omit<EasyMDE.Options, "element" | "previewRender">,
  signal: AbortSignal
): EditorHandle | undefined {
  if (signal.aborted) return undefined;

  let previewTimer: ReturnType<typeof setTimeout> | undefined;
  const previewRender: NonNullable<EasyMDE.Options["previewRender"]> = function (
    this: MarkdownPreviewContext,
    markdown,
    previewElement
  ) {
    const html = this.parent.markdown(markdown);
    previewElement.innerHTML = html;
    if (previewTimer) clearTimeout(previewTimer);
    previewTimer = setTimeout(() => {
      void loadPreviewMathJax(signal)
        .then(async mathJax => {
          if (signal.aborted || !previewElement.isConnected) return;
          mathJax.typesetClear?.([previewElement]);
          await mathJax.typesetPromise?.([previewElement]);
        })
        .catch(error => {
          if (!signal.aborted) console.warn("Math preview could not be rendered", error);
        });
    }, 250);
    return previewElement.innerHTML;
  };

  const instance = new EasyMDE({
    ...options,
    element: textarea,
    previewRender,
    autoDownloadFontAwesome: false
  });
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    signal.removeEventListener("abort", dispose);
    if (previewTimer) clearTimeout(previewTimer);
    try {
      instance.toTextArea();
    } catch {
      // Ignore teardown errors if instant navigation detached the editor first.
    }
  };
  signal.addEventListener("abort", dispose, { once: true });
  return { instance, dispose };
}

function toolbarButton(
  name: string,
  title: string,
  icon: string,
  action: (editor: EasyMDE) => void
): EasyMDE.ToolbarIcon {
  return { name, title, icon, action, className: "plw-editor-toolbar__icon" };
}

function insertMath(editor: EasyMDE, block: boolean): void {
  const codeMirror = editor.codemirror;
  const selection = codeMirror.getSelection();
  const delimiters = block ? ["$$", "$$"] : ["$", "$"];
  codeMirror.replaceSelection(`${delimiters[0]}${selection}${delimiters[1]}`);
  if (!selection) {
    const position = codeMirror.getCursor();
    codeMirror.setCursor({ line: position.line, ch: position.ch - 1 });
  }
}

export function createEditorToolbar(includeImages: boolean): NonNullable<EasyMDE.Options["toolbar"]> {
  const toolbar: Array<EasyMDE.ToolbarIcon | "|"> = [
    toolbarButton("bold", "加粗", "B", editor => EasyMDE.toggleBold(editor)),
    toolbarButton("italic", "斜体", "I", editor => EasyMDE.toggleItalic(editor)),
    toolbarButton("heading", "标题", "H", editor => EasyMDE.toggleHeadingSmaller(editor)),
    "|",
    toolbarButton("quote", "引用", "❝", editor => EasyMDE.toggleBlockquote(editor)),
    toolbarButton("unordered-list", "无序列表", "•", editor => EasyMDE.toggleUnorderedList(editor)),
    toolbarButton("ordered-list", "有序列表", "1.", editor => EasyMDE.toggleOrderedList(editor)),
    "|",
    toolbarButton("link", "链接", "↗", editor => EasyMDE.drawLink(editor))
  ];

  if (includeImages) toolbar.push(toolbarButton("image", "图片", "▧", editor => EasyMDE.drawImage(editor)));
  toolbar.push(
    "|",
    toolbarButton("inline-math", "插入行内公式", "𝑥", editor => insertMath(editor, false)),
    toolbarButton("block-math", "插入块级公式", "∑", editor => insertMath(editor, true)),
    "|",
    toolbarButton("preview", "预览", "◉", editor => EasyMDE.togglePreview(editor)),
    toolbarButton("side-by-side", "并排预览", "◫", editor => EasyMDE.toggleSideBySide(editor)),
    toolbarButton("fullscreen", "全屏", "⛶", editor => EasyMDE.toggleFullScreen(editor))
  );
  return toolbar;
}
