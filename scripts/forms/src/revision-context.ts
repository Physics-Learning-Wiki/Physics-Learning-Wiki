import type { EditorHandle } from "./editor.js";
import { readReceipt, SUBMISSION_ENDPOINT, type createSubmissionClient } from "./submission-client.js";
import type { SubmissionEnvelope } from "../../../contracts/envelope.js";

export async function loadRevisionContext(
  form: HTMLFormElement,
  client: ReturnType<typeof createSubmissionClient>,
  editors: Record<string, EditorHandle>,
  signal: AbortSignal
): Promise<void> {
  const document = form.ownerDocument,
    id = new URL(document.baseURI).searchParams.get("submission");
  if (!id) return;
  const status = form.querySelector<HTMLElement>('[role="alert"]')!;
  const receipt = readReceipt(document, id);
  if (!receipt) {
    status.textContent = "请先在投稿进度页导入管理回执，再进入编辑．";
    return;
  }
  try {
    const response = await fetch(SUBMISSION_ENDPOINT + "/" + id, {
      signal,
      headers: { Authorization: "Bearer " + receipt.token }
    });
    const data = (await response.json()) as { revision: number; record: SubmissionEnvelope; message?: string };
    if (!response.ok || !data.record) throw new Error(data.message || "无法载入最新稿件．");
    if (signal.aborted) return;
    receipt.revision = data.revision;
    client.setRevision(receipt, data.record);
    const set = (id: string, value: unknown) => {
      const node = form.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("#" + id);
      if (!node || value === undefined) return;
      if (editors[id]) editors[id].instance.value(String(value));
      else if (node instanceof HTMLInputElement && node.type === "checkbox") node.checked = Boolean(value);
      else node.value = String(value);
      node.dispatchEvent(new Event("change", { bubbles: true }));
    };
    const payload = data.record.payload;
    if (data.record.type === "question") {
      const q = payload.question!;
      set("q-submit-type", q.type);
      set("q-submit-stem", q.stem);
      set("q-submit-solution", q.solution);
      const answer = q.answer as
        | {
            choice?: string;
            choices?: string[];
            value?: number | boolean;
            tolerance?: { type: string; value: number };
            unit?: { required: boolean; canonical?: string; accepted: string[] };
          }
        | undefined;
      set("q-submit-answer", answer?.choice ?? answer?.choices?.join(", ") ?? answer?.value ?? "");
      set(
        "q-submit-choices",
        (q.choices as Array<{ id: string; content: string }> | undefined)
          ?.map(c => c.id + "|" + c.content)
          .join("\n") || ""
      );
      const grading = q.grading as { rubric: Array<{ id: string; label: string; points: number }> } | undefined;
      set("q-submit-rubric", grading?.rubric.map(r => r.id + "|" + r.label + "|" + r.points).join("\n"));
      const feedback = q.feedback as
        | { correct?: string; incorrect?: string; choices?: Record<string, string> }
        | undefined;
      set("q-submit-correct-feedback", feedback?.correct || "");
      set("q-submit-incorrect-feedback", feedback?.incorrect || "");
      set(
        "q-submit-choice-feedback",
        Object.entries(feedback?.choices || {})
          .map(([key, value]) => key + "|" + value)
          .join("\n")
      );
      set("q-submit-tolerance-type", answer?.tolerance?.type || "absolute");
      set(
        "q-submit-tolerance",
        answer?.tolerance ? answer.tolerance.value * (answer.tolerance.type === "relative" ? 100 : 1) : ""
      );
      set("q-submit-unit-required", answer?.unit?.required || false);
      set("q-submit-unit-canonical", answer?.unit?.canonical || "");
      set("q-submit-unit-accepted", answer?.unit?.accepted.join(", ") || "");
      set("q-submit-topic", (q.topics as string[] | undefined)?.[0] || "");
      set("q-submit-concepts", (q.concepts as string[] | undefined)?.join(", ") || "");
      for (const [field, key] of [
        ["q-submit-diff", "difficulty"],
        ["q-submit-cognitive", "cognitive_level"],
        ["q-submit-style", "style"],
        ["q-submit-seconds", "estimated_seconds"],
        ["q-submit-ai", "ai_assisted"]
      ])
        set(field, q[key]);
      const image = (q.external_media as Array<{ url: string; alt: string; rights_note: string }> | undefined)?.[0];
      set("q-submit-img-url", image?.url || "");
      set("q-submit-img-alt", image?.alt || "");
      set("q-submit-img-rights", image?.rights_note || "");
      set("q-submit-attribution", payload.attribution || q.attribution || "");
    } else {
      set("submit-type", data.record.type);
      set("submit-title", payload.title);
      set("submit-content", payload.content);
      const chapter = payload.chapter || "";
      set("submit-chapter-major", chapter.split(" > ")[0]);
      set("submit-chapter-minor", chapter);
      set("submit-chapter", chapter);
      set("submit-attribution", payload.attribution || "");
    }
    const source = data.record.sourceDeclaration;
    const attribution = payload.attribution || (payload.question?.attribution as string | undefined) || "匿名";
    const named = attribution !== "匿名";
    const radio = form.querySelector<HTMLInputElement>(
      'input[type="radio"][value="' + (named ? "named" : "anonymous") + '"]'
    );
    if (radio) {
      radio.checked = true;
      radio.dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (named) set(data.record.type === "question" ? "q-submit-attribution" : "submit-attribution", attribution);
    set("submission-source-kind", source.kind);
    set("submission-source-note", source.note);
    set("submission-source-url", source.source || "");
    set("submission-source-permission", source.permission || "");
    form.querySelectorAll<HTMLInputElement>('input[id$="-license"]').forEach(input => {
      input.checked = false;
    });
    status.textContent = "正在修订第 " + data.revision + " 版．请重新确认来源与许可后提交，原稿历史会保留．";
  } catch (error) {
    if (!signal.aborted) status.textContent = error instanceof Error ? error.message : "无法载入稿件．";
  }
}
