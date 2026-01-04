import { FlashList } from "@shopify/flash-list";
import type React from "react";
import { StyleSheet, View } from "react-native";
import type { NewsItem } from "../data/newsItems";
import { getNewsByCategory } from "../data/newsItems";
import { NewsCard } from "./NewsCard";

interface NewsListProps {
  category: string;
}

export const NewsList: React.FC<NewsListProps> = ({ category }) => {
  const newsItems = getNewsByCategory(category);

  return (
    <View style={styles.container}>
      <FlashList
        data={newsItems}
        renderItem={({ item }: { item: NewsItem }) => <NewsCard item={item} />}
        keyExtractor={(item) => item.id}
        estimatedItemSize={280}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  contentContainer: {
    padding: 16,
  },
});
