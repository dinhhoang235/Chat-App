const GIPHY_API_BASE_URL = "https://api.giphy.com/v1/gifs";
const GIPHY_API_KEY =
  process.env.EXPO_PUBLIC_GIPHY_API_KEY || "pMrMgPcPjI5LzE2XA0dlAVRmgMz2R7OW";

export type GiphyGif = {
  id: string;
  title: string;
  previewUrl: string;
  stillPreviewUrl?: string;
  url: string;
  width?: number;
  height?: number;
  size?: number;
};

type GiphyImage = {
  url?: string;
  width?: string;
  height?: string;
  size?: string;
};

type GiphyApiItem = {
  id: string;
  title?: string;
  images?: {
    preview_gif?: GiphyImage;
    preview_webp?: GiphyImage;
    preview?: GiphyImage;
    fixed_width_downsampled?: GiphyImage;
    fixed_width_small_still?: GiphyImage;
    fixed_width_small?: GiphyImage;
    fixed_width?: GiphyImage;
    downsized?: GiphyImage;
    downsized_medium?: GiphyImage;
    original?: GiphyImage;
  };
};

const toNumber = (value?: string) => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const mapGif = (item: GiphyApiItem): GiphyGif | null => {
  const images = item.images;
  if (!images) return null;

  const preview =
    images.fixed_width_downsampled ||
    images.preview_webp ||
    images.preview_gif ||
    images.preview ||
    images.fixed_width_small ||
    images.fixed_width ||
    images.downsized;
  const stillPreview =
    images.fixed_width_small_still ||
    images.preview ||
    images.fixed_width_downsampled ||
    preview;
  const sendImage =
    images.downsized_medium ||
    images.downsized ||
    images.fixed_width ||
    images.original ||
    preview;

  if (!preview?.url || !sendImage?.url) return null;

  return {
    id: item.id,
    title: item.title || "GIF",
    previewUrl: preview.url,
    stillPreviewUrl: stillPreview?.url,
    url: sendImage.url,
    width: toNumber(sendImage.width),
    height: toNumber(sendImage.height),
    size: toNumber(sendImage.size),
  };
};

async function requestGifs(path: "trending" | "search", params: Record<string, string | number>) {
  const searchParams = new URLSearchParams({
    api_key: GIPHY_API_KEY,
    rating: "pg-13",
    bundle: "messaging_non_clips",
    ...Object.fromEntries(
      Object.entries(params).map(([key, value]) => [key, String(value)]),
    ),
  });

  const response = await fetch(`${GIPHY_API_BASE_URL}/${path}?${searchParams}`);
  if (!response.ok) {
    throw new Error(`GIPHY request failed with ${response.status}`);
  }

  const payload = await response.json();
  const data = Array.isArray(payload?.data) ? payload.data : [];
  return data.map(mapGif).filter(Boolean) as GiphyGif[];
}

export const giphyApi = {
  trending: (limit = 24) => requestGifs("trending", { limit }),
  search: (query: string, limit = 24) =>
    requestGifs("search", { q: query, limit }),
};
