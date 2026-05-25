"use server";

import { db } from "@/lib/prisma";
import { RoadmapNodeStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function generateRoadmap(userId: string, interests: string[]) {
    if (!interests || interests.length === 0) {
        throw new Error("Vui lòng chọn ít nhất 1 sở thích.");
    }

    // 1. Fetch courses that match the selected categories
    const initialCourses = await db.course.findMany({
        where: {
            category: {
                slug: { in: interests }
            },
            status: "PUBLISHED"
        },
        select: { id: true }
    });

    const initialCourseIds = initialCourses.map(c => c.id);

    if (initialCourseIds.length === 0) {
        return null;
    }

    // 2. Fetch all prerequisites to build the dependency graph
    const allPrerequisites = await db.coursePrerequisite.findMany();

    const adj = new Map<string, string[]>();
    const revAdj = new Map<string, string[]>();

    for (const pr of allPrerequisites) {
        if (!adj.has(pr.prerequisiteId)) adj.set(pr.prerequisiteId, []);
        adj.get(pr.prerequisiteId)!.push(pr.courseId);

        if (!revAdj.has(pr.courseId)) revAdj.set(pr.courseId, []);
        revAdj.get(pr.courseId)!.push(pr.prerequisiteId);
    }

    // 3. Traverse backward to find ALL required courses (including implicit prerequisites)
    const requiredCourseIds = new Set<string>();
    const queue = [...initialCourseIds];

    while (queue.length > 0) {
        const curr = queue.shift()!;
        if (!requiredCourseIds.has(curr)) {
            requiredCourseIds.add(curr);
            const prereqs = revAdj.get(curr) || [];
            queue.push(...prereqs);
        }
    }

    // 4. Calculate stageLevels using Longest Path (Topological Sort approach)
    const inDegree = new Map<string, number>();
    for (const cid of requiredCourseIds) {
        inDegree.set(cid, 0);
    }

    for (const cid of requiredCourseIds) {
        const prereqs = revAdj.get(cid) || [];
        let count = 0;
        for (const pr of prereqs) {
            if (requiredCourseIds.has(pr)) {
                count++;
            }
        }
        inDegree.set(cid, count);
    }

    const levels = new Map<string, number>();
    const topoQueue: string[] = [];

    for (const [cid, deg] of inDegree.entries()) {
        if (deg === 0) {
            topoQueue.push(cid);
            levels.set(cid, 1);
        }
    }

    while (topoQueue.length > 0) {
        const curr = topoQueue.shift()!;
        const currLevel = levels.get(curr)!;

        const nextCourses = adj.get(curr) || [];
        for (const next of nextCourses) {
            if (requiredCourseIds.has(next)) {
                const currentNextLevel = levels.get(next) || 1;
                levels.set(next, Math.max(currentNextLevel, currLevel + 1));

                const deg = inDegree.get(next)! - 1;
                inDegree.set(next, deg);
                if (deg === 0) {
                    topoQueue.push(next);
                }
            }
        }
    }

    // 5. Delete existing roadmap if any and create new
    await db.userRoadmap.deleteMany({
        where: { userId }
    });

    const roadmap = await db.userRoadmap.create({
        data: {
            userId,
            totalCourses: requiredCourseIds.size,
            progressPercentage: 0,
        }
    });

    const nodesToCreate = Array.from(requiredCourseIds).map(courseId => {
        const level = levels.get(courseId) || 1;
        return {
            roadmapId: roadmap.id,
            courseId,
            stageLevel: level,
            status: level === 1 ? RoadmapNodeStatus.UNLOCKED : RoadmapNodeStatus.LOCKED
        };
    });

    await db.userRoadmapNode.createMany({
        data: nodesToCreate
    });

    revalidatePath("/roadmap");
    return roadmap;
}

export async function skipRoadmapNode(nodeId: string) {
    const node = await db.userRoadmapNode.findUnique({
        where: { id: nodeId },
        include: { roadmap: true }
    });

    if (!node) throw new Error("Node not found");

    await db.userRoadmapNode.update({
        where: { id: nodeId },
        data: { status: RoadmapNodeStatus.SKIPPED }
    });

    await updateRoadmapProgress(node.roadmap.userId);
    revalidatePath("/roadmap");
}

export async function updateRoadmapProgress(userId: string) {
    const roadmap = await db.userRoadmap.findUnique({
        where: { userId },
        include: { nodes: true }
    });

    if (!roadmap) return;

    let completedOrSkipped = 0;

    for (const node of roadmap.nodes) {
        if (node.status === RoadmapNodeStatus.COMPLETED || node.status === RoadmapNodeStatus.SKIPPED) {
            completedOrSkipped++;
        }
    }

    const newProgress = roadmap.totalCourses > 0
        ? Math.round((completedOrSkipped / roadmap.totalCourses) * 100)
        : 0;

    await db.userRoadmap.update({
        where: { id: roadmap.id },
        data: { progressPercentage: newProgress }
    });

    const nodesByLevel = new Map<number, typeof roadmap.nodes>();
    for (const n of roadmap.nodes) {
        if (!nodesByLevel.has(n.stageLevel)) nodesByLevel.set(n.stageLevel, []);
        nodesByLevel.get(n.stageLevel)!.push(n);
    }

    const sortedLevels = Array.from(nodesByLevel.keys()).sort((a, b) => a - b);

    let canUnlockNext = true;
    for (let i = 0; i < sortedLevels.length; i++) {
        const level = sortedLevels[i];
        const levelNodes = nodesByLevel.get(level)!;

        const isLevelFinished = levelNodes.every(n =>
            n.status === RoadmapNodeStatus.COMPLETED || n.status === RoadmapNodeStatus.SKIPPED
        );

        if (canUnlockNext) {
            for (const n of levelNodes) {
                if (n.status === RoadmapNodeStatus.LOCKED) {
                    await db.userRoadmapNode.update({
                        where: { id: n.id },
                        data: { status: RoadmapNodeStatus.UNLOCKED }
                    });
                }
            }
        }

        if (!isLevelFinished) {
            canUnlockNext = false;
        }
    }
}
