const features = [
    {
        id: 1,
        icon: (
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
        ),
        title: "Học từ chuyên gia",
        description: "Giảng viên là những chuyên gia hàng đầu với nhiều năm kinh nghiệm thực tế trong ngành"
    },
    {
        id: 2,
        icon: (
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        title: "Học mọi lúc mọi nơi",
        description: "Truy cập khóa học 24/7 trên mọi thiết bị. Học theo tốc độ của riêng bạn"
    },
    {
        id: 3,
        icon: (
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
        ),
        title: "Chứng chỉ có giá trị",
        description: "Nhận chứng chỉ hoàn thành được công nhận bởi các doanh nghiệp hàng đầu"
    },
    {
        id: 4,
        icon: (
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
        ),
        title: "Cộng đồng hỗ trợ",
        description: "Tham gia cộng đồng học viên năng động, hỏi đáp và networking"
    },
    {
        id: 5,
        icon: (
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
        ),
        title: "Cập nhật liên tục",
        description: "Nội dung khóa học được cập nhật thường xuyên theo xu hướng công nghệ mới nhất"
    },
    {
        id: 6,
        icon: (
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        title: "Hoàn tiền 100%",
        description: "Cam kết hoàn tiền trong 30 ngày nếu bạn không hài lòng với khóa học"
    }
];

export default function WhyChooseUs() {
    return (
        <section className="py-20 bg-[var(--neutral-50)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
                <div className="text-center mb-16">
                    <span className="inline-block px-4 py-1 rounded-full text-sm font-medium bg-[var(--accent-teal)]/10 text-[var(--accent-teal)] mb-4">
                        Tại sao chọn chúng tôi
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                        Trải nghiệm học tập <span className="gradient-text">đẳng cấp</span>
                    </h2>
                    <p className="text-[var(--neutral-500)] max-w-2xl mx-auto">
                        Chúng tôi cam kết mang đến cho bạn trải nghiệm học tập tốt nhất với nhiều ưu điểm vượt trội
                    </p>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <div
                            key={feature.id}
                            className="group relative p-8 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--primary-500)]/50 hover:shadow-xl transition-all duration-300"
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            {/* Icon */}
                            <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                                {feature.icon}
                            </div>

                            <h3 className="text-xl font-semibold mb-3 group-hover:text-[var(--primary-500)] transition-colors">
                                {feature.title}
                            </h3>

                            <p className="text-[var(--neutral-500)] leading-relaxed">
                                {feature.description}
                            </p>

                            {/* Decorative Corner */}
                            <div className="absolute top-0 right-0 w-20 h-20 overflow-hidden rounded-tr-2xl">
                                <div className="absolute -top-10 -right-10 w-20 h-20 bg-gradient-to-br from-[var(--primary-500)]/10 to-transparent rounded-full group-hover:scale-150 transition-transform duration-500" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
