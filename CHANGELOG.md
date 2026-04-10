# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.4.1] - 2026-04-11

### Cleaned up

- Remove dead refs (`currentActiveIndexRef`, `currentNearbyIndexesRef`) from `Container` — the subscription API now reads `SharedValue` directly in `getInitialActive`/`getInitialNearby`.
- Simplify `notifyNearbyChange` by dropping the unused `currentSet` argument.
- Bilingual (JP/EN) comments throughout `Container` and example `NewsList` for the OSS audience.
- Example `NewsList`: delete the consumer-side "primary instance claim" workaround. The library-level `lazy` fix in v4.4.0 makes it unnecessary.

### Added

- Regression test for the `lazy=true` + `infiniteScroll=true` combo: asserts that `BUFFER_MULTIPLIER` virtual copies do NOT all render children on initial mount.

## [4.4.0] - 2026-04-11

### 🎯 Performance — Critical lazy mount fix

**infinite scroll + lazy mode で 1 タブあたり 10 個の HeavyContent が並列マウントされていた深刻な bug を修正。**

- **問題**: `Container` の `mountedIndexes` が **realIndex** をキーにしていたため、infinite scroll の `BUFFER_MULTIPLIER=10` で同じ realIndex を持つ 10 個の virtual page がすべて children を render していた。consumer が渡した heavy な children (FlashList, 大量の hooks, データ fetch など) が 10 インスタンス同時に mount され、JS thread を完全に詰まらせていた。
- **修正**: `mountedIndexes` → `mountedPagerIndexes` に変更。**pagerIndex (virtual page index) をキーにして追跡**することで、user が実際に到達した virtual page の children だけが render されるように。`handlePageSelected` / `handleTabPress` から `addMountedPagerRange(pagerIndex)` で新規 pagerIndex を mount 集合に追加する。

### 実測 before / after (iPhone 16e 実機、20 タブ、Maestro 10 swipe)

| 指標 | v4.3.3 baseline | v4.4.0 | 改善率 |
|------|-----------------|--------|--------|
| **JS dispatch latency** | 400-750ms 🔴 | **13-28ms** 🟢 | **~25x** |
| **Mount cost per tab** | ~500ms × **10 件** (= ~5000ms) | **~50ms × 1 件** | **~100x** |
| **Worklet→JS hop** | 1000-1700ms burst | **0ms** (定常時) | **∞** |
| **Total (swipe→content)** | 3000-17000ms | **600-900ms** | **~5-20x** |
| 🔴 BLOCKED 件数 | 全件 | **0 件** | — |
| 🟢 FAST 件数 | 0 件 | **ほぼ全件** | — |

### Performance — Centralized tab subscription (API 整理)

各タブ consumer の `useAnimatedReaction(activeIndex)` を Container 側の単一 reaction に集約。

- worklet 評価回数: N → 1 per swipe
- `runOnJS` 往復: 最大 2N → 最大 2 per swipe (前アクティブ + 新アクティブのみ)
- 注: 上記 lazy mount fix が入るまで実測値には現れなかったが、同じ bug を抱える consumer の記述を簡潔にする API 整理としての価値がある

### Added

- 新規フック **`useIsTabActive(tabName)`**: アクティブ状態を React state として受け取る。各タブで `useAnimatedReaction` + `runOnJS(setState)` を書く代わりにこれを使うと、自動的に centralized subscription 経由で動く
- **`TabsContextValue.subscriptions: TabSubscriptionAPI`** — Container が提供する subscription registry
  - `subscribeToActive(tabIndex, cb)` / `subscribeToNearby(tabIndex, cb)`: callback 登録 (unsubscribe 関数を返す)
  - `getInitialActive(tabIndex)` / `getInitialNearby(tabIndex)`: 初期値取得
  - callback は `(value: boolean, workletTime?: number) => void` シグネチャ。`workletTime` は hop latency 計測向けオプショナル引数
- `TabBoolSubscriber` 型を公開
- `useIsNearby` の内部実装を centralized subscription 経由に変更 (API 互換)

