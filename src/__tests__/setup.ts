import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// react-native-webを使用しているため、追加のモックは不要

afterEach(() => {
  cleanup();
});
