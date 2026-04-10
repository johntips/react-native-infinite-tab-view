# Perf Metrics — infinite-tab-view example

> このドキュメントは **指標の確定仕様** です。
> 新しい指標を追加・改名・削除する時は必ずここを更新してください。
> 指標がブレると before/after 比較ができなくなり、最適化の成果を評価できません。

## 最終ゴール

`production` (プロダクション) で `react-native-infinite-material-tab` が **60fps** で動くこと。
この example は ライブラリ本体のボトルネックを再現・計測するためのテストベッドです。

---

## 計測アーキテクチャ

### 指標ツリー

```
activation      ← anchor (T=0)
  │               setIsActive(true) が JS thread に到達した瞬間
  │
  ├─ hop        (option)  worklet → JS bridge 越えのレイテンシ
  │                       = activationAt - workletTimeAtActivation
  │                       Reanimated の worklet で performance.now() を取得し、
  │                       runOnJS で JS thread に渡す。到達時との差分。
  │
  ├─ dispatch   必須       activationAt → mountAt
  │                       React commit + useEffect scheduling 時間。
  │                       setIsActive(true) から wrapper の useEffect が
  │                       発火するまで。正常値は 5-50ms。
  │
  ├─ idle       必須       mountAt → readyAt
  │                       InteractionManager.runAfterInteractions が
  │                       callback を呼ぶまでの待ち時間。
  │                       スワイプが続いていれば長くなる。JS 詰まりの指標。
  │
  ├─ data       必須       readyAt → dataAt
  │                       Heavy mount 完了後、useMockQuery の data が
  │                       state に入るまで。mock 300ms + α。
  │
  ├─ paint      必須       dataAt → paintAt
  │                       data 到着後、RAF x2 経由で native paint 完了まで。
  │                       FlashList の描画時間を反映。
  │
  └─ total      必須       activationAt → paintAt
                          ユーザー体感の総遅延。
```

### anchor に activation を選ぶ理由

library の `onTabChange` callback は **swipe 終了 (idle) まで遅延される設計** (`src/Container.tsx:164`)。
これを anchor にすると、ログに "swipe 中の遅延" が現れず、計測が信用できなくなる。

代わりに `useAnimatedReaction` の runOnJS 経由で `setIsActive(true)` が JS thread に到達する瞬間を
anchor にする。これは **swipe 開始直後** に発火するため、JS thread の詰まりを正直に反映する。

### stale entry GC

firstRender が到達しないケース（RAF cancel、ユーザー swipe away 等）で entry が残存するのを防ぐため、
**30秒以上古いエントリは自動 GC** する (`perfLogger.ts:gcStaleEntries`)。

---

## ログフォーマット

### mount 時 (dispatch ログ)

```
[PERF] 🟢 FAST     → sports         | dispatch:   18ms  hop:    5ms
[PERF] 🟠 LAGGY    → science        | dispatch:  214ms  hop:   12ms
[PERF] 🔴 BLOCKED  → travel         | dispatch: 1520ms  hop: 1502ms
```

- **アイコン**: dispatch 値による即時評価
- **dispatch**: 主指標
- **hop**: worklet → JS 橋渡しコスト (option、計測できなければ N/A)

### firstRender 時 (summary ログ)

```
[PERF]   └─ sports         | idle:  14ms data: 568ms paint:1055ms total: 2811ms
```

- **idle**: InteractionManager 待ち
- **data**: mock fetch 完了まで
- **paint**: RAF x2 + native paint
- **total**: activation → paint の総時間

### unmount ログ (16ms 超過時のみ)

```
[PERF] 🗑 unmount       → business       | cost:    45ms
```

- HeavyNewsListContent の全 cleanup 完了までの時間
- 16ms 以下は省略 (ノイズ削減)

---

## 評価閾値 (dispatch)

| latency | icon | label | 解釈 |
|---------|------|-------|------|
| ≤ 32ms  | 🟢 | FAST    | JS thread が完全に空いている |
| ≤ 64ms  | 🟢 | OK      | 軽微な負荷、許容範囲 |
| ≤ 128ms | 🟡 | SLOW    | 目に見える遅延、改善余地あり |
| ≤ 300ms | 🟠 | LAGGY   | ユーザー体感の引っかかり |
| > 300ms | 🔴 | BLOCKED | JS thread が完全に詰まっている |

**重要**: これは **native swipe の FPS ではない**。PagerView の swipe 自体は
native thread で 60fps 動作している。ここで測っているのは JS dispatch latency であり、
「指を離してからリストが見えるまで」の遅延に相当する。

### 60fps の物理下限

1 フレーム = 16.67ms。しかし dispatch の物理下限は **約 30ms**:
```
worklet → runOnJS (~5ms)
 → setState (~10ms)
 → React commit (~5ms)
 → useEffect fire (~5ms)
 → markListPhase (~5ms)
```

よって `dispatch ≤ 16ms` は原理的に出ない。
`dispatch ≤ 32ms` (= 🟢 FAST) が到達可能な最善値。

---

## API

```ts
import {
  markActivation,  // setIsActive(true) 直前で呼ぶ
  markReady,       // InteractionManager callback で呼ぶ
  markListPhase,   // "mount" | "dataReady" | "firstRender"
  markUnmount,     // HeavyNewsListContent の unmount 完了時
} from "./utils/perfLogger";
```

- `markActivation(category, workletTime?)`
  - category: 小文字のタブ名 (e.g. "sports")
  - workletTime: worklet 側で取った `performance.now()` 値 (hop 計測用)
- `markReady(category)`
- `markListPhase(category, "mount")` → dispatch ログ出力
- `markListPhase(category, "dataReady")` → 内部記録のみ
- `markListPhase(category, "firstRender")` → summary ログ出力、entry 削除
- `markUnmount(category, durationMs)` → unmount ログ出力 (16ms 超過時のみ)

---

## 非推奨 API

- `markTabSwitch(from, to)` — onTabChange が idle 遅延されるため anchor に使えない。
  後方互換のため no-op として残置されているが、新規コードで呼ばないこと。
- `markActive(category)` — `markActivation` の薄い alias (workletTime 無し)。

---

## 変更履歴

- **2026-04-10**: 初版。activation anchor 方式に統一。hop 計測を option として追加。
