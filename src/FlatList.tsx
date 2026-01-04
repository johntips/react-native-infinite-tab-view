import type React from "react";
import {
  Animated,
  type FlatListProps,
  FlatList as RNFlatList,
} from "react-native";
import { useTabsContext } from "./Context";
import type { TabsFlatListProps } from "./types";

// Animated.createAnimatedComponentで型安全なAnimatedFlatListを作成
const AnimatedFlatList = Animated.createAnimatedComponent(RNFlatList) as <T>(
  props: FlatListProps<T>,
) => React.ReactElement;

export const FlatList = <T,>({
  onScroll,
  scrollEventThrottle,
  contentContainerStyle,
  ...restProps
}: TabsFlatListProps<T>) => {
  const { scrollY } = useTabsContext();

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: true,
      listener: onScroll,
    },
  );

  return (
    <AnimatedFlatList<T>
      {...restProps}
      onScroll={handleScroll}
      scrollEventThrottle={scrollEventThrottle ?? 16}
      contentContainerStyle={[{ paddingTop: 0 }, contentContainerStyle]}
    />
  );
};

FlatList.displayName = "Tabs.FlatList";
