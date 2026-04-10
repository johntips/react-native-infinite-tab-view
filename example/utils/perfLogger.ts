/**
 * パフォーマンス計測ユーティリティ
 * タブスワイプの応答性と重いリスト描画時間を数値化する。
 */

interface PerfEntry {
  category: string;
  startAt: number;
  mountAt?: number;
  dataReadyAt?: number;
  firstRenderAt?: number;
}

const entries = new Map<string, PerfEntry>();
let lastTabSwitchAt = 0;
let lastTabSwitchFrom = "";
let lastTabSwitchTo = "";

/**
 * タブ切り替え開始を記録
 */
export function markTabSwitch(from: string, to: string): void {
  const now = performance.now();
  lastTabSwitchAt = now;
  lastTabSwitchFrom = from;
  lastTabSwitchTo = to;
  console.log(`[PERF] 🎬 Tab switch: ${from} → ${to} @ ${now.toFixed(0)}ms`);
}

/**
 * リストコンテンツの各フェーズを記録
 */
export function markListPhase(
  category: string,
  phase: "mount" | "dataReady" | "firstRender",
): void {
  const now = performance.now();
  let entry = entries.get(category);
  if (!entry) {
    entry = { category, startAt: now };
    entries.set(category, entry);
  }

  switch (phase) {
    case "mount":
      entry.mountAt = now;
      break;
    case "dataReady":
      entry.dataReadyAt = now;
      break;
    case "firstRender":
      entry.firstRenderAt = now;
      if (category === lastTabSwitchTo) {
        reportSummary(category, entry);
      }
      break;
  }
}

/**
 * 計測結果のサマリーをログ出力
 */
function reportSummary(category: string, entry: PerfEntry): void {
  const tabResponse =
    entry.mountAt !== undefined ? entry.mountAt - lastTabSwitchAt : undefined;
  const dataLoad =
    entry.dataReadyAt !== undefined && entry.mountAt !== undefined
      ? entry.dataReadyAt - entry.mountAt
      : undefined;
  const firstPaint =
    entry.firstRenderAt !== undefined && entry.dataReadyAt !== undefined
      ? entry.firstRenderAt - entry.dataReadyAt
      : undefined;
  const total =
    entry.firstRenderAt !== undefined
      ? entry.firstRenderAt - lastTabSwitchAt
      : undefined;

  const fmt = (n: number | undefined) =>
    n !== undefined ? `${n.toFixed(0)}ms` : "N/A";

  const tabResponseScore =
    tabResponse !== undefined
      ? tabResponse < 16
        ? "🟢 60fps"
        : tabResponse < 33
          ? "🟡 30fps"
          : "🔴 slow"
      : "";

  console.log(
    `[PERF] 📊 ${lastTabSwitchFrom} → ${category}\n` +
      `       tab response  : ${fmt(tabResponse)} ${tabResponseScore}\n` +
      `       data load     : ${fmt(dataLoad)}\n` +
      `       first paint   : ${fmt(firstPaint)}\n` +
      `       ─────────────────────────\n` +
      `       total         : ${fmt(total)}`,
  );
}

/**
 * 計測エントリをリセット
 */
export function resetPerfEntry(category: string): void {
  entries.delete(category);
}

/**
 * タブ切り替え応答性（タブインジケーターが動き出すまでの時間）を記録
 */
export function markTabIndicatorMoved(to: string): void {
  const now = performance.now();
  const elapsed = now - lastTabSwitchAt;
  const score =
    elapsed < 16 ? "🟢 60fps" : elapsed < 33 ? "🟡 30fps" : "🔴 slow";
  console.log(
    `[PERF] 🎯 Tab indicator moved to ${to}: ${elapsed.toFixed(0)}ms ${score}`,
  );
}