### Migration

- **完全後方互換**。既存 API (`useActiveTabIndex`, `useIsNearby` など) は変更なし。
- 特に `lazy={true}` の consumer は **何もしなくても自動的に** 10x mount bug fix の恩恵を受ける。
- 新コードでは `useIsTabActive(tabName)` を使うことで、各タブ側の boilerplate (`useAnimatedReaction` + `runOnJS(setState)`) を省略できる。

### Example

- NewsList から自前の `useAnimatedReaction(activeIndex)` を削除し、`ctx.subscriptions.subscribeToActive` を直接購読する形に変更 (hop latency 計測のため)
- perfLogger に `markActivation(category, workletTime?)` / `markReady` / `markUnmount` / `markMountCost` を追加。anchor を `markTabSwitch` (onTabChange は idle 遅延されるため不適) から `activation` に変更
- `example/PERF_METRICS.md` に指標の確定仕様を記載
- `example/.maestro/flows/swipe-perf.yml` に自動 perf 計測 flow を追加

## [4.3.3] - 2026-04-10

### Fixed

- `useIsNearby` hook: 初期値計算で SharedValue を render 中に読んでいた警告 (`Reading from \`value\` during component render`) を修正

### Example

- FPS ベースのパフォーマンスロガーを導入。タブスワイプレイテンシを 60fps/45fps/30fps/20fps のしきい値で評価
- Reanimated debug log を抑止（ノイズ削減）

## [4.3.2] - 2026-04-10

### Fixed

- **センタリング scrollTo が効かなかった問題を修正**: `useAnimatedRef` を custom setRef 経由で割り当てていたため ViewTag 登録が抜けて `reanimatedScrollTo` / `scrollTo` が silently 失敗していた。`Animated.ScrollView` の ref prop に直接渡すように修正
- forwardedRef は `useEffect` 経由で同期

## [4.3.1] - 2026-04-10

### Fixed

- **v4.3.0 の `useEvent` + `onPageScroll` worklet 化を revert**: `useEvent` の返り値は関数ではなくオブジェクトのため、PagerView の `onPageScroll` prop に直接渡せず実行時エラーになっていた (`onPageScroll is not a function (it is Object)`)
- v4.2.0 相当の `onPageSelected` 経由に戻した

## [4.3.0] - 2026-04-10

### Performance

- **`onPageScroll` を UI thread worklet で処理**: Reanimated の `useEvent` を使い、PagerView のネイティブイベントを JS thread を経由せず直接受け取る。JS thread がどれだけ busy でも `activeIndex` の更新が遅延しない
- `pageRealIndexes` を SharedValue 化し、worklet 内から直接参照
- 型は `PagerViewOnPageScrollEventData` を使った型合成で完全型安全（`any` 不使用）

## [4.2.0] - 2026-04-10

### Performance

- **タブバー中央寄せを worklet 内で直接駆動**: `useAnimatedReaction` 内で `reanimatedScrollTo(animatedRef)` を呼ぶ。JS thread を一切経由せず、リスト描画の重さから完全に切り離される
- `useAnimatedRef` でタブバー ScrollView を UI thread から直接操作
- インジケーター移動 + 中央寄せが完全に同一 worklet 内で実行される

## [4.1.0] - 2026-04-10

### Performance

- **インジケーター移動を worklet 内で直接駆動**: `useAnimatedReaction` 内で `withTiming` を実行し、JS thread を経由しない
- **タブラベル active 色の state 更新を rAF 遅延**: 現在フレームの gesture 処理を優先、次フレームで React re-render を実行
- タブスワイプ時のインジケーター追従がリスト描画の重さに一切影響されなくなった

### Fixed

- example / 利用側で `WorkletsBabelPluginError` が発生していたのを修正（v4.0.1 より）

## [4.0.2] - 2026-04-10

### Fixed

- `useActiveTabIndexValue` を index.tsx からエクスポート（v4.0.0 でエクスポート漏れ）

