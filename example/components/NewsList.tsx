import type React from "react";
import { memo, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import {
  Tabs,
  useActiveTabIndex,
  useIsNearby,
  useTabs,
} from "react-native-infinite-tab-view";
import type { NewsItem } from "../data/newsItems";
import { getNewsByCategory } from "../data/newsItems";
import { NewsCard } from "./NewsCard";

interface NewsListProps {
  category: string;
}

const renderItem = ({ item }: { item: NewsItem }) => <NewsCard item={item} />;

const keyExtractor = (item: NewsItem) => item.id;

/**
 * Tabs.FlashList + useIsNearby を使用した高パフォーマンスニュースリスト
 * - useIsNearby でアクティブ or 隣接タブかどうかを判定
 * - nearby なタブはデータフェッチを先行開始（プリフェッチ）
 * - FlashList のリサイクル機構で大量アイテムでもメモリ効率が高い
 */
export const NewsList: React.FC<NewsListProps> = memo(({ category }) => {
  const newsItems = getNewsByCategory(category);
  const tabName = category.toLowerCase();
  const isNearby = useIsNearby(tabName);
  const activeIndex = useActiveTabIndex();
  const tabs = useTabs();
  const isActive = tabs[activeIndex]?.name === tabName;

  // デバッグ: nearby / active 状態をログ出力
  useEffect(() => {
    if (__DEV__) {
      if (isActive) {
        console.log(`[NewsList] ${category}: ACTIVE — rendering content`);
      } else if (isNearby) {
        console.log(`[NewsList] ${category}: NEARBY — prefetching data`);
      }
    }
  }, [isNearby, isActive, category]);

  return (
    <View style={styles.container}>
      <Tabs.FlashList
        data={newsItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        estimatedItemSize={310}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        drawDistance={600}
      />
    </View>
  );
});

NewsList.displayName = "NewsList";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  contentContainer: {
    padding: 16,
  },
});
