export interface NewsItem {
  id: string;
  title: string;
  description: string;
  imageColor: string;
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

// カテゴリごとの色定義
const CATEGORY_COLORS: Record<string, string> = {
  Tech: "#000000",
  Business: "#333333",
  Sports: "#666666",
  Entertainment: "#999999",
  Science: "#1a1a1a",
  Health: "#2d2d2d",
  Politics: "#404040",
  World: "#4d4d4d",
  Travel: "#5a5a5a",
  Food: "#6d6d6d",
  Fashion: "#7a7a7a",
  Music: "#8d8d8d",
  Gaming: "#9a9a9a",
  Education: "#a6a6a6",
  Finance: "#b3b3b3",
  Automotive: "#bfbfbf",
  "Real Estate": "#cccccc",
  Environment: "#d9d9d9",
  Arts: "#e6e6e6",
  Lifestyle: "#f2f2f2",
};

// ニュースアイテム生成関数
const generateNewsItems = (category: string, count: number): NewsItem[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: `${category.toLowerCase()}-${index + 1}`,
    title: `${category} News Title ${index + 1}`,
    description: `This is a detailed description for ${category} news item ${index + 1}. It provides comprehensive information about the latest developments in the ${category.toLowerCase()} sector.`,
    imageColor: CATEGORY_COLORS[category] || "#000000",
    category,
  }));
};

// 全カテゴリのニュースアイテムを生成（各10個、合計200アイテム）
export const ALL_NEWS_ITEMS = NEWS_CATEGORIES.reduce<
  Record<string, NewsItem[]>
>((acc, category) => {
  acc[category] = generateNewsItems(category, 10);
  return acc;
}, {});

// カテゴリ別にニュースアイテムを取得
export const getNewsByCategory = (category: string): NewsItem[] => {
  return ALL_NEWS_ITEMS[category] || [];
};
