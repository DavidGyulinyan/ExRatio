export function normalizeDashboardCardOrder<T extends string>(
  raw: unknown,
  defaultOrder: readonly T[]
): T[] {
  const allowed = new Set<string>(defaultOrder);
  if (!Array.isArray(raw)) return [...defaultOrder];
  const seen = new Set<string>();
  const out: T[] = [];
  for (const x of raw) {
    if (typeof x === "string" && allowed.has(x) && !seen.has(x)) {
      seen.add(x);
      out.push(x as T);
    }
  }
  for (const id of defaultOrder) {
    if (!seen.has(id)) out.push(id);
  }
  return out;
}
