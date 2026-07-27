import { getAnalyticsData } from "@/app/actions/admin-analytics";
import AnalyticsManager from "@/app/components/admin/AnalyticsManager";

export default async function AdminAnalyticsPage() {
  const result = await getAnalyticsData();
  const data = result.success ? result.data : {
    userStatsLeaderboard: [],
    conversationSummaries: [],
    totalXp: 0,
    totalStudyMins: 0,
    totalPomodoros: 0,
    totalGroupMessages: 0,
  };

  return <AnalyticsManager initialData={data as any} />;
}
