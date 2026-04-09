import React, {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  Dimensions,
  type LayoutChangeEvent,
  ScrollView,
  type StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  type ViewStyle,
} from "react-native";
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  DEFAULT_TAB_ITEM_WIDTH,
  INDICATOR_TIMING_CONFIG,
  TAB_BAR_HEIGHT,
} from "./constants";
import type { TabBarProps } from "./types";

const SCREEN_WIDTH = Dimensions.get("window").width;

// 無限スクロール用の仮想タブ倍率
const VIRTUAL_MULTIPLIER = 3;

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
    activeColor,
    inactiveColor,
    onPress,
    onLayout,
  }: {
    tab: VirtualTab;
    isActive: boolean;
    activeColor: string;
    inactiveColor: string;
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
          style={[
            styles.tabLabel,
            { color: isActive ? activeColor : inactiveColor },
            isActive && styles.tabLabelActiveBold,
          ]}
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

export interface DefaultTabBarProps extends TabBarProps {
  /** アクティブタブのテキスト/インジケーター色（デフォルト: "#000"） */
  activeColor?: string;
  /** 非アクティブタブのテキスト色（デフォルト: "#999"） */
  inactiveColor?: string;
  /** インジケーターのスタイル */
  indicatorStyle?: StyleProp<ViewStyle>;
}

export const DefaultTabBar = forwardRef<ScrollView, DefaultTabBarProps>(
  (
    {
      tabs,
      activeIndex,
      onTabPress,
      infiniteScroll,
      centerActive,
      scrollProgress,
      activeColor = "#000",
      inactiveColor = "#999",
      indicatorStyle: indicatorStyleProp,
    },
    forwardedRef,
  ) => {
    const localScrollRef = useRef<ScrollView | null>(null);

    // Merge forwarded ref and local ref
    const setRef = useCallback(
      (node: ScrollView | null) => {
        localScrollRef.current = node;
        if (typeof forwardedRef === "function") {
          forwardedRef(node);
        } else if (forwardedRef) {
          (forwardedRef as React.MutableRefObject<ScrollView | null>).current =
            node;
        }
      },
      [forwardedRef],
    );

    const hasInitiallyScrolled = useRef(false);
    const lastCenteredIndex = useRef<number | null>(null);

    // インジケーターの共有値
    const indicatorX = useSharedValue(0);
    const indicatorWidth = useSharedValue(DEFAULT_TAB_ITEM_WIDTH);

    // タブレイアウト情報を SharedValue 化（UI thread でリアルタイム補間するため）
    const tabLayoutXs = useSharedValue<number[]>([]);
    const tabLayoutWidths = useSharedValue<number[]>([]);

    // タブレイアウトを useRef + rAF バッチで管理（state 更新を完全排除）
    const tabLayoutsRef = useRef<Map<number, TabLayout>>(new Map());
    const layoutFlushScheduled = useRef(false);
    const layoutFlushCallbackRef = useRef<(() => void) | null>(null);

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

    // rAF バッチ flush
    const flushLayouts = useCallback(() => {
      const map = tabLayoutsRef.current;
      const xs: number[] = [];
      const widths: number[] = [];
      for (let i = 0; i < virtualTabs.length; i++) {
        const layout = map.get(i);
        xs.push(layout?.x ?? 0);
        widths.push(layout?.width ?? DEFAULT_TAB_ITEM_WIDTH);
      }
      tabLayoutXs.value = xs;
      tabLayoutWidths.value = widths;
      layoutFlushScheduled.current = false;
      if (layoutFlushCallbackRef.current) {
        layoutFlushCallbackRef.current();
      }
    }, [virtualTabs.length, tabLayoutXs, tabLayoutWidths]);

    // タブレイアウトの計測ハンドラ（re-render なし）
    const handleTabLayout = useCallback(
      (virtualIndex: number, event: LayoutChangeEvent) => {
        const { x, width } = event.nativeEvent.layout;
        tabLayoutsRef.current.set(virtualIndex, { x, width });
        if (!layoutFlushScheduled.current) {
          layoutFlushScheduled.current = true;
          requestAnimationFrame(flushLayouts);
        }
      },
      [flushLayouts],
    );

    // scrollProgress ベースのリアルタイムインジケーター + タブバー中央寄せ
    const centerOffset = infiniteScroll ? tabs.length : 0;

    const lastScrollToX = useRef(0);
    const scrollTabBarToCenter = useCallback((centerX: number) => {
      if (!localScrollRef.current) return;
      if (Math.abs(centerX - lastScrollToX.current) < 2) return;
      lastScrollToX.current = centerX;
      const scrollX = centerX - SCREEN_WIDTH / 2;
      localScrollRef.current.scrollTo({
        x: Math.max(0, scrollX),
        animated: false,
      });
    }, []);

    useAnimatedReaction(
      () => scrollProgress?.value,
      (progress) => {
        if (progress === undefined || progress === null) return;
        const xs = tabLayoutXs.value;
        const widths = tabLayoutWidths.value;
        if (xs.length === 0) return;

        const virtualProgress = progress + centerOffset;
        const currentIdx = Math.floor(virtualProgress);
        const nextIdx = currentIdx + 1;
        const fraction = virtualProgress - currentIdx;

        if (currentIdx < 0 || currentIdx >= xs.length) return;

        const currentX = xs[currentIdx] ?? 0;
        const currentW = widths[currentIdx] ?? 0;
        const nextX = nextIdx < xs.length ? (xs[nextIdx] ?? 0) : currentX;
        const nextW = nextIdx < xs.length ? (widths[nextIdx] ?? 0) : currentW;

        indicatorX.value = currentX + (nextX - currentX) * fraction;
        indicatorWidth.value = currentW + (nextW - currentW) * fraction;

        // タブバー中央寄せ
        if (centerActive) {
          const indicatorCenter = indicatorX.value + indicatorWidth.value / 2;
          runOnJS(scrollTabBarToCenter)(indicatorCenter);
        }
      },
      [
        scrollProgress,
        tabLayoutXs,
        tabLayoutWidths,
        centerOffset,
        centerActive,
        scrollTabBarToCenter,
      ],
    );

    // インジケーター初期化 + センタリング（rAF flush 後に実行）
    const hasInitialIndicator = useRef(false);

    const updateIndicatorAndCenter = useCallback(() => {
      const layout = tabLayoutsRef.current.get(activeVirtualIndex);
      if (!layout) return;

      if (!hasInitialIndicator.current) {
        indicatorX.value = layout.x;
        indicatorWidth.value = layout.width;
        hasInitialIndicator.current = true;
      }

      if (centerActive && localScrollRef.current) {
        if (lastCenteredIndex.current !== activeVirtualIndex) {
          lastCenteredIndex.current = activeVirtualIndex;
          const scrollX = layout.x + layout.width / 2 - SCREEN_WIDTH / 2;
          const shouldAnimate = hasInitiallyScrolled.current;
          hasInitiallyScrolled.current = true;
          localScrollRef.current.scrollTo({
            x: Math.max(0, scrollX),
            animated: shouldAnimate,
          });
        }
      }
    }, [activeVirtualIndex, centerActive, indicatorX, indicatorWidth]);

    layoutFlushCallbackRef.current = updateIndicatorAndCenter;

    // activeIndex 変更時（タブタップ）: scrollProgress の有無に関係なく withTiming で移動
    useEffect(() => {
      if (!hasInitialIndicator.current) return;

      const layout = tabLayoutsRef.current.get(activeVirtualIndex);
      if (!layout) return;

      indicatorX.value = withTiming(layout.x, INDICATOR_TIMING_CONFIG);
      indicatorWidth.value = withTiming(layout.width, INDICATOR_TIMING_CONFIG);

      if (centerActive && localScrollRef.current) {
        if (lastCenteredIndex.current !== activeVirtualIndex) {
          lastCenteredIndex.current = activeVirtualIndex;
          const scrollX = layout.x + layout.width / 2 - SCREEN_WIDTH / 2;
          localScrollRef.current.scrollTo({
            x: Math.max(0, scrollX),
            animated: true,
          });
        }
      }
    }, [
      activeVirtualIndex,
      centerActive,
      indicatorX,
      indicatorWidth,
      scrollProgress,
    ]);

    // インジケーターのアニメーションスタイル
    const indicatorStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: indicatorX.value }],
      width: indicatorWidth.value,
    }));

    return (
      <ScrollView
        ref={setRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.container}
        scrollEventThrottle={16}
      >
        {virtualTabs.map((tab) => {
          const isActive = tab.realIndex === activeIndex;
          return (
            <TabItem
              key={`${tab.name}-${tab.virtualIndex}`}
              tab={tab}
              isActive={isActive}
              activeColor={activeColor}
              inactiveColor={inactiveColor}
              onPress={() => onTabPress(tab.realIndex)}
              onLayout={(e) => handleTabLayout(tab.virtualIndex, e)}
            />
          );
        })}
        {/* スライドインジケーター */}
        <Animated.View
          style={[
            styles.activeIndicator,
            { backgroundColor: activeColor },
            indicatorStyleProp,
            indicatorStyle,
          ]}
        />
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
  },
  tabLabelActiveBold: {
    fontWeight: "700",
  },
  activeIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    height: 3,
    borderRadius: 1.5,
  },
});
