'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Filter, Calendar, User, Tag, X } from 'lucide-react'
import { useState, useEffect } from 'react'

interface SlipFiltersProps {
    companyUsers: { id: string; name: string | null; email: string }[]
    isCompanyView: boolean
}

const CATEGORIES = [
    'Food', 'Transport', 'Groceries', 'Utilities', 'Shopping',
    'Health', 'Entertainment', 'Travel', 'Office Supplies',
    'Accommodation', 'Other'
]

export default function SlipFilters({ companyUsers, isCompanyView }: SlipFiltersProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [dateRange, setDateRange] = useState(searchParams.get('range') || 'all')
    const [category, setCategory] = useState(searchParams.get('category') || 'all')
    const [contributor, setContributor] = useState(searchParams.get('contributor') || 'all')

    // Update local state when URL params change
    useEffect(() => {
        setDateRange(searchParams.get('range') || 'all')
        setCategory(searchParams.get('category') || 'all')
        setContributor(searchParams.get('contributor') || 'all')
    }, [searchParams])

    const updateFilters = (key: string, value: string) => {
        const params = new URLSearchParams(window.location.search)

        if (value === 'all') {
            params.delete(key)
            // If clearing range, also clear start/end
            if (key === 'range') {
                params.delete('start')
                params.delete('end')
            }
        } else {
            params.set(key, value)

            // Handle date ranges
            if (key === 'range') {
                const now = new Date()
                let start, end

                if (value === 'this_month') {
                    start = new Date(now.getFullYear(), now.getMonth(), 1)
                    end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
                } else if (value === 'last_month') {
                    start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
                    end = new Date(now.getFullYear(), now.getMonth(), 0)
                }

                if (start && end) {
                    params.set('start', start.toISOString())
                    params.set('end', end.toISOString())
                }
            }
        }

        router.replace(`${pathname}?${params.toString()}`)
    }

    const clearAllFilters = () => {
        const params = new URLSearchParams(window.location.search)
        params.delete('range')
        params.delete('start')
        params.delete('end')
        params.delete('category')
        params.delete('contributor')
        // Keep search query 'q' if present? Usually yes.
        router.replace(`${pathname}?${params.toString()}`)
    }

    const hasActiveFilters = dateRange !== 'all' || category !== 'all' || contributor !== 'all'

    return (
        <div className="flex gap-2 flex-wrap pb-2 mb-6 items-center">
            <div className="flex items-center gap-2 text-brand-teal font-medium text-sm mr-2">
                <Filter size={16} />
                Filters:
            </div>

            {/* Date Filter */}
            <div className="dropdown">
                <div tabIndex={0} role="button" className={`btn btn-sm btn-outline rounded-full font-normal normal-case ${dateRange !== 'all' ? 'btn-active bg-brand-teal text-white border-brand-teal' : ''}`}>
                    <Calendar size={14} />
                    {dateRange === 'all' ? 'Date: All Time' :
                        dateRange === 'this_month' ? 'Date: This Month' :
                            dateRange === 'last_month' ? 'Date: Last Month' : 'Date'}
                </div>
                <ul tabIndex={0} className="dropdown-content z-50 menu p-2 shadow bg-base-100 rounded-box w-52 mt-1">
                    <li><button onClick={() => updateFilters('range', 'all')} className={dateRange === 'all' ? 'active' : ''}>All Time</button></li>
                    <li><button onClick={() => updateFilters('range', 'this_month')} className={dateRange === 'this_month' ? 'active' : ''}>This Month</button></li>
                    <li><button onClick={() => updateFilters('range', 'last_month')} className={dateRange === 'last_month' ? 'active' : ''}>Last Month</button></li>
                </ul>
            </div>

            {/* Category Filter */}
            <div className="dropdown">
                <div tabIndex={0} role="button" className={`btn btn-sm btn-outline rounded-full font-normal normal-case ${category !== 'all' ? 'btn-active bg-brand-teal text-white border-brand-teal' : ''}`}>
                    <Tag size={14} />
                    {category === 'all' ? 'Category: All' : `Category: ${category}`}
                </div>
                <ul tabIndex={0} className="dropdown-content z-50 menu p-2 shadow bg-base-100 rounded-box w-52 mt-1 max-h-60 overflow-y-auto block">
                    <li><button onClick={() => updateFilters('category', 'all')} className={category === 'all' ? 'active' : ''}>All Categories</button></li>
                    {CATEGORIES.map(cat => (
                        <li key={cat}>
                            <button onClick={() => updateFilters('category', cat)} className={category === cat ? 'active' : ''}>
                                {cat}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Contributor Filter (Company View Only) */}
            {isCompanyView && (
                <div className="dropdown">
                    <div tabIndex={0} role="button" className={`btn btn-sm btn-outline rounded-full font-normal normal-case ${contributor !== 'all' ? 'btn-active bg-brand-teal text-white border-brand-teal' : ''}`}>
                        <User size={14} />
                        {contributor === 'all' ? 'Contributor: All' :
                            `Contributor: ${companyUsers.find(u => u.id === contributor)?.name?.split(' ')[0] || 'Unknown'}`}
                    </div>
                    <ul tabIndex={0} className="dropdown-content z-50 menu p-2 shadow bg-base-100 rounded-box w-52 mt-1 max-h-60 overflow-y-auto block">
                        <li><button onClick={() => updateFilters('contributor', 'all')} className={contributor === 'all' ? 'active' : ''}>All Contributors</button></li>
                        {companyUsers.map(user => (
                            <li key={user.id}>
                                <button onClick={() => updateFilters('contributor', user.id)} className={contributor === user.id ? 'active' : ''}>
                                    {user.name || user.email}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Clear Filters */}
            {hasActiveFilters && (
                <button
                    onClick={clearAllFilters}
                    className="btn btn-sm btn-ghost btn-circle text-gray-500 hover:text-red-500"
                    title="Clear all filters"
                >
                    <X size={16} />
                </button>
            )}
        </div>
    )
}