## [4.0.1] - 2026-04-10

### Fixed

- `useIsNearbyShared` hook を削除（worklet parser が getter 構文を解釈できない問題）
- 利用側で `WorkletsBabelPluginError` が発生していたのを修正

## [4.0.0] - 2026-04-10

### 🚨 BREAKING CHANGES

**`activeIndex` を JS state から SharedValue に変更。React re-render を完全排除。**

#### Before (v3.x)
```tsx
const activeIndex = useActiveTabIndex();  // number
const isFocused = activeIndex === myIndex;  // 毎回 re-render
```

#### After (v4.0)
```tsx
const activeIndex = useActiveTabIndex();  // SharedValue<number>
useAnimatedReaction(
  () => activeIndex.value,
  (current) => { /* UI thread で実行 */ },
);

// JS 値が必要な場合のみ（re-render 発生）:
const activeIndexValue = useActiveTabIndexValue();  // number
```

### API 変更

| API | v3.x | v4.0 |
|-----|------|------|
| `useActiveTabIndex()` | `number` | `SharedValue<number>` |
| `useNearbyIndexes()` | `number[]` | `SharedValue<number[]>` |
| `TabBarProps.activeIndex` | `number` | `SharedValue<number>` |
| `TabsContextValue.activeIndex` | `number` | `SharedValue<number>` |
| `TabsContextValue.nearbyIndexes` | `number[]` | `SharedValue<number[]>` |
| `useActiveTabIndexValue()` | - | **新規** `number`（re-render あり） |

### Performance

- **スワイプ時の JS thread 処理: 完全ゼロ**
- `setActiveIndex` (React state) → `activeIndex.value = n` (SharedValue) に変更
- Context value は SharedValue 参照のみを含むため、activeIndex 変更時も **Consumer が一切 re-render しない**
- PackList などの重いコンシューマーがスワイプを一切ブロックしない

### Architecture

```
PagerView onPageSelected (Native)
  ↓
activeIndex.value = n (UI thread, 0ms)
  ↓
  ├── useAnimatedReaction → インジケーター移動 (UI thread)
  ├── useDerivedValue → nearbyIndexes 計算 (UI thread)
  └── React re-render: ゼロ
```

### Migration Guide

1. `useActiveTabIndex()` の返り値を `.value` で読むか、`useActiveTabIndexValue()` に置き換え
2. `useNearbyIndexes()` の返り値を `.value` で読む
3. `TabBarProps.activeIndex` を直接比較してる箇所を `useAnimatedReaction` or `useActiveTabIndexValue` に

## [3.2.1] - 2026-04-10

### Performance

- **setActiveIndex を InteractionManager で遅延**: スワイプアニメーション完了まで React re-render を実行しない。連続スワイプ時に JS thread がフリーになり、次のジェスチャーが詰まらない
- 連続スワイプ中は古い pending setActiveIndex を cancel し、最新のみ実行

## [3.2.0] - 2026-04-10

### Breaking Changes

- **scrollProgress パイプラインを完全廃止**: `onPageScroll` ハンドラ、`scrollProgress` SharedValue、`useAnimatedReaction` によるリアルタイム追従を全て削除。スワイプとタブの非同期追従設計に移行
- `TabBarProps` から `scrollProgress` を削除

### Architecture: 非同期追従設計

```
リストスワイプ → PagerView がネイティブ60fps処理（JS thread 不使用）
             → スワイプ完了（onPageSelected）
               → setActiveIndex → withTiming でインジケーター追従

タブタップ → withTiming でインジケーター即移動
          → setPage で PagerView ページ切替
```

**お互いがお互いを待たない。先に動いた方が60fpsで完了し、後追いでもう片方が追従する。**

### Performance

- **JS thread のスワイプ中処理がゼロに**: `onPageScroll` callback が完全になくなったため、スワイプ中に JS thread が一切使われない
- コード約80行削減（scrollProgress 関連パイプライン全体）

