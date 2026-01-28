import SettingsSidebar from "@/app/components/setting/SettingsSidebar";

export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[#F9F8F4] pt-28 pb-12 px-4 md:px-8 font-sans">
            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
                <SettingsSidebar />
                <div className="flex-1 bg-white rounded-2xl shadow-sm border border-stone-200 p-6 md:p-10">
                    {children}
                </div>
            </div>
        </div>
    );
}
