import { describe, expect, it } from "vitest";
import {
  computeActiveVirtualIndex,
  computeCenterScrollX,
  simulateTabLayouts,
} from "../utils";

// --- 実際のアプリで使用されるタブ構成 ---
const NEWS_CATEGORIES = [
  "Tech",
  "Business",
  "Sports",
  "Entertainment",
  "Science",
  "Health",
  "Politics",
  "World",
  "Travel",
  "Food",
  "Fashion",
  "Music",
  "Gaming",
  "Education",
  "Finance",
  "Automotive",
  "Real Estate",
  "Environment",
  "Arts",
  "Lifestyle",
];

// 実測に近いタブ幅（paddingHorizontal: 16 × 2 + テキスト幅）
const REALISTIC_TAB_WIDTHS: Record<string, number> = {
  Tech: 64,
  Business: 88,
  Sports: 72,
  Entertainment: 112,
  Science: 80,
  Health: 72,
  Politics: 80,
  World: 68,
  Travel: 72,
  Food: 64,
  Fashion: 80,
  Music: 72,
  Gaming: 80,
  Education: 88,
  Finance: 80,
  Automotive: 96,
  "Real Estate": 104,
  Environment: 104,
  Arts: 60,
  Lifestyle: 88,
};

const getRealisticWidths = () =>
  NEWS_CATEGORIES.map((cat) => REALISTIC_TAB_WIDTHS[cat] ?? 80);

// 3倍仮想化のタブ幅を生成
const tripleWidths = (widths: number[]) => [
  ...widths,
  ...widths,
  ...widths,
];

const VIRTUAL_MULTIPLIER = 3;

describe("computeCenterScrollX", () => {
  describe("基本動作", () => {
    const screenWidth = 393; // iPhone 16e

    it("タブが画面左端にある場合、scrollX = 0（クランプ）", () => {
      // layout.x=8, width=64 → center=40 → 40 - 196.5 = -156.5 → 0
      expect(computeCenterScrollX(8, 64, screenWidth)).toBe(0);
    });

    it("タブが画面中央近くにある場合、正しい位置に配置", () => {
      // layout.x=500, width=80 → center=540 → 540 - 196.5 = 343.5
      expect(computeCenterScrollX(500, 80, screenWidth)).toBe(343.5);
    });

    it("タブ幅が大きくても正しく中央配置", () => {
      // layout.x=300, width=200 → center=400 → 400 - 196.5 = 203.5
      expect(computeCenterScrollX(300, 200, screenWidth)).toBe(203.5);
    });

    it("タブ幅が小さくても正しく中央配置", () => {
      // layout.x=1000, width=30 → center=1015 → 1015 - 196.5 = 818.5
      expect(computeCenterScrollX(1000, 30, screenWidth)).toBe(818.5);
    });
  });

  describe("各デバイスサイズで一貫した動作", () => {
    const layoutX = 800;
    const layoutWidth = 80;

    it("iPhone SE (375px)", () => {
      expect(computeCenterScrollX(layoutX, layoutWidth, 375)).toBe(652.5);
    });

    it("iPhone 16 (393px)", () => {
      expect(computeCenterScrollX(layoutX, layoutWidth, 393)).toBe(643.5);
    });

    it("iPhone 16 Pro Max (430px)", () => {
      expect(computeCenterScrollX(layoutX, layoutWidth, 430)).toBe(625);
    });

    it("iPad (768px)", () => {
      expect(computeCenterScrollX(layoutX, layoutWidth, 768)).toBe(456);
    });

    it("全デバイスでタブ中心が画面中央に来る", () => {
      const devices = [375, 393, 430, 768];
      for (const sw of devices) {
        const scrollX = computeCenterScrollX(layoutX, layoutWidth, sw);
        // scrollX だけスクロールした後、タブの中心は画面中央にあるはず
        const tabCenterOnScreen = layoutX + layoutWidth / 2 - scrollX;
        expect(tabCenterOnScreen).toBeCloseTo(sw / 2, 5);
      }
    });
  });

  describe("エッジケース", () => {
    it("layoutX = 0, width = 0 → scrollX = 0", () => {
      expect(computeCenterScrollX(0, 0, 393)).toBe(0);
    });

    it("screenWidth = 0 → scrollX = layoutX + width/2", () => {
      expect(computeCenterScrollX(100, 80, 0)).toBe(140);
    });

    it("非常に大きなレイアウト位置でも正しく計算", () => {
      const result = computeCenterScrollX(50000, 80, 393);
      expect(result).toBe(50000 + 40 - 196.5);
    });
  });
});

