export function calculateMedian(arr: number[]): number {
  const valid = arr.filter((n) => n !== -1);
  if (!valid.length) return -1;
  const sorted = [...valid].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export function calculateFailureRate(arr: number[]): number {
  if (!arr.length) return 0;
  const failures = arr.filter((n) => n === -1).length;
  return Math.round((failures / arr.length) * 100);
}
