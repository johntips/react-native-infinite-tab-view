import type React from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InteractionManager, StyleSheet, View } from "react-native";
import {
  Tabs,
  useIsNearby,
  useTabsContext,
} from "react-native-infinite-tab-view";
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
import {
  markActivation,
  markListPhase,
  markMountCost,
  markReady,
  markUnmount,
} from "../utils/perfLogger";
import { NewsCard } from "./NewsCard";

interface NewsListProps {
  category: string;
  tabIndex: number;
}

const renderItem = ({ item }: { item: NewsItem }) => <NewsCard item={item} />;
const keyExtractor = (item: NewsItem) => item.id;

/**
 * News list lightweight wrapper.
 *
 * ニュースリスト軽量ラッパー。
 *
 * Async Follow Design:
 * - Before activation: skeleton only (4 hooks).
 * - On activation: use InteractionManager to wait for the swipe animation to
 *   complete, then mount the heavy content.
 * - After leaving (isActive=false AND isNearby=false): unmount the Heavy
 *   content to release JS thread resources.
 *
 * v4.4.0 note: the library's `lazy={true}` + infinite scroll bug (10x mount
 * duplication per realIndex) has been fixed at the library level. Consumers
 * no longer need a primary-instance claim hack — this wrapper is a faithful
 * demonstration of the "recommended consumer pattern" without workarounds.
 *
 * v4.4.0 注記: ライブラリ側で `lazy={true}` + infinite scroll の 10x mount
 * 複製 bug が直ったため、consumer 側で primary インスタンス claim を自前で
 * 実装する必要はない。このラッパーは "推奨される consumer パターン" の
 * 最小実装として、ワークアラウンドなしで動作する。
 */
