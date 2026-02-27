
import { Edge, Node } from "reactflow";

// Extended Node with course mapping
export interface RoadmapNode extends Node {
    data: {
        label: string;
        description?: string;
        courseKeywords?: string[]; // Keywords to match courses in DB
        isOptional?: boolean;
        estimatedHours?: number;
        track?: string; // "shared", "backend", "frontend", etc.
    };
}

export interface RoadmapData {
    id: string;
    title: string;
    description: string;
    nodes: RoadmapNode[];
    edges: Edge[];
    totalEstimatedHours: number;
    primaryInterest: string;
}

// ===== SHARED NODES (Foundation - học 1 lần dù chọn nhiều track) =====
const SHARED_NODES: RoadmapNode[] = [
    {
        id: 'internet',
        position: { x: 300, y: 0 },
        type: 'input',
        className: "font-bold bg-[#1a1a1a] text-white border-none shadow-lg px-4 py-2 rounded-lg",
        data: {
            label: '🌐 Internet & HTTP',
            courseKeywords: ['internet', 'http', 'web cơ bản'],
            estimatedHours: 4,
            track: 'shared'
        }
    },
    {
        id: 'javascript',
        position: { x: 300, y: 100 },
        className: "bg-[#C5A059] text-white font-bold shadow-lg px-4 py-2 rounded-lg",
        data: {
            label: '⚡ JavaScript ES6+',
            courseKeywords: ['javascript', 'es6', 'js cơ bản'],
            estimatedHours: 20,
            track: 'shared'
        }
    },
    {
        id: 'typescript',
        position: { x: 300, y: 200 },
        className: "bg-blue-500 text-white font-bold px-4 py-2 rounded-lg",
        data: {
            label: '📘 TypeScript',
            courseKeywords: ['typescript', 'ts'],
            estimatedHours: 15,
            track: 'shared'
        }
    },
    {
        id: 'git',
        position: { x: 300, y: 300 },
        className: "bg-white border-stone-200 px-3 py-2 rounded-lg",
        data: {
            label: 'Git & Version Control',
            courseKeywords: ['git', 'github', 'version control'],
            estimatedHours: 5,
            track: 'shared'
        }
    },
];

// ===== BACKEND TRACK NODES =====
const BACKEND_NODES: RoadmapNode[] = [
    {
        id: 'nodejs',
        position: { x: 100, y: 400 },
        className: "bg-green-500 text-white font-bold px-4 py-2 rounded-lg",
        data: {
            label: '🟢 Node.js Runtime',
            courseKeywords: ['nodejs', 'node.js', 'node'],
            estimatedHours: 15,
            track: 'backend'
        }
    },
    {
        id: 'express',
        position: { x: 0, y: 500 },
        className: "bg-white border-stone-200 px-3 py-2 rounded-lg",
        data: {
            label: 'Express.js',
            courseKeywords: ['express', 'expressjs'],
            estimatedHours: 12,
            track: 'backend'
        }
    },
    {
        id: 'nestjs',
        position: { x: 200, y: 500 },
        className: "bg-red-500 text-white font-bold px-3 py-2 rounded-lg",
        data: {
            label: 'NestJS Framework',
            courseKeywords: ['nestjs', 'nest.js'],
            estimatedHours: 20,
            track: 'backend'
        }
    },
    {
        id: 'sql',
        position: { x: 50, y: 600 },
        className: "bg-white border-stone-200 px-3 py-2 rounded-lg",
        data: {
            label: 'SQL & PostgreSQL',
            courseKeywords: ['sql', 'postgresql', 'postgres', 'mysql'],
            estimatedHours: 15,
            track: 'backend'
        }
    },
    {
        id: 'prisma',
        position: { x: 200, y: 600 },
        className: "bg-white border-stone-200 px-3 py-2 rounded-lg",
        data: {
            label: 'Prisma ORM',
            courseKeywords: ['prisma', 'orm'],
            estimatedHours: 8,
            track: 'backend'
        }
    },
    {
        id: 'rest-api',
        position: { x: 100, y: 700 },
        className: "bg-[#C5A059] text-white font-bold px-4 py-2 rounded-lg",
        data: {
            label: '🔗 REST API Design',
            courseKeywords: ['rest', 'api', 'restful'],
            estimatedHours: 10,
            track: 'backend'
        }
    },
    {
        id: 'auth',
        position: { x: 100, y: 800 },
        className: "bg-white border-stone-200 px-3 py-2 rounded-lg",
        data: {
            label: 'Authentication & JWT',
            courseKeywords: ['jwt', 'authentication', 'auth', 'oauth'],
            estimatedHours: 8,
            track: 'backend'
        }
    },
    {
        id: 'docker',
        position: { x: 100, y: 900 },
        className: "bg-blue-400 text-white px-3 py-2 rounded-lg",
        data: {
            label: '🐳 Docker',
            courseKeywords: ['docker', 'container'],
            estimatedHours: 10,
            track: 'backend'
        }
    },
];

