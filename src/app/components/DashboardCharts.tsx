'use client'

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from 'recharts'
import { useRouter } from 'next/navigation'

interface DashboardChartsProps {
    categoryData: { name: string; value: number }[]
    timelineData: { monthKey: string; name: string; total: number; [category: string]: any }[]
    categories: string[]
    activeMonth?: string
}

const COLORS = [
    '#38a3a5',
    '#113f67',
    '#57c4c6',
    '#22577a',
    '#80ced6',
    '#0f3c5f',
    '#99d98c',
    '#52b788',
    '#1b4332',
]

export default function DashboardCharts({
    categoryData,
    timelineData,
    categories,
    activeMonth,
}: DashboardChartsProps) {
    const router = useRouter()

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="card bg-white shadow-sm border border-gray-100 rounded-xl">
                <div className="card-body p-5">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-base font-bold text-brand-navy">
                            Expenses by Category
                        </h3>
                        {activeMonth && (
                            <span className="badge badge-sm bg-brand-teal/10 text-brand-teal border-none font-medium">
                                Filtered Month
                            </span>
                        )}
                    </div>
                    {categoryData.length === 0 ? (
                        <div className="h-[280px] flex items-center justify-center text-sm text-gray-400">
                            No categorized expenses for this period
                        </div>
                    ) : (
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={categoryData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={85}
                                        paddingAngle={4}
                                        dataKey="value"
                                    >
                                        {categoryData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${entry.name}-${index}`}
                                                fill={COLORS[index % COLORS.length]}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value: any) => `R${Number(value || 0).toFixed(2)}`}
                                        contentStyle={{
                                            borderRadius: '8px',
                                            border: 'none',
                                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                        }}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </div>

            <div className="card bg-white shadow-sm border border-gray-100 rounded-xl">
                <div className="card-body p-5">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h3 className="text-base font-bold text-brand-navy">
                                Monthly Spend Over Time
                            </h3>
                            <p className="text-xs text-gray-400">
                                Grouped by slip transaction month (click a bar to filter by month)
                            </p>
                        </div>
                    </div>
                    {timelineData.length === 0 ? (
                        <div className="h-[280px] flex items-center justify-center text-sm text-gray-400">
                            No monthly data available
                        </div>
                    ) : (
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={timelineData}
                                    margin={{
                                        top: 8,
                                        right: 20,
                                        left: 10,
                                        bottom: 5,
                                    }}
                                    onClick={(state: any) => {
                                        const clickedMonth = state?.activePayload?.[0]?.payload?.monthKey
                                        if (clickedMonth) {
                                            if (activeMonth === clickedMonth) {
                                                router.push('/dashboard')
                                            } else {
                                                router.push(`/dashboard?month=${encodeURIComponent(clickedMonth)}`)
                                            }
                                        }
                                    }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#6b7280', fontSize: 12 }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#6b7280', fontSize: 12 }}
                                        tickFormatter={(v) => `R${v}`}
                                    />
                                    <Tooltip
                                        formatter={(value: any, name: any) => [
                                            `R${Number(value || 0).toFixed(2)}`,
                                            name,
                                        ]}
                                        labelFormatter={(label, payload) => {
                                            const total = payload?.[0]?.payload?.total
                                            return total !== undefined
                                                ? `${label} — Total: R${Number(total).toFixed(2)}`
                                                : label
                                        }}
                                        contentStyle={{
                                            borderRadius: '8px',
                                            border: 'none',
                                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                        }}
                                    />
                                    <Legend />
                                    {categories.map((category, index) => (
                                        <Bar
                                            key={category}
                                            dataKey={category}
                                            stackId="a"
                                            fill={COLORS[index % COLORS.length]}
                                            cursor="pointer"
                                        />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
