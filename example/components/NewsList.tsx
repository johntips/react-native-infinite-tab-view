import type React from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InteractionManager, StyleSheet, Text, View } from "react-native";
import {
  Tabs,
  useActiveTabIndexValue,
  useIsNearby,
  useTabs,
} from "react-native-infinite-tab-view";
import { useDerivedValue, useSharedValue } from "react-native-reanimated";
import type { NewsItem } from "../data/newsItems";
import { getNewsByCategory } from "../data/newsItems";
import { NewsCard } from "./NewsCard";

interface NewsListProps {
  category: string;
}

const renderItem = ({ item }: { item: NewsItem }) => <NewsCard item={item} />;
const keyExtractor = (item: NewsItem) => item.id;

/**
 * production レベルの重い NewsList
 *
 * 軽量ラッパー + InteractionManager 遅延マウントパターン:
 * - 未 focus のタブはスケルトンのみ（hooks ゼロ）
 * - focus 後にスワイプアニメーション完了を待ってから重いコンテンツをマウント
 * → タブスワイプは常に 60fps、コンテンツは後追いで表示
 *
 * 重いコンテンツ（HeavyNewsListContent）:
 * - hooks 20個+（useState × 5, useEffect × 5, useSharedValue × 3, useDerivedValue × 1, etc.）
 * - 模擬 API fetch（500ms 遅延）
 * - 複雑なデータ変換（useMemo）
 * → この重さでもタブスワイプが 60fps で動くことを証明
 */
export const NewsList: React.FC<NewsListProps> = memo(({ category }) => {
  const tabName = category.toLowerCase();
  // v4: useActiveTabIndexValue は JS 値（number）を返す（re-render あり）
  const activeIndex = useActiveTabIndexValue();
  const tabs = useTabs();
  const isActive = tabs[activeIndex]?.name === tabName;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isActive && !ready) {
      const handle = InteractionManager.runAfterInteractions(() => {
        setReady(true);
      });
      return () => handle.cancel();
    }
  }, [isActive, ready]);

  if (!ready) {
    return <NewsListSkeleton />;
  }

  return <HeavyNewsListContent category={category} />;
});

NewsList.displayName = "NewsList";

// スケルトン（hooks ゼロ — 即座にレンダリング）
function NewsListSkeleton() {
  return (
    <View style={styles.container}>
      {Array.from({ length: 5 }).map((_, i) => (
        <View key={i} style={styles.skeletonCard}>
          <View style={styles.skeletonImage} />
          <View style={styles.skeletonContent}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonDesc} />
            <View style={styles.skeletonPrice} />
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * 重いコンテンツコンポーネント（hooks 20個+）
 * production の PackListContent を模倣
 */
const HeavyNewsListContent = memo(function HeavyNewsListContent({
  category,
}: {
  category: string;
}) {
  // --- production 相当の hooks 群（37個中の主要部分を再現）---

  // useState × 5
  const [data, setData] = useState<NewsItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [imageReloadKey, setImageReloadKey] = useState(0);

  // useRef × 5
  const mountTime = useRef(Date.now());
  const prefetchedRef = useRef(false);
  const prevSortOrder = useRef(sortOrder);
  const scrollPositionRef = useRef(0);
  const isFirstMount = useRef(true);

  // useSharedValue × 3（Reanimated — production の scrollY 監視を模倣）
  const scrollProgress = useSharedValue(0);
  const scrollStartY = useSharedValue(0);
  const headerVisible = useSharedValue(1);

  // useDerivedValue（重い — 毎スクロールで評価）
  useDerivedValue(() => {
    const dist = scrollProgress.value - scrollStartY.value;
    if (Math.abs(dist) > 50) {
      headerVisible.value = dist > 0 ? 0 : 1;
      scrollStartY.value = scrollProgress.value;
    }
    return headerVisible.value;
  });

  // useIsNearby（ライブラリ hook）
  const tabName = category.toLowerCase();
  const isNearby = useIsNearby(tabName);

  // useEffect × 5（模擬 API fetch + 副作用）
  useEffect(() => {
    // 模擬 API fetch（500ms 遅延 — ネットワーク遅延を再現）
    setIsLoading(true);
    const timer = setTimeout(() => {
      const items = getNewsByCategory(category);
      setData(items);
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [category]);

  useEffect(() => {
    // 画像プリフェッチ（production の ExpoImage.prefetch を模倣）
    if (data && data.length > 0 && !prefetchedRef.current) {
      prefetchedRef.current = true;
      if (__DEV__) {
        console.log(
          `[HeavyNewsList] ${category}: prefetching ${Math.min(3, data.length)} images`,
        );
      }
    }
  }, [data, category]);

  useEffect(() => {
    // ソート変更追跡
    if (prevSortOrder.current !== sortOrder) {
      prevSortOrder.current = sortOrder;
      setImageReloadKey((prev) => prev + 1);
    }
  }, [sortOrder]);

  useEffect(() => {
    // マウント/アンマウント追跡
    if (__DEV__ && isFirstMount.current) {
      isFirstMount.current = false;
      const elapsed = Date.now() - mountTime.current;
      console.log(
        `[HeavyNewsList] ${category}: mounted in ${elapsed}ms (hooks: 20+)`,
      );
    }
  }, [category]);

  useEffect(() => {
    // 複雑な cleanup（production の subscription.remove を模倣）
    return () => {
      scrollPositionRef.current = 0;
    };
  }, []);

  // useCallback × 3
  const handleScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      scrollPositionRef.current = e.nativeEvent.contentOffset.y;
      scrollProgress.value = e.nativeEvent.contentOffset.y;
    },
    [scrollProgress],
  );

  const handleSortChange = useCallback(() => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  }, []);

  const handleFilterClear = useCallback(() => {
    setFilterTag(null);
  }, []);

  // useMemo（重いデータ変換 — production の usePreparePackSections を模倣）
  const sortedData = useMemo(() => {
    if (!data) return [];
    const sorted = [...data].sort((a, b) =>
      sortOrder === "desc" ? b.price - a.price : a.price - b.price,
    );
    if (filterTag) {
      return sorted.filter((item) =>
        item.title.toLowerCase().includes(filterTag.toLowerCase()),
      );
    }
    return sorted;
  }, [data, sortOrder, filterTag]);

  if (isLoading || !data) {
    return <NewsListSkeleton />;
  }

  return (
    <View style={styles.container}>
      <Tabs.FlashList
        data={sortedData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        estimatedItemSize={360}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        drawDistance={600}
        extraData={imageReloadKey}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  contentContainer: {
    padding: 16,
  },
  skeletonCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    overflow: "hidden",
  },
  skeletonImage: {
    height: 200,
    backgroundColor: "#E8E8E8",
  },
  skeletonContent: {
    padding: 16,
  },
  skeletonTitle: {
    height: 20,
    width: "70%",
    backgroundColor: "#E8E8E8",
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonDesc: {
    height: 14,
    width: "90%",
    backgroundColor: "#E8E8E8",
    borderRadius: 4,
    marginBottom: 12,
  },
  skeletonPrice: {
    height: 24,
    width: "40%",
    backgroundColor: "#E8E8E8",
    borderRadius: 4,
  },
});
