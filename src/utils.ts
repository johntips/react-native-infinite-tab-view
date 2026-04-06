/**
 * 計測済みレイアウトを使ってアクティブタブを画面中央に配置するスクロール位置を計算
 * TabBar の centering useEffect で使用される実際の計算式
 *
 * @param layoutX - タブの x 座標（onLayout で計測済み）
 * @param layoutWidth - タブの幅（onLayout で計測済み）
 * @param screenWidth - 画面の幅
 * @returns スクロール位置（x座標、0 以上）
 */
export const computeCenterScrollX = (
  layoutX: number,
  layoutWidth: number,
  screenWidth: number,
): number => {
  const scrollX = layoutX + layoutWidth / 2 - screenWidth / 2;
  return Math.max(0, scrollX);
};

/**
 * 無限スクロール時のアクティブ仮想インデックスを計算
 * realIndex を中央セット（3倍仮想タブの2番目のセット）にマッピング
 *
 * @param activeIndex - 実タブのインデックス (0..tabs.length-1)
 * @param tabsLength - タブの総数
 * @param infiniteScroll - 無限スクロールが有効か
 * @returns 仮想インデックス
 */
export const computeActiveVirtualIndex = (
  activeIndex: number,
  tabsLength: number,
  infiniteScroll: boolean,
): number => {
  if (!infiniteScroll) return activeIndex;
  return tabsLength + activeIndex;
};

/**
 * タブの計測済みレイアウト（x座標・幅）をシミュレート
 * 実際の onLayout で得られる値と同等のレイアウトを生成
 *
 * @param tabWidths - 各タブの幅の配列
 * @param paddingHorizontal - ScrollView の contentContainerStyle の paddingHorizontal
 * @returns Map<virtualIndex, { x, width }>
 */
export const simulateTabLayouts = (
  tabWidths: number[],
  paddingHorizontal = 8,
): Map<number, { x: number; width: number }> => {
  const layouts = new Map<number, { x: number; width: number }>();
  let currentX = paddingHorizontal;
  for (let i = 0; i < tabWidths.length; i++) {
    const width = tabWidths[i] ?? 100;
    layouts.set(i, { x: currentX, width });
    currentX += width;
  }
  return layouts;
};

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
