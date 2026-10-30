'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface DashboardChartsProps {
    categoryData: { name: string; value: number }[]
    currency: string | null
}

const COLORS = [
    '#38a3a5',
    '#113f67',
    '#57c4c6',
    '#22577a',
    '#80ced6',
    '#0f3c5f',
    '#99d98c',
]

function money(value: number, currency: string | null): string {
    const formatted = Number(value || 0).toFixed(2)
    return currency ? `${currency}${formatted}` : formatted
}

export default function DashboardCharts({ categoryData, currency }: DashboardChartsProps) {
    return (
        <div className="card bg-white shadow-sm border border-gray-100 rounded-xl mb-8">
            <div className="card-body p-5">
                <h2 className="text-base font-bold text-brand-navy mb-2">Expenses by category</h2>
                {categoryData.length === 0 ? (
                    <div className="h-40 flex items-center justify-center text-sm text-gray-400">
                        No categorized expenses for this period
                    </div>
                ) : (
                    <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={80}
                                    paddingAngle={4}
                                    dataKey="value"
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell
                                            key={entry.name}
                                            fill={COLORS[index % COLORS.length]}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: any) => money(Number(value || 0), currency)} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
    )
}