## [3.1.0] - 2026-04-10

### Performance

- **onPageScroll を runOnUI worklet 化**: JS thread で受け取った scroll イベントを即座に `runOnUI` で UI thread に移行し、SharedValue 書き込みを UI thread で実行。JS thread の重い処理（React re-render 等）に一切影響されないインジケーター追従を実現
- `pageRealIndexes` を SharedValue 化: UI thread worklet 内からルックアップテーブルに直接アクセス

### Thread Architecture (v3.1.0)

```
Content swiping    → Native thread (PagerView)
scrollProgress     → JS callback → runOnUI → UI thread (SharedValue write)
Indicator sliding  → UI thread (Reanimated useAnimatedReaction)
Tab bar centering  → UI thread (Reanimated scrollTo)
Tab color update   → JS thread (React setState, minimized by lazy + memo)
```

## [3.0.1] - 2026-04-10

### Performance

- **タブバー scrollTo を UI thread 完結に**: `runOnJS(scrollTo)` → Reanimated `scrollTo(animatedRef)` に置き換え。JS thread を完全バイパスし、タブバーの中央寄せがネイティブスレッドで直接実行。スワイプ中の JS thread 混雑に一切影響されない
- `useAnimatedRef` でタブバー ScrollView を UI thread から直接操作
- throttle ロジック不要に（UI thread で毎フレーム実行しても問題ない）

## [3.0.0] - 2026-04-10

### Breaking Changes

- **無限スクロール方式を仮想インデックスに刷新**: 3セットクローン方式を廃止し、`tabs.length × 10` の仮想ページ空間を使用。中央から開始し、端に近づいた場合のみ巻き戻し。クローン境界での高速スワイプスタック問題を完全解消
- `VirtualPage.isClone` フィールドは常に `false`（クローンの概念が不要に）

### Performance

- **ジャンプ頻度ゼロ**: 5周スワイプしないと巻き戻しが発生しない（実質無限）
- **コード簡素化**: クローン生成 + ジャンプタイミング制御の約60行を削除
- **タブバー中央寄せを scrollProgress 連動に**: useEffect 経由（2-3フレーム遅延）→ useAnimatedReaction + runOnJS（1フレーム遅延）。スワイプ中にタブバーが滑らかに追従
- scrollTo のスロットル: 差分が2px未満の場合はスキップ

## [2.6.1] - 2026-04-10

### Fixed

- **setActiveIndex の idle 遅延を revert**: スワイプ中にタブのアクティブ色・インジケーターがずれる不具合を修正。`lazy={true}` により re-render 対象が3タブに限定されているため、即時 `setActiveIndex` でもパフォーマンスは十分
- `onTabChange` の idle 遅延は維持（アプリ側の Haptics / setState をスワイプ中に走らせない）

## [2.6.0] - 2026-04-10

### Added

- **`lazy` prop**: nearby でないタブのコンテンツをマウントしない。重いタブコンテンツ（hooks 多数、API fetch 等）のJS thread負荷を大幅削減。一度 nearby になったタブはアンマウントせず維持（React state 保持）
- **`useIsNearby(tabName)` hook**: アクティブまたは隣接タブかどうかを返す。`enabled: isFocused || isNearby` で隣接タブのデータ事前フェッチが可能に

### Performance

- **スワイプ中の re-render をゼロに**: `setActiveIndex` と `onTabChange` を idle まで遅延。スワイプ中は ref のみ更新し、idle 時に一括 flush
- **`handlePageScroll` 最適化**: pages 配列の毎フレーム参照をプリコンピュートしたルックアップテーブルに置き換え
- **`useNearbyIndexes()` hook**: 現在の nearbyIndexes（アクティブ + 隣接タブのインデックス配列）を返す
- **`offscreenPageLimit` prop**: PagerView のオフスクリーンページ数を外から制御可能に（デフォルト: 1）
- **Debug logging system**: `debug` prop で有効化、`onDebugLog` コールバックでアプリ側にログ転送。タブの active/nearby/unmounted 状態遷移、何が裏で描画されているかをリアルタイムで把握可能
- **`DebugLogEvent` 型**: debug ログの型定義をエクスポート
- DefaultTabBar に `activeColor` / `inactiveColor` / `indicatorStyle` props を追加

