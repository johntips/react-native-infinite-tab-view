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
  type ScrollView as ScrollViewType,
  type StyleProp,
  StyleSheet,
  Text,
  type TextStyle,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { DEFAULT_TAB_ITEM_WIDTH, INDICATOR_TIMING_CONFIG } from "./constants";
import type { TabBarProps } from "./types";

export interface MaterialTabBarProps extends TabBarProps {
  /** アクティブタブのテキスト/インジケーター色 */
  activeColor?: string;
  /** 非アクティブタブのテキスト色 */
  inactiveColor?: string;
  /** タブバーをスクロール可能にするか */
  scrollEnabled?: boolean;
  /** インジケーターのスタイル */
  indicatorStyle?: StyleProp<ViewStyle>;
  /** ラベルのスタイル */
  labelStyle?: StyleProp<TextStyle>;
  /** タブバーのスタイル */
  style?: StyleProp<ViewStyle>;
  /** タブアイテムのスタイル */
  tabStyle?: StyleProp<ViewStyle>;
}

// 仮想ページ倍率
const VIRTUAL_MULTIPLIER = 3;

interface TabLayout {
  x: number;
  width: number;
}

interface VirtualTab {
  name: string;
  label: string;
  virtualIndex: number;
  realIndex: number;
}

// 個別タブアイテム（memo化で再レンダリング抑制）
const MaterialTabItem = React.memo(
  ({
    tab,
    isActive,
    activeColor,
    inactiveColor,
    labelStyle,
    tabStyle,
    tabWidth,
    onPress,
    onLayout,
  }: {
    tab: VirtualTab;
    isActive: boolean;
    activeColor: string;
    inactiveColor: string;
    labelStyle?: StyleProp<TextStyle>;
    tabStyle?: StyleProp<ViewStyle>;
    tabWidth: number | string;
    onPress: () => void;
    onLayout: (event: LayoutChangeEvent) => void;
  }) => {
    return (
      <TouchableOpacity
        onPress={onPress}
        onLayout={onLayout}
        style={[styles.tab, { width: tabWidth as number }, tabStyle]}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.label,
            { color: isActive ? activeColor : inactiveColor },
            labelStyle,
          ]}
          numberOfLines={1}
        >
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  },
);

MaterialTabItem.displayName = "MaterialTabItem";

export const MaterialTabBar = forwardRef<ScrollViewType, MaterialTabBarProps>(
  (
    {
      tabs,
      activeIndex,
      onTabPress,
      infiniteScroll,
      activeColor = "#000",
      inactiveColor = "#666",
      scrollEnabled = true,
      indicatorStyle,
      labelStyle,
      style,
      tabStyle,
    },
    ref,
  ) => {
    const totalVirtualTabs = infiniteScroll
      ? tabs.length * VIRTUAL_MULTIPLIER
      : tabs.length;

    // タブの幅を計算（scrollEnabled: false の場合は均等分割）
    const tabWidth = scrollEnabled
      ? DEFAULT_TAB_ITEM_WIDTH
      : `${100 / tabs.length}%`;

    const [tabLayouts, setTabLayouts] = useState<Map<number, TabLayout>>(
      new Map(),
    );

    // インジケーターの共有値
    const indicatorX = useSharedValue(0);
    const indicatorWidth = useSharedValue(
      typeof tabWidth === "number"
        ? tabWidth * 0.8
        : DEFAULT_TAB_ITEM_WIDTH * 0.8,
    );

    // 仮想タブを生成
    const virtualTabs = useMemo(() => {
      if (infiniteScroll) {
        return Array.from({ length: totalVirtualTabs }, (_, virtualIndex) => {
          const realIndex = virtualIndex % tabs.length;
          return {
            ...tabs[realIndex],
            virtualIndex,
            realIndex,
          };
        });
      }
      return tabs.map((tab, index) => ({
        ...tab,
        virtualIndex: index,
        realIndex: index,
      }));
    }, [tabs, infiniteScroll, totalVirtualTabs]);

    // activeIndex に対応する仮想インデックス（中央セット）を取得
    const activeVirtualIndex = useMemo(() => {
      if (!infiniteScroll) return activeIndex;
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
        // インジケーターはタブ幅の80%（左右10%マージン）
        const inset = layout.width * 0.1;
        indicatorX.value = withTiming(
          layout.x + inset,
          INDICATOR_TIMING_CONFIG,
        );
        indicatorWidth.value = withTiming(
          layout.width - inset * 2,
          INDICATOR_TIMING_CONFIG,
        );
      }
    }, [activeVirtualIndex, tabLayouts, indicatorX, indicatorWidth]);

    // インジケーターのアニメーションスタイル
    const animatedIndicatorStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: indicatorX.value }],
      width: indicatorWidth.value,
    }));

    const renderTabs = () =>
      virtualTabs.map((tab) => {
        const isActive = tab.realIndex === activeIndex;
        return (
          <MaterialTabItem
            key={`tab-${tab.virtualIndex}`}
            tab={tab}
            isActive={isActive}
            activeColor={activeColor}
            inactiveColor={inactiveColor}
            labelStyle={labelStyle}
            tabStyle={tabStyle}
            tabWidth={tabWidth}
            onPress={() => onTabPress(tab.realIndex)}
            onLayout={(e) => handleTabLayout(tab.virtualIndex, e)}
          />
        );
      });

    const indicator = (
      <Animated.View
        style={[
          styles.indicator,
          { backgroundColor: activeColor },
          indicatorStyle,
          animatedIndicatorStyle,
        ]}
      />
    );

    if (!scrollEnabled) {
      // スクロール無効時は View でレンダリング
      return (
        <View style={[styles.container, style]}>
          {renderTabs()}
          {indicator}
        </View>
      );
    }

    return (
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        style={[styles.scrollContainer, style]}
        contentContainerStyle={styles.scrollContent}
      >
        {renderTabs()}
        {indicator}
      </ScrollView>
    );
  },
);

MaterialTabBar.displayName = "MaterialTabBar";

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    height: "100%",
    position: "relative",
  },
  scrollContainer: {
    backgroundColor: "#FFF",
    height: "100%",
  },
  scrollContent: {
    flexDirection: "row",
    position: "relative",
  },
  tab: {
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
  },
  indicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    height: 3,
    borderRadius: 1.5,
  },
});
