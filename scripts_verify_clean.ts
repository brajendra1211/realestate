import "dotenv/config";
import { prisma } from "@/lib/prisma";
async function main() {
  console.log("Remaining DispatchRequests:", await prisma.dispatchRequest.count());
  console.log("Remaining DispatchNotifications:", await prisma.dispatchNotification.count());
  console.log("Test agents remaining:", await prisma.agentProfile.count({ where: { agentCode: { contains: "TST" } } }));
}
main().then(() => process.exit(0));
