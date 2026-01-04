import type React from "react";
import { StyleSheet, Text, View } from "react-native";

export const BannerHeader: React.FC = () => {
  return (
    <View style={styles.banner}>
      <View style={styles.bannerPlaceholder} />
      <Text style={styles.bannerTitle}>News App</Text>
      <Text style={styles.bannerSubtitle}>
        Infinite scroll tab view example
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    height: 200,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  bannerPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: "#000",
    borderRadius: 12,
    marginBottom: 16,
  },
  bannerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: "#666",
  },
});
