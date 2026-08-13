import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const cityId = params.get("cityId");
  const localityId = params.get("localityId");
  const excludeId = params.get("excludeId");

  if (!cityId) return NextResponse.json({ city: null, projects: [], properties: [] });

  const city = await prisma.city.findUnique({ where: { id: cityId }, select: { name: true } });
  if (!city) return NextResponse.json({ city: null, projects: [], properties: [] });

  const locality = localityId
    ? await prisma.locality.findUnique({ where: { id: localityId }, select: { name: true } })
    : null;

  const [projects, properties] = await Promise.all([
    prisma.project.findMany({
      where: {
        city: city.name,
        ...(locality ? { locality: locality.name } : {}),
      },
      select: { id: true, name: true, slug: true, status: true },
      orderBy: { name: "asc" },
      take: 20,
    }),
    prisma.property.findMany({
      where: {
        city: city.name,
        ...(locality ? { locality: locality.name } : {}),
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: {
        id: true,
        title: true,
        slug: true,
        listingType: true,
        propertyType: true,
        price: true,
        projectId: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return NextResponse.json({ city: city.name, projects, properties });
}
