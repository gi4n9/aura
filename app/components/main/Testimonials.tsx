const testimonials = [
    {
        id: 1,
        name: "Nguyễn Thị Hương",
        role: "Frontend Dev @ FPT",
        content: "Khóa học React ở đây thực sự tuyệt vời! Sau 3 tháng học, mình đã tự tin apply vào FPT và được nhận ngay.",
        course: "React.js Masterclass"
    },
    {
        id: 2,
        name: "Trần Văn Minh",
        role: "Fullstack Dev @ Shopee",
        content: "Aura Learning là nơi có chất lượng tốt nhất mình từng học. Dự án thực tế giúp mình áp dụng được ngay vào công việc.",
        course: "Node.js & Express"
    },
    {
        id: 3,
        name: "Lê Thị Mai",
        role: "UI/UX Designer @ Tiki",
        content: "Giảng viên chia sẻ rất nhiều tips thực tế từ kinh nghiệm làm việc. Giờ mình đã là Senior Designer rồi!",
        course: "UI/UX Design"
    }
];

export default function Testimonials() {
    return (
        <section className="py-24 bg-white border-t border-stone-800">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="font-serif text-4xl text-nobel-dark mb-2">Student Stories</h2>
                    <p className="text-[10px] font-bold tracking-[0.2em] text-stone-400 uppercase">Success starts here</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {testimonials.map((testimonial) => (
                        <div key={testimonial.id} className="bg-[#F9F8F4] p-8 rounded-xl border border-stone-200 relative">
                            {/* Quote Mark */}
                            <div className="font-serif text-6xl text-stone-200 absolute top-4 left-6 -z-0">“</div>
                            
                            <p className="font-serif text-lg text-stone-700 italic leading-relaxed mb-8 relative z-10 pt-4">
                                "{testimonial.content}"
                            </p>

                            <div className="border-t border-stone-200 pt-6 flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-sm text-nobel-dark">{testimonial.name}</h4>
                                    <p className="text-[10px] uppercase tracking-wider text-stone-500">{testimonial.role}</p>
                                </div>
                                <div className="px-2 py-1 bg-white border border-stone-200 text-[9px] font-bold uppercase tracking-wider text-stone-400 rounded">
                                    {testimonial.course}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Trust Badges (Text Only - Minimalist) */}
                <div className="mt-20 pt-10 border-t border-stone-100 text-center">
                    <p className="text-xs text-stone-400 mb-6 font-bold uppercase tracking-widest">Trusted by teams at</p>
                    <div className="flex flex-wrap justify-center gap-12 opacity-40 font-serif font-bold text-xl text-stone-400">
                        <span>Google</span>
                        <span>Microsoft</span>
                        <span>Amazon</span>
                        <span>Spotify</span>
                        <span>Tiki</span>
                    </div>
                </div>
            </div>
        </section>
    );
}