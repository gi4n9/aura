import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import ChatBot from "@/app/components/ChatBot";

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

            {/* Footer  */}
            <Footer />
        </div>
    );
}