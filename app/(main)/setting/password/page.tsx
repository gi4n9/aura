export default function PasswordPage() {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-stone-800 border-b border-stone-100 pb-4">Đổi mật khẩu</h2>

            <div className="grid grid-cols-1 gap-6 max-w-lg">
                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-stone-600">Mật khẩu hiện tại</label>
                    <input type="password" className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A059]/20 focus:border-[#C5A059]" />
                </div>
                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-stone-600">Mật khẩu mới</label>
                    <input type="password" className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A059]/20 focus:border-[#C5A059]" />
                </div>
                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-stone-600">Xác nhận mật khẩu mới</label>
                    <input type="password" className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A059]/20 focus:border-[#C5A059]" />
                </div>

                <button className="w-full md:w-auto px-8 py-3 bg-[#1a1a1a] text-white font-bold rounded-lg hover:bg-[#C5A059] transition-colors shadow-lg shadow-stone-200">
                    Cập nhật mật khẩu
                </button>
            </div>
        </div>
    );
}
