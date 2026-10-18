import { fieldErrors, LICENSE_VERSION, type SubmissionEnvelope } from "../../../contracts/envelope.js";
import { downloadJson } from "./downloads.js";

export const SUBMISSION_ENDPOINT = "https://submit.folderrewind.top/v1/submissions";
export interface Receipt {
  schemaVersion: 1;
  submissionId: string;
  token: string;
  operationKey: string;
  revision: number;
  type: string;
}
interface Attempt {
  receipt: Receipt;
  snapshot: string;
  pending: boolean;
}
export interface SubmissionResult {
  issueUrl?: string;
  revision?: number;
  operationState?: string;
}

export function siteRoot(document: Document): URL {
  try {
    const config = JSON.parse(document.getElementById("__config")?.textContent || "{}");
    if (typeof config.base === "string") return new URL(config.base, document.baseURI);
  } catch {
    /* Use the standalone document's root. */
  }
  return new URL("/", document.baseURI);
}
function receiptKey(document: Document, id: string): string {
  return "plw:submission-receipt:v1:" + siteRoot(document).pathname + ":" + id;
}
export function parseReceipt(value: unknown): Receipt | undefined {
  if (!value || typeof value !== "object") return;
  const data = value as Receipt;
  if (
    data.schemaVersion !== 1 ||
    !/^[a-f0-9-]{36}$/.test(data.submissionId) ||
    !/^[a-f0-9]{64}$/.test(data.token) ||
    !/^[a-f0-9-]{36}$/.test(data.operationKey) ||
    !Number.isSafeInteger(data.revision) ||
    data.revision < 0 ||
    !["full-page", "notes", "errata", "question", "suggestion"].includes(data.type)
  )
    return;
  return {
    schemaVersion: 1,
    submissionId: data.submissionId,
    token: data.token,
    operationKey: data.operationKey,
    revision: data.revision,
    type: data.type
  };
}
export function readReceipt(document: Document, id: string): Receipt | undefined {
  for (const name of ["sessionStorage", "localStorage"] as const) {
    try {
      const value = document.defaultView![name].getItem(receiptKey(document, id));
      const receipt = value && parseReceipt(JSON.parse(value));
      if (receipt) return receipt;
    } catch {
      /* Storage is optional; the receipt file is independent. */
    }
  }
}
export function storeReceipt(document: Document, receipt: Receipt, persistent = false): void {
  try {
    document.defaultView![persistent ? "localStorage" : "sessionStorage"].setItem(
      receiptKey(document, receipt.submissionId),
      JSON.stringify(receipt)
    );
  } catch {
    /* The on-page card and download remain usable. */
  }
}
export function sourceDeclaration(form: HTMLFormElement): SubmissionEnvelope["sourceDeclaration"] {
  const value = (id: string) => form.querySelector<HTMLInputElement | HTMLSelectElement>("#" + id)?.value.trim() || "";
  const kind = value("submission-source-kind");
  return {
    kind,
    note: value("submission-source-note"),
    ...(kind === "adapted"
      ? { source: value("submission-source-url"), permission: value("submission-source-permission") }
      : {})
  };
}
export function mountSourceDeclaration(form: HTMLFormElement, signal: AbortSignal): void {
  const kind = form.querySelector<HTMLSelectElement>("#submission-source-kind");
  const update = () => {
    const adapted = kind?.value === "adapted";
    form.querySelectorAll<HTMLElement>("[data-adapted-source]").forEach(node => {
      node.hidden = !adapted;
      node.querySelectorAll<HTMLInputElement>("input").forEach(input => {
        input.required = adapted;
      });
    });
  };
  kind?.addEventListener("change", update, { signal });
  update();
}
export function showFieldErrors(form: HTMLFormElement, errors: Record<string, string>): void {
  form.querySelectorAll("[aria-invalid]").forEach(node => node.removeAttribute("aria-invalid"));
  form.querySelectorAll<HTMLElement>("[data-submission-error]").forEach(node => node.remove());
  for (const [path, message] of Object.entries(errors)) {
    const candidates = Array.from(form.querySelectorAll<HTMLElement>("[data-submission-field]"))
      .filter(node => path.startsWith(node.dataset.submissionField!))
      .sort((a, b) => b.dataset.submissionField!.length - a.dataset.submissionField!.length);
    const target = candidates[0];
    if (!target) continue;
    target.setAttribute("aria-invalid", "true");
    const notice = form.ownerDocument.createElement("p");
    notice.dataset.submissionError = "true";
    notice.className = "error";
    notice.textContent = message;
    target.after(notice);
  }
}
export function receiptCard(document: Document, receipt: Receipt, parent: HTMLElement): HTMLElement {
  parent.querySelector("[data-submission-receipt]")?.remove();
  const card = document.createElement("section");
  card.dataset.submissionReceipt = "true";
  const description = document.createElement("p");
  description.textContent = "请保存管理回执，用于查询进度、修订和申请撤稿．管理凭证不会进入公开链接．";
  const link = document.createElement("a");
  const url = new URL("submission/status/", siteRoot(document));
  url.searchParams.set("id", receipt.submissionId);
  link.href = url.href;
  link.textContent = "查询投稿进度与管理稿件";
  const download = document.createElement("button");
  download.type = "button";
  download.textContent = "下载管理回执";
  download.addEventListener("click", () =>
    downloadJson(document, "plw-receipt-" + receipt.submissionId + ".json", receipt)
  );
  const label = document.createElement("label");
  const remember = document.createElement("input");
  remember.type = "checkbox";
  remember.addEventListener("change", () => {
    if (remember.checked) storeReceipt(document, receipt, true);
    else
      try {
        document.defaultView!.localStorage.removeItem(receiptKey(document, receipt.submissionId));
      } catch {
        /* Optional. */
      }
  });
  label.append(remember, " 在本机长期保存管理凭证（共用设备请勿选择）");
  card.append(description, link, document.createTextNode(" "), download, label);
  parent.append(card);
  return card;
}

