"use client";

import { useState } from "react";
import { CreditCard, DollarSign, TrendingUp, Filter, AlertTriangle, CheckCircle, RefreshCw, XCircle, Search, Eye } from "lucide-react";
import { updatePurchaseStatus } from "@/app/actions/admin-finances";
import { toast } from "sonner";

interface PurchaseItem {
  id: string;
  amount: number;
  currency: string;
  provider: string;
  transactionId: string | null;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
  errorLog: string | null;
  createdAt: Date | string;
  user?: { id: string; fullName: string | null; email: string; avatarUrl: string | null } | null;
  course?: { id: string; title: string; thumbnailUrl: string | null } | null;
}

interface FinanceManagerProps {
  initialData: {
    totalRevenueVnd: number;
    totalRevenueUsd: number;
    totalCount: number;
    statusMap: Record<string, number>;
    purchases: PurchaseItem[];
    page: number;
    totalPages: number;
  };
}

export default function FinanceManager({ initialData }: FinanceManagerProps) {
  const [data, setData] = useState(initialData);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [providerFilter, setProviderFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const [selectedErrorLog, setSelectedErrorLog] = useState<{ id: string; log: string } | null>(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle size={12} /> Thành Công</span>;
      case "PENDING":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200"><RefreshCw size={12} className="animate-spin" /> Chờ Xử Lý</span>;
      case "FAILED":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200"><XCircle size={12} /> Thất Bại</span>;
      case "REFUNDED":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200"><RefreshCw size={12} /> Hoàn Tiền</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-800">{status}</span>;
    }
  };

  const handleStatusChange = async (purchaseId: string, newStatus: any) => {
    if (!confirm(`Bạn có chắc muốn chuyển trạng thái đơn hàng này sang ${newStatus}?`)) return;

    const res = await updatePurchaseStatus(purchaseId, newStatus);
    if (res.success) {
      toast.success("Cập nhật đơn hàng thành công!");
      setData((prev) => ({
        ...prev,
        purchases: prev.purchases.map((p) => (p.id === purchaseId ? { ...p, status: newStatus } : p)),
      }));
    } else {
      toast.error(res.error || "Lỗi cập nhật đơn hàng");
    }
  };

  const filteredPurchases = data.purchases.filter((p) => {
    if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
    if (providerFilter !== "ALL" && p.provider !== providerFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTx = p.transactionId?.toLowerCase().includes(q);
      const matchUser = p.user?.fullName?.toLowerCase().includes(q) || p.user?.email?.toLowerCase().includes(q);
      const matchCourse = p.course?.title?.toLowerCase().includes(q);
      if (!matchTx && !matchUser && !matchCourse) return false;
    }
    return true;
  });

  return (
    <div className="space-y-8 text-stone-900">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-stone-900 flex items-center gap-2">
          <CreditCard className="text-[#C5A059]" /> Quản Lý Tài Chính & Giao Dịch
        </h1>
        <p className="text-stone-500 mt-1">
          Đối soát hóa đơn thanh toán, thống kê doanh thu đa tiền tệ và giám sát logs cổng thanh toán.
        </p>
      </div>

      {/* Revenue Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-2">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-xs font-bold uppercase tracking-wider">Doanh Thu VND</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-[#C5A059] flex items-center justify-center font-bold">₫</div>
          </div>
          <p className="text-3xl font-bold text-stone-900">
            {new Intl.NumberFormat("vi-VN").format(data.totalRevenueVnd)} <span className="text-sm font-normal text-stone-400">VND</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-2">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-xs font-bold uppercase tracking-wider">Doanh Thu USD</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">$</div>
          </div>
          <p className="text-3xl font-bold text-stone-900">
            ${data.totalRevenueUsd.toFixed(2)} <span className="text-sm font-normal text-stone-400">USD</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-2">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-xs font-bold uppercase tracking-wider">Đơn Thành Công</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><CheckCircle size={20} /></div>
          </div>
          <p className="text-3xl font-bold text-stone-900">{data.statusMap["COMPLETED"] || 0} <span className="text-sm font-normal text-stone-400">giao dịch</span></p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-2">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-xs font-bold uppercase tracking-wider">Đơn Thất Bại / Lỗi</span>
            <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center"><AlertTriangle size={20} /></div>
          </div>
          <p className="text-3xl font-bold text-stone-900">{data.statusMap["FAILED"] || 0} <span className="text-sm font-normal text-stone-400">cần xử lý</span></p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 bg-white font-medium focus:outline-none focus:border-[#C5A059]"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="COMPLETED">COMPLETED (Thành công)</option>
            <option value="PENDING">PENDING (Chờ xử lý)</option>
            <option value="FAILED">FAILED (Thất bại)</option>
            <option value="REFUNDED">REFUNDED (Hoàn tiền)</option>
          </select>

          {/* Provider Filter */}
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 bg-white font-medium focus:outline-none focus:border-[#C5A059]"
          >
            <option value="ALL">Tất cả cổng thanh toán</option>
            <option value="STRIPE">STRIPE</option>
            <option value="VNPAY">VNPAY</option>
            <option value="MOMO">MOMO</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search size={18} className="absolute left-3.5 top-3 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo Transaction ID, User, Khóa học..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 bg-white focus:outline-none focus:border-[#C5A059]"
          />
        </div>
      </div>

      {/* Table Transactions */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-stone-700">
            <thead className="bg-stone-50 border-b border-stone-200 text-xs uppercase font-bold text-stone-500 tracking-wider">
              <tr>
                <th className="p-4">Khách Hàng</th>
                <th className="p-4">Khóa Học</th>
                <th className="p-4">Số Tiền</th>
                <th className="p-4">Cổng Thanh Toán</th>
                <th className="p-4">Transaction ID</th>
                <th className="p-4">Trạng Thái</th>
                <th className="p-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-stone-400">
                    Không tìm thấy giao dịch nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((p) => (
                  <tr key={p.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="p-4">
                      <div>
                        <p className="font-bold text-stone-900">{p.user?.fullName || "Khách hàng"}</p>
                        <p className="text-xs text-stone-400">{p.user?.email || "Không có email"}</p>
                      </div>
                    </td>
                    <td className="p-4 max-w-xs truncate font-medium text-stone-800">
                      {p.course?.title || "Khóa học không khả dụng"}
                    </td>
                    <td className="p-4 font-bold text-stone-900 whitespace-nowrap">
                      {p.currency === "VND"
                        ? new Intl.NumberFormat("vi-VN").format(p.amount) + " đ"
                        : `$${p.amount}`}
                    </td>
                    <td className="p-4 whitespace-nowrap font-semibold">
                      <span className="px-2.5 py-1 bg-stone-100 text-stone-900 rounded-lg text-xs tracking-wider">
                        {p.provider}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-xs text-stone-500 max-w-[140px] truncate">
                      {p.transactionId || "N/A"}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      {getStatusBadge(p.status)}
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {p.errorLog && (
                          <button
                            onClick={() => setSelectedErrorLog({ id: p.id, log: p.errorLog! })}
                            className="p-1.5 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                            title="Xem Log Lỗi"
                          >
                            <Eye size={15} />
                          </button>
                        )}
                        <select
                          value={p.status}
                          onChange={(e) => handleStatusChange(p.id, e.target.value)}
                          className="text-xs px-2.5 py-1.5 rounded-lg border border-stone-200 text-stone-900 bg-white font-semibold focus:outline-none focus:border-[#C5A059]"
                        >
                          <option value="COMPLETED" className="text-stone-900 bg-white">COMPLETED</option>
                          <option value="PENDING" className="text-stone-900 bg-white">PENDING</option>
                          <option value="FAILED" className="text-stone-900 bg-white">FAILED</option>
                          <option value="REFUNDED" className="text-stone-900 bg-white">REFUNDED</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal View Error Log */}
      {selectedErrorLog && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-stone-900 text-lg flex items-center gap-2">
                <AlertTriangle className="text-amber-500" /> Log Lỗi Giao Dịch
              </h3>
              <button onClick={() => setSelectedErrorLog(null)} className="text-stone-400 hover:text-stone-600">
                ✕
              </button>
            </div>
            <pre className="bg-stone-900 text-stone-100 p-4 rounded-xl text-xs overflow-x-auto whitespace-pre-wrap font-mono">
              {selectedErrorLog.log}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
