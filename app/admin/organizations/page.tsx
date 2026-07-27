import { getOrganizations, getCandidatesForOrganization } from "@/app/actions/admin-organizations";
import OrganizationManager from "@/app/components/admin/OrganizationManager";

export default async function AdminOrganizationsPage() {
  const orgResult = await getOrganizations();
  const candidatesResult = await getCandidatesForOrganization();

  const organizations = orgResult.success ? orgResult.data : [];
  const candidates = candidatesResult.success ? candidatesResult.data : { users: [], courses: [] };

  return (
    <OrganizationManager
      initialOrganizations={organizations as any}
      allUsers={(candidates?.users || []) as any}
      allCourses={(candidates?.courses || []) as any}
    />
  );
}