describe("computeActiveVirtualIndex", () => {
  describe("無限スクロールON", () => {
    it("activeIndex=0 → tabsLength (中央セットの先頭)", () => {
      expect(computeActiveVirtualIndex(0, 20, true)).toBe(20);
    });

    it("activeIndex=11 (Music) → tabsLength + 11", () => {
      expect(computeActiveVirtualIndex(11, 20, true)).toBe(31);
    });

    it("activeIndex=19 (最後) → tabsLength + 19", () => {
      expect(computeActiveVirtualIndex(19, 20, true)).toBe(39);
    });

    it("3タブの場合", () => {
      expect(computeActiveVirtualIndex(0, 3, true)).toBe(3);
      expect(computeActiveVirtualIndex(1, 3, true)).toBe(4);
      expect(computeActiveVirtualIndex(2, 3, true)).toBe(5);
    });
  });

  describe("無限スクロールOFF", () => {
    it("activeIndex がそのまま返される", () => {
      expect(computeActiveVirtualIndex(0, 20, false)).toBe(0);
      expect(computeActiveVirtualIndex(5, 20, false)).toBe(5);
      expect(computeActiveVirtualIndex(19, 20, false)).toBe(19);
    });
  });

  describe("全タブインデックスの一貫性", () => {
    it("20タブ: 全インデックスが中央セット範囲内", () => {
      const tabsLength = 20;
      for (let i = 0; i < tabsLength; i++) {
        const vi = computeActiveVirtualIndex(i, tabsLength, true);
        // 中央セット: [tabsLength, 2*tabsLength)
        expect(vi).toBeGreaterThanOrEqual(tabsLength);
        expect(vi).toBeLessThan(tabsLength * 2);
      }
    });

    it("仮想インデックスは連続して増加", () => {
      const tabsLength = 20;
      for (let i = 0; i < tabsLength - 1; i++) {
        const vi1 = computeActiveVirtualIndex(i, tabsLength, true);
        const vi2 = computeActiveVirtualIndex(i + 1, tabsLength, true);
        expect(vi2 - vi1).toBe(1);
      }
    });
  });
});

describe("simulateTabLayouts", () => {
  it("均一幅のタブで正しいレイアウトを生成", () => {
    const layouts = simulateTabLayouts([100, 100, 100], 8);
    expect(layouts.get(0)).toEqual({ x: 8, width: 100 });
    expect(layouts.get(1)).toEqual({ x: 108, width: 100 });
    expect(layouts.get(2)).toEqual({ x: 208, width: 100 });
  });

  it("異なる幅のタブで正しいレイアウトを生成", () => {
    const layouts = simulateTabLayouts([64, 88, 72], 8);
    expect(layouts.get(0)).toEqual({ x: 8, width: 64 });
    expect(layouts.get(1)).toEqual({ x: 72, width: 88 });
    expect(layouts.get(2)).toEqual({ x: 160, width: 72 });
  });

  it("レイアウトの x 座標は各タブの左端", () => {
    const widths = [60, 80, 100, 70];
    const layouts = simulateTabLayouts(widths, 0);
    let expectedX = 0;
    for (let i = 0; i < widths.length; i++) {
      expect(layouts.get(i)?.x).toBe(expectedX);
      expectedX += widths[i]!;
    }
  });
});

