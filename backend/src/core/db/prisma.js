import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { config } from "#config";
import { childLogger } from "#core/logger/index.js";

const log = childLogger("db");

// This database mixes id types: the tables the older deployment created use bigint, the ones added by
// the refactor use integer. Postgres joins the two happily, but the driver hands bigint back as a
// string, which Prisma then turns into a BigInt while an integer column arrives as a Number. Prisma
// matches a relation's two sides in memory, where 1n never equals 1, so every such relation resolved
// to null - a saved post with no post, a conversation member with no user. Reading int8 as a Number
// makes both sides the same kind of value. Ids stay exact below 2^53, which is far beyond anything
// this application will reach.
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => (value === null ? null : Number(value)));

// Timestamps are exchanged in UTC regardless of the database server's time zone setting.
const adapter = new PrismaPg({ connectionString: config.database.url, options: "-c TimeZone=UTC" });

export const prisma = new PrismaClient({
  adapter,
  log: [
     { level: "query", emit: "event" },
    { level: "warn", emit: "event" },
    { level: "error", emit: "event" },
  ],
});

prisma.$on("warn", (e) => log.warn(e.message));
prisma.$on("error", (e) => log.error(e.message));
prisma.$on("query", (e) => {
  if (e.duration >= 100) {
    log.warn(
      {
        duration: e.duration,
        query: e.query,
        params: e.params,
      },
      "slow query"
    );
  }
});
const pool = adapter.pool;
if (pool) {
  setInterval(() => {
    log.info(
      { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount },
      "pool stats"
    );
  }, 10_000).unref();
}

export { Prisma };

export async function connectDatabase() {
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;
  log.info("database connected");
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
}

export async function pingDatabase() {
  await prisma.$queryRaw`SELECT 1`;
  return true;
}
