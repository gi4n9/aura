const features = [
    {
        id: 1,
        title: "Expert Instructors",
        description: "Học trực tiếp từ các chuyên gia Senior tại các tập đoàn công nghệ lớn."
    },
    {
        id: 2,
        title: "Flexible Learning",
        description: "Truy cập không giới hạn 24/7. Học mọi lúc, mọi nơi trên mọi thiết bị."
    },
    {
        id: 3,
        title: "Verified Certificates",
        description: "Chứng chỉ hoàn thành có giá trị, giúp làm đẹp CV của bạn."
    },
    {
        id: 4,
        title: "Active Community",
        description: "Tham gia cộng đồng học viên năng động, hỗ trợ lẫn nhau."
    },
    {
        id: 5,
        title: "Lifetime Access",
        description: "Mua một lần, sở hữu trọn đời. Nội dung cập nhật liên tục."
    },
    {
        id: 6,
        title: "Money Back",
        description: "Cam kết hoàn tiền trong 30 ngày nếu bạn không hài lòng."
    }
];

export default function WhyChooseUs() {
    return (
        <section className="py-24 bg-nobel-dark text-stone-300">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="text-center mb-16">
                    <span className="inline-block px-3 py-1 border border-nobel-gold text-nobel-gold text-[10px] font-bold tracking-[0.2em] uppercase rounded-full mb-6">
                        Why Choose Us
                    </span>
                    <h2 className="font-serif text-3xl md:text-5xl text-white mb-6">
                        Redefining Education
                    </h2>
                    <p className="text-stone-400 font-light max-w-2xl mx-auto text-lg">
                        Chúng tôi cam kết mang đến trải nghiệm học tập đẳng cấp quốc tế, tập trung vào giá trị thực tiễn.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <div
                            key={feature.id}
                            className="p-8 border border-stone-800 bg-stone-900/50 hover:border-nobel-gold/30 transition-colors rounded-xl"
                        >
                            <div className="w-12 h-12 rounded-full bg-stone-800 flex items-center justify-center text-nobel-gold mb-6 font-serif font-bold text-xl border border-stone-700">
                                {index + 1}
                            </div>
                            <h3 className="font-serif text-xl text-white mb-3">
                                {feature.title}
                            </h3>
                            <p className="text-sm font-light leading-relaxed opacity-60">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}