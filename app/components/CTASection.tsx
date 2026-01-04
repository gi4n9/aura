export default function CTASection() {
    return (
        <section className="py-20 relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="relative rounded-3xl overflow-hidden">
                    <div className="absolute inset-0 gradient-bg" />
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
                        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
                    </div>
                    <div className="relative z-10 py-16 px-8 md:py-20 md:px-16 text-center">
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
                            Bắt đầu hành trình học tập của bạn ngay hôm nay
                        </h2>
                        <p className="text-lg text-white/80 max-w-2xl mx-auto mb-10">
                            Tham gia cùng hơn 10,000 học viên đang phát triển kỹ năng. Đăng ký ngay để nhận ưu đãi đặc biệt!
                        </p>
                        <div className="max-w-md mx-auto">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <input type="email" placeholder="Nhập email của bạn" className="flex-1 px-6 py-4 rounded-full bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 backdrop-blur-sm" />
                                <button className="px-8 py-4 rounded-full bg-white text-[var(--primary-600)] font-semibold hover:bg-white/90 transition-colors shadow-lg">
                                    Đăng ký ngay
                                </button>
                            </div>
                            <p className="text-sm text-white/60 mt-4">✓ Miễn phí &nbsp; ✓ Không cần thẻ tín dụng</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
