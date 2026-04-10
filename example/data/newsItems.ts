export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  body: string;
  imageUrl: string;
  thumbnailUrl: string;
  authorName: string;
  authorAvatar: string;
  category: string;
  publishedAt: string;
  readTime: number; // 分
  viewCount: number;
  likeCount: number;
  commentCount: number;
  tags: string[];
  isBreaking: boolean;
  isExclusive: boolean;
}

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

const AUTHORS = [
  "Sarah Chen",
  "Marcus Williams",
  "Akira Tanaka",
  "Elena Rodriguez",
  "James O'Brien",
  "Priya Patel",
  "Lucas Schmidt",
  "Yuki Nakamura",
];

const TAG_POOL: Record<string, string[]> = {
  Tech: ["AI", "Cloud", "Mobile", "Web3", "Startup"],
  Business: ["M&A", "IPO", "Markets", "Strategy", "Leadership"],
  Sports: ["NBA", "Soccer", "Tennis", "Olympics", "F1"],
  Entertainment: ["Movies", "TV", "Streaming", "Celebrity", "Awards"],
  Science: ["Space", "Physics", "Biology", "Climate", "Research"],
  Health: ["Fitness", "Nutrition", "Mental", "Medical", "Wellness"],
  Politics: ["Election", "Policy", "Global", "Diplomacy", "Law"],
  World: ["Europe", "Asia", "Americas", "Africa", "Middle East"],
  Travel: ["Flights", "Hotels", "Destinations", "Tips", "Adventure"],
  Food: ["Recipes", "Restaurants", "Wine", "Dining", "Chefs"],
  Fashion: ["Runway", "Street", "Luxury", "Trends", "Designers"],
  Music: ["Pop", "Rock", "Hip-Hop", "Jazz", "Classical"],
  Gaming: ["PC", "Console", "Mobile", "Esports", "VR"],
  Education: ["K-12", "Higher Ed", "Online", "STEM", "Skills"],
  Finance: ["Stocks", "Crypto", "Banking", "Personal", "Economy"],
  Automotive: ["EV", "Luxury", "Reviews", "Racing", "Industry"],
  "Real Estate": ["Market", "Investment", "Residential", "Commercial", "Tips"],
  Environment: [
    "Climate",
    "Wildlife",
    "Conservation",
    "Renewable",
    "Pollution",
  ],
  Arts: ["Painting", "Sculpture", "Photography", "Museum", "Design"],
  Lifestyle: ["Home", "Garden", "Pets", "Hobbies", "Relationships"],
};

const getImageUrl = (category: string, index: number): string => {
  const seed = `${category.toLowerCase().replace(/\s/g, "-")}-${index}`;
  return `https://picsum.photos/seed/${seed}/1200/800`;
};

const getThumbnailUrl = (authorName: string): string => {
  const seed = authorName.replace(/\s/g, "-").toLowerCase();
  return `https://picsum.photos/seed/${seed}/100/100`;
};

const formatDate = (daysAgo: number): string => {
  const d = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  return d.toISOString().split("T")[0]!;
};

const generateNewsItems = (category: string, count: number): NewsItem[] => {
  const tags = TAG_POOL[category] ?? [];
  return Array.from({ length: count }, (_, index) => {
    const author = AUTHORS[index % AUTHORS.length]!;
    return {
      id: `${category.toLowerCase().replace(/\s/g, "-")}-${index + 1}`,
      title: `${category} Headline ${index + 1}: Breaking developments reshape the industry`,
      summary: `A comprehensive analysis of recent ${category.toLowerCase()} trends and their implications for the future.`,
      body: `In a significant development that is reshaping the ${category.toLowerCase()} landscape, experts are pointing to a convergence of factors. This in-depth report examines the key drivers behind the transformation and what stakeholders should expect in the coming months. Industry leaders have emphasized the need for adaptation and strategic thinking in navigating these changes.`,
      imageUrl: getImageUrl(category, index + 1),
      thumbnailUrl: getThumbnailUrl(author),
      authorName: author,
      authorAvatar: getThumbnailUrl(author),
      category,
      publishedAt: formatDate(index % 30),
      readTime: 3 + (index % 8),
      viewCount: 1000 + Math.floor(Math.random() * 50000),
      likeCount: Math.floor(Math.random() * 2000),
      commentCount: Math.floor(Math.random() * 300),
      tags: tags.slice(0, 2 + (index % 3)),
      isBreaking: index % 17 === 0,
      isExclusive: index % 11 === 0,
    };
  });
};

export const ALL_NEWS_ITEMS = NEWS_CATEGORIES.reduce<
  Record<string, NewsItem[]>
>((acc, category) => {
  acc[category] = generateNewsItems(category, 100);
  return acc;
}, {});

export const getNewsByCategory = (category: string): NewsItem[] => {
  return ALL_NEWS_ITEMS[category] || [];
};