// ===== FRONTEND TRACK NODES =====
const FRONTEND_NODES: RoadmapNode[] = [
    {
        id: 'html-css',
        position: { x: 500, y: 400 },
        className: "bg-orange-400 text-white font-bold px-4 py-2 rounded-lg",
        data: {
            label: '🎨 HTML & CSS',
            courseKeywords: ['html', 'css', 'web cơ bản'],
            estimatedHours: 15,
            track: 'frontend'
        }
    },
    {
        id: 'react',
        position: { x: 500, y: 500 },
        className: "bg-cyan-500 text-white font-bold px-4 py-2 rounded-lg",
        data: {
            label: '⚛️ React',
            courseKeywords: ['react', 'reactjs'],
            estimatedHours: 25,
            track: 'frontend'
        }
    },
    {
        id: 'state-management',
        position: { x: 400, y: 600 },
        className: "bg-white border-stone-200 px-3 py-2 rounded-lg",
        data: {
            label: 'State Management',
            courseKeywords: ['redux', 'zustand', 'state management'],
            estimatedHours: 10,
            track: 'frontend'
        }
    },
    {
        id: 'tailwind',
        position: { x: 600, y: 600 },
        className: "bg-teal-500 text-white px-3 py-2 rounded-lg",
        data: {
            label: 'Tailwind CSS',
            courseKeywords: ['tailwind', 'tailwindcss'],
            estimatedHours: 8,
            track: 'frontend'
        }
    },
    {
        id: 'nextjs',
        position: { x: 500, y: 700 },
        className: "bg-[#1a1a1a] text-white font-bold px-4 py-2 rounded-lg",
        data: {
            label: '▲ Next.js',
            courseKeywords: ['nextjs', 'next.js'],
            estimatedHours: 25,
            track: 'frontend'
        }
    },
    {
        id: 'testing-fe',
        position: { x: 500, y: 800 },
        className: "bg-white border-stone-200 px-3 py-2 rounded-lg",
        data: {
            label: 'Testing (Jest/Vitest)',
            courseKeywords: ['jest', 'vitest', 'testing', 'react testing'],
            estimatedHours: 10,
            isOptional: true,
            track: 'frontend'
        }
    },
];

// ===== AI/ML TRACK NODES =====
const AI_NODES: RoadmapNode[] = [
    {
        id: 'python',
        position: { x: 300, y: 400 },
        className: "bg-yellow-400 text-black font-bold px-4 py-2 rounded-lg",
        data: {
            label: '🐍 Python',
            courseKeywords: ['python', 'python cơ bản'],
            estimatedHours: 20,
            track: 'ai'
        }
    },
    {
        id: 'math-ml',
        position: { x: 200, y: 500 },
        className: "bg-white border-stone-200 px-3 py-2 rounded-lg",
        data: {
            label: 'Toán cho ML',
            courseKeywords: ['toán', 'linear algebra', 'calculus', 'statistics'],
            estimatedHours: 25,
            track: 'ai'
        }
    },
    {
        id: 'numpy-pandas',
        position: { x: 400, y: 500 },
        className: "bg-white border-stone-200 px-3 py-2 rounded-lg",
        data: {
            label: 'NumPy & Pandas',
            courseKeywords: ['numpy', 'pandas', 'data analysis'],
            estimatedHours: 15,
            track: 'ai'
        }
    },
    {
        id: 'ml-basics',
        position: { x: 300, y: 600 },
        className: "bg-[#C5A059] text-white font-bold px-4 py-2 rounded-lg",
        data: {
            label: '🤖 Machine Learning',
            courseKeywords: ['machine learning', 'ml', 'sklearn'],
            estimatedHours: 30,
            track: 'ai'
        }
    },
    {
        id: 'deep-learning',
        position: { x: 200, y: 700 },
        className: "bg-purple-500 text-white font-bold px-3 py-2 rounded-lg",
        data: {
            label: 'Deep Learning',
            courseKeywords: ['deep learning', 'neural network', 'tensorflow', 'pytorch'],
            estimatedHours: 40,
            track: 'ai'
        }
    },
    {
        id: 'llm',
        position: { x: 400, y: 700 },
        className: "bg-pink-500 text-white font-bold px-3 py-2 rounded-lg",
        data: {
            label: 'LLMs & GenAI',
            courseKeywords: ['llm', 'gpt', 'langchain', 'genai', 'chatgpt'],
            estimatedHours: 25,
            track: 'ai'
        }
    },
];

// ===== TRACK DEFINITIONS =====
interface TrackDefinition {
    id: string;
    name: string;
    icon: string;
    color: string;
    nodes: RoadmapNode[];
    edges: Edge[];
    dependencies: string[]; // Other tracks that should come before
}

