import type React from "react";
import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { Tabs } from "react-native-infinite-tab-view";
import type { NewsItem } from "../data/newsItems";
import { getNewsByCategory } from "../data/newsItems";
import { NewsCard } from "./NewsCard";

interface NewsListProps {
  category: string;
}

const renderItem = ({ item }: { item: NewsItem }) => (
  <NewsCard item={item} />
);

const keyExtractor = (item: NewsItem) => item.id;

/**
 * Tabs.FlashList を使用した高パフォーマンスニュースリスト
 * - FlashList のリサイクル機構で大量アイテムでもメモリ効率が高い
 * - estimatedItemSize で初回レンダリングを高速化
 * - renderItem を外部定義して不要な再生成を防止
 */
export const NewsList: React.FC<NewsListProps> = memo(({ category }) => {
  const newsItems = getNewsByCategory(category);

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
