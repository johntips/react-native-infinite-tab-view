import { describe, expect, it } from "vitest";
import { getCenterScrollPosition } from "../utils";

// ヘルパー: 同一幅の配列を生成（旧API互換）
const uniformWidths = (count: number, width: number) =>
  Array.from({ length: count }, () => width);

describe("getCenterScrollPosition", () => {
  describe("iPhone SE (375px)", () => {
    const screenWidth = 375;
    const tabItemWidth = 100;

    it("インデックス0: 左端（scrollX = 0）", () => {
      const result = getCenterScrollPosition(0, uniformWidths(15, tabItemWidth), screenWidth);
      expect(result).toBe(0);
    });

    it("インデックス1: まだ左端（scrollX = 0）", () => {
      const result = getCenterScrollPosition(1, uniformWidths(15, tabItemWidth), screenWidth);
      expect(result).toBe(0);
    });

    it("インデックス2: 中央配置開始（scrollX = 62.5）", () => {
      const result = getCenterScrollPosition(2, uniformWidths(15, tabItemWidth), screenWidth);
      expect(result).toBe(62.5);
    });

    it("インデックス3: 中央配置（scrollX = 162.5）", () => {
      const result = getCenterScrollPosition(3, uniformWidths(15, tabItemWidth), screenWidth);
      expect(result).toBe(162.5);
    });

    it("インデックス5: 中央配置（scrollX = 362.5）", () => {
      const result = getCenterScrollPosition(5, uniformWidths(15, tabItemWidth), screenWidth);
      expect(result).toBe(362.5);
    });

    it("インデックス10: 中央配置（scrollX = 862.5）", () => {
      const result = getCenterScrollPosition(10, uniformWidths(15, tabItemWidth), screenWidth);
      expect(result).toBe(862.5);
    });
  });

  describe("Android Phone (360px)", () => {
    const screenWidth = 360;
    const tabItemWidth = 100;

    it("インデックス0: 左端（scrollX = 0）", () => {
      const result = getCenterScrollPosition(0, uniformWidths(15, tabItemWidth), screenWidth);
      expect(result).toBe(0);
    });

    it("インデックス1: まだ左端（scrollX = 0）", () => {
      const result = getCenterScrollPosition(1, uniformWidths(15, tabItemWidth), screenWidth);
      expect(result).toBe(0);
    });

    it("インデックス2: 中央配置開始（scrollX = 70）", () => {
      const result = getCenterScrollPosition(2, uniformWidths(15, tabItemWidth), screenWidth);
      expect(result).toBe(70);
    });

    it("インデックス5: 中央配置（scrollX = 370）", () => {
      const result = getCenterScrollPosition(5, uniformWidths(15, tabItemWidth), screenWidth);
      expect(result).toBe(370);
    });

    it("インデックス10: 中央配置（scrollX = 870）", () => {
      const result = getCenterScrollPosition(10, uniformWidths(15, tabItemWidth), screenWidth);
      expect(result).toBe(870);
    });
  });

  describe("iPad (768px)", () => {
    const screenWidth = 768;
    const tabItemWidth = 100;

    it("インデックス0: 左端（scrollX = 0）", () => {
      const result = getCenterScrollPosition(0, uniformWidths(15, tabItemWidth), screenWidth);
      expect(result).toBe(0);
    });

    it("インデックス3: まだ左端（scrollX = 0）", () => {
      const result = getCenterScrollPosition(3, uniformWidths(15, tabItemWidth), screenWidth);
      expect(result).toBe(0);
    });

    it("インデックス4: 中央配置開始（scrollX = 66）", () => {
      const result = getCenterScrollPosition(4, uniformWidths(15, tabItemWidth), screenWidth);
      expect(result).toBe(66);
    });

    it("インデックス10: 中央配置（scrollX = 666）", () => {
      const result = getCenterScrollPosition(10, uniformWidths(15, tabItemWidth), screenWidth);
      expect(result).toBe(666);
    });
  });

  describe("エッジケース", () => {
    const screenWidth = 375;

    it("負のインデックス（インデックス-1）", () => {
      const result = getCenterScrollPosition(-1, uniformWidths(15, 100), screenWidth);
      expect(result).toBe(0);
    });

    it("空の配列 + defaultWidth 0", () => {
      const result = getCenterScrollPosition(5, [], screenWidth, 0);
      // defaultWidth=0 → 5 * 0 + 0/2 - 187.5 = -187.5 → 0
      expect(result).toBe(0);
    });

    it("画面幅が0の場合", () => {
      const result = getCenterScrollPosition(5, uniformWidths(15, 100), 0);
      expect(result).toBe(550);
    });

    it("非常に大きいインデックス（インデックス1000）", () => {
      const result = getCenterScrollPosition(1000, uniformWidths(1001, 100), 375);
      expect(result).toBe(99862.5);
    });
  });

  describe("動的タブ幅のテスト", () => {
    const screenWidth = 375;

    it("異なる幅のタブで正しい中央配置", () => {
      const tabWidths = [80, 120, 60, 100, 90];
      // index=2: offset = 80 + 120 = 200, center = 200 + 30 = 230
      // scrollX = 230 - 187.5 = 42.5
      const result = getCenterScrollPosition(2, tabWidths, screenWidth);
      expect(result).toBe(42.5);
    });

    it("フォールバック幅が使われる（配列が短い場合）", () => {
      const tabWidths = [80, 120]; // index=3 は配列外
      // offset = 80 + 120 + 100(fallback) = 300, center = 300 + 100/2 = 350
      // scrollX = 350 - 187.5 = 162.5
      const result = getCenterScrollPosition(3, tabWidths, screenWidth, 100);
      expect(result).toBe(162.5);
    });
  });

  describe("累積誤差のテスト", () => {
    const screenWidth = 375;
    const tabItemWidth = 100;
    const widths = uniformWidths(50, tabItemWidth);

    it("連続するインデックスで一貫した差分", () => {
      const scroll0 = getCenterScrollPosition(0, widths, screenWidth);
      const scroll1 = getCenterScrollPosition(1, widths, screenWidth);
      const scroll2 = getCenterScrollPosition(2, widths, screenWidth);
      const scroll3 = getCenterScrollPosition(3, widths, screenWidth);

      expect(scroll0).toBe(0);
      expect(scroll1).toBe(0);
      expect(scroll3 - scroll2).toBe(tabItemWidth);
    });

    it("50タブでの累積誤差", () => {
      const results = [];
      for (let i = 0; i < 50; i++) {
        results.push(getCenterScrollPosition(i, widths, screenWidth));
      }

      const lastScroll = results[results.length - 1];
      expect(lastScroll).toBe(4762.5);

      for (let i = 3; i < results.length - 1; i++) {
        const diff = results[i + 1]! - results[i]!;
        expect(diff).toBe(tabItemWidth);
      }
    });
  });
});
