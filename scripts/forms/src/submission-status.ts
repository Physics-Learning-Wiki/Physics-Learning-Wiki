import { createVerification, type VerificationHandle } from "./verification.js";
import {
  parseReceipt,
  readReceipt,
  receiptCard,
  siteRoot,
  storeReceipt,
  SUBMISSION_ENDPOINT,
  type Receipt
} from "./submission-client.js";
import type { FeatureMountContext } from "./types.js";

const STAGES: Record<string, string> = {
  processing: "正在确认提交结果",
  received: "已收到",
  needs_info: "需要补充或维护者处理",
  accepted: "已接受整理",
  importing: "正在整理草稿 PR",
  draft_ready: "草稿已入库",
  reviewing: "正在专业审核",
  published: "已正式发布",
  rejected: "暂未收录",
  withdrawn: "已撤回",
  resolved: "已处理"
};
interface Status {
  submissionId: string;
  type: string;
  stage: string;
  revision: number;
  issueUrl?: string;
  pr?: string;
  withdrawalRequested?: boolean;
  published?: { url: string; revision: number };
  operationState?: string;
  mediaReview?: Array<{ decision: string }>;
  record?: { payload?: { question?: { external_media?: unknown[] } } };
}

export async function mount(root: ParentNode, { signal }: FeatureMountContext) {
  const container = root.querySelector<HTMLElement>("#plw-submission-status");
  if (!container) return () => {};
  const document = container.ownerDocument;
  const lookup = container.querySelector<HTMLFormElement>("#submission-lookup-form")!;
  const idInput = container.querySelector<HTMLInputElement>("#submission-lookup-id")!;
  const fileInput = container.querySelector<HTMLInputElement>("#submission-receipt-file")!;
  const message = container.querySelector<HTMLElement>("#submission-query-message")!;
  const result = container.querySelector<HTMLElement>("#submission-query-result")!;
  const actions = container.querySelector<HTMLElement>("#submission-author-actions")!;
  const withdrawal = container.querySelector<HTMLFormElement>("#submission-withdraw-form")!;
  let receipt: Receipt | undefined, current: Status | undefined, widget: VerificationHandle | undefined;
  let withdrawalKey: string | undefined,
    withdrawalSnapshot = "",
    busy = false,
    generation = 0;
  const safeLink = (label: string, value: string) => {
    const url = new URL(value);
    const allowed =
      url.protocol === "https:" &&
      (url.hostname === "github.com" ||
        url.origin === new URL(document.baseURI).origin ||
        url.hostname === "physics-learning-wiki.github.io");
    if (!allowed) return;
    const link = document.createElement("a");
    link.textContent = label;
    link.href = url.href;
    result.append(link, document.createElement("br"));
  };
  const query = async () => {
    const queryGeneration = ++generation;
    const id = idInput.value.trim();
    if (!/^[a-f0-9-]{36}$/.test(id)) {
      message.textContent = "请填写回执中的有效投稿编号．";
      return;
    }
    const own = receipt?.submissionId === id ? receipt : readReceipt(document, id);
    actions.hidden = true;
    result.replaceChildren();
    try {
      const response = await fetch(SUBMISSION_ENDPOINT + "/" + id, {
        signal,
        headers: own ? { Authorization: "Bearer " + own.token } : {}
      });
      const data = (await response.json()) as Status & { message?: string };
      if (signal.aborted || queryGeneration !== generation) return;
      if (!response.ok) throw new Error(data.message || "查询失败，请保留回执后重试．");
      current = data;
      receipt = own;
      message.textContent = (STAGES[data.stage] || "等待处理") + "；最新稿件版本：" + data.revision;
      if (data.withdrawalRequested) message.textContent += "；已有撤稿申请，等待审核或下线确认．";
      if (data.operationState && data.operationState !== "completed") message.textContent += "；上一操作仍在确认中．";
      if (data.issueUrl) safeLink("查看公开 Issue 与处理记录", data.issueUrl);
      if (data.pr) safeLink("查看稿件 PR", data.pr);
      if (data.published?.url)
        safeLink("访问当前线上版本（第 " + data.published.revision + " 版）", data.published.url);
      const media = data.mediaReview;
      if (media?.length) {
        const note = document.createElement("p");
        note.textContent =
          "插图审核：" +
          media.filter(x => x.decision === "imported").length +
          " 项已入库，" +
          media.filter(x => x.decision === "omitted").length +
          " 项不采用，" +
          media.filter(x => x.decision === "pending").length +
          " 项待处理．";
        result.append(note);
      } else if (data.record?.payload?.question?.external_media?.length) {
        const note = document.createElement("p");
        note.textContent = "插图仍为审核材料，正式发布前由维护者核对入库结果．";
        result.append(note);
      }
      if (own && data.revision > 0 && !["withdrawn", "processing"].includes(data.stage)) {
        own.revision = data.revision;
        storeReceipt(document, own);
        receiptCard(document, own, result);
        if (data.operationState && data.operationState !== "completed") return;
        actions.hidden = false;
        withdrawal.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled = Boolean(
          data.withdrawalRequested
        );
        const edit = container.querySelector<HTMLAnchorElement>("#submission-edit-link")!;
        const editUrl = new URL(data.type === "question" ? "quiz/contribute/" : "submit/", siteRoot(document));
        editUrl.searchParams.set("submission", id);
        edit.href = editUrl.href;
        widget?.dispose();
        const target = container.querySelector<HTMLElement>("#turnstile-widget")!;
        widget = createVerification(
          target,
          signal,
          text => {
            message.textContent = text;
          },
          undefined,
          data.type === "question" ? "submit-question" : "submit-general"
        );
        await widget.ready;
      }
    } catch (error) {
      if (!signal.aborted && queryGeneration === generation)
        message.textContent = error instanceof Error ? error.message : "查询暂不可用．";
    }
  };
  lookup.addEventListener(
    "submit",
    event => {
      event.preventDefault();
      void query();
    },
    { signal }
  );
  fileInput.addEventListener(
    "change",
    () => {
      void (async () => {
        try {
          const file = fileInput.files?.[0];
          if (!file || file.size > 16384) throw new Error("回执文件过大或未选择文件．");
          const parsed = parseReceipt(JSON.parse(await file.text()));
          if (!parsed) throw new Error("回执格式无效．");
          receipt = parsed;
          storeReceipt(document, parsed);
          idInput.value = parsed.submissionId;
          await query();
        } catch (error) {
          message.textContent = error instanceof Error ? error.message : "无法读取回执．";
        }
      })();
    },
    { signal }
  );
  withdrawal.addEventListener(
    "submit",
    event => {
      event.preventDefault();
      void (async () => {
        if (busy || !receipt || !current || !widget?.token) return;
        const reason = container.querySelector<HTMLTextAreaElement>("#submission-withdraw-reason")!.value.trim();
        if (withdrawalKey && withdrawalSnapshot !== reason) {
          message.textContent = "上一撤稿申请仍在确认中，请先查询结果再修改说明．";
          return;
        }
        busy = true;
        withdrawalKey ||= crypto.randomUUID();
        withdrawalSnapshot = reason;
        try {
          const response = await fetch(SUBMISSION_ENDPOINT + "/" + receipt.submissionId + "/withdrawal-requests", {
            method: "POST",
            signal,
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + receipt.token,
              "Idempotency-Key": withdrawalKey
            },
            body: JSON.stringify({ reason, baseRevision: receipt.revision, turnstileToken: widget.token })
          });
          const data = (await response.json()) as { message?: string };
          if (!response.ok) {
            if (response.status < 500) withdrawalKey = undefined;
            throw new Error(data.message || "撤稿申请失败．");
          }
          if (response.status !== 202) {
            withdrawalKey = undefined;
            await query();
          }
          message.textContent =
            response.status === 202
              ? "正在确认撤稿申请，请保留回执后查询．"
              : "撤稿申请已收到，等待维护者审核与下线确认．";
        } catch (error) {
          if (!signal.aborted) message.textContent = error instanceof Error ? error.message : "请保留回执后重试．";
        } finally {
          busy = false;
          widget?.reset();
        }
      })();
    },
    { signal }
  );
  const id = new URL(document.baseURI).searchParams.get("id");
  if (id) {
    idInput.value = id;
    await query();
  }
  return () => {
    generation++;
    widget?.dispose();
  };
}
