import { FlashList as ShopifyFlashList, type FlashListProps, type FlashListRef } from "@shopify/flash-list";
import type { Ref } from "react";
import React, { forwardRef } from "react";

// FlashListをラップするコンポーネント
function TabsFlashListInner<T>(
  props: FlashListProps<T>,
  ref: Ref<FlashListRef<T>>
) {
  return <ShopifyFlashList ref={ref} {...props} />;
}

export const FlashList = forwardRef(TabsFlashListInner) as <T>(
  props: FlashListProps<T> & { ref?: Ref<FlashListRef<T>> }
) => React.ReactElement | null;
