import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

/**
 * 大量カスタムフック負荷シミュレーション
 * 実アプリ想定の直列・並列処理（軽い/重い混在）を再現する。
 *
 * 構成:
 * - 軽量な state 管理フック: useMockAuth, useMockStore, useMockEventCenter
 * - 非同期データ取得フック: useMockQuery（300ms 遅延）
 * - Reanimated 駆動のアニメーションフック: useFadeInAnimation 等
 * - 副作用フック: useMockScrollTracking, useMockImagePrefetch 等
 */

// -----------------------------------------------------------------------------
// 軽量 state フック（Context / Zustand 相当の参照コスト再現）
// -----------------------------------------------------------------------------

/**
 * 認証状態参照を模倣
 * 実アプリの Context 参照に相当（軽量）
 */
export function useMockAuth() {
  const [authenticated] = useState(true);
  const [user] = useState({ id: "user-1", name: "Test User" });
  return { authenticated, user };
}

/**
 * グローバルストア参照を模倣（Zustand 相当）
 */
export function useMockStore() {
  const [pendingInvalidation, setPendingInvalidation] = useState(false);
  const [pendingToast, setPendingToast] = useState<string | null>(null);

  const clearPending = useCallback(() => {
    setPendingInvalidation(false);
    setPendingToast(null);
  }, []);

  return { pendingInvalidation, pendingToast, clearPending };
}

/**
 * イベント購読を模倣
 */
export function useMockEventCenter() {
  const [event] = useState<{ id: string } | null>(null);
  const refetchEvent = useCallback(() => {}, []);
  return { event, refetchEvent };
}

// -----------------------------------------------------------------------------
// 非同期データ取得フック（React Query 相当の遅い処理）
// -----------------------------------------------------------------------------

/**
 * データ取得フック（模擬 API fetch、300ms 遅延）
 * 実アプリの useQuery に相当。
 */
export function useMockQuery<T>(
  key: string,
  fetcher: () => T,
  options?: { enabled?: boolean; delayMs?: number },
): { data: T | undefined; isPending: boolean; refetch: () => void } {
  const [data, setData] = useState<T | undefined>(undefined);
  const [isPending, setIsPending] = useState(true);
  const enabled = options?.enabled ?? true;
  const delayMs = options?.delayMs ?? 300;

  const refetch = useCallback(() => {
    if (!enabled) return;
    setIsPending(true);
    const timer = setTimeout(() => {
      setData(fetcher());
      setIsPending(false);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [enabled, fetcher, delayMs]);

  useEffect(() => {
    if (!enabled) {
      setIsPending(false);
      return;
    }
    refetch();
  }, [enabled, refetch]);

  return { data, isPending, refetch };
}

// -----------------------------------------------------------------------------
// Reanimated 駆動フック（UI thread で実行される軽量アニメ）
// -----------------------------------------------------------------------------

/**
 * スクロール追跡（SharedValue + useDerivedValue）
 * ヘッダー折りたたみ判定などに使用される構成を再現。
 */
export function useMockScrollTracking() {
  const scrollY = useSharedValue(0);
  const scrollStartY = useSharedValue(0);
  const headerVisible = useSharedValue(1);

  useDerivedValue(() => {
    const dist = scrollY.value - scrollStartY.value;
    if (Math.abs(dist) > 50) {
      headerVisible.value = dist > 0 ? 0 : 1;
      scrollStartY.value = scrollY.value;
    }
    return headerVisible.value;
  });

  return { scrollY, headerVisible };
}

// -----------------------------------------------------------------------------
// 副作用系フック（useEffect + useRef の組み合わせ）
// -----------------------------------------------------------------------------

/**
 * スクロールトップ制御
 */
export function useMockScrollToTop<T>(_ref: React.RefObject<T>) {
  const lastTriggerRef = useRef(0);
  useEffect(() => {
    lastTriggerRef.current = Date.now();
  }, []);
}

/**
 * Throttled refresh（pull-to-refresh 制御）
 */
export function useMockThrottledRefresh(options: {
  onRefresh: () => Promise<void>;
  throttleMs?: number;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const lastRefreshRef = useRef(0);
  const throttleMs = options.throttleMs ?? 5000;

  const handleRefresh = useCallback(async () => {
    const now = Date.now();
    if (now - lastRefreshRef.current < throttleMs) return;
    lastRefreshRef.current = now;
    setRefreshing(true);
    try {
      await options.onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [options, throttleMs]);

  return { handleRefresh, refreshing };
}

/**
 * 画像プリフェッチ
 */
export function useMockImagePrefetch(items: { imageUrl: string }[]) {
  const prefetchedRef = useRef(false);
  useEffect(() => {
    if (items.length > 0 && !prefetchedRef.current) {
      prefetchedRef.current = true;
      // 実際のプリフェッチは不要（コスト再現のみ）
    }
  }, [items]);
}

// -----------------------------------------------------------------------------
// アニメーションフック（カード1枚ごとに実行される小さなコスト）
// -----------------------------------------------------------------------------

/**
 * カード全体のフェードイン
 */
export function useFadeInAnimation() {
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
  }, [opacity]);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));
}

/**
 * プログレスバーアニメーション
 */
export function useProgressAnimation(current: number, total: number) {
  const progress = useSharedValue(current / total);

  useEffect(() => {
    progress.value = withTiming(current / total, { duration: 500 });
  }, [current, total, progress]);

  return useAnimatedStyle(() => ({
    width: `${progress.value * 100}%` as `${number}%`,
  }));
}

/**
 * 画像ロード状態管理（フェードイン付き）
 */
export function useImageLoader() {
  const [loaded, setLoaded] = useState(false);
  const opacity = useSharedValue(0);

  const handleLoad = useCallback(() => {
    setLoaded(true);
    opacity.value = withTiming(1, { duration: 300 });
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return { loaded, handleLoad, animatedStyle };
}

/**
 * 軽量な計算コスト（useMemo 再評価の負荷再現）
 */
export function useMockHeavyComputation<T, R>(
  data: T[],
  computeFn: (items: T[]) => R,
): R {
  return useMemo(() => computeFn(data), [data, computeFn]);
}
