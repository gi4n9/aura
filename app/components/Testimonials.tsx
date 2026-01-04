const testimonials = [
    {
        id: 1,
        name: "Nguyễn Thị Hương",
        role: "Frontend Developer tại FPT Software",
        avatar: "/avatars/avatar1.jpg",
        content: "Khóa học React ở đây thực sự tuyệt vời! Sau 3 tháng học, mình đã tự tin apply vào FPT và được nhận ngay. Giảng viên rất nhiệt tình và nội dung cập nhật liên tục.",
        rating: 5,
        course: "React.js Masterclass"
    },
    {
        id: 2,
        name: "Trần Văn Minh",
        role: "Full-stack Developer tại Shopee",
        avatar: "/avatars/avatar2.jpg",
        content: "Mình đã học qua nhiều platform nhưng Aura Learning là nơi có chất lượng tốt nhất. Dự án thực tế giúp mình áp dụng được ngay vào công việc. Highly recommended!",
        rating: 5,
        course: "Node.js & Express"
    },
    {
        id: 3,
        name: "Lê Thị Mai",
        role: "UI/UX Designer tại Tiki",
        avatar: "/avatars/avatar3.jpg",
        content: "Khóa học Figma giúp mình từ zero trở thành hero. Giảng viên chia sẻ rất nhiều tips thực tế từ kinh nghiệm làm việc. Giờ mình đã là Senior Designer rồi!",
        rating: 5,
        course: "UI/UX Design với Figma"
    }
];

export default function Testimonials() {
    return (
        <section className="py-20 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-[var(--primary-400)] rounded-full mix-blend-multiply filter blur-3xl opacity-10" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[var(--accent-purple)] rounded-full mix-blend-multiply filter blur-3xl opacity-10" />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                {/* Section Header */}
                <div className="text-center mb-16">
                    <span className="inline-block px-4 py-1 rounded-full text-sm font-medium bg-[var(--accent-pink)]/10 text-[var(--accent-pink)] mb-4">
                        Học viên nói gì
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                        Được tin tưởng bởi <span className="gradient-text">hàng nghìn học viên</span>
                    </h2>
                    <p className="text-[var(--neutral-500)] max-w-2xl mx-auto">
                        Xem những gì học viên của chúng tôi chia sẻ về trải nghiệm học tập tại Aura Learning
                    </p>
                </div>

                {/* Testimonials Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {testimonials.map((testimonial, index) => (
                        <div
                            key={testimonial.id}
                            className="relative p-8 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-lg hover:shadow-xl transition-all duration-300"
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            {/* Quote Icon */}
                            <div className="absolute -top-4 left-8">
                                <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center">
                                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                                    </svg>
                                </div>
                            </div>

                            {/* Stars */}
                            <div className="flex items-center gap-1 mb-4 mt-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <svg
                                        key={star}
                                        className={`w-5 h-5 ${star <= testimonial.rating ? "text-yellow-400" : "text-[var(--neutral-300)]"}`}
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                    >
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                ))}
                            </div>

                            {/* Content */}
                            <p className="text-[var(--neutral-600)] leading-relaxed mb-6">
                                "{testimonial.content}"
                            </p>

                            {/* Course Badge */}
                            <div className="inline-block px-3 py-1 rounded-full bg-[var(--primary-100)] text-[var(--primary-600)] text-sm font-medium mb-6">
                                {testimonial.course}
                            </div>

                            {/* Author */}
                            <div className="flex items-center gap-4 pt-6 border-t border-[var(--neutral-200)]">
                                {/* Avatar Placeholder */}
                                <div className="w-12 h-12 rounded-full gradient-bg flex items-center justify-center text-white font-bold text-lg">
                                    {testimonial.name.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="font-semibold">{testimonial.name}</h4>
                                    <p className="text-sm text-[var(--neutral-500)]">{testimonial.role}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Trust Indicators */}
                <div className="mt-16 text-center">
                    <p className="text-sm text-[var(--neutral-500)] mb-6">Được tin tưởng bởi các công ty hàng đầu</p>
                    <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-50">
                        {["Google", "Microsoft", "Amazon", "Meta", "Apple"].map((company) => (
                            <div key={company} className="text-2xl font-bold text-[var(--neutral-400)]">
                                {company}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
