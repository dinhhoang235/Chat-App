import Queue from "bull";
import generateComposite from "./compositeGenerator.js";

const redisHost = process.env.REDIS_HOST || "127.0.0.1";
const redisPort = parseInt(process.env.REDIS_PORT || "6379");

export const compositeQueue = new Queue("composite-avatar", {
  redis: { port: redisPort, host: redisHost },
});

export const addCompositeJob = async (conversationId: number) => {
  await compositeQueue.add(
    "generate",
    { conversationId },
    {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  );
};

// Processor - can be started in the main server or separate worker process
compositeQueue.process("generate", async (job: any) => {
  const { conversationId } = job.data;
  try {
    const result = await generateComposite(conversationId);
    if (!result) throw new Error("generateComposite returned null");
    return Promise.resolve(result);
  } catch (err) {
    console.error("compositeQueue process error:", err);
    throw err;
  }
});

compositeQueue.on("failed", (job, err) => {
  console.error(
    `Composite job failed for job ${job.id}:`,
    err && (err as Error).message,
  );
});

export default compositeQueue;
