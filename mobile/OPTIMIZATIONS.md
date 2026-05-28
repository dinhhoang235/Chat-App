Summary of chat UI optimizations applied

What I changed
- Progressive image/video loading: components no longer await disk-cache probes on mount; they probe non-blocking and enqueue background downloads. Files updated:
  - mobile/components/chat/messageParts/MessageImageBubble.tsx
  - mobile/components/chat/messageParts/MessageImageGroupBubble.tsx
  - mobile/components/chat/messageParts/MessageVideoBubble.tsx
- Background image cache warm on app startup (non-blocking): mobile/app/_layout.tsx
- Prefetch queue and image cache remain shared; queue concurrency limited to avoid spikes.

Why
- Avoid blocking first paint by moving disk IO and downloads off the critical path.
- Show cached thumbnails/full images immediately when available in memory, otherwise render UI and hydrate media in background.

How to smoke-check locally
1. Start Metro / Expo (from mobile folder):

```bash
cd mobile
expo start
```

2. On simulator/device, open a chat with cached messages and verify:
- Thread content appears immediately (from `initialMessages` / memory cache).
- No full-screen spinner if cache exists.
- Thumbnails show immediately when present; full images appear progressively.
- Scrolling / fling does not reveal large blank areas.

3. Inspect logs (enable __DEV__) to see timings for cache reads and network fetches.

Notes & next steps
- Run the app and capture a cold-open profile to validate first paint timings.
- Optionally reduce `estimatedItemSize` or refine `overrideItemLayout` if you still see layout jumps.
- I can continue scanning for more mount-time awaits and convert them to background tasks — tell me to continue and I'll patch remaining candidates.
