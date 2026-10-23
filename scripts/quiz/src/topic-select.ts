import type { TopicOption } from "./topics.js";

export function fillTopicSelect(
  select: HTMLSelectElement,
  options: readonly TopicOption[],
  placeholder: string,
  selected: string,
  emptyValue = "all"
): void {
  const makeOption = (id: string, title: string) => {
    const option = select.ownerDocument.createElement("option");
    option.value = id;
    option.textContent = title;
    return option;
  };
  select.replaceChildren(
    makeOption(emptyValue, placeholder),
    ...options.map(option => makeOption(option.id, option.title))
  );
  select.value = selected;
}
