import { redirect } from "next/navigation";
import { getCurrentUserWithProfile } from "@/lib/auth";

export default async function LawyerLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUserWithProfile();

  if (!user) redirect("/login");
  if ((user.role !== "LAWYER" && user.role !== "ADMIN") || (user.role === "LAWYER" && !user.lawyerProfile)) {
    redirect(user.role === "CLIENT" ? "/client/dashboard" : "/login");
  }

  return children;
}
