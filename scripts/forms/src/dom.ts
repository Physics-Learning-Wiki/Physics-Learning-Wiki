export function queryInRoot<T extends Element>(root: ParentNode, selector: string): T | null {
  if (root instanceof Element && root.matches(selector)) return root as T;
  return root.querySelector<T>(selector);
}
