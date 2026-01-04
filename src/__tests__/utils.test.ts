import { describe, expect, it } from "vitest";
import { getCenterScrollPosition } from "../utils";

describe("getCenterScrollPosition", () => {
  describe("iPhone SE (375px)", () => {
    const screenWidth = 375;
    const tabItemWidth = 100;

    it("インデックス0: 左端（scrollX = 0）", () => {
      const result = getCenterScrollPosition(0, tabItemWidth, screenWidth);
      // 0 * 100 + 50 - 187.5 = -137.5 -> Math.max(0, -137.5) = 0
      expect(result).toBe(0);
    });

    it("インデックス1: まだ左端（scrollX = 0）", () => {
      const result = getCenterScrollPosition(1, tabItemWidth, screenWidth);
      // 1 * 100 + 50 - 187.5 = -37.5 -> Math.max(0, -37.5) = 0
      expect(result).toBe(0);
    });

    it("インデックス2: 中央配置開始（scrollX = 62.5）", () => {
      const result = getCenterScrollPosition(2, tabItemWidth, screenWidth);
      // 2 * 100 + 50 - 187.5 = 62.5
      expect(result).toBe(62.5);
    });

    it("インデックス3: 中央配置（scrollX = 162.5）", () => {
      const result = getCenterScrollPosition(3, tabItemWidth, screenWidth);
      // 3 * 100 + 50 - 187.5 = 162.5
      expect(result).toBe(162.5);
    });

    it("インデックス5: 中央配置（scrollX = 362.5）", () => {
      const result = getCenterScrollPosition(5, tabItemWidth, screenWidth);
      // 5 * 100 + 50 - 187.5 = 362.5
      expect(result).toBe(362.5);
    });

    it("インデックス10: 中央配置（scrollX = 862.5）", () => {
      const result = getCenterScrollPosition(10, tabItemWidth, screenWidth);
      // 10 * 100 + 50 - 187.5 = 862.5
      expect(result).toBe(862.5);
    });
  });

  describe("Android Phone (360px)", () => {
    const screenWidth = 360;
    const tabItemWidth = 100;

    it("インデックス0: 左端（scrollX = 0）", () => {
      const result = getCenterScrollPosition(0, tabItemWidth, screenWidth);
      // 0 * 100 + 50 - 180 = -130 -> Math.max(0, -130) = 0
      expect(result).toBe(0);
    });

    it("インデックス1: まだ左端（scrollX = 0）", () => {
      const result = getCenterScrollPosition(1, tabItemWidth, screenWidth);
      // 1 * 100 + 50 - 180 = -30 -> Math.max(0, -30) = 0
      expect(result).toBe(0);
    });

    it("インデックス2: 中央配置開始（scrollX = 70）", () => {
      const result = getCenterScrollPosition(2, tabItemWidth, screenWidth);
      // 2 * 100 + 50 - 180 = 70
      expect(result).toBe(70);
    });

    it("インデックス5: 中央配置（scrollX = 370）", () => {
      const result = getCenterScrollPosition(5, tabItemWidth, screenWidth);
      // 5 * 100 + 50 - 180 = 370
      expect(result).toBe(370);
    });

    it("インデックス10: 中央配置（scrollX = 870）", () => {
      const result = getCenterScrollPosition(10, tabItemWidth, screenWidth);
      // 10 * 100 + 50 - 180 = 870
      expect(result).toBe(870);
    });
  });

  describe("iPad (768px)", () => {
    const screenWidth = 768;
    const tabItemWidth = 100;

    it("インデックス0: 左端（scrollX = 0）", () => {
      const result = getCenterScrollPosition(0, tabItemWidth, screenWidth);
      // 0 * 100 + 50 - 384 = -334 -> Math.max(0, -334) = 0
      expect(result).toBe(0);
    });

    it("インデックス3: まだ左端（scrollX = 0）", () => {
      const result = getCenterScrollPosition(3, tabItemWidth, screenWidth);
      // 3 * 100 + 50 - 384 = -34 -> Math.max(0, -34) = 0
      expect(result).toBe(0);
    });

    it("インデックス4: 中央配置開始（scrollX = 66）", () => {
      const result = getCenterScrollPosition(4, tabItemWidth, screenWidth);
      // 4 * 100 + 50 - 384 = 66
      expect(result).toBe(66);
    });

    it("インデックス10: 中央配置（scrollX = 666）", () => {
      const result = getCenterScrollPosition(10, tabItemWidth, screenWidth);
      // 10 * 100 + 50 - 384 = 666
      expect(result).toBe(666);
    });
  });

  describe("エッジケース", () => {
    const screenWidth = 375;
    const tabItemWidth = 100;

    it("負のインデックス（インデックス-1）", () => {
      const result = getCenterScrollPosition(-1, tabItemWidth, screenWidth);
      // -1 * 100 + 50 - 187.5 = -237.5 -> Math.max(0, -237.5) = 0
      expect(result).toBe(0);
    });

    it("タブ幅が0の場合", () => {
      const result = getCenterScrollPosition(5, 0, screenWidth);
      // 5 * 0 + 0 - 187.5 = -187.5 -> Math.max(0, -187.5) = 0
      expect(result).toBe(0);
    });

    it("画面幅が0の場合", () => {
      const result = getCenterScrollPosition(5, tabItemWidth, 0);
      // 5 * 100 + 50 - 0 = 550
      expect(result).toBe(550);
    });

    it("非常に大きいインデックス（インデックス1000）", () => {
      const result = getCenterScrollPosition(1000, tabItemWidth, screenWidth);
      // 1000 * 100 + 50 - 187.5 = 99862.5
      expect(result).toBe(99862.5);
    });
  });

  describe("累積誤差のテスト", () => {
    const screenWidth = 375;
    const tabItemWidth = 100;

    it("連続するインデックスで一貫した差分", () => {
      const scroll0 = getCenterScrollPosition(0, tabItemWidth, screenWidth);
      const scroll1 = getCenterScrollPosition(1, tabItemWidth, screenWidth);
      const scroll2 = getCenterScrollPosition(2, tabItemWidth, screenWidth);
      const scroll3 = getCenterScrollPosition(3, tabItemWidth, screenWidth);

      // インデックス0と1は両方とも0（左端制限）
      expect(scroll0).toBe(0);
      expect(scroll1).toBe(0);

      // インデックス2から中央配置開始
      // 各インデックス間の差分はtabItemWidth（100px）であるべき
      expect(scroll3 - scroll2).toBe(tabItemWidth);
    });

    it("50タブでの累積誤差", () => {
      const results = [];
      for (let i = 0; i < 50; i++) {
        results.push(getCenterScrollPosition(i, tabItemWidth, screenWidth));
      }

      // 最後のタブのスクロール位置を確認
      const lastScroll = results[results.length - 1];
      // 49 * 100 + 50 - 187.5 = 4762.5
      expect(lastScroll).toBe(4762.5);

      // 連続するタブ間の差分が一定か確認（左端制限以外）
      for (let i = 3; i < results.length - 1; i++) {
        const diff = results[i + 1] - results[i];
        expect(diff).toBe(tabItemWidth);
      }
    });
  });
});
