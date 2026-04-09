import { SafeAreaView, StatusBar, StyleSheet } from "react-native";
import { type DebugLogEvent, Tabs } from "react-native-infinite-tab-view";
import { BannerHeader } from "./components/BannerHeader";
import { NewsList } from "./components/NewsList";
import { NEWS_CATEGORIES } from "./data/newsItems";

const handleDebugLog = (event: DebugLogEvent) => {
  // アプリ側でログを受け取る例: analytics や debug UI に転送可能
  console.log(
    `[App] ${event.type} | ${event.tabName} (idx:${event.tabIndex})${event.detail ? ` | ${event.detail}` : ""}`,
  );
};

export default function App() {
  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.container}>
        <Tabs.Container
          renderHeader={() => <BannerHeader />}
          headerHeight={200}
          onTabChange={(event) => {
            console.log("Active tab:", event.tabName);
          }}
          lazy={true}
          debug={__DEV__}
          onDebugLog={handleDebugLog}
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