describe("実際のタブ構成でのセンタリング（統合テスト）", () => {
  const screenWidth = 393; // iPhone 16e
  const tabWidths = getRealisticWidths();
  const virtualWidths = tripleWidths(tabWidths);

  // 3倍仮想化されたレイアウトをシミュレート
  const layouts = simulateTabLayouts(virtualWidths);

  describe("初期状態: Tech (index 0) がセンタリング", () => {
    const activeIndex = 0;
    const virtualIndex = computeActiveVirtualIndex(
      activeIndex,
      NEWS_CATEGORIES.length,
      true,
    );

    it("仮想インデックスは中央セットの先頭 (20)", () => {
      expect(virtualIndex).toBe(20);
    });

    it("計測済みレイアウトでセンタリング位置が正しい", () => {
      const layout = layouts.get(virtualIndex)!;
      const scrollX = computeCenterScrollX(
        layout.x,
        layout.width,
        screenWidth,
      );
      // スクロール後、タブの中心は画面中央にある
      const tabCenterOnScreen = layout.x + layout.width / 2 - scrollX;
      expect(tabCenterOnScreen).toBeCloseTo(screenWidth / 2, 5);
    });
  });

  describe("Music (index 11) がセンタリング", () => {
    const activeIndex = 11;
    const virtualIndex = computeActiveVirtualIndex(
      activeIndex,
      NEWS_CATEGORIES.length,
      true,
    );

    it("仮想インデックスは 31", () => {
      expect(virtualIndex).toBe(31);
    });

    it("計測済みレイアウトで正しくセンタリング", () => {
      const layout = layouts.get(virtualIndex)!;
      const scrollX = computeCenterScrollX(
        layout.x,
        layout.width,
        screenWidth,
      );
      const tabCenterOnScreen = layout.x + layout.width / 2 - scrollX;
      expect(tabCenterOnScreen).toBeCloseTo(screenWidth / 2, 5);
    });
  });

  describe("Lifestyle (最後のタブ, index 19) がセンタリング", () => {
    const activeIndex = 19;
    const virtualIndex = computeActiveVirtualIndex(
      activeIndex,
      NEWS_CATEGORIES.length,
      true,
    );

    it("仮想インデックスは 39", () => {
      expect(virtualIndex).toBe(39);
    });

    it("計測済みレイアウトで正しくセンタリング", () => {
      const layout = layouts.get(virtualIndex)!;
      const scrollX = computeCenterScrollX(
        layout.x,
        layout.width,
        screenWidth,
      );
      const tabCenterOnScreen = layout.x + layout.width / 2 - scrollX;
      expect(tabCenterOnScreen).toBeCloseTo(screenWidth / 2, 5);
    });
  });

  describe("全20タブのセンタリング精度", () => {
    it("全タブが画面中央に正確にセンタリングされる", () => {
      for (let i = 0; i < NEWS_CATEGORIES.length; i++) {
        const vi = computeActiveVirtualIndex(
          i,
          NEWS_CATEGORIES.length,
          true,
        );
        const layout = layouts.get(vi)!;
        const scrollX = computeCenterScrollX(
          layout.x,
          layout.width,
          screenWidth,
        );
        const tabCenterOnScreen = layout.x + layout.width / 2 - scrollX;
        expect(tabCenterOnScreen).toBeCloseTo(
          screenWidth / 2,
          5,
        );
      }
    });

    it("ハードコード 100px 幅との差分が大きいタブがある（回帰防止）", () => {
      // 以前のバグ: DEFAULT_TAB_ITEM_WIDTH=100px でセンタリング計算していた
      // 実際の幅は 60px～112px で、100px との乖離が蓄積して大きなズレになる
      const hardcoded100Layouts = simulateTabLayouts(
        Array.from({ length: 60 }, () => 100),
      );

      let maxDifference = 0;
      for (let i = 0; i < NEWS_CATEGORIES.length; i++) {
        const vi = computeActiveVirtualIndex(
          i,
          NEWS_CATEGORIES.length,
          true,
        );

        const measuredLayout = layouts.get(vi)!;
        const hardcodedLayout = hardcoded100Layouts.get(vi)!;

        const measuredScrollX = computeCenterScrollX(
          measuredLayout.x,
          measuredLayout.width,
          screenWidth,
        );
        const hardcodedScrollX = computeCenterScrollX(
          hardcodedLayout.x,
          hardcodedLayout.width,
          screenWidth,
        );

        const diff = Math.abs(measuredScrollX - hardcodedScrollX);
        maxDifference = Math.max(maxDifference, diff);
      }

      // 100px ハードコードだと後半のタブで数百pxのズレが生じる
      // これが以前のバグの原因
      expect(maxDifference).toBeGreaterThan(100);
    });
  });
});

