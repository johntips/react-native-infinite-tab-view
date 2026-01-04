import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NewsItem } from "../data/newsItems";

interface NewsCardProps {
  item: NewsItem;
}

export const NewsCard = memo<NewsCardProps>(({ item }) => {
  return (
    <View style={styles.card}>
      <View style={[styles.cardImage, { backgroundColor: item.imageColor }]} />
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardDescription} numberOfLines={3}>
          {item.description}
        </Text>
        <View style={styles.cardFooter}>
          <Text style={styles.cardCategory}>{item.category}</Text>
        </View>
      </View>
    </View>
  );
});

NewsCard.displayName = "NewsCard";

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
  },
  cardImage: {
    height: 200,
    width: "100%",
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardCategory: {
    fontSize: 12,
    fontWeight: "500",
    color: "#999",
    textTransform: "uppercase",
  },
});
