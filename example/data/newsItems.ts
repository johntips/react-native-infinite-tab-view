export interface NewsItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
  price: number;
  remaining: number;
  total: number;
}

// 20カテゴリ定義
export const NEWS_CATEGORIES = [
  "Tech",
  "Business",
  "Sports",
  "Entertainment",
  "Science",
  "Health",
  "Politics",
  "World",
  "Travel",
  "Food",
  "Fashion",
  "Music",
  "Gaming",
  "Education",
  "Finance",
  "Automotive",
  "Real Estate",
  "Environment",
  "Arts",
  "Lifestyle",
];

// 高解像度画像URL（picsum.photos — 毎回異なる画像を返す）
const getImageUrl = (category: string, index: number): string => {
  const seed = `${category.toLowerCase().replace(/\s/g, "-")}-${index}`;
  return `https://picsum.photos/seed/${seed}/800/600`;
};

// 価格帯ランダム生成
const PRICES = [500, 1000, 2000, 3000, 5000, 10000];

// ニュースアイテム生成関数（各カテゴリ50件 — 重い負荷テスト）
const generateNewsItems = (category: string, count: number): NewsItem[] => {
  return Array.from({ length: count }, (_, index) => {
    const total = 100 + Math.floor(Math.random() * 200);
    return {
      id: `${category.toLowerCase().replace(/\s/g, "-")}-${index + 1}`,
      title: `${category} Pack ${index + 1} — Limited Edition`,
      description: `Premium ${category.toLowerCase()} collection item ${index + 1}. Featuring rare cards and exclusive items. Heavy hooks and complex UI simulate real-world app performance under load.`,
      imageUrl: getImageUrl(category, index + 1),
      category,
      price: PRICES[index % PRICES.length]!,
      remaining: Math.floor(Math.random() * total),
      total,
    };
  });
};

// 全カテゴリのニュースアイテムを生成（各50個、合計1000アイテム）
export const ALL_NEWS_ITEMS = NEWS_CATEGORIES.reduce<
  Record<string, NewsItem[]>
>((acc, category) => {
  acc[category] = generateNewsItems(category, 50);
  return acc;
}, {});

// カテゴリ別にニュースアイテムを取得
export const getNewsByCategory = (category: string): NewsItem[] => {
  return ALL_NEWS_ITEMS[category] || [];
};
