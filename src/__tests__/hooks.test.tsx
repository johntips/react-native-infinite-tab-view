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
  onCapture(indexes);
  return <Text>{JSON.stringify(indexes)}</Text>;
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

  it("隣接タブに対して true を返す（offscreenPageLimit=1）", () => {
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
