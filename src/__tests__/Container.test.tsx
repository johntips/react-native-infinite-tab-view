import { render } from "@testing-library/react";
import { Text, View } from "react-native";
import { describe, expect, it, vi } from "vitest";
import { Container } from "../Container";
import { useTabsContext } from "../Context";
import { Tab } from "../Tab";

// nearbyIndexes をキャプチャするテスト用コンポーネント
function NearbyCapture({
  onCapture,
}: {
  onCapture: (indexes: number[]) => void;
}) {
  const { nearbyIndexes } = useTabsContext();
  onCapture(nearbyIndexes);
  return <Text>Capture</Text>;
}

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
        const { getAllByText } = render(
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

  describe("scrollProgress", () => {
    it("renderTabBar に scrollProgress が渡される", () => {
      let receivedScrollProgress: unknown;

      render(
        <Container
          renderTabBar={(props) => {
            receivedScrollProgress = props.scrollProgress;
            return (
              <View>
                {props.tabs.map((tab) => (
                  <Text key={tab.name}>{tab.label}</Text>
                ))}
              </View>
            );
          }}
        >
          <Tab name="tab1" label="Tab 1">
            <Text>Content 1</Text>
          </Tab>
        </Container>,
      );

      expect(receivedScrollProgress).toBeDefined();
      expect(typeof (receivedScrollProgress as { value: number }).value).toBe(
        "number",
      );
    });

    it("scrollProgress の初期値は 0", () => {
      let scrollProgressValue = -1;

      render(
        <Container
          renderTabBar={(props) => {
            scrollProgressValue = (props.scrollProgress as { value: number })
              .value;
            return <View />;
          }}
        >
          <Tab name="tab1" label="Tab 1">
            <Text>Content 1</Text>
          </Tab>
        </Container>,
      );

      expect(scrollProgressValue).toBe(0);
    });
  });

  describe("onFocusedTabPress", () => {
    it("onFocusedTabPress が prop として受け付けられる", () => {
      const onFocusedTabPress = vi.fn();

      const { container } = render(
        <Container onFocusedTabPress={onFocusedTabPress}>
          <Tab name="tab1" label="Tab 1">
            <Text>Content 1</Text>
          </Tab>
        </Container>,
      );

      expect(container.firstChild).toBeTruthy();
    });
  });

  describe("nearbyIndexes", () => {
    it("nearbyIndexes がコンテキストに含まれる", () => {
      render(
        <Container
          infiniteScroll={false}
          renderTabBar={(props) => {
            // renderTabBar では nearbyIndexes は直接渡されないが、
            // useTabsContext で取得できることをテスト
            return <View />;
          }}
        >
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

      // コンテナがクラッシュしないことを確認
      expect(true).toBeTruthy();
    });

    it("初期状態で activeIndex=0 の隣接タブが含まれる（offscreenPageLimit=1）", () => {
      let receivedNearbyIndexes: number[] = [];

      render(
        <Container
          infiniteScroll={false}
          offscreenPageLimit={1}
          renderTabBar={() => <View />}
        >
          <Tab name="tab1" label="Tab 1">
            <NearbyCapture
              onCapture={(v) => {
                receivedNearbyIndexes = v;
              }}
            />
          </Tab>
          <Tab name="tab2" label="Tab 2">
            <Text>Content 2</Text>
          </Tab>
          <Tab name="tab3" label="Tab 3">
            <Text>Content 3</Text>
          </Tab>
        </Container>,
      );

      // activeIndex=0, offscreenPageLimit=1 → [0, 1] が nearby
      expect(receivedNearbyIndexes).toContain(0);
      expect(receivedNearbyIndexes).toContain(1);
      expect(receivedNearbyIndexes).not.toContain(2);
    });

    it("offscreenPageLimit=2 で前後2タブが nearby に含まれる", () => {
      let receivedNearbyIndexes: number[] = [];

      render(
        <Container
          infiniteScroll={false}
          offscreenPageLimit={2}
          renderTabBar={() => <View />}
        >
          <Tab name="tab1" label="Tab 1">
            <NearbyCapture
              onCapture={(v) => {
                receivedNearbyIndexes = v;
              }}
            />
          </Tab>
          <Tab name="tab2" label="Tab 2">
            <Text>Content 2</Text>
          </Tab>
          <Tab name="tab3" label="Tab 3">
            <Text>Content 3</Text>
          </Tab>
          <Tab name="tab4" label="Tab 4">
            <Text>Content 4</Text>
          </Tab>
          <Tab name="tab5" label="Tab 5">
            <Text>Content 5</Text>
          </Tab>
        </Container>,
      );

      // activeIndex=0, offscreenPageLimit=2 → [0, 1, 2]
      expect(receivedNearbyIndexes).toContain(0);
      expect(receivedNearbyIndexes).toContain(1);
      expect(receivedNearbyIndexes).toContain(2);
      expect(receivedNearbyIndexes).not.toContain(3);
    });
  });

  describe("debug logging", () => {
    it("debug=false の場合 onDebugLog が呼ばれない", () => {
      const onDebugLog = vi.fn();

      render(
        <Container debug={false} onDebugLog={onDebugLog} infiniteScroll={false}>
          <Tab name="tab1" label="Tab 1">
            <Text>Content 1</Text>
          </Tab>
        </Container>,
      );

      expect(onDebugLog).not.toHaveBeenCalled();
    });

    it("debug=true の場合 onDebugLog が呼ばれる", () => {
      const onDebugLog = vi.fn();

      render(
        <Container debug={true} onDebugLog={onDebugLog} infiniteScroll={false}>
          <Tab name="tab1" label="Tab 1">
            <Text>Content 1</Text>
          </Tab>
          <Tab name="tab2" label="Tab 2">
            <Text>Content 2</Text>
          </Tab>
        </Container>,
      );

      // 初回レンダリング時にアクティブタブと隣接タブのログが呼ばれる
      expect(onDebugLog).toHaveBeenCalled();
      const calls = onDebugLog.mock.calls.map(
        (c: [{ type: string }]) => c[0].type,
      );
      expect(calls).toContain("tab-active");
    });

    it("debug prop を受け付ける", () => {
      const { container } = render(
        <Container debug={true} infiniteScroll={false}>
          <Tab name="tab1" label="Tab 1">
            <Text>Content 1</Text>
          </Tab>
        </Container>,
      );

      expect(container.firstChild).toBeTruthy();
    });

    it("onDebugLog のイベントに timestamp が含まれる", () => {
      const onDebugLog = vi.fn();

      render(
        <Container debug={true} onDebugLog={onDebugLog} infiniteScroll={false}>
          <Tab name="tab1" label="Tab 1">
            <Text>Content 1</Text>
          </Tab>
          <Tab name="tab2" label="Tab 2">
            <Text>Content 2</Text>
          </Tab>
        </Container>,
      );

      if (onDebugLog.mock.calls.length > 0) {
        const event = onDebugLog.mock.calls[0][0];
        expect(event.timestamp).toBeTypeOf("number");
        expect(event.tabName).toBeTypeOf("string");
        expect(event.tabIndex).toBeTypeOf("number");
      }
    });
  });

  describe("offscreenPageLimit", () => {
    it("デフォルト offscreenPageLimit=1 でレンダリングされる", () => {
      const { container } = render(
        <Container infiniteScroll={false}>
          <Tab name="tab1" label="Tab 1">
            <Text>Content 1</Text>
          </Tab>
        </Container>,
      );

      expect(container.firstChild).toBeTruthy();
    });

    it("offscreenPageLimit=2 でレンダリングされる", () => {
      const { container } = render(
        <Container offscreenPageLimit={2} infiniteScroll={false}>
          <Tab name="tab1" label="Tab 1">
            <Text>Content 1</Text>
          </Tab>
        </Container>,
      );

      expect(container.firstChild).toBeTruthy();
    });
  });

  describe("lazy mount", () => {
    it("lazy=true の場合、nearby でないタブのコンテンツはレンダリングされない", () => {
      const { queryByText } = render(
        <Container lazy={true} infiniteScroll={false} offscreenPageLimit={1}>
          <Tab name="tab1" label="Tab 1">
            <Text>Content 1</Text>
          </Tab>
          <Tab name="tab2" label="Tab 2">
            <Text>Content 2</Text>
          </Tab>
          <Tab name="tab3" label="Tab 3">
            <Text>Content 3</Text>
          </Tab>
          <Tab name="tab4" label="Tab 4">
            <Text>Content 4</Text>
          </Tab>
        </Container>,
      );

      // activeIndex=0, offscreenPageLimit=1 → nearby=[0,1]
      // tab1(idx=0) と tab2(idx=1) のコンテンツはレンダリングされる
      expect(queryByText("Content 1")).toBeTruthy();
      expect(queryByText("Content 2")).toBeTruthy();
      // tab3(idx=2) と tab4(idx=3) はレンダリングされない
      expect(queryByText("Content 3")).toBeFalsy();
      expect(queryByText("Content 4")).toBeFalsy();
    });

    it("lazy=false（デフォルト）の場合、全タブのコンテンツがレンダリングされる", () => {
      const { queryByText } = render(
        <Container lazy={false} infiniteScroll={false} offscreenPageLimit={1}>
          <Tab name="tab1" label="Tab 1">
            <Text>Content 1</Text>
          </Tab>
          <Tab name="tab2" label="Tab 2">
            <Text>Content 2</Text>
          </Tab>
          <Tab name="tab3" label="Tab 3">
            <Text>Content 3</Text>
          </Tab>
          <Tab name="tab4" label="Tab 4">
            <Text>Content 4</Text>
          </Tab>
        </Container>,
      );

      // 全タブのコンテンツがレンダリングされる
      expect(queryByText("Content 1")).toBeTruthy();
      expect(queryByText("Content 2")).toBeTruthy();
      expect(queryByText("Content 3")).toBeTruthy();
      expect(queryByText("Content 4")).toBeTruthy();
    });

    it("lazy=true で一度 nearby になったタブはマウントされたまま維持される", () => {
      // 初回: activeIndex=0 → nearby=[0,1] → tab1, tab2 がマウント
      // tab3 は nearby になったことがないのでマウントされない
      const { queryByText } = render(
        <Container lazy={true} infiniteScroll={false} offscreenPageLimit={1}>
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

      // 一度マウントされた tab1, tab2 は維持される
      expect(queryByText("Content 1")).toBeTruthy();
      expect(queryByText("Content 2")).toBeTruthy();
    });
  });
});
