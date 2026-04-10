/**
 * パフォーマンス計測ユーティリティ (FPS ベース)
 *
 * 主要指標:
 *   🎯 tab swipe latency (ms → effective FPS)
 *     スワイプ → list mount 開始までの JS thread 遅延を測定。
 *     FPS 換算: 1000 / latency
 *     評価:
 *       - 60fps (16.67ms 以下): 🟢 perfect
 *       - 45fps (22ms 以下):    🟢 smooth
 *       - 30fps (33ms 以下):    🟡 acceptable
 *       - 20fps (50ms 以下):    🟠 janky
 *       - < 20fps (50ms 超):    🔴 broken
 *
 *   🎯 swipe interval (高速連続スワイプ耐性)
 *     前回スワイプから今回スワイプまでの間隔。
 *
 * 副次指標:
 *   - data load: 模擬 API fetch 完了まで
 *   - first paint: 最初のカード描画まで
 *   - total: スワイプ開始から全フェーズ完了まで
 */

interface PerfEntry {
  category: string;
  listMountAt?: number;
  dataReadyAt?: number;
  firstRenderAt?: number;
}

const entries = new Map<string, PerfEntry>();
let lastTabSwitchAt = 0;
let prevTabSwitchAt = 0;
let lastTabSwitchFrom = "";
let lastTabSwitchTo = "";

const FPS_THRESHOLDS = [
  { ms: 16.67, fps: 60, icon: "🟢", label: "60fps" },
  { ms: 22.22, fps: 45, icon: "🟢", label: "45fps" },
  { ms: 33.33, fps: 30, icon: "🟡", label: "30fps" },
  { ms: 50.0, fps: 20, icon: "🟠", label: "20fps" },
] as const;

function msToFpsLabel(ms: number): {
  icon: string;
  fps: number;
  label: string;
} {
  for (const t of FPS_THRESHOLDS) {
    if (ms <= t.ms) return { icon: t.icon, fps: t.fps, label: t.label };
  }
  const fps = Math.round(1000 / ms);
  return { icon: "🔴", fps, label: `${fps}fps` };
}

/**
 * タブ切り替え開始を記録
 */
export function markTabSwitch(from: string, to: string): void {
  const now = performance.now();
  prevTabSwitchAt = lastTabSwitchAt;
  lastTabSwitchAt = now;
  lastTabSwitchFrom = from;
  lastTabSwitchTo = to;
  entries.delete(to);

  // 連続スワイプ間隔
  if (prevTabSwitchAt > 0) {
    const interval = now - prevTabSwitchAt;
    const intervalIcon = interval < 200 ? "⚡️" : interval < 500 ? "🚀" : "🐢";
    console.log(
      `[PERF] ${intervalIcon} swipe ${from.padEnd(12)} → ${to.padEnd(12)} | interval: ${interval.toFixed(0)}ms`,
    );
  } else {
    console.log(
      `[PERF]    swipe ${from.padEnd(12)} → ${to.padEnd(12)} | (first swipe)`,
    );
  }
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
    entry = { category };
    entries.set(category, entry);
  }

  if (phase === "mount") entry.listMountAt = now;
  if (phase === "dataReady") entry.dataReadyAt = now;
  if (phase === "firstRender") {
    entry.firstRenderAt = now;
    if (category === lastTabSwitchTo) {
      reportSummary(category, entry);
    }
  }
}

function reportSummary(category: string, entry: PerfEntry): void {
  const tabLatency =
    entry.listMountAt !== undefined
      ? entry.listMountAt - lastTabSwitchAt
      : undefined;
  const dataLoad =
    entry.dataReadyAt !== undefined && entry.listMountAt !== undefined
      ? entry.dataReadyAt - entry.listMountAt
      : undefined;
  const firstPaint =
    entry.firstRenderAt !== undefined && entry.dataReadyAt !== undefined
      ? entry.firstRenderAt - entry.dataReadyAt
      : undefined;
  const total =
    entry.firstRenderAt !== undefined
      ? entry.firstRenderAt - lastTabSwitchAt
      : undefined;

  // 🎯 メイン: tab swipe latency → FPS 換算
  const fpsInfo = tabLatency !== undefined ? msToFpsLabel(tabLatency) : null;

  const fmt = (n: number | undefined) =>
    n !== undefined ? `${n.toFixed(0)}ms`.padStart(7) : "    N/A";

  const fpsStr = fpsInfo
    ? `${fpsInfo.icon} ${fpsInfo.label.padStart(5)}`
    : "    N/A";

  console.log(
    `[PERF] ${fpsStr} ${lastTabSwitchFrom.padEnd(12)} → ${category.padEnd(12)} | latency:${fmt(tabLatency)} data:${fmt(dataLoad)} paint:${fmt(firstPaint)} total:${fmt(total)}`,
  );
}
