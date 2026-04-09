# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