describe("ハードコード幅 vs 計測幅のズレ検証（回帰テスト）", () => {
  const screenWidth = 393;
  const tabWidths = getRealisticWidths();
  const avgWidth =
    tabWidths.reduce((a, b) => a + b, 0) / tabWidths.length;

  it("平均タブ幅は 100px ではない", () => {
    expect(avgWidth).not.toBe(100);
    expect(avgWidth).toBeLessThan(100);
  });

  it("ハードコード100pxでの仮想インデックス計算がズレる例", () => {
    // 例: 仮想インデックス31 (Music, 中央セット)
    // ハードコード100px: スクロール位置 = 31 * 100 = 3100
    // 実計測: スクロール位置 = sum(widths[0..30])
    const realOffset = tabWidths
      .slice(0, 31 % tabWidths.length)
      .reduce((a, b) => a + b, 0);
    const oneSetWidth = tabWidths.reduce((a, b) => a + b, 0);
    const setsToSkip = Math.floor(31 / tabWidths.length);
    const totalRealOffset = setsToSkip * oneSetWidth + realOffset;

    const hardcodedOffset = 31 * 100;
    const difference = Math.abs(hardcodedOffset - totalRealOffset);

    // 数百pxのズレがある（タブ数個分のズレに相当）
    expect(difference).toBeGreaterThan(200);
  });

  it("計測済みレイアウトでは全タブが正確に中央配置される", () => {
    const virtualWidths = tripleWidths(tabWidths);
    const layouts = simulateTabLayouts(virtualWidths);

    for (let i = 0; i < NEWS_CATEGORIES.length; i++) {
      const vi = computeActiveVirtualIndex(i, NEWS_CATEGORIES.length, true);
      const layout = layouts.get(vi)!;
      const scrollX = computeCenterScrollX(
        layout.x,
        layout.width,
        screenWidth,
      );

      // タブ中心が画面中央に来ることを検証
      const tabCenter = layout.x + layout.width / 2;
      const screenCenter = scrollX + screenWidth / 2;
      expect(tabCenter).toBeCloseTo(screenCenter, 5);
    }
  });
});

describe("無限スクロールOFFでのセンタリング", () => {
  const screenWidth = 393;
  const tabWidths = getRealisticWidths();
  const layouts = simulateTabLayouts(tabWidths);

  it("仮想インデックス = 実インデックス", () => {
    for (let i = 0; i < NEWS_CATEGORIES.length; i++) {
      expect(computeActiveVirtualIndex(i, NEWS_CATEGORIES.length, false)).toBe(
        i,
      );
    }
  });

  it("全タブが正しくセンタリング（先頭タブはクランプ）", () => {
    for (let i = 0; i < NEWS_CATEGORIES.length; i++) {
      const layout = layouts.get(i)!;
      const scrollX = computeCenterScrollX(
        layout.x,
        layout.width,
        screenWidth,
      );
      expect(scrollX).toBeGreaterThanOrEqual(0);

      if (scrollX > 0) {
        // クランプされなかったタブは正確に中央
        const tabCenter = layout.x + layout.width / 2;
        const screenCenter = scrollX + screenWidth / 2;
        expect(tabCenter).toBeCloseTo(screenCenter, 5);
      }
    }
  });
});

describe("少数タブでのセンタリング", () => {
  it("2タブ: 正しくセンタリング", () => {
    const layouts = simulateTabLayouts([80, 80]);
    const scrollX = computeCenterScrollX(layouts.get(1)!.x, 80, 393);
    // tab1.x = 88, center = 128, scrollX = 128 - 196.5 = -68.5 → 0
    expect(scrollX).toBe(0);
  });

  it("1タブ: scrollX = 0", () => {
    const layouts = simulateTabLayouts([80]);
    const scrollX = computeCenterScrollX(layouts.get(0)!.x, 80, 393);
    expect(scrollX).toBe(0);
  });

  it("5タブ・均一幅: 中央タブはスクロール不要", () => {
    const layouts = simulateTabLayouts([80, 80, 80, 80, 80]);
    const scrollX = computeCenterScrollX(layouts.get(2)!.x, 80, 393);
    // tab2.x = 168, center = 208, scrollX = 208 - 196.5 = 11.5
    expect(scrollX).toBeCloseTo(11.5, 5);
  });
});