const TRACKS: Record<string, TrackDefinition> = {
    backend: {
        id: 'backend',
        name: 'Backend Development',
        icon: '🖥️',
        color: 'bg-green-500',
        nodes: BACKEND_NODES,
        edges: [
            { id: 'be1', source: 'git', target: 'nodejs' },
            { id: 'be2', source: 'nodejs', target: 'express' },
            { id: 'be3', source: 'nodejs', target: 'nestjs' },
            { id: 'be4', source: 'express', target: 'sql' },
            { id: 'be5', source: 'nestjs', target: 'prisma' },
            { id: 'be6', source: 'sql', target: 'rest-api' },
            { id: 'be7', source: 'prisma', target: 'rest-api' },
            { id: 'be8', source: 'rest-api', target: 'auth' },
            { id: 'be9', source: 'auth', target: 'docker' },
        ],
        dependencies: []
    },
    frontend: {
        id: 'frontend',
        name: 'Frontend Development',
        icon: '🎨',
        color: 'bg-purple-500',
        nodes: FRONTEND_NODES,
        edges: [
            { id: 'fe1', source: 'git', target: 'html-css' },
            { id: 'fe2', source: 'html-css', target: 'react' },
            { id: 'fe3', source: 'react', target: 'state-management' },
            { id: 'fe4', source: 'react', target: 'tailwind' },
            { id: 'fe5', source: 'state-management', target: 'nextjs' },
            { id: 'fe6', source: 'tailwind', target: 'nextjs' },
            { id: 'fe7', source: 'nextjs', target: 'testing-fe', style: { strokeDasharray: '5,5' } },
        ],
        dependencies: []
    },
    fullstack: {
        id: 'fullstack',
        name: 'Fullstack Development',
        icon: '⚡',
        color: 'bg-orange-500',
        nodes: [...FRONTEND_NODES, ...BACKEND_NODES],
        edges: [
            // Frontend edges
            { id: 'fe1', source: 'git', target: 'html-css' },
            { id: 'fe2', source: 'html-css', target: 'react' },
            { id: 'fe3', source: 'react', target: 'state-management' },
            { id: 'fe4', source: 'react', target: 'tailwind' },
            { id: 'fe5', source: 'state-management', target: 'nextjs' },
            { id: 'fe6', source: 'tailwind', target: 'nextjs' },
            // Backend edges
            { id: 'be1', source: 'git', target: 'nodejs' },
            { id: 'be2', source: 'nodejs', target: 'express' },
            { id: 'be3', source: 'nodejs', target: 'nestjs' },
            { id: 'be4', source: 'express', target: 'sql' },
            { id: 'be5', source: 'nestjs', target: 'prisma' },
            { id: 'be6', source: 'sql', target: 'rest-api' },
            { id: 'be7', source: 'prisma', target: 'rest-api' },
            // Connection between Frontend and Backend
            { id: 'fs1', source: 'nextjs', target: 'rest-api', style: { stroke: '#C5A059', strokeWidth: 2 } },
            { id: 'be8', source: 'rest-api', target: 'auth' },
            { id: 'be9', source: 'auth', target: 'docker' },
        ],
        dependencies: []
    },
    ai: {
        id: 'ai',
        name: 'AI & Machine Learning',
        icon: '🤖',
        color: 'bg-pink-500',
        nodes: AI_NODES,
        edges: [
            { id: 'ai1', source: 'git', target: 'python' },
            { id: 'ai2', source: 'python', target: 'math-ml' },
            { id: 'ai3', source: 'python', target: 'numpy-pandas' },
            { id: 'ai4', source: 'math-ml', target: 'ml-basics' },
            { id: 'ai5', source: 'numpy-pandas', target: 'ml-basics' },
            { id: 'ai6', source: 'ml-basics', target: 'deep-learning' },
            { id: 'ai7', source: 'ml-basics', target: 'llm' },
        ],
        dependencies: []
    }
};

// Base shared edges
const SHARED_EDGES: Edge[] = [
    { id: 'sh1', source: 'internet', target: 'javascript', animated: true },
    { id: 'sh2', source: 'javascript', target: 'typescript' },
    { id: 'sh3', source: 'typescript', target: 'git' },
];

// ===== ROADMAP GENERATION FUNCTIONS =====

/**
 * Generate a merged roadmap from multiple interests
 * @param interests - Array of interest IDs like ["backend", "frontend"]
 * @returns Merged RoadmapData
 */
