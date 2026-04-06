const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const libraryRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

// Watch library source for live changes
config.watchFolders = [libraryRoot];

// Prevent Metro from walking up directories to find node_modules
config.resolver.disableHierarchicalLookup = true;

// Resolve from example's node_modules + library's node_modules (dev deps)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(libraryRoot, "node_modules"),
];

// Force resolve library from src/ directly (skip lib/ build step for development)
const librarySrcRoot = path.resolve(libraryRoot, "src");
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Redirect "react-native-infinite-tab-view" imports to src/
  if (moduleName === "react-native-infinite-tab-view") {
    return context.resolveRequest(
      context,
      path.resolve(librarySrcRoot, "index"),
      platform,
    );
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