### Changed

- Context に `nearbyIndexes` を追加（`useTabsContext()` で取得可能）

## [2.5.0] - 2026-04-10

### Added

- **`scrollProgress` SharedValue**: PagerView の `onPageScroll` でスワイプ進捗をリアルタイム計測、TabBar に渡してインジケーターを60fps補間
- **リアルタイムインジケーター補間**: MaterialTabBar / DefaultTabBar が `useAnimatedReaction` で `scrollProgress` を購読し、スワイプ中にインジケーターが追従

### Changed

- `handleTabLayout` を `useState` + Map コピーから `useRef` + rAF バッチに変更（初回マウント時の re-render を60回→0回に削減）
- `tabLayouts` の二重管理（state → useEffect → SharedValue）を廃止、ref → rAF → SharedValue 直接書き込みに統一

### Fixed

- `isTabPressingRef` のリセット漏れ修正（タブタップ後のスワイプでインジケーター追従が死ぬバグ）
- 初回描画時にインジケーターが表示されない問題を修正
- `scrollEnabled={false}` 時のタブテキスト省略表示を修正

## [2.4.0] - 2026-04-09

### Fixed

- **Android ViewPager2 recycling crash**: 高速スワイプ中にクローン境界ジャンプが ViewPager2 の RecyclerView リサイクルと衝突し `IllegalArgumentException` が発生する問題を修正。`InteractionManager.runAfterInteractions` でリサイクル完了を待機、`setPageWithoutAnimation` を try-catch でラップ
- **PagerView state desync**: 高速スワイプ中に `setPageWithoutAnimation` がユーザージェスチャーと競合し、表示タブと内部 state が乖離する問題を修正。`isUserDraggingRef` でドラッグ中のジャンプを抑制、ドラッグ開始時に `pendingJumpIndexRef` をクリア

## [2.3.0] - 2026-04-07

### Added

- `onFocusedTabPress` コールバックを追加: 既にアクティブなタブが再タップされたときに呼び出される（scrollToTop 等の用途）

## [2.2.1] - 2026-04-07

### Fixed

- Android でタブバーのセンタリングアニメーションが効かない問題を修正（scrollTo 重複発火の防止）
- テスト環境が monorepo に依存していた問題を修正（devDependencies 追加、mock 整備）
- example アプリが Expo Go SDK 55 で起動しない問題を修正（NativeWorklets バージョン不一致）
- example の metro.config.js が monorepo の node_modules を参照し FormData クラッシュする問題を修正
- TabBar.test.tsx の変数名バグを修正

## [2.2.0] - 2026-04-06

### Added

- MaterialTabBar に centerActive サポートを追加

## [2.1.0] - 2026-04-06

### Changed

- Android タブスワイプの滑らかさを改善（Easing アニメーション追加）

## [2.0.0] - 2026-04-06

### Changed

- Expo SDK 55 / React Native 0.83 / React 19 対応
- タブセンタリングバグ修正

### Breaking Changes

- `react` >= 19.2.0、`react-native` >= 0.83.0 が必須に

## [1.0.0] - 2026-01-04

### Added

- Initial release
- Infinite horizontal scroll for tabs and content
- Active tab center alignment (auto-scrolls to center)
- Collapsible header support
- New Architecture (Fabric) ready
- Expo 54+ compatibility
- Drop-in replacement API for react-native-collapsible-tab-view
- `Tabs.Container` component with configurable props
- `Tabs.Tab` component for defining tabs
- `Tabs.FlatList` wrapper for virtualized lists
- `Tabs.ScrollView` wrapper for scroll content
- Custom tab bar support via `renderTabBar` prop
- TypeScript support with full type definitions
- iOS and Android support
