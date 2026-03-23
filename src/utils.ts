/**
 * タブを画面中央に配置するためのスクロール位置を計算
 * 動的タブ幅に対応
 *
 * @param activeIndex - アクティブなタブのインデックス
 * @param tabWidths - 各タブの幅の配列
 * @param screenWidth - 画面の幅
 * @param defaultWidth - タブ幅が未計測の場合のフォールバック値
 * @returns スクロール位置（x座標）
 */
export const getCenterScrollPosition = (
  activeIndex: number,
  tabWidths: number[],
  screenWidth: number,
  defaultWidth?: number,
): number => {
  const fallback = defaultWidth ?? 100;

  // アクティブタブの中心位置を計算
  let tabCenterX = 0;
  for (let i = 0; i < activeIndex; i++) {
    tabCenterX += tabWidths[i] ?? fallback;
  }
  tabCenterX += (tabWidths[activeIndex] ?? fallback) / 2;

  // 画面中央に配置するためのスクロール位置
  const scrollX = tabCenterX - screenWidth / 2;

  // 負の値は0にクランプ（左端より左にはスクロールできない）
  return Math.max(0, scrollX);
};
