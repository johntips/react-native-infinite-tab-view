import React, { forwardRef, useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ScrollView as ScrollViewType,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { TAB_ITEM_WIDTH } from "./constants";
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

export const MaterialTabBar = forwardRef<ScrollViewType, MaterialTabBarProps>(
  (
    {
      tabs,
      activeIndex,
      onTabPress,
      infiniteScroll,
      onScroll,
      activeColor = "#000",
      inactiveColor = "#666",
      scrollEnabled = true,
      indicatorStyle,
      labelStyle,
      style,
      tabStyle,
    },
    ref
  ) => {
    const totalVirtualTabs = infiniteScroll
      ? tabs.length * VIRTUAL_MULTIPLIER
      : tabs.length;

    // タブの幅を計算（scrollEnabled: false の場合は均等分割）
    const tabWidth = scrollEnabled ? TAB_ITEM_WIDTH : `${100 / tabs.length}%`;

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

    const renderTab = (
      tab: { name: string; label: string; virtualIndex: number; realIndex: number }
    ) => {
      const isActive = tab.realIndex === activeIndex;

      return (
        <TouchableOpacity
          key={`tab-${tab.virtualIndex}`}
          onPress={() => onTabPress(tab.realIndex)}
          style={[
            styles.tab,
            { width: tabWidth as any },
            tabStyle,
          ]}
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
          {isActive && (
            <View
              style={[
                styles.indicator,
                { backgroundColor: activeColor },
                indicatorStyle,
              ]}
            />
          )}
        </TouchableOpacity>
      );
    };

    if (!scrollEnabled) {
      // スクロール無効時は View でレンダリング
      return (
        <View style={[styles.container, style]}>
          {virtualTabs.map(renderTab)}
        </View>
      );
    }

    return (
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={[styles.scrollContainer, style]}
        contentContainerStyle={styles.scrollContent}
      >
        {virtualTabs.map(renderTab)}
      </ScrollView>
    );
  }
);

MaterialTabBar.displayName = "MaterialTabBar";

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    height: "100%",
  },
  scrollContainer: {
    backgroundColor: "#FFF",
    height: "100%",
  },
  scrollContent: {
    flexDirection: "row",
  },
  tab: {
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
  },
  indicator: {
    position: "absolute",
    bottom: 0,
    left: "10%",
    right: "10%",
    height: 3,
    borderRadius: 1.5,
  },
});
