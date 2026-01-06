"use client";

import InteractiveBackground from "./InteractiveBackground";

export default function HeroSection() {
    return (
        <section className="relative min-h-screen flex items-center justify-center  overflow-hidden p-16">
            {/* Background Elements */}
            <InteractiveBackground />

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--primary-50)] border border-[var(--primary-200)] mb-8 animate-fade-in">
                    <span className="w-2 h-2 rounded-full bg-[var(--accent-teal)] animate-pulse" />
                    <span className="text-sm font-medium text-[var(--primary-600)]">
                        🎉 Hơn 10,000+ học viên đã tham gia
                    </span>
                </div>

                {/* Main Heading */}
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold animate-slide-up ">
                    <span className="block text-[var(--foreground)]">Học tập không giới hạn</span>
                    <span className="block gradient-text py-3">Phát triển tương lai</span>
                </h1>

                {/* Subtitle */}
                <p className="text-lg sm:text-xl text-[var(--neutral-500)] max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: "0.2s" }}>
                    Khám phá hàng ngàn khóa học chất lượng cao từ các chuyên gia hàng đầu.
                    Học mọi lúc, mọi nơi với trải nghiệm học tập cá nhân hóa.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-slide-up" style={{ animationDelay: "0.4s" }}>
                    <a
                        href="/courses"
                        className="group px-8 py-4 rounded-full gradient-bg text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
                    >
                        Khám phá khóa học
                        <svg
                            className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                    </a>
                    <a
                        href="/demo"
                        className="group px-8 py-4 rounded-full bg-[var(--neutral-100)] text-[var(--foreground)] font-semibold text-lg hover:bg-[var(--neutral-200)] transition-all duration-300 flex items-center gap-2"
                    >
                        <svg
                            className="w-5 h-5 text-[var(--primary-500)]"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path d="M8 5v14l11-7z" />
                        </svg>
                        Xem demo
                    </a>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto animate-slide-up" style={{ animationDelay: "0.6s" }}>
                    <div className="text-center">
                        <div className="text-3xl sm:text-4xl font-bold gradient-text mb-1">500+</div>
                        <div className="text-sm text-[var(--neutral-500)]">Khóa học</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl sm:text-4xl font-bold gradient-text mb-1">10K+</div>
                        <div className="text-sm text-[var(--neutral-500)]">Học viên</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl sm:text-4xl font-bold gradient-text mb-1">50+</div>
                        <div className="text-sm text-[var(--neutral-500)]">Giảng viên</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl sm:text-4xl font-bold gradient-text mb-1">4.9</div>
                        <div className="text-sm text-[var(--neutral-500)]">Đánh giá</div>
                    </div>
                </div>
            </div>

            {/* Scroll Indicator */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
                <svg
                    className="w-6 h-6 text-[var(--neutral-400)]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
            </div>
        </section>
    );
}
