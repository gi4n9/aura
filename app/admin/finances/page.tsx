import { getFinancialOverview } from "@/app/actions/admin-finances";
import FinanceManager from "@/app/components/admin/FinanceManager";

export default async function AdminFinancesPage() {
  const result = await getFinancialOverview();
  const data = result.success ? result.data : {
    totalRevenueVnd: 0,
    totalRevenueUsd: 0,
    totalCount: 0,
    statusMap: {},
    purchases: [],
    page: 1,
    totalPages: 1,
  };

  return <FinanceManager initialData={data as any} />;
}
