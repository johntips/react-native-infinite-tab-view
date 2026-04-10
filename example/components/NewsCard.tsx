import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { NewsItem } from "../data/newsItems";

interface NewsCardProps {
  item: NewsItem;
}

/**
 * production レベルの重いカードコンポーネント
 * - 高解像度画像 + フェードイン
 * - プログレスバー（Reanimated SharedValue 駆動）
 * - 複数の hooks（useSharedValue, useDerivedValue, useEffect, useState）
 * - 複雑なレイアウト（バッジ、価格、残数表示）
 * → この重さでもタブスワイプが60fpsで動くことを証明
 */
export const NewsCard = memo<NewsCardProps>(({ item }) => {
  // --- 重い hooks 群（production の PackItem を模倣）---
  const [loaded, setLoaded] = useState(false);
  const [liked, setLiked] = useState(false);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);
  const progress = useSharedValue(item.remaining / item.total);

  // useDerivedValue（production の scrollY 監視を模倣）
  const progressPercent = useDerivedValue(
    () => `${Math.round(progress.value * 100)}%`,
  );

  // useEffect 群（production の複数 useEffect を模倣）
  const mountTime = useRef(Date.now());
  useEffect(() => {
    // マウント時のアニメーション
    scale.value = withTiming(1, { duration: 200 });
  }, [scale]);

  useEffect(() => {
    // プログレスバーのアニメーション
    progress.value = withTiming(item.remaining / item.total, { duration: 500 });
  }, [item.remaining, item.total, progress]);

  useEffect(() => {
    // 重い計算を模倣（production の画像プリフェッチ等）
    const timer = setTimeout(() => {
      // noop - 遅延処理の模倣
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleLoad = useCallback(() => {
    setLoaded(true);
    opacity.value = withTiming(1, { duration: 300 });
  }, [opacity]);

  const handleLike = useCallback(() => {
    setLiked((prev) => !prev);
    scale.value = withTiming(1.2, { duration: 100 }, () => {
      scale.value = withTiming(1, { duration: 100 });
    });
  }, [scale]);

  const animatedImageStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={styles.card}>
      {/* 画像エリア */}
      <View style={styles.imageContainer}>
        {!loaded && <View style={styles.placeholder} />}
        <Animated.View style={[StyleSheet.absoluteFill, animatedImageStyle]}>
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.image}
            resizeMode="cover"
            onLoad={handleLoad}
          />
        </Animated.View>
        {/* カテゴリバッジ（オーバーレイ） */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.category}</Text>
        </View>
      </View>

      {/* コンテンツエリア */}
      <View style={styles.cardContent}>
        <View style={styles.titleRow}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <TouchableOpacity onPress={handleLike} style={styles.likeButton}>
            <Text style={styles.likeIcon}>{liked ? "❤️" : "🤍"}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.cardDescription} numberOfLines={2}>
          {item.description}
        </Text>

        {/* 価格 + 残数（production のガチャ UI を模倣） */}
        <View style={styles.priceRow}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceIcon}>🪙</Text>
            <Text style={styles.price}>{item.price.toLocaleString()}</Text>
            <Text style={styles.priceUnit}>/1回</Text>
          </View>
          <Text style={styles.remaining}>
            残り {item.remaining}/{item.total}
          </Text>
        </View>

        {/* プログレスバー */}
        <View style={styles.progressBar}>
          <Animated.View style={[styles.progressFill, animatedProgressStyle]} />
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
  badge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  cardContent: {
    padding: 16,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: "#1A1A1A",
    lineHeight: 22,
    marginRight: 8,
  },
  likeButton: {
    padding: 4,
  },
  likeIcon: {
    fontSize: 18,
  },
  cardDescription: {
    fontSize: 13,
    color: "#888",
    lineHeight: 18,
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  priceIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  price: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  priceUnit: {
    fontSize: 12,
    color: "#888",
    marginLeft: 2,
  },
  remaining: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4CAF50",
  },
  progressBar: {
    height: 6,
    backgroundColor: "#E8E8E8",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4CAF50",
    borderRadius: 3,
  },
});
