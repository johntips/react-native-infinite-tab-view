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
  runOnJS,
  type SharedValue,
  useAnimatedReaction,
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
  /** PagerView スクロール進捗（Container から自動で渡される） */
  scrollProgress?: SharedValue<number>;
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
      scrollProgress,
    },
    forwardedRef,
  ) => {
    const localScrollRef = useRef<ScrollViewType | null>(null);
    const hasInitiallyScrolled = useRef(false);
    const lastCenteredIndex = useRef<number | null>(null);

    // Merge forwarded ref and local ref
    const setRef = useCallback(
      (node: ScrollViewType | null) => {
        localScrollRef.current = node;
        if (typeof forwardedRef === "function") {
          forwardedRef(node);
        } else if (forwardedRef) {
          (
            forwardedRef as React.MutableRefObject<ScrollViewType | null>
          ).current = node;
        }
      },
      [forwardedRef],
    );
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

    // activeIndex に対応する仮想インデックス（中央セット）を取得
    const activeVirtualIndex = useMemo(() => {
      if (!infiniteScroll) return activeIndex;
      const centerOffset = tabs.length;
      return centerOffset + activeIndex;
    }, [activeIndex, infiniteScroll, tabs.length]);

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

    // scrollProgress ベースのリアルタイムインジケーター
    // scrollProgress は realIndex ベース（0.0〜tabs.length-1）なので
    // 中央セットのオフセットを加算して仮想インデックスに変換
    const centerOffset = infiniteScroll ? tabs.length : 0;

    // タブバー中央寄せ: scrollProgress からリアルタイムで ScrollView をスクロール
    // 毎フレーム呼ぶと重いので、前回の scrollTo 位置と差が大きい時のみ実行
    const lastScrollToX = useRef(0);
    const scrollTabBarToCenter = useCallback(
      (centerX: number) => {
        if (!scrollEnabled || !localScrollRef.current) return;
        // 前回との差が小さい場合はスキップ（throttle 代わり）
        if (Math.abs(centerX - lastScrollToX.current) < 2) return;
        lastScrollToX.current = centerX;
        const scrollX = centerX - SCREEN_WIDTH / 2;
        localScrollRef.current.scrollTo({
          x: Math.max(0, scrollX),
          animated: false,
        });
      },
      [scrollEnabled],
    );

    // scrollProgress が変化するたびにインジケーター位置を即座に更新（UI thread）
    // + タブバー中央寄せをリアルタイムで追従
    useAnimatedReaction(
      () => scrollProgress?.value,
      (progress) => {
        if (progress === undefined || progress === null) return;
        const xs = tabLayoutXs.value;
        const widths = tabLayoutWidths.value;
        if (xs.length === 0) return;

        // realIndex → virtualIndex（中央セット）
        const virtualProgress = progress + centerOffset;

        const currentIdx = Math.floor(virtualProgress);
        const nextIdx = currentIdx + 1;
        const fraction = virtualProgress - currentIdx;

        if (currentIdx < 0 || currentIdx >= xs.length) return;

        const currentX = xs[currentIdx] ?? 0;
        const currentW = widths[currentIdx] ?? 0;
        const nextX = nextIdx < xs.length ? (xs[nextIdx] ?? 0) : currentX;
        const nextW = nextIdx < xs.length ? (widths[nextIdx] ?? 0) : currentW;

        // インジケーター位置の補間
        const currentInset = currentW * 0.1;
        const nextInset = nextW * 0.1;

        const interpX =
          currentX +
          currentInset +
          (nextX + nextInset - (currentX + currentInset)) * fraction;
        const interpW =
          currentW -
          currentInset * 2 +
          (nextW - nextInset * 2 - (currentW - currentInset * 2)) * fraction;

        indicatorX.value = interpX;
        indicatorWidth.value = interpW;

        // タブバー中央寄せ: インジケーターの中央を画面中央に合わせる
        if (centerActive) {
          const indicatorCenter = interpX + interpW / 2;
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
      if (centerActive && scrollEnabled && localScrollRef.current) {
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
    }, [
      activeVirtualIndex,
      centerActive,
      scrollEnabled,
      indicatorX,
      indicatorWidth,
    ]);

    // flush 後のコールバックを登録
    layoutFlushCallbackRef.current = updateIndicatorAndCenter;

    // activeIndex 変更時（タブタップ）: withTiming でインジケーター移動 + センタリング
    // scrollProgress の有無に関係なく常に withTiming で移動する。
    // タブタップ時は isTabPressingRef=true で handlePageScroll がスキップされるため、
    // scrollProgress は更新されず useAnimatedReaction も動かない。
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

      // センタリング
      if (centerActive && scrollEnabled && localScrollRef.current) {
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
        ref={setRef}
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
