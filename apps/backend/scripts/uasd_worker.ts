import "dotenv/config";
import { startUasdWorker } from "../src/workers/uasd.worker";
import { redis } from "../src/infra/redis/client";
import { prisma } from "../src/infra/prisma/client";

const worker = startUasdWorker();

let stopping = false;

async function stop() {
  if (stopping) return;
  stopping = true;
  await worker.stop();
  await Promise.allSettled([redis.quit(), prisma.$disconnect()]);
}

process.once("SIGINT", () => void stop());
process.once("SIGTERM", () => void stop());
