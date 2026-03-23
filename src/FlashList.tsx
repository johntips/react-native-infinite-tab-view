import {
  type FlashListProps,
  type FlashListRef,
  FlashList as ShopifyFlashList,
} from "@shopify/flash-list";
import type React from "react";
import type { Ref } from "react";
import { forwardRef } from "react";

// FlashListをラップするコンポーネント
function TabsFlashListInner<T>(
  props: FlashListProps<T>,
  ref: Ref<FlashListRef<T>>,
) {
  return <ShopifyFlashList ref={ref} {...props} />;
}

export const FlashList = forwardRef(TabsFlashListInner) as <T>(
  props: FlashListProps<T> & { ref?: Ref<FlashListRef<T>> },
) => React.ReactElement | null;
