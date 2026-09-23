import { NextResponse } from "next/server";
import { getAgentsOfTheWeek, getTodaysDealTicker, getAreaDominance } from "@/lib/gamification";

export async function GET() {
  const [agentsOfWeek, ticker, areaDominance] = await Promise.all([
    getAgentsOfTheWeek(),
    getTodaysDealTicker(),
    getAreaDominance(),
  ]);
  return NextResponse.json({ agentsOfWeek, ticker, areaDominance });
}
