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
  Animated,
  ScrollView as RNScrollView,
  StyleSheet,
  View,
} from "react-native";
import { TabsProvider } from "./Context";
import { SCREEN_WIDTH, TAB_BAR_HEIGHT, TAB_ITEM_WIDTH } from "./constants";
import { DefaultTabBar } from "./TabBar";
import type { TabsContainerProps } from "./types";
import { getCenterScrollPosition } from "./utils";

// 効率的な無限スクロールのための仮想ページ倍率（3倍で十分）
const VIRTUAL_MULTIPLIER = 3;

export const Container: React.FC<TabsContainerProps> = ({
  children,
  renderHeader,
  renderTabBar,
  headerHeight = 0,
  infiniteScroll = true,
  tabBarCenterActive = true,
  onTabChange,
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
  const contentScrollRef = useRef<RNScrollView>(null);
  const tabScrollRef = useRef<RNScrollView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const isScrollingProgrammatically = useRef(false);
  const hasInitialized = useRef(false);
  const hasTabInitialized = useRef(false);

  // 仮想インデックス（無限スクロール用）
  const virtualIndexRef = useRef(0); // コンテンツ用
  const tabVirtualIndexRef = useRef(0); // タブバー用
  const totalVirtualPages = infiniteScroll
    ? tabs.length * VIRTUAL_MULTIPLIER
    : tabs.length;
  const middleVirtualIndex = infiniteScroll
    ? Math.floor(VIRTUAL_MULTIPLIER / 2) * tabs.length
    : 0;

  // インデックス正規化（無限スクロール対応）
  const normalizeIndex = useCallback(
    (index: number): number => {
      if (!infiniteScroll) {
        return Math.max(0, Math.min(index, tabs.length - 1));
      }
      return ((index % tabs.length) + tabs.length) % tabs.length;
    },
    [tabs.length, infiniteScroll],
  );

  // タブ中央配置（仮想インデックス対応）
  const scrollTabToCenter = useCallback(
    (index: number) => {
      if (!tabBarCenterActive || !tabScrollRef.current) return;

      // 無限スクロール時は現在の仮想インデックス位置のタブをセンターに
      let targetIndex = index;
      if (infiniteScroll) {
        // 現在の仮想インデックスから、表示すべき仮想タブのインデックスを計算
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
        TAB_ITEM_WIDTH,
        SCREEN_WIDTH,
      );
      tabScrollRef.current.scrollTo({
        x: scrollX,
        animated: true,
      });
    },
    [tabBarCenterActive, infiniteScroll, tabs.length],
  );

  // タブ変更ハンドラー（統一ハンドラー）
  const handleIndexChange = useCallback(
    (newIndex: number) => {
      const normalized = normalizeIndex(newIndex);
      setActiveIndex(normalized);

      // タブ中央配置
      scrollTabToCenter(normalized);

      // コンテンツスクロール（仮想インデックスを使用）
      const currentVirtualIndex = virtualIndexRef.current;
      const currentRealIndex = currentVirtualIndex % tabs.length;
      const indexDiff = normalized - currentRealIndex;

      // 最短経路で移動
      let targetVirtualIndex = currentVirtualIndex + indexDiff;

      // 循環を考慮した最短経路
      if (infiniteScroll && Math.abs(indexDiff) > tabs.length / 2) {
        if (indexDiff > 0) {
          targetVirtualIndex = currentVirtualIndex - (tabs.length - indexDiff);
        } else {
          targetVirtualIndex = currentVirtualIndex + (tabs.length + indexDiff);
        }
      }

      virtualIndexRef.current = targetVirtualIndex;

      isScrollingProgrammatically.current = true;
      contentScrollRef.current?.scrollTo({
        x: targetVirtualIndex * SCREEN_WIDTH,
        y: 0,
        animated: true,
      });

      // コールバック
      if (onTabChange) {
        onTabChange(tabs[normalized].name);
      }

      setTimeout(() => {
        isScrollingProgrammatically.current = false;
      }, 300);
    },
    [normalizeIndex, scrollTabToCenter, tabs, onTabChange, infiniteScroll],
  );

  // タブタップハンドラー
  const handleTabPress = useCallback(
    (index: number) => {
      handleIndexChange(index);
    },
    [handleIndexChange],
  );

  // コンテンツスクロールハンドラー（仮想インデックス対応）
  const handleContentScroll = useCallback(
    (event: any) => {
      if (isScrollingProgrammatically.current) return;

      const offsetX = event.nativeEvent.contentOffset.x;
      const newVirtualIndex = Math.round(offsetX / SCREEN_WIDTH);
      const newRealIndex = newVirtualIndex % tabs.length;
      const normalized = normalizeIndex(newRealIndex);

      virtualIndexRef.current = newVirtualIndex;

      // activeIndexが変わった場合のみ更新
      if (normalized !== activeIndex) {
        setActiveIndex(normalized);
        scrollTabToCenter(normalized);

        if (onTabChange) {
          onTabChange(tabs[normalized].name);
        }
      }

      // エッジ検出とリセット（無限スクロール時）
      if (infiniteScroll) {
        const edgeThreshold = tabs.length; // 両端1セット分で検出

        if (newVirtualIndex < edgeThreshold) {
          // 左エッジに近づいたら中央にリセット
          const targetVirtualIndex = middleVirtualIndex + normalized;
          virtualIndexRef.current = targetVirtualIndex;
          setTimeout(() => {
            isScrollingProgrammatically.current = true;
            contentScrollRef.current?.scrollTo({
              x: targetVirtualIndex * SCREEN_WIDTH,
              y: 0,
              animated: false,
            });
            setTimeout(() => {
              isScrollingProgrammatically.current = false;
            }, 50);
          }, 100);
        } else if (newVirtualIndex >= totalVirtualPages - edgeThreshold) {
          // 右エッジに近づいたら中央にリセット
          const targetVirtualIndex = middleVirtualIndex + normalized;
          virtualIndexRef.current = targetVirtualIndex;
          setTimeout(() => {
            isScrollingProgrammatically.current = true;
            contentScrollRef.current?.scrollTo({
              x: targetVirtualIndex * SCREEN_WIDTH,
              y: 0,
              animated: false,
            });
            setTimeout(() => {
              isScrollingProgrammatically.current = false;
            }, 50);
          }, 100);
        }
      }
    },
    [
      activeIndex,
      tabs,
      normalizeIndex,
      scrollTabToCenter,
      onTabChange,
      infiniteScroll,
      totalVirtualPages,
      middleVirtualIndex,
    ],
  );

  // タブバースクロールハンドラー（エッジ検出とリセット）
  const handleTabScroll = useCallback(
    (event: any) => {
      if (!infiniteScroll) return;
      if (isScrollingProgrammatically.current) return;

      const offsetX = event.nativeEvent.contentOffset.x;
      const newVirtualIndex = Math.round(offsetX / TAB_ITEM_WIDTH);

      tabVirtualIndexRef.current = newVirtualIndex;

      // エッジ検出とリセット
      const edgeThreshold = tabs.length; // 両端1セット分で検出

      if (newVirtualIndex < edgeThreshold) {
        // 左エッジに近づいたら中央にリセット
        const normalized = normalizeIndex(newVirtualIndex);
        const targetVirtualIndex = middleVirtualIndex + normalized;
        tabVirtualIndexRef.current = targetVirtualIndex;

        setTimeout(() => {
          isScrollingProgrammatically.current = true;
          const scrollX = targetVirtualIndex * TAB_ITEM_WIDTH;
          tabScrollRef.current?.scrollTo({
            x: scrollX,
            y: 0,
            animated: false,
          });
          setTimeout(() => {
            isScrollingProgrammatically.current = false;
          }, 50);
        }, 100);
      } else if (newVirtualIndex >= totalVirtualPages - edgeThreshold) {
        // 右エッジに近づいたら中央にリセット
        const normalized = normalizeIndex(newVirtualIndex);
        const targetVirtualIndex = middleVirtualIndex + normalized;
        tabVirtualIndexRef.current = targetVirtualIndex;

        setTimeout(() => {
          isScrollingProgrammatically.current = true;
          const scrollX = targetVirtualIndex * TAB_ITEM_WIDTH;
          tabScrollRef.current?.scrollTo({
            x: scrollX,
            y: 0,
            animated: false,
          });
          setTimeout(() => {
            isScrollingProgrammatically.current = false;
          }, 50);
        }, 100);
      }
    },
    [
      infiniteScroll,
      tabs.length,
      totalVirtualPages,
      middleVirtualIndex,
      normalizeIndex,
    ],
  );

  // activeIndex変更時にタブを中央配置（タブタップ以外でも動作）
  useEffect(() => {
    scrollTabToCenter(activeIndex);
  }, [activeIndex, scrollTabToCenter]);

  // 初期スクロール位置設定（無限スクロール時）
  useEffect(() => {
    if (!hasInitialized.current && infiniteScroll && tabs.length > 0) {
      hasInitialized.current = true;
      virtualIndexRef.current = middleVirtualIndex;

      // 次のフレームで実行してレイアウト完了を待つ
      const timerId = setTimeout(() => {
        contentScrollRef.current?.scrollTo({
          x: middleVirtualIndex * SCREEN_WIDTH,
          y: 0,
          animated: false,
        });
      }, 0);

      return () => {
        clearTimeout(timerId);
      };
    }
    return undefined;
  }, [infiniteScroll, tabs.length, middleVirtualIndex]);

  // タブバー初期スクロール位置設定（無限スクロール時）
  useEffect(() => {
    if (!hasTabInitialized.current && infiniteScroll && tabs.length > 0) {
      hasTabInitialized.current = true;
      tabVirtualIndexRef.current = middleVirtualIndex;

      // 次のフレームで実行してレイアウト完了を待つ
      const timerId = setTimeout(() => {
        tabScrollRef.current?.scrollTo({
          x: middleVirtualIndex * TAB_ITEM_WIDTH,
          y: 0,
          animated: false,
        });
      }, 0);

      return () => {
        clearTimeout(timerId);
      };
    }
    return undefined;
  }, [infiniteScroll, tabs.length, middleVirtualIndex]);

  // Context値
  const contextValue = useMemo(
    () => ({
      activeIndex,
      tabs,
      scrollY,
      headerHeight,
      infiniteScroll,
      tabBarCenterActive,
    }),
    [
      activeIndex,
      tabs,
      scrollY,
      headerHeight,
      infiniteScroll,
      tabBarCenterActive,
    ],
  );

  // コンテンツビュー（仮想ページ生成）
  const contentViews = useMemo(() => {
    const childrenArray = Children.toArray(children);

    if (infiniteScroll) {
      // 無限スクロール時：仮想ページ生成
      return Array.from({ length: totalVirtualPages }, (_, virtualIndex) => {
        const realIndex = virtualIndex % tabs.length;
        const child = childrenArray[realIndex];

        if (isValidElement(child)) {
          return (
            <View key={`virtual-${virtualIndex}`} style={styles.page}>
              {child.props.children}
            </View>
          );
        }
        return null;
      });
    } else {
      // 通常時：有限ページ
      return Children.map(children, (child, index) => {
        if (isValidElement(child)) {
          return (
            <View key={tabs[index]?.name || index} style={styles.page}>
              {child.props.children}
            </View>
          );
        }
        return null;
      });
    }
  }, [children, tabs, infiniteScroll, totalVirtualPages]);

  return (
    <TabsProvider value={contextValue}>
      <View style={styles.container}>
        {/* ヘッダー */}
        {renderHeader && (
          <View style={{ height: headerHeight }}>{renderHeader()}</View>
        )}

        {/* タブバー */}
        <View style={styles.tabBarContainer}>
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

        {/* コンテンツエリア */}
        <RNScrollView
          ref={contentScrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleContentScroll}
          scrollEventThrottle={16}
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
        >
          {contentViews}
        </RNScrollView>
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
  scrollContent: {
    flexDirection: "row",
  },
  page: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
});
