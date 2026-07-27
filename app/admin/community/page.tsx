import { getCommunityData } from "@/app/actions/admin-community-moderation";
import CommunityManager from "@/app/components/admin/CommunityManager";

export default async function AdminCommunityPage() {
  const result = await getCommunityData();
  const data = result.success ? result.data : {
    conversations: [],
    groupQuestions: [],
    recentMessages: [],
  };

  return <CommunityManager initialData={data as any} />;
}
