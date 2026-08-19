import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "./src/generated/prisma/client";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string);
const prisma = new PrismaClient({ adapter });

(async () => {
  const codes = await prisma.otpCode.findMany({
    where: { identifier: "9000000003" },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  console.log(JSON.stringify(codes, null, 2));
  await prisma.$disconnect();
})();
