const categories = [
    { id: 1, name: "Lập trình Web", courses: 128 },
    { id: 2, name: "Mobile App", courses: 85 },
    { id: 3, name: "Data Science", courses: 64 },
    { id: 4, name: "UI/UX Design", courses: 92 },
    { id: 5, name: "DevOps & Cloud", courses: 47 },
    { id: 6, name: "Cybersecurity", courses: 38 },
    { id: 7, name: "AI & Machine Learning", courses: 56 },
    { id: 8, name: "Digital Marketing", courses: 73 }
];

export default function Categories() {
    return (
        <section className="py-24 bg-[#F9F8F4] border-t border-stone-200">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12 gap-6">
                    <div>
                        <span className="inline-block mb-3 text-[10px] font-bold tracking-[0.2em] text-stone-500 uppercase">
                            Discovery
                        </span>
                        <h2 className="font-serif text-3xl md:text-4xl text-nobel-dark">
                            Browse by Topic
                        </h2>
                    </div>
                    <a
                        href="/categories"
                        className="text-xs font-bold uppercase tracking-widest text-nobel-gold hover:text-nobel-dark transition-colors border-b border-nobel-gold pb-1"
                    >
                        View All Categories
                    </a>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {categories.map((category) => (
                        <a
                            key={category.id}
                            href={`/categories/${category.id}`}
                            className="group p-6 bg-white border border-stone-200 rounded-lg hover:border-nobel-gold hover:shadow-lg transition-all duration-300 flex flex-col items-start justify-between min-h-[140px]"
                        >
                            {/* Icon giả lập */}
                            <div className="w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center text-lg mb-4 group-hover:bg-nobel-gold group-hover:text-white transition-colors text-stone-600 font-serif">
                                {category.name.charAt(0)}
                            </div>

                            <div>
                                <h3 className="font-serif text-lg text-nobel-dark group-hover:text-nobel-gold transition-colors">
                                    {category.name}
                                </h3>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mt-1">
                                    {category.courses} Courses
                                </p>
                            </div>
                        </a>
                    ))}
                </div>
            </div>
        </section>
    );
}