export function createSubmissionClient(form: HTMLFormElement, signal: AbortSignal) {
  const document = form.ownerDocument;
  const key = "plw:pending-submission:v1:" + siteRoot(document).pathname + ":" + form.id;
  let attempt: Attempt | undefined;
  let revisionReceipt: Receipt | undefined;
  try {
    const stored = JSON.parse(document.defaultView!.sessionStorage.getItem(key) || "null");
    const receipt = parseReceipt(stored?.receipt);
    if (receipt && stored.pending && typeof stored.snapshot === "string")
      attempt = { receipt, snapshot: stored.snapshot, pending: true };
  } catch {
    /* A blocked or invalid cache never disables editing. */
  }
  if (attempt) receiptCard(document, attempt.receipt, form.parentElement!);
  const save = () => {
    if (!attempt) return;
    storeReceipt(document, attempt.receipt);
    try {
      document.defaultView!.sessionStorage.setItem(key, JSON.stringify(attempt));
    } catch {
      /* Download is available. */
    }
  };
  return {
    setRevision(receipt: Receipt) {
      revisionReceipt = receipt;
      attempt = undefined;
      try {
        document.defaultView!.sessionStorage.removeItem(key);
      } catch {
        /* Optional. */
      }
    },
    async submit(
      input: Omit<SubmissionEnvelope, "schemaVersion" | "submissionId" | "licenseVersion">
    ): Promise<SubmissionResult> {
      const { turnstileToken, ...snapshotData } = input;
      const snapshot = JSON.stringify(snapshotData);
      if (attempt?.pending && attempt.snapshot !== snapshot) {
        throw new Error("上一份提交仍在确认中，请先通过管理回执查询结果；当前新编辑仍保存在草稿中．");
      }
      if (!attempt?.pending) {
        const bytes = crypto.getRandomValues(new Uint8Array(32));
        const receipt: Receipt = revisionReceipt
          ? { ...revisionReceipt, operationKey: crypto.randomUUID() }
          : {
              schemaVersion: 1,
              submissionId: crypto.randomUUID(),
              operationKey: crypto.randomUUID(),
              revision: 0,
              type: input.type,
              token: [...bytes].map(v => v.toString(16).padStart(2, "0")).join("")
            };
        attempt = { receipt, snapshot, pending: true };
      }
      const envelope: SubmissionEnvelope = {
        ...input,
        schemaVersion: 1,
        submissionId: attempt.receipt.submissionId,
        licenseVersion: LICENSE_VERSION,
        ...(revisionReceipt ? { baseRevision: revisionReceipt.revision } : {})
      };
      const errors = fieldErrors(JSON.parse(JSON.stringify(envelope)));
      showFieldErrors(form, errors);
      if (Object.keys(errors).length) {
        attempt.pending = false;
        throw new Error(Object.values(errors).join("；"));
      }
      save();
      receiptCard(document, attempt.receipt, form.parentElement!);
      const url = SUBMISSION_ENDPOINT + (revisionReceipt ? "/" + revisionReceipt.submissionId + "/revisions" : "");
      const result = await fetch(url, {
        method: "POST",
        signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + attempt.receipt.token,
          "Idempotency-Key": attempt.receipt.operationKey
        },
        body: JSON.stringify(envelope)
      });
      const data = (await result.json()) as SubmissionResult & {
        message?: string;
        error?: string;
        fieldErrors?: Record<string, string>;
      };
      if (!result.ok) {
        showFieldErrors(form, data.fieldErrors || {});
        // A definite rejection permits editing. Unknown writes always return 202.
        if (result.status < 500) attempt.pending = false;
        save();
        throw new Error(data.message || data.error || "投稿服务暂时不可用，请保留草稿与回执．");
      }
      if (result.status !== 202) {
        attempt.pending = false;
        attempt.receipt.revision = data.revision || attempt.receipt.revision;
        if (revisionReceipt) revisionReceipt = { ...attempt.receipt };
        save();
        receiptCard(document, attempt.receipt, form.parentElement!);
      }
      return data;
    }
  };
}