export function generateMergedRoadmap(interests: string[]): RoadmapData {
    if (interests.length === 0) {
        interests = ['fullstack']; // Default
    }

    // Normalize interests
    const normalizedInterests = interests.map(i => normalizeInterest(i));

    // Remove duplicates and invalid
    const validInterests = [...new Set(normalizedInterests)].filter(i => TRACKS[i]);

    if (validInterests.length === 0) {
        validInterests.push('fullstack');
    }

    // Start with shared nodes
    const mergedNodes: RoadmapNode[] = [...SHARED_NODES];
    const mergedEdges: Edge[] = [...SHARED_EDGES];
    const addedNodeIds = new Set(SHARED_NODES.map(n => n.id));

    // Track names for title
    const trackNames: string[] = [];

    // Add nodes and edges from each track
    validInterests.forEach((interest, idx) => {
        const track = TRACKS[interest];
        if (!track) return;

        trackNames.push(track.name);

        // Adjust positions for multiple tracks (offset horizontally)
        const xOffset = validInterests.length > 1 ? (idx - (validInterests.length - 1) / 2) * 300 : 0;

        track.nodes.forEach(node => {
            if (!addedNodeIds.has(node.id)) {
                mergedNodes.push({
                    ...node,
                    position: {
                        x: node.position.x + xOffset,
                        y: node.position.y
                    }
                });
                addedNodeIds.add(node.id);
            }
        });

        // Add edges (only if both source and target exist)
        track.edges.forEach(edge => {
            const edgeExists = mergedEdges.some(e => e.id === edge.id);
            if (!edgeExists && addedNodeIds.has(edge.source) && addedNodeIds.has(edge.target)) {
                mergedEdges.push(edge);
            }
        });
    });

    // Calculate total hours
    const totalHours = mergedNodes.reduce((sum, node) => sum + (node.data.estimatedHours || 0), 0);

    // Generate title
    const title = validInterests.length === 1
        ? `Lộ trình ${trackNames[0]}`
        : `Lộ trình ${trackNames.join(' + ')}`;

    return {
        id: `merged-${validInterests.join('-')}`,
        title,
        description: `Lộ trình học tập cá nhân hóa cho ${trackNames.join(', ')}`,
        nodes: mergedNodes,
        edges: mergedEdges,
        totalEstimatedHours: totalHours,
        primaryInterest: validInterests[0]
    };
}

/**
 * Normalize interest string to track ID
 */
function normalizeInterest(interest: string): string {
    const map: Record<string, string> = {
        'backend': 'backend',
        'be': 'backend',
        'server': 'backend',
        'nodejs': 'backend',
        'node': 'backend',
        'express': 'backend',
        'nestjs': 'backend',

        'frontend': 'frontend',
        'fe': 'frontend',
        'react': 'frontend',
        'vue': 'frontend',
        'angular': 'frontend',
        'ui': 'frontend',

        'fullstack': 'fullstack',
        'full-stack': 'fullstack',
        'nextjs': 'fullstack',
        'next.js': 'fullstack',

        'ai': 'ai',
        'ml': 'ai',
        'machine learning': 'ai',
        'deep learning': 'ai',
        'python': 'ai',
        'data science': 'ai',
    };

    return map[interest.toLowerCase().trim()] || interest.toLowerCase().trim();
}

/**
 * Get roadmap by single interest (backward compatible)
 */
export function getRoadmapByInterest(interest: string): RoadmapData {
    return generateMergedRoadmap([interest]);
}

/**
 * Get roadmap by ID (for stored roadmaps)
 */
export function getRoadmapById(id: string): RoadmapData | null {
    // Check if it's a merged ID
    if (id.startsWith('merged-')) {
        const interests = id.replace('merged-', '').split('-');
        return generateMergedRoadmap(interests);
    }

    // Single track
    if (TRACKS[id]) {
        return generateMergedRoadmap([id]);
    }

    return null;
}

/**
 * Get all available track IDs
 */
export function getAllTrackIds(): string[] {
    return Object.keys(TRACKS);
}

/**
 * Get track info for UI
 */
export function getTrackInfo(trackId: string): TrackDefinition | null {
    return TRACKS[trackId] || null;
}

/**
 * Get all course keywords from a roadmap (for DB matching)
 */
export function getRoadmapCourseKeywords(roadmapOrId: RoadmapData | string): string[] {
    const roadmap = typeof roadmapOrId === 'string' ? getRoadmapById(roadmapOrId) : roadmapOrId;
    if (!roadmap) return [];

    const keywords: string[] = [];
    roadmap.nodes.forEach(node => {
        if (node.data.courseKeywords) {
            keywords.push(...node.data.courseKeywords);
        }
    });
    return [...new Set(keywords)];
}

/**
 * Get nodes grouped by track
 */
export function getNodesByTrack(roadmap: RoadmapData): Record<string, RoadmapNode[]> {
    const grouped: Record<string, RoadmapNode[]> = {};

    roadmap.nodes.forEach(node => {
        const track = node.data.track || 'shared';
        if (!grouped[track]) grouped[track] = [];
        grouped[track].push(node);
    });

    return grouped;
}
