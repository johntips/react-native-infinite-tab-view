# react-native-infinite-tab-view

Infinite scroll tab view with collapsible header for React Native

**New Architecture ready** | **Expo 54+ compatible** | **Drop-in replacement for react-native-collapsible-tab-view**

<p align="center">
  <img src="./assets/ios.gif" width="300" alt="iOS Demo" />
  <img src="./assets/android.gif" width="300" alt="Android Demo" />
</p>

## Features

- **Infinite horizontal scroll** for tabs and content
- **Active tab center alignment** (auto-scrolls to center)
- **Collapsible header** support
- **New Architecture** (Fabric) ready
- **Expo 54+** compatible
- **Drop-in replacement** for react-native-collapsible-tab-view
- **iOS & Android** consistent rendering
- **Zero additional dependencies** (uses React Native core)
- **TypeScript** first

## Installation

```bash
npm install react-native-infinite-tab-view
# or
yarn add react-native-infinite-tab-view
# or
pnpm add react-native-infinite-tab-view
```

### Peer Dependencies

This library requires `react-native-reanimated` for smooth animations:

```bash
npm install react-native-reanimated
```

Follow the [react-native-reanimated installation guide](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started/) for additional setup.

## Usage

### Basic Example

```tsx
import { Tabs } from 'react-native-infinite-tab-view';

function App() {
  return (
    <Tabs.Container
      renderHeader={() => <BannerHeader />}
      infiniteScroll={true}
      tabBarCenterActive={true}
    >
      <Tabs.Tab name="tech" label="Tech">
        <Tabs.FlatList
          data={newsItems}
          renderItem={({ item }) => <NewsCard item={item} />}
        />
      </Tabs.Tab>
      <Tabs.Tab name="business" label="Business">
        <Tabs.FlatList
          data={businessItems}
          renderItem={({ item }) => <NewsCard item={item} />}
        />
      </Tabs.Tab>
      {/* ... more tabs */}
    </Tabs.Container>
  );
}
```

### With Collapsible Header

```tsx
import { Tabs } from 'react-native-infinite-tab-view';

const HEADER_HEIGHT = 200;

function App() {
  return (
    <Tabs.Container
      renderHeader={() => (
        <View style={{ height: HEADER_HEIGHT }}>
          <Image source={require('./banner.png')} />
        </View>
      )}
      headerHeight={HEADER_HEIGHT}
    >
      <Tabs.Tab name="home" label="Home">
        <Tabs.ScrollView>
          <YourContent />
        </Tabs.ScrollView>
      </Tabs.Tab>
    </Tabs.Container>
  );
}
```

### Flexible Content

You can use **any component** as tab content:

```tsx
<Tabs.Tab name="custom" label="Custom">
  <FlashList data={items} renderItem={...} />
</Tabs.Tab>

<Tabs.Tab name="scroll" label="Scroll">
  <ScrollView>
    <YourCustomContent />
  </ScrollView>
</Tabs.Tab>

<Tabs.Tab name="view" label="View">
  <View>
    <Text>Any content</Text>
  </View>
</Tabs.Tab>
```

### Custom Tab Bar

```tsx
import { Tabs, TabBarProps } from 'react-native-infinite-tab-view';

function CustomTabBar({ tabs, activeIndex, onTabPress }: TabBarProps) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {tabs.map((tab, index) => (
        <TouchableOpacity
          key={tab.name}
          onPress={() => onTabPress(index)}
          style={{ padding: 16 }}
        >
          <Text style={{ color: activeIndex === index ? 'blue' : 'gray' }}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function App() {
  return (
    <Tabs.Container renderTabBar={(props) => <CustomTabBar {...props} />}>
      {/* tabs */}
    </Tabs.Container>
  );
}
```

## API Reference

### Tabs.Container

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | - | Tabs.Tab components |
| `renderHeader` | `() => React.ReactElement` | - | Renders header (banner) above tabs |
| `renderTabBar` | `(props: TabBarProps) => React.ReactElement` | - | Custom tab bar renderer |
| `headerHeight` | `number` | `0` | Header height in pixels |
| `infiniteScroll` | `boolean` | `true` | Enable infinite tab/content scroll |
| `tabBarCenterActive` | `boolean` | `true` | Auto-center active tab |
| `onTabChange` | `(index: number) => void` | - | Callback when active tab changes |

### Tabs.Tab

| Prop | Type | Description |
|------|------|-------------|
| `name` | `string` | Unique tab identifier |
| `label` | `string` | Tab label text |
| `children` | `React.ReactNode` | Tab content (any component) |

### Tabs.FlatList

Drop-in replacement for React Native's `FlatList`. Accepts all `FlatList` props.

### Tabs.ScrollView

Drop-in replacement for React Native's `ScrollView`. Accepts all `ScrollView` props.

### TabBarProps

Props passed to custom tab bar:

| Prop | Type | Description |
|------|------|-------------|
| `tabs` | `{ name: string; label: string }[]` | Array of tab info |
| `activeIndex` | `number` | Currently active tab index |
| `onTabPress` | `(index: number) => void` | Callback to change tab |

## Migration from react-native-collapsible-tab-view

Just change the import:

```diff
- import { Tabs } from 'react-native-collapsible-tab-view';
+ import { Tabs } from 'react-native-infinite-tab-view';
```

That's it! Your code works without any changes.

## Requirements

- React Native >= 0.70
- React >= 18.0
- Expo SDK >= 51 (if using Expo)
- react-native-reanimated >= 3.0

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**johntips**

- GitHub: [@johntips](https://github.com/johntips)

## Example

See the `example/` directory for a complete working example.

```bash
cd example
npm install
npm start
```
