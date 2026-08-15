import { prisma } from "@/lib/prisma";

export class RatingServiceError extends Error {}

// "High scorers get a 'Top Rated Prime Agent' badge and search boost" —
// §3.9 doesn't give exact numbers, so this is an implementation call:
// a believable minimum sample size (so one 5-star review can't earn the
// badge) plus a high bar on the average.
export const TOP_RATED_MIN_STARS = 4.5;
export const TOP_RATED_MIN_COUNT = 5;

export function isTopRatedAgent(ratingAvg: number | null, ratingCount: number) {
  return ratingCount >= TOP_RATED_MIN_COUNT && (ratingAvg ?? 0) >= TOP_RATED_MIN_STARS;
}

export type SubmitRatingInput = {
  agentId: string;
  customerPhone: string;
  stars: number;
  review?: string | null;
  masterPropertyId?: string | null;
};

// "5-star rating + written review after every visit/deal" — §3.9.
export async function submitRating(input: SubmitRatingInput) {
  if (!Number.isInteger(input.stars) || input.stars < 1 || input.stars > 5) {
    throw new RatingServiceError("validation");
  }

  const agent = await prisma.agentProfile.findUnique({ where: { id: input.agentId } });
  if (!agent) throw new RatingServiceError("notFound");

  await prisma.agentRating.create({
    data: {
      agentId: input.agentId,
      customerPhone: input.customerPhone,
      masterPropertyId: input.masterPropertyId || null,
      stars: input.stars,
      review: input.review?.trim() || null,
    },
  });

  const agg = await prisma.agentRating.aggregate({
    where: { agentId: input.agentId },
    _avg: { stars: true },
  });

  return prisma.agentProfile.update({
    where: { id: input.agentId },
    data: { ratingAvg: agg._avg.stars ?? 0 },
  });
}

export async function getRatingsForAgent(agentProfileId: string) {
  const [ratings, count] = await Promise.all([
    prisma.agentRating.findMany({ where: { agentId: agentProfileId }, orderBy: { createdAt: "desc" } }),
    prisma.agentRating.count({ where: { agentId: agentProfileId } }),
  ]);
  return { ratings, count };
}
