/**
 * パフォーマンス計測ユーティリティ
 *
 * 🎯 計測の anchor = "activation"
 *   タブが active になった瞬間 (useAnimatedReaction の worklet → runOnJS で
 *   setIsActive(true) が JS thread に到達した瞬間) を 0 点とする。
 *
 *   なぜ markTabSwitch (onTabChange) を使わないか:
 *   library の onTabChange は swipe 終了 (idle) まで遅延される設計 (Container.tsx:164)。
 *   一方 activeIndex の SharedValue は swipe 中に即更新され、useAnimatedReaction の
 *   runOnJS(setIsActive) は swipe 開始直後に JS thread に到達する。
 *   → この2つを混ぜると "s→a" に idle 遅延分が乗って計測が壊れる。
 *
 * 計測フェーズ:
 *   activation  — setIsActive(true) が JS thread に着いた時刻 (= anchor)
 *   mount       — NewsList の useEffect が発火した時刻 (React commit 完了)
 *   ready       — InteractionManager.runAfterInteractions の callback が走った時刻
 *   dataReady   — useMockQuery の data が state に入った時刻
 *   firstRender — RAF x2 経由で native paint が終わった時刻
 *
 * 内訳:
 *   dispatch = mount - activation   (React commit + useEffect scheduling)
 *   idle     = ready - mount        (InteractionManager 待ち時間)
 *   data     = dataReady - ready    (mock fetch 300ms + state propagation)
 *   paint    = firstRender - dataReady (RAF x2 + native paint)
 *   total    = firstRender - activation
 *
 *   オプション: hop = activation - workletTimeAtActivation
 *     worklet → JS thread の bridge 越えコスト。
 *     Reanimated worklet で performance.now() が取れれば計測可能。
 *
 * dispatch の評価:
 *   ≤  32ms  🟢 FAST       — JS thread 空き
 *   ≤  64ms  🟢 OK         — 軽微な負荷
 *   ≤ 128ms  🟡 SLOW       — 目に見える遅延
 *   ≤ 300ms  🟠 LAGGY      — ユーザー体感の引っかかり
 *   > 300ms  🔴 BLOCKED    — JS thread 詰まり
 */

interface PerfEntry {
  category: string;
  activationAt: number; // anchor: setIsActive が JS thread に到達した時刻
  workletTimeAtActivation?: number; // worklet 側で記録した時刻 (hop 計測用)
  mountAt?: number;
  readyAt?: number;
  dataAt?: number;
  paintAt?: number;
}

const entries = new Map<string, PerfEntry>();

const STALE_THRESHOLD_MS = 30_000;

const LATENCY_THRESHOLDS: Array<{ ms: number; icon: string; label: string }> = [
  { ms: 32, icon: "🟢", label: "FAST    " },
  { ms: 64, icon: "🟢", label: "OK      " },
  { ms: 128, icon: "🟡", label: "SLOW    " },
  { ms: 300, icon: "🟠", label: "LAGGY   " },
];

function fmtLatency(ms: number): string {
  for (const t of LATENCY_THRESHOLDS) {
    if (ms <= t.ms) return `${t.icon} ${t.label}`;
  }
  return "🔴 BLOCKED ";
}

function fmtMs(n: number | undefined): string {
  return n !== undefined ? `${n.toFixed(0)}ms`.padStart(6) : "   N/A";
}

/**
 * ローカル HTTP ログサーバーに [PERF] 行を送る。
 * /tmp/perf-log-server.js で受信、/tmp/perf.log に書き出される。
 * Claude Code が自動計測ループを回すために使う。
 * 失敗は無視 (server 停止中でも app 動作を阻害しない)。
 */
function postLog(line: string): void {
  try {
    fetch("http://127.0.0.1:9999/log", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: line,
    }).catch(() => {});
  } catch {
    // noop
  }
}

function logLine(line: string): void {
  console.log(line);
  postLog(line);
}

/**
 * 30 秒以上古いエントリを GC する。
 * firstRender が RAF cancel で到達しなかったエントリが残り続けるのを防ぐ。
 */
