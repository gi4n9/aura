const categories = [
    {
        id: 1,
        name: "Lập trình Web",
        icon: "🌐",
        courses: 128,
        gradient: "from-blue-500 to-cyan-500"
    },
    {
        id: 2,
        name: "Mobile Development",
        icon: "📱",
        courses: 85,
        gradient: "from-purple-500 to-pink-500"
    },
    {
        id: 3,
        name: "Data Science",
        icon: "📊",
        courses: 64,
        gradient: "from-green-500 to-teal-500"
    },
    {
        id: 4,
        name: "UI/UX Design",
        icon: "🎨",
        courses: 92,
        gradient: "from-orange-500 to-red-500"
    },
    {
        id: 5,
        name: "DevOps & Cloud",
        icon: "☁️",
        courses: 47,
        gradient: "from-indigo-500 to-purple-500"
    },
    {
        id: 6,
        name: "Cybersecurity",
        icon: "🔒",
        courses: 38,
        gradient: "from-red-500 to-pink-500"
    },
    {
        id: 7,
        name: "AI & Machine Learning",
        icon: "🤖",
        courses: 56,
        gradient: "from-cyan-500 to-blue-500"
    },
    {
        id: 8,
        name: "Digital Marketing",
        icon: "📈",
        courses: 73,
        gradient: "from-yellow-500 to-orange-500"
    }
];

export default function Categories() {
    return (
        <section className="flex py-20 ">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 justify-center">
                {/* Section Header */}
                <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12">
                    <div>
                        <span className="inline-block px-4 py-1 rounded-full text-sm font-medium bg-[var(--accent-purple)]/10 text-[var(--accent-purple)] mb-4">
                            Danh mục học tập
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-bold">
                            Khám phá theo <span className="gradient-text">lĩnh vực</span>
                        </h2>
                    </div>
                    <a
                        href="/categories"
                        className="mt-4 md:mt-0 text-[var(--primary-500)] font-medium hover:underline flex items-center gap-1"
                    >
                        Xem tất cả
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </a>
                </div>

                {/* Categories Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                    {categories.map((category, index) => (
                        <a
                            key={category.id}
                            href={`/categories/${category.id}`}
                            className="group relative p-6 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-transparent hover:shadow-xl transition-all duration-300 overflow-hidden"
                            style={{ animationDelay: `${index * 0.05}s` }}
                        >
                            {/* Gradient Background on Hover */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${category.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />

                            {/* Icon */}
                            <div className="relative z-10">
                                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${category.gradient} flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                                    {category.icon}
                                </div>

                                <h3 className="font-semibold text-lg mb-1 group-hover:text-[var(--primary-500)] transition-colors">
                                    {category.name}
                                </h3>

                                <p className="text-sm text-[var(--neutral-500)]">
                                    {category.courses} khóa học
                                </p>
                            </div>

                            {/* Arrow */}
                            <div className="absolute top-6 right-6 w-8 h-8 rounded-full bg-[var(--neutral-100)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1">
                                <svg className="w-4 h-4 text-[var(--primary-500)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </a>
                    ))}
                </div>
            </div>
        </section>
    );
}
