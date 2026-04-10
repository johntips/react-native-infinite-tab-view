import { SafeAreaView, StatusBar, StyleSheet } from "react-native";
import { Tabs } from "react-native-infinite-tab-view";
import { BannerHeader } from "./components/BannerHeader";
import { NewsList } from "./components/NewsList";
import { NEWS_CATEGORIES } from "./data/newsItems";
import { markTabSwitch } from "./utils/perfLogger";

export default function App() {
  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.container}>
        <Tabs.Container
          renderHeader={() => <BannerHeader />}
          headerHeight={200}
          onTabChange={(event) => {
            // パフォーマンス計測: タブ切り替え開始のみ
            markTabSwitch(event.prevTabName, event.tabName);
          }}
          lazy={true}
        >
          {NEWS_CATEGORIES.map((category, index) => (
            <Tabs.Tab
              key={category}
              name={category.toLowerCase()}
              label={category}
            >
              <NewsList category={category} tabIndex={index} />
            </Tabs.Tab>
          ))}
        </Tabs.Container>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
});
