import {
  fieldErrors,
  publicBody,
  publicRecord,
  type NewSetQuestion,
  type SubmissionEnvelope
} from "../../../contracts/envelope.js";
import { validateQuestion } from "../../../contracts/validation.js";
import { createSubmissionClient, readReceipt, siteRoot, SUBMISSION_ENDPOINT } from "./submission-client.js";
import { createVerification } from "./verification.js";
import { mountQuestionEditor } from "./question-contribute.js";
import { downloadJson } from "./downloads.js";
import { parseQuizSetDraft, type QuizSetDraft } from "./quiz-set-draft.js";
import { renderDraftMarkdown, trialSet } from "./quiz-set-preview.js";
import { loadPreviewMathJax } from "./math-preview.js";
import { hydrateAssets } from "../../quiz/src/question-renderer.js";
import { loadManifest, loadQuestionCatalog } from "../../quiz/src/data.js";
import type { Question } from "../../quiz/src/types.js";
import type { FeatureMountContext } from "./types.js";

const empty = (): QuizSetDraft => ({
  schemaVersion: 1,
  kind: "quiz-set",
  updatedAt: Date.now(),
  title: "",
  content: "",
  attribution: "",
  sourceDeclaration: { kind: "", note: "" },
  quizSet: {
    tags: [],
    feedbackMode: "deferred",
    selection: { type: "fixed", order: "fixed", items: [] },
    newQuestions: []
  }
});

