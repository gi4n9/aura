export default function ActivationPage() {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-stone-800 border-b border-stone-100 pb-4">Mã kích hoạt</h2>
            <div className="max-w-lg space-y-4">
                <p className="text-sm text-stone-500">Nhập mã kích hoạt để mở khóa khóa học.</p>
                <input type="text" placeholder="XXXX-XXXX-XXXX" className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A059]/20 focus:border-[#C5A059]" />
                <button className="px-8 py-3 bg-[#1a1a1a] text-white font-bold rounded-lg hover:bg-[#C5A059] transition-colors shadow-lg shadow-stone-200">
                    Kích hoạt
                </button>
            </div>
        </div>
    );
}
