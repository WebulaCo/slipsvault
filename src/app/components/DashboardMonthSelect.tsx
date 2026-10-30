'use client'

import { useRouter } from 'next/navigation'

interface MonthOption {
    value: string
    label: string
}

interface DashboardMonthSelectProps {
    months: MonthOption[]
    activeMonth: string
}

export default function DashboardMonthSelect({ months, activeMonth }: DashboardMonthSelectProps) {
    const router = useRouter()

    return (
        <label className="block mb-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Month</span>
            <select
                aria-label="Month"
                className="select select-bordered w-full bg-white mt-1 h-11"
                value={activeMonth || 'all'}
                onChange={(event) => {
                    const value = event.target.value
                    router.push(value === 'all' ? '/dashboard' : `/dashboard?month=${encodeURIComponent(value)}`)
                }}
            >
                <option value="all">All time</option>
                {months.map((month) => (
                    <option key={month.value} value={month.value}>
                        {month.label}
                    </option>
                ))}
            </select>
        </label>
    )
}
