export const safeChange = (current?: number | null, previous?: number | null) =>
  current == null || previous == null ? null : current - previous;

export const safeChangePct = (current?: number | null, previous?: number | null) => {
  if (current == null || previous == null || previous === 0) return null;
  return (current - previous) / Math.abs(previous);
};

export const rollingSum = (values: Array<number | null | undefined>, window: number) => {
  const clean = values.slice(-window).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  return clean.length ? clean.reduce((a, b) => a + b, 0) : null;
};

export const cumulativeSum = (values: Array<number | null | undefined>) => {
  let acc = 0;
  return values.map((value) => {
    if (typeof value === 'number' && Number.isFinite(value)) acc += value;
    return acc;
  });
};

export const marketShares = (rows: Array<{ value: number }>) => {
  const total = rows.reduce((acc, row) => acc + (Number.isFinite(row.value) ? row.value : 0), 0);
  if (!total) return rows.map(() => 0);
  return rows.map((row) => row.value / total);
};
