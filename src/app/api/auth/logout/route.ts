import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { destroySession } from "@/lib/auth";

export async function POST() {
  try {
    destroySession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "AUTH_LOGOUT_ROUTE", "Unable to sign out.");
  }
}
