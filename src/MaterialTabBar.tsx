import React, {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Dimensions,
  type LayoutChangeEvent,
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
  scrollTo as reanimatedScrollTo,
  runOnJS,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { DEFAULT_TAB_ITEM_WIDTH, INDICATOR_TIMING_CONFIG } from "./constants";
import type { TabBarProps } from "./types";

const SCREEN_WIDTH = Dimensions.get("window").width;

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
      centerActive,
      activeColor = "#000",
      inactiveColor = "#666",
      scrollEnabled = true,
      indicatorStyle,
      labelStyle,
      style,
      tabStyle,
    },
    forwardedRef,
  ) => {
    // useAnimatedRef を直接 Animated.ScrollView に渡す（worklet から scrollTo するため）
    // 内部の ViewTag 登録が有効化される
    const animatedScrollRef = useAnimatedRef<ScrollViewType>();
    const hasInitiallyScrolled = useRef(false);
    const lastCenteredIndex = useRef<number | null>(null);

    // forwardedRef を useEffect 経由で同期（useAnimatedRef の ViewTag 登録を妨げない）
    useEffect(() => {
      const node = animatedScrollRef.current;
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        (
          forwardedRef as React.MutableRefObject<ScrollViewType | null>
        ).current = node;
      }
    }, [forwardedRef, animatedScrollRef]);
    const totalVirtualTabs = infiniteScroll
      ? tabs.length * VIRTUAL_MULTIPLIER
      : tabs.length;

    // タブの幅を計算（scrollEnabled: false の場合は均等分割）
    const tabWidth = scrollEnabled
      ? DEFAULT_TAB_ITEM_WIDTH
      : `${100 / tabs.length}%`;

    // インジケーターの共有値
    const indicatorX = useSharedValue(0);
    const indicatorWidth = useSharedValue(
      typeof tabWidth === "number"
        ? tabWidth * 0.8
        : DEFAULT_TAB_ITEM_WIDTH * 0.8,
    );

    // タブレイアウト情報を SharedValue 化（UI thread でリアルタイム補間するため）
    const tabLayoutXs = useSharedValue<number[]>([]);
    const tabLayoutWidths = useSharedValue<number[]>([]);

    // タブレイアウトを useRef + rAF バッチで管理（state 更新を完全排除）
    // onLayout は60回発火するが、re-render は0回。rAF で1回だけ SharedValue に flush。
    const tabLayoutsRef = useRef<Map<number, TabLayout>>(new Map());
    const layoutFlushScheduled = useRef(false);
    const layoutFlushCallbackRef = useRef<(() => void) | null>(null);

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

    // activeIndex (SharedValue) に対応する仮想インデックスを算出
    const tabsLength = tabs.length;
    // タブラベルの active 色表示用の遅延 state
    // インジケーター移動とセンタリングは activeIndex SharedValue から worklet で直接駆動
    const [activeIndexState, setActiveIndexState] = useState(0);
    const setActiveIndexStateDeferred = useCallback((v: number) => {
      // 次フレームに遅延（現在フレームの gesture 処理を優先）
      requestAnimationFrame(() => setActiveIndexState(v));
    }, []);
    // インジケーター移動 + センタリングを worklet で直接駆動
    // JS thread を一切経由せず、リスト描画の重さに影響されない
    useAnimatedReaction(
      () => activeIndex.value,
      (current, prev) => {
        if (current === prev) return;

        const xs = tabLayoutXs.value;
        const widths = tabLayoutWidths.value;
        const virtIdx = infiniteScroll ? tabsLength + current : current;
        const targetX = xs[virtIdx];
        const targetW = widths[virtIdx];
        if (targetX !== undefined && targetW !== undefined && targetW > 0) {
          const inset = targetW * 0.1;
          indicatorX.value = withTiming(
            targetX + inset,
            INDICATOR_TIMING_CONFIG,
          );
          indicatorWidth.value = withTiming(
            targetW - inset * 2,
            INDICATOR_TIMING_CONFIG,
          );

          // タブバー中央寄せ: UI thread で直接 scrollTo（JS thread バイパス）
          if (centerActive && scrollEnabled) {
            const centerX = targetX + targetW / 2;
            const scrollX = Math.max(0, centerX - SCREEN_WIDTH / 2);
            reanimatedScrollTo(animatedScrollRef, scrollX, 0, false);
          }
        }

        if (prev !== null) {
          runOnJS(setActiveIndexStateDeferred)(current);
        }
      },
    );
    const activeVirtualIndex = infiniteScroll
      ? tabsLength + activeIndexState
      : activeIndexState;

    // rAF バッチ flush: ref のレイアウトデータを SharedValue に一括書き込み
    const flushLayouts = useCallback(() => {
      const map = tabLayoutsRef.current;
      const xs: number[] = [];
      const widths: number[] = [];
      const defaultW =
        typeof tabWidth === "number" ? tabWidth : DEFAULT_TAB_ITEM_WIDTH;
      for (let i = 0; i < virtualTabs.length; i++) {
        const layout = map.get(i);
        xs.push(layout?.x ?? 0);
        widths.push(layout?.width ?? defaultW);
      }
      tabLayoutXs.value = xs;
      tabLayoutWidths.value = widths;
      layoutFlushScheduled.current = false;

      // インジケーター初期化・センタリングのコールバックを実行
      if (layoutFlushCallbackRef.current) {
        layoutFlushCallbackRef.current();
      }
    }, [virtualTabs.length, tabWidth, tabLayoutXs, tabLayoutWidths]);

    // タブレイアウトの計測ハンドラ（re-render なし、rAF で1回だけ flush）
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

    // インジケーター初期化 + センタリングを rAF flush 後に実行
    const hasInitialIndicator = useRef(false);

    // rAF flush 後のコールバック: インジケーター初期化 + センタリング
    const updateIndicatorAndCenter = useCallback(() => {
      const layout = tabLayoutsRef.current.get(activeVirtualIndex);
      if (!layout) return;

      const inset = layout.width * 0.1;
      const targetX = layout.x + inset;
      const targetW = layout.width - inset * 2;

      if (!hasInitialIndicator.current) {
        indicatorX.value = targetX;
        indicatorWidth.value = targetW;
        hasInitialIndicator.current = true;
      }

      // センタリング
      if (centerActive && scrollEnabled && animatedScrollRef.current) {
        if (lastCenteredIndex.current !== activeVirtualIndex) {
          lastCenteredIndex.current = activeVirtualIndex;
          const scrollX = layout.x + layout.width / 2 - SCREEN_WIDTH / 2;
          const shouldAnimate = hasInitiallyScrolled.current;
          hasInitiallyScrolled.current = true;
          animatedScrollRef.current.scrollTo({
            x: Math.max(0, scrollX),
            animated: shouldAnimate,
          });
        }
      }
    }, [
      activeVirtualIndex,
      centerActive,
      scrollEnabled,
      indicatorX,
      indicatorWidth,
    ]);

    // flush 後のコールバックを登録
    layoutFlushCallbackRef.current = updateIndicatorAndCenter;

    // activeIndex 変更時: withTiming でインジケーター移動 + センタリング
    // v4: activeIndexState (useAnimatedReaction 経由) で変更検知
    useEffect(() => {
      if (!hasInitialIndicator.current) return;

      const layout = tabLayoutsRef.current.get(activeVirtualIndex);
      if (!layout) return;

      const inset = layout.width * 0.1;
      indicatorX.value = withTiming(layout.x + inset, INDICATOR_TIMING_CONFIG);
      indicatorWidth.value = withTiming(
        layout.width - inset * 2,
        INDICATOR_TIMING_CONFIG,
      );

      if (centerActive && scrollEnabled && animatedScrollRef.current) {
        if (lastCenteredIndex.current !== activeVirtualIndex) {
          lastCenteredIndex.current = activeVirtualIndex;
          const scrollX = layout.x + layout.width / 2 - SCREEN_WIDTH / 2;
          animatedScrollRef.current.scrollTo({
            x: Math.max(0, scrollX),
            animated: true,
          });
        }
      }
    }, [
      activeVirtualIndex,
      centerActive,
      scrollEnabled,
      indicatorX,
      indicatorWidth,
    ]);

    // インジケーターのアニメーションスタイル
    const animatedIndicatorStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: indicatorX.value }],
      width: indicatorWidth.value,
    }));

    const renderTabs = () =>
      virtualTabs.map((tab) => {
        const isActive = tab.realIndex === activeIndexState;
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
      <Animated.ScrollView
        ref={animatedScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        style={[styles.scrollContainer, style]}
        contentContainerStyle={styles.scrollContent}
      >
        {renderTabs()}
        {indicator}
      </Animated.ScrollView>
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
