import fs from "fs";
import path from "path";
import minioClient, { bucketName } from "./minio.js";

const ASSETS_DIR = path.resolve(process.cwd(), "assets");
const CANDIDATE_NAMES = [
  "default_avatar.webp",
  "default_avatar.png",
  "default_avatar.jpg",
  "default-avatar.webp",
  "default-avatar.png",
];

export const uploadDefaultIfMissing = async () => {
  try {
    // ensure assets dir exists
    if (!fs.existsSync(ASSETS_DIR)) return;

    // find candidate file in assets dir
    let found: string | null = null;
    for (const name of CANDIDATE_NAMES) {
      const p = path.join(ASSETS_DIR, name);
      if (fs.existsSync(p)) {
        found = p;
        break;
      }
    }
    if (!found) return;

    const destName = path.basename(found);

    // check if object already exists in bucket
    try {
      // statObject will throw if not exists
      // @ts-ignore
      await minioClient.statObject(bucketName, destName);
      console.log(
        `Default avatar already exists in storage: /storage/${bucketName}/${destName}`,
      );
      return;
    } catch (err: any) {
      // if not found, upload
      // continue to upload
    }

    const data = fs.readFileSync(found);
    await minioClient.putObject(bucketName, destName, data);
    console.log(
      `Uploaded default avatar to /storage/${bucketName}/${destName}`,
    );
  } catch (err) {
    console.error("Failed to upload default avatar on start:", err);
  }
};

export default uploadDefaultIfMissing;
