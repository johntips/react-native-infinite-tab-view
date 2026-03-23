import React, {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  type LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { DEFAULT_TAB_ITEM_WIDTH, TAB_BAR_HEIGHT } from "./constants";
import type { TabBarProps } from "./types";

// 無限スクロール用の仮想タブ倍率
const VIRTUAL_MULTIPLIER = 3;

// インジケーターアニメーション設定
const INDICATOR_TIMING_CONFIG = { duration: 200 };

interface TabLayout {
  x: number;
  width: number;
}

interface VirtualTab {
  name: string;
  label: string;
  realIndex: number;
  virtualIndex: number;
}

// 個別タブアイテム（memo化で再レンダリング抑制）
const TabItem = React.memo(
  ({
    tab,
    isActive,
    onPress,
    onLayout,
  }: {
    tab: VirtualTab;
    isActive: boolean;
    onPress: () => void;
    onLayout: (event: LayoutChangeEvent) => void;
  }) => {
    return (
      <TouchableOpacity
        onPress={onPress}
        onLayout={onLayout}
        style={styles.tabItem}
        activeOpacity={0.7}
      >
        <Text
          style={[styles.tabLabel, isActive && styles.tabLabelActive]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  },
);

TabItem.displayName = "TabItem";

export const DefaultTabBar = forwardRef<ScrollView, TabBarProps>(
  (
    { tabs, activeIndex, onTabPress, infiniteScroll, centerActive, onScroll },
    ref,
  ) => {
    const [tabLayouts, setTabLayouts] = useState<Map<number, TabLayout>>(
      new Map(),
    );

    // インジケーターの共有値
    const indicatorX = useSharedValue(0);
    const indicatorWidth = useSharedValue(DEFAULT_TAB_ITEM_WIDTH);

    // 仮想タブ生成
    const virtualTabs = useMemo(() => {
      if (!infiniteScroll) {
        return tabs.map((tab, index) => ({
          ...tab,
          realIndex: index,
          virtualIndex: index,
        }));
      }

      const totalVirtualTabs = tabs.length * VIRTUAL_MULTIPLIER;
      return Array.from({ length: totalVirtualTabs }, (_, virtualIndex) => {
        const realIndex = virtualIndex % tabs.length;
        return {
          ...tabs[realIndex],
          realIndex,
          virtualIndex,
        };
      });
    }, [tabs, infiniteScroll]);

    // activeIndex に対応する仮想インデックス（中央セット）を取得
    const activeVirtualIndex = useMemo(() => {
      if (!infiniteScroll) return activeIndex;
      // 中央セットのオフセット
      const centerOffset = tabs.length;
      return centerOffset + activeIndex;
    }, [activeIndex, infiniteScroll, tabs.length]);

    // タブレイアウトの計測ハンドラ
    const handleTabLayout = useCallback(
      (virtualIndex: number, event: LayoutChangeEvent) => {
        const { x, width } = event.nativeEvent.layout;
        setTabLayouts((prev) => {
          const next = new Map(prev);
          next.set(virtualIndex, { x, width });
          return next;
        });
      },
      [],
    );

    // activeIndex 変更時にインジケーターをアニメーション
    useEffect(() => {
      const layout = tabLayouts.get(activeVirtualIndex);
      if (layout) {
        indicatorX.value = withTiming(layout.x, INDICATOR_TIMING_CONFIG);
        indicatorWidth.value = withTiming(
          layout.width,
          INDICATOR_TIMING_CONFIG,
        );
      }
    }, [activeVirtualIndex, tabLayouts, indicatorX, indicatorWidth]);

    // インジケーターのアニメーションスタイル
    const indicatorStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: indicatorX.value }],
      width: indicatorWidth.value,
    }));

    return (
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.container}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {virtualTabs.map((tab) => {
          const isActive = tab.realIndex === activeIndex;
          return (
            <TabItem
              key={`${tab.name}-${tab.virtualIndex}`}
              tab={tab}
              isActive={isActive}
              onPress={() => onTabPress(tab.realIndex)}
              onLayout={(e) => handleTabLayout(tab.virtualIndex, e)}
            />
          );
        })}
        {/* スライドインジケーター */}
        <Animated.View style={[styles.activeIndicator, indicatorStyle]} />
      </ScrollView>
    );
  },
);

DefaultTabBar.displayName = "DefaultTabBar";

const styles = StyleSheet.create({
  container: {
    height: TAB_BAR_HEIGHT,
    backgroundColor: "#FFF",
  },
  scrollContent: {
    alignItems: "center",
    paddingHorizontal: 8,
    position: "relative",
  },
  tabItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#999",
  },
  tabLabelActive: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000",
  },
  activeIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    height: 3,
    backgroundColor: "#000",
    borderRadius: 1.5,
  },
});
