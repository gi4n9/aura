export default function CTASection() {
    return (
        <section className="py-24 bg-white">
            <div className="max-w-5xl mx-auto px-6 lg:px-8">
                <div className="relative rounded-2xl overflow-hidden bg-nobel-dark py-16 px-8 md:py-20 md:px-16 text-center border border-stone-800 shadow-2xl">
                    
                    {/* Background Glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-nobel-gold opacity-10 blur-[100px] rounded-full pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-900 opacity-10 blur-[100px] rounded-full pointer-events-none" />

                    <div className="relative z-10">
                        <h2 className="font-serif text-3xl md:text-5xl text-white mb-6">
                            Start your journey <span className="italic text-nobel-gold">today</span>
                        </h2>
                        <p className="text-stone-400 max-w-xl mx-auto mb-10 text-lg font-light">
                            Tham gia cùng hơn 10,000 học viên. Đăng ký ngay để nhận ưu đãi đặc biệt và truy cập kho tàng kiến thức.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                            <input 
                                type="email" 
                                placeholder="Email của bạn" 
                                className="flex-1 px-6 py-4 rounded-full bg-stone-800 border border-stone-700 text-white placeholder-stone-500 focus:outline-none focus:border-nobel-gold transition-colors text-sm" 
                            />
                            <button className="px-8 py-4 rounded-full bg-nobel-gold text-nobel-dark font-bold uppercase text-xs tracking-widest hover:bg-white transition-colors shadow-lg">
                                Đăng ký ngay
                            </button>
                        </div>
                        <p className="text-[10px] text-stone-500 mt-6 uppercase tracking-widest">
                            ✓ Free Trial &nbsp; ✓ No Credit Card
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}