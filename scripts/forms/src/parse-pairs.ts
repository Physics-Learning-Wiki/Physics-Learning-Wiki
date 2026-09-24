export function parsePairs(text: string, label: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of text
    .split(/\r?\n/)
    .map(item => item.trim())
    .filter(Boolean)) {
    const separator = line.indexOf("|");
    if (separator < 1 || !line.slice(separator + 1).trim()) {
      throw new Error(`${label}格式应为「ID|内容」，例如「A|选项内容」`);
    }
    const id = line.slice(0, separator).trim().toUpperCase();
    if (result[id]) throw new Error(`${label}中选项标号 ${id} 重复`);
    result[id] = line.slice(separator + 1).trim();
  }
  return result;
}
