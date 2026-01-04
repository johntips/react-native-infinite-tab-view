import { render } from "@testing-library/react";
import { Text, View } from "react-native";
import { describe, expect, it, vi } from "vitest";
import { Container } from "../Container";
import { Tab } from "../Tab";

describe("Container", () => {
  describe("基本レンダリング", () => {
    it("子要素をレンダリングする", () => {
      const { getAllByText } = render(
        <Container infiniteScroll={false}>
          <Tab name="tab1" label="Tab 1">
            <Text>Content 1</Text>
          </Tab>
          <Tab name="tab2" label="Tab 2">
            <Text>Content 2</Text>
          </Tab>
        </Container>,
      );

      expect(getAllByText("Tab 1")).toHaveLength(1);
      expect(getAllByText("Tab 2")).toHaveLength(1);
    });

    it("ヘッダーをレンダリングする（renderHeader指定時）", () => {
      const { getByText } = render(
        <Container
          renderHeader={() => <Text>Header Content</Text>}
          headerHeight={200}
        >
          <Tab name="tab1" label="Tab 1">
            <Text>Content 1</Text>
          </Tab>
        </Container>,
      );

      expect(getByText("Header Content")).toBeTruthy();
    });

    it("カスタムタブバーをレンダリングする（renderTabBar指定時）", () => {
      const { getByText } = render(
        <Container
          renderTabBar={({ tabs }) => (
            <View>
              {tabs.map((tab) => (
                <Text key={tab.name}>Custom {tab.label}</Text>
              ))}
            </View>
          )}
        >
          <Tab name="tab1" label="Tab 1">
            <Text>Content 1</Text>
          </Tab>
        </Container>,
      );

      expect(getByText("Custom Tab 1")).toBeTruthy();
    });
  });

  describe("タブ抽出", () => {
    it("子要素からタブ情報を抽出する", () => {
      const { getByText } = render(
        <Container
          renderTabBar={({ tabs }) => (
            <View>
              {tabs.map((tab) => (
                <Text key={tab.name}>
                  {tab.name}: {tab.label}
                </Text>
              ))}
            </View>
          )}
        >
          <Tab name="news" label="ニュース">
            <Text>News Content</Text>
          </Tab>
          <Tab name="sports" label="スポーツ">
            <Text>Sports Content</Text>
          </Tab>
        </Container>,
      );

      expect(getByText("news: ニュース")).toBeTruthy();
      expect(getByText("sports: スポーツ")).toBeTruthy();
    });
  });

  describe("状態管理", () => {
    it("activeIndex の初期値は 0", () => {
      const { getByText } = render(
        <Container
          renderTabBar={({ activeIndex }) => (
            <Text>Active Index: {activeIndex}</Text>
          )}
        >
          <Tab name="tab1" label="Tab 1">
            <Text>Content 1</Text>
          </Tab>
        </Container>,
      );

      expect(getByText("Active Index: 0")).toBeTruthy();
    });
  });

  describe("無限スクロール", () => {
    it("infiniteScroll=true の場合、コンポーネントがレンダリングされる", () => {
      const { getAllByText } = render(
        <Container infiniteScroll={true}>
          <Tab name="tab1" label="Tab 1">
            <Text>Content 1</Text>
          </Tab>
        </Container>,
      );

      // infiniteScroll=trueなので、タブが3倍生成される
      expect(getAllByText("Tab 1")).toHaveLength(3);
    });

    it("infiniteScroll=false の場合、コンポーネントがレンダリングされる", () => {
      const { getByText } = render(
        <Container infiniteScroll={false}>
          <Tab name="tab1" label="Tab 1">
            <Text>Content 1</Text>
          </Tab>
        </Container>,
      );

      expect(getByText("Tab 1")).toBeTruthy();
    });

    describe("仮想ページ生成", () => {
      it("VIRTUAL_MULTIPLIER=3で3倍のページを生成（infiniteScroll=true）", () => {
        const { container, getAllByText } = render(
          <Container infiniteScroll={true}>
            <Tab name="tab1" label="Tab 1">
              <Text>Content 1</Text>
            </Tab>
            <Tab name="tab2" label="Tab 2">
              <Text>Content 2</Text>
            </Tab>
            <Tab name="tab3" label="Tab 3">
              <Text>Content 3</Text>
            </Tab>
          </Container>,
        );

        // 3タブ × VIRTUAL_MULTIPLIER(3) = 9ページ生成される
        // 各コンテンツが3回ずつ表示される
        const content1Elements = getAllByText("Content 1");
        const content2Elements = getAllByText("Content 2");
        const content3Elements = getAllByText("Content 3");

        expect(content1Elements).toHaveLength(3); // 仮想ページで3回表示
        expect(content2Elements).toHaveLength(3);
        expect(content3Elements).toHaveLength(3);
      });

      it("infiniteScroll=falseの場合、tabs.length分のページのみ生成", () => {
        const { getAllByText } = render(
          <Container infiniteScroll={false}>
            <Tab name="tab1" label="Tab 1">
              <Text>Content 1</Text>
            </Tab>
            <Tab name="tab2" label="Tab 2">
              <Text>Content 2</Text>
            </Tab>
            <Tab name="tab3" label="Tab 3">
              <Text>Content 3</Text>
            </Tab>
          </Container>,
        );

        // 無限スクロールなしの場合、各コンテンツは1回のみ表示
        const content1Elements = getAllByText("Content 1");
        const content2Elements = getAllByText("Content 2");
        const content3Elements = getAllByText("Content 3");

        expect(content1Elements).toHaveLength(1);
        expect(content2Elements).toHaveLength(1);
        expect(content3Elements).toHaveLength(1);
      });

      it("20タブで60ページ（3倍）生成されることを確認", () => {
        const tabs = Array.from({ length: 20 }, (_, i) => ({
          name: `tab${i}`,
          label: `Tab ${i}`,
          content: `Content ${i}`,
        }));

        const { getAllByText } = render(
          <Container infiniteScroll={true}>
            {tabs.map((tab) => (
              <Tab key={tab.name} name={tab.name} label={tab.label}>
                <Text>{tab.content}</Text>
              </Tab>
            ))}
          </Container>,
        );

        // 各コンテンツが3回ずつ表示される（20タブ × 3 = 60ページ）
        tabs.forEach((tab) => {
          const contentElements = getAllByText(tab.content);
          expect(contentElements).toHaveLength(3);
        });
      });
    });
  });

  describe("タブ中央配置", () => {
    it("tabBarCenterActive=true の場合、コンポーネントがレンダリングされる", () => {
      const { getAllByText } = render(
        <Container tabBarCenterActive={true} infiniteScroll={false}>
          <Tab name="tab1" label="Tab 1">
            <Text>Content 1</Text>
          </Tab>
        </Container>,
      );

      expect(getAllByText("Tab 1")).toHaveLength(1);
    });

    it("tabBarCenterActive=false の場合、コンポーネントがレンダリングされる", () => {
      const { getAllByText } = render(
        <Container tabBarCenterActive={false} infiniteScroll={false}>
          <Tab name="tab1" label="Tab 1">
            <Text>Content 1</Text>
          </Tab>
        </Container>,
      );

      expect(getAllByText("Tab 1")).toHaveLength(1);
    });
  });

  describe("コールバック", () => {
    it("onTabChange が呼ばれることを確認", () => {
      const onTabChange = vi.fn();

      render(
        <Container onTabChange={onTabChange}>
          <Tab name="tab1" label="Tab 1">
            <Text>Content 1</Text>
          </Tab>
        </Container>,
      );

      // onTabChange は初期化時には呼ばれない（タブ変更時のみ）
      expect(onTabChange).not.toHaveBeenCalled();
    });
  });
});
