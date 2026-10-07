import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = performance.now();
  try {
    // 1. Test database ping and counts
    const [userCount, propertyCount, cityCount] = await Promise.all([
      prisma.user.count(),
      prisma.property.count(),
      prisma.city.count(),
    ]);

    const latencyMs = Math.round(performance.now() - start);

    return NextResponse.json({
      status: "HEALTHY",
      live: true,
      message: "Server and Database are fully operational!",
      database: {
        status: "CONNECTED",
        engine: "MySQL / MariaDB",
        latencyMs: `${latencyMs}ms`,
        records: {
          users: userCount,
          properties: propertyCount,
          cities: cityCount,
        },
      },
      server: {
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || "development",
        uptimeSeconds: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - start);
    return NextResponse.json(
      {
        status: "DEGRADED",
        live: true,
        message: "Server is running, but Database connection failed!",
        database: {
          status: "DISCONNECTED",
          error: err?.message || String(err),
          latencyMs: `${latencyMs}ms`,
        },
        server: {
          nodeVersion: process.version,
          environment: process.env.NODE_ENV || "development",
          timestamp: new Date().toISOString(),
        },
      },
      { status: 503 }
    );
  }
}
