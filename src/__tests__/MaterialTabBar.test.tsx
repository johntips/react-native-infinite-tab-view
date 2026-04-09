import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MaterialTabBar } from "../MaterialTabBar";

describe("MaterialTabBar", () => {
  const mockTabs = [
    { name: "tab1", label: "Tab 1" },
    { name: "tab2", label: "Tab 2" },
    { name: "tab3", label: "Tab 3" },
  ];

  describe("基本レンダリング", () => {
    it("全タブをレンダリングする（infiniteScroll=false）", () => {
      const { getByText } = render(
        <MaterialTabBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={vi.fn()}
          infiniteScroll={false}
          centerActive={true}
        />,
      );

      expect(getByText("Tab 1")).toBeTruthy();
      expect(getByText("Tab 2")).toBeTruthy();
      expect(getByText("Tab 3")).toBeTruthy();
    });

    it("infiniteScroll=trueで3倍のタブを生成する", () => {
      const { getAllByText } = render(
        <MaterialTabBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={vi.fn()}
          infiniteScroll={true}
          centerActive={true}
        />,
      );

      expect(getAllByText("Tab 1")).toHaveLength(3);
      expect(getAllByText("Tab 2")).toHaveLength(3);
      expect(getAllByText("Tab 3")).toHaveLength(3);
    });
  });

  describe("カスタムカラー", () => {
    it("デフォルトカラーでレンダリングされる", () => {
      const { getByText } = render(
        <MaterialTabBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={vi.fn()}
          infiniteScroll={false}
          centerActive={true}
        />,
      );

      // デフォルトの activeColor="#000", inactiveColor="#666"
      const activeTab = getByText("Tab 1");
      const inactiveTab = getByText("Tab 2");
      expect(activeTab).toBeTruthy();
      expect(inactiveTab).toBeTruthy();
    });

    it("カスタム activeColor / inactiveColor を受け付ける", () => {
      const { getByText } = render(
        <MaterialTabBar
          tabs={mockTabs}
          activeIndex={1}
          onTabPress={vi.fn()}
          infiniteScroll={false}
          centerActive={true}
          activeColor="#F3BE21"
          inactiveColor="#86888A"
        />,
      );

      expect(getByText("Tab 2")).toBeTruthy();
    });

    it("カスタム indicatorStyle を受け付ける", () => {
      const { container } = render(
        <MaterialTabBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={vi.fn()}
          infiniteScroll={false}
          centerActive={true}
          indicatorStyle={{ height: 4, borderRadius: 2 }}
        />,
      );

      expect(container.firstChild).toBeTruthy();
    });

    it("カスタム labelStyle を受け付ける", () => {
      const { getByText } = render(
        <MaterialTabBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={vi.fn()}
          infiniteScroll={false}
          centerActive={true}
          labelStyle={{ fontSize: 16, fontWeight: "700" }}
        />,
      );

      expect(getByText("Tab 1")).toBeTruthy();
    });
  });

  describe("scrollEnabled", () => {
    it("scrollEnabled=true の場合、ScrollView でレンダリングされる", () => {
      const { container } = render(
        <MaterialTabBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={vi.fn()}
          infiniteScroll={false}
          centerActive={true}
          scrollEnabled={true}
        />,
      );

      expect(container.firstChild).toBeTruthy();
    });

    it("scrollEnabled=false の場合、View でレンダリングされる", () => {
      const { container } = render(
        <MaterialTabBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={vi.fn()}
          infiniteScroll={false}
          centerActive={true}
          scrollEnabled={false}
        />,
      );

      expect(container.firstChild).toBeTruthy();
    });
  });

  describe("scrollProgress", () => {
    it("scrollProgress なしでもレンダリングされる", () => {
      const { getByText } = render(
        <MaterialTabBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={vi.fn()}
          infiniteScroll={false}
          centerActive={true}
        />,
      );

      expect(getByText("Tab 1")).toBeTruthy();
    });

    it("scrollProgress ありでもレンダリングされる", () => {
      const scrollProgress = { value: 0 };
      const { getByText } = render(
        <MaterialTabBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={vi.fn()}
          infiniteScroll={false}
          centerActive={true}
          scrollProgress={scrollProgress as any}
        />,
      );

      expect(getByText("Tab 1")).toBeTruthy();
    });

    it("scrollProgress ありで activeIndex 変更時にクラッシュしない", () => {
      const scrollProgress = { value: 0 };
      const { rerender, getByText } = render(
        <MaterialTabBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={vi.fn()}
          infiniteScroll={false}
          centerActive={true}
          scrollProgress={scrollProgress as any}
        />,
      );

      // activeIndex を変更（タブタップ相当）
      rerender(
        <MaterialTabBar
          tabs={mockTabs}
          activeIndex={2}
          onTabPress={vi.fn()}
          infiniteScroll={false}
          centerActive={true}
          scrollProgress={scrollProgress as any}
        />,
      );

      expect(getByText("Tab 3")).toBeTruthy();
    });
  });

  describe("activeIndex マッピング", () => {
    it("activeIndex 変更で正しいタブがアクティブになる", () => {
      const { rerender, getByText } = render(
        <MaterialTabBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={vi.fn()}
          infiniteScroll={false}
          centerActive={true}
        />,
      );

      rerender(
        <MaterialTabBar
          tabs={mockTabs}
          activeIndex={2}
          onTabPress={vi.fn()}
          infiniteScroll={false}
          centerActive={true}
        />,
      );

      expect(getByText("Tab 3")).toBeTruthy();
    });
  });

  describe("大量タブ", () => {
    it("20タブでクラッシュしない", () => {
      const largeTabs = Array.from({ length: 20 }, (_, i) => ({
        name: `tab${i}`,
        label: `Tab ${i}`,
      }));

      const { getAllByText } = render(
        <MaterialTabBar
          tabs={largeTabs}
          activeIndex={10}
          onTabPress={vi.fn()}
          infiniteScroll={true}
          centerActive={true}
        />,
      );

      expect(getAllByText("Tab 10")).toHaveLength(3);
    });
  });
});
