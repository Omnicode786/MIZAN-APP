import { AppShell } from "@/components/workspace/app-shell";
import { LawyerProfileEditor } from "@/components/workspace/profile-editor";
import { SectionHeader } from "@/components/workspace/section-header";
import { Badge } from "@/components/ui/badge";
import { LAWYER_NAV } from "@/lib/constants";
import { getCurrentUserWithProfile } from "@/lib/auth";

export default async function LawyerProfilePage() {
  const user = await getCurrentUserWithProfile();
  const profile = { ...user?.lawyerProfile, user };

  return (
    <AppShell nav={LAWYER_NAV} heading="Lawyer Workspace" currentPath="/lawyer/profile" user={user!}>
      <SectionHeader
        eyebrow="Public Profile"
        title="Control how clients discover you"
        description="Only public lawyer profiles appear in client search. Update your specialties, fees, and practice summary here."
        action={<Badge variant={profile?.isPublic ? 'success' : 'secondary'}>{profile?.isPublic ? 'Visible to clients' : 'Hidden from client search'}</Badge>}
      />
      <LawyerProfileEditor profile={profile} />
    </AppShell>
  );
}
