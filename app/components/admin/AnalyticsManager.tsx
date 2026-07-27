"use client";

import { BarChart3, Trophy, Flame, Clock, Award, MessageSquare, Zap, Users } from "lucide-react";

interface AnalyticsManagerProps {
  initialData: {
    userStatsLeaderboard: any[];
    conversationSummaries: any[];
    totalXp: number;
    totalStudyMins: number;
    totalPomodoros: number;
    totalGroupMessages: number;
  };
}

export default function AnalyticsManager({ initialData }: AnalyticsManagerProps) {
  const {
    userStatsLeaderboard,
    conversationSummaries,
    totalXp,
    totalStudyMins,
    totalPomodoros,
    totalGroupMessages,
  } = initialData;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-stone-900 flex items-center gap-2">
          <BarChart3 className="text-[#C5A059]" /> Báo Cáo & Phân Tích Dữ Liệu Nền Tảng
        </h1>
        <p className="text-stone-500 mt-1">
          Trực quan hóa chỉ số học tập (UserStats), bảng xếp hạng kinh nghiệm và báo cáo tự động từ nhóm học (ConversationSummary).
        </p>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-2">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-xs font-bold uppercase tracking-wider">Tổng Kinh Nghiệm (XP)</span>
            <Trophy size={20} className="text-[#C5A059]" />
          </div>
          <p className="text-3xl font-bold text-stone-900">
            {new Intl.NumberFormat("vi-VN").format(totalXp)} <span className="text-sm font-normal text-stone-400">XP</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-2">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-xs font-bold uppercase tracking-wider">Tổng Phút Học Tích Lũy</span>
            <Clock size={20} className="text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-stone-900">
            {new Intl.NumberFormat("vi-VN").format(totalStudyMins)} <span className="text-sm font-normal text-stone-400">phút</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-2">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-xs font-bold uppercase tracking-wider">Phiên Pomodoro Học</span>
            <Flame size={20} className="text-amber-500" />
          </div>
          <p className="text-3xl font-bold text-stone-900">
            {new Intl.NumberFormat("vi-VN").format(totalPomodoros)} <span className="text-sm font-normal text-stone-400">phiên</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-2">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-xs font-bold uppercase tracking-wider">Tổng Tin Thảo Luận</span>
            <MessageSquare size={20} className="text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-stone-900">
            {new Intl.NumberFormat("vi-VN").format(totalGroupMessages)} <span className="text-sm font-normal text-stone-400">tin nhắn</span>
          </p>
        </div>
      </div>

      {/* Section 1: UserStats Leaderboard */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-stone-900 text-lg flex items-center gap-2">
          <Trophy className="text-[#C5A059]" /> Bảng Xếp Hạng Thành Tích Học Viên (UserStats Leaderboard)
        </h3>

        {userStatsLeaderboard.length === 0 ? (
          <p className="text-stone-400 text-sm italic py-4">Chưa có dữ liệu thành tích học tập.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-stone-700">
              <thead className="bg-stone-50 text-xs uppercase font-bold text-stone-500">
                <tr>
                  <th className="p-4">Thứ Hạng</th>
                  <th className="p-4">Học Viên</th>
                  <th className="p-4">Tổng XP</th>
                  <th className="p-4">Thời Gian Học</th>
                  <th className="p-4">Pomodoro</th>
                  <th className="p-4">Chuỗi Streak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium">
                {userStatsLeaderboard.map((stat, index) => (
                  <tr key={stat.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="p-4 whitespace-nowrap">
                      {index === 0 && <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">🥇 Top 1</span>}
                      {index === 1 && <span className="px-2.5 py-1 bg-stone-200 text-stone-800 text-xs font-bold rounded-full">🥈 Top 2</span>}
                      {index === 2 && <span className="px-2.5 py-1 bg-amber-700/20 text-amber-900 text-xs font-bold rounded-full">🥉 Top 3</span>}
                      {index > 2 && <span className="font-mono text-stone-500 pl-2">#{index + 1}</span>}
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-bold text-stone-900">{stat.user?.fullName || "Học viên"}</p>
                        <p className="text-xs text-stone-400">{stat.user?.email}</p>
                      </div>
                    </td>
                    <td className="p-4 font-bold text-[#C5A059]">
                      {new Intl.NumberFormat("vi-VN").format(stat.totalXp)} XP
                    </td>
                    <td className="p-4 font-semibold text-stone-800">
                      {stat.totalStudyMins} phút
                    </td>
                    <td className="p-4 font-semibold text-stone-800">
                      {stat.totalPomodoros} phiên
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                        <Flame size={12} /> {stat.currentStreak} ngày (Kỷ lục: {stat.longestStreak})
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 2: ConversationSummary Reports */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-stone-900 text-lg flex items-center gap-2">
          <Zap className="text-purple-600" /> Báo Cáo Tóm Tắt Tự Động Mức Độ Sôi Động Nhóm Chat (ConversationSummary)
        </h3>

        {conversationSummaries.length === 0 ? (
          <p className="text-stone-400 text-sm italic py-4">Chưa có bản tóm tắt tự động nào được tạo.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {conversationSummaries.map((summary) => (
              <div key={summary.id} className="bg-stone-50 p-5 rounded-2xl border border-stone-200 space-y-3">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-stone-900 text-base">{summary.conversation?.name || "Nhóm Thảo Luận"}</h4>
                  <span className="px-2 py-0.5 bg-stone-200 text-stone-700 text-[10px] font-bold rounded uppercase">
                    {summary.period}
                  </span>
                </div>

                <p className="text-xs text-stone-600 leading-relaxed italic bg-white p-3 rounded-xl border border-stone-200">
                  "{summary.summary}"
                </p>

                <div className="flex items-center justify-between text-xs text-stone-500 font-medium pt-2 border-t border-stone-200">
                  <span>Thành viên tương tác: <strong className="text-stone-900">{summary.activeMembers}</strong></span>
                  <span>Tổng tin nhắn: <strong className="text-stone-900">{summary.messageCount}</strong></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
