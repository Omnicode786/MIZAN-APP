import { NextResponse } from "next/server";
import { getCurrentUserWithProfile } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUserWithProfile();
  return NextResponse.json({ user });
}
