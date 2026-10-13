/** 0 以上 1 未満を返す乱数関数（テストで差し替える） */
export type Rng = () => number;

/** Fisher–Yates で n 件を無作為に選ぶ */
export function sample<T>(items: readonly T[], n: number, rng: Rng = Math.random): T[] {
  const a = [...items];
  const k = Math.min(n, a.length);
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(rng() * (a.length - i));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a.slice(0, k);
}

/** 試験日までの残り日数（当日=0、過ぎたら負） */
export function daysUntil(examDate: string, today: Date): number {
  const [y, m, d] = examDate.split('-').map(Number);
  const exam = Date.UTC(y!, m! - 1, d!);
  const t = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((exam - t) / 86_400_000);
}

/** ローカル日付の YYYY-MM-DD */
export function localDateKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
