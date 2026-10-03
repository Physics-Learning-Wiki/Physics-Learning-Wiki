export function mountNavigation(document: Document): () => void {
  const controller = new AbortController();
  const { signal } = controller;
  let drawerTrigger: HTMLElement | undefined;
  let searchTrigger: HTMLElement | undefined;
  const toggle = (id: string) => document.getElementById(id) as HTMLInputElement | null;
  const mobile = document.defaultView!.matchMedia("(max-width: 1219px)");
  const visible = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      rect.left >= 0 &&
      rect.right <= document.defaultView!.innerWidth &&
      getComputedStyle(element).visibility !== "hidden"
    );
  };
  const focusables = (root: Element) =>
    [...root.querySelectorAll<HTMLElement>('a[href], button, input, select, summary, [tabindex="0"]')].filter(visible);
  const sync = () => {
    for (const button of document.querySelectorAll<HTMLElement>("[data-plw-toggle][aria-expanded]")) {
      button.setAttribute("aria-expanded", String(toggle(button.dataset.plwToggle!)?.checked ?? false));
    }
    const sidebar = document.querySelector<HTMLElement>(".md-sidebar--primary");
    if (sidebar) sidebar.inert = mobile.matches && !toggle("__drawer")?.checked;
    for (const label of document.querySelectorAll<HTMLLabelElement>('nav label[for^="__nav_"]')) {
      label.setAttribute("role", "button");
      label.tabIndex = 0;
      label.setAttribute("aria-expanded", String(toggle(label.htmlFor)?.checked ?? false));
    }
  };
  const set = (id: string, checked: boolean) => {
    const input = toggle(id);
    if (!input || input.checked === checked) return;
    input.checked = checked;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  };
  document.addEventListener(
    "click",
    event => {
      const button = (event.target as Element | null)?.closest<HTMLElement>(
        "[data-plw-toggle], [data-plw-open-search]"
      );
      if (!button) return;
      const id = button.dataset.plwToggle ?? "__search";
      if (id === "__drawer" && !toggle(id)?.checked) drawerTrigger = button;
      if (id === "__search" && !toggle(id)?.checked) searchTrigger = button;
      set(id, !toggle(id)?.checked);
      sync();
      if (id === "__drawer" && toggle(id)?.checked) {
        const sidebar = document.querySelector(".md-sidebar--primary");
        if (sidebar) requestAnimationFrame(() => focusables(sidebar)[0]?.focus());
      }
    },
    { signal }
  );
  document.addEventListener(
    "change",
    event => {
      const input = event.target as HTMLInputElement;
      sync();
      if (input.id === "__drawer" && !input.checked) drawerTrigger?.focus();
      if (input.id === "__search" && !input.checked) searchTrigger?.focus();
    },
    { signal }
  );
  document.addEventListener(
    "keydown",
    event => {
      const label = (event.target as Element | null)?.closest<HTMLLabelElement>('nav label[role="button"]');
      if (label && ["Enter", " "].includes(event.key)) {
        event.preventDefault();
        label.click();
        sync();
        return;
      }
      if (event.key === "Escape" && toggle("__drawer")?.checked) {
        event.preventDefault();
        set("__drawer", false);
        return;
      }
      if (event.key !== "Tab") return;
      const root = toggle("__search")?.checked
        ? document.getElementById("plw-search")
        : mobile.matches && toggle("__drawer")?.checked
        ? document.querySelector(".md-sidebar--primary")
        : null;
      if (!root) return;
      const items = focusables(root);
      const index = items.indexOf(document.activeElement as HTMLElement);
      if (event.shiftKey && index <= 0) {
        event.preventDefault();
        items[items.length - 1]?.focus();
      } else if (!event.shiftKey && (index === items.length - 1 || index < 0)) {
        event.preventDefault();
        items[0]?.focus();
      }
    },
    { signal }
  );
  document.addEventListener(
    "plw:page-change",
    () => {
      set("__drawer", false);
      sync();
    },
    { signal }
  );
  mobile.addEventListener("change", sync, { signal });
  sync();
  return () => controller.abort();
}
