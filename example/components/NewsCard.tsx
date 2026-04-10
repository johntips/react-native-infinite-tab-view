import { memo, useCallback, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { NewsItem } from "../data/newsItems";
import { useFadeInAnimation, useImageLoader } from "../hooks/useMockHooks";

interface NewsCardProps {
  item: NewsItem;
}

/**
 * ニュースカード（大量のカスタムフックを持つ重量級コンポーネント）
 * - 大量のカスタムフック × リスト全アイテム分 = 重い JS 処理
 * - この重さでもタブスワイプが 60fps で動くことを証明
 *
 * Hooks per card:
 * - useState × 2
 * - useSharedValue × 2
 * - useCallback × 2
 * - useAnimatedStyle × 3
 * - useFadeInAnimation × 1 (useSharedValue + useEffect + useAnimatedStyle)
 * - useImageLoader × 1 (useState + useSharedValue + useCallback + useAnimatedStyle)
 * = 合計 15+ hooks × カード数
 */
export const NewsCard = memo<NewsCardProps>(({ item }) => {
  // 画像ロード状態（カスタムフック）
  const { handleLoad, animatedStyle: imageFadeStyle } = useImageLoader();

  // カード全体のフェードイン
  const cardFadeStyle = useFadeInAnimation();

  // いいね状態
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const likeScale = useSharedValue(1);
  const bookmarkScale = useSharedValue(1);

  const handleLike = useCallback(() => {
    setLiked((prev) => !prev);
    likeScale.value = withTiming(1.3, { duration: 100 }, () => {
      likeScale.value = withTiming(1, { duration: 100 });
    });
  }, [likeScale]);

  const handleBookmark = useCallback(() => {
    setBookmarked((prev) => !prev);
    bookmarkScale.value = withTiming(1.3, { duration: 100 }, () => {
      bookmarkScale.value = withTiming(1, { duration: 100 });
    });
  }, [bookmarkScale]);

  const likeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  const bookmarkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bookmarkScale.value }],
  }));

  return (
    <Animated.View style={[styles.card, cardFadeStyle]}>
      {/* ヘッドライン画像 */}
      <View style={styles.imageContainer}>
        <View style={styles.placeholder} />
        <Animated.View style={[StyleSheet.absoluteFill, imageFadeStyle]}>
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.image}
            resizeMode="cover"
            onLoad={handleLoad}
          />
        </Animated.View>
        {/* バッジ */}
        <View style={styles.badgeRow}>
          {item.isBreaking && (
            <View style={[styles.badge, styles.breakingBadge]}>
              <Text style={styles.breakingText}>BREAKING</Text>
            </View>
          )}
          {item.isExclusive && (
            <View style={[styles.badge, styles.exclusiveBadge]}>
              <Text style={styles.exclusiveText}>EXCLUSIVE</Text>
            </View>
          )}
        </View>
      </View>

      {/* コンテンツ */}
      <View style={styles.content}>
        {/* カテゴリ + 日付 */}
        <View style={styles.metaRow}>
          <Text style={styles.category}>{item.category.toUpperCase()}</Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.date}>{item.publishedAt}</Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.readTime}>{item.readTime} min read</Text>
        </View>

        {/* タイトル */}
        <Text style={styles.title} numberOfLines={3}>
          {item.title}
        </Text>

        {/* 概要 */}
        <Text style={styles.summary} numberOfLines={3}>
          {item.summary}
        </Text>

        {/* タグ */}
        <View style={styles.tagRow}>
          {item.tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>

        {/* 著者 + アクション */}
        <View style={styles.footer}>
          <View style={styles.author}>
            <Image
              source={{ uri: item.authorAvatar }}
              style={styles.authorAvatar}
            />
            <Text style={styles.authorName}>{item.authorName}</Text>
          </View>

          <View style={styles.actions}>
            <Text style={styles.stat}>
              {item.viewCount > 1000
                ? `${Math.floor(item.viewCount / 1000)}k`
                : item.viewCount}{" "}
              views
            </Text>
            <TouchableOpacity onPress={handleLike} style={styles.actionButton}>
              <Animated.Text style={[styles.actionIcon, likeAnimatedStyle]}>
                {liked ? "❤️" : "🤍"}
              </Animated.Text>
              <Text style={styles.actionCount}>
                {item.likeCount + (liked ? 1 : 0)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleBookmark}
              style={styles.actionButton}
            >
              <Animated.Text style={[styles.actionIcon, bookmarkAnimatedStyle]}>
                {bookmarked ? "🔖" : "📑"}
              </Animated.Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
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
    height: 220,
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
  badgeRow: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    gap: 6,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  breakingBadge: {
    backgroundColor: "#E53935",
  },
  breakingText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  exclusiveBadge: {
    backgroundColor: "#1A1A1A",
  },
  exclusiveText: {
    color: "#FFD700",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  content: {
    padding: 16,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  category: {
    fontSize: 11,
    fontWeight: "700",
    color: "#E53935",
    letterSpacing: 0.5,
  },
  metaDot: {
    fontSize: 11,
    color: "#999",
    marginHorizontal: 6,
  },
  date: {
    fontSize: 11,
    color: "#999",
  },
  readTime: {
    fontSize: 11,
    color: "#999",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1A1A1A",
    lineHeight: 24,
    marginBottom: 8,
  },
  summary: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
    marginBottom: 12,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 11,
    color: "#666",
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 12,
  },
  author: {
    flexDirection: "row",
    alignItems: "center",
  },
  authorAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    backgroundColor: "#E8E8E8",
  },
  authorName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#444",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stat: {
    fontSize: 11,
    color: "#888",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionIcon: {
    fontSize: 16,
  },
  actionCount: {
    fontSize: 11,
    color: "#666",
  },
});
