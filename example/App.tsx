import { SafeAreaView, StatusBar, StyleSheet } from "react-native";
import { Tabs } from "react-native-infinite-tab-view";
import { BannerHeader } from "./components/BannerHeader";
import { NewsList } from "./components/NewsList";
import { NEWS_CATEGORIES } from "./data/newsItems";

export default function App() {
  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.container}>
        <Tabs.Container
          renderHeader={() => <BannerHeader />}
          headerHeight={200}
          onTabChange={(tabName) => {
            console.log("Active tab:", tabName);
          }}
        >
          {NEWS_CATEGORIES.map((category) => (
            <Tabs.Tab
              key={category}
              name={category.toLowerCase()}
              label={category}
            >
              <NewsList category={category} />
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
