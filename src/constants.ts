import { Dimensions } from "react-native";

export const TAB_BAR_HEIGHT = 48;
export const SCREEN_WIDTH = Dimensions.get("window").width;

// タブアイテムの推定幅（実際はmeasureで取得推奨）
export const TAB_ITEM_WIDTH = 100;

// 無限スクロール用の仮想ページ数倍率
export const VIRTUAL_PAGE_MULTIPLIER = 100;

// アニメーション定数
export const SCROLL_ANIMATION_DURATION = 300;
export const SWIPE_THRESHOLD = 50;
