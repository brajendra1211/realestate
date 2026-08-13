"use server";

import { cookies } from "next/headers";
import { LOCATION_COOKIE, type LocationCookieValue } from "@/lib/location-context";

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function setLocationCookie(value: LocationCookieValue) {
  const store = await cookies();
  store.set(LOCATION_COOKIE, JSON.stringify(value), {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
  });
}

export async function clearLocationCookie() {
  const store = await cookies();
  store.delete(LOCATION_COOKIE);
}
