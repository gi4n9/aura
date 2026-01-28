
import { Edge, Node } from "@xyflow/react";

export interface RoadmapData {
    nodes: Node[];
    edges: Edge[];
}

// Data extracted and adapted from roadmap.sh/backend and others
export const ROADMAPS: Record<string, RoadmapData> = {
    "backend": {
        nodes: [
            { id: 'root', position: { x: 0, y: 0 }, data: { label: 'Backend Developer' }, type: 'input', className: "font-bold bg-[#1a1a1a] text-[#C5A059] border-none shadow-lg" },
            { id: 'internet', position: { x: 0, y: 100 }, data: { label: 'Internet' } },
            { id: 'html-css', position: { x: -150, y: 200 }, data: { label: 'Frontend Basics' } },
            { id: 'os', position: { x: 150, y: 200 }, data: { label: 'OS & General Knowledge' } },
            { id: 'lang', position: { x: 0, y: 300 }, data: { label: 'Pick a Language' }, className: "bg-[#C5A059] text-white font-bold" },
            { id: 'lang-opts', position: { x: 0, y: 380 }, data: { label: 'Java, Python, Node.js, Go, Rust' }, style: { width: 250 } },
            { id: 'vcs', position: { x: 0, y: 480 }, data: { label: 'Version Control (Git)' } },
            { id: 'db', position: { x: 0, y: 580 }, data: { label: 'Relational Databases' }, className: "bg-blue-50 border-blue-200" },
            { id: 'db-rel', position: { x: -100, y: 660 }, data: { label: 'PostgreSQL, MySQL' } },
            { id: 'db-nosql', position: { x: 100, y: 660 }, data: { label: 'NoSQL' } },
            { id: 'api', position: { x: 0, y: 760 }, data: { label: 'APIs' } },
            { id: 'api-rest', position: { x: -80, y: 840 }, data: { label: 'REST' } },
            { id: 'api-json', position: { x: 80, y: 840 }, data: { label: 'JSON APIs' } },
            { id: 'auth', position: { x: 0, y: 940 }, data: { label: 'Authentication' }, className: "bg-red-50 border-red-200" },
            { id: 'caching', position: { x: 0, y: 1040 }, data: { label: 'Caching' } },
            { id: 'testing', position: { x: 0, y: 1140 }, data: { label: 'Testing' } },
            { id: 'ci-cd', position: { x: 0, y: 1240 }, data: { label: 'CI/CD' } },
            { id: 'containers', position: { x: 0, y: 1340 }, data: { label: 'Containerization (Docker)' } },
        ],
        edges: [
            { id: 'e1', source: 'root', target: 'internet' },
            { id: 'e2', source: 'internet', target: 'html-css' },
            { id: 'e3', source: 'internet', target: 'os' },
            { id: 'e4', source: 'html-css', target: 'lang' },
            { id: 'e5', source: 'os', target: 'lang' },
            { id: 'e6', source: 'lang', target: 'lang-opts' },
            { id: 'e7', source: 'lang-opts', target: 'vcs' },
            { id: 'e8', source: 'vcs', target: 'db' },
            { id: 'e9', source: 'db', target: 'db-rel' },
            { id: 'e10', source: 'db', target: 'db-nosql' },
            { id: 'e11', source: 'db-rel', target: 'api' },
            { id: 'e12', source: 'db-nosql', target: 'api' },
            { id: 'e13', source: 'api', target: 'api-rest' },
            { id: 'e14', source: 'api', target: 'api-json' },
            { id: 'e15', source: 'api-rest', target: 'auth' },
            { id: 'e16', source: 'api-json', target: 'auth' },
            { id: 'e17', source: 'auth', target: 'caching' },
            { id: 'e18', source: 'caching', target: 'testing' },
            { id: 'e19', source: 'testing', target: 'ci-cd' },
            { id: 'e20', source: 'ci-cd', target: 'containers' },
        ]
    },
    "frontend": {
        nodes: [
            { id: 'root', position: { x: 0, y: 0 }, data: { label: 'Frontend Developer' }, type: 'input', className: "font-bold bg-[#1a1a1a] text-[#C5A059]" },
            { id: 'internet', position: { x: 0, y: 100 }, data: { label: 'Internet' } },
            { id: 'html', position: { x: -100, y: 200 }, data: { label: 'HTML' } },
            { id: 'css', position: { x: 0, y: 200 }, data: { label: 'CSS' } },
            { id: 'js', position: { x: 100, y: 200 }, data: { label: 'JavaScript' } },
            { id: 'vcs', position: { x: 0, y: 300 }, data: { label: 'Version Control' } },
            { id: 'package-managers', position: { x: 0, y: 400 }, data: { label: 'Package Managers (npm/yarn)' } },
            { id: 'frameworks', position: { x: 0, y: 500 }, data: { label: 'Frameworks' }, className: "bg-[#C5A059] text-white" },
            { id: 'react', position: { x: -100, y: 600 }, data: { label: 'React' } },
            { id: 'vue', position: { x: 0, y: 600 }, data: { label: 'Vue' } },
            { id: 'angular', position: { x: 100, y: 600 }, data: { label: 'Angular' } },
            { id: 'css-arch', position: { x: 0, y: 700 }, data: { label: 'CSS Architecture / Tailwind' } },
        ],
        edges: [
            { id: 'e1', source: 'root', target: 'internet' },
            { id: 'e2', source: 'internet', target: 'html' },
            { id: 'e3', source: 'internet', target: 'css' },
            { id: 'e4', source: 'internet', target: 'js' },
            { id: 'e5', source: 'html', target: 'vcs' },
            { id: 'e6', source: 'css', target: 'vcs' },
            { id: 'e7', source: 'js', target: 'vcs' },
            { id: 'e8', source: 'vcs', target: 'package-managers' },
            { id: 'e9', source: 'package-managers', target: 'frameworks' },
            { id: 'e10', source: 'frameworks', target: 'react' },
            { id: 'e11', source: 'frameworks', target: 'vue' },
            { id: 'e12', source: 'frameworks', target: 'angular' },
            { id: 'e13', source: 'react', target: 'css-arch' },
        ]
    }
};

export function getRoadmapByInterest(interest: string): RoadmapData {
    const key = interest.toLowerCase().includes('back') ? 'backend' : 
                interest.toLowerCase().includes('front') ? 'frontend' : 'backend';
    return ROADMAPS[key];
}
