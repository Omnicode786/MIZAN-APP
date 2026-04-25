import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export async function requireRole(role: "CLIENT" | "LAWYER" | "ADMIN") {
  const session = await getSession();
  if (!session) redirect("/login");
  const active = session;
  if (active.role !== role && active.role !== "ADMIN") {
    redirect(active.role === "LAWYER" ? "/lawyer/dashboard" : "/client/dashboard");
  }
  return active;
}

export async function maybeRole(role: "CLIENT" | "LAWYER" | "ADMIN") {
  const session = await getSession();
  if (!session) return null;
  if (session.role !== role && session.role !== "ADMIN") return null;
  return session;
}
