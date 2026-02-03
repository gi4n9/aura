import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/lib/prisma";
import { ArrowLeft, Users, CheckCircle2, Award, Clock, XCircle, RotateCcw } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default async function SubmissionsPage({
    params,
}: {
    params: Promise<{ courseId: string }>;
}) {
    const { courseId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return redirect("/login");

    // 1. Verify Instructor & Fetch Course
    const course = await db.course.findUnique({
        where: {
            id: courseId,
            instructorId: user.id,
        },
        select: {
            title: true,
        },
    });

    if (!course) return redirect("/instructor");

    // 2. Fetch Quiz Results (New Table)
    const quizResults = await db.quizResult.findMany({
        where: {
            courseId: courseId
        },
        include: {
            user: {
                select: {
                    fullName: true,
                    email: true,
                    avatarUrl: true,
                }
            },
            lesson: {
                select: {
                    title: true,
                    chapter: {
                        select: {
                            title: true
                        }
                    }
                }
            }
        },
        orderBy: {
            lastAttemptAt: 'desc'
        }
    });

    // 3. Calculate Stats
    const totalResults = quizResults.length;
    const passedCount = quizResults.filter(r => r.isPassed).length;
    const passRate = totalResults > 0 ? Math.round((passedCount / totalResults) * 100) : 0;

    // Average Score
    const avgScore = totalResults > 0
        ? (quizResults.reduce((acc, curr) => acc + curr.score, 0) / totalResults).toFixed(1)
        : "0";

    // Unique students
    const uniqueStudents = new Set(quizResults.map(r => r.userId)).size;

    return (
        <div className="p-6 max-w-7xl mx-auto bg-[#F9F8F4] min-h-screen">
            {/* Header */}
            <div className="flex flex-col gap-4 mb-8">
                <Link href={`/instructor/courses/${courseId}/settings`} className="flex items-center text-sm text-stone-500 hover:text-stone-800 transition w-fit">
                    <ArrowLeft size={16} className="mr-2" /> Quay lại Cài đặt
                </Link>
                <div>
                    <h1 className="text-3xl font-serif font-bold text-stone-800">
                        Kết quả bài tập
                    </h1>
                    <p className="text-stone-500">
                        Khóa học: <span className="font-semibold">{course.title}</span>
                    </p>
                </div>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-stone-500 font-bold uppercase tracking-wider">Học viên nộp bài</p>
                        <p className="text-2xl font-bold text-stone-800">{uniqueStudents}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full">
                        <CheckCircle2 size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-stone-500 font-bold uppercase tracking-wider">Tỷ lệ đạt (Pass)</p>
                        <p className="text-2xl font-bold text-stone-800">{passRate}%</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-full">
                        <Award size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-stone-500 font-bold uppercase tracking-wider">Điểm trung bình</p>
                        <p className="text-2xl font-bold text-stone-800">{avgScore}/100</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
                        <RotateCcw size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-stone-500 font-bold uppercase tracking-wider">Tổng lượt làm bài</p>
                        <p className="text-2xl font-bold text-stone-800">{quizResults.reduce((acc, curr) => acc + curr.attemptCount, 0)}</p>
                    </div>
                </div>
            </div>

            {/* Submissions Table */}
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-stone-100 flex items-center justify-between">
                    <h2 className="font-bold text-lg text-stone-800">Chi tiết kết quả</h2>
                    <span className="text-sm text-stone-500">Hiển thị kết quả tốt nhất của mỗi bài học</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-stone-500 uppercase bg-stone-50 border-b border-stone-100">
                            <tr>
                                <th className="px-6 py-3 font-semibold">Học viên</th>
                                <th className="px-6 py-3 font-semibold">Bài học</th>
                                <th className="px-6 py-3 font-semibold text-center">Điểm số</th>
                                <th className="px-6 py-3 font-semibold text-center">Câu đúng</th>
                                <th className="px-6 py-3 font-semibold text-center">Kết quả</th>
                                <th className="px-6 py-3 font-semibold text-center">Lần thử</th>
                                <th className="px-6 py-3 font-semibold text-right">Cập nhật</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {quizResults.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-stone-400 italic">
                                        Chưa có kết quả bài tập nào.
                                    </td>
                                </tr>
                            ) : (
                                quizResults.map((result) => (
                                    <tr key={result.id} className="hover:bg-stone-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="relative w-8 h-8 rounded-full overflow-hidden bg-stone-200 border border-stone-100">
                                                    {result.user.avatarUrl ? (
                                                        <Image src={result.user.avatarUrl} alt="Avatar" fill className="object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-stone-500 bg-stone-200">
                                                            {result.user.fullName?.[0]?.toUpperCase() || "U"}
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-stone-800">{result.user.fullName || "Unknown User"}</div>
                                                    <div className="text-xs text-stone-500">{result.user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-stone-700">{result.lesson.title}</div>
                                            <div className="text-xs text-stone-400 mt-1 flex items-center gap-1">
                                                <span className="bg-stone-100 px-1.5 py-0.5 rounded text-[10px]">
                                                    {result.lesson.chapter.title}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className={`font-bold text-sm ${result.score >= 80 ? "text-green-600" :
                                                    result.score >= 50 ? "text-amber-600" : "text-red-600"
                                                    }`}>
                                                    {result.score}/100
                                                </span>
                                                <div className="w-20 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${result.score >= 80 ? "bg-green-500" :
                                                            result.score >= 50 ? "bg-amber-500" : "bg-red-500"
                                                            }`}
                                                        style={{ width: `${result.score}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center text-stone-600 font-mono text-xs">
                                            {result.correctAnswers}/{result.totalQuestions}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {result.isPassed ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                                                    <CheckCircle2 size={12} /> Đạt
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                                                    <XCircle size={12} /> Chưa đạt
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center px-2 py-1 rounded bg-stone-100 text-stone-600 text-xs font-medium">
                                                {result.attemptCount} lần
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-stone-500 text-xs">
                                            <div className="flex items-center justify-end gap-1" title={new Date(result.lastAttemptAt).toLocaleString()}>
                                                <Clock size={12} />
                                                {new Date(result.lastAttemptAt).toLocaleDateString("vi-VN", {
                                                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
