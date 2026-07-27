import { getAiOpsMetrics } from "@/app/actions/admin-aiops";
import AiOpsManager from "@/app/components/admin/AiOpsManager";

export default async function AdminAiOpsPage() {
  const result = await getAiOpsMetrics();
  const data = result.success ? result.data : {
    scriptStatusMap: {},
    recentFailedScripts: [],
    audioStatusMap: {},
    ocrCount: 0,
    ocrAvgConfidence: 0,
    ocrAvgVietnameseRatio: 0,
    recentOcrLogs: [],
  };

  return <AiOpsManager initialData={data as any} />;
}
