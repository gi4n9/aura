import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/lib/prisma";
import { ArrowLeft, Users, FileCheck, Award, Clock } from "lucide-react";
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

    // 2. Fetch Submissions for this Course
    // Logic: Submission -> Question -> Lesson -> Chapter -> Course
    const submissions = await db.submission.findMany({
        where: {
            question: {
                lesson: {
                    chapter: {
                        courseId: courseId
                    }
                }
            }
        },
        include: {
            user: {
                select: {
                    fullName: true,
                    email: true,
                    avatarUrl: true,
                }
            },
            question: {
                select: {
                    content: true,
                    correctAnswer: true,
                    lesson: {
                        select: {
                            title: true,
                        }
                    }
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    // 3. Calculate Stats
    const totalSubmissions = submissions.length;

    // Unique students count
    const uniqueStudents = new Set(submissions.map(s => s.userId)).size;

    // Average Score (Only for those with scores)
    const scoredSubmissions = submissions.filter(s => s.score !== null);
    const avgScore = scoredSubmissions.length > 0
        ? (scoredSubmissions.reduce((acc, curr) => acc + (curr.score || 0), 0) / scoredSubmissions.length).toFixed(1)
        : "N/A";

    return (
        <div className="p-6 max-w-7xl mx-auto bg-[#F9F8F4] min-h-screen">
            {/* Header */}
            <div className="flex flex-col gap-4 mb-8">
                <Link href={`/instructor/courses/${courseId}`} className="flex items-center text-sm text-stone-500 hover:text-stone-800 transition w-fit">
                    <ArrowLeft size={16} className="mr-2" /> Quay lại Dashboard
                </Link>
                <div>
                    <h1 className="text-3xl font-serif font-bold text-stone-800">
                        Quản lý bài nộp
                    </h1>
                    <p className="text-stone-500">
                        Khóa học: <span className="font-semibold">{course.title}</span>
                    </p>
                </div>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full">
                        <FileCheck size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-stone-500 font-bold uppercase tracking-wider">Tổng bài nộp</p>
                        <p className="text-2xl font-bold text-stone-800">{totalSubmissions}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-stone-500 font-bold uppercase tracking-wider">Học viên tham gia</p>
                        <p className="text-2xl font-bold text-stone-800">{uniqueStudents}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-full">
                        <Award size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-stone-500 font-bold uppercase tracking-wider">Điểm trung bình</p>
                        <p className="text-2xl font-bold text-stone-800">{avgScore}</p>
                    </div>
                </div>
            </div>

            {/* Submissions Table */}
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-stone-100">
                    <h2 className="font-bold text-lg text-stone-800">Chi tiết bài làm</h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-stone-500 uppercase bg-stone-50 border-b border-stone-100">
                            <tr>
                                <th className="px-6 py-3 font-semibold">Học viên</th>
                                <th className="px-6 py-3 font-semibold">Bài học</th>
                                <th className="px-6 py-3 font-semibold">Câu hỏi</th>
                                <th className="px-6 py-3 font-semibold">Câu trả lời</th>
                                <th className="px-6 py-3 font-semibold text-center">Kết quả</th>
                                <th className="px-6 py-3 font-semibold text-right">Thời gian</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {submissions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-stone-400 italic">
                                        Chưa có bài nộp nào từ học viên.
                                    </td>
                                </tr>
                            ) : (
                                submissions.map((sub) => (
                                    <tr key={sub.id} className="hover:bg-stone-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="relative w-8 h-8 rounded-full overflow-hidden bg-stone-200">
                                                    {sub.user.avatarUrl ? (
                                                        <Image src={sub.user.avatarUrl} alt="Avatar" fill className="object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-stone-500">
                                                            {sub.user.fullName?.[0]?.toUpperCase() || "U"}
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-stone-800">{sub.user.fullName || "Unknown User"}</div>
                                                    <div className="text-xs text-stone-500">{sub.user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-stone-600">
                                            {sub.question.lesson.title}
                                        </td>
                                        <td className="px-6 py-4 text-stone-600 max-w-xs truncate" title={sub.question.content}>
                                            {sub.question.content}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-mono bg-stone-100 px-2 py-1 rounded text-stone-700">
                                                {sub.answerText || "N/A"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {/* Logic check đúng sai đơn giản: Nếu answerText === correctAnswer */}
                                            {sub.answerText === sub.question.correctAnswer ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    Đúng
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    Sai
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right text-stone-500 text-xs">
                                            <div className="flex items-center justify-end gap-1">
                                                <Clock size={12} />
                                                {new Date(sub.createdAt).toLocaleDateString("vi-VN")}
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
