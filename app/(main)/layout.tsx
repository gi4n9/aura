import Header from "@/app/components/layout/Header";
import Footer from "@/app/components/layout/Footer";
import ChatBot from "../components/chat/ChatBot";

export default function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col min-h-screen">
            {/* Header */}
            <Header />

            <main className="flex-1">
                {children}
            </main>
            <ChatBot />
        </div>
    );
}