"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { DEPARTMENT_COLORS, type Department } from "@/lib/departments";

interface DepartmentDistributionProps {
    data: { name: string; value: number }[];
    loading?: boolean;
}

const DEPT_CHART_COLORS: Record<string, string> = {
    Engineering: "#6366f1",
    Marketing: "#ec4899",
    Sales: "#10b981",
    "Human Resources": "#8b5cf6",
    Finance: "#f59e0b",
    Operations: "#f97316",
    Design: "#06b6d4",
    Product: "#0ea5e9",
    Legal: "#f43f5e",
    "Customer Support": "#14b8a6",
};

export default function DepartmentDistribution({ data, loading }: DepartmentDistributionProps) {
    if (loading) {
        return <div className="h-[250px] w-full animate-pulse bg-surface-muted rounded-xl border border-border-default" />;
    }

    const COLORS = data.map(d => DEPARTMENT_COLORS[d.name as Department]?.dot.replace('bg-', '') || 'var(--brand-primary)');

    // Map Tailwind color names to actual hex/css values for the chart if needed, 
    // but the dot classes have specific colors in our CSS. 
    // Let's use the local DEPT_CHART_COLORS for the chart itself but ensure names match exactly.

    return (
        <div className="h-[280px] w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={95}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="var(--surface-base)"
                        strokeWidth={2}
                        animationDuration={1500}
                    >
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={DEPT_CHART_COLORS[entry.name] || "var(--brand-primary)"}
                            />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "var(--surface-base)",
                            border: "1px solid var(--border-default)",
                            borderRadius: "12px",
                            fontSize: "13px",
                            fontWeight: "600",
                            boxShadow: "var(--shadow-lg)"
                        }}
                    />
                    <Legend
                        verticalAlign="bottom"
                        align="center"
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{
                            fontSize: '11px',
                            paddingTop: '25px',
                            fontWeight: '500',
                            color: 'var(--text-secondary)'
                        }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
