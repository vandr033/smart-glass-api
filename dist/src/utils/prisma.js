import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../../generated/prisma/client.js";
import { env } from "./env.js";
const globalForPrisma = globalThis;
const adapter = new PrismaMariaDb(env.DATABASE_URL);
export const prisma = globalForPrisma.prisma ??
    new PrismaClient({
        adapter,
    });
if (env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}
//# sourceMappingURL=prisma.js.map