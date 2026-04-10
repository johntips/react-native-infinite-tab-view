import type React from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InteractionManager, StyleSheet, View } from "react-native";
import {
  Tabs,
  useActiveTabIndex,
  useIsNearby,
} from "react-native-infinite-tab-view";
import { runOnJS, useAnimatedReaction } from "react-native-reanimated";
import type { NewsItem } from "../data/newsItems";
import { getNewsByCategory } from "../data/newsItems";
import {
  useMockAuth,
  useMockEventCenter,
  useMockImagePrefetch,
  useMockQuery,
  useMockScrollToTop,
  useMockScrollTracking,
  useMockStore,
  useMockThrottledRefresh,
} from "../hooks/useMockHooks";
import { markListPhase } from "../utils/perfLogger";
import { NewsCard } from "./NewsCard";

interface NewsListProps {
  category: string;
  tabIndex: number;
}

const renderItem = ({ item }: { item: NewsItem }) => <NewsCard item={item} />;
const keyExtractor = (item: NewsItem) => item.id;

/**
 * ニュースリスト軽量ラッパー
 *
 * Async Follow Design:
 * - アクティブ化前: スケルトンのみ表示（hooks 4個）
 * - アクティブ化後: InteractionManager でスワイプアニメ完了を待ち、重いコンテンツをマウント
 * → タブスワイプを JS thread から完全に切り離し、60fps を担保
 */
export const NewsList: React.FC<NewsListProps> = memo(
  ({ category, tabIndex }) => {
    // v4: activeIndex を SharedValue で購読し、自分のタブだけ isActive を更新
    // → 20個の NewsList が存在しても、setState が走るのは旧/新アクティブの2個のみ
    const activeIndex = useActiveTabIndex();
    const [isActive, setIsActive] = useState(tabIndex === 0);
    const [ready, setReady] = useState(tabIndex === 0);

    useAnimatedReaction(
      () => activeIndex.value === tabIndex,
      (current, prev) => {
        if (current !== prev) {
          runOnJS(setIsActive)(current);
        }
      },
      [tabIndex],
    );

    useEffect(() => {
      if (isActive && !ready) {
        markListPhase(category, "mount");
        const handle = InteractionManager.runAfterInteractions(() => {
          setReady(true);
        });
        return () => handle.cancel();
      }
    }, [isActive, ready, category]);

    if (!ready) {
      return <NewsListSkeleton />;
    }

    return <HeavyNewsListContent category={category} />;
  },
);

NewsList.displayName = "NewsList";

/**
 * スケルトン（hooks ゼロ — 即座にレンダリング）
 * タブスワイプ中は必ずこれが表示される。
 */
