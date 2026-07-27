"use client";

import { useState } from "react";
import { MessageCircle, HelpCircle, ShieldAlert, CheckCircle, Lock, Unlock, EyeOff, Eye, Users } from "lucide-react";
import {
  updateConversationSettings,
  toggleGroupQuestionResolved,
  toggleMessageDeleted,
} from "@/app/actions/admin-community-moderation";
import { toast } from "sonner";
import { decryptMessage } from "@/lib/security/chat-crypto";

interface CommunityManagerProps {
  initialData: {
    conversations: any[];
    groupQuestions: any[];
    recentMessages: any[];
  };
}

export default function CommunityManager({ initialData }: CommunityManagerProps) {
  const [activeTab, setActiveTab] = useState<"groups" | "questions" | "messages">("groups");
  const [data, setData] = useState(initialData);

  const handleTogglePublic = async (convId: string, currentPublic: boolean) => {
    const nextPublic = !currentPublic;
    const res = await updateConversationSettings(convId, { isPublic: nextPublic });
    if (res.success) {
      toast.success(nextPublic ? "Đã chuyển nhóm sang Công Khai" : "Đã chuyển nhóm sang Riêng Tư");
      setData((prev) => ({
        ...prev,
        conversations: prev.conversations.map((c) => (c.id === convId ? { ...c, isPublic: nextPublic } : c)),
      }));
    } else {
      toast.error(res.error || "Thao tác thất bại");
    }
  };

  const handleToggleResolved = async (questionId: string, currentResolved: boolean) => {
    const nextResolved = !currentResolved;
    const res = await toggleGroupQuestionResolved(questionId, nextResolved);
    if (res.success) {
      toast.success(nextResolved ? "Đã đánh dấu ĐÃ GIẢI QUYẾT" : "Đã đánh dấu CHƯA GIẢI QUYẾT");
      setData((prev) => ({
        ...prev,
        groupQuestions: prev.groupQuestions.map((q) => (q.id === questionId ? { ...q, isResolved: nextResolved } : q)),
      }));
    } else {
      toast.error(res.error || "Thao tác thất bại");
    }
  };

  const handleToggleDeletedMessage = async (msgId: string, currentDeleted: boolean) => {
    const nextDeleted = !currentDeleted;
    const res = await toggleMessageDeleted(msgId, nextDeleted);
    if (res.success) {
      toast.success(nextDeleted ? "Đã ẨN tin nhắn vi phạm" : "Đã KHÔI PHỤC tin nhắn");
      setData((prev) => ({
        ...prev,
        recentMessages: prev.recentMessages.map((m) => (m.id === msgId ? { ...m, deleted: nextDeleted } : m)),
      }));
    } else {
      toast.error(res.error || "Thao tác thất bại");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-stone-900 flex items-center gap-2">
          <MessageCircle className="text-[#C5A059]" /> Quản Trị Cộng Đồng & Thảo Luận
        </h1>
        <p className="text-stone-500 mt-1">
          Giám sát các nhóm chat thảo luận, giải quyết thắc mắc bài học và kiểm duyệt tin nhắn vi phạm.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-200 gap-6">
        <button
          onClick={() => setActiveTab("groups")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "groups"
              ? "border-[#C5A059] text-[#C5A059]"
              : "border-transparent text-stone-500 hover:text-stone-900"
          }`}
        >
          <Users size={16} /> Nhóm Thảo Luận ({data.conversations.length})
        </button>

        <button
          onClick={() => setActiveTab("questions")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "questions"
              ? "border-[#C5A059] text-[#C5A059]"
              : "border-transparent text-stone-500 hover:text-stone-900"
          }`}
        >
          <HelpCircle size={16} /> Câu Hỏi Thắc Mắc ({data.groupQuestions.length})
        </button>

        <button
          onClick={() => setActiveTab("messages")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "messages"
              ? "border-[#C5A059] text-[#C5A059]"
              : "border-transparent text-stone-500 hover:text-stone-900"
          }`}
        >
          <ShieldAlert size={16} /> Kiểm Duyệt Tin Nhắn ({data.recentMessages.length})
        </button>
      </div>

      {/* Tab 1: Groups */}
      {activeTab === "groups" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {data.conversations.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-stone-900 text-base">{c.name || c.course?.title || "Nhóm Thảo Luận"}</h3>
                  <p className="text-xs text-stone-400">ID: {c.id.slice(0, 8)}...</p>
                </div>
                <button
                  onClick={() => handleTogglePublic(c.id, c.isPublic)}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 border ${
                    c.isPublic
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-stone-100 text-stone-600 border-stone-200"
                  }`}
                >
                  {c.isPublic ? <Unlock size={12} /> : <Lock size={12} />}
                  {c.isPublic ? "Công Khai" : "Riêng Tư"}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-stone-500 pt-2 border-t">
                <span>Thành viên: <strong className="text-stone-900">{c._count.participants} / {c.maxMembers}</strong></span>
                <span>Tin nhắn: <strong className="text-stone-900">{c._count.messages}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Group Questions */}
      {activeTab === "questions" && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm text-stone-700">
            <thead className="bg-stone-50 text-xs uppercase font-bold text-stone-500">
              <tr>
                <th className="p-4">Tác Giả</th>
                <th className="p-4">Tiêu Đề / Nội Dung</th>
                <th className="p-4">Nhóm Chat</th>
                <th className="p-4">Trạng Thái</th>
                <th className="p-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {data.groupQuestions.map((q) => (
                <tr key={q.id}>
                  <td className="p-4">
                    <p className="font-bold text-stone-900">{q.author?.fullName || "Học viên"}</p>
                    <p className="text-xs text-stone-400">{q.author?.email}</p>
                  </td>
                  <td className="p-4">
                    <p className="font-bold text-stone-900">{q.title}</p>
                    <p className="text-xs text-stone-500 line-clamp-1">{q.content}</p>
                  </td>
                  <td className="p-4 text-xs font-semibold text-stone-600">
                    {q.conversation?.name || "Nhóm chung"}
                  </td>
                  <td className="p-4">
                    {q.isResolved ? (
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
                        ✓ Đã Giải Quyết
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-200">
                        • Chưa Giải Quyết
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleToggleResolved(q.id, q.isResolved)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800"
                    >
                      {q.isResolved ? "Chuyển Chưa Giải Quyết" : "Đánh Dấu Giải Quyết"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Message Moderation */}
      {activeTab === "messages" && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm text-stone-700">
            <thead className="bg-stone-50 text-xs uppercase font-bold text-stone-500">
              <tr>
                <th className="p-4">Người Gửi</th>
                <th className="p-4">Nội Dung Tin Nhắn</th>
                <th className="p-4">Thời Gian</th>
                <th className="p-4">Trạng Thái</th>
                <th className="p-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {data.recentMessages.map((m) => {
                const plainContent = decryptMessage(m.content);
                return (
                  <tr key={m.id} className={m.deleted ? "bg-red-50/40" : ""}>
                    <td className="p-4">
                      <p className="font-bold text-stone-900">{m.sender?.fullName || "User"}</p>
                      <p className="text-xs text-stone-400">{m.sender?.email}</p>
                    </td>
                    <td className="p-4">
                      <p className={`text-sm ${m.deleted ? "line-through text-red-500 italic" : "text-stone-900"}`}>
                        {plainContent}
                      </p>
                    </td>
                    <td className="p-4 text-xs text-stone-400 whitespace-nowrap">
                      {new Date(m.createdAt).toLocaleString("vi-VN")}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      {m.deleted ? (
                        <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                          Đã Ẩn / Xóa
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full">
                          Hiển Thị
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleToggleDeletedMessage(m.id, m.deleted)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 ml-auto ${
                          m.deleted
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                        }`}
                      >
                        {m.deleted ? <Eye size={14} /> : <EyeOff size={14} />}
                        {m.deleted ? "Khôi Phục" : "Ẩn Tin Nhắn"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
