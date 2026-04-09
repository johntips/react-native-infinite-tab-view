export interface NewsItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
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
// seed パラメータでカテゴリ+インデックスごとに固定画像を生成
const getImageUrl = (category: string, index: number): string => {
  const seed = `${category.toLowerCase().replace(/\s/g, "-")}-${index}`;
  // 800x600の高解像度画像（実際のアプリに近い負荷）
  return `https://picsum.photos/seed/${seed}/800/600`;
};

// ニュースアイテム生成関数（各カテゴリ30件 — スクロール負荷テスト）
const generateNewsItems = (category: string, count: number): NewsItem[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: `${category.toLowerCase().replace(/\s/g, "-")}-${index + 1}`,
    title: `${category} News Title ${index + 1}`,
    description: `This is a detailed description for ${category} news item ${index + 1}. It provides comprehensive information about the latest developments in the ${category.toLowerCase()} sector. Heavy images are loaded lazily with fade-in animation to demonstrate 60fps tab swiping performance.`,
    imageUrl: getImageUrl(category, index + 1),
    category,
  }));
};

// 全カテゴリのニュースアイテムを生成（各30個、合計600アイテム）
export const ALL_NEWS_ITEMS = NEWS_CATEGORIES.reduce<
  Record<string, NewsItem[]>
>((acc, category) => {
  acc[category] = generateNewsItems(category, 30);
  return acc;
}, {});

// カテゴリ別にニュースアイテムを取得
export const getNewsByCategory = (category: string): NewsItem[] => {
  return ALL_NEWS_ITEMS[category] || [];
};