function NewsListSkeleton() {
  return (
    <View style={styles.container}>
      {Array.from({ length: 5 }).map((_, i) => (
        <View key={i} style={styles.skeletonCard}>
          <View style={styles.skeletonImage} />
          <View style={styles.skeletonContent}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonSummary} />
            <View style={styles.skeletonMeta} />
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * 重量級コンテンツコンポーネント
 *
 * 実アプリ想定の hooks 負荷を再現:
 * - Context / Store 参照（軽量、同期）
 * - 非同期データ取得（重い、300ms 遅延）
 * - Reanimated 駆動のスクロール追跡（UI thread）
 * - 大量の useState / useEffect / useCallback / useMemo
 *
 * 合計 30+ hooks が直列・並列で実行される状況を作り出し、
 * この重さでもタブスワイプが影響を受けないことを検証する。
 */
const HeavyNewsListContent = memo(function HeavyNewsListContent({
  category,
}: {
  category: string;
}) {
  // --- Context / Store 参照（軽量、並列）---
  const { authenticated, user } = useMockAuth();
  const { pendingInvalidation, pendingToast, clearPending } = useMockStore();
  const { event, refetchEvent } = useMockEventCenter();

  // --- ローカル state (5個) ---
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [imageReloadKey, setImageReloadKey] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [errorCount, setErrorCount] = useState(0);

  // --- ref (5個) ---
  const listRef = useRef(null);
  const mountTimeRef = useRef(Date.now());
  const prevSortOrderRef = useRef(sortOrder);
  const scrollPositionRef = useRef(0);
  const isFirstMountRef = useRef(true);

  // --- Reanimated 駆動フック（UI thread、並列）---
  const { scrollY } = useMockScrollTracking();

  // --- カスタムフック（並列）---
  useMockScrollToTop(listRef);
  const { handleRefresh, refreshing } = useMockThrottledRefresh({
    onRefresh: async () => {
      // noop
    },
  });
  const isNearby = useIsNearby(category.toLowerCase());

  // --- 非同期データ取得（重い、直列）---
  const fetcher = useCallback(() => getNewsByCategory(category), [category]);
  const { data, isPending } = useMockQuery(`news-${category}`, fetcher, {
    enabled: true,
    delayMs: 300,
  });
  const { data: userStats } = useMockQuery(
    `user-stats-${user.id}`,
    useCallback(() => ({ totalReads: 42, streak: 7 }), [user.id]),
    { delayMs: 200 },
  );
  const { data: trendingTags } = useMockQuery(
    `trending-tags`,
    useCallback(() => ["AI", "Space", "Climate"], []),
    { delayMs: 150 },
  );

  useMockImagePrefetch(data ?? []);

  // --- useEffect 群（8個、並列）---
  useEffect(() => {
    // HeavyNewsListContent マウント完了時（hooks 30+ の初期化完了）
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
    }
  }, []);

  // data 取得完了を計測
  useEffect(() => {
    if (data) {
      markListPhase(category, "dataReady");
    }
  }, [data, category]);

  useEffect(() => {
    // 認証状態変更時の処理
    if (authenticated) {
      // noop (cost simulation)
    }
  }, [authenticated]);

  useEffect(() => {
    // ソート変更追跡
    if (prevSortOrderRef.current !== sortOrder) {
      prevSortOrderRef.current = sortOrder;
      setImageReloadKey((k) => k + 1);
    }
  }, [sortOrder]);

  useEffect(() => {
    // ストアの pending 処理
    if (pendingInvalidation || pendingToast) {
      clearPending();
    }
  }, [pendingInvalidation, pendingToast, clearPending]);

  useEffect(() => {
    // イベント購読
    if (event) {
      refetchEvent();
    }
  }, [event, refetchEvent]);

  useEffect(() => {
    // nearby プリフェッチ tracking
    if (isNearby && __DEV__) {
      // noop
    }
  }, [isNearby]);

  useEffect(() => {
    // data 変更時のサイドエフェクト
    if (data) {
      // noop
    }
  }, [data]);

  useEffect(() => {
    // cleanup
    return () => {
      scrollPositionRef.current = 0;
    };
  }, []);

  // --- useCallback (5個、並列) ---
  const handleScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      scrollPositionRef.current = e.nativeEvent.contentOffset.y;
      scrollY.value = e.nativeEvent.contentOffset.y;
    },
    [scrollY],
  );

  const handleSortChange = useCallback(() => {
    setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
  }, []);

  const handleFilterClear = useCallback(() => {
    setFilterTag(null);
  }, []);

  const handleItemSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleError = useCallback(() => {
    setErrorCount((c) => c + 1);
  }, []);

  // --- useMemo (2個、重いデータ変換) ---
  const sortedData = useMemo(() => {
    if (!data) return [];
    const sorted = [...data].sort((a, b) =>
      sortOrder === "desc"
        ? b.publishedAt.localeCompare(a.publishedAt)
        : a.publishedAt.localeCompare(b.publishedAt),
    );
    return sorted;
  }, [data, sortOrder]);

  const filteredData = useMemo(() => {
    if (!filterTag) return sortedData;
    return sortedData.filter((item) => item.tags.includes(filterTag));
  }, [sortedData, filterTag]);

  // 最初の render 実行時を計測
  const firstRenderMarkedRef = useRef(false);
  useEffect(() => {
    if (filteredData.length > 0 && !firstRenderMarkedRef.current) {
      firstRenderMarkedRef.current = true;
      markListPhase(category, "firstRender");
    }
  }, [filteredData.length, category]);

  if (isPending || !data) {
    return <NewsListSkeleton />;
  }

  return (
    <View style={styles.container}>
      <Tabs.FlashList
        data={filteredData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        estimatedItemSize={460}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        drawDistance={800}
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
    height: 220,
    backgroundColor: "#E8E8E8",
  },
  skeletonContent: {
    padding: 16,
  },
  skeletonTitle: {
    height: 20,
    width: "80%",
    backgroundColor: "#E8E8E8",
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonSummary: {
    height: 14,
    width: "95%",
    backgroundColor: "#E8E8E8",
    borderRadius: 4,
    marginBottom: 12,
  },
  skeletonMeta: {
    height: 12,
    width: "40%",
    backgroundColor: "#E8E8E8",
    borderRadius: 4,
  },
});
