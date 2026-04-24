import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { getCurrentUserWithProfile } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUserWithProfile();
    return NextResponse.json({ user });
  } catch (error) {
    return handleApiError(error, "AUTH_ME_ROUTE", "Unable to load account.");
  }
}
