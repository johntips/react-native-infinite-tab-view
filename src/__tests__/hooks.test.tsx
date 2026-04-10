import { render } from "@testing-library/react";
import { Text } from "react-native";
import { describe, expect, it } from "vitest";
import { Container } from "../Container";
import { useIsNearby, useNearbyIndexes } from "../hooks";
import { Tab } from "../Tab";

// useIsNearby テスト用: レンダリング中に値をキャプチャ
function NearbyCapture({
  tabName,
  onCapture,
}: {
  tabName: string;
  onCapture: (v: boolean) => void;
}) {
  const isNearby = useIsNearby(tabName);
  onCapture(isNearby);
  return <Text>{isNearby ? "nearby" : "far"}</Text>;
}

function NearbyIndexesCapture({
  onCapture,
}: {
  onCapture: (v: number[]) => void;
}) {
  const indexes = useNearbyIndexes();
  // v4: SharedValue<number[]> → .value
  onCapture(indexes.value);
  return <Text>{JSON.stringify(indexes.value)}</Text>;
}

describe("useIsNearby", () => {
  it("アクティブタブに対して true を返す", () => {
    let result = false;

    render(
      <Container infiniteScroll={false} offscreenPageLimit={1}>
        <Tab name="tab1" label="Tab 1">
          <NearbyCapture
            tabName="tab1"
            onCapture={(v) => {
              result = v;
            }}
          />
        </Tab>
        <Tab name="tab2" label="Tab 2">
          <Text>Content 2</Text>
        </Tab>
      </Container>,
    );

    expect(result).toBe(true);
  });

  // v4.4.0: getInitialNearby は SharedValue<nearbyIndexes> を直読みするため、
  // mock 環境でも offscreenPageLimit=1 の初期値 [0, 1] を反映して隣接タブは true を返す。
  // 旧実装では useAnimatedReaction の初回発火に依存していたため mock 環境で false だったが、
  // centralized subscription + 直読みで "実機と同じ挙動" が初回レンダリングから得られる。
  it("隣接タブ (offscreenPageLimit=1) は初期値 true を返す", () => {
    let result = false;

    render(
      <Container infiniteScroll={false} offscreenPageLimit={1}>
        <Tab name="tab1" label="Tab 1">
          <NearbyCapture
            tabName="tab2"
            onCapture={(v) => {
              result = v;
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

    // tab2 は activeIndex=0 に対して offscreenPageLimit=1 内なので nearby = true
    expect(result).toBe(true);
  });

  it("遠いタブに対して false を返す", () => {
    let result = true;

    render(
      <Container infiniteScroll={false} offscreenPageLimit={1}>
        <Tab name="tab1" label="Tab 1">
          <NearbyCapture
            tabName="tab4"
            onCapture={(v) => {
              result = v;
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
      </Container>,
    );

    expect(result).toBe(false);
  });
});

describe("useNearbyIndexes", () => {
  it("nearbyIndexes を返す", () => {
    let captured: number[] = [];

    render(
      <Container infiniteScroll={false} offscreenPageLimit={1}>
        <Tab name="tab1" label="Tab 1">
          <NearbyIndexesCapture
            onCapture={(v) => {
              captured = v;
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

    expect(captured).toContain(0);
    expect(captured).toContain(1);
  });
});
