import type React from "react";
import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  InteractionManager,
  Platform,
  type ScrollView as RNScrollView,
  StyleSheet,
  View,
} from "react-native";
import type {
  PagerViewOnPageScrollEvent,
  PagerViewOnPageSelectedEvent,
} from "react-native-pager-view";
import PagerView from "react-native-pager-view";
import { useSharedValue } from "react-native-reanimated";
import { TabsProvider } from "./Context";
import { SCREEN_WIDTH, TAB_BAR_HEIGHT } from "./constants";
import { DefaultTabBar } from "./TabBar";
import type { DebugLogEvent, TabsContainerProps } from "./types";

interface VirtualPage {
  /** 実タブのインデックス (0..tabs.length-1) */
  realIndex: number;
  /** クローンかどうか */
  isClone: boolean;
}

export const Container: React.FC<TabsContainerProps> = ({
  children,
  renderHeader,
  renderTabBar,
  headerHeight = 0,
  infiniteScroll = true,
  tabBarCenterActive = true,
  onTabChange,
  onFocusedTabPress,
  containerStyle,
  headerContainerStyle,
  tabBarContainerStyle,
  allowHeaderOverscroll: _allowHeaderOverscroll = false,
  offscreenPageLimit = 1,
  debug = false,
  onDebugLog,
}) => {
  // デバッグログ: production ではデフォルト off、オプトインで有効化
  const debugLog = useCallback(
    (event: Omit<DebugLogEvent, "timestamp">) => {
      if (!debug) return;
      const fullEvent: DebugLogEvent = { ...event, timestamp: Date.now() };
      if (__DEV__) {
        console.log(
          `[rn-infinite-tab-view] ${event.type} | ${event.tabName} (idx:${event.tabIndex})${event.detail ? ` | ${event.detail}` : ""}`,
        );
      }
      onDebugLog?.(fullEvent);
    },
    [debug, onDebugLog],
  );
  // タブデータを子要素から抽出
  const tabs = useMemo(() => {
    const tabList: Array<{ name: string; label: string }> = [];
    Children.forEach(children, (child) => {
      if (
        isValidElement<{ name: string; label: string }>(child) &&
        child.props.name &&
        child.props.label
      ) {
        tabList.push({
          name: child.props.name,
          label: child.props.label,
        });
      }
    });
    return tabList;
  }, [children]);

  const [activeIndex, setActiveIndex] = useState(0);
  const prevActiveIndexRef = useRef(0);
  const tabScrollRef = useRef<RNScrollView>(null);

  // PagerView refs
  const pagerRef = useRef<PagerView>(null);
  const isJumpingRef = useRef(false);
  const pendingJumpIndexRef = useRef<number | null>(null);

  // Issue 1 & 2: スクロール状態追跡（ジャンプ安全性向上）
  const pageScrollStateRef = useRef<"idle" | "dragging" | "settling">("idle");
  const isUserDraggingRef = useRef(false);

  // Reanimated SharedValue for scroll tracking (collapsible-tab-view compatibility)
  const scrollY = useSharedValue(0);

  // PagerView のスクロール進捗（realIndex ベースの連続値）
  // 例: タブ0→1 スワイプ中に 0.0〜1.0、タブ2→3 で 2.0〜3.0
  const scrollProgress = useSharedValue(0);

  // --- PagerView 用仮想ページ配列 ---
  // 無限スクロール時: [head clones] + [real] + [tail clones]
  // head clones = tabs のコピー (インデックス 0..N-1)
  // real        = tabs のコピー (インデックス N..2N-1)
  // tail clones = tabs のコピー (インデックス 2N..3N-1)
  const pages: VirtualPage[] = useMemo(() => {
    if (!infiniteScroll || tabs.length <= 1) {
      return tabs.map((_, i) => ({ realIndex: i, isClone: false }));
    }
    const head = tabs.map((_, i) => ({ realIndex: i, isClone: true }));
    const real = tabs.map((_, i) => ({ realIndex: i, isClone: false }));
    const tail = tabs.map((_, i) => ({ realIndex: i, isClone: true }));
    return [...head, ...real, ...tail];
  }, [tabs, infiniteScroll]);

  // realページの開始インデックス（PagerView 内での位置）
  const realStartIndex = infiniteScroll && tabs.length > 1 ? tabs.length : 0;

  // インデックス正規化
  const normalizeIndex = useCallback(
    (index: number): number => {
      if (!infiniteScroll) {
        return Math.max(0, Math.min(index, tabs.length - 1));
      }
      return ((index % tabs.length) + tabs.length) % tabs.length;
    },
    [tabs.length, infiniteScroll],
  );

  // onTabChange を呼び出すヘルパー
  const triggerTabChange = useCallback(
    (newIndex: number, prevIndex: number) => {
      if (onTabChange && tabs[newIndex] && tabs[prevIndex]) {
        onTabChange({
          tabName: tabs[newIndex].name,
          index: newIndex,
          prevTabName: tabs[prevIndex].name,
          prevIndex: prevIndex,
        });
      }
    },
    [onTabChange, tabs],
  );

  // タブ中央配置は TabBar コンポーネント側で計測済みレイアウトを使って処理

  // --- PagerView イベントハンドラ ---

  // onPageSelected: ページが確定したときに呼ばれる
  const handlePageSelected = useCallback(
    (e: PagerViewOnPageSelectedEvent) => {
      if (isJumpingRef.current) return;

      const position = e.nativeEvent.position;
      const page = pages[position];
      if (!page) return;

      const realIndex = page.realIndex;

      // 実タブのインデックスを更新
      const prevIndex = prevActiveIndexRef.current;
      prevActiveIndexRef.current = realIndex;
      setActiveIndex(realIndex);

      if (realIndex !== prevIndex) {
        triggerTabChange(realIndex, prevIndex);
      }

      // クローンページの場合、対応するrealページへのジャンプを予約
      // Issue 2: ユーザーがドラッグ中はジャンプ予約をスキップ（state desync 防止）
      if (page.isClone && infiniteScroll && tabs.length > 1) {
        if (!isUserDraggingRef.current) {
          pendingJumpIndexRef.current = realStartIndex + realIndex;
        }
      }
    },
    [pages, realStartIndex, infiniteScroll, tabs.length, triggerTabChange],
  );

  // タブタップ中フラグ（onPageScroll の scrollProgress 更新をスキップ）
  // タブタップ → setPage でアニメーションが走ると onPageScroll も発火するが、
  // この間は useEffect の withTiming に任せ、二重更新の競合を防ぐ
  const isTabPressingRef = useRef(false);

  // onPageScroll: スワイプ中にリアルタイムで呼ばれる
  // position + offset を realIndex ベースの連続値に変換して scrollProgress に書き込む
  const handlePageScroll = useCallback(
    (e: PagerViewOnPageScrollEvent) => {
      if (isJumpingRef.current) return;
      if (isTabPressingRef.current) return;

      const { position, offset } = e.nativeEvent;
      const page = pages[position];
      if (!page) return;

      // 次のページの realIndex を取得（スワイプ方向の補間に必要）
      const nextPage = pages[position + 1];
      const currentReal = page.realIndex;
      const nextReal = nextPage ? nextPage.realIndex : currentReal;

      // realIndex ベースの連続値に変換
      // 通常: currentReal + offset（例: 0 + 0.5 = 0.5）
      // ラップアラウンド（最後→最初）: 特別処理
      if (nextReal < currentReal && offset > 0) {
        // 例: realIndex 5→0 のラップ: tabs.length-1 + offset で表現
        scrollProgress.value = currentReal + offset;
      } else {
        scrollProgress.value = currentReal + (nextReal - currentReal) * offset;
      }
    },
    [pages, scrollProgress],
  );

  // onPageScrollStateChanged: スクロール状態が変わったときに呼ばれる
  // idle になったタイミングでクローン→realジャンプを実行
  const handlePageScrollStateChanged = useCallback(
    (e: {
      nativeEvent: { pageScrollState: "idle" | "dragging" | "settling" };
    }) => {
      const state = e.nativeEvent.pageScrollState;
      pageScrollStateRef.current = state;

      // Issue 2: ドラッグ開始時にペンディングジャンプをキャンセル（state desync 防止）
      if (state === "dragging") {
        isUserDraggingRef.current = true;
        pendingJumpIndexRef.current = null;
        return;
      }
      if (state === "settling") {
        return;
      }

      // state === "idle"
      isUserDraggingRef.current = false;
      isTabPressingRef.current = false; // タブタップ由来のアニメーション完了
      if (isJumpingRef.current) {
        isJumpingRef.current = false;
        return;
      }

      const jumpIndex = pendingJumpIndexRef.current;
      if (jumpIndex === null) return;

      // Issue 2: idle 直前に再度 dragging になっていないか再チェック
      if (pageScrollStateRef.current !== "idle") return;

      isJumpingRef.current = true;
      pendingJumpIndexRef.current = null;

      const executeJump = () => {
        // Issue 1: try-catch で ViewPager2 recycling crash を防止
        try {
          pagerRef.current?.setPageWithoutAnimation(jumpIndex);
        } catch {
          // Android ViewPager2 の "Scrapped or attached views may not be recycled" を握りつぶす
        }
        requestAnimationFrame(() => {
          isJumpingRef.current = false;
        });
      };

      // Issue 1: Android では InteractionManager で ViewPager2 のリサイクル完了を待つ
      if (Platform.OS === "android") {
        InteractionManager.runAfterInteractions(() => {
          requestAnimationFrame(executeJump);
        });
      } else {
        requestAnimationFrame(executeJump);
      }
    },
    [],
  );

  // タブタップハンドラー
  const handleTabPress = useCallback(
    (newIndex: number) => {
      const normalized = normalizeIndex(newIndex);
      const prevIndex = prevActiveIndexRef.current;

      if (normalized === prevIndex) {
        onFocusedTabPress?.(normalized);
        return;
      }

      prevActiveIndexRef.current = normalized;
      setActiveIndex(normalized);
      triggerTabChange(normalized, prevIndex);

      // タブタップ中は scrollProgress 更新をスキップ（withTiming と競合防止）
      isTabPressingRef.current = true;

      // PagerView のページ切替
      if (infiniteScroll && tabs.length > 1) {
        const targetPagerIndex = realStartIndex + normalized;
        pagerRef.current?.setPage(targetPagerIndex);
      } else {
        pagerRef.current?.setPage(normalized);
      }
    },
    [
      normalizeIndex,
      triggerTabChange,
      onFocusedTabPress,
      infiniteScroll,
      tabs.length,
      realStartIndex,
    ],
  );

  // タブバーのセンタリング・無限スクロールは TabBar 側で計測済みレイアウトを使って処理

  // scrollY を更新する関数（子コンポーネントから呼び出し用）
  const updateScrollY = useCallback(
    (y: number) => {
      scrollY.value = y;
    },
    [scrollY],
  );

  // タブ名の配列
  const tabNames = useMemo(() => tabs.map((t) => t.name), [tabs]);

  // nearbyIndexes: activeIndex ± offscreenPageLimit の範囲内のインデックス
  const nearbyIndexes = useMemo(() => {
    const indexes: number[] = [];
    for (
      let i = activeIndex - offscreenPageLimit;
      i <= activeIndex + offscreenPageLimit;
      i++
    ) {
      // infiniteScroll の場合はラップアラウンド
      const normalized = infiniteScroll
        ? ((i % tabs.length) + tabs.length) % tabs.length
        : i;
      if (normalized >= 0 && normalized < tabs.length) {
        if (!indexes.includes(normalized)) {
          indexes.push(normalized);
        }
      }
    }
    return indexes;
  }, [activeIndex, offscreenPageLimit, tabs.length, infiniteScroll]);

  // debug log: activeIndex / nearbyIndexes 変更時にログ出力
  const prevNearbyRef = useRef<number[]>([]);
  useEffect(() => {
    if (!debug) return;
    const prev = prevNearbyRef.current;

    // アクティブタブのログ
    debugLog({
      type: "tab-active",
      tabName: tabs[activeIndex]?.name ?? "",
      tabIndex: activeIndex,
      detail: `nearby: [${nearbyIndexes.map((i) => tabs[i]?.name).join(", ")}]`,
    });

    // 新しく nearby になったタブ
    for (const idx of nearbyIndexes) {
      if (idx !== activeIndex && !prev.includes(idx)) {
        debugLog({
          type: "tab-nearby",
          tabName: tabs[idx]?.name ?? "",
          tabIndex: idx,
          detail: "prefetch eligible",
        });
      }
    }

    // nearby から外れたタブ
    for (const idx of prev) {
      if (!nearbyIndexes.includes(idx)) {
        debugLog({
          type: "tab-unmounted",
          tabName: tabs[idx]?.name ?? "",
          tabIndex: idx,
        });
      }
    }

    prevNearbyRef.current = nearbyIndexes;
  }, [activeIndex, nearbyIndexes, tabs, debug, debugLog]);

  // Context値
  const contextValue = useMemo(
    () => ({
      activeIndex,
      nearbyIndexes,
      tabs,
      scrollY,
      headerHeight,
      infiniteScroll,
      tabBarCenterActive,
      updateScrollY,
      tabNames,
    }),
    [
      activeIndex,
      nearbyIndexes,
      tabs,
      scrollY,
      headerHeight,
      infiniteScroll,
      tabBarCenterActive,
      updateScrollY,
      tabNames,
    ],
  );

  // コンテンツビュー（PagerView の children として生成）
  const contentViews = useMemo(() => {
    const childrenArray = Children.toArray(children);

    return pages.map((page, pagerIndex) => {
      const child = childrenArray[page.realIndex];

      if (isValidElement<{ children: React.ReactNode }>(child)) {
        return (
          <View
            key={`pager-${page.isClone ? "clone" : "real"}-${pagerIndex}`}
            style={styles.page}
          >
            {child.props.children}
          </View>
        );
      }
      return <View key={`pager-empty-${pagerIndex}`} style={styles.page} />;
    });
  }, [children, pages]);

  // 初期ページ（PagerView の initialPage）
  const initialPage = infiniteScroll && tabs.length > 1 ? realStartIndex : 0;

  return (
    <TabsProvider value={contextValue}>
      <View style={[styles.container, containerStyle]}>
        {/* ヘッダー */}
        {renderHeader && (
          <View
            style={[
              headerHeight > 0 && { height: headerHeight },
              headerContainerStyle,
            ]}
          >
            {renderHeader()}
          </View>
        )}

        {/* タブバー */}
        <View style={[styles.tabBarContainer, tabBarContainerStyle]}>
          {renderTabBar ? (
            renderTabBar({
              tabs,
              activeIndex,
              onTabPress: handleTabPress,
              infiniteScroll,
              centerActive: tabBarCenterActive,
              scrollProgress,
            })
          ) : (
            <DefaultTabBar
              tabs={tabs}
              activeIndex={activeIndex}
              onTabPress={handleTabPress}
              infiniteScroll={infiniteScroll}
              centerActive={tabBarCenterActive}
              scrollProgress={scrollProgress}
              ref={tabScrollRef}
            />
          )}
        </View>

        {/* コンテンツエリア（PagerView） */}
        <View style={styles.content}>
          <PagerView
            ref={pagerRef}
            style={styles.pagerView}
            initialPage={initialPage}
            offscreenPageLimit={offscreenPageLimit}
            onPageScroll={handlePageScroll}
            onPageSelected={handlePageSelected}
            onPageScrollStateChanged={handlePageScrollStateChanged}
          >
            {contentViews}
          </PagerView>
        </View>
      </View>
    </TabsProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  tabBarContainer: {
    height: TAB_BAR_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  content: {
    flex: 1,
  },
  pagerView: {
    flex: 1,
  },
  page: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
});
