"use client";

import { useState } from "react";
import { Building2, Plus, Edit2, Trash2, Users, BookOpen, UserPlus, Check, X, Shield, Search } from "lucide-react";
import {
  createOrganization,
  updateOrganization,
  deleteOrganization,
  assignUserToOrganization,
  assignCourseToOrganization,
} from "@/app/actions/admin-organizations";
import { toast } from "sonner";

interface OrganizationItem {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  createdAt: Date | string;
  _count: {
    members: number;
    courses: number;
  };
  members: { id: string; fullName: string | null; email: string; role: string; avatarUrl: string | null }[];
  courses: { id: string; title: string; status: string; thumbnailUrl: string | null }[];
}

interface OrganizationManagerProps {
  initialOrganizations: OrganizationItem[];
  allUsers: { id: string; fullName: string | null; email: string; organizationId: string | null }[];
  allCourses: { id: string; title: string; organizationId: string | null }[];
}

export default function OrganizationManager({
  initialOrganizations,
  allUsers,
  allCourses,
}: OrganizationManagerProps) {
  const [organizations, setOrganizations] = useState<OrganizationItem[]>(initialOrganizations);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<OrganizationItem | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [loading, setLoading] = useState(false);

  // Assignment Modal
  const [assignOrg, setAssignOrg] = useState<OrganizationItem | null>(null);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [searchUser, setSearchUser] = useState("");

  const handleOpenCreate = () => {
    setEditingOrg(null);
    setName("");
    setDescription("");
    setLogoUrl("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (org: OrganizationItem) => {
    setEditingOrg(org);
    setName(org.name);
    setDescription(org.description || "");
    setLogoUrl(org.logoUrl || "");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Vui lòng nhập tên tổ chức");
      return;
    }

    setLoading(true);
    try {
      if (editingOrg) {
        const res = await updateOrganization(editingOrg.id, { name, description, logoUrl });
        if (res.success && res.data) {
          toast.success("Cập nhật tổ chức thành công!");
          setOrganizations((prev) =>
            prev.map((o) => (o.id === editingOrg.id ? { ...o, name, description, logoUrl } : o))
          );
          setIsModalOpen(false);
        } else {
          toast.error(res.error || "Không thể cập nhật tổ chức");
        }
      } else {
        const res = await createOrganization({ name, description, logoUrl });
        if (res.success && res.data) {
          toast.success("Tạo tổ chức thành công!");
          const newOrg: OrganizationItem = {
            ...res.data,
            _count: { members: 0, courses: 0 },
            members: [],
            courses: [],
          };
          setOrganizations((prev) => [newOrg, ...prev]);
          setIsModalOpen(false);
        } else {
          toast.error(res.error || "Không thể tạo tổ chức");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (orgId: string, orgName: string) => {
    if (!confirm(`Bạn có chắc muốn xóa tổ chức "${orgName}"? Thành viên và khóa học sẽ được gỡ liên kết.`)) return;

    const res = await deleteOrganization(orgId);
    if (res.success) {
      toast.success("Đã xóa tổ chức");
      setOrganizations((prev) => prev.filter((o) => o.id !== orgId));
    } else {
      toast.error(res.error || "Xóa thất bại");
    }
  };

  const handleAssignUser = async () => {
    if (!assignOrg || !selectedUser) return;
    const res = await assignUserToOrganization(selectedUser, assignOrg.id);
    if (res.success) {
      toast.success("Đã gán học viên vào tổ chức!");
      setSelectedUser("");
    } else {
      toast.error(res.error || "Gán học viên thất bại");
    }
  };

  const handleAssignCourse = async () => {
    if (!assignOrg || !selectedCourse) return;
    const res = await assignCourseToOrganization(selectedCourse, assignOrg.id);
    if (res.success) {
      toast.success("Đã gán khóa học vào tổ chức!");
      setSelectedCourse("");
    } else {
      toast.error(res.error || "Gán khóa học thất bại");
    }
  };

  const filteredUsers = allUsers.filter(
    (u) =>
      u.fullName?.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.email.toLowerCase().includes(searchUser.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 flex items-center gap-2">
            <Building2 className="text-[#C5A059]" /> Quản Lý Tổ Chức & Trường Học (B2B)
          </h1>
          <p className="text-stone-500 mt-1">
            Quản lý danh sách các trường học, trung tâm và gán phân quyền thành viên/khóa học.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C5A059] text-white font-semibold hover:bg-[#b08c48] transition-all shadow-md shadow-[#C5A059]/20"
        >
          <Plus size={18} /> Tạo Tổ Chức Mới
        </button>
      </div>

      {/* Grid List Organizations */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {organizations.map((org) => (
          <div
            key={org.id}
            className="bg-white rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between space-y-5"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-[#C5A059] font-bold text-xl overflow-hidden">
                    {org.logoUrl ? (
                      <img src={org.logoUrl} alt={org.name} className="w-full h-full object-cover" />
                    ) : (
                      org.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-stone-900 leading-snug">{org.name}</h3>
                    <span className="text-xs text-stone-400">ID: {org.id.slice(0, 8)}...</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(org)}
                    className="p-2 text-stone-400 hover:text-[#C5A059] hover:bg-stone-100 rounded-lg transition-colors"
                    title="Chỉnh sửa"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(org.id, org.name)}
                    className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Xóa"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <p className="text-sm text-stone-600 line-clamp-2">
                {org.description || "Chưa có mô tả cho tổ chức này."}
              </p>

              {/* Stats badges */}
              <div className="flex items-center gap-4 pt-2 border-t border-stone-100 text-xs text-stone-500 font-medium">
                <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg">
                  <Users size={14} />
                  <span>{org._count.members} Học viên</span>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg">
                  <BookOpen size={14} />
                  <span>{org._count.courses} Khóa học</span>
                </div>
              </div>
            </div>

            {/* Action Assign */}
            <div className="pt-3">
              <button
                onClick={() => setAssignOrg(org)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition-colors"
              >
                <UserPlus size={14} /> Gán Thành Viên & Khóa Học
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Create/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <h2 className="text-xl font-bold text-stone-900">
                {editingOrg ? "Chỉnh Sửa Tổ Chức" : "Tạo Tổ Chức Mới"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Tên Tổ Chức / Trường Học *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Trường Đại học Công nghệ Aura"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:border-[#C5A059]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  URL Logo / Hình Ảnh
                </label>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Mô Tả Tổ Chức
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả về đơn vị đối tác B2B..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 text-sm font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-[#C5A059] text-white text-sm font-semibold hover:bg-[#b08c48] disabled:opacity-50"
                >
                  {loading ? "Đang xử lý..." : editingOrg ? "Cập Nhật" : "Tạo Mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Assign */}
      {assignOrg && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h2 className="text-xl font-bold text-stone-900">Gán Dữ Liệu Cho: {assignOrg.name}</h2>
                <p className="text-xs text-stone-500">Thêm học viên hoặc khóa học thuộc tổ chức này</p>
              </div>
              <button onClick={() => setAssignOrg(null)} className="text-stone-400 hover:text-stone-600">
                <X size={20} />
              </button>
            </div>

            {/* Section 1: Gán User */}
            <div className="space-y-3 bg-stone-50 p-4 rounded-xl border border-stone-200">
              <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <Users size={16} className="text-[#C5A059]" /> Gán Thành Viên Vào Tổ Chức
              </h4>
              <div className="flex gap-2">
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-stone-200 text-sm bg-white focus:outline-none"
                >
                  <option value="">-- Chọn User để gán --</option>
                  {filteredUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName || "User"} ({u.email}) {u.organizationId === assignOrg.id ? "✓ Đã gán" : ""}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAssignUser}
                  disabled={!selectedUser}
                  className="px-4 py-2 bg-[#C5A059] text-white text-xs font-bold rounded-xl hover:bg-[#b08c48] disabled:opacity-50"
                >
                  Gán
                </button>
              </div>
            </div>

            {/* Section 2: Gán Khóa Học */}
            <div className="space-y-3 bg-stone-50 p-4 rounded-xl border border-stone-200">
              <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <BookOpen size={16} className="text-[#C5A059]" /> Gán Khóa Học Thuộc Tổ Chức
              </h4>
              <div className="flex gap-2">
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-stone-200 text-sm bg-white focus:outline-none"
                >
                  <option value="">-- Chọn Khóa Học để gán --</option>
                  {allCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} {c.organizationId === assignOrg.id ? "✓ Đã gán" : ""}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAssignCourse}
                  disabled={!selectedCourse}
                  className="px-4 py-2 bg-stone-900 text-white text-xs font-bold rounded-xl hover:bg-stone-800 disabled:opacity-50"
                >
                  Gán
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
