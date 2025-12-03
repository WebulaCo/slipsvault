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

    const [showFilters, setShowFilters] = useState(false)

    return (
        <div className="mb-6 relative z-10">
            {/* Mobile Toggle Button */}
            <button
                className="md:hidden btn btn-sm btn-outline w-full mb-2 flex items-center justify-center gap-2"
                onClick={() => setShowFilters(!showFilters)}
            >
                <Filter size={16} />
                {showFilters ? 'Hide Filters' : 'Filter Slips'}
                {hasActiveFilters && <span className="badge badge-xs badge-primary"></span>}
            </button>

            {/* Filter Container */}
            <div className={`${showFilters ? 'flex' : 'hidden'} md:flex gap-2 flex-wrap items-center`}>
                <div className="hidden md:flex items-center gap-2 text-brand-teal font-medium text-sm mr-2">
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
                    <ul tabIndex={0} className="dropdown-content z-50 menu p-2 shadow bg-white text-gray-900 rounded-box w-52 mt-1">
                        <li><button onClick={() => updateFilters('range', 'all')} className={`hover:bg-gray-100 ${dateRange === 'all' ? 'active bg-brand-teal text-white hover:bg-brand-teal' : ''}`}>All Time</button></li>
                        <li><button onClick={() => updateFilters('range', 'this_month')} className={`hover:bg-gray-100 ${dateRange === 'this_month' ? 'active bg-brand-teal text-white hover:bg-brand-teal' : ''}`}>This Month</button></li>
                        <li><button onClick={() => updateFilters('range', 'last_month')} className={`hover:bg-gray-100 ${dateRange === 'last_month' ? 'active bg-brand-teal text-white hover:bg-brand-teal' : ''}`}>Last Month</button></li>
                    </ul>
                </div>

                {/* Category Filter */}
                <div className="dropdown">
                    <div tabIndex={0} role="button" className={`btn btn-sm btn-outline rounded-full font-normal normal-case ${category !== 'all' ? 'btn-active bg-brand-teal text-white border-brand-teal' : ''}`}>
                        <Tag size={14} />
                        {category === 'all' ? 'Category: All' : `Category: ${category}`}
                    </div>
                    <ul tabIndex={0} className="dropdown-content z-50 menu p-2 shadow bg-white text-gray-900 rounded-box w-52 mt-1 max-h-60 overflow-y-auto block">
                        <li><button onClick={() => updateFilters('category', 'all')} className={`hover:bg-gray-100 ${category === 'all' ? 'active bg-brand-teal text-white hover:bg-brand-teal' : ''}`}>All Categories</button></li>
                        {CATEGORIES.map(cat => (
                            <li key={cat}>
                                <button onClick={() => updateFilters('category', cat)} className={`hover:bg-gray-100 ${category === cat ? 'active bg-brand-teal text-white hover:bg-brand-teal' : ''}`}>
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
                        <ul tabIndex={0} className="dropdown-content z-50 menu p-2 shadow bg-white text-gray-900 rounded-box w-52 mt-1 max-h-60 overflow-y-auto block">
                            <li><button onClick={() => updateFilters('contributor', 'all')} className={`hover:bg-gray-100 ${contributor === 'all' ? 'active bg-brand-teal text-white hover:bg-brand-teal' : ''}`}>All Contributors</button></li>
                            {companyUsers.map(user => (
                                <li key={user.id}>
                                    <button onClick={() => updateFilters('contributor', user.id)} className={`hover:bg-gray-100 ${contributor === user.id ? 'active bg-brand-teal text-white hover:bg-brand-teal' : ''}`}>
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
        </div>
    )
}
