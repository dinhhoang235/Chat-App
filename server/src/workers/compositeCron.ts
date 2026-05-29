import prisma from "../db.js";
import { addCompositeJob } from "./compositeQueue.js";

const run = async () => {
  try {
    console.log("Composite cron start");
    // Find group conversations without compositeAvatarUrl
    const groups = await prisma.conversation.findMany({
      where: { isGroup: true, compositeAvatarUrl: null },
      select: { id: true },
    });
    console.log(`Found ${groups.length} groups without composite`);
    for (const g of groups) {
      await addCompositeJob(g.id);
    }
    console.log("Composite cron finished");
  } catch (err) {
    console.error("Composite cron error", err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
};

run();
