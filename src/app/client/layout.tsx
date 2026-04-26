import { redirect } from "next/navigation";
import { getCurrentUserWithProfile } from "@/lib/auth";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUserWithProfile();

  if (!user) redirect("/login");
  if (user.role !== "CLIENT" || !user.clientProfile) {
    redirect(user.role === "LAWYER" ? "/lawyer/dashboard" : "/login");
  }

  return children;
}
