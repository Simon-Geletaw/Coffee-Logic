import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
await prisma.product.create({
  data: {
    name: "Ethiopian Yirgacheffe",
    roastLevel: "medium",
    grind: "whole bean",
    origin: "Ethiopia",
    process: "washed",
    caffeine: "regular"
  }
});