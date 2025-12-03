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
    Cell
} from 'recharts'

interface DashboardChartsProps {
    categoryData: { name: string; value: number }[]
    timelineData: any[] // Dynamic keys for stacked chart
    categories: string[]
}

const COLORS = ['#38a3a5', '#113f67', '#57c4c6', '#22577a', '#80ced6', '#0f3c5f', '#99d98c', '#52b788', '#1b4332']

export default function DashboardCharts({ categoryData, timelineData, categories }: DashboardChartsProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="card bg-white shadow-sm border border-gray-100 rounded-xl">
                <div className="card-body p-4">
                    <h3 className="text-lg font-bold mb-4 text-brand-navy">Expenses by Category</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => `R${value.toFixed(2)}`} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="card bg-white shadow-sm border border-gray-100 rounded-xl">
                <div className="card-body p-4">
                    <h3 className="text-lg font-bold mb-4 text-brand-navy">Expenses over Time</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={timelineData}
                                margin={{
                                    top: 5,
                                    right: 30,
                                    left: 20,
                                    bottom: 5,
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                                <Tooltip
                                    formatter={(value: number) => `R${value.toFixed(2)}`}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend />
                                {categories.map((category, index) => (
                                    <Bar
                                        key={category}
                                        dataKey={category}
                                        stackId="a"
                                        fill={COLORS[index % COLORS.length]}
                                        radius={index === categories.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    )
}