function gcStaleEntries(now: number): void {
  for (const [key, entry] of entries) {
    if (now - entry.activationAt > STALE_THRESHOLD_MS) {
      entries.delete(key);
    }
  }
}

/**
 * タブ切替の "JS thread 到達時刻" を記録する。
 * useAnimatedReaction の runOnJS から setIsActive(true) が呼ばれる直前に呼ぶ。
 *
 * @param category  タブ名 (lowercase)
 * @param workletTime  (オプション) worklet 側で記録した performance.now() 値
 */
export function markActivation(category: string, workletTime?: number): void {
  const now = performance.now();
  gcStaleEntries(now);
  // 既存エントリがあっても上書きする (= 再 activation を許容)
  entries.set(category, {
    category,
    activationAt: now,
    workletTimeAtActivation: workletTime,
  });
}

/**
 * InteractionManager.runAfterInteractions 通過後の時刻を記録。
 */
export function markReady(category: string): void {
  const entry = entries.get(category);
  if (!entry || entry.readyAt !== undefined) return;
  entry.readyAt = performance.now();
}

/**
 * unmount 時間を記録 (全 unmount をログ、閾値なし)。
 */
export function markUnmount(category: string, durationMs: number): void {
  logLine(
    `[PERF] 🗑 unmount       → ${category.padEnd(14)} | cost:${fmtMs(durationMs)}`,
  );
}

/**
 * mount コスト (HeavyNewsListContent の初回 render 完了までの時間) を記録
 */
export function markMountCost(category: string, durationMs: number): void {
  logLine(
    `[PERF] ⚡ mount-cost    → ${category.padEnd(14)} | cost:${fmtMs(durationMs)}`,
  );
}

/**
 * リストコンテンツの各フェーズを記録
 */
export function markListPhase(
  category: string,
  phase: "mount" | "dataReady" | "firstRender",
): void {
  const now = performance.now();
  const entry = entries.get(category);
  if (!entry) return;

  if (phase === "mount") {
    if (entry.mountAt !== undefined) return;
    entry.mountAt = now;
    const dispatch = now - entry.activationAt;
    const hop =
      entry.workletTimeAtActivation !== undefined
        ? entry.activationAt - entry.workletTimeAtActivation
        : undefined;
    const label = fmtLatency(dispatch);
    logLine(
      `[PERF] ${label} → ${category.padEnd(14)} | dispatch:${fmtMs(dispatch)}  hop:${fmtMs(hop)}`,
    );
    return;
  }

  if (phase === "dataReady") {
    if (entry.dataAt !== undefined) return;
    entry.dataAt = now;
    return;
  }

  if (phase === "firstRender") {
    if (entry.paintAt !== undefined) return;
    entry.paintAt = now;
    const idleWait =
      entry.readyAt !== undefined && entry.mountAt !== undefined
        ? entry.readyAt - entry.mountAt
        : undefined;
    const dataLoad =
      entry.dataAt !== undefined && entry.readyAt !== undefined
        ? entry.dataAt - entry.readyAt
        : entry.dataAt !== undefined && entry.mountAt !== undefined
          ? entry.dataAt - entry.mountAt
          : undefined;
    const firstPaint =
      entry.dataAt !== undefined ? entry.paintAt - entry.dataAt : undefined;
    const total = entry.paintAt - entry.activationAt;
    logLine(
      `[PERF]   └─ ${category.padEnd(14)} | idle:${fmtMs(idleWait)} data:${fmtMs(dataLoad)} paint:${fmtMs(firstPaint)} total:${fmtMs(total)}`,
    );
    entries.delete(category);
  }
}

// --- 後方互換: 旧 API (no-op or aliasing) ---

/**
 * @deprecated markActivation を使うこと。
 * onTabChange は idle 遅延されるため anchor には使えない。
 * 呼ばれても何もしない (後方互換のため残置)。
 */
export function markTabSwitch(_from: string, _to: string): void {
  // no-op
}

/**
 * @deprecated markActivation を使うこと。
 */
export function markActive(category: string): void {
  markActivation(category);
}
