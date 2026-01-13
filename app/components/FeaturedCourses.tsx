import { Link } from "lucide-react";

import Image from "next/image";

import { prisma } from "@/lib/prisma";

export default async function FeaturedCourses() {
    const courses = await prisma.playlist.findMany();

    return (
        <div>
            {courses.map((course) => (
                <div key={course.id}>
                    <h2>{course.title}</h2>
                    <p>{course.description}</p>
                </div>
            ))}
        </div>
    );
}