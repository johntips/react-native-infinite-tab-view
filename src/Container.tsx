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
import type { PagerViewOnPageSelectedEvent } from "react-native-pager-view";
import PagerView from "react-native-pager-view";
import {
  runOnJS,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";
import { TabsProvider } from "./Context";
import { SCREEN_WIDTH, TAB_BAR_HEIGHT } from "./constants";
import { DefaultTabBar } from "./TabBar";
import type {
  DebugLogEvent,
  TabBoolSubscriber,
  TabSubscriptionAPI,
  TabsContainerProps,
} from "./types";

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
  lazy = false,
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

  // activeIndex を SharedValue 化 — re-render なしで UI thread に値を伝播
  const activeIndex = useSharedValue(0);
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

  // --- PagerView 用仮想ページ配列 ---
  // 仮想インデックス方式: tabs.length × BUFFER_MULTIPLIER の仮想ページを生成
  // 各ページの realIndex = virtualIndex % tabs.length
  // 初期ページは中央付近に配置し、ユーザーが端に到達する前に巻き戻す
  const BUFFER_MULTIPLIER = 10;
  const pages: VirtualPage[] = useMemo(() => {
    if (!infiniteScroll || tabs.length <= 1) {
      return tabs.map((_, i) => ({ realIndex: i, isClone: false }));
    }
    const totalPages = tabs.length * BUFFER_MULTIPLIER;
    return Array.from({ length: totalPages }, (_, i) => ({
      realIndex: i % tabs.length,
      isClone: false,
    }));
  }, [tabs, infiniteScroll]);

  // 初期ページ: 中央付近で tabs.length の倍数に揃える
  const centerPage = useMemo(() => {
    if (!infiniteScroll || tabs.length <= 1) return 0;
    const center = Math.floor(pages.length / 2);
    return center - (center % tabs.length);
  }, [infiniteScroll, tabs.length, pages.length]);

  // pages ルックアップテーブル（onPageSelected で参照）
  const pageRealIndexesMemo = useMemo(
    () => pages.map((p) => p.realIndex),
    [pages],
  );

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

  // --- Lazy mount state (pagerIndex ベース) ---
  // v4.4.1 FIX: infinite scroll の BUFFER_MULTIPLIER=10 によって同じ realIndex を
  // 持つ 10 個の virtual page が存在するため、realIndex ベースの mount tracking では
  // consumer が 10x mount を強いられていた。pagerIndex をキーにすることで、user が
  // 実際に到達した virtual page だけが children を render される。
  //
  // 初期値: 初期ページ (centerPage or 0) の ± offscreenPageLimit 範囲。
  const initialPagerIndex = infiniteScroll && tabs.length > 1 ? centerPage : 0;

  const initialMountedPagerIndexes = useMemo(() => {
    const indexes = new Set<number>();
    for (let i = -offscreenPageLimit; i <= offscreenPageLimit; i++) {
      const pagerIdx = initialPagerIndex + i;
      if (pagerIdx >= 0 && pagerIdx < pages.length) {
        indexes.add(pagerIdx);
      }
    }
    return indexes;
  }, [offscreenPageLimit, initialPagerIndex, pages.length]);

  const [mountedPagerIndexes, setMountedPagerIndexes] = useState<Set<number>>(
    initialMountedPagerIndexes,
  );

  // pagerIndex とその ± offscreenPageLimit 近傍を mountedPagerIndexes に追加
  const addMountedPagerRange = useCallback(
    (centerPagerIndex: number) => {
      setMountedPagerIndexes((prev) => {
        let changed = false;
        const next = new Set(prev);
        for (let i = -offscreenPageLimit; i <= offscreenPageLimit; i++) {
          const pagerIdx = centerPagerIndex + i;
          if (pagerIdx >= 0 && pagerIdx < pages.length && !next.has(pagerIdx)) {
            next.add(pagerIdx);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    },
    [offscreenPageLimit, pages.length],
  );

  // 初期マウント時に initialMountedPagerIndexes を反映 (pages.length が後から確定するケース対応)
  useEffect(() => {
    if (!lazy) return;
    setMountedPagerIndexes((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const idx of initialMountedPagerIndexes) {
        if (!next.has(idx)) {
          next.add(idx);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [lazy, initialMountedPagerIndexes]);

  // --- PagerView イベントハンドラ ---

  // 1-C: onTabChange を idle まで遅延（Haptics / Zustand setState 等のアプリ側処理を
  // スワイプ中に走らせないため。setActiveIndex は即実行して正確性を維持）
  const pendingTabChangeRef = useRef<{
    newIndex: number;
    prevIndex: number;
  } | null>(null);

  // onPageSelected: ページが確定したときに呼ばれる
  // v4: SharedValue に直接書き込み → React re-render 発生せず UI thread に伝播
  const handlePageSelected = useCallback(
    (e: PagerViewOnPageSelectedEvent) => {
      if (isJumpingRef.current) return;

      const position = e.nativeEvent.position;
      const realIndex = pageRealIndexesMemo[position];
      if (realIndex === undefined) return;

      const prevIndex = prevActiveIndexRef.current;
      prevActiveIndexRef.current = realIndex;

      // ✅ SharedValue 書き込み: re-render ゼロ
      activeIndex.value = realIndex;

      if (realIndex !== prevIndex) {
        pendingTabChangeRef.current = { newIndex: realIndex, prevIndex };
      }

      // v4.4.1: lazy mode で pagerIndex 基準の mountedPagerIndexes を更新。
      // これにより user が到達した virtual page だけ children が render される。
      if (lazy) {
        addMountedPagerRange(position);
      }

      // 巻き戻し保険: 端に近づいたら中央に戻す
      if (infiniteScroll && tabs.length > 1) {
        const edgeThreshold = tabs.length * 5;
        if (
          position < edgeThreshold ||
          position > pages.length - edgeThreshold
        ) {
          pendingJumpIndexRef.current = centerPage + realIndex;
        }
      }
    },
    [
      pageRealIndexesMemo,
      activeIndex,
      infiniteScroll,
      tabs.length,
      pages.length,
      centerPage,
      lazy,
      addMountedPagerRange,
    ],
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

      // 1-C: idle 時に遅延した onTabChange を flush
      const pendingChange = pendingTabChangeRef.current;
      if (pendingChange) {
        pendingTabChangeRef.current = null;
        triggerTabChange(pendingChange.newIndex, pendingChange.prevIndex);
      }

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
    [triggerTabChange],
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
      // ✅ SharedValue 書き込み: re-render ゼロ
      activeIndex.value = normalized;
      triggerTabChange(normalized, prevIndex);

      // PagerView のページ切替 + lazy mount の pagerIndex を同期
      const targetPagerIndex =
        infiniteScroll && tabs.length > 1
          ? centerPage + normalized
          : normalized;
      if (lazy) {
        addMountedPagerRange(targetPagerIndex);
      }
      pagerRef.current?.setPage(targetPagerIndex);
    },
    [
      normalizeIndex,
      triggerTabChange,
      onFocusedTabPress,
      activeIndex,
      infiniteScroll,
      tabs.length,
      centerPage,
      lazy,
      addMountedPagerRange,
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

  // nearbyIndexes: activeIndex ± offscreenPageLimit の範囲（SharedValue で UI thread 計算）
  const tabsLength = tabs.length;
  const nearbyIndexes = useDerivedValue<number[]>(() => {
    const indexes: number[] = [];
    const current = activeIndex.value;
    for (
      let i = current - offscreenPageLimit;
      i <= current + offscreenPageLimit;
      i++
    ) {
      const normalized = infiniteScroll
        ? ((i % tabsLength) + tabsLength) % tabsLength
        : i;
      if (normalized >= 0 && normalized < tabsLength) {
        if (!indexes.includes(normalized)) {
          indexes.push(normalized);
        }
      }
    }
    return indexes;
  }, [activeIndex, offscreenPageLimit, tabsLength, infiniteScroll]);

  // debug log: activeIndex 変更を UI thread で検知して runOnJS で JS thread に通知
  const prevNearbyRef = useRef<number[]>([]);
  const logNearbyChange = useCallback(
    (current: number, nearby: number[]) => {
      if (!debug) return;
      const prev = prevNearbyRef.current;

      debugLog({
        type: "tab-active",
        tabName: tabs[current]?.name ?? "",
        tabIndex: current,
        detail: `nearby: [${nearby.map((i) => tabs[i]?.name).join(", ")}]`,
      });

      for (const idx of nearby) {
        if (idx !== current && !prev.includes(idx)) {
          debugLog({
            type: "tab-nearby",
            tabName: tabs[idx]?.name ?? "",
            tabIndex: idx,
            detail: "prefetch eligible",
          });
        }
      }

      for (const idx of prev) {
        if (!nearby.includes(idx)) {
          debugLog({
            type: "tab-unmounted",
            tabName: tabs[idx]?.name ?? "",
            tabIndex: idx,
          });
        }
      }

      prevNearbyRef.current = nearby;
    },
    [debug, debugLog, tabs],
  );

  useAnimatedReaction(
    () => ({ active: activeIndex.value, nearby: nearbyIndexes.value }),
    (curr, prev) => {
      if (prev && curr.active === prev.active) return;
      runOnJS(logNearbyChange)(curr.active, curr.nearby);
    },
  );

  // ========================================================================
  // v4.4.0: Centralized Tab Subscription
  //
  // 従来は N 個のタブ consumer が各自 useAnimatedReaction(activeIndex) を
  // 実行していた (N 個 worklet reaction + N 個 runOnJS 往復)。
  // 本改善ではそれを Container 側の 1 個の reaction に集約する。
  //
  // 効果 (計測済みベースライン: dispatch 400-750ms):
  //   - worklet 評価: N → 1 per swipe
  //   - runOnJS 往復: 最大 2N → 最大 2 per swipe (前アクティブ + 新アクティブ)
  //   - React commit phase: N setState batch → 2 setState batch
  //   - 期待値: dispatch 400-750ms → 30-100ms
  // ========================================================================

  // Subscriber registry: tabIndex -> Set<callback>
  // ref で保持し、subscribe/unsubscribe で mutate しても Container 自身は re-render しない
  const activeSubscribersRef = useRef<Map<number, Set<TabBoolSubscriber>>>(
    new Map(),
  );
  const nearbySubscribersRef = useRef<Map<number, Set<TabBoolSubscriber>>>(
    new Map(),
  );

  // 現在の active/nearby 状態 (初期値取得用、ref で保持)
  const currentActiveIndexRef = useRef(0);
  const currentNearbyIndexesRef = useRef<Set<number>>(new Set([0]));

  // JS thread で呼ばれる通知関数
  // workletTime は worklet 側で取った performance.now() 値 (hop 計測用、省略可)
  const notifyActiveChange = useCallback(
    (prev: number, current: number, workletTime?: number) => {
      currentActiveIndexRef.current = current;
      // prev を false に
      if (prev !== current && prev >= 0) {
        const set = activeSubscribersRef.current.get(prev);
        if (set) {
          for (const cb of set) cb(false, workletTime);
        }
      }
      // current を true に
      if (current >= 0) {
        const set = activeSubscribersRef.current.get(current);
        if (set) {
          for (const cb of set) cb(true, workletTime);
        }
      }
    },
    [],
  );

  const notifyNearbyChange = useCallback(
    (added: number[], removed: number[], currentSet: number[]) => {
      currentNearbyIndexesRef.current = new Set(currentSet);
      for (const idx of added) {
        const set = nearbySubscribersRef.current.get(idx);
        if (set) {
          for (const cb of set) cb(true);
        }
      }
      for (const idx of removed) {
        const set = nearbySubscribersRef.current.get(idx);
        if (set) {
          for (const cb of set) cb(false);
        }
      }
    },
    [],
  );

  // ★ Centralized reaction: activeIndex 単独 (前後 index を渡す)
  useAnimatedReaction(
    () => activeIndex.value,
    (current, prev) => {
      if (prev === null || prev === undefined || current === prev) return;
      // worklet 側で時刻を取って hop latency 計測に使う (performance.now() は
      // Reanimated 3+ の worklet context でも JS と同一時刻系で取得できる)
      // biome-ignore lint/suspicious/noExplicitAny: performance is a global in worklet context
      const workletTime = (globalThis as any).performance?.now?.() as
        | number
        | undefined;
      runOnJS(notifyActiveChange)(prev, current, workletTime);
    },
    [notifyActiveChange],
  );

  // ★ Centralized reaction: nearbyIndexes の変化を subscribers に伝える
  useAnimatedReaction(
    () => nearbyIndexes.value,
    (current, prev) => {
      if (!prev) return;
      // 差分計算を worklet 内で (JS thread にデータを渡す量を減らす)
      const added: number[] = [];
      const removed: number[] = [];
      for (const idx of current) {
        if (!prev.includes(idx)) added.push(idx);
      }
      for (const idx of prev) {
        if (!current.includes(idx)) removed.push(idx);
      }
      if (added.length === 0 && removed.length === 0) return;
      runOnJS(notifyNearbyChange)(added, removed, current);
    },
    [notifyNearbyChange],
  );

  // Subscribe API (Context 経由で consumer に提供)
  const subscriptionsAPI = useMemo<TabSubscriptionAPI>(
    () => ({
      subscribeToActive: (tabIndex, cb) => {
        let set = activeSubscribersRef.current.get(tabIndex);
        if (!set) {
          set = new Set();
          activeSubscribersRef.current.set(tabIndex, set);
        }
        set.add(cb);
        return () => {
          const s = activeSubscribersRef.current.get(tabIndex);
          if (s) {
            s.delete(cb);
            if (s.size === 0) activeSubscribersRef.current.delete(tabIndex);
          }
        };
      },
      subscribeToNearby: (tabIndex, cb) => {
        let set = nearbySubscribersRef.current.get(tabIndex);
        if (!set) {
          set = new Set();
          nearbySubscribersRef.current.set(tabIndex, set);
        }
        set.add(cb);
        return () => {
          const s = nearbySubscribersRef.current.get(tabIndex);
          if (s) {
            s.delete(cb);
            if (s.size === 0) nearbySubscribersRef.current.delete(tabIndex);
          }
        };
      },
      // SharedValue を直接読むことで、再マウント時でも最新値を正しく取得できる。
      // (currentActiveIndexRef は notifyActiveChange が発火した後しか更新されないため
      // 初回 mount のタイミングによっては古い値を返してしまう可能性がある)
      getInitialActive: (tabIndex) => activeIndex.value === tabIndex,
      getInitialNearby: (tabIndex) => nearbyIndexes.value.includes(tabIndex),
    }),
    [],
  );

  // 初回マウント時にデバッグログを発火（useAnimatedReaction の初回発火が環境依存のため）
  useEffect(() => {
    if (!debug) return;
    logNearbyChange(activeIndex.value, nearbyIndexes.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      subscriptions: subscriptionsAPI,
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
      subscriptionsAPI,
    ],
  );

  // コンテンツビュー（PagerView の children として生成）
  const contentViews = useMemo(() => {
    const childrenArray = Children.toArray(children);

    return pages.map((page, pagerIndex) => {
      const child = childrenArray[page.realIndex];

      // lazy モード: まだ一度も nearby になっていない **pagerIndex** は空 View
      // (realIndex ではなく pagerIndex でチェックするのがポイント)
      if (lazy && !mountedPagerIndexes.has(pagerIndex)) {
        return <View key={`pager-lazy-${pagerIndex}`} style={styles.page} />;
      }

      if (isValidElement<{ children: React.ReactNode }>(child)) {
        return (
          <View key={`pager-${pagerIndex}`} style={styles.page}>
            {child.props.children}
          </View>
        );
      }
      return <View key={`pager-empty-${pagerIndex}`} style={styles.page} />;
    });
  }, [children, pages, lazy, mountedPagerIndexes]);

  // 初期ページ（PagerView の initialPage）
  const initialPage = infiniteScroll && tabs.length > 1 ? centerPage : 0;

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
            })
          ) : (
            <DefaultTabBar
              tabs={tabs}
              activeIndex={activeIndex}
              onTabPress={handleTabPress}
              infiniteScroll={infiniteScroll}
              centerActive={tabBarCenterActive}
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
