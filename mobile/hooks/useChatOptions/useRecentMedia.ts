import { useState, useEffect, useCallback } from "react";
import { chatApi } from "@/services/chat";
import { socketService } from "@/services/socket";
import { getAvatarUrl } from "@/utils/avatar";

export function useRecentMedia(id: string) {
  const [recentMedia, setRecentMedia] = useState<
    { uri: string; type: "image" | "video" }[]
  >([]);

  const loadRecentMedia = useCallback(async () => {
    try {
      const media: { uri: string; type: "image" | "video" }[] = [];
      let cursor: any = undefined;

      while (media.length < 4) {
        const res = await chatApi.getMessages(Number(id), cursor, 20);
        if (!res.data || res.data.length === 0) break;

        for (const m of res.data) {
          if (m.type === "image" || m.type === "video") {
            let url: string | undefined;
            try {
              const info =
                typeof m.content === "string"
                  ? JSON.parse(m.content)
                  : m.content;
              url = info?.url;
            } catch {
              url = m.content;
            }
            if (url) {
              if (!url.startsWith("http")) {
                url = getAvatarUrl(url) || url;
              }
              media.push({ uri: url, type: m.type as "image" | "video" });
            }
          }
          if (media.length >= 4) break;
        }

        if (media.length >= 4) break;

        const last = res.data[res.data.length - 1];
        cursor = last ? last.id : undefined;
        if (!cursor) break;
      }

      setRecentMedia(media.slice(0, 4));
    } catch (err) {
      console.error("Load recent media error", err);
    }
  }, [id]);

  useEffect(() => {
    loadRecentMedia();
  }, [loadRecentMedia]);

  useEffect(() => {
    const handler = (data: any) => {
      if (
        data.conversationId?.toString() === id.toString() &&
        (data.type === "image" || data.type === "video")
      ) {
        loadRecentMedia();
      }
    };

    socketService.on("new_message", handler);
    return () => {
      socketService.off("new_message", handler);
    };
  }, [id, loadRecentMedia]);

  return { recentMedia };
}