export async function mount(root: ParentNode, { signal }: FeatureMountContext) {
  const container = root.querySelector<HTMLElement>("#plw-quiz-set-contribute");
  if (!container) return () => {};
  const form = container.querySelector<HTMLFormElement>("#plw-quiz-set-form")!;
  const editorHost = container.querySelector<HTMLElement>("#set-question-editor")!;
  const trial = container.querySelector<HTMLElement>("#set-trial")!;
  const message = container.querySelector<HTMLElement>("#set-message")!;
  const draftNotice = container.querySelector<HTMLElement>("#set-draft-notice")!;
  const client = createSubmissionClient(form, signal);
  const id = new URL(location.href).searchParams.get("submission") || undefined;
  const key = `plw:quiz-set-draft:v1:${siteRoot(document).pathname}:${id || "new"}`;
  let data = empty(),
    catalog = new Map<string, Question>(),
    pendingDraft: string | null = null;
  let editorScope: AbortController | undefined, editorDispose: (() => unknown) | undefined;
  let revisionLoaded = !id,
    saving = false,
    step = 1;
  const originalKeys = new Set<string>();
  let submittedContent: string | undefined;
  const contentSnapshot = () => JSON.stringify({ ...data, updatedAt: 0 });
  const manifestUrl = new URL("_generated/question-bank/manifest.json", siteRoot(document));
  const text = (selector: string) => form.querySelector<HTMLInputElement>(selector)!.value.trim();
  const tell = (value: string) => {
    message.textContent = value;
  };
  const readMetadata = () => {
    data.title = text("#set-title");
    data.content = text("#set-content");
    data.attribution = text("#set-attribution");
    data.quizSet.tags = [
      ...new Set(
        text("#set-tags")
          .split(/[,，\n]/)
          .map(v => v.trim())
          .filter(Boolean)
      )
    ];
    data.quizSet.feedbackMode = text("#set-feedback") as "immediate" | "deferred";
    data.quizSet.selection.order = text("#set-order") as "fixed" | "shuffle";
    data.sourceDeclaration = {
      kind: text("#set-source-kind"),
      note: text("#set-source-note"),
      ...(text("#set-source-kind") === "adapted"
        ? { source: text("#set-source-url"), permission: text("#set-source-permission") }
        : {})
    };
    if (data.editing) {
      data.editing.fields = Object.fromEntries(
        Array.from(editorHost.querySelectorAll<HTMLInputElement>("input[id], textarea[id], select[id]"))
          .filter(n => /^(q-submit-|submission-source-)/.test(n.id) && !/license|token/i.test(n.id))
          .map(n => [n.id, n.type === "checkbox" ? n.checked : n.value])
      );
    }
    data.updatedAt = Date.now();
  };
  const save = () => {
    readMetadata();
    if (pendingDraft || !revisionLoaded) return;
    if (contentSnapshot() === submittedContent) return;
    try {
      localStorage.setItem(key, JSON.stringify(data));
      draftNotice.textContent = "题集草稿已自动保存在本机．";
    } catch {
      draftNotice.textContent = "本机无法保存草稿，请使用 JSON 导出备份．";
    }
  };
  const stopEditor = () => {
    editorDispose?.();
    editorScope?.abort();
    editorHost.replaceChildren();
    editorHost.hidden = true;
  };
  const fill = () => {
    const values: Record<string, string> = {
      "set-title": data.title,
      "set-content": data.content,
      "set-attribution": data.attribution,
      "set-tags": data.quizSet.tags.join("，"),
      "set-feedback": data.quizSet.feedbackMode,
      "set-order": data.quizSet.selection.order,
      "set-source-kind": data.sourceDeclaration.kind,
      "set-source-note": data.sourceDeclaration.note,
      "set-source-url": data.sourceDeclaration.source || "",
      "set-source-permission": data.sourceDeclaration.permission || ""
    };
    for (const [id, value] of Object.entries(values)) form.querySelector<HTMLInputElement>("#" + id)!.value = value;
    form.querySelector<HTMLInputElement>("#set-license")!.checked = false;
    sourceUi();
    render();
  };
  const envelope = (): SubmissionEnvelope => ({
    schemaVersion: 1,
    submissionId: id || "00000000-0000-4000-8000-000000000000",
    type: "quiz-set",
    payload: { title: data.title, content: data.content, attribution: data.attribution, quizSet: data.quizSet },
    sourceDeclaration: data.sourceDeclaration,
    licenseConsent: true,
    licenseVersion: "CC-BY-SA-4.0",
    turnstileToken: "preview",
    ...(data.baseRevision ? { baseRevision: data.baseRevision } : {})
  });
  const validate = () => {
    readMetadata();
    if (data.editing) throw new Error("请先保存或取消当前新题编辑，再预览或投稿．");
    const errors = fieldErrors(envelope());
    if (Object.keys(errors).length)
      throw new Error(
        Object.entries(errors)
          .map(([p, e]) => `${p}：${e}`)
          .join("；")
      );
    for (const item of data.quizSet.selection.items)
      if (item.kind === "existing" && !catalog.has(item.questionId))
        throw new Error(`题目 ${item.questionId} 已不可用，请移除或替换．`);
  };
  const button = (label: string, action: () => void) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.addEventListener(
      "click",
      () => {
        try {
          action();
        } catch (e) {
          tell(String(e instanceof Error ? e.message : e));
        }
      },
      { signal }
    );
    return b;
  };
  const render = () => {
    const list = container.querySelector<HTMLOListElement>("#set-items")!;
    list.replaceChildren();
    data.quizSet.selection.items.forEach((item, index) => {
      const q =
        item.kind === "existing"
          ? catalog.get(item.questionId)
          : data.quizSet.newQuestions.find(q => q.clientId === item.clientId)?.question;
      const row = document.createElement("li");
      const label = document.createElement("span");
      label.textContent = `${index + 1}．${item.kind === "existing" ? "引用已有题目" : "本次新题"}：${
        q
          ? ("stemHtml" in q ? String(q.stemHtml).replace(/<[^>]*>/g, "") : String(q.stem)).slice(0, 100)
          : "题目已不可用"
      }`;
      row.append(label);
      const move = (target: number) => {
        if (!Number.isInteger(target)) throw new Error("请输入整数位置．");
        if (target < 0 || target >= data.quizSet.selection.items.length) return;
        data.quizSet.selection.items.splice(index, 1);
        data.quizSet.selection.items.splice(target, 0, item);
        render();
        save();
      };
      row.append(
        button("上移", () => move(index - 1)),
        button("下移", () => move(index + 1))
      );
      const position = document.createElement("input");
      position.type = "number";
      position.min = "1";
      position.max = String(data.quizSet.selection.items.length);
      position.value = String(index + 1);
      position.setAttribute("aria-label", `第 ${index + 1} 题移动位置`);
      row.append(
        position,
        button("移动", () => move(Number(position.value) - 1)),
        button("移出题集", () => {
          data.quizSet.selection.items.splice(index, 1);
          render();
          save();
        })
      );
      list.append(row);
    });
    const pool = container.querySelector<HTMLElement>("#set-new-pool")!;
    pool.replaceChildren();
    data.quizSet.newQuestions.forEach(entry => {
      const row = document.createElement("div"),
        label = document.createElement("span");
      label.textContent = `新题：${String(entry.question.stem).slice(0, 70)}；作者：${
        entry.question.attribution || "匿名"
      }`;
      row.append(
        label,
        button("编辑新题", () => {
          void editQuestion(entry.clientId);
        }),
        button("复制新题", () => {
          const clone = structuredClone(entry);
          clone.clientId = crypto.randomUUID();
          data.quizSet.newQuestions.push(clone);
          data.quizSet.selection.items.push({ kind: "new", clientId: clone.clientId });
          render();
          save();
        }),
        button("加入题集", () => {
          if (!data.quizSet.selection.items.some(i => i.kind === "new" && i.clientId === entry.clientId))
            data.quizSet.selection.items.push({ kind: "new", clientId: entry.clientId });
          render();
          save();
        })
      );
      if (!originalKeys.has(entry.clientId))
        row.append(
          button("删除新题草稿", () => {
            data.quizSet.newQuestions = data.quizSet.newQuestions.filter(q => q.clientId !== entry.clientId);
            data.quizSet.selection.items = data.quizSet.selection.items.filter(
              i => i.kind !== "new" || i.clientId !== entry.clientId
            );
            render();
            save();
          })
        );
      pool.append(row);
    });
    const preview = container.querySelector<HTMLElement>("#set-preview")!;
    preview.replaceChildren();
    const title = document.createElement("h3");
    title.textContent = data.title;
    preview.append(title);
    const description = document.createElement("p");
    description.textContent = data.content;
    preview.append(description);
    data.quizSet.selection.items.forEach(item => {
      const q =
        item.kind === "existing"
          ? catalog.get(item.questionId)
          : data.quizSet.newQuestions.find(q => q.clientId === item.clientId)?.question;
      const detail = document.createElement("details"),
        summary = document.createElement("summary");
      summary.textContent = item.kind === "existing" ? item.questionId : "本次新增题目";
      const body = document.createElement("div");
      if (item.kind === "existing") body.dataset.questionId = item.questionId;
      if (q) body.innerHTML = "stemHtml" in q ? String(q.stemHtml) : renderDraftMarkdown(q.stem);
      if (q) {
        const choices = ("choices" in q ? q.choices : undefined) as
          | Array<{ id: string; content?: string; contentHtml?: string }>
          | undefined;
        choices?.forEach(choice => {
          const p = document.createElement("div");
          const label = document.createElement("strong");
          label.textContent = choice.id + "．";
          const content = document.createElement("div");
          content.innerHTML = choice.contentHtml || renderDraftMarkdown(choice.content);
          p.append(label, content);
          body.append(p);
        });
        const solution = document.createElement("div");
        solution.innerHTML = "solutionHtml" in q ? String(q.solutionHtml) : renderDraftMarkdown(q.solution);
        body.append(solution);
        const credit = document.createElement("p");
        credit.textContent =
          "authors" in q
            ? `原题作者：${(q as Question).authors?.map(a => a.name).join("、") || "未署名"}；${
                (q as Question).provenance?.note || ""
              } ${(q as Question).license || ""}`
            : `新题作者：${String(("attribution" in q ? q.attribution : "") || "匿名")}；来源详见本题编辑信息．`;
        body.append(credit);
      }
      detail.append(summary, body);
      detail.addEventListener(
        "toggle",
        () => {
          if (!detail.open) return;
          hydrateAssets(detail, [...catalog.values()], manifestUrl);
          if (item.kind === "new")
            void loadPreviewMathJax(signal)
              .then(math => {
                if (!signal.aborted && detail.isConnected && detail.open) return math.typesetPromise?.([detail]);
              })
              .catch(() => {});
        },
        { signal }
      );
      preview.append(detail);
    });
    const bytes = new TextEncoder().encode(
      publicBody(publicRecord(envelope(), (data.baseRevision || 0) + 1, new Date().toISOString()))
    ).length;
    container.querySelector(
      "#set-size"
    )!.textContent = `共 ${data.quizSet.selection.items.length} 题；新题池 ${data.quizSet.newQuestions.length} 题；预计 Issue 正文 ${bytes} / 60000 字节．`;
  };
  async function editQuestion(clientId: string = crypto.randomUUID()) {
    if (data.editing && data.editing.clientId !== clientId) {
      tell("请先保存或取消当前新题编辑．");
      return;
    }
    const fields = data.editing?.fields;
    stopEditor();
    const template = container!.querySelector<HTMLTemplateElement>("#plw-set-question-template")!;
    editorHost.append(template.content.cloneNode(true));
    editorHost.hidden = false;
    editorScope = new AbortController();
    const scope = editorScope;
    const aborted = () => scope.abort();
    signal.addEventListener("abort", aborted, { once: true });
    scope.signal.addEventListener("abort", () => signal.removeEventListener("abort", aborted), { once: true });
    data.editing = { clientId, fields: fields || {} };
    editorHost.append(
      button("取消新题编辑", () => {
        stopEditor();
        delete data.editing;
        save();
      })
    );
    const dispose = await mountQuestionEditor(
      editorHost,
      { signal: scope.signal },
      {
        fields,
        initial: data.quizSet.newQuestions.find(q => q.clientId === clientId),
        onSave: (question, sourceDeclaration) => {
          const candidate = { clientId, question, sourceDeclaration };
          const test = envelope();
          test.payload.quizSet = {
            ...data.quizSet,
            newQuestions: [candidate],
            selection: { type: "fixed", order: "fixed", items: [{ kind: "new", clientId }] }
          };
          const errors = fieldErrors(test);
          const relevant = Object.entries(errors).filter(([p]) => p.startsWith("/payload/quizSet/newQuestions"));
          if (relevant.length || validateQuestion(question)) {
            tell(relevant.map(([p, e]) => `${p}：${e}`).join("；") || "新题格式无效．");
            return;
          }
          const index = data.quizSet.newQuestions.findIndex(q => q.clientId === clientId);
          if (index < 0) {
            data.quizSet.newQuestions.push(candidate);
            data.quizSet.selection.items.push({ kind: "new", clientId });
          } else data.quizSet.newQuestions[index] = candidate;
          delete data.editing;
          stopEditor();
          render();
          save();
          tell("新题已保存；移出题集后仍保留在新题池．");
        }
      }
    );
    if (scope.signal.aborted) dispose();
    else {
      editorDispose = dispose;
      save();
    }
  }
  const sourceUi = () => {
    const adapted = text("#set-source-kind") === "adapted";
    form.querySelector<HTMLElement>("#set-adapted")!.hidden = !adapted;
    form.querySelectorAll<HTMLInputElement>("#set-adapted input").forEach(n => {
      n.required = adapted;
    });
  };
  form.addEventListener("input", save, { signal });
  editorHost.addEventListener("input", save, { signal });
  form.addEventListener(
    "change",
    () => {
      sourceUi();
      save();
    },
    { signal }
  );
  container.querySelectorAll<HTMLButtonElement>("[data-set-step]").forEach(b =>
    b.addEventListener(
      "click",
      () => {
        readMetadata();
        const next = Number(b.dataset.setStep);
        try {
          if (next === 3) validate();
          step = next;
          container.querySelectorAll<HTMLElement>("[data-set-panel]").forEach(p => {
            p.hidden = Number(p.dataset.setPanel) !== step;
          });
          render();
        } catch (e) {
          tell((e as Error).message);
        }
      },
      { signal }
    )
  );
  container.querySelector("#set-new")!.addEventListener(
    "click",
    () => {
      void editQuestion();
    },
    { signal }
  );
  container.querySelector("#set-export")!.addEventListener(
    "click",
    () => {
      readMetadata();
      downloadJson(document, "plw-quiz-set-draft.json", data);
    },
    { signal }
  );
  const restore = async (raw: string) => {
    const incoming = parseQuizSetDraft(raw);
    if (incoming.submissionId !== id || (id && incoming.baseRevision !== data.baseRevision))
      throw new Error("草稿属于其他投稿或旧修订．请导出保留内容，并基于最新稿件人工整理．");
    stopEditor();
    data = incoming;
    pendingDraft = null;
    fill();
    if (data.editing) await editQuestion(data.editing.clientId);
    save();
  };
  container.querySelector("#set-restore")!.addEventListener(
    "click",
    () => {
      if (pendingDraft) void restore(pendingDraft).catch(e => tell(e.message));
    },
    { signal }
  );
  container.querySelector("#set-discard")!.addEventListener(
    "click",
    () => {
      pendingDraft = null;
      try {
        localStorage.removeItem(key);
      } catch {}
      save();
    },
    { signal }
  );
  container.querySelector<HTMLInputElement>("#set-import")!.addEventListener(
    "change",
    event => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file && file.size <= 1024 * 1024)
        void file
          .text()
          .then(restore)
          .catch(e => tell(e.message));
      else tell("请选择不超过 1 MiB 的题集草稿．");
    },
    { signal }
  );
  container.querySelector("#set-try")!.addEventListener(
    "click",
    () => {
      try {
        validate();
        trial.hidden = false;
        form.hidden = true;
        trialSet(trial, data.quizSet, catalog, manifestUrl, signal, () => {
          trial.replaceChildren();
          trial.hidden = true;
          form.hidden = false;
        });
      } catch (e) {
        form.hidden = false;
        trial.hidden = true;
        tell((e as Error).message);
      }
    },
    { signal }
  );
  const verification = createVerification(
    form.querySelector<HTMLElement>("#set-turnstile")!,
    signal,
    tell,
    undefined,
    "submit-quiz-set"
  );
  form.addEventListener(
    "submit",
    event => {
      event.preventDefault();
      if (saving) return;
      void (async () => {
        try {
          validate();
          if (!revisionLoaded) throw new Error("请先载入最新修订与管理回执．");
          if (!form.querySelector<HTMLInputElement>("#set-license")!.checked)
            throw new Error("请明确确认来源与 CC BY-SA 4.0 许可．");
          if (!verification.token) throw new Error("请完成人机验证．");
          saving = true;
          const snapshot = contentSnapshot();
          const value = envelope();
          const { schemaVersion, submissionId, licenseVersion, ...input } = value;
          const result = await client.submit({ ...input, turnstileToken: verification.token });
          if (signal.aborted) return;
          if (result.operationState === "processing") tell("正在确认投稿结果，请保留草稿和管理回执并查询进度．");
          else {
            submittedContent = snapshot;
            form.hidden = true;
            editorHost.hidden = true;
            tell("题集投稿已提交，草稿入库后仍需人工审核和部署确认．");
            if (contentSnapshot() === snapshot) {
              try {
                localStorage.removeItem(key);
              } catch {}
            } else tell("题集已提交；提交期间的新改动保留在本机草稿中，请通过管理回执继续修订．");
          }
        } catch (e) {
          if (!signal.aborted) tell((e as Error).message);
        } finally {
          saving = false;
          verification.reset();
        }
      })();
    },
    { signal }
  );
  try {
    pendingDraft = localStorage.getItem(key);
    if (pendingDraft) draftNotice.textContent = "发现本机题集草稿．恢复或忽略后启用自动保存．";
  } catch {
    draftNotice.textContent = "本机存储不可用，请使用导出备份．";
  }
  if (id) {
    try {
      const receipt = readReceipt(document, id);
      if (!receipt) throw new Error("请在投稿管理页导入回执后再进入修订．");
      const response = await fetch(SUBMISSION_ENDPOINT + "/" + id, {
        headers: { Authorization: "Bearer " + receipt.token },
        signal
      });
      const result = (await response.json()) as { revision: number; record: SubmissionEnvelope; message?: string };
      if (!response.ok || result.record?.type !== "quiz-set") throw new Error(result.message || "无法载入题集修订．");
      if (signal.aborted) return () => {};
      receipt.revision = result.revision;
      client.setRevision(receipt, result.record);
      data = {
        ...empty(),
        title: result.record.payload.title,
        content: result.record.payload.content,
        attribution: result.record.payload.attribution || "",
        sourceDeclaration: result.record.sourceDeclaration,
        quizSet: result.record.payload.quizSet!,
        submissionId: id,
        baseRevision: result.revision
      };
      revisionLoaded = true;
      data.quizSet.newQuestions.forEach(q => originalKeys.add(q.clientId));
    } catch (e) {
      tell((e as Error).message);
    }
  } else {
    const handoffKey = new URL(location.href).searchParams.get("collectionDraft");
    if (handoffKey && /^[a-f0-9-]{36}$/.test(handoffKey)) {
      try {
        const raw = sessionStorage.getItem("plw:set-handoff:" + handoffKey);
        if (raw) {
          const ids: unknown = JSON.parse(raw);
          if (Array.isArray(ids) && ids.every(v => typeof v === "string"))
            data.quizSet.selection.items = [...new Set(ids)].map(questionId => ({ kind: "existing", questionId }));
          sessionStorage.removeItem("plw:set-handoff:" + handoffKey);
        }
      } catch {
        tell("无法读取收藏夹引用，可从题库重新添加．");
      }
    }
  }
  fill();
  form.querySelector<HTMLFieldSetElement>("#set-editor-fields")!.disabled = !revisionLoaded;
  try {
    const manifest = await loadManifest(manifestUrl, signal);
    const questions = await loadQuestionCatalog(manifestUrl, manifest.catalogs.questions, signal);
    if (!signal.aborted) {
      catalog = new Map(questions.filter(q => q.status === "published").map(q => [q.id, q]));
      render();
    }
    const search = container.querySelector<HTMLInputElement>("#set-search")!;
    const searchResults = container.querySelector<HTMLElement>("#set-search-results")!;
    const searchQuestions = () => {
      searchResults.replaceChildren();
      const keyword = search.value.trim().toLowerCase();
      [...catalog.values()]
        .filter(q =>
          `${q.id} ${q.stemHtml.replace(/<[^>]*>/g, "")} ${q.topicIds.join(" ")} ${q.conceptIds.join(" ")}`
            .toLowerCase()
            .includes(keyword)
        )
        .slice(0, 30)
        .forEach(q => {
          const row = document.createElement("details"),
            summary = document.createElement("summary");
          summary.textContent = `${q.id}：${q.stemHtml.replace(/<[^>]*>/g, "").slice(0, 80)}`;
          const body = document.createElement("div");
          body.dataset.questionId = q.id;
          body.innerHTML = q.stemHtml;
          row.append(
            summary,
            body,
            button("加入题集", () => {
              if (!data.quizSet.selection.items.some(i => i.kind === "existing" && i.questionId === q.id))
                data.quizSet.selection.items.push({ kind: "existing", questionId: q.id });
              render();
              save();
            })
          );
          row.addEventListener(
            "toggle",
            () => {
              if (row.open) hydrateAssets(row, [q], manifestUrl);
            },
            { signal }
          );
          searchResults.append(row);
        });
    };
    search.addEventListener("input", searchQuestions, { signal });
    searchQuestions();
  } catch {
    if (!signal.aborted) tell("已有题库暂时无法加载，草稿和新题编辑仍可使用．");
  }
  void verification.ready.catch(() => {});
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    if (data.editing) readMetadata();
    save();
    stopEditor();
    verification.dispose();
  };
  signal.addEventListener("abort", dispose, { once: true });
  return dispose;
}