export const NewsList: React.FC<NewsListProps> = memo(
  ({ category, tabIndex }) => {
    // v4.4.0: Subscribe directly to the Container's centralized subscription.
    // Before v4.4.0 each NewsList had its own useAnimatedReaction (20+ per
    // screen); now the Container runs a single reaction and notifies this
    // instance via a callback. This reduces React commit cost on tab switch.
    //
    // v4.4.0: Container 側の centralized subscription を直接購読する。
    // 従来は NewsList 毎に useAnimatedReaction を持っていたが、今は Container
    // の 1 個の reaction から通知を受け取るだけ。React commit 時の batch
    // サイズが減り、dispatch latency が改善する。
    const ctx = useTabsContext();
    const [isActive, setIsActive] = useState(() =>
      ctx.subscriptions.getInitialActive(tabIndex),
    );
    // isNearby も同じく centralized subscription 経由
    // isNearby also goes through the centralized subscription.
    const isNearby = useIsNearby(category.toLowerCase());

    // Whether to mount the heavy content or show the lightweight skeleton.
    // - false: render NewsListSkeleton (cheap)
    // - true:  mount HeavyNewsListContent (30+ hooks, useMockQuery, FlashList)
    //
    // Heavy コンテンツを表示してよい状態か。
    // - false: NewsListSkeleton を表示（軽量）
    // - true: HeavyNewsListContent を mount（30+ hooks、useMockQuery、etc）
    const [ready, setReady] = useState(tabIndex === 0);

    // The mount log fires exactly once per activation session via this ref.
    // Rapidly flipping isActive during a swipe must not produce duplicate logs.
    //
    // mount ログは "このインスタンスで active になった瞬間" だけ出す。
    // isActive が高速で true↔false する swipe 中に useEffect が多重発火しても、
    // markListPhase("mount") は 1 回しか呼ばれないよう ref で固定する。
    const mountLoggedRef = useRef(false);

    // Subscribe to active changes. The workletTime argument comes from the
    // Container's worklet and enables measuring the worklet→JS bridge hop.
    //
    // perf 計測を兼ねた subscription callback。
    // workletTime は Container の worklet で取得された performance.now() 値。
    // markActivation に渡すことで hop latency が計測できる。
    useEffect(() => {
      const handleActiveChange = (next: boolean, workletTime?: number) => {
        if (next) {
          markActivation(category.toLowerCase(), workletTime);
        }
        setIsActive(next);
      };
      // Sync the latest value on mount (covers edge cases where activeIndex
      // changed between initial state and effect fire).
      // マウント時に最新値で同期
      setIsActive(ctx.subscriptions.getInitialActive(tabIndex));
      return ctx.subscriptions.subscribeToActive(tabIndex, handleActiveChange);
    }, [tabIndex, category, ctx.subscriptions]);

    // On activation: schedule HeavyContent mount via InteractionManager so the
    // swipe animation finishes before the heavy React work begins.
    //
    // アクティブ化 → Heavy mount （InteractionManager でスワイプアニメ完了を待つ）
    useEffect(() => {
      if (isActive && !ready) {
        if (!mountLoggedRef.current) {
          mountLoggedRef.current = true;
          markListPhase(category.toLowerCase(), "mount");
        }
        const handle = InteractionManager.runAfterInteractions(() => {
          markReady(category.toLowerCase());
          setReady(true);
        });
        return () => handle.cancel();
      }
    }, [isActive, ready, category]);

    // Far away (neither active nor nearby) → unmount HeavyContent so its
    // setTimeouts / useEffects / useMemos stop consuming the JS thread.
    //
    // 遠くに離れた (active でなく nearby でもない) → Heavy アンマウント
    // これにより通過後のタブの setTimeout/useEffect/useMemo が JS thread から退避される。
    useEffect(() => {
      if (!isActive && !isNearby && ready) {
        setReady(false);
        mountLoggedRef.current = false; // allow re-measurement on next activation
      }
    }, [isActive, isNearby, ready]);

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
  // --- mount コスト計測: render 開始時刻を useRef に記録 ---
  // useState の lazy init を使って "初回 render 時刻" を取得
  const mountStartTimeRef = useRef<number | null>(null);
  if (mountStartTimeRef.current === null) {
    mountStartTimeRef.current = performance.now();
  }

  // --- unmount コスト計測 (start marker: 宣言順が逆になるため最初の effect) ---
  // React cleanup は宣言の逆順で実行される。つまり、この effect の cleanup は
  // このコンポーネント内の **すべての useEffect cleanup が終わった後** に最後に呼ばれる。
  // 開始時刻マーカーは最後に宣言した effect の cleanup で打ち、終了時刻をここで打つ。
  const unmountStartRef = useRef<number | null>(null);
  useEffect(() => {
    // mount が完了した時点でコストを記録 (render 開始 → useEffect fire)
    if (mountStartTimeRef.current !== null) {
      const mountCost = performance.now() - mountStartTimeRef.current;
      markMountCost(category.toLowerCase(), mountCost);
      mountStartTimeRef.current = null; // 再発火を防ぐ
    }
    return () => {
      // ここが最後に実行される → unmountStartRef.current との差分が unmount 総コスト
      if (unmountStartRef.current !== null) {
        const dur = performance.now() - unmountStartRef.current;
        markUnmount(category.toLowerCase(), dur);
      }
    };
  }, [category]);

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
  // paint 計測用 RAF ハンドル（unmount 時に cancel するため）
  const rafRef = useRef<number | null>(null);

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
      markListPhase(category.toLowerCase(), "dataReady");
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

  // 最初の paint を計測
  // useEffect は commit 直後に走るため、この時点ではまだ native の描画は終わっていない。
  // requestAnimationFrame を 2 回経由すると、ほぼ実際の paint 完了後のタイミングで発火する。
  // これにより data:x paint:y が意味のある値になる（paint:0ms の計測バグ対策）。
  const firstRenderMarkedRef = useRef(false);
  useEffect(() => {
    if (filteredData.length > 0 && !firstRenderMarkedRef.current) {
      firstRenderMarkedRef.current = true;
      const raf1 = requestAnimationFrame(() => {
        const raf2 = requestAnimationFrame(() => {
          markListPhase(category.toLowerCase(), "firstRender");
          rafRef.current = null;
        });
        rafRef.current = raf2;
      });
      rafRef.current = raf1;
    }
  }, [filteredData.length, category]);

  // RAF cleanup: unmount 時に残った raf を解放
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // --- unmount コスト計測 (end marker: 最後に宣言する) ---
  // 宣言順が最後 = cleanup が最初に呼ばれる → ここで "unmount 開始時刻" を記録し、
  // 最初に宣言した effect の cleanup (= 最後に呼ばれる) で差分を取る。
  useEffect(() => {
    return () => {
      unmountStartRef.current = performance.now();
    };
  }, []);

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
