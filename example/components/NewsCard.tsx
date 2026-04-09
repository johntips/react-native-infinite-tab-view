import { memo, useCallback, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { NewsItem } from "../data/newsItems";

interface NewsCardProps {
  item: NewsItem;
}

/**
 * 高解像度画像付きニュースカード
 * - 画像読み込み中はシマーライクなプレースホルダーを表示
 * - 読み込み完了後にフェードインアニメーション
 * - memo化でFlashListのリサイクル時の再レンダリングを抑制
 */
export const NewsCard = memo<NewsCardProps>(({ item }) => {
  const [loaded, setLoaded] = useState(false);
  const opacity = useSharedValue(0);

  const handleLoad = useCallback(() => {
    setLoaded(true);
    opacity.value = withTiming(1, { duration: 300 });
  }, [opacity]);

  const animatedImageStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={styles.card}>
      <View style={styles.imageContainer}>
        {/* プレースホルダー（画像読み込み中に表示） */}
        {!loaded && <View style={styles.placeholder} />}
        {/* 実画像（フェードイン） */}
        <Animated.View style={[StyleSheet.absoluteFill, animatedImageStyle]}>
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.image}
            resizeMode="cover"
            onLoad={handleLoad}
          />
        </Animated.View>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.cardDescription} numberOfLines={3}>
          {item.description}
        </Text>
        <View style={styles.cardFooter}>
          <View style={styles.categoryBadge}>
            <Text style={styles.cardCategory}>{item.category}</Text>
          </View>
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
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    overflow: "hidden",
  },
  imageContainer: {
    height: 200,
    width: "100%",
    backgroundColor: "#F0F0F0",
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#E8E8E8",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
    lineHeight: 22,
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
  categoryBadge: {
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardCategory: {
    fontSize: 11,
    fontWeight: "600",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
