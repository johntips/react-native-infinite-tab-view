/**
 * タブを画面中央に配置するためのスクロール位置を計算
 *
 * @param activeIndex - アクティブなタブのインデックス
 * @param tabItemWidth - タブアイテムの幅
 * @param screenWidth - 画面の幅
 * @returns スクロール位置（x座標）
 */
export const getCenterScrollPosition = (
  activeIndex: number,
  tabItemWidth: number,
  screenWidth: number,
): number => {
  // タブの中心位置を計算
  const tabCenterX = activeIndex * tabItemWidth + tabItemWidth / 2;

  // 画面中央に配置するためのスクロール位置
  const scrollX = tabCenterX - screenWidth / 2;

  // 負の値は0にクランプ（左端より左にはスクロールできない）
  return Math.max(0, scrollX);
};
