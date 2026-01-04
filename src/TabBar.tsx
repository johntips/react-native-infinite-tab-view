import { forwardRef, useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { TAB_BAR_HEIGHT, TAB_ITEM_WIDTH } from "./constants";
import type { TabBarProps } from "./types";

// 無限スクロール用の仮想タブ倍率
const VIRTUAL_MULTIPLIER = 3;

export const DefaultTabBar = forwardRef<ScrollView, TabBarProps>(
  (
    {
      tabs,
      activeIndex,
      onTabPress,
      infiniteScroll,
      centerActive,
      onScroll,
    },
    ref,
  ) => {
    // 仮想タブ生成
    const virtualTabs = useMemo(() => {
      if (!infiniteScroll) {
        return tabs.map((tab, index) => ({
          ...tab,
          realIndex: index,
          virtualIndex: index,
        }));
      }

      // 無限スクロール時：各タブを3回生成
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
            <TouchableOpacity
              key={`${tab.name}-${tab.virtualIndex}`}
              onPress={() => onTabPress(tab.realIndex)}
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
              {isActive && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          );
        })}
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
  },
  tabItem: {
    width: TAB_ITEM_WIDTH,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
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
    right: 0,
    height: 3,
    backgroundColor: "#000",
    borderRadius: 1.5,
  },
});
