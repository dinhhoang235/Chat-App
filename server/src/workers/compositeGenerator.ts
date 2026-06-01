import prisma from "../db.js";
import minioClient, { bucketName } from "../utils/minio.js";
import axios from "axios";
import sharp from "sharp";
import { randomUUID } from "crypto";

const TARGET_SIZE = 128;
const TILE = TARGET_SIZE / 2; // 64

const fetchImageBuffer = async (url: string): Promise<Buffer | null> => {
  try {
    // Support internal storage paths like /storage/bucket/filename
    if (url.startsWith("/storage/")) {
      // Map to MinIO direct path: remove /storage/
      const parts = url.replace(/^\/storage\//, "");
      // Use presigned Get (but minioClient.getObject works)
      const stream = await minioClient.getObject(
        parts.split("/")[0],
        parts.split("/").slice(1).join("/"),
      );
      const chunks: Buffer[] = [];
      for await (const chunk of stream) chunks.push(Buffer.from(chunk));
      return Buffer.concat(chunks);
    }

    const res = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 5000,
    });
    return Buffer.from(res.data);
  } catch (err) {
    console.warn("fetchImageBuffer failed for", url, err.message || err);
    return null;
  }
};

const svgInitials = (initials: string, size = TILE) => `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#${Math.floor(Math.random() * 16777215).toString(16)}" />
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${Math.floor(size / 2)}" fill="#ffffff">${initials}</text>
</svg>`;

export const generateComposite = async (
  conversationId: number,
): Promise<{ url: string; version: number } | null> => {
  try {
    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          include: {
            user: { select: { id: true, fullName: true, avatar: true } },
          },
        },
      },
    });

    if (!conv) return null;

    // Choose up to 4 participants: owner first, then others
    const participants = conv.participants
      .sort((a: any, b: any) => (a.role === "owner" ? -1 : 1))
      .slice(0, 4);

    const buffers: Buffer[] = [];
    for (const p of participants) {
      const avatar = p.user.avatar;
      let buf: Buffer | null = null;
      if (avatar) buf = await fetchImageBuffer(avatar);
      if (!buf) {
        const name = p.user.fullName || "";
        const initials = name
          .split(" ")
          .map((s: string) => s[0] || "")
          .slice(0, 2)
          .join("")
          .toUpperCase();
        const svg = svgInitials(initials || "?", TILE);
        buf = Buffer.from(svg);
      }
      // Normalize to TILE x TILE PNG
      const img = await sharp(buf).resize(TILE, TILE).png().toBuffer();
      buffers.push(img);
    }

    // Create base
    let composite = sharp({
      create: {
        width: TARGET_SIZE,
        height: TARGET_SIZE,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      },
    });

    const composites: sharp.OverlayOptions[] = buffers.map((b, i) => {
      const left = (i % 2) * TILE;
      const top = Math.floor(i / 2) * TILE;
      return { input: b, left, top };
    });

    composite = composite.composite(composites as any);
    const outBuffer = await composite.webp({ quality: 80 }).toBuffer();

    // Upload to MinIO
    const fileName = `groups/${conversationId}/composite/${randomUUID()}.webp`;
    await minioClient.putObject(
      bucketName,
      fileName,
      outBuffer,
      outBuffer.length,
      { "Content-Type": "image/webp" },
    );

    const url = `/storage/${bucketName}/${fileName}`;

    // Update DB
    const newVersion = (conv.compositeAvatarVersion || 0) + 1;
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { compositeAvatarUrl: url, compositeAvatarVersion: newVersion },
    });

    return { url, version: newVersion };
  } catch (err) {
    console.error("generateComposite error:", err);
    return null;
  }
};

export default generateComposite;
