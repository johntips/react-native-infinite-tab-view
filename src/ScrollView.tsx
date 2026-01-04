import type React from "react";
import { Animated } from "react-native";
import { useTabsContext } from "./Context";
import type { TabsScrollViewProps } from "./types";

export const ScrollView: React.FC<TabsScrollViewProps> = (props) => {
  const { scrollY } = useTabsContext();

  return (
    <Animated.ScrollView
      {...props}
      onScroll={Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        {
          useNativeDriver: true,
          listener: props.onScroll,
        },
      )}
      scrollEventThrottle={props.scrollEventThrottle ?? 16}
      contentContainerStyle={[{ paddingTop: 0 }, props.contentContainerStyle]}
    >
      {props.children}
    </Animated.ScrollView>
  );
};

ScrollView.displayName = "Tabs.ScrollView";
