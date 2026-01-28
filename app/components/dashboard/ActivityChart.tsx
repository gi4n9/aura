"use client";

import { motion } from "framer-motion";

interface ChartData {
    label: string;
    value: number;
}

interface ActivityChartProps {
    data: ChartData[];
    title: string;
    description: string;
}

export const ActivityChart = ({ data, title, description }: ActivityChartProps) => {
    // Determine max value for scaling
    const maxValue = Math.max(...data.map(d => d.value), 1);

    return (
        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
            <div className="mb-6">
                <h3 className="text-lg font-bold text-stone-800">{title}</h3>
                <p className="text-xs text-stone-500">{description}</p>
            </div>

            {/* Chart Area */}
            <div className="h-64 flex items-end gap-2 sm:gap-4 relative pt-6">

                {/* Y-Axis Lines (Background) */}
                <div className="absolute inset-x-0 bottom-0 top-0 flex flex-col justify-between text-xs text-stone-300 pointer-events-none pb-6 pl-0">
                    <div className="border-b border-stone-100 w-full h-0"></div>
                    <div className="border-b border-stone-100 w-full h-0"></div>
                    <div className="border-b border-stone-100 w-full h-0"></div>
                    <div className="border-b border-stone-100 w-full h-0"></div>
                    <div className="border-b border-stone-200 w-full h-0"></div> {/* X-Axis Line */}
                </div>

                {/* Bars */}
                {data.map((item, index) => {
                    const heightPercentage = (item.value / maxValue) * 100;

                    return (
                        <div key={index} className="flex-1 flex flex-col items-center justify-end h-full group relative z-10">
                            {/* Tooltip Value */}
                            <div className="mb-2 opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-[100%] bg-stone-800 text-white text-[10px] py-1 px-2 rounded font-bold pointer-events-none whitespace-nowrap z-20">
                                {item.value} học viên
                            </div>

                            {/* The Bar */}
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${heightPercentage}%` }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                className="w-full max-w-[40px] bg-[#C5A059] rounded-t-sm group-hover:bg-[#b08d4b] transition-colors relative min-h-[4px]"
                            />

                            {/* X-Axis Label */}
                            <div className="mt-3 text-[10px] text-stone-400 font-medium uppercase tracking-wider text-center h-4 w-full truncate">
                                {item.label}
                            </div>
                        </div>
                    );
                })}
            </div>

            {(data.every(d => d.value === 0)) && (
                <div className="text-center text-stone-400 text-xs mt-[-100px] mb-[80px]">
                    Chưa có dữ liệu hoạt động gần đây
                </div>
            )}
        </div>
    );
};
