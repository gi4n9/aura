import Image from "next/image";

const courses = [
    {
        id: 1,
        title: "Lập trình React.js từ cơ bản đến nâng cao",
        instructor: "Nguyễn Văn A",
        price: "1,299,000đ",
        originalPrice: "2,499,000đ",
        rating: 4.9,
        students: 2340,
        duration: "42 giờ",
        level: "Cơ bản - Nâng cao",
        image: "/courses/react.jpg",
        category: "Frontend",
        badge: "Bestseller",
        badgeColor: "bg-[var(--accent-orange)]"
    },
    {
        id: 2,
        title: "Master Node.js & Express - Build REST APIs",
        instructor: "Trần Minh B",
        price: "999,000đ",
        originalPrice: "1,999,000đ",
        rating: 4.8,
        students: 1890,
        duration: "38 giờ",
        level: "Trung cấp",
        image: "/courses/nodejs.jpg",
        category: "Backend",
        badge: "Hot",
        badgeColor: "bg-[var(--accent-pink)]"
    },
    {
        id: 3,
        title: "UI/UX Design Masterclass với Figma",
        instructor: "Lê Thị C",
        price: "799,000đ",
        originalPrice: "1,499,000đ",
        rating: 4.9,
        students: 3200,
        duration: "28 giờ",
        level: "Cơ bản",
        image: "/courses/figma.jpg",
        category: "Design",
        badge: "New",
        badgeColor: "bg-[var(--accent-teal)]"
    },
    {
        id: 4,
        title: "Python cho Data Science & Machine Learning",
        instructor: "Phạm Đức D",
        price: "1,499,000đ",
        originalPrice: "2,999,000đ",
        rating: 4.7,
        students: 1560,
        duration: "56 giờ",
        level: "Nâng cao",
        image: "/courses/python.jpg",
        category: "Data Science",
        badge: "Popular",
        badgeColor: "bg-[var(--accent-purple)]"
    }
];

function StarRating({ rating }: { rating: number }) {
    return (
        <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <svg
                    key={star}
                    className={`w-4 h-4 ${star <= rating ? "text-yellow-400" : "text-[var(--neutral-300)]"}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            ))}
            <span className="text-sm text-[var(--neutral-500)] ml-1">({rating})</span>
        </div>
    );
}

export default function FeaturedCourses() {
    return (
        <section className="py-20 bg-[var(--neutral-50)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
                <div className="text-center mb-12">
                    <span className="inline-block px-4 py-1 rounded-full text-sm font-medium bg-[var(--primary-100)] text-[var(--primary-600)] mb-4">
                        Khóa học nổi bật
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                        Các khóa học <span className="gradient-text">được yêu thích nhất</span>
                    </h2>
                    <p className="text-[var(--neutral-500)] max-w-2xl mx-auto">
                        Khám phá những khóa học chất lượng cao nhất, được hàng nghìn học viên tin tưởng và đánh giá cao
                    </p>
                </div>

                {/* Course Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {courses.map((course, index) => (
                        <div
                            key={course.id}
                            className="group bg-[var(--card-bg)] rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-[var(--card-border)]"
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            {/* Course Image */}
                            <div className="relative h-48 overflow-hidden bg-gradient-to-br from-[var(--primary-400)] to-[var(--accent-purple)]">
                                {/* Placeholder for course image */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    </div>
                                </div>

                                {/* Badge */}
                                <div className={`absolute top-3 left-3 px-3 py-1 rounded-full ${course.badgeColor} text-white text-xs font-semibold`}>
                                    {course.badge}
                                </div>

                                {/* Category */}
                                <div className="absolute top-3 right-3 px-3 py-1 rounded-full glass text-white text-xs font-medium">
                                    {course.category}
                                </div>
                            </div>

                            {/* Course Info */}
                            <div className="p-5">
                                <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-[var(--primary-500)] transition-colors">
                                    {course.title}
                                </h3>

                                <p className="text-sm text-[var(--neutral-500)] mb-3">
                                    {course.instructor}
                                </p>

                                <div className="flex items-center gap-4 text-xs text-[var(--neutral-400)] mb-3">
                                    <span className="flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {course.duration}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                        </svg>
                                        {course.students.toLocaleString()}
                                    </span>
                                </div>

                                <StarRating rating={course.rating} />

                                {/* Price */}
                                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[var(--neutral-200)]">
                                    <span className="text-xl font-bold text-[var(--primary-500)]">{course.price}</span>
                                    <span className="text-sm text-[var(--neutral-400)] line-through">{course.originalPrice}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* View All Button */}
                <div className="text-center mt-12">
                    <a
                        href="/courses"
                        className="inline-flex items-center gap-2 px-8 py-3 rounded-full border-2 border-[var(--primary-500)] text-[var(--primary-500)] font-semibold hover:bg-[var(--primary-500)] hover:text-white transition-all duration-300"
                    >
                        Xem tất cả khóa học
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                    </a>
                </div>
            </div>
        </section>
    );
}
