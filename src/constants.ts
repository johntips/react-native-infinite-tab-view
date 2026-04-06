import { Dimensions, Platform } from "react-native";
import { Easing } from "react-native-reanimated";

export const TAB_BAR_HEIGHT = 48;
export const SCREEN_WIDTH = Dimensions.get("window").width;

// タブアイテムのデフォルト幅（動的幅のフォールバック値）
export const DEFAULT_TAB_ITEM_WIDTH = 100;

// インジケーターアニメーション設定（プラットフォーム別）
// Android は iOS より少し長めに設定し、Easing を付与して滑らかに
export const INDICATOR_TIMING_CONFIG = Platform.select({
  android: { duration: 280, easing: Easing.out(Easing.cubic) },
  default: { duration: 250, easing: Easing.out(Easing.cubic) },
})!;
