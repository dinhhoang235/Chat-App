import React from "react";

export default function useChatItemLayout(params: any) {
  const {
    getMessageSize,
    getChatItemType,
    computeChatItemSize,
    windowWidth,
    windowHeight,
    blankAreaCountRef = { current: 0 },
  } = params;

  return React.useCallback(
    (layout: { size?: number }, item: any, index?: number) => {
      if (!item) {
        layout.size = 96;
        return;
      }

      try {
        const measured = getMessageSize(item.id);
        if (measured && measured > 0) {
          layout.size = measured;
          return;
        }
      } catch {}

      if (
        __DEV__ &&
        index != null &&
        index < 10 &&
        blankAreaCountRef.current < 1
      ) {
        const type = getChatItemType(item);
        console.warn(
          `[Layout] idx=${index} type=${type} id=${item.id} NO_MEASURED_SIZE`,
        );
      }

      layout.size = computeChatItemSize(item, windowWidth, windowHeight);
    },
    [
      getMessageSize,
      getChatItemType,
      computeChatItemSize,
      windowWidth,
      windowHeight,
      blankAreaCountRef,
    ],
  );
}
