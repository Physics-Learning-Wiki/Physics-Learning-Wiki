import { gradeNumericAnswer, parseNumeric } from "../../quiz/src/grading.js";
import type { Question } from "../../quiz/src/types.js";

export function numericAnswer(form: HTMLFormElement): Extract<Question, { type: "numeric" }>["answer"] {
  const value = (id: string) => form.querySelector<HTMLInputElement | HTMLSelectElement>("#" + id)?.value.trim() || "";
  const truth = parseNumeric(value("q-submit-answer"));
  const raw = parseNumeric(value("q-submit-tolerance"));
  const type = value("q-submit-tolerance-type") as "absolute" | "relative";
  if (truth === null) throw new Error("标准答案必须是有限数字，支持科学计数法．");
  if (raw === null || raw < 0 || (type === "relative" && raw > 100))
    throw new Error("请填写非负绝对容差或 0 到 100 的相对误差百分比．");
  if (truth === 0 && type === "relative") throw new Error("标准答案为零时请选择绝对容差．");
  const required = Boolean(form.querySelector<HTMLInputElement>("#q-submit-unit-required")?.checked);
  const canonical = value("q-submit-unit-canonical");
  const accepted = value("q-submit-unit-accepted")
    .split(/[,，]/)
    .map(s => s.trim())
    .filter(Boolean);
  if (new Set(accepted).size !== accepted.length) throw new Error("可接受单位不能重复．");
  if ((required || canonical) && (!canonical || !accepted.includes(canonical)))
    throw new Error("规范单位必须包含在可接受单位列表中．");
  return {
    value: truth,
    tolerance: { type, value: type === "relative" ? raw / 100 : raw },
    unit: { required, accepted, ...(canonical ? { canonical } : {}) }
  };
}
export function mountNumericPreview(form: HTMLFormElement, signal: AbortSignal): void {
  const output = form.querySelector<HTMLElement>("#q-submit-numeric-result");
  const update = () => {
    const tolerance = form.querySelector<HTMLInputElement>("#q-submit-tolerance");
    const hint = form.querySelector<HTMLElement>("#q-submit-tolerance-hint");
    const relative = form.querySelector<HTMLSelectElement>("#q-submit-tolerance-type")?.value === "relative";
    if (tolerance) tolerance.placeholder = relative ? "例如 1 表示 1%；支持科学计数法" : "例如 0.1；支持科学计数法";
    if (hint)
      hint.textContent = relative
        ? "相对容差按百分比填写，输入 1 表示允许误差不超过标准答案绝对值的 1%．"
        : "绝对容差与答案同单位，例如填 0.1 表示允许误差不超过 0.1．";
    if (!output) return;
    const example = form.querySelector<HTMLInputElement>("#q-submit-numeric-example")?.value || "";
    const unit = form.querySelector<HTMLInputElement>("#q-submit-numeric-example-unit")?.value || "";
    if (!example.trim()) {
      output.textContent = "配置评分规则后，可输入样例检查判定结果．";
      return;
    }
    try {
      output.textContent = gradeNumericAnswer(numericAnswer(form), { value: example, unit })
        ? "此样例会判为正确．"
        : "此样例会判为错误．";
    } catch (error) {
      output.textContent = error instanceof Error ? error.message : "请先配置评分规则．";
    }
  };
  form.addEventListener("input", update, { signal });
  form.addEventListener("change", update, { signal });
  update();
}
