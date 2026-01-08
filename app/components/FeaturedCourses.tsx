import { Link } from "lucide-react";
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
        badgeColor: "bg-nobel-gold"
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
        badgeColor: "bg-red-500"
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
        badgeColor: "bg-blue-500"
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
        badgeColor: "bg-purple-500"
    }
];

function StarRating({ rating }: { rating: number }) {
    return (
        <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <svg
                    key={star}
                    className={`w-3 h-3 ${star <= rating ? "text-nobel-gold" : "text-stone-300"}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            ))}
            <span className="text-xs font-bold text-stone-500 ml-1">{rating}</span>
        </div>
    );
}

export default function FeaturedCourses() {
    return (
        <section className="py-24 bg-white border-t border-stone-200">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-16">
                    <span className="inline-block mb-3 text-[10px] font-bold tracking-[0.2em] text-stone-500 uppercase">
                        Curriculum
                    </span>
                    <h2 className="font-serif text-4xl md:text-5xl mb-4 text-nobel-dark">
                        Featured Courses
                    </h2>
                    <div className="w-16 h-0.5 bg-nobel-gold mx-auto opacity-60"></div>
                </div>

                {/* Course Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {courses.map((course, index) => (
                        <div
                            key={course.id}
                            className="group flex flex-col bg-white rounded-xl overflow-hidden border border-stone-200 hover:border-nobel-gold/50 hover:shadow-xl transition-all duration-300"
                        >
                            {/* Course Image */}
                            <div className="relative h-48 overflow-hidden bg-stone-100">
                                {/* Placeholder Gradient thay cho ảnh */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-stone-200 to-stone-100 flex items-center justify-center">
                                     <span className="text-stone-400 text-xs uppercase tracking-widest font-bold">Preview</span>
                                </div>

                                {/* Badge */}
                                <div className={`absolute top-3 left-3 px-2 py-1 rounded text-[10px] font-bold text-white uppercase tracking-wider ${course.badgeColor}`}>
                                    {course.badge}
                                </div>

                                {/* Category */}
                                <div className="absolute top-3 right-3 px-2 py-1 rounded bg-white/90 backdrop-blur text-[10px] font-bold text-stone-600 uppercase tracking-wider shadow-sm">
                                    {course.category}
                                </div>
                            </div>

                            {/* Course Info */}
                            <div className="p-6 flex flex-col flex-1">
                                <h3 className="font-serif text-lg text-nobel-dark mb-2 line-clamp-2 group-hover:text-nobel-gold transition-colors leading-snug">
                                    {course.title}
                                </h3>

                                <p className="text-xs text-stone-500 mb-4 font-medium uppercase tracking-wide">
                                    By {course.instructor}
                                </p>

                                <div className="flex items-center justify-between mb-4 pb-4 border-b border-stone-100">
                                    <div className="flex items-center gap-3 text-[11px] text-stone-400 font-bold uppercase tracking-wider">
                                        <span>{course.duration}</span>
                                        <span>•</span>
                                        <span>{course.students} HV</span>
                                    </div>
                                    <StarRating rating={course.rating} />
                                </div>

                                {/* Price */}
                                <div className="mt-auto flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-stone-400 line-through decoration-stone-300">{course.originalPrice}</span>
                                        <span className="text-lg font-serif font-bold text-nobel-dark">{course.price}</span>
                                    </div>
                                    <button className="w-8 h-8 rounded-full border border-stone-200 flex items-center justify-center text-stone-400 hover:bg-nobel-dark hover:text-white hover:border-nobel-dark transition-all">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* View All Button */}
                <div className="text-center mt-16">
                    <Link
                        href="/courses"
                        className="inline-block px-8 py-3 border border-stone-300 text-stone-600 font-bold uppercase text-xs tracking-[0.15em] hover:bg-nobel-dark hover:text-white hover:border-nobel-dark transition-all duration-300 rounded-sm"
                    >
                        Xem tất cả khóa học
                    </Link>
                </div>
            </div>
        </section>
    );
}