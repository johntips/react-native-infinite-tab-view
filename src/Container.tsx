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
  Dimensions,
  type ScrollView as RNScrollView,
  StyleSheet,
  View,
} from "react-native";
import type { PagerViewOnPageSelectedEvent } from "react-native-pager-view";
import PagerView from "react-native-pager-view";
import { useSharedValue } from "react-native-reanimated";
import { TabsProvider } from "./Context";
import {
  DEFAULT_TAB_ITEM_WIDTH,
  SCREEN_WIDTH,
  TAB_BAR_HEIGHT,
} from "./constants";
import { DefaultTabBar } from "./TabBar";
import type { TabsContainerProps } from "./types";
import { getCenterScrollPosition } from "./utils";

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
  containerStyle,
  headerContainerStyle,
  tabBarContainerStyle,
  allowHeaderOverscroll: _allowHeaderOverscroll = false,
}) => {
  // タブデータを子要素から抽出
  const tabs = useMemo(() => {
    const tabList: Array<{ name: string; label: string }> = [];
    Children.forEach(children, (child) => {
      if (isValidElement(child) && child.props.name && child.props.label) {
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
  // タブバー用仮想インデックス（最短経路計算に使用）
  const tabVirtualIndexRef = useRef(0);

  // PagerView refs
  const pagerRef = useRef<PagerView>(null);
  const isJumpingRef = useRef(false);
  const pendingJumpIndexRef = useRef<number | null>(null);

  // Reanimated SharedValue for scroll tracking (collapsible-tab-view compatibility)
  const scrollY = useSharedValue(0);

  const isScrollingProgrammatically = useRef(false);
  const hasTabInitialized = useRef(false);

  // --- 無限スクロール用タブバー仮想ページ ---
  // タブバーは従来通り ScrollView + 仮想ページ 3倍
  const TAB_VIRTUAL_MULTIPLIER = 3;
  const tabTotalVirtualPages = infiniteScroll
    ? tabs.length * TAB_VIRTUAL_MULTIPLIER
    : tabs.length;
  const tabMiddleVirtualIndex = infiniteScroll
    ? Math.floor(TAB_VIRTUAL_MULTIPLIER / 2) * tabs.length
    : 0;

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

  // タブ中央配置（仮想インデックス対応）
  const scrollTabToCenter = useCallback(
    (index: number) => {
      if (!tabBarCenterActive || !tabScrollRef.current) return;

      let targetIndex = index;
      if (infiniteScroll) {
        const currentVirtualIndex = tabVirtualIndexRef.current;
        const currentRealIndex = currentVirtualIndex % tabs.length;
        const indexDiff = index - currentRealIndex;

        // 最短経路で移動
        targetIndex = currentVirtualIndex + indexDiff;

        // 循環を考慮した最短経路
        if (Math.abs(indexDiff) > tabs.length / 2) {
          if (indexDiff > 0) {
            targetIndex = currentVirtualIndex - (tabs.length - indexDiff);
          } else {
            targetIndex = currentVirtualIndex + (tabs.length + indexDiff);
          }
        }

        tabVirtualIndexRef.current = targetIndex;
      }

      const scrollX = getCenterScrollPosition(
        targetIndex,
        [],
        SCREEN_WIDTH,
        DEFAULT_TAB_ITEM_WIDTH,
      );
      tabScrollRef.current.scrollTo({
        x: scrollX,
        animated: true,
      });
    },
    [tabBarCenterActive, infiniteScroll, tabs.length],
  );

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
      scrollTabToCenter(realIndex);

      if (realIndex !== prevIndex) {
        triggerTabChange(realIndex, prevIndex);
      }

      // クローンページの場合、対応するrealページへのジャンプを予約
      if (page.isClone && infiniteScroll && tabs.length > 1) {
        pendingJumpIndexRef.current = realStartIndex + realIndex;
      }
    },
    [
      pages,
      realStartIndex,
      infiniteScroll,
      tabs.length,
      scrollTabToCenter,
      triggerTabChange,
    ],
  );

  // onPageScrollStateChanged: スクロール状態が変わったときに呼ばれる
  // idle になったタイミングでクローン→realジャンプを実行
  const handlePageScrollStateChanged = useCallback(
    (e: {
      nativeEvent: { pageScrollState: "idle" | "dragging" | "settling" };
    }) => {
      if (e.nativeEvent.pageScrollState !== "idle") return;
      if (isJumpingRef.current) return;

      const jumpIndex = pendingJumpIndexRef.current;
      if (jumpIndex === null) return;

      isJumpingRef.current = true;
      pendingJumpIndexRef.current = null;

      requestAnimationFrame(() => {
        pagerRef.current?.setPageWithoutAnimation(jumpIndex);
        requestAnimationFrame(() => {
          isJumpingRef.current = false;
        });
      });
    },
    [],
  );

  // タブタップハンドラー
  const handleTabPress = useCallback(
    (newIndex: number) => {
      const normalized = normalizeIndex(newIndex);
      const prevIndex = prevActiveIndexRef.current;
      prevActiveIndexRef.current = normalized;
      setActiveIndex(normalized);
      scrollTabToCenter(normalized);

      if (normalized !== prevIndex) {
        triggerTabChange(normalized, prevIndex);
      }

      // PagerView のページ切替
      if (infiniteScroll && tabs.length > 1) {
        // realページ範囲内の対応するインデックスに移動
        const targetPagerIndex = realStartIndex + normalized;
        pagerRef.current?.setPage(targetPagerIndex);
      } else {
        pagerRef.current?.setPage(normalized);
      }
    },
    [
      normalizeIndex,
      scrollTabToCenter,
      triggerTabChange,
      infiniteScroll,
      tabs.length,
      realStartIndex,
    ],
  );

  // タブバースクロールハンドラー（エッジ検出とリセット）
  const handleTabScroll = useCallback(
    (event: any) => {
      if (!infiniteScroll) return;
      if (isScrollingProgrammatically.current) return;

      const offsetX = event.nativeEvent.contentOffset.x;
      const newVirtualIndex = Math.round(offsetX / DEFAULT_TAB_ITEM_WIDTH);

      tabVirtualIndexRef.current = newVirtualIndex;

      // エッジ検出とリセット
      const edgeThreshold = tabs.length;

      if (newVirtualIndex < edgeThreshold) {
        const normalized = normalizeIndex(newVirtualIndex);
        const targetVirtualIndex = tabMiddleVirtualIndex + normalized;
        tabVirtualIndexRef.current = targetVirtualIndex;

        requestAnimationFrame(() => {
          isScrollingProgrammatically.current = true;
          const scrollX = targetVirtualIndex * DEFAULT_TAB_ITEM_WIDTH;
          tabScrollRef.current?.scrollTo({
            x: scrollX,
            y: 0,
            animated: false,
          });
          requestAnimationFrame(() => {
            isScrollingProgrammatically.current = false;
          });
        });
      } else if (newVirtualIndex >= tabTotalVirtualPages - edgeThreshold) {
        const normalized = normalizeIndex(newVirtualIndex);
        const targetVirtualIndex = tabMiddleVirtualIndex + normalized;
        tabVirtualIndexRef.current = targetVirtualIndex;

        requestAnimationFrame(() => {
          isScrollingProgrammatically.current = true;
          const scrollX = targetVirtualIndex * DEFAULT_TAB_ITEM_WIDTH;
          tabScrollRef.current?.scrollTo({
            x: scrollX,
            y: 0,
            animated: false,
          });
          requestAnimationFrame(() => {
            isScrollingProgrammatically.current = false;
          });
        });
      }
    },
    [
      infiniteScroll,
      tabs.length,
      tabTotalVirtualPages,
      tabMiddleVirtualIndex,
      normalizeIndex,
    ],
  );

  // activeIndex変更時にタブを中央配置
  useEffect(() => {
    scrollTabToCenter(activeIndex);
  }, [activeIndex, scrollTabToCenter]);

  // タブバー初期スクロール位置設定（無限スクロール時）
  useEffect(() => {
    if (!hasTabInitialized.current && infiniteScroll && tabs.length > 0) {
      hasTabInitialized.current = true;
      tabVirtualIndexRef.current = tabMiddleVirtualIndex;

      requestAnimationFrame(() => {
        tabScrollRef.current?.scrollTo({
          x: tabMiddleVirtualIndex * DEFAULT_TAB_ITEM_WIDTH,
          y: 0,
          animated: false,
        });
      });
    }
  }, [infiniteScroll, tabs.length, tabMiddleVirtualIndex]);

  // scrollY を更新する関数（子コンポーネントから呼び出し用）
  const updateScrollY = useCallback(
    (y: number) => {
      scrollY.value = y;
    },
    [scrollY],
  );

  // タブ名の配列
  const tabNames = useMemo(() => tabs.map((t) => t.name), [tabs]);

  // Context値
  const contextValue = useMemo(
    () => ({
      activeIndex,
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

      if (isValidElement(child)) {
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
              onScroll: handleTabScroll,
            })
          ) : (
            <DefaultTabBar
              tabs={tabs}
              activeIndex={activeIndex}
              onTabPress={handleTabPress}
              infiniteScroll={infiniteScroll}
              centerActive={tabBarCenterActive}
              onScroll={handleTabScroll}
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
            offscreenPageLimit={1}
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
