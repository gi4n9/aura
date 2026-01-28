export default function DevicesPage() {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-stone-800 border-b border-stone-100 pb-4">Quản lý thiết bị</h2>
            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl border border-stone-100">
                    <div>
                        <h4 className="font-bold text-stone-800">Chrome on Windows</h4>
                        <p className="text-xs text-stone-500">Vừa truy cập • Hà Nội, Việt Nam</p>
                    </div>
                    <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded">Hiện tại</span>
                </div>
            </div>
        </div>
    );
}
